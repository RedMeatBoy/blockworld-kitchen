// Voxel food models: every dish is built from cubes so the FISH looks like a
// fish, the CARROT like a carrot, the CAKE like a cake. Builders return
// [{ x, y, z, c }] in integer grid coordinates (x = cutting axis, y up,
// y >= 0 sits on the board). The knife station turns them into Three.js cubes.

const dark = (c, f = 0.78) => {
  const r = Math.round(((c >> 16) & 255) * f);
  const g = Math.round(((c >> 8) & 255) * f);
  const b = Math.round((c & 255) * f);
  return (r << 16) | (g << 8) | b;
};

// checker shading so big shapes read as voxels
const shadeAt = (c, x, y, z) => ((x + y + z) % 2 === 0 ? c : dark(c, 0.86));

function sphere({ c, rx = 3, ry = 3, rz = 2, lift = 0, stem = null, eyes = false, crown = null, pit = null }) {
  const out = [];
  for (let x = -rx; x <= rx; x++) {
    for (let y = -ry; y <= ry; y++) {
      for (let z = -rz; z <= rz; z++) {
        if ((x / rx) ** 2 + (y / ry) ** 2 + (z / rz) ** 2 <= 1.05) {
          out.push({ x, y: y + ry + lift, z, c: shadeAt(c, x, y, z) });
        }
      }
    }
  }
  if (stem) {
    out.push({ x: 0, y: ry * 2 + lift + 1, z: 0, c: stem });
    out.push({ x: 1, y: ry * 2 + lift + 1, z: 0, c: 0x5f9b4f });
  }
  if (crown) {
    for (const [cx, cy] of [[-1, 1], [0, 2], [1, 1], [0, 1]]) {
      out.push({ x: cx, y: ry * 2 + lift + cy, z: 0, c: crown });
    }
  }
  if (eyes) {
    out.push({ x: -1, y: ry + 1 + lift, z: rz, c: 0x22232b });
    out.push({ x: 1, y: ry + 1 + lift, z: rz, c: 0x22232b });
  }
  if (pit) out.push({ x: 0, y: ry * 2 + lift, z: 0, c: pit });
  return out;
}

function tube({ c, len = 11, r = 1, taper = 0, top = null, curve = 0, kernels = false }) {
  const out = [];
  const half = Math.floor(len / 2);
  for (let x = -half; x <= half; x++) {
    const t = (x + half) / len;
    const radius = Math.max(0, Math.round(r - taper * t));
    const yOff = Math.round(curve * Math.sin(t * Math.PI));
    for (let y = -radius; y <= radius; y++) {
      for (let z = -radius; z <= radius; z++) {
        if (Math.abs(y) + Math.abs(z) <= radius + 1) {
          const col = kernels && (x + y) % 2 ? dark(c, 0.82) : shadeAt(c, x, y, z);
          out.push({ x, y: y + r + 1 + yOff, z, c: col });
        }
      }
    }
  }
  if (top) {
    // leafy top at the wide end
    for (const [dx, dy] of [[0, 1], [0, 2], [-1, 2], [1, 1]]) {
      out.push({ x: -half + dx, y: r * 2 + 1 + dy, z: 0, c: top });
    }
  }
  return out;
}

function loaf({ c, len = 9, h = 4, d = 3, crust = null }) {
  const out = [];
  const half = Math.floor(len / 2);
  const hd = Math.floor(d / 2);
  for (let x = -half; x <= half; x++) {
    for (let y = 0; y < h; y++) {
      for (let z = -hd; z <= hd; z++) {
        // round the top edges
        if (y === h - 1 && (Math.abs(x) === half || Math.abs(z) === hd)) continue;
        const col = crust && y === h - 1 ? crust : shadeAt(c, x, y, z);
        out.push({ x, y, z, c: col });
      }
    }
  }
  return out;
}

function wedge({ c, len = 9, h = 5, d = 3, holes = false }) {
  const out = [];
  const half = Math.floor(len / 2);
  const hd = Math.floor(d / 2);
  for (let x = -half; x <= half; x++) {
    const colH = Math.max(1, Math.round(h * (1 - (x + half) / len)));
    for (let y = 0; y < colH; y++) {
      for (let z = -hd; z <= hd; z++) {
        const hole = holes && (x * 7 + y * 5 + z * 3) % 11 === 0;
        out.push({ x, y, z, c: hole ? dark(c, 0.7) : shadeAt(c, x, y, z) });
      }
    }
  }
  return out;
}

function tiers({ base, frosting, levels = [[5, 2], [3, 2]], cherry = true }) {
  const out = [];
  let y = 0;
  for (const [r, h] of levels) {
    for (let x = -r; x <= r; x++) {
      for (let yy = 0; yy < h; yy++) {
        for (let z = -Math.min(r, 2); z <= Math.min(r, 2); z++) {
          const col = yy === h - 1 ? frosting : shadeAt(base, x, yy, z);
          out.push({ x, y: y + yy, z, c: col });
        }
      }
    }
    y += h;
  }
  if (cherry) out.push({ x: 0, y, z: 0, c: 0xc4304a });
  return out;
}

function stack({ c, discs = 3, r = 4, topper = 0xf2dc8a }) {
  const out = [];
  for (let i = 0; i < discs; i++) {
    const col = i % 2 ? dark(c, 0.88) : c;
    for (let x = -r; x <= r; x++) {
      for (let z = -2; z <= 2; z++) {
        if (Math.abs(x) === r && Math.abs(z) === 2) continue;
        out.push({ x, y: i, z, c: shadeAt(col, x, i, z) });
      }
    }
  }
  out.push({ x: 0, y: discs, z: 0, c: topper });
  return out;
}

function bowl({ contents, bowlC = 0x4a5a8a, bits = null }) {
  const out = [];
  for (let x = -4; x <= 4; x++) {
    for (let z = -2; z <= 2; z++) {
      out.push({ x, y: 0, z, c: shadeAt(bowlC, x, 0, z) });
      if (Math.abs(x) >= 3 || Math.abs(z) === 2) out.push({ x, y: 1, z, c: shadeAt(bowlC, x, 1, z) });
      else out.push({ x, y: 1, z, c: shadeAt(contents, x, 1, z) });
      if (Math.abs(x) === 4 || (Math.abs(x) >= 3 && Math.abs(z) === 2)) {
        out.push({ x, y: 2, z, c: shadeAt(bowlC, x, 2, z) });
      } else if (Math.abs(x) <= 2 && Math.abs(z) <= 1) {
        out.push({ x, y: 2, z, c: shadeAt(contents, x, 2, z) });
      }
    }
  }
  if (bits) {
    for (const [bx, bz] of [[-1, 0], [1, 1], [0, -1], [2, 0]]) {
      out.push({ x: bx, y: 3, z: bz, c: bits });
    }
  }
  return out;
}

function layers({ list, len = 9, d = 3 }) {
  // sandwich / burger: list of [color, height]
  const out = [];
  const half = Math.floor(len / 2);
  const hd = Math.floor(d / 2);
  let y = 0;
  for (const [c, h] of list) {
    for (let x = -half; x <= half; x++) {
      for (let yy = 0; yy < h; yy++) {
        for (let z = -hd; z <= hd; z++) {
          if (y + yy === 0 && Math.abs(x) === half) continue;
          out.push({ x, y: y + yy, z, c: shadeAt(c, x, yy, z) });
        }
      }
    }
    y += h;
  }
  return out;
}

function drumstick({ c }) {
  const out = [];
  // meaty end
  out.push(...sphere({ c, rx: 3, ry: 3, rz: 2 }).map((q) => ({ ...q, x: q.x - 2 })));
  // bone
  for (let x = 2; x <= 5; x++) out.push({ x, y: 3, z: 0, c: 0xf2ede0 });
  out.push({ x: 6, y: 4, z: 0, c: 0xf2ede0 });
  out.push({ x: 6, y: 2, z: 0, c: 0xf2ede0 });
  return out;
}

function cluster({ c, n = 7, small = 1 }) {
  const out = [];
  const spots = [[-3, 0, 0], [-1, 0, 1], [1, 0, 0], [3, 0, -1], [-2, 2, 0], [0, 2, 1], [2, 2, 0]];
  for (let i = 0; i < Math.min(n, spots.length); i++) {
    const [sx, sy, sz] = spots[i];
    for (let x = -small; x <= small; x++) {
      for (let y = -small; y <= small; y++) {
        for (let z = -small; z <= small; z++) {
          if (Math.abs(x) + Math.abs(y) + Math.abs(z) <= small + 1) {
            out.push({ x: sx + x, y: sy + y + small, z: sz + z, c: shadeAt(i % 2 ? dark(c, 0.85) : c, x, y, z) });
          }
        }
      }
    }
  }
  return out;
}

function mushroom({ cap, stem = 0xf2ede0 }) {
  const out = [];
  for (let x = -1; x <= 1; x++) for (let y = 0; y < 3; y++) out.push({ x, y, z: 0, c: shadeAt(stem, x, y, 0) });
  for (let x = -3; x <= 3; x++) {
    for (let z = -2; z <= 2; z++) {
      if (Math.abs(x) === 3 && Math.abs(z) === 2) continue;
      out.push({ x, y: 3, z, c: shadeAt(cap, x, 3, z) });
      if (Math.abs(x) <= 2 && Math.abs(z) <= 1) out.push({ x, y: 4, z, c: shadeAt(cap, x, 4, z) });
    }
  }
  out.push({ x: -1, y: 4, z: 2, c: 0xf2ede0 }); // spots
  out.push({ x: 2, y: 4, z: 0, c: 0xf2ede0 });
  return out;
}

function cup({ c, drink = null }) {
  const out = [];
  const rim = dark(c, 0.7);
  for (let x = -2; x <= 2; x++) {
    for (let y = 0; y < 5; y++) {
      for (let z = -2; z <= 2; z++) {
        const wall = Math.abs(x) === 2 || Math.abs(z) === 2 || y === 0;
        if (wall) {
          // contrasting rim + base bands so it reads as a cup, not a box
          const col = y === 4 || y === 0 ? rim : shadeAt(c, x, y, z);
          out.push({ x, y, z, c: col });
        } else if (y === 4 && drink) {
          out.push({ x, y, z, c: drink });
        }
      }
    }
  }
  // straw
  out.push({ x: 1, y: 5, z: 0, c: 0xd9453a });
  out.push({ x: 1, y: 6, z: 0, c: 0xd9453a });
  out.push({ x: 3, y: 2, z: 0, c: rim });
  out.push({ x: 3, y: 3, z: 0, c: rim }); // handle
  return out;
}

function fish({ c }) {
  const out = [];
  const accent = dark(c, 0.72);
  // body: tapers toward the tail
  for (let x = -4; x <= 3; x++) {
    const t = (x + 4) / 8;
    const r = Math.round(2.4 * Math.sin(Math.min(Math.PI, (1 - t) * Math.PI * 0.85 + 0.45)));
    for (let y = -r; y <= r; y++) {
      for (let z = -1; z <= 1; z++) {
        if (Math.abs(z) <= Math.max(0, r - Math.abs(y))) {
          out.push({ x, y: y + 3, z, c: shadeAt(c, x, y, z) });
        }
      }
    }
  }
  // tail fin
  for (let i = 0; i <= 2; i++) {
    out.push({ x: 4 + i, y: 3 + i, z: 0, c: accent });
    out.push({ x: 4 + i, y: 3 - i, z: 0, c: accent });
  }
  out.push({ x: 4, y: 3, z: 0, c: accent });
  // top + side fins
  out.push({ x: -1, y: 6, z: 0, c: accent });
  out.push({ x: 0, y: 6, z: 0, c: accent });
  out.push({ x: 0, y: 3, z: 2, c: accent });
  // eye + mouth on the camera side
  out.push({ x: -3, y: 4, z: 2, c: 0x22232b });
  out.push({ x: -4, y: 3, z: 1, c: accent });
  return out;
}

function taco() {
  const out = [];
  const shell = 0xe8c25a;
  for (let x = -4; x <= 4; x++) {
    const h = 5 - Math.abs(Math.round(x * 0.9));
    for (let y = 0; y < Math.max(1, h); y++) {
      out.push({ x, y, z: -2, c: shadeAt(shell, x, y, -2) });
      out.push({ x, y, z: 2, c: shadeAt(shell, x, y, 2) });
      if (y === 0) for (let z = -1; z <= 1; z++) out.push({ x, y, z, c: shadeAt(shell, x, y, z) });
    }
  }
  // filling peeking out the top
  const fillings = [0x5f9b4f, 0xd9453a, 0xf2c83b, 0xa3543b];
  for (let x = -3; x <= 3; x++) {
    for (let z = -1; z <= 1; z++) {
      out.push({ x, y: 2 + ((x + z) % 2 ? 1 : 0), z, c: fillings[(x + z + 6) % fillings.length] });
    }
  }
  return out;
}

function jar({ c, lid = 0x9aa3b3 }) {
  const out = [];
  for (let x = -2; x <= 2; x++) {
    for (let y = 0; y < 4; y++) {
      for (let z = -2; z <= 2; z++) {
        if (Math.abs(x) === 2 && Math.abs(z) === 2) continue;
        out.push({ x, y, z, c: shadeAt(c, x, y, z) });
      }
    }
  }
  for (let x = -1; x <= 1; x++) for (let z = -1; z <= 1; z++) out.push({ x, y: 4, z, c: lid });
  return out;
}

function hotdog() {
  const out = [];
  out.push(...tube({ c: 0xe0b36a, len: 9, r: 1 }));                       // bun
  for (let x = -4; x <= 4; x++) out.push({ x, y: 4, z: 0, c: shadeAt(0xa3543b, x, 4, 0) }); // sausage
  for (let x = -3; x <= 3; x += 2) out.push({ x, y: 5, z: 0, c: 0xf2c83b }); // mustard zigzag
  return out;
}

function peanut({ c = 0xc9925e }) {
  const out = [];
  out.push(...sphere({ c, rx: 2, ry: 2, rz: 2 }).map((q) => ({ ...q, x: q.x - 2 })));
  out.push(...sphere({ c, rx: 2, ry: 2, rz: 2 }).map((q) => ({ ...q, x: q.x + 2 })));
  return out;
}


function eyeball({ iris = 0x5ab2e8 }) {
  const out = sphere({ c: 0xf6f3ec, rx: 3, ry: 3, rz: 2 });
  // iris + pupil + a couple of red veins on the camera side
  out.push({ x: 0, y: 4, z: 2, c: iris });
  out.push({ x: -1, y: 4, z: 2, c: iris });
  out.push({ x: 1, y: 4, z: 2, c: iris });
  out.push({ x: 0, y: 3, z: 2, c: iris });
  out.push({ x: 0, y: 4, z: 3, c: 0x22232b }); // pupil pops out a touch
  out.push({ x: 2, y: 5, z: 1, c: 0xd9453a });
  out.push({ x: -2, y: 2, z: 1, c: 0xd9453a });
  return out;
}

function worm({ c }) {
  // a fat wiggly gummy worm along the cut axis
  const out = [];
  for (let x = -5; x <= 5; x++) {
    const y = 1 + Math.round(1.4 * Math.sin(x * 0.9));
    for (const [dy, dz] of [[0, 0], [1, 0], [0, 1], [0, -1]]) {
      out.push({ x, y: y + dy, z: dz, c: shadeAt((x + 5) % 4 < 2 ? c : dark(c, 0.7), x, y, dz) });
    }
  }
  out.push({ x: -5, y: 3, z: 1, c: 0x22232b }); // eye
  return out;
}

function tentacle({ c }) {
  // tapered arm with suckers down the underside
  const out = [];
  for (let x = -5; x <= 5; x++) {
    const t = (x + 5) / 11;
    const r = Math.max(0, Math.round(2.2 * (1 - t)));
    for (let y = -r; y <= r; y++) {
      for (let z = -r; z <= r; z++) {
        if (Math.abs(y) + Math.abs(z) <= r + 1) out.push({ x, y: y + 3, z, c: shadeAt(c, x, y, z) });
      }
    }
    if (x % 2 === 0 && r > 0) out.push({ x, y: 3 - r, z: 0, c: 0xf2d5e0 }); // sucker
  }
  return out;
}

// ---------- word → model ----------

const M = {
  // fish & friends
  FISH: () => fish({ c: 0x7fb6d9 }),
  CRAB: () => sphere({ c: 0xe8744f, rx: 3, ry: 2, rz: 2, eyes: true }),
  // round produce
  APPLE:  () => sphere({ c: 0xd94f3d, stem: 0x5a3a1e }),
  TOMATO: () => sphere({ c: 0xd9453a, stem: 0x5f9b4f }),
  PEACH:  () => sphere({ c: 0xf5a86b, stem: 0x5a3a1e }),
  PLUM:   () => sphere({ c: 0x9a5fb3, stem: 0x5a3a1e }),
  FIG:    () => sphere({ c: 0x7a4fb3, rx: 2, ry: 3, rz: 2, stem: 0x5a3a1e }),
  ONION:  () => sphere({ c: 0xd9c7a0, stem: 0x5f9b4f }),
  GARLIC: () => sphere({ c: 0xe8e0cc, rx: 3, ry: 2, rz: 2, stem: 0x9bc96b }),
  POTATO: () => sphere({ c: 0xc9a25e, rx: 4, ry: 2, rz: 2 }),
  YAM:    () => sphere({ c: 0xb3653b, rx: 4, ry: 2, rz: 2 }),
  COCONUT:() => sphere({ c: 0x8a5f38, rx: 3, ry: 3, rz: 2, eyes: true }),
  EGG:    () => sphere({ c: 0xf6f3ec, rx: 2, ry: 3, rz: 2 }),
  NUT:    () => sphere({ c: 0xc9925e, rx: 2, ry: 2, rz: 2 }),
  LEMON:  () => sphere({ c: 0xf2e35b, rx: 4, ry: 2, rz: 2 }),
  LIME:   () => sphere({ c: 0xa3d94f, rx: 3, ry: 2, rz: 2 }),
  MANGO:  () => sphere({ c: 0xf5a83b, rx: 4, ry: 3, rz: 2 }),
  BUN:    () => sphere({ c: 0xe0b36a, rx: 3, ry: 2, rz: 2 }),
  DUMPLING:()=> sphere({ c: 0xe8d9b3, rx: 3, ry: 2, rz: 2, stem: 0xd9c7a0 }),
  AVOCADO:() => sphere({ c: 0x8ab35e, rx: 3, ry: 3, rz: 2, pit: 0x6b4226 }),
  CANTALOUPE:()=> sphere({ c: 0xe8d9b3, rx: 3, ry: 3, rz: 2 }),
  PINEAPPLE:()=> sphere({ c: 0xf2c83b, rx: 2, ry: 4, rz: 2, crown: 0x5f9b4f }),
  PUMPKIN:() => sphere({ c: 0xe8893b, rx: 4, ry: 3, rz: 3, stem: 0x5a3a1e }),
  CABBAGE:() => sphere({ c: 0x9bc96b, rx: 3, ry: 3, rz: 2 }),
  SPINACH:() => sphere({ c: 0x4f9b3f, rx: 4, ry: 2, rz: 2 }),
  ARTICHOKE:()=> sphere({ c: 0x7a9b5e, rx: 3, ry: 3, rz: 2, crown: 0x5f9b4f }),
  CINNAMON:()=> sphere({ c: 0xb3793b, rx: 3, ry: 2, rz: 2, stem: 0x8a5f38 }),
  // clusters
  GRAPE:    () => cluster({ c: 0x8a4fb3 }),
  BERRY:    () => cluster({ c: 0x6b4fb3 }),
  BLUEBERRY:() => cluster({ c: 0x5f6bd9 }),
  CHERRY:   () => cluster({ c: 0xc4304a, n: 4 }),
  PEA:      () => cluster({ c: 0x7fc96b, n: 5 }),
  BEAN:     () => tube({ c: 0xa3653b, len: 7, r: 1, curve: 1 }),
  MEATBALL: () => cluster({ c: 0xa3543b }),
  POPCORN:  () => bowl({ contents: 0xf2efe4, bowlC: 0xd9453a, bits: 0xf2dc8a }),
  PEANUT:   () => peanut({}),
  // long produce
  CARROT:   () => tube({ c: 0xe8843b, len: 11, r: 2, taper: 2, top: 0x5f9b4f }),
  CUCUMBER: () => tube({ c: 0x6bb35e, len: 11, r: 1 }),
  ZUCCHINI: () => tube({ c: 0x5f9b4f, len: 11, r: 1, top: 0x4a7a3a }),
  ASPARAGUS:() => tube({ c: 0x5f9b4f, len: 11, r: 1, taper: 1 }),
  CORN:     () => tube({ c: 0xf5d33b, len: 11, r: 1, kernels: true, top: 0x9bc96b }),
  BANANA:   () => tube({ c: 0xf2d53b, len: 11, r: 1, curve: 2 }),
  PEPPER:   () => tube({ c: 0x5fb33b, len: 9, r: 2, taper: 1, top: 0x4a7a3a }),
  // loaves & blocks
  BREAD:  () => loaf({ c: 0xf2dc8a, crust: 0xd9a662 }),
  TOAST:  () => loaf({ c: 0xe8c25a, h: 3, crust: 0xb3793b }),
  HAM:    () => loaf({ c: 0xe89aa4, crust: 0xd97a8a }),
  MEATLOAF:()=> loaf({ c: 0xa3653b, crust: 0x8a4326 }),
  BUTTER: () => loaf({ c: 0xf2dc8a, len: 7, h: 3 }),
  MOZZARELLA:()=> loaf({ c: 0xf2ead9, len: 7, h: 3 }),
  CHOCOLATE:()=> loaf({ c: 0x6b4226, h: 2, len: 9 }),
  PRETZEL:() => loaf({ c: 0xb37a3b, h: 3, crust: 0x8a5f38 }),
  CHIP:   () => loaf({ c: 0xf2c84b, h: 2 }),
  RICE:   () => sphere({ c: 0xf2efe4, rx: 4, ry: 2, rz: 3 }),
  INGREDIENT:()=> loaf({ c: 0xb3935e, h: 5, len: 7, crust: 0x8a6f42 }),
  // cheese
  CHEESE: () => wedge({ c: 0xf2c83b, holes: true }),
  // cakes & stacks
  CAKE:    () => tiers({ base: 0xf2b8d0, frosting: 0xf6f3ec }),
  CUPCAKE: () => tiers({ base: 0xe89ac4, frosting: 0xf6f3ec, levels: [[3, 2], [2, 1]] }),
  PIE:     () => tiers({ base: 0xd9913b, frosting: 0xe8c25a, levels: [[5, 2]], cherry: false }),
  PANCAKE: () => stack({ c: 0xe8b45e }),
  WAFFLE:  () => stack({ c: 0xdfae55 }),
  SANDWICH:() => layers({ list: [[0xd9a662, 1], [0x5f9b4f, 1], [0xd9453a, 1], [0xf2c83b, 1], [0xd9a662, 1]] }),
  HAMBURGER:()=> layers({ list: [[0xe0b36a, 1], [0x6b4226, 1], [0xf2c83b, 1], [0x5f9b4f, 1], [0xe0b36a, 2]], len: 7 }),
  HOTDOG:  () => hotdog(),
  TACO:    () => taco(),
  // bowls
  SOUP:     () => bowl({ contents: 0xd9794f }),
  NOODLE:   () => bowl({ contents: 0xe8cf8a, bits: 0xd9453a }),
  SPAGHETTI:() => bowl({ contents: 0xe8cf8a, bits: 0xa3543b }),
  MACARONI: () => bowl({ contents: 0xf2c83b }),
  OATMEAL:  () => bowl({ contents: 0xd9b27a, bits: 0x6b4fb3 }),
  GRANOLA:  () => bowl({ contents: 0xc9a25e, bits: 0x6b4fb3 }),
  PUDDING:  () => bowl({ contents: 0x8a5a3b }),
  CASSEROLE:() => bowl({ contents: 0xc9853b, bowlC: 0x8a3328, bits: 0xf2c83b }),
  GUACAMOLE:() => bowl({ contents: 0x8ab35e, bowlC: 0x4a3320 }),
  CHOP:     () => bowl({ contents: 0x7fc96b, bits: 0xd9453a }),
  APPETIZER:() => bowl({ contents: 0xd9914f, bowlC: 0xf2ede0, bits: 0x5f9b4f }),
  // mushrooms & trees
  MUSHROOM: () => mushroom({ cap: 0xc98a6b }),
  BROCCOLI: () => mushroom({ cap: 0x4f9b3f, stem: 0x9bc96b }),
  // drinks & jars
  MILK:     () => cup({ c: 0x9ad4f0, drink: 0xf6f3ec }),
  TEA:      () => cup({ c: 0xe8e0cc, drink: 0x8fbf6b }),
  CUP:      () => cup({ c: 0xd9453a, drink: 0x8a5a3b }),
  JUG:      () => cup({ c: 0xe8843b, drink: 0xf5a83b }),
  LEMONADE: () => cup({ c: 0xf2e35b, drink: 0xf2efe4 }),
  SMOOTHIE: () => cup({ c: 0x9a5fb3, drink: 0xe89ac4 }),
  MILKSHAKE:() => cup({ c: 0xe89ac4, drink: 0xf6f3ec }),
  YOGURT:   () => cup({ c: 0x9a5fb3, drink: 0xf6f3ec }),
  JAM:      () => jar({ c: 0x9a4fb3 }),
  HONEY:    () => jar({ c: 0xf2b53b, lid: 0xd9a662 }),
  KETCHUP:  () => jar({ c: 0xd9453a }),
  MUSTARD:  () => jar({ c: 0xe8c23b }),
  SEASONING:() => jar({ c: 0xe8e0cc, lid: 0xd9453a }),
  POT:      () => bowl({ contents: 0xb35f3b, bowlC: 0x707a8c }),
  PAN:      () => bowl({ contents: 0xf7e08a, bowlC: 0x3a3f4d }),
  // meat
  CHICKEN:  () => drumstick({ c: 0xd9924f }),
  BARBECUE: () => drumstick({ c: 0xa3432b }),
  // -- expansion pack --
  COD:    () => fish({ c: 0x9ab8c9 }),
  TUNA:   () => fish({ c: 0x7fb6d9 }),
  SALMON: () => fish({ c: 0xf5a86b }),
  RIB:    () => loaf({ c: 0xa3432b, h: 3, crust: 0x8a3328 }),
  COB:    () => tube({ c: 0xf5d33b, len: 11, r: 1, kernels: true, top: 0x9bc96b }),
  KIWI:   () => sphere({ c: 0x8ab35e, rx: 3, ry: 2, rz: 2 }),
  PEAR:   () => sphere({ c: 0xa3d94f, rx: 2, ry: 3, rz: 2, stem: 0x5a3a1e }),
  MELON:  () => sphere({ c: 0xa3d98f, rx: 4, ry: 3, rz: 3 }),
  TURNIP: () => sphere({ c: 0xe8d9e8, rx: 3, ry: 2, rz: 2, stem: 0x9bc96b }),
  RADISH: () => sphere({ c: 0xc4304a, rx: 2, ry: 2, rz: 2, stem: 0x5f9b4f }),
  STRAWBERRY: () => sphere({ c: 0xd93a4a, rx: 3, ry: 3, rz: 2, crown: 0x5f9b4f }),
  EGGPLANT:   () => sphere({ c: 0x6b3a8a, rx: 4, ry: 2, rz: 2, stem: 0x5f9b4f }),
  OLIVE:     () => cluster({ c: 0x7a9b5e, n: 5 }),
  SHRIMP:    () => cluster({ c: 0xf5a86b, n: 5 }),
  RASPBERRY: () => cluster({ c: 0xc4306b }),
  CRANBERRY: () => cluster({ c: 0xa32b3a }),
  FALAFEL:   () => cluster({ c: 0xc9925e, n: 5 }),
  CANDY:     () => cluster({ c: 0xe89ac4, n: 6 }),
  GUM:       () => cluster({ c: 0xe89ac4, n: 4 }),
  PICKLE: () => tube({ c: 0x6bb35e, len: 9, r: 1 }),
  LEEK:   () => tube({ c: 0x9bc96b, len: 11, r: 1, top: 0x4a7a3a }),
  RHUBARB:() => tube({ c: 0xc4304a, len: 11, r: 1, top: 0x5f9b4f }),
  CROISSANT:() => tube({ c: 0xe8b45e, len: 9, r: 1, curve: 2 }),
  BAGUETTE: () => tube({ c: 0xd9a662, len: 13, r: 1 }),
  SODA:     () => cup({ c: 0xd9794f, drink: 0xf2ede0 }),
  JUICE:    () => cup({ c: 0xf5a83b, drink: 0xf2c83b }),
  ESPRESSO: () => cup({ c: 0xf6f3ec, drink: 0x4a3320 }),
  SUGAR:  () => jar({ c: 0xf2ede0 }),
  FLOUR:  () => jar({ c: 0xe8d9b3, lid: 0xd9a662 }),
  JELLY:  () => jar({ c: 0x9a4fb3 }),
  OREGANO:() => jar({ c: 0x5f9b4f }),
  PAPRIKA:() => jar({ c: 0xd9453a }),
  APPLESAUCE: () => jar({ c: 0xe8b45e, lid: 0xd9453a }),
  SALAD:    () => bowl({ contents: 0x7fc96b, bits: 0xd9453a }),
  OATS:     () => bowl({ contents: 0xd9b27a }),
  DIP:      () => bowl({ contents: 0xe8e0cc, bits: 0x5f9b4f }),
  CUSTARD:  () => bowl({ contents: 0xf2dc8a }),
  PORRIDGE: () => bowl({ contents: 0xd9b27a, bits: 0xf2b53b }),
  RISOTTO:  () => bowl({ contents: 0xf2dc8a, bits: 0x5f9b4f }),
  FONDUE:   () => bowl({ contents: 0xf2c83b, bowlC: 0xd9453a }),
  CLAM:     () => bowl({ contents: 0xe8d9b3, bits: 0xf2ede0 }),
  BEEF:     () => bowl({ contents: 0x8a4326, bits: 0xe8843b }),
  ICE:      () => sphere({ c: 0x9ad4f0, rx: 3, ry: 3, rz: 2 }),
  MINT:     () => sphere({ c: 0x8fdfb0, rx: 3, ry: 3, rz: 2 }),
  COOKIE:   () => stack({ c: 0xc9925e, discs: 2, r: 3, topper: 0x6b4226 }),
  CRACKER:  () => stack({ c: 0xd9a662, discs: 2, r: 3, topper: 0xf2ede0 }),
  TORTILLA: () => stack({ c: 0xe8d9b3, discs: 2, r: 4, topper: 0xe8d9b3 }),
  QUESADILLA:() => stack({ c: 0xe8c25a, discs: 2, r: 4, topper: 0x5f9b4f }),
  OMELET:   () => stack({ c: 0xf2dc8a, discs: 2, r: 4, topper: 0x5f9b4f }),
  OMELETTE: () => stack({ c: 0xf2dc8a, discs: 2, r: 4, topper: 0xd9453a }),
  MUFFIN:   () => tiers({ base: 0xb37a3b, frosting: 0xc9925e, levels: [[2, 2], [3, 2]], cherry: false }),
  CHEESECAKE:() => tiers({ base: 0xf2e8dc, frosting: 0xd93a4a, levels: [[5, 3]], cherry: true }),
  FRUITCAKE: () => tiers({ base: 0xa3653b, frosting: 0xf6f3ec, levels: [[4, 3]], cherry: true }),
  MERINGUE:  () => tiers({ base: 0xf6f3ec, frosting: 0xf2ede0, levels: [[4, 2], [2, 2], [1, 1]], cherry: false }),
  TIRAMISU:  () => layers({ list: [[0xd9b27a, 1], [0xf2e8dc, 1], [0xd9b27a, 1], [0x6b4226, 1]], len: 7 }),
  LASAGNA:   () => layers({ list: [[0xe8cf8a, 1], [0xd9453a, 1], [0xe8cf8a, 1], [0xd9794f, 1], [0xf2c83b, 1]], len: 9 }),
  KNIVES:    () => wedge({ c: 0xb9c2d4, len: 9, h: 4 }),
  STEAK:     () => loaf({ c: 0xa3432b, h: 3, crust: 0x6b2a1e }),
  BACON:     () => loaf({ c: 0xc4304a, h: 2, crust: 0xe89aa4 }),
  // ===== expansion 2 shapes =====
  SALT: () => jar({ c: 0xf6f3ec }),
  MACE: () => jar({ c: 0xe8843b }),
  MAYO: () => jar({ c: 0xf6f3ec }),
  RANCH: () => jar({ c: 0xf2ede0 }),
  SAUCE: () => jar({ c: 0xd9453a }),
  SYRUP: () => jar({ c: 0xb3651e, lid: 0xd9a662 }),
  RELISH: () => jar({ c: 0x6b9b3f }),
  PESTO: () => jar({ c: 0x5f9b4f }),
  AIOLI: () => jar({ c: 0xf2e8c0 }),
  CHUTNEY: () => jar({ c: 0xe8893b }),
  VINEGAR: () => jar({ c: 0xd9b27a }),
  TAHINI: () => jar({ c: 0xe8d9b3 }),
  SRIRACHA: () => jar({ c: 0xd9453a }),
  MARMALADE: () => jar({ c: 0xe8843b }),
  MOLASSES: () => jar({ c: 0x4a3320, lid: 0xd9a662 }),
  TERIYAKI: () => jar({ c: 0x6b4226 }),
  CUMIN: () => jar({ c: 0xb3793b }),
  TURMERIC: () => jar({ c: 0xe8b43b }),
  GOO: () => bowl({ contents: 0x6bb35e, bowlC: 0x707a8c }),
  GLOOP: () => bowl({ contents: 0x8a4fb3, bowlC: 0x707a8c }),
  SLIME: () => bowl({ contents: 0x6bd96b, bowlC: 0x3a3f4d }),
  STEW: () => bowl({ contents: 0x8a5f3b, bits: 0xe8843b }),
  SALSA: () => bowl({ contents: 0xd9453a, bits: 0x5f9b4f }),
  HUMMUS: () => bowl({ contents: 0xe8d9b3 }),
  CURRY: () => bowl({ contents: 0xe8893b, bits: 0x5f9b4f }),
  BROTH: () => bowl({ contents: 0xd9b27a }),
  CHILI: () => bowl({ contents: 0xb33b2c, bits: 0xf2c83b }),
  GUMBO: () => bowl({ contents: 0x8a4326, bits: 0xd9453a }),
  RAMEN: () => bowl({ contents: 0xe8cf8a, bits: 0xd9453a }),
  CHOWDER: () => bowl({ contents: 0xe8d9b3, bits: 0xf2c83b }),
  LENTIL: () => bowl({ contents: 0xc9853b }),
  MARINARA: () => bowl({ contents: 0xc4304a }),
  ALFREDO: () => bowl({ contents: 0xf2ede0 }),
  CARAMEL: () => bowl({ contents: 0xc9853b }),
  GRAVY: () => bowl({ contents: 0x8a5f3b }),
  PUNCH: () => cup({ c: 0xd93a6b, drink: 0xe86b9a }),
  SLUSH: () => cup({ c: 0x5ab2e8, drink: 0x9ad4f0 }),
  SHAKE: () => cup({ c: 0xe89ac4, drink: 0xf6f3ec }),
  COCOA: () => cup({ c: 0x8a5a3b, drink: 0x6b4226 }),
  LATTE: () => cup({ c: 0xc9a25e, drink: 0xf2e8dc }),
  CIDER: () => cup({ c: 0xc9853b, drink: 0xe8b45e }),
  MOCHA: () => cup({ c: 0x6b4226, drink: 0xc9a25e }),
  SUNDAE: () => cup({ c: 0xf2e8dc, drink: 0x6b4226 }),
  PARFAIT: () => cup({ c: 0xf2e8dc, drink: 0xe89ac4 }),
  TRIFLE: () => cup({ c: 0xe89ac4, drink: 0xf6f3ec }),
  BRIE: () => wedge({ c: 0xf2ead9 }),
  GOUDA: () => wedge({ c: 0xe8b45e }),
  SWISS: () => wedge({ c: 0xf2dc8a, holes: true }),
  CHEDDAR: () => wedge({ c: 0xe8843b }),
  PARMESAN: () => wedge({ c: 0xf2e8c0, holes: true }),
  STINKY: () => wedge({ c: 0x9bc96b, holes: true }),
  RICOTTA: () => bowl({ contents: 0xf6f3ec }),
  OKRA: () => tube({ c: 0x6bb35e, len: 9, r: 1, top: 0x4a7a3a }),
  CELERY: () => tube({ c: 0x9bc96b, len: 11, r: 1, top: 0x4a7a3a }),
  SAUSAGE: () => tube({ c: 0xa3543b, len: 11, r: 1, curve: 1 }),
  SALAMI: () => tube({ c: 0xc4304a, len: 9, r: 2 }),
  BOLOGNA: () => tube({ c: 0xe89aa4, len: 9, r: 2 }),
  LOBSTER: () => tube({ c: 0xe8744f, len: 11, r: 1, curve: 2 }),
  SCALLION: () => tube({ c: 0x6bb35e, len: 11, r: 1, top: 0x4a7a3a }),
  PLANTAIN: () => tube({ c: 0xe8b43b, len: 11, r: 1, curve: 2 }),
  PARSNIP: () => tube({ c: 0xe8d9b3, len: 11, r: 2, taper: 2, top: 0x9bc96b }),
  KEBAB: () => tube({ c: 0xa3543b, len: 11, r: 1 }),
  GINGER: () => tube({ c: 0xe8c98a, len: 9, r: 1, curve: 1 }),
  CHIVE: () => tube({ c: 0x5f9b4f, len: 11, r: 1 }),
  ROSEMARY: () => tube({ c: 0x4a7a3a, len: 11, r: 1 }),
  ECLAIR: () => tube({ c: 0x6b4226, len: 9, r: 1 }),
  CANNOLI: () => tube({ c: 0xe8d9b3, len: 9, r: 1 }),
  SQUID: () => tube({ c: 0xe8d9c0, len: 9, r: 1 }),
  FRIES: () => tube({ c: 0xf2c84b, len: 11, r: 1 }),
  BEET: () => sphere({ c: 0xa32b5a, rx: 3, ry: 3, rz: 2, stem: 0x5f9b4f }),
  GIANT: () => sphere({ c: 0xa3543b, rx: 4, ry: 4, rz: 3 }),
  SQUASH: () => sphere({ c: 0xe8a83b, rx: 4, ry: 3, rz: 3, stem: 0x5a3a1e }),
  ORANGE: () => sphere({ c: 0xe8843b, rx: 3, ry: 3, rz: 2 }),
  APRICOT: () => sphere({ c: 0xe8a83b, rx: 3, ry: 3, rz: 2 }),
  PAPAYA: () => sphere({ c: 0xe8893b, rx: 4, ry: 3, rz: 2 }),
  GUAVA: () => sphere({ c: 0xd96b7a, rx: 3, ry: 3, rz: 2 }),
  GRAPEFRUIT: () => sphere({ c: 0xe86b6b, rx: 4, ry: 3, rz: 3 }),
  TANGERINE: () => sphere({ c: 0xe8843b, rx: 3, ry: 2, rz: 2 }),
  DRAGONFRUIT: () => sphere({ c: 0xd93a6b, rx: 3, ry: 3, rz: 2, crown: 0x5f9b4f }),
  POMELO: () => sphere({ c: 0xe8c98a, rx: 4, ry: 4, rz: 3 }),
  BRAINS: () => sphere({ c: 0xe89ac4, rx: 4, ry: 3, rz: 3 }),
  DURIAN: () => sphere({ c: 0xc9a25e, rx: 4, ry: 3, rz: 3, crown: 0x9bc96b }),
  GUMMY: () => sphere({ c: 0xe8543a, rx: 3, ry: 3, rz: 2 }),
  BLOB: () => sphere({ c: 0x6bb3d9, rx: 3, ry: 2, rz: 2 }),
  SNAIL: () => sphere({ c: 0x9b8b6b, rx: 3, ry: 3, rz: 2 }),
  DATE: () => sphere({ c: 0x8a5f3b, rx: 2, ry: 3, rz: 2 }),
  PRUNE: () => sphere({ c: 0x4a2a4f, rx: 2, ry: 2, rz: 2 }),
  WALNUT: () => sphere({ c: 0x8a5f3b, rx: 2, ry: 2, rz: 2 }),
  NUTMEG: () => sphere({ c: 0x8a5f3b, rx: 2, ry: 2, rz: 2 }),
  GELATO: () => sphere({ c: 0xf2d5e0, rx: 3, ry: 3, rz: 2 }),
  SORBET: () => sphere({ c: 0xe86b9a, rx: 3, ry: 3, rz: 2 }),
  SCALLOP: () => sphere({ c: 0xf2e8dc, rx: 3, ry: 2, rz: 2 }),
  SCONE: () => sphere({ c: 0xe8c98a, rx: 3, ry: 2, rz: 2 }),
  BAGEL: () => sphere({ c: 0xd9a662, rx: 3, ry: 2, rz: 2 }),
  DONUT: () => sphere({ c: 0xe89ac4, rx: 3, ry: 2, rz: 2 }),
  BUGS: () => cluster({ c: 0x6b9b3f, n: 6 }),
  ALMOND: () => cluster({ c: 0xc9925e, n: 6 }),
  PECAN: () => cluster({ c: 0xa3653b, n: 6 }),
  CASHEW: () => cluster({ c: 0xe8d9b3, n: 6 }),
  RAISIN: () => cluster({ c: 0x6b4226, n: 7 }),
  BLACKBERRY: () => cluster({ c: 0x3a2a4f }),
  LYCHEE: () => cluster({ c: 0xf2dce0, n: 5 }),
  CHICKPEA: () => cluster({ c: 0xe8d9b3, n: 6 }),
  GNOCCHI: () => cluster({ c: 0xe8d9b3, n: 6 }),
  SAFFRON: () => cluster({ c: 0xe8893b, n: 5 }),
  CARDAMOM: () => cluster({ c: 0x9bc96b, n: 5 }),
  CORIANDER: () => cluster({ c: 0x9b8b4f, n: 6 }),
  PEPPERCORN: () => cluster({ c: 0x3a3326, n: 7 }),
  GIZZARD: () => cluster({ c: 0xc99a6b, n: 5 }),
  CLOVE: () => cluster({ c: 0x6b4226, n: 5 }),
  SPROUT: () => cluster({ c: 0x5f9b4f, n: 6 }),
  PRALINE: () => cluster({ c: 0xc9925e, n: 5 }),
  BASIL: () => cluster({ c: 0x4f9b3f, n: 6 }),
  THYME: () => cluster({ c: 0x6b9b4f, n: 6 }),
  PARSLEY: () => cluster({ c: 0x4f9b3f, n: 6 }),
  DILL: () => cluster({ c: 0x6bb35e, n: 5 }),
  SAGE: () => cluster({ c: 0x9bc96b, n: 5 }),
  WASABI: () => cluster({ c: 0x6bb35e, n: 4 }),
  FENNEL: () => sphere({ c: 0xd9e8c0, rx: 3, ry: 2, rz: 2, top: null }),
  SHALLOT: () => sphere({ c: 0xc99a8a, rx: 2, ry: 3, rz: 2, stem: 0x9bc96b }),
  SPAM: () => loaf({ c: 0xe89aa4, h: 3, crust: 0xd97a8a }),
  TOFU: () => loaf({ c: 0xf2ede0, h: 4, len: 7 }),
  JERKY: () => loaf({ c: 0x8a4326, h: 2 }),
  BRISKET: () => loaf({ c: 0x8a4326, h: 3, crust: 0x6b2a1e }),
  MYSTERY: () => loaf({ c: 0x9b7a6b, h: 4, crust: 0x6b5f4b }),
  HAGGIS: () => loaf({ c: 0x6b4226, h: 4, len: 7, crust: 0x4a2f1e }),
  CRICKET: () => loaf({ c: 0x6b5f3b, h: 2 }),
  FUDGE: () => loaf({ c: 0x6b4226, h: 3, len: 7 }),
  TOFFEE: () => loaf({ c: 0xb3793b, h: 2 }),
  NOUGAT: () => loaf({ c: 0xf2e8c0, h: 3 }),
  WAFER: () => loaf({ c: 0xe8d9b3, h: 2 }),
  FETA: () => loaf({ c: 0xf6f3ec, h: 3, len: 7 }),
  BISCOTTI: () => loaf({ c: 0xc9925e, h: 2 }),
  NACHOS: () => stack({ c: 0xe8c25a, discs: 3, r: 4, topper: 0x5f9b4f }),
  WAFFLE: () => stack({ c: 0xdfae55, discs: 2, r: 4 }),
  MACARON: () => stack({ c: 0xe89ac4, discs: 3, r: 3, topper: 0xf6f3ec }),
  CREPE: () => stack({ c: 0xe8d9b3, discs: 2, r: 4 }),
  PEPPERONI: () => stack({ c: 0xc4304a, discs: 3, r: 3, topper: 0xe89aa4 }),
  QUICHE: () => tiers({ base: 0xe8c25a, frosting: 0xf2dc8a, levels: [[5, 2]], cherry: false }),
  COBBLER: () => tiers({ base: 0xe8a83b, frosting: 0xe8c25a, levels: [[5, 2]], cherry: true }),
  TURNOVER: () => tiers({ base: 0xe8b45e, frosting: 0xf2dc8a, levels: [[4, 2]], cherry: false }),
  STRUDEL: () => loaf({ c: 0xe8b45e, h: 3, crust: 0xc9853b }),
  CALZONE: () => tiers({ base: 0xe8b45e, frosting: 0xd9a662, levels: [[4, 3]], cherry: false }),
  PANINI: () => layers({ list: [[0xd9a662, 1], [0x5f9b4f, 1], [0xd9453a, 1], [0xd9a662, 1]] }),
  RAVIOLI: () => layers({ list: [[0xe8d9b3, 1], [0x5f9b4f, 1], [0xe8d9b3, 1]], len: 7 }),
  GYRO: () => tube({ c: 0xd9b27a, len: 9, r: 1 }),
  WINGS: () => drumstick({ c: 0xd9743b }),
  FROG: () => drumstick({ c: 0x6bb35e }),
  TONGUE: () => loaf({ c: 0xd96b7a, h: 2 }),
  ROLLS: () => tube({ c: 0xe8d9b3, len: 7, r: 1 }),
  WORMS: () => worm({ c: 0xe86b9a }),
  EYEBALL: () => eyeball({ iris: 0x5ab2e8 }),
  TENTACLE: () => tentacle({ c: 0xc4306b }),
  OCTOPUS: () => tentacle({ c: 0x9a5fb3 }),
  CHERRY: () => cluster({ c: 0xc4304a, n: 4 }),
  CHERRIES: () => cluster({ c: 0xc4304a, n: 5 }),
};

/** Build the voxel model for a word; falls back to a loaf in the dish colour. */
export function buildFoodCubes(word, fallbackColor) {
  const tryKeys = [word, word.replace(/ES$/, ''), word.replace(/S$/, '')];
  for (const key of tryKeys) {
    if (M[key]) return M[key]();
  }
  return loaf({ c: fallbackColor });
}
