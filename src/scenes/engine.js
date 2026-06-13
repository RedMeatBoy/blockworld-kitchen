// Engine Check-in — Alert Program-style self-regulation labeling.
// Before each shift the chef asks how the player's "engine" is running:
// slow 🐢, just right 😊, or racing 🚀. Naming your own arousal level is a
// core ADHD self-regulation skill; the chef responds with a matched
// micro-strategy, and the choice is logged for the parent dashboard.

import { Input } from '../input.js';
import { Sfx, speak } from '../audio.js';
import { go } from '../flow.js';
import { Save } from '../save.js';
import { clearScene, clearHud, el, hintBar } from '../ui.js';
import { paintBackground } from '../background.js';

const OPTIONS = [
  {
    key: 'engineSlow', emoji: '🐢', label: 'SLOW',
    reply: 'Running slow? No problem, chef. Stand up tall, shake out those arms, and we will warm up that engine together!',
  },
  {
    key: 'engineRight', emoji: '😊', label: 'JUST RIGHT',
    reply: 'Just right! That is a chef ready to cook. Let us go!',
  },
  {
    key: 'engineRacing', emoji: '🚀', label: 'RACING',
    reply: 'Engine racing? Press your feet into the floor and take three slow breaths with me. In... and out. In... and out. In... and out. There. Now we cook.',
  },
];

export const engineScene = {
  enter() {
    paintBackground('dining');
    clearHud();
    this.cursor = 1; // default: just right
    this.chosen = false;
    this.timer = 0;

    const root = clearScene();
    const stack = el('div', 'center-stack');
    stack.append(el('div', 'subtitle', 'BEFORE WE COOK, CHEF…'));
    stack.append(el('h1', 'game-title', "HOW'S YOUR<br>ENGINE RUNNING?"));
    this.rowNode = el('div', 'deco-row');
    stack.append(this.rowNode);
    this.replyNode = el('div', 'subtitle');
    this.replyNode.style.maxWidth = '700px';
    stack.append(this.replyNode);
    root.append(stack);
    root.append(hintBar([['a', 'That\'s me!'], ['dpad', 'Choose']]));

    this.render();
    speak("Quick check-in, chef! How's your engine running today? Slow, just right, or racing?");
  },

  render() {
    this.rowNode.innerHTML = '';
    OPTIONS.forEach((o, i) => {
      const card = el('div', 'deco-card' + (i === this.cursor ? ' cursor' : ''));
      card.append(el('span', 'd-emoji', o.emoji));
      card.append(document.createTextNode(o.label));
      this.rowNode.append(card);
    });
  },

  update(dt) {
    if (this.chosen) {
      this.timer -= dt;
      if (this.timer <= 0 || Input.pressed('a')) go('menu');
      return;
    }
    if (Input.nav('left')) { this.cursor = Math.max(0, this.cursor - 1); Sfx.move(); this.render(); }
    if (Input.nav('right')) { this.cursor = Math.min(OPTIONS.length - 1, this.cursor + 1); Sfx.move(); this.render(); }
    if (Input.pressed('a')) {
      const o = OPTIONS[this.cursor];
      Save.data.stats[o.key]++;
      Save.save();
      Sfx.select();
      this.chosen = true;
      // racing gets the longest pause — time for the three breaths
      this.timer = this.cursor === 2 ? 9 : this.cursor === 0 ? 5 : 2.5;
      this.replyNode.innerHTML = `${o.emoji} ${o.reply}`;
      speak(o.reply, { rate: this.cursor === 2 ? 0.8 : 0.95 });
    }
  },

  exit() {},
};
