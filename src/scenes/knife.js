// The Knife Station — 3D voxel cutting board (Three.js).
//
// Therapeutic design notes:
//  - Precision over speed: a moving cut line must be stopped inside the target
//    zone. Rushing produces misses; nothing bad happens, but quality and Knife
//    Trust come from controlled timing. (Impulse control / "slow down" training)
//  - WAIT events: the chef calls HOLD and the player must withhold the cut —
//    a go/no-go response-inhibition task, a core ADHD skill target.
//  - No-cut orders: some dishes go out whole; pressing B (not A) is the win.
//    Withholding is framed as elite knife discipline, never as a punishment.
//
// The food is a real voxel model (a FISH looks like a fish), and the player's
// chosen chef stands at the board holding the knife, chopping with a full
// arm swing on every cut.

import * as THREE from 'three';
import { Input } from '../input.js';
import { Sfx, speak } from '../audio.js';
import { Save, currentKnife } from '../save.js';
import { el, floatPoints, toast } from '../ui.js';
import { PRAISE_WITHHOLD } from '../data/words.js';
import { buildFoodCubes } from '../foods.js';

const TRAVEL = 3.4;          // indicator travel half-width
const ZONE_TOL = 0.42;       // zone half-width (generous for young hands)
const PERFECT_FRAC = 0.33;   // fraction of tolerance that counts as perfect
const GOOD_FRAC = 0.64;

const CHEF_COLORS = {
  m: { skin: 0xe8b88a, hair: 0x5a3a1e, accent: 0x6f7a8c },
  f: { skin: 0xc98e62, hair: 0x2a2118, accent: 0xb34a5e },
};

let three = null; // lazy singleton

function initThree() {
  if (three) return three;
  const canvas = document.getElementById('three-canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 100);
  camera.position.set(0, 4.8, 7.6);
  camera.lookAt(0, 0.8, 0);

  scene.add(new THREE.AmbientLight(0xffffff, 0.8));
  const sun = new THREE.DirectionalLight(0xfff3d6, 1.3);
  sun.position.set(3, 8, 5);
  scene.add(sun);

  // cutting board + counter
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(9.4, 0.6, 4.2),
    new THREE.MeshLambertMaterial({ color: 0x9a6b3f })
  );
  board.position.y = -0.31;
  scene.add(board);
  const boardTrim = new THREE.Mesh(
    new THREE.BoxGeometry(9.8, 0.25, 4.6),
    new THREE.MeshLambertMaterial({ color: 0x7a5430 })
  );
  boardTrim.position.y = -0.62;
  scene.add(boardTrim);

  // moving cut indicator
  const indicator = new THREE.Mesh(
    new THREE.BoxGeometry(0.07, 0.05, 4.0),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 })
  );
  indicator.position.y = 0.02;
  scene.add(indicator);

  // target zone marker
  const zoneStrip = new THREE.Mesh(
    new THREE.BoxGeometry(ZONE_TOL * 2, 0.04, 4.0),
    new THREE.MeshBasicMaterial({ color: 0x6fd96f, transparent: true, opacity: 0.35 })
  );
  zoneStrip.position.y = 0.01;
  scene.add(zoneStrip);
  const postGeo = new THREE.BoxGeometry(0.12, 0.5, 0.12);
  const postMat = new THREE.MeshBasicMaterial({ color: 0x6fd96f });
  const postA = new THREE.Mesh(postGeo, postMat);
  const postB = new THREE.Mesh(postGeo, postMat);
  postA.position.set(0, 0.25, 2.1);
  postB.position.set(0, 0.25, -2.1);
  zoneStrip.add(postA, postB);

  // ---------- the chef ----------
  const chefGroup = new THREE.Group();
  const skinMat = new THREE.MeshLambertMaterial({ color: 0xe8b88a });
  const whiteMat = new THREE.MeshLambertMaterial({ color: 0xf4f4f4 });
  const whiteShade = new THREE.MeshLambertMaterial({ color: 0xd8d8d8 });
  const hairMat = new THREE.MeshLambertMaterial({ color: 0x5a3a1e });
  const apronMat = new THREE.MeshLambertMaterial({ color: 0x6f7a8c });
  const darkMat = new THREE.MeshLambertMaterial({ color: 0x22232b });

  const torso = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.7, 0.8), whiteMat);
  torso.position.set(0, 1.0, 0);
  const apron = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.1, 0.12), apronMat);
  apron.position.set(0, 0.85, 0.45);
  const head = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.95, 0.95), skinMat);
  head.position.set(0, 2.35, 0);
  const eyeGeo = new THREE.BoxGeometry(0.14, 0.14, 0.06);
  const eyeL = new THREE.Mesh(eyeGeo, darkMat);
  const eyeR = new THREE.Mesh(eyeGeo, darkMat);
  eyeL.position.set(-0.22, 0.08, 0.5);
  eyeR.position.set(0.22, 0.08, 0.5);
  head.add(eyeL, eyeR);
  const hat = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.55, 1.02), whiteMat);
  hat.position.set(0, 3.05, 0);
  const hatPuff = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.3, 1.14), whiteShade);
  hatPuff.position.set(0, 3.38, 0);

  // hair (sides + back) — shown for Chef Maya, hidden for Chef Max
  const hairMeshes = [];
  for (const [hx, hz, w, d] of [[-0.6, 0, 0.16, 0.9], [0.6, 0, 0.16, 0.9], [0, -0.55, 1.1, 0.16]]) {
    const hairMesh = new THREE.Mesh(new THREE.BoxGeometry(w, 0.85, d), hairMat);
    hairMesh.position.set(hx, 2.1, hz);
    hairMeshes.push(hairMesh);
    chefGroup.add(hairMesh);
  }

  // left arm resting at the side
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.34, 1.2, 0.34), whiteMat);
  armL.position.set(-1.05, 1.15, 0.1);
  armL.rotation.z = 0.15;

  // right arm: a pivot at the shoulder reaching forward over the board,
  // holding the knife — the whole pivot swings for a chop
  const armPivot = new THREE.Group();
  armPivot.position.set(0.95, 1.85, 0.2);
  const armR = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 2.5), whiteMat);
  armR.position.set(0, -0.1, 1.25);
  const hand = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.36, 0.4), skinMat);
  hand.position.set(0, -0.12, 2.6);
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.6, 0.2), new THREE.MeshLambertMaterial({ color: 0x4a3320 }));
  handle.position.set(0, -0.4, 2.62);
  const bladeMat = new THREE.MeshLambertMaterial({ color: 0xd8d8e0 });
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.05, 2.1), bladeMat);
  blade.position.set(0, -1.15, 2.9);
  armPivot.add(armR, hand, handle, blade);

  chefGroup.add(torso, apron, head, hat, hatPuff, armL, armPivot);
  chefGroup.position.set(0, 0, -3.1);
  scene.add(chefGroup);

  // background kitchen props
  const potMat = new THREE.MeshLambertMaterial({ color: 0x707a8c });
  const pot = new THREE.Group();
  const potBody = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.3, 1.6), potMat);
  const potLid = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.2, 1.8),
    new THREE.MeshLambertMaterial({ color: 0x4a5160 }));
  potLid.position.y = 0.75;
  pot.add(potBody, potLid);
  pot.position.set(-4.8, 0.4, -2.6);
  scene.add(pot);

  const crate = new THREE.Group();
  crate.add(new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.0, 1.4),
    new THREE.MeshLambertMaterial({ color: 0x8a5f38 })));
  [0xd9453a, 0x5fb33b, 0xf2c83b].forEach((c, i) => {
    const veg = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.45),
      new THREE.MeshLambertMaterial({ color: c }));
    veg.position.set(-0.5 + i * 0.5, 0.65, (i % 2) * 0.3 - 0.15);
    crate.add(veg);
  });
  crate.position.set(4.8, 0.2, -2.4);
  scene.add(crate);

  three = {
    renderer, scene, camera, indicator, zoneStrip,
    chefGroup, armPivot, bladeMat, skinMat, hairMat, apronMat, hairMeshes,
  };
  resize();
  window.addEventListener('resize', resize);
  return three;
}

function resize() {
  if (!three) return;
  const w = window.innerWidth, h = window.innerHeight;
  three.renderer.setSize(w, h, false);
  three.camera.aspect = w / h;
  three.camera.updateProjectionMatrix();
}

export const KnifeStation = {
  active: false,

  /**
   * @param order   { word, dish, emoji, color }
   * @param opts    { noCut, waitZone, cuts, speed, zoneWiden, perfectBonus }
   * @param onDone  callback({ trustEarned })
   */
  start(order, opts, onDone) {
    const t = initThree();
    this.order = order;
    this.opts = opts;
    this.onDone = onDone;
    this.active = true;
    this.trustEarned = 0;
    this.time = 0;
    this.chopT = 0;
    this.tol = ZONE_TOL * (1 + (opts.zoneWiden || 0));

    document.getElementById('three-canvas').classList.add('active');

    // dress the chef as the chosen avatar; tint the blade to the trust tier
    const look = CHEF_COLORS[Save.data.avatar] || CHEF_COLORS.m;
    t.skinMat.color.set(look.skin);
    t.hairMat.color.set(look.hair);
    t.apronMat.color.set(look.accent);
    t.hairMeshes.forEach((m) => { m.visible = Save.data.avatar === 'f'; });
    const knifeTier = currentKnife(Save.data.trust);
    t.bladeMat.color.set(knifeTier.color);
    // cosmic tiers glow
    t.bladeMat.emissive.set(knifeTier.glow ? knifeTier.color : 0x000000);
    if (knifeTier.glow) t.bladeMat.emissive.multiplyScalar(0.55);
    t.zoneStrip.scale.x = this.tol / ZONE_TOL;

    // ---- build the voxel food ----
    this.cubes = [];
    if (this.group) t.scene.remove(this.group);
    this.group = new THREE.Group();

    const voxels = buildFoodCubes(order.word, order.color);
    let minX = Infinity, maxX = -Infinity, maxY = 0;
    for (const v of voxels) {
      minX = Math.min(minX, v.x);
      maxX = Math.max(maxX, v.x);
      maxY = Math.max(maxY, v.y);
    }
    const extent = maxX - minX + 1;
    // normalise so foods are consistently sized AND never tower over the chef
    const size = Math.min(0.42, Math.max(0.26, Math.min(5.0 / extent, 3.0 / (maxY + 1))));
    const cx = (minX + maxX) / 2;

    const matCache = new Map();
    const matFor = (c) => {
      if (!matCache.has(c)) matCache.set(c, new THREE.MeshLambertMaterial({ color: c }));
      return matCache.get(c);
    };
    this.foodMats = matCache;

    const geo = new THREE.BoxGeometry(size * 0.96, size * 0.96, size * 0.96);
    for (const v of voxels) {
      const cube = new THREE.Mesh(geo, matFor(v.c));
      const wx = (v.x - cx) * size;
      cube.position.set(wx, v.y * size + size / 2, v.z * size);
      cube.userData.homeX = wx;
      cube.userData.homeY = cube.position.y;
      cube.userData.offset = 0;
      this.cubes.push(cube);
      this.group.add(cube);
    }
    t.scene.add(this.group);

    // cut zones across the food's actual width
    const wMin = (minX - cx) * size;
    const wMax = (maxX - cx) * size;
    const span = wMax - wMin;
    this.zones = [];
    for (let i = 1; i <= opts.cuts; i++) {
      this.zones.push(wMin + (span * i) / (opts.cuts + 1));
    }
    this.zoneIndex = 0;

    // indicator: base speed from grade difficulty, creeping up gently with days
    this.indX = -TRAVEL;
    this.indDir = 1;
    this.indSpeed = (opts.speed ?? 2.0) + Math.min(0.5, Save.data.day * 0.05);

    // DOM banner
    this.banner = el('div', 'knife-banner');
    document.getElementById('scene').append(this.banner);

    if (opts.noCut) {
      this.state = 'nocut';
      this.setBanner('info', `🛑 The ${order.dish} goes out WHOLE.<br>Do NOT cut! Press B to send it.`);
      speak(`Chef! This one goes out whole. Do not cut it. Press B to send it out.`);
    } else {
      this.state = 'cutting';
      this.maybeStartWait();
      if (this.state === 'cutting') {
        this.setBanner('info', `Cut the ${order.word.toLowerCase()} — press A inside the green zone!`);
        speak(`Time to cut! Press A when the line is in the green zone. Steady hands, chef.`);
        setTimeout(() => this.clearBannerIf('info'), 2600);
      }
    }
    this.updateZoneMarker();
  },

  setBanner(kind, html) {
    this.banner.innerHTML = '';
    this.banner.append(el('div', `inner ${kind}`, html));
    this.bannerKind = kind;
  },
  clearBannerIf(kind) {
    if (this.banner && this.bannerKind === kind) { this.banner.innerHTML = ''; this.bannerKind = null; }
  },

  maybeStartWait() {
    if (this.opts.waitZone === this.zoneIndex) {
      this.state = 'waiting';
      this.waitTimer = 1.6 + Math.random() * 1.4;
      this.waitBlown = false;
      this.setBanner('wait', '✋ WAIT… the chef says HOLD!');
      speak('Wait! Hold that knife. Do not cut yet.');
      Save.data.stats.waitsTotal++;
    }
  },

  updateZoneMarker() {
    const t = initThree();
    if (this.zoneIndex < this.zones.length && !this.opts.noCut) {
      t.zoneStrip.visible = true;
      t.zoneStrip.position.x = this.zones[this.zoneIndex];
    } else {
      t.zoneStrip.visible = false;
    }
  },

  award(points, label, color) {
    this.trustEarned += points;
    Save.addTrust(points);
    const q = el('div', 'cut-quality', label);
    if (color) q.style.color = color;
    document.getElementById('scene').append(q);
    setTimeout(() => q.remove(), 1000);
    if (points > 0) floatPoints(`+${points}`, window.innerWidth / 2 + 120, window.innerHeight / 2 - 40);
  },

  sliceAt(x) {
    // doubled separation: the halves jump apart dramatically
    for (const cube of this.cubes) {
      cube.userData.offset += cube.userData.homeX < x ? -0.36 : 0.36;
    }
    this.chopT = 0.34; // swing the chef's arm
    Sfx.chop();
  },

  setEmissive(r) {
    for (const mat of this.foodMats.values()) mat.emissive?.setRGB(r, 0, 0);
  },

  finishServing() {
    this.state = 'serving';
    this.serveTimer = 1.1;
    for (const cube of this.cubes) {
      cube.userData.vy = 3.8 + Math.random() * 3.8;
      cube.userData.vx = (Math.random() - 0.5) * 5;
      cube.userData.spin = (Math.random() - 0.5) * 12;
    }
    Sfx.plonk();
    initThree().zoneStrip.visible = false;
  },

  update(dt) {
    if (!this.active) return;
    const t = initThree();
    this.time += dt;

    // move indicator; chef follows it, knife hovering over the line
    if (this.state === 'cutting' || this.state === 'waiting' || this.state === 'nocut') {
      this.indX += this.indDir * this.indSpeed * dt;
      if (this.indX > TRAVEL) { this.indX = TRAVEL; this.indDir = -1; }
      if (this.indX < -TRAVEL) { this.indX = -TRAVEL; this.indDir = 1; }
    }
    t.indicator.position.x = this.indX;
    t.chefGroup.position.x = this.indX - 0.95; // shoulder lines the knife up with the cut line
    t.chefGroup.position.y = Math.sin(this.time * 2.2) * 0.04; // idle breathing

    // chop swing: fast down, ease back up — doubled amplitude for drama
    if (this.chopT > 0) this.chopT = Math.max(0, this.chopT - dt);
    const chopPhase = this.chopT > 0.22 ? (0.34 - this.chopT) / 0.12 : this.chopT / 0.22;
    t.armPivot.rotation.x = 0.06 + chopPhase * 1.0;

    // cube physics during serve, gentle settle otherwise
    for (const cube of this.cubes) {
      if (this.state === 'serving') {
        cube.userData.vy -= 9.5 * dt;
        cube.position.y += cube.userData.vy * dt;
        cube.position.x += cube.userData.vx * dt;
        cube.rotation.z += cube.userData.spin * dt;
        cube.scale.multiplyScalar(Math.max(0, 1 - dt * 1.6));
      } else {
        const target = cube.userData.homeX + cube.userData.offset;
        cube.position.x += (target - cube.position.x) * Math.min(1, dt * 10);
      }
    }

    // ---- state logic ----
    if (this.state === 'nocut') {
      if (Input.pressed('b')) {
        Save.data.stats.noCutTotal++;
        Save.data.stats.noCutHeld++;
        const line = PRAISE_WITHHOLD[Math.floor(Math.random() * PRAISE_WITHHOLD.length)];
        this.award(8, 'DISCIPLINE! +8', '#6fd96f');
        toast(`🏅 ${line}`, 'praise');
        speak(line);
        Sfx.ding();
        this.finishServing();
      } else if (Input.pressed('a')) {
        Save.data.stats.noCutTotal++;
        Sfx.buzz();
        Save.addTrust(-3);
        this.trustEarned -= 3;
        toast('Whoa! Not this one, chef — it goes out WHOLE. Press B to send it.', 'oops');
        speak('Whoa whoa! No cutting this one. Press B to send it out whole.');
      }
    } else if (this.state === 'waiting') {
      this.waitTimer -= dt;
      const pulse = 0.5 + Math.sin(this.time * 8) * 0.5;
      t.zoneStrip.visible = false;
      this.setEmissive(pulse * 0.35);
      if (Input.pressed('a')) {
        if (!this.waitBlown) {
          this.waitBlown = true;
          Sfx.buzz();
          Save.addTrust(-4);
          this.trustEarned -= 4;
          toast('Easy, chef! A good chef waits for the call.', 'oops');
          speak('Easy! Wait for my call.');
        }
      }
      if (this.waitTimer <= 0) {
        this.state = 'cutting';
        this.setEmissive(0);
        this.updateZoneMarker();
        this.setBanner('now', '✅ NOW! Cut when the line is in the zone!');
        speak('Now! Go!');
        if (!this.waitBlown) {
          Save.data.stats.waitsHeld++;
          this.pendingWithholdBonus = true;
        }
        setTimeout(() => this.clearBannerIf('now'), 1800);
      }
    } else if (this.state === 'cutting') {
      if (Input.pressed('a')) {
        const zx = this.zones[this.zoneIndex];
        const dist = Math.abs(this.indX - zx);
        Save.data.stats.cutsTotal++;
        if (dist <= this.tol) {
          let pts, label, color;
          if (dist <= this.tol * PERFECT_FRAC) {
            pts = 6 + (this.opts.perfectBonus || 0);
            label = `PERFECT! +${pts}`;
            color = '#5ee6e0';
            Save.data.stats.cutsPerfect++;
          } else if (dist <= this.tol * GOOD_FRAC) {
            pts = 4; label = 'GREAT CUT! +4'; color = '#6fd96f';
            Save.data.stats.cutsGood++;
          } else {
            pts = 2; label = 'NICE +2'; color = '#f5c84b';
            Save.data.stats.cutsGood++;
          }
          if (this.pendingWithholdBonus) {
            pts += 8;
            label += ' (+8 patience!)';
            this.pendingWithholdBonus = false;
            toast('🏅 You held the knife until the call. THAT is discipline!', 'praise');
          }
          this.award(pts, label, color);
          this.sliceAt(zx);
          this.zoneIndex++;
          if (this.zoneIndex >= this.zones.length) {
            this.finishServing();
          } else {
            this.maybeStartWait();
            this.updateZoneMarker();
          }
        } else {
          Save.data.stats.cutsMissed++;
          this.chopT = 0.2; // small whiffed chop
          Sfx.back();
          this.award(0, 'line it up…', '#aab3c8');
        }
      }
    } else if (this.state === 'serving') {
      this.serveTimer -= dt;
      if (this.serveTimer <= 0) {
        this.cleanup();
        this.onDone({ trustEarned: this.trustEarned });
        return;
      }
    }

    t.renderer.render(t.scene, t.camera);
  },

  cleanup() {
    this.active = false;
    document.getElementById('three-canvas').classList.remove('active');
    if (this.group) { initThree().scene.remove(this.group); this.group = null; }
    if (this.banner) { this.banner.remove(); this.banner = null; }
  },
};
