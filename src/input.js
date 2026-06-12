// Gamepad + keyboard input abstraction.
//
// Gamepads come in two flavours:
//  - mapping === 'standard': the W3C layout (Xbox/PS over USB, most cases)
//      buttons: 0=A/Cross 1=B/Circle 2=X/Square 3=Y/Triangle
//               8=Select/View 9=Start/Menu, dpad 12-15
//  - mapping === '' (non-standard): common for Xbox controllers over
//      BLUETOOTH — face buttons can be shifted (X=3, Y=4) and the d-pad is
//      often reported as a "hat" on axes[9] instead of buttons 12-15.
//      We decode both so the game works either way.

const BTN_STANDARD = {
  a: [0], b: [1], x: [2], y: [3],
  select: [8], start: [9],
  up: [12], down: [13], left: [14], right: [15],
};

// Compat table for non-standard pads: accept both common layouts.
// ('x' includes 3 because BT pads put X there; 'y' is 4-only to avoid
// double-firing x+y on pads where 3 is actually Y.)
const BTN_COMPAT = {
  a: [0], b: [1], x: [2, 3], y: [4],
  select: [8, 10], start: [9, 11],
  up: [12], down: [13], left: [14], right: [15],
};

// Keyboard fallback (letters A-Z always type directly — never bound to actions)
const KEY_MAP = {
  Enter: 'a', Space: 'a',
  Backspace: 'b',
  Digit1: 'x',        // hear word again
  Digit2: 'y',        // chef's glance
  Escape: 'start',
  Tab: 'select',
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
};

const DEADZONE = 0.45;
const NAV_DELAY = 0.34;   // seconds before key-repeat kicks in
const NAV_REPEAT = 0.15;

// 8-way hat axis decode: -1=up, then clockwise in steps of 2/7; idle ≈ 1.286
const HAT_DIRS = [
  ['up'], ['up', 'right'], ['right'], ['down', 'right'],
  ['down'], ['down', 'left'], ['left'], ['up', 'left'],
];

function hatToDirs(v) {
  if (typeof v !== 'number' || v < -1.01 || v > 1.01) return null;
  const idx = Math.round((v + 1) / (2 / 7));
  if (idx < 0 || idx > 7) return null;
  // reject values that aren't close to a real detent (noise / idle clamp)
  const detent = -1 + idx * (2 / 7);
  if (Math.abs(v - detent) > 0.08) return null;
  return HAT_DIRS[idx];
}

class InputManager {
  constructor() {
    this.down = new Set();        // currently held (merged pad+kb)
    this.prevDown = new Set();
    this.kbDown = new Set();
    this.letterQueue = [];        // direct keyboard letters (growth path)
    this.navTimers = { up: 0, down: 0, left: 0, right: 0 };
    this.navFired = { up: false, down: false, left: false, right: false };
    this.padConnected = false;
    this.padMapping = null;       // 'standard' | 'compat' | null
    this.rightStickY = 0;
    this.leftStickMag = 0;

    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      const mapped = KEY_MAP[e.code];
      if (mapped) { this.kbDown.add(mapped); e.preventDefault(); }
      if (/^Key[A-Z]$/.test(e.code)) this.letterQueue.push(e.code.slice(3));
    });
    window.addEventListener('keyup', (e) => {
      const mapped = KEY_MAP[e.code];
      if (mapped) this.kbDown.delete(mapped);
    });
    window.addEventListener('gamepadconnected', () => { this.padConnected = true; });
    window.addEventListener('gamepaddisconnected', () => {
      this.padConnected = [...(navigator.getGamepads?.() || [])].some((p) => p && p.connected);
      if (!this.padConnected) this.padMapping = null;
    });
  }

  update(dt) {
    this.prevDown = new Set(this.down);
    this.down = new Set(this.kbDown);
    this.rightStickY = 0;
    this.leftStickMag = 0;

    let sawPad = false;
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const pad of pads) {
      if (!pad || !pad.connected) continue;
      sawPad = true;
      const standard = pad.mapping === 'standard';
      this.padMapping = standard ? 'standard' : 'compat';

      const table = standard ? BTN_STANDARD : BTN_COMPAT;
      for (const [name, indices] of Object.entries(table)) {
        for (const idx of indices) {
          const btn = pad.buttons[idx];
          if (btn && (btn.pressed || btn.value > 0.5)) { this.down.add(name); break; }
        }
      }

      // left stick → directions
      const lx = pad.axes[0] ?? 0, ly = pad.axes[1] ?? 0;
      if (lx < -DEADZONE) this.down.add('left');
      if (lx > DEADZONE) this.down.add('right');
      if (ly < -DEADZONE) this.down.add('up');
      if (ly > DEADZONE) this.down.add('down');
      this.leftStickMag = Math.max(this.leftStickMag, Math.hypot(lx, ly));

      // non-standard pads often report the d-pad as a hat axis (usually 9)
      if (!standard) {
        for (const hatAxis of [9, 7]) {
          const dirs = hatToDirs(pad.axes[hatAxis]);
          if (dirs) { dirs.forEach((d) => this.down.add(d)); break; }
        }
      }

      const ry = pad.axes[3] ?? 0;
      if (Math.abs(ry) > 0.25) this.rightStickY = ry;
    }
    if (sawPad) this.padConnected = true;

    // directional repeat timers
    for (const dir of ['up', 'down', 'left', 'right']) {
      if (this.down.has(dir)) {
        this.navTimers[dir] += dt;
      } else {
        this.navTimers[dir] = 0;
        this.navFired[dir] = false;
      }
    }
  }

  /** Edge-triggered: true only on the frame the button went down. */
  pressed(name) { return this.down.has(name) && !this.prevDown.has(name); }
  held(name) { return this.down.has(name); }

  /** Directional navigation with initial-delay key repeat. Call once per frame per direction. */
  nav(dir) {
    if (this.pressed(dir)) { this.navFired[dir] = true; this.navTimers[dir] = 0; return true; }
    if (this.down.has(dir) && this.navFired[dir] && this.navTimers[dir] >= NAV_DELAY) {
      this.navTimers[dir] -= NAV_REPEAT;
      return true;
    }
    return false;
  }

  /** Drain letters typed directly on a keyboard (optional growth path for spelling). */
  takeLetters() {
    const out = this.letterQueue;
    this.letterQueue = [];
    return out;
  }
}

export const Input = new InputManager();
