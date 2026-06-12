// Procedural lo-fi kitchen music (WebAudio, no audio files) + the "whisper"
// channel: while the player is spelling, a soft voice murmurs the target word
// into the music every few seconds — ambient rehearsal of the spelling target.

import { getAudioContext, speak } from './audio.js';

const TEMPO = 74;                       // gentle
const BAR = (60 / TEMPO) * 4;           // seconds per bar
// Fmaj7 → Am7 → Dm7 → B♭maj7, a warm kid-friendly loop
const CHORDS = [
  [174.61, 220.0, 261.63, 329.63],
  [220.0, 261.63, 329.63, 392.0],
  [146.83, 174.61, 220.0, 261.63],
  [116.54, 146.83, 174.61, 220.0],
];

let master = null;
let timer = null;
let nextBarTime = 0;
let barIndex = 0;
let playing = false;

function ensureMaster(ctx) {
  if (!master) {
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
  }
  return master;
}

function scheduleBar(ctx, when, chord) {
  const out = ensureMaster(ctx);

  // soft pad: each chord tone, slow attack, long release
  for (const freq of chord) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(0.045, when + 0.6);
    g.gain.setValueAtTime(0.045, when + BAR - 0.8);
    g.gain.linearRampToValueAtTime(0, when + BAR);
    osc.connect(g).connect(out);
    osc.start(when);
    osc.stop(when + BAR + 0.1);
  }

  // sparse plucked arpeggio an octave up (skips some steps so it breathes)
  for (let step = 0; step < 8; step++) {
    if ((barIndex * 8 + step) % 3 === 1) continue;
    const t = when + (step * BAR) / 8;
    const freq = chord[(step * 5 + barIndex) % chord.length] * 2;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.05, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    osc.connect(g).connect(out);
    osc.start(t);
    osc.stop(t + 0.5);
  }

  // heartbeat-soft kick on 1 and 3 (regulation pacing)
  for (const beat of [0, 2]) {
    const t = when + (beat * BAR) / 4;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(90, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.18);
    g.gain.setValueAtTime(0.08, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    osc.connect(g).connect(out);
    osc.start(t);
    osc.stop(t + 0.3);
  }
}

function tick() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    while (nextBarTime < ctx.currentTime + 1.0) {
      scheduleBar(ctx, Math.max(nextBarTime, ctx.currentTime + 0.05), CHORDS[barIndex % CHORDS.length]);
      nextBarTime += BAR;
      barIndex++;
    }
  } catch { /* audio unavailable */ }
}

export const Music = {
  isPlaying() { return playing; },

  start() {
    if (playing) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      ensureMaster(ctx);
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
      master.gain.linearRampToValueAtTime(1.0, ctx.currentTime + 1.5);
      nextBarTime = ctx.currentTime + 0.1;
      barIndex = 0;
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
