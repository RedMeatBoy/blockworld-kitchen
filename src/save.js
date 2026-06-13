// Persistent progress + parent-dashboard stats, stored in localStorage.

const KEY = 'blockworld-kitchen-save-v1';

const DEFAULTS = {
  day: 1,
  trust: 0,
  grade: 2,              // 0 (K)..6, picked on the title screen (Alberta curriculum bands)
  avatar: 'm',           // 'm' (Chef Max) | 'f' (Chef Maya)
  music: true,
  voice: 'friendly',     // 'friendly' | 'fiery' (Chef Blocksay)
  mastered: {},          // word → first-try count (Recipe Book)
  wordTier: 0,           // 0..2 within the grade band, adapts with spelling success
  decorations: [],       // { x, y, emoji }
  pendingDecoChoices: null,
  stats: {
    sessions: 0,
    wordsAttempted: 0,
    wordsFirstTry: 0,
    glancesUsed: 0,
    hearsUsed: 0,
    cutsTotal: 0,
    cutsPerfect: 0,
    cutsGood: 0,
    cutsMissed: 0,
    waitsTotal: 0,
    waitsHeld: 0,         // successful withholds
    noCutTotal: 0,
    noCutHeld: 0,
    sharpenSessions: 0,
    bestStreak: 0,
    engineSlow: 0,
    engineRight: 0,
    engineRacing: 0,
    moveBreaks: 0,
    quizRight: 0,
    quizTotal: 0,
  },
  // rolling record of recent first-try results, drives word tier adaptation
  recentSpelling: [],
};

function clone(obj) { return JSON.parse(JSON.stringify(obj)); }

export const Save = {
  data: null,

  load() {
    try {
      const raw = localStorage.getItem(KEY);
      this.data = raw ? { ...clone(DEFAULTS), ...JSON.parse(raw) } : clone(DEFAULTS);
      this.data.stats = { ...clone(DEFAULTS.stats), ...(this.data.stats || {}) };
    } catch {
      this.data = clone(DEFAULTS);
    }
    return this.data;
  },

  save() {
    try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch { /* ignore */ }
  },

  reset() {
    this.data = clone(DEFAULTS);
    this.save();
  },

  /** Record a first-try spelling outcome and adapt the word tier. */
  recordSpelling(firstTry) {
    const d = this.data;
    d.stats.wordsAttempted++;
    if (firstTry) d.stats.wordsFirstTry++;
    d.recentSpelling.push(firstTry ? 1 : 0);
    if (d.recentSpelling.length > 8) d.recentSpelling.shift();
    const recent = d.recentSpelling;
    if (recent.length >= 6) {
      const rate = recent.reduce((a, b) => a + b, 0) / recent.length;
      if (rate >= 0.8 && d.wordTier < 2) { d.wordTier++; d.recentSpelling = []; }
      else if (rate <= 0.3 && d.wordTier > 0) { d.wordTier--; d.recentSpelling = []; }
    }
  },

  addTrust(amount) {
    this.data.trust = Math.max(0, this.data.trust + amount);
  },

  /** Change grade band; resets the within-grade adaptive tier. */
  setGrade(grade) {
    this.data.grade = Math.min(6, Math.max(0, grade));
    this.data.wordTier = 0;
    this.data.recentSpelling = [];
    this.save();
  },
};

export const KNIVES = [
  { name: 'Wooden Training Knife', trust: 0,    color: '#8a5a2b', emoji: '🟫' },
  { name: 'Stone Paring Knife',    trust: 90,   color: '#9a9a9a', emoji: '🪨' },
  { name: "Iron Chef's Knife",     trust: 220,  color: '#d8d8e0', emoji: '⬜' },
  { name: 'Golden Santoku',        trust: 400,  color: '#f5c84b', emoji: '🟨' },
  { name: 'Diamond Cleaver',       trust: 650,  color: '#5ee6e0', emoji: '💎' },
  // -- the cosmic tiers: glowing blades for chefs with legendary control --
  { name: 'Obsidian Edge',         trust: 950,  color: '#7a4fd9', emoji: '🟪', glow: true },
  { name: 'Laser Cutter Knife',    trust: 1300, color: '#ff3b3b', emoji: '🔴', glow: true },
  { name: 'Plasma Knife',          trust: 1700, color: '#3bd9ff', emoji: '🔵', glow: true },
  { name: 'Ion Blade',             trust: 2150, color: '#8aff3b', emoji: '🟢', glow: true },
  { name: 'Laser Sword Knife',     trust: 2650, color: '#3bff8a', emoji: '⚔️', glow: true },
  { name: 'Antimatter Cleaver',    trust: 3200, color: '#ff3bd9', emoji: '🌀', glow: true },
  { name: 'Photon Santoku',        trust: 3800, color: '#fff23b', emoji: '✨', glow: true },
  { name: 'Quasar Edge',           trust: 4450, color: '#ff8a3b', emoji: '☄️', glow: true },
  { name: 'Nebula Blade',          trust: 5150, color: '#b03bff', emoji: '🌌', glow: true },
  { name: 'Singularity Knife',     trust: 5900, color: '#e8e8ff', emoji: '🌠', glow: true },
];

export function currentKnife(trust) {
  let k = KNIVES[0];
  for (const knife of KNIVES) if (trust >= knife.trust) k = knife;
  return k;
}

export function nextKnife(trust) {
  return KNIVES.find((k) => k.trust > trust) || null;
}
