// All sound is synthesized with WebAudio (no asset files), plus speechSynthesis
// for the chef's voice. Audio contexts need a user gesture before they run, so
// everything no-ops safely until the first button press resumes the context.

let ctx = null;

function ac() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function unlockAudio() { try { ac(); } catch { /* no audio available */ } }

function tone({ freq = 440, dur = 0.15, type = 'square', vol = 0.18, slide = 0, when = 0 }) {
  try {
    const a = ac();
    const t0 = a.currentTime + when;
    const osc = a.createOscillator();
    const gain = a.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain).connect(a.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  } catch { /* ignore */ }
}

function noise({ dur = 0.2, vol = 0.2, freq = 1200, when = 0 }) {
  try {
    const a = ac();
    const t0 = a.currentTime + when;
    const len = Math.floor(a.sampleRate * dur);
    const buf = a.createBuffer(1, len, a.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = a.createBufferSource();
    src.buffer = buf;
    const filter = a.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    const gain = a.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(filter).connect(gain).connect(a.destination);
    src.start(t0);
  } catch { /* ignore */ }
}

export const Sfx = {
  move()    { tone({ freq: 520, dur: 0.05, type: 'square', vol: 0.07 }); },
  select()  { tone({ freq: 660, dur: 0.08, vol: 0.12 }); tone({ freq: 880, dur: 0.1, when: 0.06, vol: 0.12 }); },
  back()    { tone({ freq: 330, dur: 0.08, vol: 0.1 }); },
  chop()    { noise({ dur: 0.09, vol: 0.3, freq: 900 }); tone({ freq: 180, dur: 0.07, type: 'triangle', vol: 0.25 }); },
  ding()    { tone({ freq: 1175, dur: 0.4, type: 'sine', vol: 0.2 }); tone({ freq: 1568, dur: 0.5, type: 'sine', when: 0.1, vol: 0.15 }); },
  buzz()    { tone({ freq: 140, dur: 0.25, type: 'sawtooth', vol: 0.12 }); },
  pop()     { tone({ freq: 500, dur: 0.08, type: 'sine', slide: 400, vol: 0.18 }); },
  plonk()   { tone({ freq: 300, dur: 0.18, type: 'sine', slide: -150, vol: 0.2 }); },
  star()    { [880, 1109, 1319, 1760].forEach((f, i) => tone({ freq: f, dur: 0.18, type: 'sine', when: i * 0.1, vol: 0.16 })); },
  fanfare() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone({ freq: f, dur: 0.22, type: 'square', when: i * 0.12, vol: 0.13 })); },
  stroke()  { noise({ dur: 0.5, vol: 0.08, freq: 2400 }); },
  sizzle()  { noise({ dur: 0.6, vol: 0.1, freq: 4000 }); },
};

// ---------- chef voice ----------

let voice = null;
let voicesReady = false;

function pickVoice() {
  const voices = speechSynthesis.getVoices();
  if (!voices.length) return;
  voicesReady = true;
  voice =
    voices.find((v) => /en[-_](GB|UK)/i.test(v.lang) && /male|daniel|arthur/i.test(v.name)) ||
    voices.find((v) => /en[-_]GB/i.test(v.lang)) ||
    voices.find((v) => /^en/i.test(v.lang)) ||
    voices[0];
}

if ('speechSynthesis' in window) {
  pickVoice();
  speechSynthesis.addEventListener('voiceschanged', pickVoice);
}

export function speak(text, { rate = 0.95, pitch = 0.9, interrupt = true } = {}) {
  if (!('speechSynthesis' in window)) return;
  if (!voicesReady) pickVoice();
  if (interrupt) speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  if (voice) utter.voice = voice;
  utter.rate = rate;
  utter.pitch = pitch;
  utter.volume = 1;
  speechSynthesis.speak(utter);
}

export function speakLetter(letter) {
  speak(letter, { rate: 1.1, pitch: 1.0, interrupt: true });
}

export function stopSpeech() {
  if ('speechSynthesis' in window) speechSynthesis.cancel();
}
