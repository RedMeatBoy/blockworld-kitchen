// Sharpening wind-down — the calm between service and results.
//
// Therapeutic design notes: a slow, rhythmic, breathing-paced activity —
// real chef's knife care as mindfulness practice. Strokes only count when the
// direction is HELD steadily — flicking the stick does nothing. Paired
// breathing cues make this a disguised regulation exercise, and it doubles as
// the transition off-ramp at the end of a session.

import { Input } from '../input.js';
import { Sfx, speak } from '../audio.js';
import { go } from '../flow.js';
import { Save, currentKnife } from '../save.js';
import { clearScene, clearHud, el, hintBar } from '../ui.js';

const STROKES_NEEDED = 8;
const STROKE_TIME = 1.5; // seconds of steady hold per stroke

export const sharpenScene = {
  enter({ trustEarned, results }) {
    this.trustEarned = trustEarned;
    this.results = results;
    this.strokes = 0;
    this.progress = 0;       // 0..1 within current stroke
    this.dir = 'right';      // expected hold direction
    this.done = false;
    this.doneTimer = 0;
    this.hintTimer = 0;

    clearHud();
    const root = clearScene();
    const wrap = el('div', 'sharpen-wrap');
    wrap.append(el('div', 'subtitle', '🌙 SERVICE IS OVER. TIME TO CARE FOR YOUR KNIFE.'));

    this.stone = el('div', 'whetstone');
    this.blade = el('div', 'blade');
    this.edge = el('div', 'edge');
    this.blade.append(this.edge);
    this.stone.append(this.blade);
    wrap.append(this.stone);

    this.progressBar = el('div', 'sharpen-progress');
    this.fill = el('div', 'fill');
    this.progressBar.append(this.fill);
    wrap.append(this.progressBar);

    this.cue = el('div', 'breath-cue');
    wrap.append(this.cue);

    root.append(wrap);
    root.append(hintBar([['dpad', 'Hold ← or → to stroke, slow and steady']]));

    const knife = currentKnife(Save.data.trust);
    speak(`Beautiful work tonight, chef. Now we sharpen the ${knife.name}. Slow strokes. Breathe in as the blade slides right... and out as it slides left.`, { rate: 0.85 });
    this.updateCue();
  },

  updateCue() {
    this.cue.innerHTML = this.dir === 'right'
      ? '→ &nbsp;hold RIGHT, slide slow… breathe IN'
      : '← &nbsp;hold LEFT, slide slow… breathe OUT';
  },

  update(dt) {
    if (this.done) {
      this.doneTimer -= dt;
      if (this.doneTimer <= 0 || Input.pressed('a')) {
        Save.data.stats.sharpenSessions++;
        go('results', { trustEarned: this.trustEarned, results: this.results });
      }
      return;
    }

    const holding = Input.held(this.dir);
    const wrongDir = Input.held(this.dir === 'right' ? 'left' : 'right');

    if (holding && !wrongDir) {
      if (this.progress === 0) Sfx.stroke();
      this.progress += dt / STROKE_TIME;
      this.hintTimer = 0;
    } else if (this.progress > 0 && this.progress < 1) {
      // released early — drain gently, no penalty
      this.progress = Math.max(0, this.progress - dt / STROKE_TIME);
      this.hintTimer += dt;
      if (this.hintTimer > 1.6) {
        this.cue.innerHTML = 'slow and steady, chef… hold it all the way across';
        this.hintTimer = -3;
      }
    }

    // blade position follows stroke progress
    const offset = (this.dir === 'right' ? 1 : -1) * (this.progress * 60 - 30);
    this.blade.style.transform = `translateY(-50%) translateX(${offset}px)`;

    if (this.progress >= 1) {
      this.strokes++;
      this.progress = 0;
      this.dir = this.dir === 'right' ? 'left' : 'right';
      this.fill.style.width = `${(this.strokes / STROKES_NEEDED) * 100}%`;
      this.edge.style.opacity = String(this.strokes / STROKES_NEEDED);
      Sfx.pop();
      this.updateCue();

      if (this.strokes >= STROKES_NEEDED) {
        this.done = true;
        this.doneTimer = 3.0;
        this.cue.innerHTML = '✨ Razor sharp and ready for tomorrow. ✨';
        Sfx.star();
        speak('Listen to that edge. Razor sharp. Your knife is ready for tomorrow, chef.', { rate: 0.85 });
      }
    }
  },

  exit() {},
};
