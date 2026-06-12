import { Input } from '../input.js';
import { Sfx, speak, unlockAudio } from '../audio.js';
import { go } from '../flow.js';
import { Save, currentKnife } from '../save.js';
import { clearScene, clearHud, el, hintBar } from '../ui.js';

export const titleScene = {
  enter() {
    clearHud();
    const root = clearScene();

    const stack = el('div', 'center-stack');
    stack.append(el('div', '', '<span style="font-size:64px">🔪🧱</span>'));
    stack.append(el('h1', 'game-title', 'BLOCKWORLD<br>KITCHEN'));

    const d = Save.data;
    const knife = currentKnife(d.trust);
    stack.append(el('div', 'subtitle',
      d.day > 1
        ? `Day ${d.day} &nbsp;·&nbsp; Knife Trust ${d.trust} &nbsp;·&nbsp; ${knife.emoji} ${knife.name}`
        : 'A new restaurant opens today.<br>The kitchen needs a chef with steady hands.'));

    this.gradeNode = el('div', 'grade-select');
    stack.append(this.gradeNode);
    this.renderGrade();

    stack.append(el('div', 'subtitle blink', 'PRESS &nbsp;A&nbsp; TO START YOUR SHIFT'));
    root.append(stack);

    root.append(hintBar([
      ['a', 'Start shift'],
      ['dpad', 'Change grade'],
      ['select', 'Parent stats'],
    ]));
  },

  renderGrade() {
    const g = Save.data.grade;
    this.gradeNode.innerHTML =
      `<span class="grade-arrow${g <= 1 ? ' off' : ''}">◄</span>` +
      `&nbsp;&nbsp;GRADE ${g}&nbsp;&nbsp;` +
      `<span class="grade-arrow${g >= 6 ? ' off' : ''}">►</span>`;
  },

  update() {
    if (Input.nav('left') && Save.data.grade > 1) {
      Save.setGrade(Save.data.grade - 1);
      Sfx.move();
      this.renderGrade();
    }
    if (Input.nav('right') && Save.data.grade < 6) {
      Save.setGrade(Save.data.grade + 1);
      Sfx.move();
      this.renderGrade();
    }
    if (Input.pressed('a')) {
      unlockAudio();
      Sfx.select();
      speak(Save.data.day > 1
        ? `Welcome back, chef! Day ${Save.data.day}. Let's see tonight's menu.`
        : 'Welcome to Blockworld Kitchen, chef! Let me show you tonight\'s menu.');
      go('menu');
    }
  },

  exit() {},
};
