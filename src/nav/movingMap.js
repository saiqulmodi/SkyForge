import { geoToWorld, PLACES, NH44_ROUTE, ROADS } from '../environment/phase6/geo.js';
import { RUNWAY, SOUTH_RUNWAY_X } from '../environment/phase6/voblAirport.js';

// North-up moving map overlay: airport, Nandi Hills, roads, city, the return-to-land route and the
// aircraft. Screen: up = north (-X world), right = east (-Z world). Redrawn at 10 Hz.
const MAP_HZ = 10;
const SIZES = { small: 260, large: 560 };
const SCALES_M = [2000, 5000, 10000, 20000, 40000, 80000]; // half-width of the shown area

const toLine = (route) => route.map(([lat, lon]) => geoToWorld(lat, lon));

export class MovingMap {
  constructor() {
    this.size = 'small';
    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText = 'position:fixed;top:12px;right:12px;z-index:10001;border:1px solid rgba(0,255,170,0.45);' +
      'background:rgba(6,12,18,0.82);border-radius:6px;pointer-events:none;';
    document.body.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    this.lastDrawMs = -Infinity;
    this.applySize();
    window.addEventListener('resize', () => this.applySize());

    this.nh44 = toLine(NH44_ROUTE);
    this.roads = Object.values(ROADS).map(toLine);
    this.nandi = geoToWorld(PLACES.nandiHillsSummit.lat, PLACES.nandiHillsSummit.lon);
    this.skanda = geoToWorld(PLACES.skandagiriSummit.lat, PLACES.skandagiriSummit.lon);
    this.cbd = geoToWorld(PLACES.bengaluruCbd.lat, PLACES.bengaluruCbd.lon);
    this.t1 = geoToWorld(PLACES.terminal1.lat, PLACES.terminal1.lon);
    this.t2 = geoToWorld(PLACES.terminal2.lat, PLACES.terminal2.lon);
  }

  applySize() {
    // Fit the window height (the control deck takes ~90 px at the bottom)
    const px = Math.max(200, Math.min(SIZES[this.size], window.innerHeight - 110));
    this.canvas.width = px;
    this.canvas.height = px;
    this.lastDrawMs = -Infinity;
  }

  toggleSize() {
    this.size = this.size === 'small' ? 'large' : 'small';
    this.applySize();
  }

  // state: sim state, nav: NavComputer output (or null), headingDeg
  draw(state, nav, headingDeg, nowMs) {
    if (nowMs - this.lastDrawMs < 1000 / MAP_HZ) return;
    this.lastDrawMs = nowMs;
    const ctx = this.ctx, W = this.canvas.width, H = this.canvas.height;
    const cx = W / 2, cy = (H - 54) / 2; // guidance box takes the bottom 54 px

    // Centre between the aircraft and the airport; range fits both plus the next waypoint
    const midX = state.pos.x * 0.5, midZ = state.pos.z * 0.5;
    const pts = [state.pos, { x: 0, z: 0 }];
    if (nav && !nav.complete) pts.push(nav.route[nav.index]);
    const need = Math.max(...pts.map((p) => Math.max(Math.abs(p.x - midX), Math.abs(p.z - midZ)))) * 1.1 + 1500;
    const half = SCALES_M.find((s) => s >= need) || SCALES_M[SCALES_M.length - 1];
    const k = (Math.min(W, H - 54) / 2 - 14) / half;
    const sx = (x, z) => cx + (-(z - midZ)) * k; // east is right
    const sy = (x, z) => cy + (x - midX) * k;    // south is down

    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    ctx.clip();

    // City and Nandi Hills
    ctx.fillStyle = 'rgba(148,163,184,0.18)';
    ctx.beginPath(); ctx.arc(sx(this.cbd.x, this.cbd.z), sy(this.cbd.x, this.cbd.z), 6500 * k, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(161,98,7,0.35)';
    [[this.nandi, 1700], [this.skanda, 1300]].forEach(([p, r]) => {
      ctx.beginPath(); ctx.arc(sx(p.x, p.z), sy(p.x, p.z), Math.max(3, r * k), 0, Math.PI * 2); ctx.fill();
    });

    // Roads
    const poly = (pts, color, w) => {
      ctx.strokeStyle = color; ctx.lineWidth = w; ctx.beginPath();
      pts.forEach((p, i) => (i ? ctx.lineTo(sx(p.x, p.z), sy(p.x, p.z)) : ctx.moveTo(sx(p.x, p.z), sy(p.x, p.z))));
      ctx.stroke();
    };
    poly(this.nh44, 'rgba(250,204,21,0.55)', 2);
    this.roads.forEach((r) => poly(r, 'rgba(250,204,21,0.3)', 1));

    // Runways (drawn at least 3 px wide so they stay visible zoomed out) and terminals
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = Math.max(3, RUNWAY.width * k);
    [0, SOUTH_RUNWAY_X].forEach((rx) => {
      ctx.beginPath();
      ctx.moveTo(sx(rx, RUNWAY.halfLength), sy(rx, RUNWAY.halfLength));
      ctx.lineTo(sx(rx, -RUNWAY.halfLength), sy(rx, -RUNWAY.halfLength));
      ctx.stroke();
    });
    ctx.fillStyle = '#38bdf8';
    [this.t1, this.t2].forEach((t) => ctx.fillRect(sx(t.x, t.z) - 3, sy(t.x, t.z) - 2, 6, 4));

    // Labels
    ctx.font = '10px monospace';
    ctx.fillStyle = '#cbd5e1';
    ctx.textAlign = 'left';
    ctx.fillText('VOBL 09L', sx(0, RUNWAY.halfLength) + 5, sy(0, RUNWAY.halfLength) - 6);
    ctx.fillStyle = '#d6a35c';
    ctx.fillText('NANDI HILLS', sx(this.nandi.x, this.nandi.z) + 8, sy(this.nandi.x, this.nandi.z));
    ctx.fillStyle = '#facc15';
    ctx.fillText('NH44', sx(this.nh44[4].x, this.nh44[4].z) + 5, sy(this.nh44[4].x, this.nh44[4].z));
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('BENGALURU', sx(this.cbd.x, this.cbd.z) - 30, sy(this.cbd.x, this.cbd.z));

    // Route: dashed line from the aircraft through the remaining waypoints
    if (nav) {
      ctx.strokeStyle = '#e879f9';
      ctx.lineWidth = 2;
      ctx.setLineDash([7, 5]);
      ctx.beginPath();
      ctx.moveTo(sx(state.pos.x, state.pos.z), sy(state.pos.x, state.pos.z));
      for (let i = nav.index; i < nav.route.length; i++) ctx.lineTo(sx(nav.route[i].x, nav.route[i].z), sy(nav.route[i].x, nav.route[i].z));
      ctx.stroke();
      ctx.setLineDash([]);
      const large = this.size === 'large';
      nav.route.forEach((wp, i) => {
        const px = sx(wp.x, wp.z), py = sy(wp.x, wp.z);
        const active = i === nav.index;
        ctx.fillStyle = i < nav.index ? '#64748b' : active ? '#e879f9' : '#f5d0fe';
        ctx.beginPath();
        ctx.moveTo(px, py - 5); ctx.lineTo(px + 5, py); ctx.lineTo(px, py + 5); ctx.lineTo(px - 5, py);
        ctx.closePath(); ctx.fill();
        // Small map: label only the active waypoint; large map: all, alternating above / below the line
        if (!large && !active) return;
        ctx.font = active ? 'bold 11px monospace' : '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(large ? `${wp.name} ${wp.altFt}ft` : wp.name, px, i % 2 ? py + 17 : py - 9);
        ctx.textAlign = 'left';
      });
    }

    // Aircraft symbol, rotated to the heading
    ctx.save();
    ctx.translate(sx(state.pos.x, state.pos.z), sy(state.pos.x, state.pos.z));
    ctx.rotate(headingDeg * Math.PI / 180);
    ctx.fillStyle = '#4ade80';
    ctx.beginPath();
    ctx.moveTo(0, -9); ctx.lineTo(6, 7); ctx.lineTo(0, 4); ctx.lineTo(-6, 7);
    ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.restore();

    // North arrow + scale
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('N', 14, 16);
    ctx.beginPath(); ctx.moveTo(14, 20); ctx.lineTo(10, 30); ctx.lineTo(18, 30); ctx.closePath(); ctx.fill();
    ctx.textAlign = 'right';
    ctx.font = '10px monospace';
    ctx.fillText(`${(half * 2 / 1000).toFixed(0)} KM ACROSS  [M] SIZE`, W - 6, 14);

    // Guidance box
    ctx.fillStyle = 'rgba(6,12,18,0.88)';
    ctx.fillRect(0, H - 54, W, 54);
    ctx.textAlign = 'left';
    ctx.font = 'bold 12px monospace';
    if (!nav) {
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('ROUTE HOME: planned after take-off', 8, H - 30);
    } else if (nav.complete) {
      ctx.fillStyle = '#4ade80';
      ctx.fillText('LANDED - route complete', 8, H - 30);
    } else {
      const mins = Math.floor(nav.etaSec / 60), secs = Math.round(nav.etaSec % 60);
      const tMins = Math.round(nav.totalEtaSec / 60);
      ctx.fillStyle = '#e879f9';
      ctx.fillText(`NEXT ${nav.name}  BRG ${String(Math.round(nav.bearing)).padStart(3, '0')}  ${nav.distNm.toFixed(1)} NM  ${mins}:${String(secs).padStart(2, '0')}`, 8, H - 36);
      const turnTxt = Math.abs(nav.turn) < 5 ? 'ON COURSE' : `TURN ${nav.turn > 0 ? 'RIGHT' : 'LEFT'} ${Math.round(Math.abs(nav.turn))} DEG`;
      const altDiff = nav.targetAltFt - nav.altFt;
      const altTxt = Math.abs(altDiff) < 200 ? `ALT ${Math.round(nav.altFt)} OK` : `${altDiff > 0 ? 'CLIMB' : 'DESCEND'} TO ${nav.targetAltFt} FT`;
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText(`${turnTxt} | ${altTxt}`, 8, H - 20);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px monospace';
      ctx.fillText(`RWY 09L in ~${tMins} min | [N] re-plan`, 8, H - 6);
    }
  }
}
