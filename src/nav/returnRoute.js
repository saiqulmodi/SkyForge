// Return-to-land route for the active runway end (any South India airport; VOBL 09L by default).
// Worked out in the runway's own frame: u = metres before the threshold along the approach (positive on the
// approach side), v = metres to the side of the extended centreline. The route mirrors a straight-in arrival:
//   JOIN (only when the aircraft is not already on the approach side near the centreline)
//   -> IF  (intermediate fix, 11 km before the threshold, 1,800 ft above the field)
//   -> FAF (final approach fix, 6 km, on the 3 degree glide path ~1,000 ft above the field)
//   -> runway threshold (touchdown aim 400 m beyond)
// Waypoint altitudes are feet above sea level.
const FT_PER_M = 3.28084;
const GLIDE = Math.tan(3 * Math.PI / 180);
const CAPTURE_M = 700; // waypoint passed when this close (horizontal)

// Default: VOBL runway 09L (threshold x 0, z +2000, landing towards -Z, field 3,002 ft)
const VOBL_09L = { icao: 'VOBL', ident: '09L', thrX: 0, thrZ: 2000, dirX: 0, dirZ: -1, elevFt: 3002 };

// Compass bearing (deg, 0 = north) from a to b in world x/z
export function bearingDeg(ax, az, bx, bz) {
  const north = -(bx - ax);
  const east = -(bz - az);
  return (Math.atan2(east, north) * 180 / Math.PI + 360) % 360;
}

// World x, z -> runway frame { u, v }
function toRunway(end, x, z) {
  const dx = x - end.thrX, dz = z - end.thrZ;
  return { u: -(dx * end.dirX + dz * end.dirZ), v: dx * -end.dirZ + dz * end.dirX };
}

function waypoint(end, name, v, u, aboveFieldFt) {
  return {
    name, u, v,
    x: end.thrX - end.dirX * u - end.dirZ * v,
    z: end.thrZ - end.dirZ * u + end.dirX * v,
    altFt: Math.round((end.elevFt + aboveFieldFt) / 10) * 10
  };
}

export function planReturnRoute(x, z, end = VOBL_09L) {
  const fixes = [
    waypoint(end, 'IF', 0, 11000, 1800),
    waypoint(end, 'FAF', 0, 6000, Math.round(6000 * GLIDE * FT_PER_M)),
    waypoint(end, `RW${end.ident}`, 0, 0, 50)
  ];
  const p = toRunway(end, x, z);
  // Already on the approach side inside a 30 degree cone of the centreline: carry on with the fixes ahead
  const inCone = p.u > 3000 && Math.abs(p.v) < p.u * Math.tan(30 * Math.PI / 180);
  if (inCone) return fixes.filter((f) => f.u < p.u - 500);
  // Otherwise join beside the extended centreline on the aircraft's side (like a downwind leg)
  const side = p.v >= 0 ? 1 : -1;
  return [waypoint(end, 'JOIN', side * 4000, 13000, 2500), ...fixes];
}

export class NavComputer {
  constructor() {
    this.route = null;
    this.index = 0;
    this.end = VOBL_09L;
  }

  // Route home to this runway end from now on (the next update re-plans)
  setRunway(end) {
    this.end = end;
    this.route = null;
  }

  replan(x, z) {
    this.route = planReturnRoute(x, z, this.end);
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
    const p = toRunway(this.end, state.pos.x, state.pos.z);
    if (!isLast && (dist < CAPTURE_M || (this.index > 0 && wp.v === 0 && p.u < wp.u && Math.abs(p.v) < 1500))) {
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
      destination: `${this.end.icao} ${this.end.ident}`,
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
