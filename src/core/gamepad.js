// Game controller input (PS5 DualSense / Xbox / any "standard" mapping pad).
// Mode-2 layout:
//   RIGHT stick  : pitch (pull back = nose up) and roll
//   LEFT stick   : up / down = throttle (collective on the helicopter), left / right = rudder (yaw)
//   L1 / R1      : rudder left / right          L2 / R2 : throttle down / up (analog)
//   Cross  / A   : fire gun (fighter, hold)      Circle   / B : cargo ramp (airliner)
//   Square / X   : autopilot                     Triangle / Y : cockpit / chase view
//   D-pad up/down: autopilot target altitude +/- 500 ft
//   D-pad left/right: previous / next aircraft
//   Share / View : ALT HOLD                      Options / Menu, R3 : reset head view
const DEADZONE = 0.12;

const BUTTON_ACTIONS = {
  1: 'ramp',
  2: 'autopilot',
  3: 'view',
  8: 'altHold',
  9: 'resetHead',
  11: 'resetHead',
  12: 'altUp',
  13: 'altDown',
  14: 'prevAircraft',
  15: 'nextAircraft'
};

function axis(v) {
  if (Math.abs(v) < DEADZONE) return 0;
  return Math.sign(v) * (Math.abs(v) - DEADZONE) / (1 - DEADZONE);
}

export class GamepadInput {
  constructor() {
    this.index = null;
    this.prevButtons = [];
    window.addEventListener('gamepadconnected', (e) => {
      this.index = e.gamepad.index;
      this.prevButtons = [];
      window.dispatchEvent(new CustomEvent('gamepadstatus', { detail: { connected: true, id: e.gamepad.id } }));
    });
    window.addEventListener('gamepaddisconnected', (e) => {
      if (e.gamepad.index !== this.index) return;
      this.index = null;
      window.dispatchEvent(new CustomEvent('gamepadstatus', { detail: { connected: false, id: e.gamepad.id } }));
    });
  }

  // Returns null when no pad is connected, otherwise
  // { pitch, roll, yaw (-1..1), throttleRate (-1..1), fire (held), actions: [names pressed this frame] }
  poll() {
    if (this.index === null || !navigator.getGamepads) return null;
    const gp = navigator.getGamepads()[this.index];
    if (!gp || !gp.connected) return null;

    const b = (i) => (gp.buttons[i] ? gp.buttons[i].value : 0);
    const pressed = (i) => !!(gp.buttons[i] && gp.buttons[i].pressed);

    const actions = [];
    for (const i in BUTTON_ACTIONS) {
      if (pressed(i) && !this.prevButtons[i]) actions.push(BUTTON_ACTIONS[i]);
    }
    this.prevButtons = gp.buttons.map((btn) => btn.pressed);

    const yawStick = -axis(gp.axes[0] || 0);
    const yawBumpers = (pressed(4) ? 1 : 0) - (pressed(5) ? 1 : 0);
    return {
      pitch: axis(gp.axes[3] || 0),
      roll: axis(gp.axes[2] || 0),
      yaw: Math.max(-1, Math.min(1, yawStick + yawBumpers)),
      throttleRate: Math.max(-1, Math.min(1, -axis(gp.axes[1] || 0) + b(7) - b(6))),
      fire: pressed(0),
      actions
    };
  }
}
