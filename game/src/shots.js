// Screenshot scenes: each one plays the real game forward from a fresh
// world for a fixed number of steps, steered by a simple autopilot, so the
// frame is what a short game really looks like and the same seed always
// gives the same frame. The autopilot looks ahead for the next solid hazard
// and jumps it, hides behind hay when the farmer is closing in, and otherwise
// runs — the play scene's pilot looks far ahead and keeps its lives, the
// escaped scene's pilot plays the whole run to the kitchen door.

import { GROUND_Y, PLAYER, STAGES, STEP } from './config.js';
import { EVENT_CAUGHT, EVENT_ESCAPED, EVENT_NONE } from './world.js';

const SAMPLE = 1 / 30;
const HORIZON_PLAY = 0.75;
const HORIZON_ESCAPE = 0.9;
const START_SECONDS = 4;
const PLAY_SECONDS = 24;
const KITCHEN_SECONDS = 190;
const ESCAPE_LIMIT_SECONDS = 600;
const MARGIN = 12;

// The next solid hazard ahead of the turkey, if any, and how far away it is.
function nextHazard(world) {
  const px = world.player.x;
  let best = null;
  for (const ob of world.obstacles) {
    if (ob.kind === 'hay' || ob.kind === 'mud') continue;
    if (ob.x + ob.width < px) continue;
    if (best === null || ob.x < best.x) best = ob;
  }
  return best;
}

// Seconds until the turkey, running at its stage speed, reaches `x`.
function secondsTo(world, x) {
  const speed = STAGES[world.stageIndex].speed;
  return Math.max(0, (x - world.player.x) / speed);
}

function jumpNeeded(world, horizon) {
  const hazard = nextHazard(world);
  if (!hazard) return false;
  const px = world.player.x + PLAYER.width;
  const gapPx = hazard.x - px;
  if (gapPx < -10 || gapPx > 260) return false;
  // Jump when the hazard is about a third of a second away, so the arc
  // clears it; jump earlier for tall ovens.
  const lead = hazard.kind === 'oven' ? 0.42 : 0.34;
  return secondsTo(world, hazard.x) < lead && world.player.onGround;
}

function hideWanted(world) {
  const hay = world.nearestHay();
  if (!hay) return false;
  if (world.gap() > 260) return false;
  return hay.d < 60;
}

// The autopilot's input for one step: jump, hide, or just run. It hurries
// (holds right) whenever the farmer is closing in, so a cornered turkey
// can still outrun him.
function autopilotInput(world, horizon) {
  return {
    jumpPressed: () => jumpNeeded(world, horizon),
    hideHeld: () => hideWanted(world),
    leftHeld: () => false,
    rightHeld: () => world.gap() < 280,
  };
}

function playFor(world, seconds, horizon, stopOn) {
  let events = 0;
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    events = world.step(STEP, autopilotInput(world, horizon), null);
    if (events & stopOn) break;
    if (world.over || world.escaped) break;
  }
  return events;
}

// Step until `done(world)` is true, or `seconds` run out.
function playUntil(world, seconds, done) {
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    world.step(STEP, autopilotInput(world, HORIZON_PLAY), null);
    if (world.over || world.escaped) break;
    if (done(world)) break;
  }
}

// Set `world` to the named scene and return the screen to draw over it.
export function stageShot(name, world) {
  world.reset();
  if (name === 'play') {
    // A chase scene: the farmer starts close behind, and the run stops while
    // he is still in frame (screen x between -20 and 60), so the shot shows
    // the chase, not just the turkey running alone.
    world.farmer.x = world.player.x - 130;
    playUntil(world, 14, (w) => {
      const farmerScreenX = 260 - w.gap();
      return w.time > 4 && farmerScreenX > -20 && farmerScreenX < 60 && w.player.onGround;
    });
    return { screen: world.over ? 'over' : 'play', best: world.score };
  }
  if (name === 'kitchen') {
    // Run until the kitchen stage, then keep going until an oven is in view
    // and a carving knife is falling or about to, so the shot shows the
    // kitchen's dangers, not an empty stretch of floor. A catch costs a life
    // and the turkey bolts on, so the run continues past it; only game over
    // stops it.
    playFor(world, KITCHEN_SECONDS, HORIZON_PLAY, EVENT_NONE);
    if (!world.over) {
      playUntil(world, 40, (w) => {
        const camX = w.player.x - 260;
        const ovenInView = w.obstacles.some(
          (ob) => ob.kind === 'oven' && ob.x > camX + 200 && ob.x < camX + 1100,
        );
        const knifeInView = w.knives.some(
          (k) => k.falling && k.y > 60 && k.x > camX + 150 && k.x < camX + 1000,
        );
        return ovenInView && knifeInView;
      });
    }
    return { screen: world.over ? 'over' : 'play', best: world.score };
  }
  if (name === 'escaped') {
    playFor(world, ESCAPE_LIMIT_SECONDS, HORIZON_ESCAPE, EVENT_ESCAPED);
    return { screen: world.escaped ? 'over' : 'play', best: world.score };
  }
  // Default: the title screen, with the farm idling behind it.
  for (let i = 0; i < Math.floor(START_SECONDS / STEP); i += 1) {
    world.time += STEP;
    world.player.runPhase += STEP * 2;
  }
  return { screen: 'title', best: 0 };
}

export { GROUND_Y };
