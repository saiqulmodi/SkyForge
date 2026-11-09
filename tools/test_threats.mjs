// Threat checks (fighter upgrade, phase 5, 09-Nov-2026): enemy fighters, SAM sites, decoys, damage.
// Runs the game's own src/combat/threats.js + fighterWeapons.js + damage.js on a test clock, no browser needed.
// Run: node tools/test_threats.mjs      (exit code 1 when a check fails)
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
const { FighterWeapons } = await import(new URL('src/combat/fighterWeapons.js', ROOT).href);
const { ThreatManager } = await import(new URL('src/combat/threats.js', ROOT).href);
const { DamageModel } = await import(new URL('src/combat/damage.js', ROOT).href);

const KT = 1 / 1.94384, DT = 1 / 60;
let failed = 0;
const check = (name, ok, detail) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  ${detail}`); if (!ok) failed++; };
let seed = 11;
Math.random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

// a world: flat ground, the range's two existing sites (radar SAM + search radar) at given places
function world(samPos, radarPos) {
  const scene = new THREE.Scene();
  const site = (id, p) => { const m = new THREE.Group(); m.position.copy(p); return { id, type: 'GROUND', mesh: m, position: m.position, velocity: new THREE.Vector3(), hitRadius: 12, health: 200, maxHealth: 200, isDestroyed: false, home: p.clone() }; };
  const targets = [site('SAM-SITE-01', samPos), site('RADAR-SITE-02', radarPos)];
  const weapons = new FighterWeapons(scene, { groundY: () => 0, targets: () => targets });
  const damage = new DamageModel();
  const own = { pos: new THREE.Vector3(), vel: new THREE.Vector3(), rot: new THREE.Euler(0, 0, 0, 'YXZ'), onGround: false, loadG: 1 };
  const ownTarget = { id: 'OWN', isOwn: true, hitRadius: 8, damageScale: 0.3, get position() { return own.pos; }, get velocity() { return own.vel; },
    get loadG() { return own.loadG; }, get health() { return damage.health; }, set health(v) { damage.health = Math.max(0, v); }, isDestroyed: false };
  const th = new ThreatManager(scene, { targets, groundY: () => 0, weapons, own: ownTarget, isActive: () => true });
  // park every AI flyer far away; tests bring in the one they need
  for (const t of th.ai) { if (t.type === 'AIR') { t.home.set(5e5, 4000, 5e5); th.respawn(t); } }
  return { scene, targets, weapons, damage, own, ownTarget, th };
}
function setOwn(own, pos, hdgRad, kt) {
  own.pos.copy(pos);
  own.rot.set(0, hdgRad, 0);
  own.vel.set(0, 0, -1).applyEuler(own.rot).multiplyScalar(kt * KT);
}
// fly the player: straight, or defend once a missile is coming: FLARE = 6 g break turn, CHAFF = turn to fly across the
// missile's line of sight (beam it); decoys in pairs every second while a missile is coming
function run(w, sec, opts = {}) {
  let launched = 0, impacts = 0, relT = 0;
  const up = new THREE.Vector3(0, 1, 0), los = new THREE.Vector3(), want = new THREE.Vector3();
  for (let t = 0; t < sec; t += DT) {
    const incoming = w.weapons.missiles.filter((m) => m.owner === 'enemy' && m.target === w.ownTarget);
    if (incoming.length && opts.defend) {
      const v = w.own.vel.length();
      let turn = 6 * 9.81 / v * DT;
      if (opts.defend === 'CHAFF') {
        los.copy(w.own.pos).sub(incoming[0].pos).setY(0).normalize();
        want.crossVectors(los, up);
        if (want.dot(w.own.vel) < 0) want.negate();
        const err = Math.atan2(w.own.vel.x * want.z - w.own.vel.z * want.x, w.own.vel.x * want.x + w.own.vel.z * want.z);
        turn = Math.max(-turn, Math.min(turn, -err));
      }
      w.own.vel.applyAxisAngle(up, turn);
      w.own.rot.y += turn;
      w.own.loadG = Math.abs(turn) > 1e-4 ? 6 : 1;
      relT -= DT;
      if (relT <= 0) { w.weapons.releaseDecoys(opts.defend, w.own, w.ownTarget); relT = 1.0; }
    } else w.own.loadG = 1;
    w.own.pos.addScaledVector(w.own.vel, DT);
    w.th.update(DT, w.own);
    for (const e of w.weapons.update(DT, w.own, null)) {
      if (e.type === 'launch' && e.owner === 'enemy') launched++;
      if (e.type === 'impact' && e.owner === 'enemy' && e.target === w.ownTarget) impacts++;
    }
    if (w.damage.dead) break;
  }
  return { launched, impacts };
}

// 1. An enemy fighter turns onto a player flying straight and shoots it with heat seekers
{
  let runs = 0, hit = 0, shots = 0;
  for (let i = 0; i < 12; i++) {
    const w = world(new THREE.Vector3(1e6, 0, 1e6), new THREE.Vector3(1e6, 0, 1e6));
    const b = w.th.ai.find((t) => t.id === 'BANDIT-1');
    b.home.set(0, 4000, -9000); w.th.respawn(b);
    b.velocity.set(0, 0, 1).multiplyScalar(250);
    setOwn(w.own, new THREE.Vector3(0, 4000, 0), Math.PI * (Math.random() - 0.5) * 0.6, 420);
    const r = run(w, 90);
    runs++; shots += r.launched;
    if (w.damage.health < 100) hit++;
  }
  check('1 enemy fighter engages a player flying straight, fires heat seekers and hits most of the time', shots >= runs && hit / runs >= 0.7, `${hit}/${runs} players hit, ${shots} missiles fired`);
}

// 2. ...but flares in pairs and a hard break turn at the launch warning defeat its missiles most of the time
{
  let shots = 0, hits = 0;
  for (let i = 0; i < 12; i++) {
    const w = world(new THREE.Vector3(1e6, 0, 1e6), new THREE.Vector3(1e6, 0, 1e6));
    const b = w.th.ai.find((t) => t.id === 'BANDIT-1');
    b.home.set(0, 4000, -9000); w.th.respawn(b);
    b.velocity.set(0, 0, 1).multiplyScalar(250);
    setOwn(w.own, new THREE.Vector3(0, 4000, 0), Math.PI * (Math.random() - 0.5) * 0.6, 420);
    w.weapons.loadout.flares = 1000;
    const r = run(w, 90, { defend: 'FLARE' });
    shots += r.launched;
    hits += r.impacts;
  }
  check('2 flares + 6 g break turn beat the enemy fighter\'s heat seekers most of the time', shots > 0 && hits / shots < 0.4, `${hits} hits from ${shots} missiles`);
}

// 3. Radar SAM: no shot beyond 20 km or below 100 m; inside 12 km it locks (RWR) and fires after 3 s; chaff + beaming beats it often
{
  const far = world(new THREE.Vector3(0, 0, 0), new THREE.Vector3(500, 0, 0));
  setOwn(far.own, new THREE.Vector3(0, 3000, 24000), Math.PI, 450);
  far.own.vel.set(0, 0, 0);
  const rf = run(far, 20);
  const low = world(new THREE.Vector3(0, 0, 0), new THREE.Vector3(500, 0, 0));
  setOwn(low.own, new THREE.Vector3(0, 60, 8000), Math.PI, 450);
  low.own.vel.set(0, 0, 0);
  const rl = run(low, 20);
  const near = world(new THREE.Vector3(0, 0, 0), new THREE.Vector3(500, 0, 0));
  setOwn(near.own, new THREE.Vector3(0, 3000, 10000), Math.PI / 2, 450);   // flying across
  let lockSeen = false, firstShot = null;
  for (let t = 0; t < 8; t += DT) {
    near.own.pos.addScaledVector(near.own.vel, DT);
    near.th.update(DT, near.own);
    if (near.th.rwr.some((r) => r.kind === 'S' && r.level === 'lock')) lockSeen = true;
    for (const e of near.weapons.update(DT, near.own, null)) if (e.type === 'launch' && firstShot === null) firstShot = t;
  }
  let shots = 0, hits = 0;
  for (let i = 0; i < 16; i++) {
    const w = world(new THREE.Vector3(0, 0, 0), new THREE.Vector3(500, 0, 0));
    setOwn(w.own, new THREE.Vector3(0, 3000, 10000), Math.PI / 2, 450);
    w.weapons.loadout.chaff = 1000;
    w.damage.health = 1e6;   // keep flying to face every SAM
    const r = run(w, 60, { defend: 'CHAFF' });
    shots += r.launched;
    hits += r.impacts;
  }
  check('3 radar SAM: quiet at 24 km and below 100 m, locks + fires ~3 s inside 12 km, chaff + turning beats it often', rf.launched === 0 && rl.launched === 0 && lockSeen && firstShot > 2.9 && firstShot < 3.5 && hits / Math.max(1, shots) < 0.6,
    `24 km: ${rf.launched}, 60 m: ${rl.launched}, lock ${lockSeen}, first shot ${firstShot && firstShot.toFixed(2)} s; beaming with chaff ${hits} hits from ${shots} SAMs`);
}

// 4. Search radar: with it the SAM fires at 15 km... (tracks at 20, locks at 12) - without it the SAM sees only 10 km
{
  const a = world(new THREE.Vector3(0, 0, 0), new THREE.Vector3(500, 0, 0));
  setOwn(a.own, new THREE.Vector3(0, 3000, 15000), Math.PI, 450); a.own.vel.set(0, 0, 0);
  a.th.update(DT, a.own);
  const trackWith = a.th.rwr.some((r) => r.kind === 'S');
  const b = world(new THREE.Vector3(0, 0, 0), new THREE.Vector3(500, 0, 0));
  b.targets[1].isDestroyed = true;
  setOwn(b.own, new THREE.Vector3(0, 3000, 15000), Math.PI, 450); b.own.vel.set(0, 0, 0);
  b.th.update(DT, b.own);
  const trackWithout = b.th.rwr.some((r) => r.kind === 'S');
  check('4 SAM tracks at 15 km with its search radar, not after the radar is destroyed', trackWith && !trackWithout, `with radar ${trackWith}, without ${trackWithout}`);
}

// 5. Damage: smoke < 85 %, engine < 60 %, fire + stiff stick < 40 %, lost at 0; a hit takes 30-90 %
{
  const d = new DamageModel();
  const steps = [];
  for (const h of [90, 80, 55, 35, 0]) { d.health = h; steps.push(`${h}:${+d.smoke}${+d.engineHit}${+d.fire}${d.stick}${+d.dead}`); }
  const w = world(new THREE.Vector3(1e6, 0, 1e6), new THREE.Vector3(1e6, 0, 1e6));
  setOwn(w.own, new THREE.Vector3(0, 4000, 0), 0, 420);
  w.weapons.launchFrom('IR', new THREE.Vector3(0, 4000, 3000), new THREE.Vector3(0, 0, -300), w.ownTarget, { id: 'TEST' });
  run(w, 20);
  const oneHit = 100 - w.damage.health;
  check('5 damage steps (smoke, engine, fire + stiff stick, lost) and one missile hit = 30-90 %', steps.join(' ') === '90:00010 80:10010 55:11010 35:1110.50 0:1110.51' && oneHit >= 30 && oneHit <= 90,
    `${steps.join(' ')}; one hit ${oneHit.toFixed(0)} %`);
}

// 6. The hard drone breaks and drops flares against the player's heat seekers; the easy weaver does not
{
  const shoot = (id) => {
    let hits = 0;
    for (let i = 0; i < 16; i++) {
      const w = world(new THREE.Vector3(1e6, 0, 1e6), new THREE.Vector3(1e6, 0, 1e6));
      const t = w.th.ai.find((x) => x.id === id);
      t.home.set(0, 3000, -6000); w.th.respawn(t);
      t.velocity.set(0, 0, -1).multiplyScalar(t.speed);
      setOwn(w.own, new THREE.Vector3(0, 3000, 0), 0, 450);
      w.weapons.arm = true;
      w.weapons.launch('IR', w.own, t);
      for (let s = 0; s < 40 && w.weapons.missiles.length; s += DT) { w.own.pos.addScaledVector(w.own.vel, DT); w.th.update(DT, w.own); w.weapons.update(DT, w.own, null); }
      if (t.health < 100) hits++;
    }
    return hits;
  };
  const easy = shoot('TGT-AIR-03'), hard = shoot('TGT-AIR-04');
  check('6 heat seeker vs drones: the weaver is hit almost always, the flaring jinker much less', easy >= 14 && hard <= 11, `weaver ${easy}/16, jinker ${hard}/16`);
}

// 7. Heat-seeking SAM: fires inside 5 km below 3,000 m, not higher or further
{
  const shotAt = (pos) => {
    const w = world(new THREE.Vector3(1e6, 0, 1e6), new THREE.Vector3(1e6, 0, 1e6));
    const s = w.th.ai.find((x) => x.id === 'SAM-SITE-03');
    setOwn(w.own, s.position.clone().add(pos), 0, 450); w.own.vel.set(0, 0, 0);
    return run(w, 3).launched;
  };
  const a = shotAt(new THREE.Vector3(0, 1500, 4000)), b = shotAt(new THREE.Vector3(0, 4000, 2000)), c = shotAt(new THREE.Vector3(0, 1500, 7000));
  check('7 heat-seeking SAM fires at 4 km / 1,500 m, not at 4,000 m high or 7 km away', a > 0 && b === 0 && c === 0, `4 km low ${a}, high ${b}, far ${c}`);
}

// 8. ...and a player who does nothing against the radar SAM is hit
{
  let shots = 0, hits = 0;
  for (let i = 0; i < 8; i++) {
    const w = world(new THREE.Vector3(0, 0, 0), new THREE.Vector3(500, 0, 0));
    setOwn(w.own, new THREE.Vector3(0, 3000, 10000), Math.PI / 2 + (Math.random() - 0.5), 450);
    w.damage.health = 1e6;
    const r = run(w, 40);
    shots += r.launched; hits += r.impacts;
  }
  check('8 radar SAM hits a player who does not defend', shots > 0 && hits / shots > 0.7, `${hits} hits from ${shots} SAMs`);
}

console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
process.exit(failed ? 1 : 0);
