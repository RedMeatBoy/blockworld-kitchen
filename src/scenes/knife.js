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

import * as THREE from 'three';
import { Input } from '../input.js';
import { Sfx, speak } from '../audio.js';
import { Save, currentKnife } from '../save.js';
import { el, floatPoints, toast } from '../ui.js';
import { PRAISE_WITHHOLD } from '../data/words.js';

const CUBE = 0.52;
const GAP = 0.06;
const TRAVEL = 3.4;          // indicator travel half-width
const ZONE_TOL = 0.42;       // zone half-width (generous for an 8-year-old)
const PERFECT_TOL = 0.14;
const GOOD_TOL = 0.27;

let three = null; // lazy singleton: { renderer, scene, camera, board, ... }

function initThree() {
  if (three) return three;
  const canvas = document.getElementById('three-canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 100);
  camera.position.set(0, 4.6, 7.4);
  camera.lookAt(0, 0.3, 0);

  scene.add(new THREE.AmbientLight(0xffffff, 0.75));
  const sun = new THREE.DirectionalLight(0xfff3d6, 1.4);
  sun.position.set(3, 8, 5);
  scene.add(sun);

  // cutting board
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

  // moving cut indicator: glowing vertical strip
  const indicator = new THREE.Mesh(
    new THREE.BoxGeometry(0.07, 0.05, 4.0),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 })
  );
  indicator.position.y = 0.02;
  scene.add(indicator);

  // knife mesh riding the indicator
  const knifeGroup = new THREE.Group();
  const bladeMat = new THREE.MeshLambertMaterial({ color: 0xd8d8e0 });
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.0, 2.4), bladeMat);
  blade.position.set(0, 0.5, -0.2);
  const handle = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.3, 1.0),
    new THREE.MeshLambertMaterial({ color: 0x4a3320 })
  );
  handle.position.set(0, 1.05, -2.0);
  knifeGroup.add(blade, handle);
  scene.add(knifeGroup);

  // target zone marker: translucent strip + bracket posts
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
  zoneStrip.position.x = 0;

  three = { renderer, scene, camera, indicator, knifeGroup, blade, bladeMat, zoneStrip };
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
   * @param opts    { noCut: bool, waitZone: int|-1, cuts: int }
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

    document.getElementById('three-canvas').classList.add('active');

    // tint the knife blade to the current trust tier
    t.bladeMat.color.set(currentKnife(Save.data.trust).color);

    // build voxel ingredient
    this.cubes = [];
    if (this.group) t.scene.remove(this.group);
    this.group = new THREE.Group();
    const count = 12;
    const mat = new THREE.MeshLambertMaterial({ color: order.color });
    const matDark = new THREE.MeshLambertMaterial({
      color: new THREE.Color(order.color).multiplyScalar(0.8),
    });
    for (let i = 0; i < count; i++) {
      const cube = new THREE.Mesh(new THREE.BoxGeometry(CUBE, CUBE, CUBE), i % 2 ? mat : matDark);
      const x = (i - (count - 1) / 2) * (CUBE + GAP);
      cube.position.set(x, CUBE / 2, 0);
      cube.userData.homeX = x;
      cube.userData.offset = 0;
      this.cubes.push(cube);
      this.group.add(cube);
    }
    t.scene.add(this.group);

    // cut zones: divide ingredient into (cuts+1) segments
    const cuts = opts.cuts;
    const span = (count - 1) * (CUBE + GAP) + CUBE;
    this.zones = [];
    for (let i = 1; i <= cuts; i++) {
      this.zones.push(-span / 2 + (span * i) / (cuts + 1));
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
    const { waitZone } = this.opts;
    if (waitZone === this.zoneIndex) {
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
    // separate cube halves around the cut
    for (const cube of this.cubes) {
      cube.userData.offset += cube.userData.homeX < x ? -0.16 : 0.16;
    }
    Sfx.chop();
  },

  finishServing() {
    this.state = 'serving';
    this.serveTimer = 1.1;
    for (const cube of this.cubes) {
      cube.userData.vy = 2.5 + Math.random() * 2.5;
      cube.userData.vx = (Math.random() - 0.5) * 3;
      cube.userData.spin = (Math.random() - 0.5) * 8;
    }
    Sfx.plonk();
    initThree().zoneStrip.visible = false;
  },

  update(dt) {
    if (!this.active) return;
    const t = initThree();
    this.time += dt;

    // move indicator + knife
    if (this.state === 'cutting' || this.state === 'waiting' || this.state === 'nocut') {
      this.indX += this.indDir * this.indSpeed * dt;
      if (this.indX > TRAVEL) { this.indX = TRAVEL; this.indDir = -1; }
      if (this.indX < -TRAVEL) { this.indX = -TRAVEL; this.indDir = 1; }
    }
    t.indicator.position.x = this.indX;
    t.knifeGroup.position.x = this.indX;
    t.knifeGroup.position.y = 0.45 + Math.sin(this.time * 3) * 0.06;

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
      // red pulse on the ingredient
      const pulse = 0.5 + Math.sin(this.time * 8) * 0.5;
      t.zoneStrip.visible = false;
      this.group.children.forEach((c) => c.material.emissive?.setRGB(pulse * 0.35, 0, 0));
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
        this.group.children.forEach((c) => c.material.emissive?.setRGB(0, 0, 0));
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
        if (dist <= ZONE_TOL) {
          let pts, label, color;
          if (dist <= PERFECT_TOL) { pts = 6; label = 'PERFECT! +6'; color = '#5ee6e0'; Save.data.stats.cutsPerfect++; }
          else if (dist <= GOOD_TOL) { pts = 4; label = 'GREAT CUT! +4'; color = '#6fd96f'; Save.data.stats.cutsGood++; }
          else { pts = 2; label = 'NICE +2'; color = '#f5c84b'; Save.data.stats.cutsGood++; }
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
          // tap outside the zone: knife taps the board, no cut happens
          Save.data.stats.cutsMissed++;
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
