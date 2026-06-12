// Tiny scene state machine. Scenes are objects: { enter(params), update(dt), exit() }.

let scenes = {};
let current = null;
let currentName = '';

export function registerScenes(map) { scenes = map; }

export function go(name, params = {}) {
  if (current?.exit) current.exit();
  current = scenes[name];
  currentName = name;
  if (!current) throw new Error(`Unknown scene: ${name}`);
  current.enter(params);
}

export function updateScene(dt) {
  if (current?.update) current.update(dt);
}

export function sceneName() { return currentName; }
