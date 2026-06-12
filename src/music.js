// Procedural chiptune music (WebAudio, no audio files) + the "whisper"
// channel: while the player is spelling, a soft voice murmurs the target word
// into the music every few seconds — ambient rehearsal of the spelling target.
//
// Two moods:
//   'upbeat' — bouncy original platformer-style chiptune (square lead, triangle
//              bass, noise drums, light swing) for cooking
//   'calm'   — slow warm pads for the sharpening wind-down

import { getAudioContext, speak } from './audio.js';

const C4 = 261.63;
const note = (semi, oct = 0) => C4 * Math.pow(2, semi / 12 + oct);

// ---- upbeat: six original tunes, rotated by in-game day ----
// Each song: tempo, lead wave, two 4-bar lead sections (A/B) in 8th-note
// steps [semitone offset from C5 | null = rest, length], bass roots per bar.
const SEG_STEPS = 32; // 4 bars of 8 eighth-notes

const SONGS = [
  { // 1. "Block Party Bounce" — the original
    name: 'Block Party Bounce', tempo: 152, wave: 'square', bass: [0, 5, 7, 0],
    leadA: [
      [4, 1], [7, 1], [9, 1], [7, 1], [4, 1], [7, 1], [12, 2],
      [9, 1], [7, 1], [4, 1], [7, 1], [9, 2], [null, 2],
      [2, 1], [5, 1], [7, 1], [5, 1], [2, 1], [5, 1], [11, 2],
      [12, 1], [11, 1], [9, 1], [7, 1], [4, 2], [null, 2],
    ],
    leadB: [
      [12, 1], [null, 1], [12, 1], [null, 1], [9, 1], [12, 1], [14, 2],
      [16, 2], [14, 1], [12, 1], [9, 1], [7, 1], [null, 2],
      [5, 1], [9, 1], [12, 1], [9, 1], [5, 1], [9, 1], [14, 2],
      [12, 2], [9, 1], [7, 1], [4, 2], [null, 2],
    ],
  },
  { // 2. minor-key kitchen funk
    name: 'Pepper Groove', tempo: 140, wave: 'square', bass: [9, 5, 7, 9],
    leadA: [
      [9, 1], [null, 1], [9, 1], [12, 1], [null, 1], [12, 1], [14, 2],
      [16, 1], [14, 1], [12, 1], [9, 1], [12, 2], [null, 2],
      [7, 1], [null, 1], [7, 1], [10, 1], [null, 1], [10, 1], [12, 2],
      [14, 1], [12, 1], [10, 1], [7, 1], [9, 2], [null, 2],
    ],
    leadB: [
      [16, 2], [14, 1], [12, 1], [16, 2], [14, 1], [12, 1],
      [9, 1], [10, 1], [12, 1], [14, 1], [16, 2], [null, 2],
      [12, 2], [10, 1], [9, 1], [12, 2], [10, 1], [9, 1],
      [7, 1], [9, 1], [10, 1], [12, 1], [9, 2], [null, 2],
    ],
  },
  { // 3. gentle pentatonic skipping tune
    name: 'Sunny Side Up', tempo: 162, wave: 'triangle', bass: [0, 5, 7, 0],
    leadA: [
      [0, 1], [2, 1], [4, 1], [7, 1], [4, 1], [2, 1], [0, 2],
      [7, 1], [9, 1], [7, 1], [4, 1], [2, 2], [null, 2],
      [0, 1], [2, 1], [4, 1], [7, 1], [9, 1], [7, 1], [12, 2],
      [9, 1], [7, 1], [4, 1], [2, 1], [0, 2], [null, 2],
    ],
    leadB: [
      [12, 2], [9, 1], [7, 1], [9, 2], [7, 1], [4, 1],
      [2, 1], [4, 1], [7, 1], [9, 1], [12, 2], [null, 2],
      [9, 1], [12, 1], [14, 1], [12, 1], [9, 1], [7, 1], [4, 2],
      [2, 1], [4, 2], [2, 1], [0, 2], [null, 2],
    ],
  },
  { // 4. sparkly dessert-cart waltz-ish shimmer
    name: 'Diamond Dessert', tempo: 146, wave: 'square', bass: [5, 2, 7, 5],
    leadA: [
      [5, 1], [9, 1], [12, 1], [9, 1], [5, 1], [9, 1], [16, 2],
      [14, 1], [12, 1], [9, 1], [5, 1], [7, 2], [null, 2],
      [4, 1], [7, 1], [11, 1], [7, 1], [4, 1], [7, 1], [14, 2],
      [12, 1], [11, 1], [9, 1], [7, 1], [5, 2], [null, 2],
    ],
    leadB: [
      [17, 2], [16, 1], [14, 1], [12, 2], [9, 1], [7, 1],
      [9, 1], [12, 1], [14, 1], [16, 1], [17, 2], [null, 2],
      [16, 1], [14, 1], [12, 1], [11, 1], [12, 2], [9, 2],
      [7, 1], [9, 1], [11, 1], [12, 1], [14, 2], [null, 2],
    ],
  },
  { // 5. sneaky tip-toe minor groove
    name: 'Midnight Snack', tempo: 128, wave: 'triangle', bass: [0, 8, 10, 0],
    leadA: [
      [0, 1], [3, 1], [7, 1], [3, 1], [0, 1], [3, 1], [8, 2],
      [7, 1], [5, 1], [3, 1], [0, 1], [3, 2], [null, 2],
      [-2, 1], [2, 1], [5, 1], [2, 1], [-2, 1], [2, 1], [7, 2],
      [5, 1], [3, 1], [2, 1], [0, 1], [3, 2], [null, 2],
    ],
    leadB: [
      [12, 1], [null, 1], [10, 1], [null, 1], [8, 1], [7, 1], [8, 2],
      [7, 1], [5, 1], [3, 1], [5, 1], [7, 2], [null, 2],
      [8, 1], [7, 1], [5, 1], [3, 1], [5, 1], [3, 1], [2, 2],
      [0, 1], [2, 1], [3, 1], [5, 1], [0, 2], [null, 2],
    ],
  },
  { // 6. fastest, brightest — for big nights
    name: 'Full Steam Kitchen', tempo: 170, wave: 'square', bass: [7, 5, 0, 7],
    leadA: [
      [7, 1], [7, 1], [null, 1], [7, 1], [4, 1], [7, 1], [9, 2],
      [12, 1], [null, 1], [9, 1], [null, 1], [7, 1], [4, 1], [5, 2],
      [5, 1], [5, 1], [null, 1], [5, 1], [2, 1], [5, 1], [7, 2],
      [9, 1], [7, 1], [5, 1], [4, 1], [0, 2], [null, 2],
    ],
    leadB: [
      [12, 1], [12, 1], [null, 1], [12, 1], [14, 1], [12, 1], [9, 2],
      [7, 1], [9, 1], [12, 1], [14, 1], [16, 2], [null, 2],
      [14, 1], [14, 1], [null, 1], [14, 1], [12, 1], [9, 1], [7, 2],
      [4, 1], [5, 1], [7, 1], [9, 1], [7, 2], [null, 2],
    ],
  },
];

let song = SONGS[0];

// ---- calm: warm pad loop (Fmaj7 → Am7 → Dm7 → B♭maj7) ----
const CALM_BAR = 3.2;
const CALM_CHORDS = [
  [174.61, 220.0, 261.63, 329.63],
  [220.0, 261.63, 329.63, 392.0],
  [146.83, 174.61, 220.0, 261.63],
  [116.54, 146.83, 174.61, 220.0],
];

let master = null;
let timer = null;
let nextTime = 0;
let segIndex = 0;
let calmBarIndex = 0;
let playing = false;
let mood = 'upbeat';

function ensureMaster(ctx) {
  if (!master) {
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
  }
  return master;
}

function osc(ctx, out, { type, freq, t, dur, vol, decay = false }) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(vol, t);
  if (decay) g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  else {
    g.gain.setValueAtTime(vol, t + dur * 0.7);
    g.gain.linearRampToValueAtTime(0, t + dur);
  }
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function noiseHit(ctx, out, { t, dur, vol, freq }) {
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(filter).connect(g).connect(out);
  src.start(t);
}

function scheduleUpbeatSegment(ctx, when) {
  const out = ensureMaster(ctx);
  const STEP = 60 / song.tempo / 2;
  const SWING = STEP * 0.24;
  const stepTime = (base, step) => base + step * STEP + (step % 2 ? SWING : 0);
  const lead = segIndex % 2 ? song.leadB : song.leadA;

  // lead melody
  let step = 0;
  for (const [semi, len] of lead) {
    if (semi !== null) {
      const t = stepTime(when, step);
      osc(ctx, out, { type: song.wave, freq: note(semi, 0), t, dur: len * STEP * 0.85, vol: song.wave === 'square' ? 0.042 : 0.06 });
      // sparkle: same note an octave up, very quiet, every other phrase
      if (segIndex % 2) {
        osc(ctx, out, { type: song.wave, freq: note(semi, 1), t, dur: len * STEP * 0.5, vol: 0.012, decay: true });
      }
    }
    step += len;
  }

  // bouncing bass — root / fifth alternating
  for (let bar = 0; bar < 4; bar++) {
    const root = song.bass[bar];
    for (let s = 0; s < 8; s++) {
      const t = stepTime(when, bar * 8 + s);
      const semi = s % 2 ? root - 17 : root - 24; // fifth above low root
      osc(ctx, out, { type: 'triangle', freq: note(semi, 0), t, dur: STEP * 0.8, vol: 0.085, decay: true });
    }
  }

  // drums: hat ticks on every step, snare on beats 2 & 4, kick on 1 & 3
  for (let s = 0; s < SEG_STEPS; s++) {
    const t = stepTime(when, s);
    noiseHit(ctx, out, { t, dur: 0.03, vol: s % 2 ? 0.016 : 0.028, freq: 7000 });
    if (s % 8 === 2 || s % 8 === 6) noiseHit(ctx, out, { t, dur: 0.1, vol: 0.05, freq: 1900 });
    if (s % 8 === 0 || s % 8 === 4) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(110, t);
      o.frequency.exponentialRampToValueAtTime(48, t + 0.1);
      g.gain.setValueAtTime(0.1, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + 0.2);
    }
  }
  return SEG_STEPS * STEP + 0; // segment duration
}

function scheduleCalmBar(ctx, when) {
  const out = ensureMaster(ctx);
  const chord = CALM_CHORDS[calmBarIndex % CALM_CHORDS.length];
  for (const freq of chord) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'triangle';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(0.05, when + 0.6);
    g.gain.setValueAtTime(0.05, when + CALM_BAR - 0.8);
    g.gain.linearRampToValueAtTime(0, when + CALM_BAR);
    o.connect(g).connect(out);
    o.start(when);
    o.stop(when + CALM_BAR + 0.1);
  }
  // one gentle bell per bar
  osc(ctx, out, {
    type: 'sine',
    freq: chord[(calmBarIndex * 3) % chord.length] * 2,
    t: when + 0.2, dur: 1.4, vol: 0.035, decay: true,
  });
}

function tick() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    while (nextTime < ctx.currentTime + 1.5) {
      const when = Math.max(nextTime, ctx.currentTime + 0.05);
      if (mood === 'calm') {
        scheduleCalmBar(ctx, when);
        nextTime = when + CALM_BAR;
        calmBarIndex++;
      } else {
        const dur = scheduleUpbeatSegment(ctx, when);
        nextTime = when + dur;
        segIndex++;
      }
    }
  } catch { /* audio unavailable */ }
}

export const Music = {
  isPlaying() { return playing; },
  songCount: SONGS.length,

  /** Pick the night's tune (rotates with the in-game day). */
  setSong(index) {
    const next = SONGS[((index % SONGS.length) + SONGS.length) % SONGS.length];
    if (next === song) return;
    song = next;
    segIndex = 0;
    if (playing) {
      try {
        const ctx = getAudioContext();
        if (ctx) nextTime = Math.min(nextTime, ctx.currentTime + 0.4);
      } catch { /* ignore */ }
    }
  },

  /** 'upbeat' for cooking, 'calm' for the sharpening wind-down. */
  setMood(next) {
    if (mood === next) return;
    mood = next;
    if (playing) {
      // let the current phrase finish quickly, then the new mood takes over
      try {
        const ctx = getAudioContext();
        if (ctx) nextTime = Math.min(nextTime, ctx.currentTime + 0.4);
      } catch { /* ignore */ }
    }
  },

  start() {
    if (playing) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      ensureMaster(ctx);
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
      master.gain.linearRampToValueAtTime(1.0, ctx.currentTime + 1.0);
      nextTime = ctx.currentTime + 0.1;
      segIndex = 0;
      calmBarIndex = 0;
      clearInterval(timer);
      timer = setInterval(tick, 250);
      tick();
      playing = true;
    } catch { /* no audio */ }
  },

  stop() {
    if (!playing) return;
    playing = false;
    clearInterval(timer);
    timer = null;
    try {
      const ctx = getAudioContext();
      if (ctx && master) {
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
        master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);
      }
    } catch { /* ignore */ }
  },

  /** Soft murmured repetition of the spelling word, woven under the music. */
  whisper(word) {
    if (!playing) return;
    speak(word, { volume: 0.22, rate: 0.72, pitch: 1.25, interrupt: false });
  },
};
