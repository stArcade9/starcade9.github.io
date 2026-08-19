// camera-platformer — side-scrolling platformer using cam2DFollow
// Shows: createCamera2D, cam2DFollow, cam2DApply, cam2DReset, 2D parallax layers

const { cls, line, print, rectfill, screenHeight, screenWidth } = nova64.draw;
const { cam2DFollow, createCamera2D } = nova64.camera;
const { key, keyp } = nova64.input;
const { color } = nova64.util;

let W = 640,
  H = 360;
const GRAVITY = 500; // px/s²
const JUMP_VEL = -280;
const RUN_SPD = 130;
const TILE = 20;

// World geometry: rows of tile data
const MAP_WIDTH = 60; // tiles
const MAP_HEIGHT = 12;
const MAP = (() => {
  const m = Array.from({ length: MAP_HEIGHT }, () => Array(MAP_WIDTH).fill(0));
  // Ground row
  for (let x = 0; x < MAP_WIDTH; x++) m[MAP_HEIGHT - 1][x] = 1;
  // Platforms
  const platforms = [
    [5, 8, 8],
    [15, 6, 10],
    [28, 9, 5],
    [36, 7, 8],
    [44, 8, 6],
    [52, 5, 6],
  ];
  for (const [tx, ty, tw] of platforms) {
    for (let x = tx; x < tx + tw; x++) m[ty][x] = 1;
  }
  // Gaps / pits
  for (let x = 20; x < 25; x++) m[MAP_HEIGHT - 1][x] = 0;
  return m;
})();

let cam;
let player, vx, vy, onGround;

function _tileAt(tx, ty) {
  if (tx < 0 || tx >= MAP_WIDTH || ty < 0 || ty >= MAP_HEIGHT) return 0;
  return MAP[ty][tx];
}

function _drawFlag(wx, wy, color) {
  line(wx, wy, wx, wy - 30, 0xffffff);
  rectfill(wx + 1, wy - 30, 14, 10, color);
}

export function init() {
  W = typeof screenWidth === 'function' ? screenWidth() : 640;
  H = typeof screenHeight === 'function' ? screenHeight() : 360;
  cam = createCamera2D({ screenW: W, screenH: H });
  cam.zoom = 1;

  player = { x: 40, y: 120, w: 12, h: 18 };
  vx = 0;
  vy = 0;
  onGround = false;
}

export function update(dt) {
  // Input
  const left = key('ArrowLeft') || key('KeyA');
  const right = key('ArrowRight') || key('KeyD');
  const jump = keyp('ArrowUp') || keyp('KeyW') || keyp('Space');

  vx = 0;
  if (left) vx = -RUN_SPD;
  if (right) vx = RUN_SPD;

  if (jump && onGround) vy = JUMP_VEL;

  vy += GRAVITY * dt;

  // Move + collide
  player.x += vx * dt;
  player.y += vy * dt;

  onGround = false;
  // Tile collision (simple AABB sweep)
  const tx0 = Math.floor(player.x / TILE);
  const tx1 = Math.floor((player.x + player.w - 1) / TILE);
  const ty0 = Math.floor(player.y / TILE);
  const ty1 = Math.floor((player.y + player.h - 1) / TILE);

  for (let ty = ty0; ty <= ty1; ty++) {
    for (let tx = tx0; tx <= tx1; tx++) {
      if (_tileAt(tx, ty)) {
        // Resolve — push out of the tile
        const tileLeft = tx * TILE;
        const tileRight = tileLeft + TILE;
        const tileTop = ty * TILE;
        const tileBottom = tileTop + TILE;

        const overlapL = player.x + player.w - tileLeft;
        const overlapR = tileRight - player.x;
        const overlapT = player.y + player.h - tileTop;
        const overlapB = tileBottom - player.y;
        const minV = Math.min(overlapL, overlapR, overlapT, overlapB);

        if (minV === overlapT && vy >= 0) {
          player.y = tileTop - player.h;
          vy = 0;
          onGround = true;
        } else if (minV === overlapB && vy < 0) {
          player.y = tileBottom;
          vy = 0;
        } else if (minV === overlapL) {
          player.x = tileLeft - player.w;
        } else if (minV === overlapR) {
          player.x = tileRight;
        }
      }
    }
  }

  // Clamp to world
  player.x = Math.max(0, Math.min(MAP_WIDTH * TILE - player.w, player.x));
  if (player.y > MAP_HEIGHT * TILE) {
    player.y = 0;
    vy = 0;
    player.x = 40;
  }

  // Camera follow
  cam2DFollow(cam, player.x + player.w / 2, player.y + player.h / 2, dt, {
    stiffness: 5,
    minX: W / 2,
    maxX: MAP_WIDTH * TILE - W / 2,
    minY: H / 2,
    maxY: MAP_HEIGHT * TILE - H / 2,
  });
}

export function draw() {
  cls(0x87ceeb); // sky

  // Parallax mountains (layer 1 — moves at 0.3x camera)
  const camOffX = cam.x - W / 2;
  for (let mx = -40; mx < MAP_WIDTH * TILE + 40; mx += 70) {
    const px = mx - camOffX * 0.3;
    const mh = 40 + ((mx * 37) % 35);
    for (let i = 0; i < 70; i++) {
      const fh = mh * Math.max(0, 1 - Math.abs(i - 35) / 35);
      rectfill(px + i, H - MAP_HEIGHT * TILE - fh, 1, fh, 0x6699aa);
    }
  }

  // Parallax trees (layer 2 — 0.6x)
  for (let tx = 0; tx < MAP_WIDTH * TILE; tx += 30) {
    const px = tx - camOffX * 0.6;
    if (px < -20 || px > W + 20) continue;
    rectfill(px + 10, H - MAP_HEIGHT * TILE - 22, 5, 22, 0x5a3e28);
    ellipsefill(px + 12, H - MAP_HEIGHT * TILE - 30, 22, 22, 0x3a7a3a);
  }

  // Apply camera transform for world-space drawing
  cam2DApply(cam);

  // Draw tilemap
  for (let ty = 0; ty < MAP_HEIGHT; ty++) {
    for (let tx = 0; tx < MAP_WIDTH; tx++) {
      if (MAP[ty][tx]) {
        const wx = tx * TILE,
          wy = ty * TILE;
        rectfill(wx, wy, TILE, TILE, 0x5a8a3a);
        rectfill(wx, wy, TILE, 4, 0x78c850);
        rectfill(wx + 1, wy + 4, TILE - 2, 1, 0x3d6a28);
      }
    }
  }

  // Flags / goals
  _drawFlag(MAP_WIDTH * TILE - 30, MAP_HEIGHT * TILE - TILE, 0xff4444);

  // Player
  rectfill(player.x, player.y, player.w, player.h, 0xff8844);
  rectfill(player.x + 2, player.y + 2, 4, 4, 0xffd0a0); // face
  rectfill(player.x + 3, player.y + 3, 1, 1, 0x000000); // eye

  cam2DReset(cam);

  // HUD
  print('CAMERA PLATFORMER', 4, 4, 0x000000);
  print('Arrow/WASD + Space to jump', 4, H - 12, 0x33557799);
}
