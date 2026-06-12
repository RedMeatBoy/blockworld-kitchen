// Grade-based word banks, aligned to the Alberta ELAL (2022) word-study
// progression (curriculum.learnalberta.ca):
//   Grade 1: CVC words, consonant blends, digraphs, silent-e
//   Grade 2: vowel teams, common spelling patterns, early two-syllable words
//   Grade 3: compound words, multisyllabic words, common affixes
//   Grade 4: complex vowel patterns, longer multisyllabic words
//   Grade 5: prefixes/suffixes, irregular plurals (f/o/y), harder morphology
//   Grade 6: Greek/Latin-derived and loan words, derivational morphology
//
// Within a grade there are 3 tiers; the active tier auto-adapts to the
// player's recent first-try success (see save.js). All words stay food-themed.

// Catalog: every word the game knows, with its dish framing.
const W = {
  // -- short / CVC --
  EGG:  { dish: 'Fried Egg on Toast', emoji: '🍳', color: 0xf7e08a },
  HAM:  { dish: 'Ham Sliders', emoji: '🍖', color: 0xe89aa4 },
  JAM:  { dish: 'Berry Jam Tarts', emoji: '🫐', color: 0x9a4fb3 },
  BUN:  { dish: 'Steamed Buns', emoji: '🥯', color: 0xe0b36a },
  PIE:  { dish: 'Apple Pie Slice', emoji: '🥧', color: 0xd9913b },
  NUT:  { dish: 'Roasted Nut Mix', emoji: '🥜', color: 0xc9925e },
  POT:  { dish: 'Hot Pot Surprise', emoji: '🍲', color: 0xb35f3b },
  CUP:  { dish: 'Cocoa in a Cup', emoji: '☕', color: 0x8a5a3b },
  PAN:  { dish: 'Pan-Fried Surprise', emoji: '🍳', color: 0x707a8c },
  FIG:  { dish: 'Sweet Fig Bites', emoji: '🟣', color: 0x7a4fb3 },
  JUG:  { dish: 'Juice Jug', emoji: '🧃', color: 0xe8843b },
  YAM:  { dish: 'Roasted Yams', emoji: '🍠', color: 0xb3653b },
  PEA:  { dish: 'Green Pea Soup', emoji: '🥣', color: 0x7fc96b },
  TEA:  { dish: 'Honey Mint Tea', emoji: '🍵', color: 0x8fbf6b },
  // -- blends / digraphs --
  FISH: { dish: 'Crispy Fish Bites', emoji: '🐟', color: 0x7fb6d9 },
  CHIP: { dish: 'Golden Chips', emoji: '🍟', color: 0xf2c84b },
  CORN: { dish: 'Roasted Corn Cobs', emoji: '🌽', color: 0xf5d33b },
  MILK: { dish: 'Vanilla Milkshake', emoji: '🥛', color: 0xf6f3ec },
  PLUM: { dish: 'Sweet Plum Bowl', emoji: '🍑', color: 0x9a5fb3 },
  CRAB: { dish: 'Crab Cakes', emoji: '🦀', color: 0xe8744f },
  CHOP: { dish: 'Veggie Chop Bowl', emoji: '🥗', color: 0x7fc96b },
  // -- silent-e / vowel teams --
  RICE: { dish: 'Sticky Rice Bowl', emoji: '🍚', color: 0xf2efe4 },
  CAKE: { dish: 'Block Party Cake', emoji: '🍰', color: 0xf2b8d0 },
  LIME: { dish: 'Lime Fizz', emoji: '🍋‍🟩', color: 0xa3d94f },
  GRAPE:{ dish: 'Frozen Grapes', emoji: '🍇', color: 0x8a4fb3 },
  TOAST:{ dish: 'Cheesy Toast', emoji: '🍞', color: 0xd9a662 },
  SOUP: { dish: 'Dragon Soup', emoji: '🥣', color: 0xd9794f },
  TACO: { dish: 'Crunchy Tacos', emoji: '🌮', color: 0xe8c25a },
  BEAN: { dish: 'Magic Bean Stew', emoji: '🫘', color: 0xa3653b },
  PEACH:{ dish: 'Peach Cobbler', emoji: '🍑', color: 0xf5a86b },
  HONEY:{ dish: 'Honey Drizzle Cakes', emoji: '🍯', color: 0xf2b53b },
  BERRY:{ dish: 'Berry Blast Bowl', emoji: '🫐', color: 0x6b4fb3 },
  // -- grade 2 staples --
  APPLE:  { dish: 'Baked Apple Crumble', emoji: '🍎', color: 0xd94f3d },
  BREAD:  { dish: 'Fresh Baked Bread', emoji: '🍞', color: 0xd9a662 },
  ONION:  { dish: 'Onion Rings', emoji: '🧅', color: 0xd9c7a0 },
  MANGO:  { dish: 'Mango Smoothie', emoji: '🥭', color: 0xf5a83b },
  LEMON:  { dish: 'Lemon Squares', emoji: '🍋', color: 0xf2e35b },
  CARROT: { dish: 'Carrot Coins', emoji: '🥕', color: 0xe8843b },
  TOMATO: { dish: 'Tomato Soup', emoji: '🍅', color: 0xd9453a },
  CHEESE: { dish: 'Grilled Cheese', emoji: '🧀', color: 0xf2c83b },
  BUTTER: { dish: 'Butter Noodles', emoji: '🧈', color: 0xf2dc8a },
  GARLIC: { dish: 'Garlic Knots', emoji: '🧄', color: 0xe8e0cc },
  BANANA: { dish: 'Banana Splits', emoji: '🍌', color: 0xf2d53b },
  POTATO: { dish: 'Smashed Potatoes', emoji: '🥔', color: 0xc9a25e },
  PEPPER: { dish: 'Stuffed Peppers', emoji: '🫑', color: 0x5fb33b },
  // -- compounds / grade 3 --
  PANCAKE:  { dish: 'Stacked Pancakes', emoji: '🥞', color: 0xe8b45e },
  MEATBALL: { dish: 'Mega Meatballs', emoji: '🍝', color: 0xa3543b },
  POPCORN:  { dish: 'Caramel Popcorn', emoji: '🍿', color: 0xf2dc8a },
  OATMEAL:  { dish: 'Warm Oatmeal Bowl', emoji: '🥣', color: 0xd9b27a },
  CUPCAKE:  { dish: 'Frosted Cupcakes', emoji: '🧁', color: 0xe89ac4 },
  HOTDOG:   { dish: 'Loaded Hotdogs', emoji: '🌭', color: 0xd9794f },
  PEANUT:   { dish: 'Peanut Crunch Bars', emoji: '🥜', color: 0xc9925e },
  CHICKEN:  { dish: 'Honey Chicken Bites', emoji: '🍗', color: 0xd9924f },
  PUMPKIN:  { dish: 'Pumpkin Stew', emoji: '🎃', color: 0xe8893b },
  NOODLES:  { dish: 'Dragon Noodles', emoji: '🍜', color: 0xe8cf8a },
  MUSHROOM: { dish: 'Mushroom Skewers', emoji: '🍄', color: 0xc98a6b },
  SANDWICH: { dish: 'Mega Sandwich', emoji: '🥪', color: 0xd9b27a },
  BROCCOLI: { dish: 'Broccoli Trees', emoji: '🥦', color: 0x4f9b3f },
  PRETZEL:  { dish: 'Twisted Pretzels', emoji: '🥨', color: 0xb37a3b },
  WAFFLES:  { dish: 'Diamond Waffles', emoji: '🧇', color: 0xdfae55 },
  AVOCADO:  { dish: 'Avocado Smash Toast', emoji: '🥑', color: 0x8ab35e },
  // -- grade 4 --
  SPINACH:  { dish: 'Spinach Power Wrap', emoji: '🥬', color: 0x4f9b3f },
  YOGURT:   { dish: 'Frozen Yogurt Swirl', emoji: '🍦', color: 0xf2e8dc },
  KETCHUP:  { dish: 'Ketchup Fry Dippers', emoji: '🍟', color: 0xd9453a },
  MUSTARD:  { dish: 'Mustard Pretzel Dip', emoji: '🥨', color: 0xe8c23b },
  GRANOLA:  { dish: 'Granola Parfait', emoji: '🥣', color: 0xc9a25e },
  PUDDING:  { dish: 'Chocolate Pudding', emoji: '🍮', color: 0x8a5a3b },
  COCONUT:  { dish: 'Coconut Snow Cups', emoji: '🥥', color: 0xf2ede0 },
  CABBAGE:  { dish: 'Crunchy Cabbage Slaw', emoji: '🥬', color: 0x9bc96b },
  BLUEBERRY:{ dish: 'Blueberry Muffins', emoji: '🫐', color: 0x5f6bd9 },
  CINNAMON: { dish: 'Cinnamon Swirl Buns', emoji: '🥐', color: 0xb3793b },
  CUCUMBER: { dish: 'Cucumber Coins', emoji: '🥒', color: 0x6bb35e },
  DUMPLING: { dish: 'Dragon Dumplings', emoji: '🥟', color: 0xe8d9b3 },
  MEATLOAF: { dish: 'Monster Meatloaf', emoji: '🍖', color: 0xa3653b },
  LEMONADE: { dish: 'Fizzy Lemonade', emoji: '🍹', color: 0xf2e35b },
  PINEAPPLE:{ dish: 'Pineapple Boats', emoji: '🍍', color: 0xf2c83b },
  // -- grade 5: morphology, irregular plurals --
  CHOCOLATE:{ dish: 'Chocolate Lava Cake', emoji: '🍫', color: 0x6b4226 },
  HAMBURGER:{ dish: 'Tower Hamburger', emoji: '🍔', color: 0xc9853b },
  MACARONI: { dish: 'Macaroni and Cheese', emoji: '🧀', color: 0xf2c83b },
  TOMATOES: { dish: 'Roasted Tomatoes', emoji: '🍅', color: 0xd9453a },
  POTATOES: { dish: 'Twice-Baked Potatoes', emoji: '🥔', color: 0xc9a25e },
  CHERRIES: { dish: 'Cherries Jubilee', emoji: '🍒', color: 0xc4304a },
  MANGOES:  { dish: 'Grilled Mangoes', emoji: '🥭', color: 0xf5a83b },
  LOAVES:   { dish: 'Golden Bread Loaves', emoji: '🍞', color: 0xd9a662 },
  SMOOTHIE: { dish: 'Galaxy Smoothie', emoji: '🥤', color: 0x9a5fb3 },
  MILKSHAKE:{ dish: 'Triple Milkshake', emoji: '🥤', color: 0xf2d5e0 },
  // -- grade 6: loan words, Greek/Latin-derived, hard morphology --
  SPAGHETTI:{ dish: 'Spaghetti Mountain', emoji: '🍝', color: 0xe8cf8a },
  ZUCCHINI: { dish: 'Zucchini Ribbons', emoji: '🥒', color: 0x6bb35e },
  BARBECUE: { dish: 'Barbecue Feast', emoji: '🍖', color: 0xa3432b },
  CASSEROLE:{ dish: 'Builder\'s Casserole', emoji: '🍲', color: 0xc9853b },
  GUACAMOLE:{ dish: 'Chunky Guacamole', emoji: '🥑', color: 0x8ab35e },
  ASPARAGUS:{ dish: 'Asparagus Spears', emoji: '🥬', color: 0x5f9b4f },
  ARTICHOKE:{ dish: 'Artichoke Dip', emoji: '🥬', color: 0x7a9b5e },
  CANTALOUPE:{ dish: 'Cantaloupe Cooler', emoji: '🍈', color: 0xf2b86b },
  INGREDIENT:{ dish: 'Mystery Ingredient Box', emoji: '📦', color: 0xb3935e },
  APPETIZER:{ dish: 'Appetizer Platter', emoji: '🍢', color: 0xd9914f },
  SEASONING:{ dish: 'Secret Seasoning Mix', emoji: '🧂', color: 0xe8e0cc },
  MOZZARELLA:{ dish: 'Mozzarella Sticks', emoji: '🧀', color: 0xf2ead9 },
};

// Three tiers per grade (easier → harder within the grade band).
const GRADE_TIERS = {
  0: [ // Kindergarten: letter names/sounds, simple CVC
    ['EGG', 'HAM', 'JAM', 'BUN', 'POT', 'PEA'],
    ['CUP', 'PAN', 'NUT', 'TEA', 'FIG', 'JUG', 'YAM'],
    ['CAKE', 'RICE', 'MILK', 'CORN', 'TACO', 'FISH'],
  ],
  1: [
    ['EGG', 'HAM', 'JAM', 'BUN', 'POT', 'NUT', 'PEA', 'TEA'],
    ['PIE', 'FISH', 'CHIP', 'CORN', 'MILK', 'PLUM', 'CRAB', 'CHOP'],
    ['RICE', 'CAKE', 'LIME', 'SOUP', 'TACO', 'BEAN', 'TOAST', 'GRAPE'],
  ],
  2: [
    ['RICE', 'CORN', 'MILK', 'CAKE', 'TACO', 'FISH', 'SOUP', 'BEAN'],
    ['APPLE', 'BREAD', 'ONION', 'MANGO', 'LEMON', 'GRAPE', 'TOAST', 'PEACH', 'HONEY', 'BERRY'],
    ['CARROT', 'TOMATO', 'CHEESE', 'BUTTER', 'GARLIC', 'BANANA', 'POTATO', 'PEPPER'],
  ],
  3: [
    ['CARROT', 'TOMATO', 'CHEESE', 'BUTTER', 'GARLIC', 'BANANA', 'POTATO', 'PEPPER'],
    ['PANCAKE', 'MEATBALL', 'POPCORN', 'OATMEAL', 'CUPCAKE', 'HOTDOG', 'PEANUT'],
    ['CHICKEN', 'PUMPKIN', 'NOODLES', 'MUSHROOM', 'SANDWICH', 'BROCCOLI', 'PRETZEL', 'WAFFLES'],
  ],
  4: [
    ['CHICKEN', 'PUMPKIN', 'NOODLES', 'SANDWICH', 'PRETZEL', 'WAFFLES', 'AVOCADO'],
    ['SPINACH', 'YOGURT', 'KETCHUP', 'MUSTARD', 'GRANOLA', 'PUDDING', 'COCONUT', 'CABBAGE'],
    ['BLUEBERRY', 'CINNAMON', 'CUCUMBER', 'DUMPLING', 'MEATLOAF', 'LEMONADE', 'PINEAPPLE'],
  ],
  5: [
    ['BLUEBERRY', 'CINNAMON', 'CUCUMBER', 'PINEAPPLE', 'CHOCOLATE', 'HAMBURGER', 'MACARONI'],
    ['TOMATOES', 'POTATOES', 'CHERRIES', 'MANGOES', 'LOAVES', 'SMOOTHIE', 'MILKSHAKE'],
    ['SPAGHETTI', 'ZUCCHINI', 'BARBECUE', 'CASSEROLE', 'GUACAMOLE'],
  ],
  6: [
    ['SPAGHETTI', 'ZUCCHINI', 'BARBECUE', 'CHOCOLATE', 'MACARONI', 'MILKSHAKE'],
    ['CASSEROLE', 'GUACAMOLE', 'ASPARAGUS', 'ARTICHOKE', 'APPETIZER', 'SEASONING'],
    ['CANTALOUPE', 'INGREDIENT', 'MOZZARELLA', 'CASSEROLE', 'GUACAMOLE', 'ASPARAGUS'],
  ],
};

export const GRADES = [0, 1, 2, 3, 4, 5, 6]; // 0 = Kindergarten

export function gradeLabel(grade) { return grade === 0 ? 'K' : String(grade); }

/** Difficulty parameters per grade. */
export function gradeParams(grade) {
  const g = Math.min(6, Math.max(0, grade));
  return {
    revealSeconds: g === 0 ? 5.0 : Math.max(2.0, 4.2 - g * 0.35), // word flash time
    glances: g === 0 ? 4 : g <= 2 ? 3 : 2,          // Chef's Glances per night
    baseCuts: g <= 2 ? 2 : g <= 4 ? 3 : 4,          // knife cuts per ingredient
    maxCuts: 4,
    indicatorSpeed: g === 0 ? 1.5 : 1.7 + g * 0.18, // cut-line speed
    waitChance: g === 0 ? 0.18 : 0.25 + g * 0.05,   // HOLD-call probability
    noCutChance: g <= 1 ? 0.15 : 0.22,              // send-it-whole probability
    orders: g <= 1 ? 3 : 4,                         // shorter nights for the youngest chefs
  };
}

/** Pick `count` orders: mostly current tier, one comfort word from a tier down. */
export function pickMenu(grade, tier, count = 4) {
  const tiers = GRADE_TIERS[Math.min(6, Math.max(0, grade))];
  const t = Math.min(tier, tiers.length - 1);
  const pool = [...new Set(tiers[t])];
  const easier = t > 0 ? [...new Set(tiers[t - 1])] : null;
  const picks = [];
  for (let i = 0; i < count; i++) {
    const fromEasier = easier && i === count - 2; // one comfort word near the end
    const src = fromEasier ? easier : pool;
    const idx = Math.floor(Math.random() * src.length);
    const word = src.splice(idx, 1)[0] ?? pool[Math.floor(Math.random() * pool.length)];
    picks.push({ word, ...W[word] });
  }
  return picks;
}

export const QWERTY_ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

// Every decoration is a real kitchen upgrade — the restaurant the player
// builds literally makes them a stronger chef. Perk types:
//   glance      +N Chef's Glances per night
//   reveal      +N seconds of word-flash time
//   shield      the Kitchen Cat protects a spelling streak once per night
//   perfect     +N trust on every PERFECT cut
//   tip         +N trust tip from every served customer
//   streak      +N trust on every streak celebration
//   zone        green cut zone N% wider
//   slow        cut line N% slower
export const DECORATIONS = [
  { emoji: '🪴', name: 'Potted Plant',   perk: { type: 'glance', v: 1 },    blurb: '+1 Chef\'s Glance each night' },
  { emoji: '🔮', name: 'Magic Orb',      perk: { type: 'glance', v: 1 },    blurb: '+1 Chef\'s Glance each night' },
  { emoji: '🕰️', name: 'Old Clock',      perk: { type: 'reveal', v: 0.7 },  blurb: 'Words stay on screen longer' },
  { emoji: '🛋️', name: 'Cozy Couch',     perk: { type: 'reveal', v: 0.4 },  blurb: 'Words stay a little longer' },
  { emoji: '📚', name: 'Cookbook Shelf', perk: { type: 'reveal', v: 0.5 },  blurb: 'Words stay a little longer' },
  { emoji: '🐈', name: 'Kitchen Cat',    perk: { type: 'shield', v: 1 },    blurb: 'Protects your streak once a night' },
  { emoji: '🏆', name: 'Trophy',         perk: { type: 'perfect', v: 2 },   blurb: '+2 trust on PERFECT cuts' },
  { emoji: '🗿', name: 'Stone Statue',   perk: { type: 'perfect', v: 1 },   blurb: '+1 trust on PERFECT cuts' },
  { emoji: '🧸', name: 'Mascot Bear',    perk: { type: 'tip', v: 1 },       blurb: 'Customers tip +1 trust' },
  { emoji: '🪑', name: 'Fancy Chair',    perk: { type: 'tip', v: 1 },       blurb: 'Customers tip +1 trust' },
  { emoji: '🎸', name: 'Wall Guitar',    perk: { type: 'streak', v: 2 },    blurb: '+2 trust on streaks' },
  { emoji: '🖼️', name: 'Painting',       perk: { type: 'streak', v: 1 },    blurb: '+1 trust on streaks' },
  { emoji: '🪔', name: 'Lantern',        perk: { type: 'zone', v: 0.12 },   blurb: 'Green cut zone 12% wider' },
  { emoji: '🌵', name: 'Cactus',         perk: { type: 'zone', v: 0.08 },   blurb: 'Green cut zone 8% wider' },
  { emoji: '🐠', name: 'Fish Tank',      perk: { type: 'slow', v: 0.07 },   blurb: 'Cut line 7% calmer' },
  { emoji: '🎍', name: 'Bamboo',         perk: { type: 'slow', v: 0.05 },   blurb: 'Cut line 5% calmer' },
];

const DECO_BY_EMOJI = Object.fromEntries(DECORATIONS.map((d) => [d.emoji, d]));

/** Aggregate the perks of every placed decoration into one effects object. */
export function computePerks(placed) {
  const fx = { glance: 0, reveal: 0, shield: 0, perfect: 0, tip: 0, streak: 0, zone: 0, slow: 0 };
  for (const p of placed) {
    const deco = DECO_BY_EMOJI[p.emoji];
    if (deco) fx[deco.perk.type] += deco.perk.v;
  }
  // keep the timing perks from trivialising the knife game
  fx.zone = Math.min(fx.zone, 0.35);
  fx.slow = Math.min(fx.slow, 0.25);
  return fx;
}

/** Human-readable lines for the active restaurant powers. */
export function describePerks(fx) {
  const lines = [];
  if (fx.glance) lines.push(`👁 +${fx.glance} Chef's Glance${fx.glance > 1 ? 's' : ''}`);
  if (fx.reveal) lines.push(`🕰 +${fx.reveal.toFixed(1)}s word time`);
  if (fx.shield) lines.push(`🐈 streak protection x${fx.shield}`);
  if (fx.perfect) lines.push(`🏆 +${fx.perfect} on perfect cuts`);
  if (fx.tip) lines.push(`🧸 +${fx.tip} customer tips`);
  if (fx.streak) lines.push(`🎸 +${fx.streak} streak trust`);
  if (fx.zone) lines.push(`🪔 cut zone +${Math.round(fx.zone * 100)}%`);
  if (fx.slow) lines.push(`🐠 cut line ${Math.round(fx.slow * 100)}% calmer`);
  return lines;
}

export function pickDecoChoices(owned) {
  const ownedEmojis = new Set(owned.map((d) => d.emoji));
  const available = DECORATIONS.filter((d) => !ownedEmojis.has(d.emoji));
  const pool = available.length >= 3 ? available : DECORATIONS;
  const picks = [];
  const copy = [...pool];
  while (picks.length < 3 && copy.length) {
    picks.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
  }
  return picks;
}

// Encouragement lines from Chef Gordon Blocksay (always kind — he's the nice
// version of a celebrity chef).
export const PRAISE_SPELLING = [
  'Spelled like a true chef!',
  'Beautiful ticket! Send it!',
  'That spelling is sharper than my best knife!',
  'Perfect! The kitchen runs on chefs like you!',
];
export const PRAISE_WITHHOLD = [
  'Perfect restraint, chef! A great chef knows when NOT to cut.',
  'That is knife discipline! Outstanding!',
  'You waited. THAT is what makes a master.',
];
export const GENTLE_RETRY = [
  "So close! Let's look at that word one more time.",
  'Almost! Every chef checks the ticket twice.',
  'Good try! Watch the word carefully now…',
];
