// Dinner service: for each order — ticket → word reveal → spell → knife → served.
//
// Therapeutic design notes:
//  - Orders arrive as AUDIO first (often the weaker channel for ADHD kids),
//    with the word flashed visually (often the stronger one). The "Chef's
//    Glance" re-shows the word at a small cost — teaching a real-life
//    compensation strategy: turn heard into seen.
//  - Spelling errors produce a funny wrong dish, never a red X. Correct-position
//    letters are kept so retries always shrink the problem.
//  - The QWERTY letter grid quietly builds keyboard geography for the day the
//    player starts typing (the assistive-tech accommodation path).

import { Input } from '../input.js';
import { Sfx, speak, speakLetter } from '../audio.js';
import { go } from '../flow.js';
import { Save } from '../save.js';
import { QWERTY_ROWS, PRAISE_SPELLING, GENTLE_RETRY, gradeParams, computePerks } from '../data/words.js';
import { clearScene, clearToasts, confetti, el, hintBar, renderHud, toast } from '../ui.js';
import { KnifeStation } from './knife.js';
import { paintBackground } from '../background.js';
import { customerImage, CUSTOMER_REACTIONS } from '../avatar.js';
import { Music } from '../music.js';

const GLANCE_SECONDS = 1.8;

export const serviceScene = {
  enter({ menu }) {
    paintBackground('kitchen');
    Music.setMood('upbeat');
    this.menu = menu;
    this.params = gradeParams(Save.data.grade);
    this.perks = computePerks(Save.data.decorations);
    this.shields = this.perks.shield;
    this.orderIndex = 0;
    this.glances = this.params.glances + this.perks.glance;
    this.trustAtStart = Save.data.trust;
    this.results = []; // per-order: { word, firstTry, glanceUsed, emoji }
    this.streak = 0;   // consecutive first-try spellings
    this.whisperTimer = 0;
    this.startOrder();
  },

  hud() {
    renderHud({ orders: this.menu.length, orderIndex: this.orderIndex, glances: this.glances });
  },

  // ---------------- order lifecycle ----------------

  startOrder() {
    this.order = this.menu[this.orderIndex];
    this.attempt = [];
    this.attemptCount = 0;
    this.glanceUsedThisWord = false;
    this.cursor = { row: 0, col: 0 };
    this.phase = 'ticket';
    this.timer = 0;
    this.hud();

    const root = clearScene();
    const stack = el('div', 'center-stack');

    if (this.orderIndex === this.menu.length - 1) {
      stack.append(el('div', 'last-order-banner pop-in', '🔔 LAST ORDER OF THE NIGHT!'));
    }

    const ticket = el('div', 'ticket pop-in');
    ticket.append(el('div', 't-head', `ORDER ${this.orderIndex + 1} — TABLE ${3 + this.orderIndex * 2}`));
    ticket.append(el('div', 't-emoji', this.order.emoji));
    ticket.append(el('div', 't-dish', this.order.dish));
    stack.append(ticket);
    stack.append(el('div', 'subtitle blink', 'PRESS &nbsp;A&nbsp; TO TAKE THE ORDER'));
    root.append(stack);
    root.append(hintBar([['a', 'Take the order'], ['x', 'Hear it again']]));

    const isLast = this.orderIndex === this.menu.length - 1;
    speak(`${isLast ? 'Last order of the night! ' : 'Order up! '}One ${this.order.dish}!`);
  },

  startReveal() {
    this.phase = 'reveal';
    this.timer = this.params.revealSeconds + this.perks.reveal;
    this.timerTotal = this.timer;
    const root = clearScene();
    const stack = el('div', 'center-stack');
    stack.append(el('div', 'subtitle', `WATCH THE WORD, CHEF! 👀`));
    const tiles = el('div', 'word-tiles');
    for (const ch of this.order.word) {
      tiles.append(el('div', 'wtile reveal pop-in', ch));
    }
    stack.append(tiles);
    stack.append(this.makeCountBar());
    root.append(stack);
    speak(this.order.word, { rate: 0.8 });
  },

  makeCountBar() {
    const bar = el('div', 'count-bar');
    this.countFill = el('div', 'fill');
    this.countFill.style.width = '100%';
    bar.append(this.countFill);
    this.countBarNode = bar;
    return bar;
  },

  updateCountBar() {
    if (this.countFill && this.timerTotal) {
      this.countFill.style.width = `${Math.max(0, (this.timer / this.timerTotal) * 100)}%`;
    }
  },

  startSpell() {
    this.phase = 'spell';
    const root = clearScene();
    const stack = el('div', 'center-stack');
    stack.append(el('div', 'subtitle', `SPELL IT FOR THE TICKET: ${this.order.dish.toUpperCase()}`));

    this.tilesNode = el('div', 'word-tiles');
    stack.append(this.tilesNode);

    this.kbdNode = el('div', 'kbd');
    stack.append(this.kbdNode);
    const bar = this.makeCountBar();
    bar.style.visibility = 'hidden';
    stack.append(bar);

    root.append(stack);
    root.append(hintBar([
      ['a', 'Pick letter'],
      ['b', 'Erase'],
      ['x', 'Hear word'],
      ['y', "Chef's Glance"],
    ]));
    this.renderTiles();
    this.renderKbd();
  },

  renderTiles(marks = null) {
    this.tilesNode.innerHTML = '';
    const word = this.order.word;
    for (let i = 0; i < word.length; i++) {
      const ch = this.attempt[i] || '';
      let cls = 'wtile' + (ch ? '' : ' empty');
      if (marks) cls = 'wtile ' + (marks[i] ? 'good' : 'bad');
      this.tilesNode.append(el('div', cls, ch || '·'));
    }
  },

  renderKbd() {
    this.kbdNode.innerHTML = '';
    QWERTY_ROWS.forEach((row, r) => {
      const rowNode = el('div', 'kbd-row');
      [...row].forEach((ch, c) => {
        const isCursor = this.cursor.row === r && this.cursor.col === c;
        rowNode.append(el('div', 'key' + (isCursor ? ' cursor' : ''), ch));
      });
      this.kbdNode.append(rowNode);
    });
  },

  doGlance() {
    if (this.glances <= 0) {
      Sfx.back();
      toast('No glances left tonight — listen close! Press X to hear it.', '');
      return;
    }
    this.glances--;
    this.glanceUsedThisWord = true;
    Save.data.stats.glancesUsed++;
    this.hud();
    Sfx.pop();
    this.phase = 'glance';
    this.timer = GLANCE_SECONDS;
    this.timerTotal = GLANCE_SECONDS;
    if (this.countBarNode) this.countBarNode.style.visibility = 'visible';
    const word = this.order.word;
    this.tilesNode.innerHTML = '';
    for (const ch of word) this.tilesNode.append(el('div', 'wtile reveal', ch));
  },

  submitAttempt() {
    const word = this.order.word;
    const attempt = this.attempt.join('');
    this.attemptCount++;

    if (attempt === word) {
      const firstTry = this.attemptCount === 1;
      Save.recordSpelling(firstTry);
      this.results.push({ word, firstTry, glanceUsed: this.glanceUsedThisWord, emoji: this.order.emoji });
      let pts = firstTry ? (this.glanceUsedThisWord ? 3 : 5) : 1;
      let line = PRAISE_SPELLING[Math.floor(Math.random() * PRAISE_SPELLING.length)];
      if (firstTry) {
        this.streak++;
        if (this.streak >= 2) {
          const bonus = this.streak * 2 + this.perks.streak;
          pts += bonus;
          line = `STREAK x${this.streak}! ${line}`;
          confetti(30 + this.streak * 15);
          Sfx.fanfare();
        }
      } else {
        this.streak = 0;
      }
      Save.addTrust(pts);
      this.hud();
      Sfx.ding();
      toast(`✅ ${line} (+${pts} trust)`, 'praise');
      speak(line);
      this.renderTiles(word.split('').map(() => true));
      this.phase = 'spell-done';
      this.timer = 1.4;
    } else {
      // funny wrong dish + gentle retry
      const marks = word.split('').map((ch, i) => this.attempt[i] === ch);
      this.renderTiles(marks);
      Sfx.buzz();
      const retryLine = GENTLE_RETRY[Math.floor(Math.random() * GENTLE_RETRY.length)];
      toast(`🍽️ One order of “${attempt}”?! We don't serve ${attempt} here! ${retryLine}`, 'oops', 3400);
      speak(`One order of ${attempt.toLowerCase()}? We don't serve that here! ${retryLine}`);
      // keep only correct-position letters, then re-show the word
      this.attempt = word.split('').map((ch, i) => (this.attempt[i] === ch ? ch : undefined));
      // compact: trailing undefined are fine; typing fills first empty slot
      if (this.streak >= 2 && this.shields > 0) {
        this.shields--;
        toast('🐈 The Kitchen Cat pounces on the bad ticket — your streak is safe!', 'praise', 3000);
      } else {
        this.streak = 0;
      }
      this.phase = 'retry-pause';
      this.timer = 2.2;
    }
  },

  placeLetter(ch) {
    const word = this.order.word;
    const idx = this.findNextSlot();
    if (idx === -1) return;
    this.attempt[idx] = ch;
    speakLetter(ch);
    Sfx.select();
    this.renderTiles();
    if (this.findNextSlot() === -1) {
      // full — check shortly so the last letter is visible first
      this.phase = 'check-pause';
      this.timer = 0.45;
    }
  },

  findNextSlot() {
    for (let i = 0; i < this.order.word.length; i++) {
      if (!this.attempt[i]) return i;
    }
    return -1;
  },

  eraseLetter() {
    for (let i = this.order.word.length - 1; i >= 0; i--) {
      if (this.attempt[i]) { this.attempt[i] = undefined; Sfx.back(); this.renderTiles(); return; }
    }
  },

  // ---------------- knife handoff ----------------

  startKnife() {
    this.phase = 'knife';
    const root = clearScene();
    const spacer = el('div');
    spacer.style.flex = '1';
    root.append(spacer);
    root.append(hintBar([['a', 'Chop!'], ['b', 'Send whole']]));
    this.hud();

    const day = Save.data.day;
    const p = this.params;
    const noCut = Math.random() < p.noCutChance && (this.orderIndex > 0 || day > 1);
    const cuts = Math.min(p.baseCuts + (this.orderIndex > 1 ? 1 : 0), p.maxCuts);
    let waitZone = -1;
    if (!noCut && (day > 1 || this.orderIndex >= 2) && Math.random() < p.waitChance) {
      waitZone = Math.floor(Math.random() * cuts);
    }

    KnifeStation.start(this.order, {
      noCut, cuts, waitZone,
      speed: p.indicatorSpeed * (1 - this.perks.slow),
      zoneWiden: this.perks.zone,
      perfectBonus: this.perks.perfect,
    }, () => {
      this.phase = 'served';
      this.timer = 2.6;
      this.hud();
      const root = clearScene();
      const stack = el('div', 'center-stack');
      stack.append(el('div', '', `<span style="font-size:80px" class="pop-in">${this.order.emoji}</span>`));
      stack.append(el('div', 'subtitle', `${this.order.dish} — SERVED! 🛎️`));

      const seed = (Save.data.day * 7 + this.orderIndex * 3 + this.order.word.length) % 97;
      const cust = customerImage(seed);
      const reaction = CUSTOMER_REACTIONS[seed % CUSTOMER_REACTIONS.length];
      const card = el('div', 'customer-card pop-in');
      const img = document.createElement('img');
      img.src = cust.img;
      card.append(img);
      const info = el('div');
      info.append(el('div', 'c-name', cust.name));
      info.append(el('div', 'c-line', `“${reaction}”`));
      card.append(info);
      stack.append(card);

      if (this.perks.tip > 0) {
        Save.addTrust(this.perks.tip);
        stack.append(el('div', 'subtitle', `💰 TIP: +${this.perks.tip} trust`));
        this.hud();
      }

      root.append(stack);
      Sfx.sizzle();
      speak(reaction, { rate: 1.05, pitch: 1.2, interrupt: false });
    });
  },

  nextOrder() {
    this.orderIndex++;
    clearToasts();
    if (this.orderIndex >= this.menu.length) {
      Save.save();
      go('sharpen', {
        trustEarned: Save.data.trust - this.trustAtStart,
        results: this.results,
      });
    } else {
      this.startOrder();
    }
  },

  // ---------------- per-frame ----------------

  update(dt) {
    switch (this.phase) {
      case 'ticket':
        if (Input.pressed('x')) speak(`One ${this.order.dish}!`);
        if (Input.pressed('a')) { Sfx.select(); this.startReveal(); }
        break;

      case 'reveal':
        this.timer -= dt;
        this.updateCountBar();
        if (this.timer <= 0) this.startSpell();
        break;

      case 'glance':
        this.timer -= dt;
        this.updateCountBar();
        if (this.timer <= 0) {
          this.phase = 'spell';
          if (this.countBarNode) this.countBarNode.style.visibility = 'hidden';
          this.renderTiles();
        }
        break;

      case 'spell': {
        // the music murmurs the target word every few seconds
        this.whisperTimer -= dt;
        if (this.whisperTimer <= 0) {
          this.whisperTimer = 6.5 + Math.random() * 2;
          if (Save.data.music) Music.whisper(this.order.word);
        }
        // direct keyboard letters (growth path)
        for (const ch of Input.takeLetters()) this.placeLetter(ch);
        if (this.phase !== 'spell') break;

        let moved = false;
        const cur = this.cursor;
        if (Input.nav('left')) { cur.col = Math.max(0, cur.col - 1); moved = true; }
        if (Input.nav('right')) { cur.col = Math.min(QWERTY_ROWS[cur.row].length - 1, cur.col + 1); moved = true; }
        if (Input.nav('up') && cur.row > 0) {
          cur.row--; cur.col = Math.min(cur.col, QWERTY_ROWS[cur.row].length - 1); moved = true;
        }
        if (Input.nav('down') && cur.row < QWERTY_ROWS.length - 1) {
          cur.row++; cur.col = Math.min(cur.col, QWERTY_ROWS[cur.row].length - 1); moved = true;
        }
        if (moved) { Sfx.move(); this.renderKbd(); }

        if (Input.pressed('a')) this.placeLetter(QWERTY_ROWS[cur.row][cur.col]);
        if (Input.pressed('b')) this.eraseLetter();
        if (Input.pressed('x')) {
          Save.data.stats.hearsUsed++;
          speak(this.order.word, { rate: 0.75 });
        }
        if (Input.pressed('y')) this.doGlance();
        break;
      }

      case 'check-pause':
        this.timer -= dt;
        if (this.timer <= 0) this.submitAttempt();
        break;

      case 'retry-pause':
        this.timer -= dt;
        if (this.timer <= 0) {
          // brief re-reveal, then back to spelling
          this.phase = 'glance'; // reuse the timed reveal behaviour (free after a miss)
          this.timer = GLANCE_SECONDS;
          const word = this.order.word;
          this.tilesNode.innerHTML = '';
          for (const ch of word) this.tilesNode.append(el('div', 'wtile reveal', ch));
        }
        break;

      case 'spell-done':
        this.timer -= dt;
        if (this.timer <= 0) this.startKnife();
        break;

      case 'knife':
        KnifeStation.update(dt);
        break;

      case 'served':
        this.timer -= dt;
        if (this.timer <= 0) this.nextOrder();
        break;
    }
  },

  exit() {
    if (KnifeStation.active) KnifeStation.cleanup();
    clearToasts();
  },
};
