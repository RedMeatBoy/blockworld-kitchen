// Build mode: place the earned decoration block in the restaurant.
// The restaurant persists and fills up day after day — visible, cumulative
// proof of the player's work, Minecraft-style.

import { Input } from '../input.js';
import { Sfx, speak } from '../audio.js';
import { go } from '../flow.js';
import { Save } from '../save.js';
import { clearScene, el, hintBar } from '../ui.js';

const COLS = 10;
const ROWS = 5;

export const buildScene = {
  enter({ newDeco }) {
    this.newDeco = newDeco || null;
    this.cursor = { x: Math.floor(COLS / 2), y: Math.floor(ROWS / 2) };
    this.placed = !newDeco;

    const root = clearScene();
    const stack = el('div', 'center-stack');
    stack.append(el('div', 'subtitle',
      this.newDeco
        ? `🏗️ PLACE YOUR ${this.newDeco.name.toUpperCase()} ${this.newDeco.emoji}`
        : '🏗️ YOUR RESTAURANT'));

    this.gridNode = el('div', 'build-grid');
    this.gridNode.style.gridTemplateColumns = `repeat(${COLS}, auto)`;
    stack.append(this.gridNode);

    this.footer = el('div', 'subtitle');
    stack.append(this.footer);
    root.append(stack);
    root.append(hintBar([['a', this.newDeco ? 'Place block' : 'Finish day'], ['dpad', 'Move']]));

    this.renderGrid();
    if (this.newDeco) speak(`Now, where should the ${this.newDeco.name} go? Move with the stick, press A to place it.`);
  },

  cellOccupied(x, y) {
    return Save.data.decorations.find((d) => d.x === x && d.y === y);
  },

  renderGrid() {
    this.gridNode.innerHTML = '';
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const deco = this.cellOccupied(x, y);
        const cls = 'bcell' + ((x + y) % 2 ? ' floor2' : '') +
          (!this.placed && this.cursor.x === x && this.cursor.y === y ? ' cursor' : '');
        const cell = el('div', cls, deco ? deco.emoji : '');
        if (!this.placed && this.cursor.x === x && this.cursor.y === y && !deco) {
          cell.innerHTML = `<span style="opacity:.5">${this.newDeco.emoji}</span>`;
        }
        this.gridNode.append(cell);
      }
    }
    this.footer.innerHTML = this.placed
      ? 'PRESS &nbsp;A&nbsp; TO CLOSE UP FOR THE NIGHT'
      : (this.cellOccupied(this.cursor.x, this.cursor.y) ? 'that spot is taken…' : '&nbsp;');
  },

  finishDay() {
    Save.data.day++;
    Save.data.stats.sessions++;
    Save.save();
    Sfx.fanfare();
    speak('The restaurant looks better every single day. Great shift, chef. See you tomorrow!');
    go('title');
  },

  update() {
    if (this.placed) {
      if (Input.pressed('a')) this.finishDay();
      return;
    }
    let moved = false;
    if (Input.nav('left')) { this.cursor.x = Math.max(0, this.cursor.x - 1); moved = true; }
    if (Input.nav('right')) { this.cursor.x = Math.min(COLS - 1, this.cursor.x + 1); moved = true; }
    if (Input.nav('up')) { this.cursor.y = Math.max(0, this.cursor.y - 1); moved = true; }
    if (Input.nav('down')) { this.cursor.y = Math.min(ROWS - 1, this.cursor.y + 1); moved = true; }
    if (moved) { Sfx.move(); this.renderGrid(); }

    if (Input.pressed('a')) {
      if (this.cellOccupied(this.cursor.x, this.cursor.y)) { Sfx.back(); return; }
      Save.data.decorations.push({ x: this.cursor.x, y: this.cursor.y, emoji: this.newDeco.emoji });
      this.placed = true;
      Sfx.pop();
      this.renderGrid();
    }
  },

  exit() {},
};
