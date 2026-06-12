// Gamepad + keyboard input abstraction.
// Standard mapping covers Xbox Series X and PS5 DualSense in Chrome/Edge/Firefox:
//   buttons: 0=A/Cross 1=B/Circle 2=X/Square 3=Y/Triangle 8=Select/Share 9=Start/Options
//   dpad: 12=up 13=down 14=left 15=right; axes 0/1 = left stick, 2/3 = right stick

const BTN = { a: 0, b: 1, x: 2, y: 3, select: 8, start: 9, up: 12, down: 13, left: 14, right: 15 };

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

class InputManager {
  constructor() {
    this.down = new Set();        // currently held (merged pad+kb)
    this.prevDown = new Set();
    this.kbDown = new Set();
    this.letterQueue = [];        // direct keyboard letters (growth path)
    this.navTimers = { up: 0, down: 0, left: 0, right: 0 };
    this.navFired = { up: false, down: false, left: false, right: false };
    this.padConnected = false;
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
      this.padConnected = [...navigator.getGamepads()].some(Boolean);
    });
  }

  update(dt) {
    this.prevDown = new Set(this.down);
    this.down = new Set(this.kbDown);
    this.rightStickY = 0;
    this.leftStickMag = 0;

    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const pad of pads) {
      if (!pad || !pad.connected) continue;
      this.padConnected = true;
      for (const [name, idx] of Object.entries(BTN)) {
        if (pad.buttons[idx]?.pressed) this.down.add(name);
      }
      const lx = pad.axes[0] ?? 0, ly = pad.axes[1] ?? 0;
      if (lx < -DEADZONE) this.down.add('left');
      if (lx > DEADZONE) this.down.add('right');
      if (ly < -DEADZONE) this.down.add('up');
      if (ly > DEADZONE) this.down.add('down');
      this.leftStickMag = Math.max(this.leftStickMag, Math.hypot(lx, ly));
      const ry = pad.axes[3] ?? 0;
      if (Math.abs(ry) > 0.25) this.rightStickY = ry;
    }

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
