// Fighter weapons and radar checks (fighter upgrade, phase 4, 09-Nov-2026).
// Runs the game's own src/combat/fighterWeapons.js and src/combat/radar.js on a test clock, no browser needed.
// Run: node tools/test_weapons.mjs      (exit code 1 when a check fails)
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

const ROOT = new URL('../', import.meta.url);
const THREE_URL = new URL('vendor/three/build/three.module.js', ROOT).href;
register('data:text/javascript,' + encodeURIComponent(`
  export async function resolve(spec, ctx, next) {
    if (spec === 'three') return { url: ${JSON.stringify(THREE_URL)}, shortCircuit: true };
    return next(spec, ctx);
  }`), pathToFileURL('./'));

const THREE = await import('three');
const { FighterWeapons, Loadout, STORES } = await import(new URL('src/combat/fighterWeapons.js', ROOT).href);
const { Radar } = await import(new URL('src/combat/radar.js', ROOT).href);

const KT = 1 / 1.94384, DEG = Math.PI / 180, DT = 1 / 60;
let failed = 0;
const check = (name, ok, detail) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  ${detail}`); if (!ok) failed++; };
let seed = 7;
const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
Math.random = rnd;   // repeatable runs

const yawFor = (dx, dz) => Math.atan2(-dx, -dz);
function own(x, y, z, yaw, kt, pitch = 0) {
  const rot = new THREE.Euler(pitch, yaw, 0, 'YXZ');
  const vel = new THREE.Vector3(0, 0, -1).applyEuler(rot).multiplyScalar(kt * KT);
  return { pos: new THREE.Vector3(x, y, z), vel, rot };
}
function drone(pos, hdgDeg, speed) {
  const h = hdgDeg * DEG;
  return { id: 'T', type: 'AIR', position: pos.clone(), velocity: new THREE.Vector3(Math.sin(h) * speed, 0, -Math.cos(h) * speed), hitRadius: 8, health: 100, isDestroyed: false };
}
// run until the missile is gone; the target flies straight (or as move() says), the aircraft flies straight
function runShot(w, o, tgt, kind, opts = {}) {
  const r = w.launch(kind, o, tgt);
  if (!r.ok) return { launched: false, why: r.why };
  let hit = false, decoyed = false, t = 0;
  while (w.missiles.length && t < 100) {
    t += DT;
    o.pos.addScaledVector(o.vel, DT);
    if (opts.move) opts.move(tgt, t, w); else tgt.position.addScaledVector(tgt.velocity, DT);
    for (const e of w.update(DT, o, opts.lock === false ? null : tgt)) {
      if (e.type === 'impact' && e.target === tgt) hit = true;
      if (e.type === 'decoyed') decoyed = true;
    }
  }
  return { launched: true, hit, decoyed, t };
}

// 1. Heat-seeking missile against a straight-flying drone, inside the launch zone: at least 90 % hits
{
  let shots = 0, hits = 0;
  for (let i = 0; i < 40; i++) {
    const w = new FighterWeapons(new THREE.Scene(), { groundY: () => 0 });
    w.arm = true;
    const o = own(0, 4000, 0, 0, 450);
    const r = 1500 + rnd() * 9000, off = (rnd() - 0.5) * 30 * DEG;
    const tgt = drone(new THREE.Vector3(-Math.sin(off) * r, 4000 + (rnd() - 0.5) * 600, -Math.cos(off) * r), rnd() * 360, 180 + rnd() * 40);
    const z = w.dlz('IR', o, tgt);
    if (z.range < z.rmin || z.range > z.rmax) continue;
    shots++;
    if (runShot(w, o, tgt, 'IR').hit) hits++;
  }
  check('1 IR missile hits a straight-flying drone inside its launch zone (>= 90 %)', shots >= 15 && hits / shots >= 0.9, `${hits}/${shots} hits`);
}

// 2. Radar missile, 3-40 km, datalink then its own radar: at least 90 % hits
{
  let shots = 0, hits = 0, maxR = 0;
  for (let i = 0; i < 40; i++) {
    const w = new FighterWeapons(new THREE.Scene(), { groundY: () => 0 });
    w.arm = true;
    const o = own(0, 6000, 0, 0, 500);
    const r = 3000 + rnd() * 37000, off = (rnd() - 0.5) * 40 * DEG;
    const tgt = drone(new THREE.Vector3(-Math.sin(off) * r, 6000 + (rnd() - 0.5) * 1500, -Math.cos(off) * r), rnd() * 360, 180 + rnd() * 40);
    const z = w.dlz('RDR', o, tgt);
    if (z.range < z.rmin || z.range > z.rmax) continue;
    shots++;
    if (runShot(w, o, tgt, 'RDR').hit) { hits++; maxR = Math.max(maxR, r); }
  }
  check('2 radar missile hits a straight-flying drone inside its launch zone (>= 90 %)', shots >= 15 && hits / shots >= 0.9, `${hits}/${shots} hits, longest hit ${(maxR / 1000).toFixed(1)} km`);
}

// 3. Missile performance: IR reaches about Mach 2.5 at burn-out, radar missile goes past 40 km head-on at 9 km height
{
  const w = new FighterWeapons(new THREE.Scene(), { groundY: () => 0 });
  w.arm = true;
  const o = own(0, 6000, 0, 0, 450);
  const far = drone(new THREE.Vector3(0, 6000, -60000), 0, 0);
  w.launch('IR', o, far);
  let t = 0, vMax = 0;
  while (t < 2.6) { t += DT; w.update(DT, o, null); vMax = Math.max(vMax, w.missiles[0].vel.length()); }
  const mach = vMax / 316;
  const w2 = new FighterWeapons(new THREE.Scene(), { groundY: () => 0 });
  const z = w2.dlz('RDR', own(0, 9000, 0, 0, 500), drone(new THREE.Vector3(0, 9000, -40000), 180, 250));
  const zi = w2.dlz('IR', own(0, 6000, 0, 0, 450), drone(new THREE.Vector3(0, 6000, -10000), 180, 220));
  check('3 IR missile about Mach 2.5 at burn-out; radar missile head-on range past 40 km at 9 km', mach > 2.2 && mach < 2.9 && z.rmax > 40000,
    `IR Mach ${mach.toFixed(2)}, RDR head-on Rmax ${(z.rmax / 1000).toFixed(1)} km, IR head-on Rmax ${(zi.rmax / 1000).toFixed(1)} km / no-escape ${(zi.rne / 1000).toFixed(1)} km`);
}

// 4. Flares: released early with a hard turn they pull an IR missile away most of the time; chaff fools a radar missile when beaming
{
  let shots = 0, beaten = 0;
  for (let i = 0; i < 30; i++) {
    const w = new FighterWeapons(new THREE.Scene(), { groundY: () => 0 });
    w.arm = true;
    const o = own(0, 4000, 0, 0, 450);
    const tgt = drone(new THREE.Vector3(0, 4000, -7000), 180 + (rnd() - 0.5) * 60, 220);
    tgt.loadG = 1;
    let released = 0;
    const move = (t, time, ww) => {
      const m = ww.missiles[0];
      const d = m ? m.pos.distanceTo(t.position) : 1e9;
      if (d < 4500) {
        t.loadG = 6;   // hard turn
        const turn = 6 * 9.81 / t.velocity.length() * DT;
        t.velocity.applyAxisAngle(new THREE.Vector3(0, 1, 0), turn);
        if (released < 3 && time > released * 0.6) { ww.releaseDecoys('FLARE', { pos: t.position, vel: t.velocity, rot: new THREE.Euler(0, Math.atan2(-t.velocity.x, -t.velocity.z), 0, 'YXZ') }, t); released++; }
      }
      t.position.addScaledVector(t.velocity, DT);
    };
    const r = runShot(w, o, tgt, 'IR', { move, lock: false });
    if (!r.launched) continue;
    shots++;
    if (!r.hit) beaten++;
  }
  let cs = 0, cb = 0;
  for (let i = 0; i < 30; i++) {
    const w = new FighterWeapons(new THREE.Scene(), { groundY: () => 0 });
    w.arm = true;
    const o = own(0, 5000, 0, 0, 450);
    const tgt = drone(new THREE.Vector3(0, 5000, -20000), 90, 230);   // flying across the line of sight
    let released = 0;
    const move = (t, time, ww) => {
      const m = ww.missiles[0];
      if (m && m.pos.distanceTo(t.position) < 12000 && released < 4 && time > 8 + released) {
        ww.releaseDecoys('CHAFF', { pos: t.position, vel: t.velocity, rot: new THREE.Euler(0, Math.atan2(-t.velocity.x, -t.velocity.z), 0, 'YXZ') }, t); released++;
      }
      t.position.addScaledVector(t.velocity, DT);
    };
    const r = runShot(w, o, tgt, 'RDR', { move });
    if (!r.launched) continue;
    cs++;
    if (!r.hit) cb++;
  }
  check('4 early flares + hard turn beat an IR missile most of the time; chaff while beaming beats a radar missile often', beaten / shots > 0.6 && cb / cs > 0.4,
    `flares ${beaten}/${shots} missiles defeated, chaff ${cb}/${cs}`);
}

// 5. Bombs land on the CCIP point (within 30 m): level and dive releases, flat ground and hills
{
  const hills = (x, z) => 150 + 120 * Math.sin(x / 900) * Math.cos(z / 700);
  let worst = 0, n = 0;
  for (const ground of [() => 0, hills]) {
    for (let i = 0; i < 12; i++) {
      const w = new FighterWeapons(new THREE.Scene(), { groundY: ground });
      w.arm = true;
      const dive = i < 4 ? 0 : -(15 + rnd() * 30) * DEG;
      const h = 300 + rnd() * 2000 + 400;
      const o = own(rnd() * 3000, h, rnd() * 3000, rnd() * 6, 380 + rnd() * 140, dive);
      const aim = w.ccip(o).point.clone();
      w.dropBomb(o);
      let at = null, t = 0;
      while (!at && t < 90) {
        t += DT;
        o.pos.addScaledVector(o.vel, DT);
        for (const e of w.update(DT, o, null)) if (e.type === 'bombImpact') at = e.at;
      }
      const miss = at ? Math.hypot(at.x - aim.x, at.z - aim.z) : 1e9;
      worst = Math.max(worst, miss); n++;
    }
  }
  check('5 bomb lands within 30 m of the CCIP point (24 releases: level + dive, flat + hills)', worst < 30, `worst miss ${worst.toFixed(2)} m of ${n}`);
}

// 6. Bomb blast destroys a ground target it lands next to
{
  const w = new FighterWeapons(new THREE.Scene(), { groundY: () => 0 });
  w.arm = true;
  const site = { id: 'SAM', type: 'GROUND', position: new THREE.Vector3(), velocity: new THREE.Vector3(), hitRadius: 12, health: 200, isDestroyed: false };
  w.targets = () => [site];
  const o = own(0, 1500, 0, 0, 450, -30 * DEG);
  const p = w.ccip(o).point;
  site.position.set(p.x + 12, 0, p.z - 8);
  w.dropBomb(o);
  let t = 0;
  while (w.bombs.length && t < 60) { t += DT; o.pos.addScaledVector(o.vel, DT); w.update(DT, o, null); }
  check('6 bomb 14 m from a SAM site destroys it', site.health <= 0, `health left ${site.health.toFixed(0)}`);
}

// 7. Gun: 6,000 rounds a minute, 511 rounds, gravity drop, a burst at a drone 600 m ahead hits it
{
  const w = new FighterWeapons(new THREE.Scene(), { groundY: () => 0 });
  w.arm = true;
  const o = own(0, 3000, 0, 0, 400);
  let fired = 0, t = 0;
  while (t < 1) { t += DT; fired += w.gun(DT, o, true); w.update(DT, o, null); o.pos.addScaledVector(o.vel, DT); }
  const all = (() => { const w2 = new FighterWeapons(new THREE.Scene(), {}); w2.arm = true; const o2 = own(0, 3000, 0, 0, 400); let n = 0; for (let k = 0; k < 600; k++) n += w2.gun(DT, o2, true); return n; })();
  // drop: one round fired level, after 1.0 s
  const w3 = new FighterWeapons(new THREE.Scene(), { groundY: () => -1e9 });
  w3.arm = true;
  const o3 = own(0, 3000, 0, 0, 0);
  o3.vel.set(0, 0, 0);
  w3.gunAcc = 0.99; w3.gun(1 / 600, o3, true);
  let i3 = w3.rl.findIndex((x) => x > 0), tt = 0;
  const y0 = w3.rp[3 * i3 + 1];
  while (tt < 1 - 1e-9) { tt += DT; w3.update(DT, o3, null); }
  const drop = y0 - w3.rp[3 * i3 + 1];
  const dist = -w3.rp[3 * i3 + 2];
  // burst at a drone 600 m ahead flying the same way
  const w4 = new FighterWeapons(new THREE.Scene(), { groundY: () => 0 });
  w4.arm = true;
  const o4 = own(0, 3000, 0, 0, 400);
  const tgt = drone(new THREE.Vector3(0, 3001, -600), 0, 400 * KT);
  w4.targets = () => [tgt];
  const lead = w4.lcos(o4, tgt);
  o4.rot.x += Math.asin(lead.y) * -1 + 0;   // put the gun cross where the lead ring says (about 1 m of drop at 600 m)
  t = 0;
  while (t < 0.5) { t += DT; w4.gun(DT, o4, true); w4.update(DT, o4, null); o4.pos.addScaledVector(o4.vel, DT); tgt.position.addScaledVector(tgt.velocity, DT); }
  t = 0; while (t < 1.5) { t += DT; w4.update(DT, o4, null); tgt.position.addScaledVector(tgt.velocity, DT); }
  check('7 gun: 100 rounds/s, stops at 511, 3-5 m drop in 1 s (drag slows the fall too), a 0.5 s burst hits a drone 600 m ahead', Math.abs(fired - 100) <= 2 && all === 511 && drop > 3 && drop < 5 && tgt.health < 100,
    `${fired} rounds in 1 s, ${all} in total, drop ${drop.toFixed(1)} m at ${dist.toFixed(0)} m, drone health ${tgt.health}`);
}

// 8. Stores: weight and drag fall as they are fired; master arm cannot be switched on on the ground; nothing fires on SAFE
{
  const L = new Loadout();
  const full = L.massKg(), dragFull = L.dragAdd();
  L.take('IR'); L.take('IR');
  const afterIR = L.massKg();
  for (let i = 0; i < 4; i++) L.take('BOMB');
  const w = new FighterWeapons(new THREE.Scene(), {});
  const g = w.setArm(true, true);
  const o = own(0, 3000, 0, 0, 400);
  const safeGun = w.gun(0.5, o, true);
  const safeBomb = w.dropBomb(o).ok;
  check('8 stores: weight + drag drop as fired, ARM refused on the ground, SAFE fires nothing', full > 1500 && full - afterIR === 2 * STORES.IR.kg && L.dragAdd() < dragFull && L.rollScale() === 1 && !g.ok && safeGun === 0 && !safeBomb,
    `full ${full.toFixed(0)} kg (drag +${(dragFull * 100).toFixed(0)} %), after 2 IR ${afterIR.toFixed(0)} kg, ARM on ground: ${g.why}`);
}

// 9. Radar: contacts inside 40 km / 60 deg, lock nearest the nose, T again = next, hidden by a hill, lost after 2 s out of view
{
  const hill = (x, z) => (z < -12000 && z > -14000 ? 6000 : 0);
  const radar = new Radar(hill);
  const o = own(0, 3000, 0, 0, 450);
  const a = drone(new THREE.Vector3(2000, 3000, -10000), 90, 200);      // 11 deg right
  const b = drone(new THREE.Vector3(-500, 3000, -8000), 0, 200);         // 4 deg left
  const c = drone(new THREE.Vector3(0, 3000, -20000), 0, 200);           // behind the hill
  const d = drone(new THREE.Vector3(9000, 3000, -2000), 0, 200);         // 77 deg off the nose
  const e = drone(new THREE.Vector3(0, 3000, -45000), 0, 200);           // too far
  a.id = 'A'; b.id = 'B'; c.id = 'C'; d.id = 'D'; e.id = 'E';
  radar.update(DT, o, [a, b, c, d, e]);
  const ids = radar.contacts.map((k) => k.t.id).sort().join('');
  const first = radar.lockNext().id, second = radar.lockNext().id;
  radar.update(DT, o, [a, b, c, d, e]);
  const tr = radar.track;
  // turn away: the lock holds for 2 s, then drops
  o.rot.y += 100 * DEG;
  let held = 0;
  for (let t = 0; t < 3; t += DT) { radar.update(DT, o, [a, b]); if (radar.lock) held = t; }
  check('9 radar: sees A+B only, locks B (nearest the nose) then A, track numbers, lock drops ~2 s after leaving the view', ids === 'AB' && first === 'B' && second === 'A' && tr && Math.abs(tr.tgtKt - 389) < 2 && held > 1.9 && held < 2.1,
    `contacts ${ids}, lock ${first} then ${second}, A: ${(tr.range / 1000).toFixed(1)} km, ${tr.tgtKt.toFixed(0)} kt, hdg ${tr.tgtHdg.toFixed(0)}, aspect ${tr.aspectDeg.toFixed(0)}${tr.aspectSide}, closure ${tr.closureKt.toFixed(0)} kt; held ${held.toFixed(2)} s`);
}

console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
process.exit(failed ? 1 : 0);
