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

console.log(failed ? `\n${failed} check(s) FAILED` : '\nAll checks passed');
process.exit(failed ? 1 : 0);
