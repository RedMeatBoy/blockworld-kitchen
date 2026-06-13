import { Input } from './input.js';
import { registerScenes, go, updateScene, sceneName } from './flow.js';
import { Save } from './save.js';
import { el, $overlay, updateControllerStatus } from './ui.js';
import { unlockAudio, stopSpeech, setVoiceProfile, speak } from './audio.js';
import { Music } from './music.js';
import { gradeLabel } from './data/words.js';

import { titleScene } from './scenes/title.js';
import { menuScene } from './scenes/menu.js';
import { serviceScene } from './scenes/service.js';
import { sharpenScene } from './scenes/sharpen.js';
import { resultsScene } from './scenes/results.js';
import { buildScene } from './scenes/build.js';
import { bookScene } from './scenes/book.js';
import { engineScene } from './scenes/engine.js';

Save.load();
setVoiceProfile(Save.data.voice);

registerScenes({
  title: titleScene,
  menu: menuScene,
  service: serviceScene,
  sharpen: sharpenScene,
  results: resultsScene,
  build: buildScene,
  book: bookScene,
  engine: engineScene,
});

// ---------- pause + parent dashboard overlays ----------

let overlayMode = null; // null | 'pause' | 'stats'

function openPause() {
  overlayMode = 'pause';
  stopSpeech();
  renderPause();
}

function renderPause() {
  const node = $overlay();
  node.innerHTML = '';
  const panel = el('div', 'overlay-panel');
  panel.append(el('h2', '', '⏸ KITCHEN PAUSED'));
  const fiery = Save.data.voice === 'fiery';
  panel.append(el('div', 'subtitle',
    'Take a breath, chef.<br><br>' +
    `🎵 MUSIC: <b style="color:${Save.data.music ? '#6fd96f' : '#e8604f'}">${Save.data.music ? 'ON' : 'OFF'}</b>` +
    ' &nbsp;—&nbsp; press Y to switch<br><br>' +
    `🗣 VOICE: <b style="color:#f5c84b">${fiery ? 'FIERY CHEF BLOCKSAY' : 'FRIENDLY HELPER'}</b>` +
    ' &nbsp;—&nbsp; press X to switch<br><br>' +
    'PRESS &nbsp;A&nbsp; TO KEEP COOKING'));
  node.append(panel);
}

function pct(num, den) {
  return den > 0 ? `${Math.round((num / den) * 100)}%` : '—';
}

function openStats() {
  overlayMode = 'stats';
  stopSpeech();
  const s = Save.data.stats;
  const node = $overlay();
  node.innerHTML = '';
  const panel = el('div', 'overlay-panel');
  panel.append(el('h2', '', '📊 PARENT DASHBOARD'));
  const table = el('div', 'stat-table');
  table.innerHTML =
    `Sessions completed: <b>${s.sessions}</b> &nbsp;·&nbsp; Current day: <b>${Save.data.day}</b><br>` +
    `Grade level: <b>${gradeLabel(Save.data.grade)}</b> (Alberta ELAL band, set on title screen)<br>` +
    `Difficulty within grade: <b>tier ${Save.data.wordTier + 1} of 3</b> (auto-adapts to success rate)<br><br>` +
    `<u>Spelling (learning disorder target)</u><br>` +
    `Words attempted: <b>${s.wordsAttempted}</b> &nbsp;·&nbsp; First-try correct: <b>${pct(s.wordsFirstTry, s.wordsAttempted)}</b><br>` +
    `Chef's Glances used: <b>${s.glancesUsed}</b> &nbsp;·&nbsp; "Hear again" used: <b>${s.hearsUsed}</b><br><br>` +
    `<u>Impulse control (ADHD target)</u><br>` +
    `WAIT calls held successfully: <b>${pct(s.waitsHeld, s.waitsTotal)}</b> (${s.waitsHeld}/${s.waitsTotal})<br>` +
    `No-cut orders sent correctly: <b>${pct(s.noCutHeld, s.noCutTotal)}</b> (${s.noCutHeld}/${s.noCutTotal})<br><br>` +
    `<u>Cut precision (slowing down for accuracy)</u><br>` +
    `Cuts attempted: <b>${s.cutsTotal}</b> &nbsp;·&nbsp; Perfect: <b>${pct(s.cutsPerfect, s.cutsTotal)}</b>` +
    ` &nbsp;·&nbsp; In-zone: <b>${pct(s.cutsPerfect + s.cutsGood, s.cutsTotal)}</b><br><br>` +
    `<u>Regulation & self-awareness</u><br>` +
    `Sharpening wind-downs: <b>${s.sharpenSessions}</b> &nbsp;·&nbsp; Move breaks done: <b>${s.moveBreaks}</b><br>` +
    `Engine check-ins — slow: <b>${s.engineSlow}</b> · just right: <b>${s.engineRight}</b> · racing: <b>${s.engineRacing}</b><br>` +
    `Memory quiz correct: <b>${pct(s.quizRight, s.quizTotal)}</b> (${s.quizRight}/${s.quizTotal})<br><br>` +
    `<span style="font-size:9px;opacity:.7">Press SELECT (or Tab) to close · keyboard R+Shift resets all progress</span>`;
  panel.append(table);
  node.append(panel);
}

function closeOverlay() {
  overlayMode = null;
  $overlay().innerHTML = '';
}

// hard reset (keyboard-only, parent escape hatch)
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyR' && e.shiftKey && overlayMode === 'stats') {
    if (confirm('Reset ALL Blockworld Kitchen progress and stats?')) {
      Save.reset();
      closeOverlay();
      go('title');
    }
  }
});

// ---------- main loop ----------

let last = performance.now();
let padWasConnected = null;

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  Input.update(dt);

  if (Input.padConnected !== padWasConnected) {
    padWasConnected = Input.padConnected;
    updateControllerStatus(padWasConnected, Input.padMapping);
  }

  if (overlayMode) {
    if (overlayMode === 'pause' && Input.pressed('y')) {
      Save.data.music = !Save.data.music;
      Save.save();
      if (Save.data.music) Music.start(); else Music.stop();
      renderPause();
    } else if (overlayMode === 'pause' && Input.pressed('x')) {
      Save.data.voice = Save.data.voice === 'fiery' ? 'friendly' : 'fiery';
      Save.save();
      setVoiceProfile(Save.data.voice);
      speak(Save.data.voice === 'fiery'
        ? 'RIGHT! Chef Blocksay here. Let us COOK, yes chef?!'
        : 'Hello chef! Let\'s cook together.');
      renderPause();
    } else if (overlayMode === 'pause' && (Input.pressed('a') || Input.pressed('start'))) closeOverlay();
    else if (overlayMode === 'stats' && (Input.pressed('select') || Input.pressed('b'))) closeOverlay();
  } else {
    if (Input.pressed('start') && sceneName() !== 'title') { unlockAudio(); openPause(); }
    else if (Input.pressed('select')) { unlockAudio(); openStats(); }
    else {
      // one bad frame must never freeze the whole game for a kid mid-session
      try { updateScene(dt); } catch (err) { console.error('scene update error:', err); }
    }
  }

  requestAnimationFrame(frame);
}

updateControllerStatus(false);
go('title');
requestAnimationFrame(frame);
