// Sharpening wind-down — the calm between service and results.
//
// Therapeutic design notes: a slow, rhythmic, breathing-paced activity —
// real chef's knife care as mindfulness practice. Strokes only count when the
// direction is HELD steadily — flicking the stick does nothing. Paired
// breathing cues make this a disguised regulation exercise, and it doubles as
// the transition off-ramp at the end of a session.
//
// The knife is drawn in code: the current trust-tier knife slides along the
// whetstone, its edge gleaming brighter with every stroke, with sparks at the
// contact point.

import { Input } from '../input.js';
import { Sfx, speak } from '../audio.js';
import { go } from '../flow.js';
import { Save, currentKnife } from '../save.js';
import { clearScene, clearHud, el, hintBar, showPhaseMap } from '../ui.js';
import { paintBackground } from '../background.js';
import { Music } from '../music.js';

const STROKES_NEEDED = 8;
const STROKE_TIME = 1.5; // seconds of steady hold per stroke

export const sharpenScene = {
  enter({ trustEarned, results }) {
    paintBackground('night');
    showPhaseMap('sharpen');
    Music.setMood('calm');
    this.trustEarned = trustEarned;
    this.results = results;
    this.strokes = 0;
    this.progress = 0;       // 0..1 within current stroke
    this.dir = 'right';      // expected hold direction
    this.done = false;
    this.doneTimer = 0;
    this.hintTimer = 0;
    this.time = 0;
    this.sparks = [];
    this.knife = currentKnife(Save.data.trust);

    clearHud();
    const root = clearScene();
    const wrap = el('div', 'sharpen-wrap');
    wrap.append(el('div', 'subtitle', '🌙 SERVICE IS OVER. TIME TO CARE FOR YOUR KNIFE.'));

    this.canvas = document.createElement('canvas');
    this.canvas.id = 'sharpen-canvas';
    this.canvas.width = Math.min(720, window.innerWidth * 0.85);
    this.canvas.height = 260;
    wrap.append(this.canvas);
    this.ctx = this.canvas.getContext('2d');

    this.progressBar = el('div', 'sharpen-progress');
    this.fill = el('div', 'fill');
    this.progressBar.append(this.fill);
    wrap.append(this.progressBar);

    this.cue = el('div', 'breath-cue');
    wrap.append(this.cue);

    root.append(wrap);
    root.append(hintBar([['dpad', 'Hold ← or → to stroke, slow and steady']]));

    speak(`Beautiful work tonight, chef. Now we sharpen the ${this.knife.name}. Slow strokes. Breathe in as the blade slides right... and out as it slides left.`, { rate: 0.85 });
    this.updateCue();
    this.draw();
  },

  updateCue() {
    this.cue.innerHTML = this.dir === 'right'
      ? '→ &nbsp;hold RIGHT, slide slow… breathe IN'
      : '← &nbsp;hold LEFT, slide slow… breathe OUT';
  },

  // ---------------- drawing ----------------

  draw() {
    const ctx = this.ctx;
    const W = this.canvas.width, H = this.canvas.height;
    ctx.clearRect(0, 0, W, H);
    const px = Math.max(3, Math.floor(W / 160)); // pixel-art unit

    // wooden bench
    ctx.fillStyle = '#4a3320';
    ctx.fillRect(0, H - px * 10, W, px * 10);
    ctx.fillStyle = '#5f432a';
    ctx.fillRect(0, H - px * 10, W, px * 2);

    // whetstone block (two-tone like a real combination stone)
    const stoneW = W * 0.62, stoneH = px * 9;
    const stoneX = (W - stoneW) / 2, stoneY = H - px * 10 - stoneH;
    ctx.fillStyle = '#3a3f4d';
    ctx.fillRect(stoneX - px, stoneY + stoneH - px * 2, stoneW + px * 2, px * 2); // base
    ctx.fillStyle = '#707a8c';
    ctx.fillRect(stoneX, stoneY, stoneW * 0.55, stoneH - px * 2);
    ctx.fillStyle = '#8a93a8';
    ctx.fillRect(stoneX + stoneW * 0.55, stoneY, stoneW * 0.45, stoneH - px * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(stoneX, stoneY, stoneW, px); // top light

    // knife position along the stone
    const t = this.done ? 0.5
      : this.dir === 'right' ? this.progress : 1 - this.progress;
    const bladeLen = stoneW * 0.52;
    const cx = stoneX + bladeLen / 2 + (stoneW - bladeLen) * t;
    const edgeY = stoneY + px; // blade edge rides the stone surface

    ctx.save();
    ctx.translate(cx, edgeY);
    ctx.rotate(this.done ? -0.35 : -0.06); // lifts proudly when done

    // blade (pixel-styled trapezoid with a tier-coloured spine)
    const bh = px * 7;
    ctx.fillStyle = '#d8dde8';
    ctx.beginPath();
    ctx.moveTo(-bladeLen / 2, 0);
    ctx.lineTo(bladeLen / 2 - px * 4, 0);
    ctx.lineTo(bladeLen / 2, -bh * 0.45);
    ctx.lineTo(bladeLen / 2, -bh);
    ctx.lineTo(-bladeLen / 2, -bh);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#b9c2d4';
    ctx.fillRect(-bladeLen / 2, -bh, bladeLen, px * 2); // spine shade
    ctx.fillStyle = this.knife.color;
    ctx.fillRect(-bladeLen / 2, -bh + px * 2, bladeLen * 0.9, px); // tier stripe

    // gleaming edge grows with strokes
    const gleam = this.strokes / STROKES_NEEDED;
    if (gleam > 0) {
      ctx.fillStyle = `rgba(94,230,224,${0.25 + gleam * 0.75})`;
      ctx.fillRect(-bladeLen / 2, -px, bladeLen - px * 4, px);
      // travelling sparkle
      const sx = ((this.time * 0.35) % 1) * (bladeLen - px * 6) - bladeLen / 2;
      ctx.fillStyle = `rgba(255,255,255,${0.4 + gleam * 0.6})`;
      ctx.fillRect(sx, -px * 1.5, px * 2, px * 2);
    }

    // handle with rivets
    ctx.fillStyle = '#4a3320';
    ctx.fillRect(-bladeLen / 2 - px * 14, -bh + px, px * 14, px * 5);
    ctx.fillStyle = '#5f432a';
    ctx.fillRect(-bladeLen / 2 - px * 14, -bh + px, px * 14, px * 2);
    ctx.fillStyle = '#d9c074';
    ctx.fillRect(-bladeLen / 2 - px * 10, -bh + px * 3, px, px);
    ctx.fillRect(-bladeLen / 2 - px * 5, -bh + px * 3, px, px);
    ctx.restore();

    // sparks at the contact point
    for (const s of this.sparks) {
      ctx.fillStyle = `rgba(245,211,59,${s.life})`;
      ctx.fillRect(s.x, s.y, px, px);
    }
  },

  spawnSparks(count) {
    const W = this.canvas.width, H = this.canvas.height;
    const px = Math.max(3, Math.floor(W / 160));
    const stoneY = H - px * 10 - px * 9;
    for (let i = 0; i < count; i++) {
      this.sparks.push({
        x: W / 2 + (Math.random() - 0.5) * W * 0.4,
        y: stoneY + px,
        vx: (Math.random() - 0.5) * 80,
        vy: -40 - Math.random() * 60,
        life: 1,
      });
    }
  },

  // ---------------- per-frame ----------------

  update(dt) {
    this.time += dt;

    // spark physics
    for (const s of this.sparks) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vy += 220 * dt;
      s.life -= dt * 1.8;
    }
    this.sparks = this.sparks.filter((s) => s.life > 0);

    if (this.done) {
      this.draw();
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
      if (Math.random() < dt * 9) this.spawnSparks(1); // gentle trickle while honing
    } else if (this.progress > 0 && this.progress < 1) {
      // released early — drain gently, no penalty
      this.progress = Math.max(0, this.progress - dt / STROKE_TIME);
      this.hintTimer += dt;
      if (this.hintTimer > 1.6) {
        this.cue.innerHTML = 'slow and steady, chef… hold it all the way across';
        this.hintTimer = -3;
      }
    }

    if (this.progress >= 1) {
      this.strokes++;
      this.progress = 0;
      this.dir = this.dir === 'right' ? 'left' : 'right';
      this.fill.style.width = `${(this.strokes / STROKES_NEEDED) * 100}%`;
      Sfx.pop();
      this.spawnSparks(6);
      this.updateCue();

      if (this.strokes >= STROKES_NEEDED) {
        this.done = true;
        this.doneTimer = 3.0;
        this.cue.innerHTML = '✨ Razor sharp and ready for tomorrow. ✨';
        Sfx.star();
        this.spawnSparks(18);
        speak('Listen to that edge. Razor sharp. Your knife is ready for tomorrow, chef.', { rate: 0.85 });
      }
    }

    this.draw();
  },

  exit() {},
};
