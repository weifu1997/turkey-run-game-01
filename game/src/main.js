// Gobble's Great Escape — the game loop and the screens.
// Screens: title -> play -> over (caught or escaped), with pause on top of
// play. A `?shot=<name>` query stages a screenshot scene instead of starting
// on the title screen, and sets window.__shotReady when the frame is drawn.

import { CANVAS_H, CANVAS_W, STEP } from './config.js';
import { SoundBank } from './audio.js';
import { Input } from './input.js';
import { World } from './world.js';
import { Rng } from './random.js';
import { render } from './render.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
canvas.width = CANVAS_W;
canvas.height = CANVAS_H;

const sound = new SoundBank();
const input = new Input(canvas);
const world = new World(Date.now() % 2147483647);

let screen = 'title';
let paused = false;
let best = 0;
let accumulator = 0;
let lastTime = performance.now();
let shotMode = null;

const params = new URLSearchParams(window.location.search);
if (params.get('shot')) {
  shotMode = params.get('shot');
  const seed = Number(params.get('seed') || '7');
  world.rng = new Rng(seed);
  world.reset();
  const staged = stageShot(shotMode, world);
  screen = staged.screen;
  best = staged.best;
  world.best = best;
}

function setStatus(text) {
  if (statusEl) statusEl.textContent = text;
}

function startGame() {
  sound.ensure();
  sound.click();
  world.reset();
  world.best = best;
  screen = 'play';
  paused = false;
  sound.startMusic();
  setStatus('Running! Jump the fences, dodge the knives, and do not get caught.');
}

function backToTitle() {
  world.reset();
  world.best = best;
  screen = 'title';
  sound.stopMusic();
  setStatus("Gobble's Great Escape. Press Space or click to run.");
}

function stepGame(dt) {
  const events = world.step(dt, input, sound);
  sound.tickMusic();
  if (world.over || world.escaped) {
    best = Math.max(best, world.score);
    world.best = best;
    screen = 'over';
    sound.stopMusic();
    setStatus(world.escaped
      ? `Escaped! Score ${world.score}. Press R or click to run again.`
      : `Caught! Score ${world.score}. Press R or click to run again.`);
  }
  return events;
}

function frame(now) {
  const elapsed = Math.min(0.1, (now - lastTime) / 1000);
  lastTime = now;

  if (!shotMode) {
    if (input.mutePressed()) {
      sound.ensure();
      sound.setMuted(!sound.muted);
    }
    if (screen === 'title' && input.startPressed()) {
      startGame();
    } else if (screen === 'over' && input.restartPressed()) {
      startGame();
    } else if (screen === 'play') {
      if (input.pausePressed()) {
        paused = !paused;
        setStatus(paused ? 'Paused. Press P to keep running.' : 'Running!');
      }
      if (!paused) {
        accumulator += elapsed;
        while (accumulator >= STEP) {
          stepGame(STEP);
          accumulator -= STEP;
          if (screen !== 'play') break;
        }
      }
    }
    if (input.pressed.has('Escape') && screen === 'over') backToTitle();
  }

  render(ctx, world, screen, paused);
  input.endFrame();

  if (shotMode && !window.__shotReady) {
    window.__shotReady = true;
    window.__shotLog = {
      shot: shotMode,
      screen,
      score: world.score,
      distanceM: Math.floor(world.distanceM),
      lives: world.lives,
      stage: world.stageIndex,
      escaped: world.escaped,
      over: world.over,
    };
  }
  requestAnimationFrame(frame);
}

setStatus("Gobble's Great Escape. Press Space or click to run.");
// A tiny read-only handle for playtesting (and for anyone curious): the
// current screen, score and world. It changes nothing about the game.
window.__gobble = {
  get screen() {
    return screen;
  },
  get score() {
    return world.score;
  },
  get distanceM() {
    return Math.floor(world.distanceM);
  },
  get lives() {
    return world.lives;
  },
  world,
};
requestAnimationFrame(frame);
