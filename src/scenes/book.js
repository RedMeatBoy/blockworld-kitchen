// The Recipe Book — a collection screen. Every word spelled first-try becomes
// a "mastered recipe" stamp. Locked recipes show as mystery cards, which makes
// new words something to hunt rather than something to dread, and re-reading
// mastered words is a quiet consolidation pass.

import { Input } from '../input.js';
import { Sfx, speak } from '../audio.js';
import { go } from '../flow.js';
import { Save } from '../save.js';
import { WORD_INFO, GRADE_TIERS_VIEW, gradeLabel } from '../data/words.js';
import { clearScene, clearHud, el, hintBar, hidePhaseMap } from '../ui.js';
import { paintBackground } from '../background.js';

export const bookScene = {
  enter() {
    paintBackground('dining');
    clearHud();
    hidePhaseMap();
    this.page = Save.data.grade;
    this.render();
    speak('The recipe book! Every word you spell first try becomes a mastered recipe.');
  },

  wordsForPage() {
    return [...new Set(GRADE_TIERS_VIEW[this.page].flat())];
  },

  render() {
    const root = clearScene();
    const stack = el('div', 'center-stack');
    stack.style.justifyContent = 'flex-start';
    stack.style.overflowY = 'auto';

    const mastered = Save.data.mastered || {};
    const words = this.wordsForPage();
    const got = words.filter((w) => mastered[w]).length;

    stack.append(el('h1', 'game-title', '📖 RECIPE BOOK'));
    stack.append(el('div', 'subtitle',
      `◄ GRADE ${gradeLabel(this.page)} ► &nbsp;·&nbsp; MASTERED: ${got} / ${words.length}`));

    const grid = el('div', 'book-grid');
    for (const w of words) {
      const info = WORD_INFO[w] || {};
      const isGot = !!mastered[w];
      const card = el('div', 'book-card' + (isGot ? '' : ' locked'));
      if (isGot) {
        card.append(el('span', 'b-emoji', info.emoji || '🍽️'));
        card.append(el('div', 'b-word', w));
        if (mastered[w] > 1) card.append(el('div', 'b-count', `⭐ x${mastered[w]}`));
      } else {
        card.append(el('span', 'b-emoji', '❓'));
        card.append(el('div', 'b-word', '·'.repeat(w.length)));
      }
      grid.append(card);
    }
    stack.append(grid);
    root.append(stack);
    root.append(hintBar([['dpad', '◄► change grade page'], ['b', 'Back']]));
  },

  update() {
    if (Input.nav('left') && this.page > 0) { this.page--; Sfx.move(); this.render(); }
    if (Input.nav('right') && this.page < 6) { this.page++; Sfx.move(); this.render(); }
    if (Input.pressed('b') || Input.pressed('a')) { Sfx.back(); go('title'); }
  },

  exit() {},
};
