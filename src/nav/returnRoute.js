// Return-to-land route for runway 09L at VOBL.
// World axes: -Z = east, +Z = west, -X = north, +X = south. Runway 09L lands towards -Z (heading 090),
// threshold at z = +2000 on x = 0. The route mirrors a real straight-in arrival:
//   JOIN (only when the aircraft is not already west of the field near the centreline)
//   -> IF  (intermediate fix, 11 km before the threshold, 1,800 ft above the field)
//   -> FAF (final approach fix, 6 km, on the 3 degree glide path ~1,000 ft above the field)
//   -> RWY 09L threshold (touchdown aim 400 m beyond)
// Waypoint altitudes are feet above sea level (VOBL field elevation 3,002 ft).
const THRESHOLD_Z = 2000;
const FT_PER_M = 3.28084;
const FIELD_FT = 3002;
const GLIDE = Math.tan(3 * Math.PI / 180);
const CAPTURE_M = 700; // waypoint passed when this close (horizontal)

function waypoint(name, x, z, aboveFieldFt) {
  return { name, x, z, altFt: Math.round((FIELD_FT + aboveFieldFt) / 10) * 10 };
}

// Compass bearing (deg, 0 = north) from a to b in world x/z
export function bearingDeg(ax, az, bx, bz) {
  const north = -(bx - ax);
  const east = -(bz - az);
  return (Math.atan2(east, north) * 180 / Math.PI + 360) % 360;
}

export function planReturnRoute(x, z) {
  const ifZ = THRESHOLD_Z + 11000;
  const fafZ = THRESHOLD_Z + 6000;
  const fixes = [
    waypoint('IF', 0, ifZ, 1800),
    waypoint('FAF', 0, fafZ, Math.round(6000 * GLIDE * FT_PER_M)),
    waypoint('RW09L', 0, THRESHOLD_Z, 50)
  ];
  // Already west of the field inside a 30 degree cone of the centreline: carry on with the fixes still ahead
  const inCone = z > THRESHOLD_Z + 3000 && Math.abs(x) < (z - THRESHOLD_Z) * Math.tan(30 * Math.PI / 180);
  if (inCone) return fixes.filter((f) => f.z < z - 500);
  // Otherwise join beside the extended centreline on the aircraft's side (like a downwind leg)
  const side = x >= 0 ? 1 : -1;
  return [waypoint('JOIN', side * 4000, ifZ + 2000, 2500), ...fixes];
}

export class NavComputer {
  constructor() {
    this.route = null;
    this.index = 0;
  }

  replan(x, z) {
    this.route = planReturnRoute(x, z);
    this.index = 0;
  }

  // state: sim state; headingDeg: current heading; altFt: altitude above sea level.
  // Returns nav data for map / MFD / HUD, or null on the ground.
  update(state, headingDeg, altFt) {
    if (state.onGround && state.ias < 40) {
      // Parked or rolled out: the next take-off plans a fresh route home
      if (this.route && this.index >= this.route.length) this.route = null;
      if (!this.route) return null;
    }
    if (!this.route) this.replan(state.pos.x, state.pos.z);

    let wp = this.route[Math.min(this.index, this.route.length - 1)];
    const dist = Math.hypot(wp.x - state.pos.x, wp.z - state.pos.z);
    // Sequence: passed when close, or when abeam (already beyond it along the inbound course)
    const isLast = this.index >= this.route.length - 1;
    if (!isLast && (dist < CAPTURE_M || (this.index > 0 && wp.x === 0 && state.pos.z < wp.z && Math.abs(state.pos.x) < 1500))) {
      this.index++;
      wp = this.route[this.index];
    }
    if (isLast && state.onGround) this.index = this.route.length; // landed: route complete

    const d = Math.hypot(wp.x - state.pos.x, wp.z - state.pos.z);
    const brg = bearingDeg(state.pos.x, state.pos.z, wp.x, wp.z);
    let turn = brg - headingDeg;
    turn = ((turn + 540) % 360) - 180;
    const gsMs = Math.max(1, Math.hypot(state.vel.x, state.vel.z));

    // Remaining route length (for the total ETA)
    let remaining = d;
    for (let i = this.index + 1; i < this.route.length; i++) {
      const a = this.route[i - 1], b = this.route[i];
      remaining += Math.hypot(b.x - a.x, b.z - a.z);
    }
    return {
      route: this.route,
      index: Math.min(this.index, this.route.length - 1),
      complete: this.index >= this.route.length,
      name: wp.name,
      bearing: brg,
      turn,
      distM: d,
      distNm: d / 1852,
      etaSec: d / gsMs,
      totalEtaSec: remaining / gsMs,
      targetAltFt: wp.altFt,
      altFt
    };
  }
}
