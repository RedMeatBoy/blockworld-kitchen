// DOM helpers, HUD, toasts.

import { Save, currentKnife, nextKnife } from './save.js';
import { chefImage } from './avatar.js';

export const $scene = () => document.getElementById('scene');
export const $hud = () => document.getElementById('hud');
export const $toasts = () => document.getElementById('toasts');
export const $overlay = () => document.getElementById('overlay');

export function el(tag, className = '', html = '') {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (html) node.innerHTML = html;
  return node;
}

export function clearScene() {
  $scene().innerHTML = '';
  return $scene();
}

export function hintBar(hints) {
  // hints: [['a','Chop'], ['b','Send whole'], ...]
  const bar = el('div', 'hint-bar');
  for (const [btn, label] of hints) {
    const hint = el('span', 'btn-hint');
    const labels = { a: 'A', b: 'B', x: 'X', y: 'Y', start: 'START', select: 'SELECT', dpad: '✚' };
    hint.append(el('span', `btn-icon ${btn}`, labels[btn] || btn));
    hint.append(document.createTextNode(label));
    bar.append(hint);
  }
  return bar;
}

let toastTimer = null;
export function toast(text, type = '', duration = 2600) {
  const box = $toasts();
  box.innerHTML = '';
  const node = el('div', `toast ${type}`, text);
  box.append(node);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { node.remove(); }, duration);
}

export function clearToasts() {
  clearTimeout(toastTimer);
  $toasts().innerHTML = '';
}

export function floatPoints(text, x, y) {
  const node = el('div', 'float-pts', text);
  node.style.left = `${x}px`;
  node.style.top = `${y}px`;
  document.getElementById('app').append(node);
  setTimeout(() => node.remove(), 1400);
}

// ---------- service HUD (trust meter, order progress, glances) ----------

export function renderHud({ orders = null, orderIndex = 0, glances = null } = {}) {
  const hud = $hud();
  hud.innerHTML = '';
  const inner = el('div', 'hud-inner');

  const d = Save.data;
  const knife = currentKnife(d.trust);
  const next = nextKnife(d.trust);
  const pct = next
    ? Math.round(((d.trust - knife.trust) / (next.trust - knife.trust)) * 100)
    : 100;

  const trustBox = el('div', 'trust-box hud-chef');
  const chefImg = document.createElement('img');
  chefImg.src = chefImage(d.avatar, 4);
  trustBox.append(chefImg);
  const trustInner = el('div');
  trustInner.style.flex = '1';
  trustBox.append(trustInner);
  trustInner.append(el('div', 'trust-label', `KNIFE TRUST: ${d.trust}`));
  const barOuter = el('div', 'trust-bar-outer');
  const fill = el('div', 'trust-bar-fill');
  fill.style.width = `${pct}%`;
  barOuter.append(fill);
  trustInner.append(barOuter);
  trustInner.append(el('div', 'trust-knife',
    `${knife.emoji} ${knife.name}${next ? ` &nbsp;→&nbsp; ${next.emoji} at ${next.trust}` : ' (MAX!)'}`));
  inner.append(trustBox);

  if (orders !== null) {
    const prog = el('div', 'service-progress');
    prog.append(el('span', '', 'ORDERS&nbsp;'));
    for (let i = 0; i < orders; i++) {
      const dot = el('div', 'order-dot' + (i < orderIndex ? ' done' : i === orderIndex ? ' now' : ''));
      prog.append(dot);
    }
    inner.append(prog);
  }

  if (glances !== null) {
    const gbox = el('div', 'glance-box');
    gbox.append(el('span', '', "CHEF'S&nbsp;GLANCE&nbsp;"));
    for (let i = 0; i < 3; i++) {
      gbox.append(el('span', 'glance-eye' + (i < glances ? '' : ' used'), '👁'));
    }
    inner.append(gbox);
  }

  hud.append(inner);
}

export function clearHud() { $hud().innerHTML = ''; }

let statusFadeTimer = null;
export function updateControllerStatus(connected, mapping = null) {
  let node = document.querySelector('.controller-status');
  if (!node) {
    node = el('div', 'controller-status');
    document.getElementById('app').append(node);
  }
  node.className = 'controller-status' + (connected ? ' on' : '');
  node.textContent = connected
    ? `🎮 controller connected!${mapping === 'compat' ? ' (bluetooth compat mode)' : ''}`
    : '🎮 press a button on your controller';
  clearTimeout(statusFadeTimer);
  if (connected) {
    statusFadeTimer = setTimeout(() => node.classList.add('fade'), 5000);
  }
}

const CONFETTI_COLORS = ['#f5c84b', '#6fd96f', '#5ab2e8', '#e8604f', '#9a5fb3', '#5ee6e0'];

export function confetti(count = 60) {
  const app = document.getElementById('app');
  for (let i = 0; i < count; i++) {
    const c = el('div', 'confetti');
    c.style.left = `${Math.random() * 100}vw`;
    c.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    c.style.animationDuration = `${1.6 + Math.random() * 1.6}s`;
    c.style.animationDelay = `${Math.random() * 0.4}s`;
    if (i % 3 === 0) c.style.borderRadius = '50%';
    app.append(c);
    setTimeout(() => c.remove(), 3800);
  }
}
