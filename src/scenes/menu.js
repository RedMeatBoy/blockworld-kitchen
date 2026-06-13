// Menu preview ("mise en place" lite): tonight's dishes with their words shown
// up front. Pre-exposure to the spelling words sets the player up to succeed,
// and it mirrors the visual-schedule strategy — see the whole shift before it
// starts.

import { Input } from '../input.js';
import { Sfx, speak } from '../audio.js';
import { go } from '../flow.js';
import { Save } from '../save.js';
import { pickMenu, gradeParams, gradeLabel, computePerks, describePerks } from '../data/words.js';
import { clearScene, el, hintBar, renderHud, showPhaseMap } from '../ui.js';
import { paintBackground } from '../background.js';
import { Music } from '../music.js';

export const menuScene = {
  enter() {
    paintBackground('dining');
    showPhaseMap('menu');
    const d = Save.data;
    Music.setSong(d.day - 1);
    this.menu = pickMenu(d.grade, d.wordTier, gradeParams(d.grade).orders);
    renderHud({});

    const root = clearScene();
    const stack = el('div', 'center-stack');
    stack.append(el('h1', 'game-title', `DAY ${d.day}`));
    stack.append(el('div', 'subtitle', `GRADE ${gradeLabel(d.grade)} KITCHEN — TONIGHT'S MENU, study it, chef!`));

    const row = el('div', 'menu-row');
    for (const item of this.menu) {
      const card = el('div', 'menu-card pop-in');
      card.append(el('span', 'm-emoji', item.emoji));
      card.append(el('div', 'm-word', item.word));
      card.append(el('div', 'm-dish', item.dish));
      row.append(card);
    }
    stack.append(row);

    const powers = describePerks(computePerks(d.decorations));
    if (powers.length) {
      stack.append(el('div', 'powers-panel pop-in',
        `<div class="p-head">⚡ RESTAURANT POWERS</div>${powers.map((p) => `<span class="p-item">${p}</span>`).join('')}`));
    }

    stack.append(el('div', 'subtitle blink', 'PRESS &nbsp;A&nbsp; WHEN YOU ARE READY'));
    root.append(stack);
    root.append(hintBar([
      ['a', 'Open the kitchen'],
      ['b', 'Back to start (change grade/chef)'],
      ['x', 'Hear the menu'],
    ]));

    this.speakMenu();
  },

  speakMenu() {
    const names = this.menu.map((m) => m.dish).join('. ');
    speak(`Tonight we are serving: ${names}. Study those words, chef!`);
  },

  update() {
    if (Input.pressed('b')) { Sfx.back(); go('title'); return; }
    if (Input.pressed('x')) { Sfx.move(); this.speakMenu(); }
    if (Input.pressed('a')) {
      Sfx.ding();
      go('service', { menu: this.menu });
    }
  },

  exit() {},
};
