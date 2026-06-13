// Minecraft-style pixel chef avatars and restaurant customers,
// drawn in code from pixel-art templates — no image assets.

const CHEF_TEMPLATE = [
  '....WWWWWWWW....',
  '...WWWWWWWWWW...',
  '...WWWWWWWWWW...',
  '...wwwwwwwwww...',
  '...hhSSSSSShh...',
  '...hSSSSSSSSh...',
  '..LhSESSSSEShL..',
  '..L.SSSSSSSS.L..',
  '..L.SSsMMsSS.L..',
  '..L..SSSSSS..L..',
  '...WWWWWWWWWW...',
  '..WWWWWWWWWWWW..',
  '..WWBWWWWWWBWW..',
  '..WWWWWWWWWWWW..',
  '..SSWAAAAAAWSS..',
  '....AAAAAAAA....',
  '....AAAAAAAA....',
  '....AAAAAAAA....',
  '...DDDD..DDDD...',
  '...DDDD..DDDD...',
];

const CHEFS = {
  m: {
    name: 'CHEF MAX',
    colors: {
      W: '#f4f4f4', w: '#d8d8d8', S: '#e8b88a', s: '#cf9c6b',
      h: '#5a3a1e', L: null, E: '#22232b', M: '#8a3328',
      B: '#aab3c8', A: '#6f7a8c', D: '#3a3f4d',
    },
  },
  f: {
    name: 'CHEF MAYA',
    colors: {
      W: '#f4f4f4', w: '#d8d8d8', S: '#c98e62', s: '#a8744e',
      h: '#2a2118', L: '#2a2118', E: '#22232b', M: '#8a3328',
      B: '#e8a4b8', A: '#b34a5e', D: '#3a3f4d',
    },
  },
};

const CUSTOMER_TEMPLATE = [
  '...HHHHHHHHHH...',
  '...HHHHHHHHHH...',
  '...HhSSSSSShH...',
  '...hSSSSSSSSh...',
  '...SSESSSSESS...',
  '...SSSSSSSSSS...',
  '...SSsMMMMsSS...',
  '....SSSSSSSS....',
  '...TTTTTTTTTT...',
  '..TTTTTTTTTTTT..',
  '..TTTTTTTTTTTT..',
  '..SSTTTTTTTTSS..',
];

const CUSTOMER_SKINS = ['#e8b88a', '#c98e62', '#a8744e', '#f2cfa4'];
const CUSTOMER_HAIR = ['#5a3a1e', '#2a2118', '#b3793b', '#7a7f8c', '#8a3328'];
const CUSTOMER_SHIRTS = ['#5f9b4f', '#5ab2e8', '#d9794f', '#9a5fb3', '#f2c83b', '#c4304a'];

export const CUSTOMER_NAMES = [
  'MINER MO', 'BUILDER BEA', 'REDSTONE REX', 'PIXEL PIA',
  'CRAFTER CAL', 'BLOCK BETTY', 'TORCH TOM', 'EMERALD EM',
];

export const CUSTOMER_REACTIONS = [
  'Five stars! Best in Blockworld!',
  "I'm telling ALL my friends!",
  'Chef\'s kiss! Incredible!',
  'I\'m coming back tomorrow!',
  'Now THAT is cooking!',
];

function renderTemplate(template, colors, scale) {
  const h = template.length, w = template[0].length;
  const cv = document.createElement('canvas');
  cv.width = w * scale;
  cv.height = h * scale;
  const ctx = cv.getContext('2d');
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const col = colors[template[y][x]];
      if (!col) continue;
      ctx.fillStyle = col;
      ctx.fillRect(x * scale, y * scale, scale, scale);
      // subtle top-light voxel shading
      ctx.fillStyle = 'rgba(255,255,255,0.10)';
      ctx.fillRect(x * scale, y * scale, scale, Math.max(1, scale / 4));
    }
  }
  return cv;
}

// ---------- animated spelling-screen chef ----------
// Pose frames are the base chef template with a few rows swapped out.
// think: hand on chin / at temple (alternating) — plus thought dots in CSS
// fistpump: arm out, then fist punched high with a big grin
// facepalm: palm over the eyes, then sliding down the cheek

function withRows(overrides) {
  const t = [...CHEF_TEMPLATE];
  for (const [i, row] of Object.entries(overrides)) t[Number(i)] = row;
  return t;
}

const POSE_TEMPLATES = {
  think: [
    withRows({
      9:  '..L..SSSSSSSS...',
      10: '...WWWWWWWWWWW..',
      11: '..WWWWWWWWWWWWW.',
      14: '..SSWAAAAAAW....',
    }),
    withRows({
      6:  '..LhSESSSSESSS..',
      7:  '..L.SSSSSSSSWW..',
      10: '...WWWWWWWWWWW..',
      14: '..SSWAAAAAAW....',
    }),
  ],
  fistpump: [
    withRows({
      8:  '..L.SSsMMsSS.LS.',
      9:  '..L..SSSSSS..WW.',
      10: '...WWWWWWWWWWW..',
      14: '..SSWAAAAAAW....',
    }),
    withRows({
      2:  '...WWWWWWWWWWS..',
      3:  '...wwwwwwwwwwW..',
      4:  '...hhSSSSSShhW..',
      5:  '...hSSSSSSSShW..',
      6:  '..LhSESSSSEShW..',
      7:  '..L.SSSSSSSS.W..',
      8:  '..L.sMMMMMMs.W..',
      14: '..SSWAAAAAAW....',
    }),
  ],
  facepalm: [
    withRows({
      5:  '...hSsssssSSh...',
      6:  '..LhsssssssShL..',
      7:  '..L.SSSSSWWW.L..',
      8:  '..L.SSssssSS.L..',
      14: '..SSWAAAAAAW....',
    }),
    withRows({
      7:  '..L.SsssssSSWL..',
      8:  '..L.SSssssSS.L..',
      14: '..SSWAAAAAAW....',
    }),
  ],
};

export { POSE_TEMPLATES }; // exported for validation tests

const POSE_TIMING = { think: 0.7, fistpump: 0.24, facepalm: 0.55 };

/**
 * An animated chef widget for the spelling screen.
 * Returns { node, setPose(name), update(dt) }.
 */
export function createChefSprite(kind, scale = 8) {
  const frames = {};
  for (const [pose, templates] of Object.entries(POSE_TEMPLATES)) {
    frames[pose] = templates.map((t) =>
      renderTemplate(t, CHEFS[kind].colors, scale).toDataURL());
  }

  const node = document.createElement('div');
  node.className = 'spell-chef';
  const dots = document.createElement('div');
  dots.className = 'think-dots';
  dots.innerHTML = '<span>·</span><span>·</span><span>·</span>';
  const img = document.createElement('img');
  node.append(dots, img);

  const state = { pose: 'think', frame: 0, t: 0 };
  const show = () => { img.src = frames[state.pose][state.frame % frames[state.pose].length]; };

  const sprite = {
    node,
    setPose(pose) {
      if (!frames[pose] || state.pose === pose) return;
      state.pose = pose;
      state.frame = 0;
      state.t = 0;
      dots.style.visibility = pose === 'think' ? 'visible' : 'hidden';
      node.classList.toggle('celebrate', pose === 'fistpump');
      node.classList.toggle('slump', pose === 'facepalm');
      show();
    },
    update(dt) {
      state.t += dt;
      if (state.t >= POSE_TIMING[state.pose]) {
        state.t = 0;
        state.frame++;
        show();
      }
    },
  };
  show();
  return sprite;
}

const cache = new Map();

/** Returns a data-URL for the chef avatar ('m' | 'f'). */
export function chefImage(kind, scale = 8) {
  const key = `chef-${kind}-${scale}`;
  if (!cache.has(key)) {
    cache.set(key, renderTemplate(CHEF_TEMPLATE, CHEFS[kind].colors, scale).toDataURL());
  }
  return cache.get(key);
}

export function chefName(kind) { return CHEFS[kind].name; }

/** Returns { img, name } for a deterministic customer by seed. */
export function customerImage(seed, scale = 7) {
  const key = `cust-${seed}-${scale}`;
  if (!cache.has(key)) {
    const colors = {
      H: CUSTOMER_HAIR[seed % CUSTOMER_HAIR.length],
      h: CUSTOMER_HAIR[seed % CUSTOMER_HAIR.length],
      S: CUSTOMER_SKINS[seed % CUSTOMER_SKINS.length],
      s: '#00000022',
      E: '#22232b',
      M: '#8a3328',
      T: CUSTOMER_SHIRTS[seed % CUSTOMER_SHIRTS.length],
    };
    cache.set(key, renderTemplate(CUSTOMER_TEMPLATE, colors, scale).toDataURL());
  }
  return {
    img: cache.get(key),
    name: CUSTOMER_NAMES[seed % CUSTOMER_NAMES.length],
  };
}
