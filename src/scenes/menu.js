// Menu preview ("mise en place" lite): tonight's dishes with their words shown
// up front. Pre-exposure to the spelling words sets the player up to succeed,
// and it mirrors the visual-schedule strategy — see the whole shift before it
// starts.

import { Input } from '../input.js';
import { Sfx, speak } from '../audio.js';
import { go } from '../flow.js';
import { Save } from '../save.js';
import { pickMenu } from '../data/words.js';
import { clearScene, el, hintBar, renderHud } from '../ui.js';

export const menuScene = {
  enter() {
    const d = Save.data;
    this.menu = pickMenu(d.grade, d.wordTier, 4);
    renderHud({});

    const root = clearScene();
    const stack = el('div', 'center-stack');
    stack.append(el('h1', 'game-title', `DAY ${d.day}`));
    stack.append(el('div', 'subtitle', `GRADE ${d.grade} KITCHEN — TONIGHT'S MENU, study it, chef!`));

    const row = el('div', 'menu-row');
    for (const item of this.menu) {
      const card = el('div', 'menu-card pop-in');
      card.append(el('span', 'm-emoji', item.emoji));
      card.append(el('div', 'm-word', item.word));
      card.append(el('div', 'm-dish', item.dish));
      row.append(card);
    }
    stack.append(row);
    stack.append(el('div', 'subtitle blink', 'PRESS &nbsp;A&nbsp; WHEN YOU ARE READY'));
    root.append(stack);
    root.append(hintBar([
      ['a', 'Open the kitchen'],
      ['x', 'Hear the menu'],
    ]));

    this.speakMenu();
  },

  speakMenu() {
    const names = this.menu.map((m) => m.dish).join('. ');
    speak(`Tonight we are serving: ${names}. Study those words, chef!`);
  },

  update() {
    if (Input.pressed('x')) { Sfx.move(); this.speakMenu(); }
    if (Input.pressed('a')) {
      Sfx.ding();
      go('service', { menu: this.menu });
    }
  },

  exit() {},
};
