// runtime/collision.js
export function aabb(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}
export function circle(ax, ay, ar, bx, by, br) {
  const dx = ax-bx, dy = ay-by;
  return (dx*dx + dy*dy) <= (ar+br)*(ar+br);
}

// DDA raycast against a tilemap; tileFn(tx,ty)->boolean solid
export function raycastTilemap(x0, y0, dx, dy, maxDist, tileSize, tileFn) {
  let t = 0;
  const stepX = Math.sign(dx) || 1;
  const stepY = Math.sign(dy) || 1;
  const invDx = dx !== 0 ? 1/dx : 1e9;
  const invDy = dy !== 0 ? 1/dy : 1e9;
  let tx = Math.floor(x0/tileSize);
  let ty = Math.floor(y0/tileSize);
  const nextBoundary = (p, dp, s) => {
    const grid = (s>0) ? (Math.floor(p/tileSize)+1)*tileSize : (Math.floor(p/tileSize))*tileSize;
    return (grid - p) * (dp !== 0 ? 1/dp : 1e9);
  };
  let tMaxX = nextBoundary(x0, dx, stepX);
  let tMaxY = nextBoundary(y0, dy, stepY);
  const tDeltaX = Math.abs(tileSize * invDx);
  const tDeltaY = Math.abs(tileSize * invDy);

  if (tileFn(tx,ty)) return { hit:true, tx, ty, t:0, x:x0, y:y0 };

  while (t <= maxDist) {
    if (tMaxX < tMaxY) {
      t = tMaxX; tMaxX += tDeltaX; tx += stepX;
    } else {
      t = tMaxY; tMaxY += tDeltaY; ty += stepY;
    }
    const x = x0 + dx * t;
    const y = y0 + dy * t;
    if (tileFn(tx,ty)) return { hit:true, tx,ty, t, x, y };
  }
  return { hit:false };
}
