// Fighter flight-model checks against the textbook equations (fighter upgrade, phase 1, 09-Nov-2026).
// Runs the game's own src/physics/flight.js and src/physics/pilotG.js on a test clock, no browser needed.
// Run: node tools/test_flight_model.mjs      (exit code 1 when a check fails)
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import { readFileSync } from 'node:fs';

const ROOT = new URL('../', import.meta.url);
const THREE_URL = new URL('vendor/three/build/three.module.js', ROOT).href;
// 'three' is mapped by the page's import map; give Node the same mapping
register('data:text/javascript,' + encodeURIComponent(`
  export async function resolve(spec, ctx, next) {
    if (spec === 'three') return { url: ${JSON.stringify(THREE_URL)}, shortCircuit: true };
    return next(spec, ctx);
  }`), pathToFileURL('./'));

const THREE = await import('three');
const { stepFixedWingAir, atmosphere, AIR } = await import(new URL('src/physics/flight.js', ROOT).href);
const { newPilotG, stepPilotG } = await import(new URL('src/physics/pilotG.js', ROOT).href);

// The fighter's profile numbers, read from src/aircraft/fighter.js (no DOM needed)
const src = readFileSync(new URL('src/aircraft/fighter.js', ROOT), 'utf8');
const num = (k) => Number(src.match(new RegExp(`\\b${k}:\\s*([\\d.]+)`))[1]);
const P = {};
['mass', 'wingArea', 'aspectRatio', 'oswaldEfficiency', 'cd0', 'cl0', 'clAlpha', 'stallAoA', 'stallKt', 'vr', 'approachKt'].forEach((k) => { P[k] = num(k); });
const FUEL_FULL = 8200;

const G = 9.81, KT = 1 / 1.94384, DT = 1 / 120, DEG = 180 / Math.PI;
let failed = 0;
const check = (name, ok, detail) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  ${detail}`); if (!ok) failed++; };

function newState(ktTas, hM, bankDeg = 0) {
  const v = ktTas * KT;
  const s = { pos: new THREE.Vector3(0, hM, 0), vel: new THREE.Vector3(0, 0, -v), rot: new THREE.Euler(0, 0, -bankDeg / DEG, 'YXZ'), power: 70, isAfterburner: false };
  // start trimmed: nose at the angle of attack for 1 g (the model settles it within a second anyway)
  return s;
}
function fly(s, sec, inputFn, hM, opts = {}) {
  const samples = [];
  for (let t = 0; t < sec; t += DT) {
    const inp = Object.assign({ pitch: 0, roll: 0, yaw: 0, autoAltFt: null, hM: hM ?? s.pos.y }, opts, inputFn ? inputFn(t, s) : {});
    stepFixedWingAir(s, inp, P, 'fighter', DT);
    s.pos.addScaledVector(s.vel, DT);
    samples.push({ t, v: s.vel.length(), n: s.loadG, aoa: s.aoa, roll: s.rollRate, yaw: s.rot.y, stalled: s.stalled, vy: s.vel.y, spin: s.spin || 0 });
  }
  return samples;
}

// 1. Sustained level turn, 60 deg bank, 350 kt at 3,000 m: rate and radius against the formulas
{
  const hM = 3000;
  const s = newState(350, hM, 60);
  s.power = 100; s.isAfterburner = true;
  const out = fly(s, 12, null, hM);
  const tail = out.slice(-600);                         // last 5 s
  const n = tail.reduce((a, x) => a + x.n, 0) / tail.length;
  const v = tail.reduce((a, x) => a + x.v, 0) / tail.length;
  let dYaw = tail[tail.length - 1].yaw - tail[0].yaw;
  dYaw = Math.atan2(Math.sin(dYaw), Math.cos(dYaw));
  const rate = Math.abs(dYaw) / (tail[tail.length - 1].t - tail[0].t);
  const rateFormula = G * Math.sqrt(n * n - 1) / v;
  const radius = v / rate, radiusFormula = v * v / (G * Math.sqrt(n * n - 1));
  check('level turn rate = g*sqrt(n^2-1)/V', Math.abs(rate / rateFormula - 1) < 0.1, `${(rate * DEG).toFixed(2)} deg/s vs ${(rateFormula * DEG).toFixed(2)} (n ${n.toFixed(2)}, ${Math.round(v / KT)} kt)`);
  check('level turn radius = V^2/(g*sqrt(n^2-1))', Math.abs(radius / radiusFormula - 1) < 0.1, `${Math.round(radius)} m vs ${Math.round(radiusFormula)} m`);
  check('60 deg bank holds about 2 g', Math.abs(n - 2) < 0.25, `n ${n.toFixed(2)}`);
}

// 2. Full back stick at 450 kt: flight computer holds 9 g, angle of attack below the stall
{
  const hM = 3000;
  const s = newState(450, hM);
  s.power = 100; s.isAfterburner = true;
  const out = fly(s, 4, () => ({ pitch: 1 }), hM);
  const nMax = Math.max(...out.map((x) => x.n));
  const aMax = Math.max(...out.map((x) => x.aoa));
  check('limiter on: g never above 9 (+1% margin)', nMax <= 9.09, `max ${nMax.toFixed(2)} g`);
  check('limiter on: pulls to at least 8.5 g at 450 kt', nMax >= 8.5, `max ${nMax.toFixed(2)} g`);
  check('limiter on: angle of attack stays below the stall', aMax < P.stallAoA, `max ${(aMax * DEG).toFixed(1)} deg, stall ${(P.stallAoA * DEG).toFixed(1)}`);
}

// 3. Full aileron at 400 kt: roll rate up to 240 deg/s, no more
{
  const hM = 3000;
  const s = newState(400, hM);
  const out = fly(s, 2, () => ({ roll: 1 }), hM);
  const rMax = Math.max(...out.map((x) => Math.abs(x.roll))) * DEG;
  check('roll rate at full aileron 200..245 deg/s', rMax >= 200 && rMax <= 245, `${rMax.toFixed(0)} deg/s`);
}

// 4. Limiter off at low speed, full back stick: stall and spin; stick forward + opposite rudder recovers
{
  const hM = 4000;
  const s = newState(180, hM);
  s.power = 30;
  const out = fly(s, 8, () => ({ pitch: 1 }), hM, { limiterOff: true });
  const stalled = out.some((x) => x.stalled);
  const spinMax = Math.max(...out.map((x) => Math.abs(x.spin)));
  check('limiter off: full back stick stalls the wing', stalled, `max AoA ${(Math.max(...out.map((x) => x.aoa)) * DEG).toFixed(1)} deg`);
  check('limiter off: held stall autorotates (spin)', spinMax > 0.8, `spin ${spinMax.toFixed(2)} rad/s`);
  const dir = Math.sign(s.spin || 1);
  s.power = 100;
  const rec = fly(s, 10, () => ({ pitch: -1, yaw: -dir }), hM, { limiterOff: true });
  const end = rec[rec.length - 1];
  check('limiter off: stick forward + opposite rudder recovers', !end.stalled && Math.abs(end.spin) < 0.1, `spin ${end.spin.toFixed(2)}, stalled ${end.stalled}`);
  // limiter back on at once: no stall
  const s2 = newState(180, hM); s2.power = 30;
  const on = fly(s2, 8, () => ({ pitch: 1 }), hM, { limiterOff: false });
  check('limiter on: same pull never stalls', !on.some((x) => x.stalled), '');
}

// 5. Weight: half the fuel burnt = better acceleration than full tanks
{
  const hM = 3000;
  const accel = (massKg) => {
    const s = newState(300, hM); s.power = 100; s.isAfterburner = true;
    const out = fly(s, 3, null, hM, { massKg });
    return (out[out.length - 1].v - out[0].v) / 3;
  };
  const full = accel(P.mass), light = accel(P.mass - FUEL_FULL / 2);
  check('lighter fighter accelerates faster', light > full * 1.15, `${full.toFixed(2)} vs ${light.toFixed(2)} m/s2`);
}

// 6. Supersonic: full afterburner at 9,000 m goes through Mach 1
{
  const hM = 9000;
  const s = newState(500, hM); s.power = 100; s.isAfterburner = true;
  fly(s, 90, null, hM, { autoAltFt: 0 });
  const mach = s.vel.length() / atmosphere(hM).soundMs;
  check('full afterburner at 9,000 m passes Mach 1.2', mach > 1.2, `Mach ${mach.toFixed(2)}`);
}

// 7. Pilot g over time
{
  const run = (g, sec) => { const s = newPilotG(); let o; let firstBlack = null; for (let t = 0; t < sec; t += DT) { o = stepPilotG(s, g, DT); if (o.gloc && firstBlack === null) firstBlack = t; } return { o, firstBlack }; };
  const g6 = run(6, 30), g8 = run(8, 30), g9 = run(9, 30), neg = run(-3, 6);
  check('6 g sustained: light grey-out only, no G-LOC', g6.firstBlack === null && g6.o.grey < 0.4, `grey ${g6.o.grey.toFixed(2)}`);
  check('8 g sustained: tunnel vision, no G-LOC', g8.firstBlack === null && g8.o.tunnel > 0.3, `tunnel ${g8.o.tunnel.toFixed(2)}`);
  check('9 g sustained: G-LOC after a few seconds (4..10 s)', g9.firstBlack !== null && g9.firstBlack > 4 && g9.firstBlack < 10, `G-LOC at ${g9.firstBlack?.toFixed(1)} s`);
  check('-3 g: red-out', neg.o.red > 0.5, `red ${neg.o.red.toFixed(2)}`);
  // recovery: after G-LOC at 1 g the pilot wakes and gets the controls back
  const s = newPilotG(); let o;
  for (let t = 0; t < 12; t += DT) o = stepPilotG(s, 9, DT);
  let back = null;
  for (let t = 0; t < 20; t += DT) { o = stepPilotG(s, 1, DT); if (!o.controlsLost && back === null) back = t; }
  check('after G-LOC at 1 g: controls back within 10 s', back !== null && back < 10, `back after ${back?.toFixed(1)} s`);
}

// 8. Aerobatics autopilot (src/flight/maneuvers.js) flown on the same physics, game-style throttle spool
{
  const { ManeuverPilot, ManeuverScore, predictPath } = await import(new URL('src/flight/maneuvers.js', ROOT).href);
  const az = (s) => Math.atan2(-s.vel.x, -s.vel.z);
  const wrapD = (a) => Math.atan2(Math.sin(a), Math.cos(a)) * DEG;
  const env = (s) => ({ ias: s.vel.length() * Math.sqrt(atmosphere(s.pos.y).sigma) * 1.94384, aglM: s.pos.y, turnDir: -1 });
  function flyManeuver(num, kt, hM, handOverAt = null) {
    const s = newState(kt, hM); s.power = 80; s.throttle = 0.8;
    fly(s, 2, null, hM);                                   // settle hands-off
    const p = new ManeuverPilot();
    const y0 = s.pos.y, a0 = az(s);
    const ghost = predictPath(num, s, Object.assign(env(s), { profile: P, massKg: P.mass, hMOf: (y) => y, step: stepFixedWingAir }));
    const sc = new ManeuverScore(); sc.start(ghost, num);
    const st = p.start(num, s, env(s));
    if (!st.ok) return { ok: false, why: st.why };
    let t = 0, nMax = 0, minY = s.pos.y, maxY = s.pos.y, result = null;
    let manual = false;
    while ((p.active || (manual && sc.on)) && t < 90) {
      if (handOverAt !== null && t >= handOverAt && !manual) { manual = true; p.stop(); }
      const u = manual ? { pitch: 0, roll: 0, yaw: 0 } : p.update(s, DT);
      if (!u) break;
      if (u.throttle !== undefined) s.throttle = u.throttle;
      s.power += (s.throttle * 100 - s.power) * Math.min(1, AIR.fighter.spool * DT);
      s.isAfterburner = s.throttle > 0.7;
      stepFixedWingAir(s, { pitch: u.pitch, roll: u.roll, yaw: u.yaw, autoAltFt: null, hM: s.pos.y, massKg: P.mass }, P, 'fighter', DT);
      s.pos.addScaledVector(s.vel, DT);
      result = sc.update(s.pos, s.vel, DT) || result;
      nMax = Math.max(nMax, s.loadG); minY = Math.min(minY, s.pos.y); maxY = Math.max(maxY, s.pos.y);
      t += DT;
    }
    result = result || sc.finish(s.pos, s.vel);
    return { ok: true, t, dHdg: wrapD(az(s) - a0), dAlt: s.pos.y - y0, nMax, minDy: minY - y0, maxDy: maxY - y0,
      kt: s.vel.length() / KT, done: !p.active, score: result ? result.score : null, ghostEnd: ghost ? ghost.points.length : 0 };
  }
  const show = (r) => `hdg ${r.dHdg.toFixed(1)} deg, alt ${r.dAlt.toFixed(0)} m (range ${r.minDy.toFixed(0)}..${r.maxDy.toFixed(0)}), max ${r.nMax.toFixed(1)} g, ${r.t.toFixed(1)} s, exit ${r.kt.toFixed(0)} kt, score ${r.score}`;
  const rev = (d) => 180 - Math.abs(d);
  let r;
  r = flyManeuver(1, 470, 2000);
  check('1 LOOP closes: heading +-5, height +-150 m, <= 7.6 g', r.done && Math.abs(r.dHdg) < 5 && Math.abs(r.dAlt) < 150 && r.nMax <= 7.6 && r.maxDy > 1000, show(r));
  r = flyManeuver(2, 470, 2000);
  check('2 IMMELMANN: heading 180 +-5, ends higher', r.done && rev(r.dHdg) < 5 && r.dAlt > 1000, show(r));
  r = flyManeuver(3, 300, 4000);
  check('3 SPLIT-S: heading 180 +-5, ends lower, stays above 2,000 m loss', r.done && rev(r.dHdg) < 5 && r.dAlt < -500 && r.minDy > -2000, show(r));
  r = flyManeuver(4, 400, 2000);
  check('4 BREAK 180: heading 180 +-10, height +-150 m', r.done && rev(r.dHdg) < 10 && Math.abs(r.dAlt) < 150, show(r));
  r = flyManeuver(5, 400, 2000);
  check('5 AILERON ROLL: heading +-5, height +-60 m', r.done && Math.abs(r.dHdg) < 5 && Math.abs(r.dAlt) < 60, show(r));
  r = flyManeuver(6, 400, 2000);
  check('6 BARREL ROLL: heading +-15, height +-250 m', r.done && Math.abs(r.dHdg) < 15 && Math.abs(r.dAlt) < 250, show(r));
  r = flyManeuver(7, 470, 2500);
  check('7 CUBAN EIGHT: back on the entry heading +-10, height +-250 m', r.done && Math.abs(r.dHdg) < 10 && Math.abs(r.dAlt) < 250, show(r));
  r = flyManeuver(8, 400, 2000);
  check('8 WINGOVER: heading 180 +-10, height +-250 m', r.done && rev(r.dHdg) < 10 && Math.abs(r.dAlt) < 250, show(r));
  r = flyManeuver(1, 470, 2000, 8);
  check('score: letting go of the stick half way through a loop scores low (< 60)', r.score !== null && r.score < 60, `score ${r.score}`);
  r = flyManeuver(1, 300, 2000);
  check('entry check: LOOP refused below 400 kt', !r.ok && r.why === 'SPD LOW', r.why || 'started');
  r = flyManeuver(3, 300, 1000);
  check('entry check: SPLIT-S refused below 1,500 m', !r.ok && r.why === 'ALT LOW', r.why || 'started');
}

console.log(failed ? `\n${failed} check(s) FAILED` : '\nAll checks passed');
process.exit(failed ? 1 : 0);
