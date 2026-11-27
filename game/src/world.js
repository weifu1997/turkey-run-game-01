// The world: the turkey, the farmer, the hazards and the pickups, and the
// rules that move them. Everything is stepped in fixed 1/60s slices, so a
// screenshot autopilot and a live player see exactly the same game.
//
// The run is a distance race: the turkey auto-runs right, the farmer chases
// from behind, and the gap between them is the real health bar. Stumbling
// into a fence, a pumpkin, an oven or a falling knife lets the farmer gain;
// when he catches the turkey it costs a life. Hiding behind a hay bale
// confuses him and buys the gap back. Reach 1500 m and the turkey escapes.

import { ESCAPE_DISTANCE_M, FARMER, GROUND_Y, MAX_LIVES, PIXELS_PER_METRE, PLAYER, SCORES, STAGES, STEP } from './config.js';
import { Rng } from './random.js';

export const EVENT_NONE = 0;
export const EVENT_STUMBLE = 1;
export const EVENT_CAUGHT = 2;
export const EVENT_ESCAPED = 4;
export const EVENT_CORN = 8;
export const EVENT_FEATHER = 16;

const KNIFE_FALL_SPEED = 1500;
const KNIFE_WARN_SECONDS = 0.55;

function stageFor(distanceM) {
  for (let i = STAGES.length - 1; i >= 0; i -= 1) {
    if (distanceM >= STAGES[i].fromM) return i;
  }
  return 0;
}

export class World {
  constructor(seed = 1) {
    this.rng = new Rng(seed);
    this.reset();
  }

  reset() {
    this.time = 0;
    this.distanceM = 0;
    this.score = 0;
    this.lives = MAX_LIVES;
    this.stageIndex = 0;
    this.over = false;
    this.escaped = false;
    this.endCause = '';
    this.best = 0;
    this.cornCollected = 0;
    this.feathersCollected = 0;
    this.stumbles = 0;
    this.hides = 0;
    this.player = {
      x: PLAYER.startX,
      y: GROUND_Y - PLAYER.height,
      vy: 0,
      onGround: true,
      hidden: false,
      hideTimer: 0,
      stumbleTimer: 0,
      invulnTimer: 0,
      dashTimer: 0,
      runPhase: 0,
      mud: false,
    };
    this.farmer = {
      x: PLAYER.startX - FARMER.startGap,
      mode: 'chase',
      modeTimer: 0,
      searchTargetX: 0,
      spotted: false,
      stepPhase: 0,
    };
    this.obstacles = [];
    this.pickups = [];
    this.knives = [];
    this.particles = [];
    this.banners = [];
    this.nextSpawnX = 900;
    this.nextKnifeAtM = 1010;
    this.spawnInitial();
  }

  // --- spawning -----------------------------------------------------------

  spawnInitial() {
    // A gentle opening: two corn cobs and a low fence to learn the jump on.
    this.pickups.push(
      { kind: 'corn', x: 620, y: GROUND_Y - 46, taken: false, bob: 0 },
      { kind: 'corn', x: 700, y: GROUND_Y - 46, taken: false, bob: 0 },
    );
    this.obstacles.push({ kind: 'fence', x: 1050, width: 26, height: 70 });
    this.nextSpawnX = 1500;
  }

  spawnAhead() {
    const stage = STAGES[this.stageIndex];
    const horizon = this.player.x + 2200;
    while (this.nextSpawnX < horizon) {
      const kind = this.rng.pick(stage.hazards);
      const x = this.nextSpawnX;
      // A pattern's span counts too: a double fence reaches 300 px past its
      // own x, so the gap to the next pattern is measured from the pattern's
      // far edge, never from its start, or the next hazard lands on the
      // turkey's landing spot.
      const span = this.spawnPattern(kind, x);
      this.nextSpawnX += span + this.rng.range(stage.gapMin, stage.gapMax);
    }
  }

  // Lays one pattern at x and returns how far past x it reaches.
  spawnPattern(kind, x) {
    const addCornArc = (cx, high) => {
      this.pickups.push(
        { kind: 'corn', x: cx - 60, y: GROUND_Y - 46, taken: false, bob: 0 },
        { kind: 'corn', x: cx, y: high ? GROUND_Y - 150 : GROUND_Y - 46, taken: false, bob: 0 },
        { kind: 'corn', x: cx + 60, y: GROUND_Y - 46, taken: false, bob: 0 },
      );
    };
    if (kind === 'fence') {
      this.obstacles.push({ kind: 'fence', x, width: 26, height: 70 });
      if (this.rng.chance(0.6)) addCornArc(x + 13, true);
    } else if (kind === 'doubleFence') {
      // Two fences with a full landing strip between them: the turkey lands
      // after the first and jumps the second, instead of landing on it.
      this.obstacles.push({ kind: 'fence', x, width: 26, height: 70 });
      this.obstacles.push({ kind: 'fence', x: x + 300, width: 26, height: 70 });
      if (this.rng.chance(0.5)) {
        this.pickups.push({ kind: 'feather', x: x + 150, y: GROUND_Y - 170, taken: false, bob: 0 });
      }
      return 326;
    } else if (kind === 'pumpkin') {
      this.obstacles.push({ kind: 'pumpkin', x, width: 46, height: 46, roll: this.rng.range(0, Math.PI * 2) });
      if (this.rng.chance(0.5)) addCornArc(x + 23, false);
    } else if (kind === 'mud') {
      this.obstacles.push({ kind: 'mud', x, width: 130, height: 12 });
      if (this.rng.chance(0.7)) addCornArc(x + 65, false);
    } else if (kind === 'hay') {
      this.obstacles.push({ kind: 'hay', x, width: 74, height: 62 });
      this.pickups.push({ kind: 'corn', x: x + 100, y: GROUND_Y - 46, taken: false, bob: 0 });
    } else if (kind === 'oven') {
      this.obstacles.push({ kind: 'oven', x, width: 84, height: 80 });
      if (this.rng.chance(0.6)) addCornArc(x + 42, true);
    } else if (kind === 'knife') {
      // The knife itself is spawned by the kitchen timer below; here we lay
      // a warning patch of corn so the player runs into the drop zone.
      addCornArc(x + 40, false);
    }
    return 0;
  }

  // --- helpers ------------------------------------------------------------

  nearestHay() {
    let best = null;
    for (const ob of this.obstacles) {
      if (ob.kind !== 'hay') continue;
      const d = Math.abs(ob.x + ob.width / 2 - (this.player.x + PLAYER.width / 2));
      if (d < 110 && (best === null || d < best.d)) best = { ob, d };
    }
    return best;
  }

  gap() {
    return this.player.x - this.farmer.x;
  }

  addBanner(text, seconds = 1.4, color = '#fff') {
    this.banners.push({ text, ttl: seconds, max: seconds, color });
  }

  burst(x, y, color, count, speed = 180) {
    for (let i = 0; i < count; i += 1) {
      const a = this.rng.range(0, Math.PI * 2);
      const v = this.rng.range(speed * 0.3, speed);
      this.particles.push({
        x, y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - 80,
        ttl: this.rng.range(0.4, 0.9),
        max: 0.9,
        color,
        size: this.rng.range(3, 7),
      });
    }
  }

  // --- the step -----------------------------------------------------------

  step(dt, input, sound) {
    if (this.over || this.escaped) return EVENT_NONE;
    let events = EVENT_NONE;
    this.time += dt;
    const player = this.player;
    const farmer = this.farmer;
    const stage = STAGES[this.stageIndex];

    // Hiding: duck behind a hay bale while the farmer is close. While hidden
    // the turkey does not run, and the farmer is left searching.
    const hay = this.nearestHay();
    if (!player.hidden && input.hideHeld() && hay && player.onGround) {
      player.hidden = true;
      player.hideTimer = 2.2;
      this.hides += 1;
      farmer.mode = 'search';
      farmer.modeTimer = 0;
      farmer.searchTargetX = player.x + 260;
      if (sound) sound.hide();
      this.addBanner('HIDING…', 1.6, '#ffe9a8');
    }
    if (player.hidden) {
      player.hideTimer -= dt;
      if (player.hideTimer <= 0) {
        player.hidden = false;
        player.dashTimer = PLAYER.dashSeconds;
        if (sound) sound.gobble();
      }
    }

    // Running: base speed grows with the stage; left slows, right hurries,
    // mud drags, a stumble stops the turkey cold, a dash hurries it.
    let speed = stage.speed;
    if (input.leftHeld()) speed *= 0.82;
    if (input.rightHeld()) speed *= 1.1;
    if (player.mud) speed *= 0.6;
    if (player.stumbleTimer > 0) speed = 0;
    if (player.dashTimer > 0) speed *= 1.25;
    if (!player.hidden) {
      player.x += speed * dt;
      player.runPhase += dt * (speed / 28);
    }
    if (player.stumbleTimer > 0) player.stumbleTimer -= dt;
    if (player.invulnTimer > 0) player.invulnTimer -= dt;
    if (player.dashTimer > 0) player.dashTimer -= dt;

    // Jumping, with a little forgiveness at the edge of the ground. Gravity
    // runs first, so a jump pressed just as the turkey lands fires in the
    // same step instead of a step late.
    if (!player.onGround) {
      player.vy += PLAYER.gravity * dt;
      player.y += player.vy * dt;
      if (player.y >= GROUND_Y - PLAYER.height) {
        player.y = GROUND_Y - PLAYER.height;
        player.vy = 0;
        player.onGround = true;
        this.burst(player.x + 32, GROUND_Y, '#c9b088', 4, 70);
      }
    }
    if (input.jumpPressed() && player.onGround && !player.hidden && player.stumbleTimer <= 0) {
      player.vy = PLAYER.jumpVelocity;
      player.onGround = false;
      if (sound) sound.jump();
      this.burst(player.x + 32, GROUND_Y, '#d9c9a8', 5, 90);
    }

    this.distanceM = Math.max(this.distanceM, (player.x - PLAYER.startX) / PIXELS_PER_METRE);
    const newStage = stageFor(this.distanceM);
    if (newStage !== this.stageIndex) {
      this.stageIndex = newStage;
      this.addBanner(STAGES[newStage].name, 1.8, '#ffe9a8');
      if (sound) sound.gobble();
    }
    this.score = Math.floor(this.distanceM * SCORES.metre) + this.cornCollected * SCORES.corn + this.feathersCollected * SCORES.feather;

    // The farmer: he chases, he corners when he is close, and he searches
    // when the turkey hides. He never teleports — the gap is earned.
    if (farmer.mode === 'search') {
      farmer.modeTimer += dt;
      if (farmer.modeTimer < 0.9) {
        farmer.x += FARMER.searchSlow * dt;
      } else if (farmer.modeTimer < 1.9) {
        // Stands and looks: the "?" moment.
      } else if (farmer.modeTimer < 3.1) {
        farmer.x -= 110 * dt;
      } else {
        farmer.mode = 'chase';
        farmer.modeTimer = 0;
      }
    } else {
      const gap = this.gap();
      const cornering = gap < FARMER.cornerGap;
      if (cornering && !farmer.spotted) {
        farmer.spotted = true;
        this.addBanner('SPOTTED!', 1.2, '#ff6b5e');
        if (sound) sound.spotted();
      }
      if (!cornering) farmer.spotted = false;
      let fSpeed = FARMER.baseSpeed + this.stageIndex * 16 + (cornering ? FARMER.cornerBoost : 0);
      if (player.hidden) fSpeed = FARMER.searchSlow;
      farmer.x += fSpeed * dt;
      farmer.stepPhase += dt * fSpeed * 0.06;
    }

    // Caught: the farmer reaches the turkey.
    if (this.gap() <= 4 && player.invulnTimer <= 0 && !player.hidden) {
      this.lives -= 1;
      events |= EVENT_CAUGHT;
      this.burst(player.x + 32, player.y + 30, '#ffffff', 22, 260);
      if (this.lives <= 0) {
        this.over = true;
        this.endCause = 'caught';
        if (sound) sound.caught();
        return events;
      }
      // A narrow escape: the turkey bolts ahead, briefly untouchable.
      player.x += 320;
      farmer.x = player.x - 420;
      player.invulnTimer = PLAYER.invulnerableSeconds;
      player.dashTimer = PLAYER.dashSeconds;
      this.addBanner('CAUGHT! — one life gone', 1.6, '#ff6b5e');
      if (sound) sound.stumble();
    }

    // Hazards and pickups.
    this.spawnAhead();
    player.mud = false;
    for (const ob of this.obstacles) {
      if (ob.x > player.x + 2400 || ob.x + ob.width < player.x - 600) continue;
      if (ob.kind === 'mud') {
        if (player.x + PLAYER.width > ob.x && player.x < ob.x + ob.width && player.onGround) player.mud = true;
        continue;
      }
      if (ob.kind === 'hay') continue;
      const overlapX = player.x + PLAYER.width - 8 > ob.x && player.x + 8 < ob.x + ob.width;
      const feet = player.y + PLAYER.height;
      const top = GROUND_Y - ob.height;
      if (overlapX && feet > top + 6 && player.invulnTimer <= 0 && player.stumbleTimer <= 0) {
        // Ran into it instead of over it: stumble, the farmer gains. The
        // turkey is knocked back clear of the hazard — further for taller
        // hazards, so the next jump has room to gain height instead of
        // hitting the same edge again.
        player.stumbleTimer = PLAYER.stumbleSeconds;
        player.x = Math.min(player.x, ob.x - PLAYER.width - 34 - ob.height);
        farmer.x += FARMER.stumbleGain;
        this.stumbles += 1;
        events |= EVENT_STUMBLE;
        this.burst(player.x + 32, player.y + 20, '#ffd23e', 14, 220);
        this.addBanner('STUMBLE!', 0.9, '#ffb347');
        if (sound) sound.stumble();
      }
    }

    for (const pk of this.pickups) {
      if (pk.taken) continue;
      pk.bob += dt;
      const px = player.x + PLAYER.width / 2;
      const py = player.y + PLAYER.height / 2;
      const dx = pk.x - px;
      const dy = pk.y + Math.sin(pk.bob * 3) * 4 - py;
      if (dx * dx + dy * dy < 46 * 46) {
        pk.taken = true;
        if (pk.kind === 'corn') {
          this.cornCollected += 1;
          events |= EVENT_CORN;
          if (sound) sound.corn();
        } else {
          this.feathersCollected += 1;
          events |= EVENT_FEATHER;
          if (sound) sound.feather();
        }
        this.burst(pk.x, pk.y, pk.kind === 'corn' ? '#ffd23e' : '#fff3c4', 8, 140);
      }
    }

    // Kitchen knives: telegraphed by a glint above the turkey's path, then
    // they fall. A hit is a stumble, not a life — the farmer is the danger.
    if (this.stageIndex === 2 && this.distanceM >= this.nextKnifeAtM) {
      this.nextKnifeAtM = this.distanceM + this.rng.range(38, 70);
      this.knives.push({
        x: player.x + this.rng.range(120, 320),
        y: -90,
        warn: KNIFE_WARN_SECONDS,
        falling: false,
      });
    }
    for (const knife of this.knives) {
      if (knife.warn > 0) {
        knife.warn -= dt;
        if (knife.warn <= 0) knife.falling = true;
      } else if (knife.falling) {
        knife.y += KNIFE_FALL_SPEED * dt;
        const overlapX = player.x + PLAYER.width - 6 > knife.x && player.x + 6 < knife.x + 26;
        if (overlapX && knife.y + 120 > player.y && knife.y < player.y + PLAYER.height && player.invulnTimer <= 0 && player.stumbleTimer <= 0) {
          player.stumbleTimer = PLAYER.stumbleSeconds;
          farmer.x += FARMER.stumbleGain;
          this.stumbles += 1;
          events |= EVENT_STUMBLE;
          this.burst(player.x + 32, player.y + 20, '#dfe6ee', 14, 220);
          this.addBanner('THE KNIFE!', 0.9, '#ffb347');
          if (sound) sound.stumble();
          knife.falling = false;
          knife.y = GROUND_Y + 400;
        }
        if (knife.y > GROUND_Y + 100) {
          knife.falling = false;
          knife.y = GROUND_Y + 400;
        }
      }
    }

    // Escape: past the kitchen door, the turkey is free.
    if (this.distanceM >= ESCAPE_DISTANCE_M) {
      this.escaped = true;
      this.endCause = 'escaped';
      this.score += SCORES.escapeBonus;
      events |= EVENT_ESCAPED;
      if (sound) sound.escaped();
      return events;
    }

    // Particles and banners age; old scenery is dropped behind the camera.
    for (let i = this.particles.length - 1; i >= 0; i -= 1) {
      const p = this.particles[i];
      p.ttl -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 500 * dt;
      if (p.ttl <= 0) this.particles.splice(i, 1);
    }
    for (let i = this.banners.length - 1; i >= 0; i -= 1) {
      this.banners[i].ttl -= dt;
      if (this.banners[i].ttl <= 0) this.banners.splice(i, 1);
    }
    const behind = player.x - 700;
    this.obstacles = this.obstacles.filter((ob) => ob.x + ob.width > behind);
    this.pickups = this.pickups.filter((pk) => !pk.taken && pk.x > behind);
    this.knives = this.knives.filter((k) => k.y < GROUND_Y + 300);

    return events;
  }
}
