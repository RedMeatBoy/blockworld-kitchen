// Procedural Minecraft-style pixel backgrounds, painted onto a full-screen
// canvas behind the UI. Everything is drawn in code — no image assets.
//
// Kinds: 'kitchen' (service/knife), 'dining' (menu/results/build/title),
//        'night' (sharpening wind-down).

const GRID_W = 64; // virtual blocks across

let canvas = null;
let currentKind = null;

function hash(x, y) {
  // deterministic per-block jitter so repaints don't shimmer
  let h = (x * 374761393 + y * 668265263) ^ 0x5bf03635;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967295;
}

function shade(hex, factor) {
  const r = Math.min(255, Math.round(((hex >> 16) & 255) * factor));
  const g = Math.min(255, Math.round(((hex >> 8) & 255) * factor));
  const b = Math.min(255, Math.round((hex & 255) * factor));
  return `rgb(${r},${g},${b})`;
}

export function paintBackground(kind) {
  currentKind = kind;
  if (!canvas) {
    canvas = document.getElementById('bg-canvas');
    window.addEventListener('resize', () => currentKind && paintBackground(currentKind));
  }
  const w = window.innerWidth, h = window.innerHeight;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  const px = Math.ceil(w / GRID_W);
  const rows = Math.ceil(h / px);
  const dim = kind === 'night' ? 0.4 : 1.0;

  const block = (x, y, hex, jitter = 0.08) => {
    const f = (1 - jitter / 2 + hash(x, y) * jitter) * dim;
    ctx.fillStyle = shade(hex, f);
    ctx.fillRect(x * px, y * px, px + 1, px + 1);
  };

  const counterRow = Math.floor(rows * 0.72);

  // ---- wall ----
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < GRID_W; x++) {
      if (kind === 'dining') {
        // horizontal wood planks
        const plank = Math.floor(y / 3);
        const base = plank % 2 ? 0x8a5f38 : 0x96693f;
        block(x, y, y % 3 === 0 ? 0x6b4326 : base);
      } else {
        // cream kitchen tiles with grout
        const grout = x % 4 === 0 || y % 4 === 0;
        block(x, y, grout ? 0xcfc7b3 : 0xefe7d4);
      }
    }
  }

  // ---- stainless backsplash (kitchen) / wainscot (dining) ----
  const splashTop = counterRow - 8;
  for (let y = splashTop; y < counterRow; y++) {
    for (let x = 0; x < GRID_W; x++) {
      if (kind === 'dining') block(x, y, y === splashTop ? 0x4a3320 : 0x5f432a);
      else block(x, y, y % 2 ? 0x9aa3b3 : 0xa8b1c2, 0.05);
    }
  }

  // ---- counter + lower cabinets ----
  for (let x = 0; x < GRID_W; x++) {
    block(x, counterRow, 0x4a3320, 0.04);
    block(x, counterRow + 1, 0x6b4a2e, 0.04);
    for (let y = counterRow + 2; y < rows; y++) {
      const panel = Math.floor(x / 8) % 2 ? 0x7a5434 : 0x6e4b2e;
      block(x, y, x % 8 === 0 ? 0x553a22 : panel);
    }
  }
  // cabinet handles
  for (let cx = 4; cx < GRID_W; cx += 8) {
    block(cx, counterRow + 4, 0xd9c074, 0.02);
  }

  // ---- window with sky / moon ----
  const winX = 4, winY = 3, winW = 11, winH = Math.max(8, splashTop - 6);
  for (let y = winY; y < winY + winH; y++) {
    for (let x = winX; x < winX + winW; x++) {
      const frame = x === winX || x === winX + winW - 1 || y === winY || y === winY + winH - 1
        || x === winX + Math.floor(winW / 2);
      if (frame) { block(x, y, 0x5a4630, 0.04); continue; }
      if (kind === 'night') block(x, y, 0x1a2238, 0.06);
      else block(x, y, y < winY + 3 ? 0x9ad4f0 : 0x7fc2ea, 0.04);
    }
  }
  if (kind === 'night') {
    // moon + stars
    for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) {
      const mx = winX + 6 + x, my = winY + 2 + y;
      ctx.fillStyle = '#e8e8d0';
      ctx.fillRect(mx * px, my * px, px + 1, px + 1);
    }
    ctx.fillStyle = '#cfd4e8';
    [[winX + 2, winY + 5], [winX + 8, winY + 7], [winX + 3, winY + 9]].forEach(([sx, sy]) => {
      ctx.fillRect(sx * px + px / 3, sy * px + px / 3, px / 3, px / 3);
    });
  } else {
    // sun
    for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) {
      ctx.fillStyle = '#f5d33b';
      ctx.fillRect((winX + 2 + x) * px, (winY + 2 + y) * px, px + 1, px + 1);
    }
  }

  if (kind === 'dining') {
    // framed pictures + warm lamps
    const art = [[22, 5, 0x5f9b4f], [34, 4, 0xd9794f], [46, 6, 0x5f6bd9]];
    for (const [ax, ay, col] of art) {
      for (let y = -1; y <= 3; y++) for (let x = -1; x <= 4; x++) {
        const frame = y === -1 || y === 3 || x === -1 || x === 4;
        block(ax + x, ay + y, frame ? 0xd9c074 : col, 0.12);
      }
    }
    for (const lx of [18, 42, 58]) {
      block(lx, 10, 0xf5d33b, 0.02);
      block(lx, 11, 0xf2b53b, 0.02);
      ctx.fillStyle = 'rgba(245,211,59,0.10)';
      ctx.beginPath();
      ctx.arc(lx * px + px / 2, 11 * px, px * 5, 0, Math.PI * 2);
      ctx.fill();
    }
    // tables along the bottom
    for (const tx of [6, 26, 46]) {
      for (let x = 0; x < 10; x++) block(tx + x, counterRow - 1, 0xf2ede0, 0.04);
      for (let x = 1; x < 9; x++) block(tx + x, counterRow, 0xe0d8c4, 0.04);
      block(tx + 3, counterRow - 2, 0xd9453a, 0.05); // little plate of food
      block(tx + 6, counterRow - 2, 0x7fc96b, 0.05);
    }
  } else {
    // hanging pots + shelf with jars
    for (const hx of [22, 28, 34]) {
      block(hx, 0, 0x3a3f4d, 0.04);
      block(hx, 1, 0x3a3f4d, 0.04);
      for (let x = -1; x <= 1; x++) for (let y = 2; y <= 4; y++) block(hx + x, y, 0x707a8c, 0.07);
      block(hx, 5, 0x4a5160, 0.04);
    }
    const shelfY = 6;
    for (let x = 42; x < 60; x++) block(x, shelfY + 3, 0x5a4630, 0.04);
    const jars = [0xd9453a, 0xf2c83b, 0x5f9b4f, 0x9a5fb3, 0xe8843b, 0x5ab2e8];
    jars.forEach((col, i) => {
      const jx = 43 + i * 3;
      block(jx, shelfY + 2, col, 0.06);
      block(jx, shelfY + 1, col, 0.06);
      block(jx, shelfY, 0xd9c7a0, 0.04);
    });
    // big menu board
    for (let y = 3; y < 9; y++) for (let x = 50; x < 62; x++) {
      const frame = y === 3 || y === 8 || x === 50 || x === 61;
      if (x >= 42 && x <= 60 && y >= shelfY) continue; // don't overdraw shelf
      block(x, y, frame ? 0x5a4630 : 0x2e3526, 0.05);
    }
  }

  // restaurant sign (title/dining only)
  if (kind === 'dining') {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(w / 2 - px * 13, 0, px * 26, px * 2.4);
    ctx.fillStyle = shade(0xf5c84b, dim);
    ctx.font = `${px * 1.1}px 'Press Start 2P', monospace`;
    ctx.textAlign = 'center';
    ctx.fillText("CHEF BLOCKSAY'S", w / 2, px * 1.7);
  }

  // gentle vignette so UI stays readable
  const grad = ctx.createRadialGradient(w / 2, h / 2, h / 3, w / 2, h / 2, h);
  grad.addColorStop(0, 'rgba(15,18,28,0.45)');
  grad.addColorStop(1, 'rgba(15,18,28,0.78)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}
