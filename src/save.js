// Persistent progress + parent-dashboard stats, stored in localStorage.
//
// Three independent player profiles share the same code; each lives under its
// own localStorage key so siblings keep separate days, knife trust, recipe
// books and settings. The active profile index is remembered between visits.

const BASE = 'blockworld-kitchen-save-v1';
const LEGACY_KEY = BASE;                 // the old single-save key (pre-profiles)
const ACTIVE_KEY = 'blockworld-kitchen-active';
export const NPROFILES = 3;
const profileKey = (i) => `${BASE}-p${i}`;
const DEFAULT_NAMES = ['CHEF ONE', 'CHEF TWO', 'CHEF THREE'];

// fun names the rename button cycles through
export const NAME_PRESETS = [
  'CHEF ONE', 'CHEF TWO', 'CHEF THREE', 'ERIC', 'EVA', 'MAX', 'MAYA', 'ACE',
  'PIP', 'REX', 'ZOE', 'LEO', 'MIA', 'SAM', 'KAI', 'NOVA', 'BOLT', 'SPARK',
  'TURBO', 'DASH', 'CHOMP', 'SIZZLE', 'WHISK',
];

const DEFAULTS = {
  name: 'CHEF ONE',
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

function freshProfile(i) {
  const d = clone(DEFAULTS);
  d.name = DEFAULT_NAMES[i] || `CHEF ${i + 1}`;
  return d;
}

export const Save = {
  data: null,
  activeIndex: 0,

  /** Read a profile slot's raw saved object, or null if empty. */
  readProfile(i) {
    try {
      const raw = localStorage.getItem(profileKey(i));
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const merged = { ...clone(DEFAULTS), ...parsed };
      merged.stats = { ...clone(DEFAULTS.stats), ...(parsed.stats || {}) };
      if (!merged.name) merged.name = DEFAULT_NAMES[i] || `CHEF ${i + 1}`;
      return merged;
    } catch {
      return null;
    }
  },

  /** Boot: migrate any legacy single save into slot 0, then load the active slot. */
  init() {
    try {
      // one-time migration from the pre-profiles single save
      if (!localStorage.getItem(profileKey(0))) {
        const legacy = localStorage.getItem(LEGACY_KEY);
        if (legacy && legacy !== '{}') {
          localStorage.setItem(profileKey(0), legacy);
          localStorage.removeItem(LEGACY_KEY);
        }
      }
      const stored = parseInt(localStorage.getItem(ACTIVE_KEY) ?? '0', 10);
      this.activeIndex = Number.isInteger(stored) && stored >= 0 && stored < NPROFILES ? stored : 0;
    } catch {
      this.activeIndex = 0;
    }
    this.data = this.readProfile(this.activeIndex) || freshProfile(this.activeIndex);
    return this.data;
  },

  /** Kept for backwards-compatibility; init() is the real entry point. */
  load() { return this.data || this.init(); },

  /** Summaries for the profile-select screen. */
  listProfiles() {
    const out = [];
    for (let i = 0; i < NPROFILES; i++) {
      const p = this.readProfile(i);
      out.push(p
        ? { index: i, exists: true, name: p.name, day: p.day, trust: p.trust,
            avatar: p.avatar, bestStreak: p.stats?.bestStreak || 0, grade: p.grade }
        : { index: i, exists: false, name: DEFAULT_NAMES[i] });
    }
    return out;
  },

  /** Switch to a profile slot (loading it, or creating it fresh). */
  useProfile(i) {
    this.activeIndex = i;
    try { localStorage.setItem(ACTIVE_KEY, String(i)); } catch { /* ignore */ }
    this.data = this.readProfile(i) || freshProfile(i);
    this.save();
    return this.data;
  },

  eraseProfile(i) {
    try { localStorage.removeItem(profileKey(i)); } catch { /* ignore */ }
  },

  rename(name) {
    this.data.name = name;
    this.save();
  },

  save() {
    try {
      localStorage.setItem(profileKey(this.activeIndex), JSON.stringify(this.data));
      localStorage.setItem(ACTIVE_KEY, String(this.activeIndex));
    } catch { /* ignore */ }
  },

  reset() {
    const name = this.data?.name;
    this.data = freshProfile(this.activeIndex);
    if (name) this.data.name = name;
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
