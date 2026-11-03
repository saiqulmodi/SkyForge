// On-screen flight buttons for phones and tablets (symbols only). Only built on a touch-first device, so the
// keyboard / PS5 pad play on a computer is unchanged. Every button sends the same key the keyboard sends, so the
// flight logic in index.html is shared and nothing about the aircraft changes:
//   stick (right)  : finger up = W, down = S, left = A, right = D (same sense as the keyboard and the pad)
//   left group     : power Shift / Ctrl, rudder Q / E, wheel brakes B
//   fighter only   : gun Space (held = 10 rounds a second, like the pad), missile F
//   map            : tap it = M (size)

const svg = (body) => `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

const ICONS = {
  powerUp: svg('<path d="M6 12l6-6 6 6"/><path d="M6 19l6-6 6 6"/>'),
  powerDown: svg('<path d="M6 5l6 6 6-6"/><path d="M6 12l6 6 6-6"/>'),
  rudderLeft: svg('<path d="M9 7L4 12l5 5"/><path d="M4 12h9a6 6 0 0 1 6 6v1"/>'),
  rudderRight: svg('<path d="M15 7l5 5-5 5"/><path d="M20 12h-9a6 6 0 0 0-6 6v1"/>'),
  brake: svg('<circle cx="12" cy="12" r="5.5"/><path d="M4.5 6.5a10 10 0 0 0 0 11"/><path d="M19.5 6.5a10 10 0 0 1 0 11"/>'),
  gun: svg('<circle cx="12" cy="12" r="6"/><path d="M12 2.5v5M12 16.5v5M2.5 12h5M16.5 12h5"/>'),
  missile: svg('<path d="M12 2.5c2.5 2.5 3 5 3 7.5v6H9v-6c0-2.5.5-5 3-7.5z"/><path d="M9 12l-3 4.5V19l3-1.5"/><path d="M15 12l3 4.5V19l-3-1.5"/><path d="M11 19.5v2M13 19.5v2"/>')
};

const CSS = `
  /* Phones show only the view, the two tabs, the map and the flight buttons (user, 03-Nov-2026) */
  #sf-badge, #audio-banner, #hud-canvas, #pad-note, #wingman-hud { display: none !important; }
  html body #control-deck { left: 8px !important; right: 8px !important; }
  .deck-pop-btn .t { display: none; }
  nav.tc { position: fixed; z-index: 10004; bottom: 54px; touch-action: none; user-select: none; -webkit-user-select: none;
    -webkit-touch-callout: none; -webkit-tap-highlight-color: transparent; }
  #tc-left { left: 8px; display: grid; gap: 6px; grid-template-columns: repeat(5, 54px); }
  #tc-fire { right: 140px; display: none; flex-direction: column; gap: 6px; }
  #tc-fire.show { display: flex; }
  html body nav.tc button { width: 54px !important; height: 54px !important; padding: 0 !important; display: flex; align-items: center;
    justify-content: center; border: 1px solid #38bdf8; border-radius: 12px; color: #e2e8f0; touch-action: none;
    background: rgba(15, 23, 42, 0.55) !important; }
  html body nav.tc button.on { background: rgba(2, 132, 199, 0.9) !important; color: #fff; }
  html body #tc-fire button { border-color: #f97316; color: #fdba74; }
  html body #tc-fire button.on { background: rgba(234, 88, 12, 0.9) !important; color: #fff; }
  #tc-pad { right: 8px; width: 124px; height: 124px; border-radius: 50%; border: 1px solid #38bdf8; color: #7dd3fc;
    background: rgba(15, 23, 42, 0.45); }
  #tc-pad svg { position: absolute; left: 0; top: 0; width: 100%; height: 100%; pointer-events: none; }
  #tc-knob { position: absolute; left: 50%; top: 50%; width: 46px; height: 46px; margin: -23px 0 0 -23px; border-radius: 50%;
    border: 1px solid #38bdf8; background: rgba(2, 132, 199, 0.65); pointer-events: none; }
  @media (orientation: portrait) {
    #tc-left { grid-template-columns: repeat(2, 54px); }
    html body #tc-brake { width: 114px !important; grid-column: span 2; }
  }
`;

// A real phone or tablet: finger first, no mouse. A touch-screen laptop keeps its mouse layout.
export const isTouchPlay = () => window.matchMedia('(hover: none) and (pointer: coarse)').matches;

const sendKey = (type, code) => window.dispatchEvent(new KeyboardEvent(type, { code, bubbles: true }));

export function initTouchControls(map) {
  if (!isTouchPlay()) return;
  const mapCanvas = map.canvas;
  map.simple = true;

  const style = document.createElement('style');
  style.id = 'touch-controls';
  style.textContent = CSS;
  document.head.appendChild(style);

  const held = new Set();          // keys the fingers are holding now
  const press = (code) => { if (!held.has(code)) { held.add(code); sendKey('keydown', code); } };
  const release = (code) => { if (held.delete(code)) sendKey('keyup', code); };
  const releasers = [];

  // A button that acts while the finger stays on it; onDown / onUp replace the plain held key when given
  function holdButton(parent, label, icon, code, id, onDown, onUp) {
    const b = document.createElement('button');
    b.type = 'button';
    if (id) b.id = id;
    b.setAttribute('aria-label', label);
    b.innerHTML = icon;
    const up = () => { b.classList.remove('on'); if (onUp) onUp(); else release(code); };
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      b.setPointerCapture(e.pointerId);
      b.classList.add('on');
      if (onDown) onDown(); else press(code);
    });
    b.addEventListener('pointerup', up);
    b.addEventListener('pointercancel', up);
    b.addEventListener('lostpointercapture', up);
    b.addEventListener('contextmenu', (e) => e.preventDefault());
    releasers.push(up);
    parent.appendChild(b);
    return b;
  }

  // <nav>, not <div>: the older "body > div" dock styles in index.html leave it alone
  const makeNav = (id) => { const n = document.createElement('nav'); n.id = id; n.className = 'tc'; document.body.appendChild(n); return n; };

  const left = makeNav('tc-left');
  holdButton(left, 'Power up', ICONS.powerUp, 'ShiftLeft', 'tc-power-up');
  holdButton(left, 'Power down', ICONS.powerDown, 'ControlLeft', 'tc-power-down');
  holdButton(left, 'Rudder left', ICONS.rudderLeft, 'KeyQ', 'tc-rudder-left');
  holdButton(left, 'Rudder right', ICONS.rudderRight, 'KeyE', 'tc-rudder-right');
  holdButton(left, 'Wheel brakes', ICONS.brake, 'KeyB', 'tc-brake');

  // Gun and missile only exist on the fighter, so their buttons only show on it
  const fire = makeNav('tc-fire');
  let gunTimer = null;
  const stopGun = () => { clearInterval(gunTimer); gunTimer = null; release('Space'); };
  const startGun = () => {
    stopGun();
    press('Space');
    gunTimer = setInterval(() => sendKey('keydown', 'Space'), 100);
  };
  holdButton(fire, 'Missile', ICONS.missile, 'KeyF', 'tc-missile');
  holdButton(fire, 'Gun', ICONS.gun, 'Space', 'tc-gun', startGun, stopGun);
  const fighterBtn = document.getElementById('btn-fighter');
  const showFire = () => fire.classList.toggle('show', !!fighterBtn && fighterBtn.classList.contains('active'));
  if (fighterBtn) new MutationObserver(showFire).observe(fighterBtn, { attributes: true, attributeFilter: ['class'] });
  showFire();

  // Stick: slide the finger; two directions at once give pitch and roll together
  const pad = makeNav('tc-pad');
  pad.setAttribute('aria-label', 'Flight stick');
  pad.innerHTML = '<svg viewBox="0 0 124 124" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
    + '<path d="M54 18l8-8 8 8"/><path d="M54 106l8 8 8-8"/><path d="M18 54l-8 8 8 8"/><path d="M106 54l8 8-8 8"/></svg><span id="tc-knob"></span>';
  const knob = pad.querySelector('#tc-knob');
  const RADIUS = 62, TRAVEL = 39, DIRECTION_AT = 0.3;
  let padPointer = null;
  const setDirections = (x, y) => {   // x, y: -1..1
    (y < -DIRECTION_AT ? press : release)('KeyW');
    (y > DIRECTION_AT ? press : release)('KeyS');
    (x < -DIRECTION_AT ? press : release)('KeyA');
    (x > DIRECTION_AT ? press : release)('KeyD');
  };
  const movePad = (e) => {
    const r = pad.getBoundingClientRect();
    let x = (e.clientX - (r.left + r.width / 2)) / RADIUS;
    let y = (e.clientY - (r.top + r.height / 2)) / RADIUS;
    const len = Math.hypot(x, y);
    if (len > 1) { x /= len; y /= len; }
    knob.style.transform = `translate(${x * TRAVEL}px, ${y * TRAVEL}px)`;
    setDirections(x, y);
  };
  const endPad = () => { padPointer = null; knob.style.transform = ''; setDirections(0, 0); };
  pad.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    padPointer = e.pointerId;
    pad.setPointerCapture(e.pointerId);
    movePad(e);
  });
  pad.addEventListener('pointermove', (e) => { if (e.pointerId === padPointer) movePad(e); });
  pad.addEventListener('pointerup', endPad);
  pad.addEventListener('pointercancel', endPad);
  pad.addEventListener('lostpointercapture', endPad);
  pad.addEventListener('contextmenu', (e) => e.preventDefault());
  releasers.push(endPad);

  // The map stays in the corner, clear of the buttons: smaller on a phone, never wider than a narrow screen
  const fitMap = () => {
    const w = mapCanvas.width, vw = window.innerWidth, vh = window.innerHeight;
    let s = (Math.min(vw, vh) < 500 && w <= 260) ? 0.7 : 1;
    s = Math.min(s, (vw - 24) / w);
    mapCanvas.style.transformOrigin = 'top right';
    mapCanvas.style.transform = s < 1 ? `scale(${s})` : '';
  };
  mapCanvas.style.pointerEvents = 'auto';
  mapCanvas.addEventListener('click', () => { sendKey('keydown', 'KeyM'); sendKey('keyup', 'KeyM'); });
  new MutationObserver(fitMap).observe(mapCanvas, { attributes: true, attributeFilter: ['width'] });
  window.addEventListener('resize', fitMap);
  fitMap();

  // Phone call, app switch: nothing stays held down
  const releaseAll = () => releasers.forEach((f) => f());
  window.addEventListener('blur', releaseAll);
  document.addEventListener('visibilitychange', () => { if (document.hidden) releaseAll(); });
}
