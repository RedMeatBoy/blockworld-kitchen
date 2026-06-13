// Profile select — the boot screen. Three save slots so three players (e.g.
// siblings) each keep their own chef, day, knife trust, recipe book and
// settings. Pick a slot to play; an empty slot starts a fresh chef.

import { Input } from '../input.js';
import { Sfx, speak, unlockAudio } from '../audio.js';
import { go } from '../flow.js';
import { Save, NAME_PRESETS } from '../save.js';
import { gradeLabel } from '../data/words.js';
import { clearScene, clearHud, el, hintBar, hidePhaseMap } from '../ui.js';
import { paintBackground } from '../background.js';
import { chefImage, chefName } from '../avatar.js';

export const profileScene = {
  enter() {
    clearHud();
    hidePhaseMap();
    paintBackground('dining');
    this.cursor = Save.activeIndex || 0;
    this.confirmErase = false;
    this.render();
    speak('Welcome to Blockworld Kitchen! Pick your player.');
  },

  render() {
    const root = clearScene();
    const stack = el('div', 'center-stack');
    stack.append(el('h1', 'game-title', 'CHOOSE YOUR<br>PLAYER'));

    const row = el('div', 'profile-row');
    this.profiles = Save.listProfiles();
    this.profiles.forEach((p, i) => {
      const card = el('div', 'profile-card' + (i === this.cursor ? ' cursor' : ''));
      const img = document.createElement('img');
      img.src = chefImage(p.exists ? p.avatar : 'm', 7);
      if (!p.exists) img.style.opacity = '0.35';
      card.append(img);
      card.append(el('div', 'p-slot', `PLAYER ${i + 1}`));
      card.append(el('div', 'p-name', p.name));
      if (p.exists) {
        card.append(el('div', 'p-stats',
          `${chefName(p.avatar)}<br>Grade ${gradeLabel(p.grade)} · Day ${p.day}<br>` +
          `🔪 Trust ${p.trust}${p.bestStreak >= 2 ? `<br>🔥 Streak ${p.bestStreak}` : ''}`));
      } else {
        card.append(el('div', 'p-stats new', '✨ NEW CHEF<br>press A to start'));
      }
      row.append(card);
    });
    stack.append(row);

    if (this.confirmErase) {
      stack.append(el('div', 'subtitle oops-text',
        `Erase ${this.profiles[this.cursor].name}? &nbsp; A = YES &nbsp; B = NO`));
    } else {
      stack.append(el('div', 'subtitle blink', 'PRESS &nbsp;A&nbsp; TO PLAY'));
    }
    root.append(stack);
    root.append(hintBar([
      ['a', 'Play'],
      ['y', 'Rename'],
      ['dpad', 'Choose player'],
      ['select', 'Erase'],
    ]));
  },

  update() {
    if (this.confirmErase) {
      if (Input.pressed('a')) {
        Save.eraseProfile(this.cursor);
        Sfx.back();
        this.confirmErase = false;
        this.render();
      } else if (Input.pressed('b')) {
        this.confirmErase = false;
        this.render();
      }
      return;
    }

    if (Input.nav('left')) { this.cursor = (this.cursor + 2) % 3; Sfx.move(); this.render(); }
    if (Input.nav('right')) { this.cursor = (this.cursor + 1) % 3; Sfx.move(); this.render(); }

    if (Input.pressed('y')) {
      // cycle this slot's name through the fun preset list
      Save.useProfile(this.cursor);
      const cur = NAME_PRESETS.indexOf(Save.data.name);
      const next = NAME_PRESETS[(cur + 1 + NAME_PRESETS.length) % NAME_PRESETS.length];
      Save.rename(next);
      Sfx.pop();
      this.render();
      speak(next, { rate: 1.05 });
      return;
    }

    if (Input.pressed('select')) {
      if (this.profiles[this.cursor].exists) { this.confirmErase = true; Sfx.back(); this.render(); }
      return;
    }

    if (Input.pressed('a')) {
      unlockAudio();
      Sfx.select();
      const wasNew = !this.profiles[this.cursor].exists;
      Save.useProfile(this.cursor);
      speak(wasNew ? 'A brand new chef! Welcome!' : `Welcome back, ${Save.data.name}!`, { rate: 1.0 });
      go('title');
    }
  },

  exit() {},
};
