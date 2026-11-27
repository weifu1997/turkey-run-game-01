// Everything the player sees: the farm and the kitchen, the turkey, the
// farmer, the hazards, the HUD and the title and end screens. All art is
// drawn with canvas paths — no images, no fonts from the network.

import { CANVAS_H, CANVAS_W, GROUND_Y, MAX_LIVES, PALETTE, PLAYER, STAGES } from './config.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function ellipse(ctx, x, y, rx, ry) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function text(ctx, str, x, y, size, color, align = 'left', weight = '700', font = 'Georgia, serif') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(str, x, y);
}

// The same text with a dark outline, for lines drawn over a busy sky.
function outlinedText(ctx, str, x, y, size, color, align = 'center', weight = '900') {
  ctx.font = `${weight} ${size}px Georgia, serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.lineWidth = 7;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(43, 24, 8, 0.75)';
  ctx.strokeText(str, x, y);
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

// --- background -----------------------------------------------------------

function drawSky(ctx, stageIndex, camX) {
  const g = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  g.addColorStop(0, PALETTE.skyTop);
  g.addColorStop(0.55, PALETTE.skyMid);
  g.addColorStop(1, PALETTE.skyLow);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, CANVAS_W, GROUND_Y + 2);

  // Sun and slow clouds, drifting on the parallax.
  ctx.fillStyle = '#fff3c4';
  ellipse(ctx, 1080 - (camX * 0.02) % 200, 96, 44, 44);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (let i = 0; i < 4; i += 1) {
    const cx = ((i * 430 - camX * 0.12) % 1500 + 1500) % 1500 - 110;
    const cy = 70 + i * 46;
    ellipse(ctx, cx, cy, 62, 20);
    ellipse(ctx, cx + 34, cy + 8, 44, 16);
    ellipse(ctx, cx - 36, cy + 8, 40, 14);
  }

  // Rolling hills and autumn trees.
  ctx.fillStyle = PALETTE.hillFar;
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y);
  for (let x = 0; x <= CANVAS_W; x += 40) {
    ctx.lineTo(x, GROUND_Y - 90 - Math.sin((x + camX * 0.25) * 0.006) * 46);
  }
  ctx.lineTo(CANVAS_W, GROUND_Y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = PALETTE.hillNear;
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y);
  for (let x = 0; x <= CANVAS_W; x += 40) {
    ctx.lineTo(x, GROUND_Y - 34 - Math.sin((x + camX * 0.4) * 0.008 + 2) * 26);
  }
  ctx.lineTo(CANVAS_W, GROUND_Y);
  ctx.closePath();
  ctx.fill();

  // Trees with orange crowns, fixed to the world so they scroll past.
  for (let i = 0; i < 10; i += 1) {
    const wx = i * 520 + 180;
    const sx = wx - camX * 0.55;
    if (sx < -120 || sx > CANVAS_W + 120) continue;
    ctx.fillStyle = '#7a4a22';
    ctx.fillRect(sx - 5, GROUND_Y - 96, 10, 96);
    ctx.fillStyle = i % 2 ? '#c96a1e' : '#d98a2b';
    ellipse(ctx, sx, GROUND_Y - 118, 58, 46);
    ellipse(ctx, sx - 34, GROUND_Y - 92, 34, 26);
    ellipse(ctx, sx + 34, GROUND_Y - 92, 34, 26);
  }

  // A red barn on the horizon in the barn yard, a kitchen window glow later.
  if (stageIndex >= 1) {
    const bx = 900 - camX * 0.3;
    if (bx > -260 && bx < CANVAS_W + 60) {
      ctx.fillStyle = PALETTE.barnRed;
      ctx.fillRect(bx, GROUND_Y - 190, 220, 190);
      ctx.fillStyle = '#7e2a20';
      ctx.beginPath();
      ctx.moveTo(bx - 14, GROUND_Y - 190);
      ctx.lineTo(bx + 110, GROUND_Y - 262);
      ctx.lineTo(bx + 234, GROUND_Y - 190);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = PALETTE.barnCream;
      ctx.fillRect(bx + 84, GROUND_Y - 120, 52, 120);
      ctx.strokeStyle = PALETTE.barnCream;
      ctx.lineWidth = 4;
      ctx.strokeRect(bx + 84, GROUND_Y - 120, 52, 120);
    }
  }
}

function drawGround(ctx, stageIndex, camX) {
  if (stageIndex === 2) {
    // The kitchen floor: warm checker tiles.
    for (let ty = 0; ty < 3; ty += 1) {
      for (let tx = -1; tx < 22; tx += 1) {
        const wx = tx * 64 - (camX % 128);
        ctx.fillStyle = (tx + ty) % 2 ? '#c99a63' : '#e3c491';
        ctx.fillRect(wx, GROUND_Y + ty * 40, 64, 40);
      }
    }
    ctx.fillStyle = '#8a6a45';
    ctx.fillRect(0, GROUND_Y + 118, CANVAS_W, 4);
  } else {
    ctx.fillStyle = PALETTE.grass;
    ctx.fillRect(0, GROUND_Y, CANVAS_W, 26);
    ctx.fillStyle = PALETTE.dirt;
    ctx.fillRect(0, GROUND_Y + 26, CANVAS_W, CANVAS_H - GROUND_Y - 26);
    ctx.fillStyle = PALETTE.dirtDark;
    for (let i = 0; i < 26; i += 1) {
      const sx = ((i * 211 - camX) % 1400 + 1400) % 1400 - 60;
      ellipse(ctx, sx, GROUND_Y + 52 + (i % 5) * 12, 18, 5);
    }
    // A fence line running along the back of the yard.
    ctx.fillStyle = '#8a5f33';
    for (let x = -((camX * 1) % 90); x < CANVAS_W + 90; x += 90) {
      ctx.fillRect(x, GROUND_Y - 44, 8, 44);
    }
    ctx.fillRect(0, GROUND_Y - 40, CANVAS_W, 6);
    ctx.fillRect(0, GROUND_Y - 24, CANVAS_W, 6);
  }
}

// --- the turkey -----------------------------------------------------------

function drawTurkey(ctx, world) {
  const p = world.player;
  const sx = p.x - world.camX;
  const sy = p.y;
  const blink = world.time % 3.4 < 0.12;
  const legSwing = Math.sin(p.runPhase) * 12;
  const hidden = p.hidden;
  const ghost = p.invulnTimer > 0 && Math.floor(world.time * 12) % 2 === 0;
  if (ghost) ctx.globalAlpha = 0.45;

  if (hidden) {
    // Only the tail fan pokes out of the hay — the joke is the hiding.
    ctx.fillStyle = PALETTE.turkeyDark;
    for (let i = -2; i <= 2; i += 1) {
      ctx.save();
      ctx.translate(sx + 32, GROUND_Y - 58);
      ctx.rotate(i * 0.32);
      ellipse(ctx, 0, -26, 9, 30);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    return;
  }

  ctx.save();
  ctx.translate(sx + 32, sy + PLAYER.height);
  if (p.stumbleTimer > 0) ctx.rotate(-0.25);
  // Legs.
  ctx.strokeStyle = '#e8a13c';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  const legLift = p.onGround ? Math.max(0, legSwing) : 10;
  ctx.beginPath();
  ctx.moveTo(-8, -14);
  ctx.lineTo(-8 + legSwing * 0.6, -legLift);
  ctx.moveTo(10, -14);
  ctx.lineTo(10 - legSwing * 0.6, -Math.max(0, -legSwing));
  ctx.stroke();
  // Tail fan.
  for (let i = -2; i <= 2; i += 1) {
    ctx.save();
    ctx.translate(-26, -58);
    ctx.rotate(-0.5 + i * 0.28 + (p.onGround ? 0 : -0.15));
    ctx.fillStyle = i % 2 ? PALETTE.turkeyDark : '#a06a35';
    ellipse(ctx, 0, -24, 10, 28);
    ctx.fillStyle = '#e8c25a';
    ellipse(ctx, 0, -40, 5, 8);
    ctx.restore();
  }
  // Body.
  ctx.fillStyle = PALETTE.turkeyBrown;
  ellipse(ctx, 0, -40, 34, 30);
  ctx.fillStyle = PALETTE.turkeyCream;
  ellipse(ctx, 6, -30, 20, 14);
  // Wing.
  ctx.fillStyle = PALETTE.turkeyDark;
  ctx.save();
  ctx.translate(-4, -42);
  ctx.rotate(p.onGround ? Math.sin(p.runPhase) * 0.25 : -0.7);
  ellipse(ctx, 0, 0, 20, 12);
  ctx.restore();
  // Neck and head.
  ctx.fillStyle = PALETTE.turkeyBrown;
  ctx.fillRect(16, -78, 12, 30);
  ctx.fillStyle = PALETTE.turkeyCream;
  ellipse(ctx, 26, -82, 15, 13);
  // Beak, wattle and eye.
  ctx.fillStyle = '#f2a541';
  ctx.beginPath();
  ctx.moveTo(38, -86);
  ctx.lineTo(54, -80);
  ctx.lineTo(38, -76);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#d9382b';
  ellipse(ctx, 30, -70, 5, 8);
  if (!blink) {
    ctx.fillStyle = '#1d1d1d';
    ellipse(ctx, 30, -86, 2.6, 2.6);
  }
  // A dizzy spiral when stumbled.
  if (p.stumbleTimer > 0) {
    ctx.strokeStyle = '#ffd23e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(26, -102, 10, world.time * 6, world.time * 6 + 4.4);
    ctx.stroke();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

// --- the farmer -----------------------------------------------------------

function drawFarmer(ctx, world) {
  const f = world.farmer;
  const sx = f.x - world.camX;
  if (sx < -160 || sx > CANVAS_W + 160) return;
  const sy = GROUND_Y;
  const swing = Math.sin(f.stepPhase) * 10;
  ctx.save();
  ctx.translate(sx + 29, sy);
  // Legs and boots.
  ctx.strokeStyle = '#2c2c34';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-8, -52);
  ctx.lineTo(-8 + swing * 0.7, 0);
  ctx.moveTo(8, -52);
  ctx.lineTo(8 - swing * 0.7, 0);
  ctx.stroke();
  // Overalls.
  ctx.fillStyle = PALETTE.farmerDenim;
  ctx.fillRect(-16, -98, 32, 50);
  // Plaid shirt.
  ctx.fillStyle = PALETTE.farmerShirt;
  ctx.fillRect(-20, -128, 40, 34);
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-20, -118);
  ctx.lineTo(20, -118);
  ctx.moveTo(-20, -106);
  ctx.lineTo(20, -106);
  ctx.moveTo(-4, -128);
  ctx.lineTo(-4, -94);
  ctx.moveTo(8, -128);
  ctx.lineTo(8, -94);
  ctx.stroke();
  // Arms: one reaches forward, the other holds the carving knife.
  ctx.strokeStyle = PALETTE.farmerShirt;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(14, -120);
  ctx.lineTo(34, -104 + swing * 0.4);
  ctx.moveTo(-14, -120);
  ctx.lineTo(-30, -96);
  ctx.stroke();
  // The carving knife, glinting.
  ctx.save();
  ctx.translate(36, -100);
  ctx.rotate(0.5);
  ctx.fillStyle = PALETTE.knifeHandle;
  ctx.fillRect(-4, -6, 10, 14);
  ctx.fillStyle = PALETTE.knifeSteel;
  ctx.beginPath();
  ctx.moveTo(6, -6);
  ctx.lineTo(34, -2);
  ctx.lineTo(6, 4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // Head, moustache and straw hat.
  ctx.fillStyle = '#f0c08a';
  ellipse(ctx, 0, -142, 14, 14);
  ctx.fillStyle = '#5a3a1e';
  ctx.fillRect(-10, -136, 20, 5);
  ctx.fillStyle = '#1d1d1d';
  ellipse(ctx, 6, -146, 2.2, 2.2);
  ctx.fillStyle = PALETTE.farmerHat;
  ellipse(ctx, 0, -154, 26, 7);
  ctx.fillRect(-14, -172, 28, 18);
  ctx.fillStyle = '#8a6a2f';
  ctx.fillRect(-14, -158, 28, 5);
  // A "!" when he corners, a "?" when he searches.
  if (f.mode === 'search' || f.spotted) {
    const mark = f.mode === 'search' ? '?' : '!';
    ctx.fillStyle = '#ffffff';
    ellipse(ctx, 30, -196, 17, 17);
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.stroke();
    text(ctx, mark, 30, -188, 22, f.mode === 'search' ? '#3a5a8c' : '#d9382b', 'center', '900');
  }
  ctx.restore();
}

// --- hazards, pickups, particles ------------------------------------------

function drawObstacles(ctx, world) {
  const camX = world.camX;
  for (const ob of world.obstacles) {
    const sx = ob.x - camX;
    if (sx < -160 || sx > CANVAS_W + 160) continue;
    if (ob.kind === 'fence') {
      ctx.fillStyle = '#8a5f33';
      ctx.fillRect(sx, GROUND_Y - ob.height, 7, ob.height);
      ctx.fillRect(sx + ob.width - 7, GROUND_Y - ob.height, 7, ob.height);
      ctx.fillRect(sx - 4, GROUND_Y - ob.height + 8, ob.width + 8, 7);
      ctx.fillRect(sx - 4, GROUND_Y - ob.height + 34, ob.width + 8, 7);
      ctx.fillStyle = '#a8743a';
      ctx.fillRect(sx - 4, GROUND_Y - ob.height + 8, ob.width + 8, 3);
    } else if (ob.kind === 'pumpkin') {
      ctx.fillStyle = '#e07b1f';
      ellipse(ctx, sx + 23, GROUND_Y - 22, 24, 22);
      ctx.fillStyle = '#c96a1e';
      ellipse(ctx, sx + 23, GROUND_Y - 22, 15, 22);
      ctx.fillStyle = '#e07b1f';
      ellipse(ctx, sx + 23, GROUND_Y - 22, 7, 22);
      ctx.fillStyle = '#4a7a2e';
      ctx.fillRect(sx + 20, GROUND_Y - 50, 6, 10);
      ctx.fillStyle = '#1d1d1d';
      ellipse(ctx, sx + 16, GROUND_Y - 26, 2.5, 3.5);
      ellipse(ctx, sx + 30, GROUND_Y - 26, 2.5, 3.5);
      ctx.strokeStyle = '#1d1d1d';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sx + 14, GROUND_Y - 14);
      ctx.lineTo(sx + 32, GROUND_Y - 14);
      ctx.stroke();
    } else if (ob.kind === 'mud') {
      ctx.fillStyle = '#6b4423';
      roundRect(ctx, sx, GROUND_Y - 10, ob.width, 16, 8);
      ctx.fill();
      ctx.fillStyle = '#8a5f33';
      ellipse(ctx, sx + 30, GROUND_Y - 4, 16, 4);
      ellipse(ctx, sx + 90, GROUND_Y - 3, 20, 4);
      text(ctx, 'MUD', sx + ob.width / 2, GROUND_Y - 16, 13, '#fff', 'center', '800');
    } else if (ob.kind === 'hay') {
      ctx.fillStyle = PALETTE.hayGold;
      roundRect(ctx, sx, GROUND_Y - ob.height, ob.width, ob.height, 14);
      ctx.fill();
      ctx.strokeStyle = '#c99a3a';
      ctx.lineWidth = 2;
      for (let i = 0; i < 4; i += 1) {
        ctx.beginPath();
        ctx.moveTo(sx + 8, GROUND_Y - ob.height + 12 + i * 13);
        ctx.lineTo(sx + ob.width - 8, GROUND_Y - ob.height + 12 + i * 13);
        ctx.stroke();
      }
      if (world.nearestHay() && Math.abs(world.nearestHay().ob.x - ob.x) < 1 && world.farmer.mode !== 'search') {
        text(ctx, 'HIDE ↓', sx + ob.width / 2, GROUND_Y - ob.height - 12, 15, '#fff', 'center', '800');
      }
    } else if (ob.kind === 'oven') {
      ctx.fillStyle = PALETTE.ovenBody;
      roundRect(ctx, sx, GROUND_Y - ob.height, ob.width, ob.height, 8);
      ctx.fill();
      ctx.fillStyle = '#2b2b33';
      roundRect(ctx, sx + 10, GROUND_Y - 66, ob.width - 20, 52, 6);
      ctx.fill();
      // Fire glowing in the oven door.
      const flicker = 0.7 + Math.sin(world.time * 9 + ob.x) * 0.3;
      ctx.fillStyle = `rgba(255, 122, 26, ${flicker})`;
      roundRect(ctx, sx + 16, GROUND_Y - 60, ob.width - 32, 40, 4);
      ctx.fill();
      ctx.fillStyle = '#ffd23e';
      ellipse(ctx, sx + ob.width / 2, GROUND_Y - 40, 12, 8 + flicker * 4);
      ctx.fillStyle = '#c9c9d4';
      ctx.fillRect(sx + 8, GROUND_Y - ob.height - 4, ob.width - 16, 6);
      text(ctx, 'HOT!', sx + ob.width / 2, GROUND_Y - ob.height - 12, 15, '#ff6b5e', 'center', '900');
    }
  }
  // Falling carving knives, with a warning glint before they drop.
  for (const knife of world.knives) {
    const sx = knife.x - camX;
    if (sx < -80 || sx > CANVAS_W + 80) continue;
    if (knife.warn > 0) {
      const pulse = 0.5 + Math.sin(world.time * 18) * 0.5;
      ctx.fillStyle = `rgba(255, 210, 62, ${0.4 + pulse * 0.5})`;
      ellipse(ctx, sx + 13, GROUND_Y - 6, 22, 6);
      text(ctx, '!', sx + 13, GROUND_Y - 30, 26, '#ff6b5e', 'center', '900');
    } else if (knife.falling) {
      ctx.save();
      ctx.translate(sx + 13, knife.y + 60);
      ctx.rotate(Math.PI);
      ctx.fillStyle = PALETTE.knifeHandle;
      ctx.fillRect(-5, -58, 10, 20);
      ctx.fillStyle = PALETTE.knifeSteel;
      ctx.beginPath();
      ctx.moveTo(-7, -38);
      ctx.lineTo(7, -38);
      ctx.lineTo(0, 58);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }
}

function drawPickups(ctx, world) {
  for (const pk of world.pickups) {
    if (pk.taken) continue;
    const sx = pk.x - world.camX;
    if (sx < -60 || sx > CANVAS_W + 60) continue;
    const bobY = pk.y + Math.sin(pk.bob * 3) * 4;
    if (pk.kind === 'corn') {
      ctx.fillStyle = '#7da23c';
      ctx.beginPath();
      ctx.moveTo(sx - 8, bobY + 16);
      ctx.lineTo(sx, bobY - 14);
      ctx.lineTo(sx + 8, bobY + 16);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = PALETTE.cornYellow;
      ellipse(ctx, sx, bobY, 9, 15);
      ctx.fillStyle = '#e8a13c';
      ellipse(ctx, sx - 3, bobY - 4, 2, 2);
      ellipse(ctx, sx + 3, bobY + 4, 2, 2);
    } else {
      ctx.fillStyle = '#fff3c4';
      ctx.save();
      ctx.translate(sx, bobY);
      ctx.rotate(Math.sin(pk.bob * 2) * 0.3);
      ellipse(ctx, 0, 0, 7, 16);
      ctx.restore();
      ctx.fillStyle = '#ffd23e';
      ellipse(ctx, sx, bobY - 12, 3, 4);
    }
  }
  for (const p of world.particles) {
    ctx.globalAlpha = Math.max(0, p.ttl / p.max);
    ctx.fillStyle = p.color;
    ellipse(ctx, p.x - world.camX, p.y, p.size, p.size);
  }
  ctx.globalAlpha = 1;
}

// --- HUD and screens ------------------------------------------------------

function drawHud(ctx, world) {
  // Top bar.
  ctx.fillStyle = 'rgba(43, 24, 8, 0.55)';
  roundRect(ctx, 16, 14, 560, 64, 12);
  ctx.fill();
  text(ctx, `SCORE ${world.score}`, 34, 44, 26, '#ffe9a8');
  text(ctx, `${Math.floor(world.distanceM)} m`, 240, 44, 26, '#ffffff');
  text(ctx, STAGES[world.stageIndex].name, 380, 44, 20, '#ffd23e');
  text(ctx, `BEST ${Math.max(world.best, world.score)}`, 34, 68, 15, '#ffe9a8', 'left', '600');

  // Lives as hearts, top right.
  ctx.fillStyle = 'rgba(43, 24, 8, 0.55)';
  roundRect(ctx, CANVAS_W - 196, 14, 180, 64, 12);
  ctx.fill();
  for (let i = 0; i < MAX_LIVES; i += 1) {
    const x = CANVAS_W - 168 + i * 52;
    const y = 46;
    ctx.fillStyle = i < world.lives ? '#ff5a4e' : 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.moveTo(x, y + 8);
    ctx.bezierCurveTo(x - 16, y - 8, x - 6, y - 20, x, y - 8);
    ctx.bezierCurveTo(x + 6, y - 20, x + 16, y - 8, x, y + 8);
    ctx.fill();
  }
  text(ctx, 'LIVES', CANVAS_W - 178, 68, 13, '#ffe9a8', 'left', '700');

  // The farmer meter: how close he is, bottom left.
  const gap = Math.max(0, Math.min(520, world.gap()));
  const danger = 1 - gap / 520;
  ctx.fillStyle = 'rgba(43, 24, 8, 0.55)';
  roundRect(ctx, 16, CANVAS_H - 56, 300, 40, 10);
  ctx.fill();
  text(ctx, 'FARMER', 30, CANVAS_H - 30, 15, '#ffe9a8', 'left', '800');
  ctx.fillStyle = danger > 0.66 ? '#ff5a4e' : danger > 0.33 ? '#ffb347' : '#7da23c';
  roundRect(ctx, 108, CANVAS_H - 46, 180 * danger + 4, 20, 6);
  ctx.fill();
  if (world.farmer.mode === 'search') {
    text(ctx, 'He lost you!', 330, CANVAS_H - 30, 16, '#ffe9a8', 'left', '700');
  }

  // Banners in the middle of the screen.
  world.banners.forEach((b, i) => {
    const alpha = Math.min(1, (b.ttl / b.max) * 2);
    ctx.globalAlpha = alpha;
    text(ctx, b.text, CANVAS_W / 2, 150 + i * 44, 34, b.color, 'center', '900');
    ctx.globalAlpha = 1;
  });

  // The farmer, off-screen left, gets a warning arrow.
  const fx = world.farmer.x - world.camX;
  if (fx < -40 && world.farmer.mode !== 'search') {
    const pulse = 0.6 + Math.sin(world.time * 8) * 0.4;
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#ff5a4e';
    ctx.beginPath();
    ctx.moveTo(28, CANVAS_H / 2 - 14);
    ctx.lineTo(52, CANVAS_H / 2);
    ctx.lineTo(28, CANVAS_H / 2 + 14);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(43, 24, 8, 0.82)';
  roundRect(ctx, x, y, w, h, 18);
  ctx.fill();
  ctx.strokeStyle = '#ffd23e';
  ctx.lineWidth = 3;
  ctx.stroke();
}

export function drawTitle(ctx, world) {
  outlinedText(ctx, "GOBBLE'S GREAT ESCAPE", CANVAS_W / 2, 118, 58, '#fff3c4');
  outlinedText(ctx, 'One turkey. One farmer. One Thanksgiving dinner to dodge.', CANVAS_W / 2, 158, 22, '#ffffff', 'center', '600');
  // The hero turkey, big, centre stage on a hay bale. Drawn in the same
  // local coordinates as the in-game turkey (feet at y = 0), scaled up.
  ctx.fillStyle = PALETTE.hayGold;
  roundRect(ctx, CANVAS_W / 2 - 190, 470, 380, 74, 16);
  ctx.fill();
  ctx.save();
  ctx.translate(CANVAS_W / 2, 470);
  ctx.scale(2.1, 2.1);
  ctx.fillStyle = PALETTE.turkeyDark;
  for (let i = -2; i <= 2; i += 1) {
    ctx.save();
    ctx.translate(-26, -58);
    ctx.rotate(-0.5 + i * 0.28);
    ellipse(ctx, 0, -24, 10, 28);
    ctx.restore();
  }
  ctx.fillStyle = PALETTE.turkeyBrown;
  ellipse(ctx, 0, -40, 34, 30);
  ctx.fillStyle = PALETTE.turkeyCream;
  ellipse(ctx, 6, -30, 20, 14);
  ctx.fillStyle = PALETTE.turkeyDark;
  ellipse(ctx, -4, -42, 20, 12);
  ctx.fillStyle = PALETTE.turkeyBrown;
  ctx.fillRect(16, -78, 12, 30);
  ctx.fillStyle = PALETTE.turkeyCream;
  ellipse(ctx, 26, -82, 15, 13);
  ctx.fillStyle = '#f2a541';
  ctx.beginPath();
  ctx.moveTo(38, -86);
  ctx.lineTo(54, -80);
  ctx.lineTo(38, -76);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#d9382b';
  ellipse(ctx, 30, -70, 5, 8);
  ctx.fillStyle = '#1d1d1d';
  ellipse(ctx, 30, -86, 2.6, 2.6);
  ctx.restore();

  panel(ctx, CANVAS_W / 2 - 330, 590, 660, 96);
  const blink = Math.floor(world.time * 1.6) % 2 === 0;
  if (blink) text(ctx, 'PRESS SPACE OR CLICK TO RUN', CANVAS_W / 2, 632, 26, '#ffd23e', 'center', '900');
  text(ctx, 'SPACE / ↑ jump    ↓ hide behind hay    ← → pace    M mute    P pause', CANVAS_W / 2, 664, 16, '#fff', 'center', '600');
  if (world.best > 0) text(ctx, `BEST SCORE ${world.best}`, CANVAS_W / 2, 196, 20, '#ffe9a8', 'center', '700');
}

export function drawEnd(ctx, world) {
  const escaped = world.escaped;
  ctx.fillStyle = 'rgba(43, 24, 8, 0.45)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  panel(ctx, CANVAS_W / 2 - 360, 130, 720, 420);
  if (escaped) {
    text(ctx, 'YOU ESCAPED!', CANVAS_W / 2, 210, 56, '#ffd23e', 'center', '900');
    text(ctx, 'The turkey lives to gobble another day.', CANVAS_W / 2, 252, 22, '#fff', 'center', '600');
    text(ctx, 'Thanksgiving dinner is cancelled — this year, anyway.', CANVAS_W / 2, 282, 18, '#ffe9a8', 'center', '600');
  } else {
    text(ctx, 'CAUGHT!', CANVAS_W / 2, 210, 56, '#ff6b5e', 'center', '900');
    text(ctx, 'The farmer finally got his Thanksgiving dinner.', CANVAS_W / 2, 252, 22, '#fff', 'center', '600');
    text(ctx, 'The turkey fought bravely. The gravy boat did not.', CANVAS_W / 2, 282, 18, '#ffe9a8', 'center', '600');
  }
  text(ctx, `SCORE  ${world.score}`, CANVAS_W / 2, 350, 30, '#fff', 'center', '800');
  text(ctx, `Distance ${Math.floor(world.distanceM)} m   •   Corn ${world.cornCollected}   •   Feathers ${world.feathersCollected}`, CANVAS_W / 2, 392, 20, '#ffe9a8', 'center', '600');
  text(ctx, `Stumbles ${world.stumbles}   •   Hides ${world.hides}   •   Time ${Math.floor(world.time)} s`, CANVAS_W / 2, 422, 20, '#ffe9a8', 'center', '600');
  const blink = Math.floor(world.time * 1.6) % 2 === 0;
  if (blink) text(ctx, 'PRESS R OR CLICK TO RUN AGAIN', CANVAS_W / 2, 496, 26, '#ffd23e', 'center', '900');
}

export function drawPaused(ctx) {
  ctx.fillStyle = 'rgba(43, 24, 8, 0.5)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  text(ctx, 'PAUSED', CANVAS_W / 2, CANVAS_H / 2, 54, '#fff3c4', 'center', '900');
  text(ctx, 'Press P to keep running', CANVAS_W / 2, CANVAS_H / 2 + 44, 20, '#fff', 'center', '600');
}

// --- the frame ------------------------------------------------------------

export function render(ctx, world, screen, paused) {
  world.camX = Math.max(0, world.player.x - 260);
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  drawSky(ctx, world.stageIndex, world.camX);
  if (world.stageIndex === 2) {
    // Kitchen walls rise behind the playfield in the last stage: a rail of
    // copper pans and a window onto the farm, kept clear of the HUD corners.
    ctx.fillStyle = PALETTE.kitchenWall;
    ctx.fillRect(0, 0, CANVAS_W, 210);
    ctx.fillStyle = '#f2e3c6';
    ctx.fillRect(0, 210, CANVAS_W, 10);
    // The pan rail.
    ctx.fillStyle = '#8a6a45';
    ctx.fillRect(60, 100, 340, 8);
    for (let i = 0; i < 4; i += 1) {
      const px = 100 + i * 85;
      ctx.strokeStyle = '#8a6a45';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(px, 108);
      ctx.lineTo(px, 126);
      ctx.stroke();
      ctx.fillStyle = i % 2 ? '#b87333' : '#8c5a2b';
      ctx.beginPath();
      ctx.arc(px, 154, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.beginPath();
      ctx.arc(px - 8, 146, 8, 0, Math.PI * 2);
      ctx.fill();
    }
    // The window onto the farm.
    ctx.fillStyle = '#7da23c';
    ctx.fillRect(620, 60, 300, 110);
    ctx.fillStyle = '#a8d06a';
    ctx.fillRect(640, 80, 260, 70);
    text(ctx, 'FARM', 770, 130, 30, '#3a5a1e', 'center', '800');
  }
  drawGround(ctx, world.stageIndex, world.camX);
  drawPickups(ctx, world);
  drawObstacles(ctx, world);
  // On the title screen the hero turkey is the star; the world turkey and
  // the farmer stay out of the way so there is only one turkey in the frame.
  if (screen !== 'title') {
    drawTurkey(ctx, world);
    drawFarmer(ctx, world);
  }
  if (screen === 'play') drawHud(ctx, world);
  if (screen === 'title') drawTitle(ctx, world);
  if (screen === 'over') drawEnd(ctx, world);
  if (paused) drawPaused(ctx);
}
