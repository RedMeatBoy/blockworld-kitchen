// End-of-shift results: stars, knife unlock check, decoration pick.
// Rewards are creative (blocks for the restaurant) rather than points-for-
// points'-sake — external token rewards often don't motivate ADHD kids, but
// building something of their own does.

import { Input } from '../input.js';
import { Sfx, speak } from '../audio.js';
import { go } from '../flow.js';
import { Save, currentKnife } from '../save.js';
import { pickDecoChoices } from '../data/words.js';
import { clearScene, clearHud, confetti, el, hintBar, showPhaseMap } from '../ui.js';
import { paintBackground } from '../background.js';
import { Music } from '../music.js';

export const resultsScene = {
  enter({ trustEarned, results }) {
    paintBackground('dining');
    showPhaseMap('stars');
    Music.setMood('upbeat');
    clearHud();
    this.phase = 'stars';
    this.trustEarned = trustEarned;
    this.resultsList = results;

    const stars = trustEarned >= 42 ? 3 : trustEarned >= 22 ? 2 : 1;
    const firstTry = results.filter((r) => r.firstTry).length;

    const trustBefore = Save.data.trust - trustEarned;
    const knifeBefore = currentKnife(Math.max(0, trustBefore));
    const knifeNow = currentKnife(Save.data.trust);
    this.unlocked = knifeNow.name !== knifeBefore.name ? knifeNow : null;

    const root = clearScene();
    const stack = el('div', 'center-stack');
    stack.append(el('h1', 'game-title', `DAY ${Save.data.day} COMPLETE!`));
    stack.append(el('div', 'stars pop-in', '⭐'.repeat(stars) + '<span style="opacity:.18">' + '⭐'.repeat(3 - stars) + '</span>'));

    const statLines = el('div', 'stat-line');
    statLines.innerHTML =
      `Words spelled first try: <b>${firstTry} / ${results.length}</b><br>` +
      `Knife Trust earned tonight: <b>+${Math.max(0, trustEarned)}</b><br>` +
      `Total Knife Trust: <b>${Save.data.trust}</b>`;
    stack.append(statLines);

    if (this.unlocked) {
      stack.append(el('div', 'unlock-banner',
        `🔓 KNIFE UNLOCKED!<br>${this.unlocked.emoji} ${this.unlocked.name}<br><span style="font-size:10px">The kitchen trusts you with sharper steel.</span>`));
      Sfx.fanfare();
      speak(`Incredible! The kitchen now trusts you with the ${this.unlocked.name}. You earned that with steady hands.`);
    } else {
      Sfx.star();
      speak(`Day ${Save.data.day} complete! ${stars === 3 ? 'A perfect service!' : stars === 2 ? 'A strong service, chef!' : 'The kitchen survived, chef — tomorrow we sharpen up!'}`);
    }

    stack.append(el('div', 'subtitle blink', 'PRESS &nbsp;A&nbsp; TO SEE TONIGHT\'S WORDS'));
    root.append(stack);
    root.append(hintBar([['a', 'Continue']]));
  },

  // Word recap: every word from tonight shown spelled correctly one more time
  // (consolidation pass — see it again right after using it).
  startRecap() {
    this.phase = 'recap';
    const root = clearScene();
    const stack = el('div', 'center-stack');
    stack.append(el('div', 'subtitle', "📖 TONIGHT'S WORDS — read them with me, chef!"));
    for (const r of this.resultsList) {
      const row = el('div', 'recap-row pop-in');
      row.append(el('span', 'r-emoji', r.emoji || '🍽️'));
      const tiles = el('div', 'r-tiles');
      for (const ch of r.word) tiles.append(el('div', 'r-tile', ch));
      row.append(tiles);
      if (r.firstTry) row.append(el('span', '', '⭐'));
      stack.append(row);
    }
    stack.append(el('div', 'subtitle blink', 'PRESS &nbsp;A&nbsp; TO PICK YOUR PRIZE BLOCK'));
    root.append(stack);
    root.append(hintBar([['a', 'Continue']]));
    const words = this.resultsList.map((r) => r.word).join('. ');
    speak(`Tonight you spelled: ${words}. Wonderful work.`, { rate: 0.85 });
  },

  // ---- First-Served quiz: one episodic-memory question about the night.
  // Recalling the sequence of your own evening is exactly the working-memory
  // muscle that ADHD strains — one question, no penalty, bonus if right.
  startQuiz() {
    this.phase = 'quiz';
    this.quizCursor = 0;
    this.quizAnswered = false;
    const first = this.resultsList[0];
    const others = this.resultsList.slice(1);
    this.quizChoices = [first, ...others.slice(0, 2)]
      .filter(Boolean)
      .sort(() => Math.random() - 0.5);
    this.quizCorrect = this.quizChoices.findIndex((c) => c === first);

    const root = clearScene();
    const stack = el('div', 'center-stack');
    stack.append(el('div', 'subtitle', '🧠 MEMORY CHECK, CHEF!'));
    stack.append(el('h1', 'game-title', 'WHICH DISH DID YOU<br>SERVE FIRST TONIGHT?'));
    this.quizRow = el('div', 'deco-row');
    stack.append(this.quizRow);
    this.quizReply = el('div', 'subtitle');
    stack.append(this.quizReply);
    root.append(stack);
    root.append(hintBar([['a', 'Pick'], ['dpad', 'Choose']]));
    this.renderQuiz();
    speak('Memory check! Which dish did you serve first tonight?');
  },

  renderQuiz() {
    this.quizRow.innerHTML = '';
    this.quizChoices.forEach((c, i) => {
      const card = el('div', 'deco-card' + (i === this.quizCursor ? ' cursor' : ''));
      card.append(el('span', 'd-emoji', c.emoji || '🍽️'));
      card.append(document.createTextNode(c.word));
      this.quizRow.append(card);
    });
  },

  startDecoPick() {
    this.phase = 'deco';
    this.choices = pickDecoChoices(Save.data.decorations);
    this.decoCursor = 0;

    const root = clearScene();
    const stack = el('div', 'center-stack');
    stack.append(el('div', 'subtitle', '🧱 PICK A BLOCK — every block gives your kitchen a POWER!'));
    this.rowNode = el('div', 'deco-row');
    stack.append(this.rowNode);
    root.append(stack);
    root.append(hintBar([['a', 'Choose'], ['dpad', 'Browse']]));
    this.renderDecoRow();
    speak('Pick a prize block for your restaurant!');
  },

  renderDecoRow() {
    this.rowNode.innerHTML = '';
    this.choices.forEach((d, i) => {
      const card = el('div', 'deco-card' + (i === this.decoCursor ? ' cursor' : ''));
      card.append(el('span', 'd-emoji', d.emoji));
      card.append(document.createTextNode(d.name));
      card.append(el('div', 'd-perk', d.blurb || ''));
      this.rowNode.append(card);
    });
  },

  update() {
    if (this.phase === 'stars') {
      if (Input.pressed('a')) { Sfx.select(); this.startRecap(); }
    } else if (this.phase === 'recap') {
      if (Input.pressed('a')) { Sfx.select(); this.startQuiz(); }
    } else if (this.phase === 'quiz') {
      if (this.quizAnswered) {
        this.quizTimer -= 1 / 60;
        if (this.quizTimer <= 0 || Input.pressed('a')) this.startDecoPick();
        return;
      }
      if (Input.nav('left')) { this.quizCursor = Math.max(0, this.quizCursor - 1); Sfx.move(); this.renderQuiz(); }
      if (Input.nav('right')) { this.quizCursor = Math.min(this.quizChoices.length - 1, this.quizCursor + 1); Sfx.move(); this.renderQuiz(); }
      if (Input.pressed('a')) {
        this.quizAnswered = true;
        this.quizTimer = 2.2;
        Save.data.stats.quizTotal++;
        if (this.quizCursor === this.quizCorrect) {
          Save.data.stats.quizRight++;
          Save.addTrust(5);
          Sfx.fanfare();
          confetti(40);
          this.quizReply.innerHTML = '✅ SHARP MEMORY! +5 trust';
          speak('Sharp memory, chef! Five bonus trust!');
        } else {
          Sfx.back();
          const right = this.quizChoices[this.quizCorrect];
          this.quizReply.innerHTML = `It was the ${right.emoji} ${right.word} — good thinking anyway!`;
          speak(`Close! It was the ${right.word.toLowerCase()}. Good thinking anyway!`);
        }
      }
    } else if (this.phase === 'deco') {
      if (Input.nav('left')) { this.decoCursor = Math.max(0, this.decoCursor - 1); Sfx.move(); this.renderDecoRow(); }
      if (Input.nav('right')) { this.decoCursor = Math.min(this.choices.length - 1, this.decoCursor + 1); Sfx.move(); this.renderDecoRow(); }
      if (Input.pressed('a')) {
        Sfx.ding();
        go('build', { newDeco: this.choices[this.decoCursor] });
      }
    }
  },

  exit() {},
};
