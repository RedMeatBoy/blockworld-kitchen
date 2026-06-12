import { Input } from '../input.js';
import { Sfx, speak, unlockAudio } from '../audio.js';
import { go } from '../flow.js';
import { Save, currentKnife } from '../save.js';
import { gradeLabel } from '../data/words.js';
import { clearScene, clearHud, el, hintBar } from '../ui.js';
import { paintBackground } from '../background.js';
import { chefImage, chefName } from '../avatar.js';
import { Music } from '../music.js';

export const titleScene = {
  enter() {
    clearHud();
    paintBackground('dining');
    const root = clearScene();

    const stack = el('div', 'center-stack');
    stack.append(el('h1', 'game-title', 'BLOCKWORLD<br>KITCHEN'));

    const d = Save.data;
    const knife = currentKnife(d.trust);
    stack.append(el('div', 'subtitle',
      d.day > 1
        ? `Day ${d.day} &nbsp;·&nbsp; Knife Trust ${d.trust} &nbsp;·&nbsp; ${knife.emoji} ${knife.name}`
        : 'A new restaurant opens today.<br>The kitchen needs a chef with steady hands.'));

    const row = el('div');
    row.style.display = 'flex';
    row.style.gap = '24px';
    row.style.alignItems = 'stretch';
    row.style.flexWrap = 'wrap';
    row.style.justifyContent = 'center';

    this.chefNode = el('div', 'chef-select');
    row.append(this.chefNode);

    this.gradeNode = el('div', 'grade-select');
    this.gradeNode.style.display = 'flex';
    this.gradeNode.style.alignItems = 'center';
    row.append(this.gradeNode);

    stack.append(row);
    this.renderChef();
    this.renderGrade();

    stack.append(el('div', 'subtitle blink', 'PRESS &nbsp;A&nbsp; TO START YOUR SHIFT'));
    root.append(stack);

    root.append(hintBar([
      ['a', 'Start shift'],
      ['dpad', '◄► grade · ▲▼ chef'],
      ['select', 'Parent stats'],
    ]));
  },

  renderChef() {
    const kind = Save.data.avatar;
    this.chefNode.innerHTML = '';
    const img = document.createElement('img');
    img.src = chefImage(kind, 8);
    img.alt = chefName(kind);
    this.chefNode.append(img);
    const info = el('div');
    info.append(el('div', 'chef-name', chefName(kind)));
    info.append(el('div', 'chef-hint', '▲▼ or X: switch chef'));
    this.chefNode.append(info);
  },

  renderGrade() {
    const g = Save.data.grade;
    this.gradeNode.innerHTML =
      `<span class="grade-arrow${g <= 0 ? ' off' : ''}">◄</span>` +
      `&nbsp;&nbsp;GRADE ${gradeLabel(g)}&nbsp;&nbsp;` +
      `<span class="grade-arrow${g >= 6 ? ' off' : ''}">►</span>`;
  },

  switchChef() {
    Save.data.avatar = Save.data.avatar === 'm' ? 'f' : 'm';
    Save.save();
    Sfx.pop();
    this.renderChef();
    speak(`${chefName(Save.data.avatar)} reporting for duty!`, { rate: 1.0 });
  },

  update() {
    if (Input.nav('left') && Save.data.grade > 0) {
      Save.setGrade(Save.data.grade - 1);
      Sfx.move();
      this.renderGrade();
    }
    if (Input.nav('right') && Save.data.grade < 6) {
      Save.setGrade(Save.data.grade + 1);
      Sfx.move();
      this.renderGrade();
    }
    // Chef switch accepts many inputs: X/Square, d-pad up/down, or the X
    // letter key — letter keys bypass the action map (they're reserved for
    // spelling), and some controllers report non-standard button indices,
    // so a single binding isn't reliable.
    const typedX = Input.takeLetters().includes('X');
    if (Input.pressed('x') || Input.pressed('y') || typedX || Input.nav('up') || Input.nav('down')) {
      this.switchChef();
    }
    if (Input.pressed('a')) {
      unlockAudio();
      if (Save.data.music) Music.start();
      Sfx.select();
      speak(Save.data.day > 1
        ? `Welcome back, ${chefName(Save.data.avatar).toLowerCase()}! Day ${Save.data.day}. Let's see tonight's menu.`
        : `Welcome to Blockworld Kitchen, chef! Let me show you tonight's menu.`);
      go('menu');
    }
  },

  exit() {},
};
