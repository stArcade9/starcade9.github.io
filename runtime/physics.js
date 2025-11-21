// runtime/physics.js
import { aabb } from './collision.js';

export function physicsApi() {
  const bodies = new Set();
  let gravity = 500; // px/s^2
  let tileSize = 8;
  let solidFn = (tx,ty)=>false;

  function setGravity(g){ gravity = g; }
  function setTileSize(ts){ tileSize = ts|0; }
  function setTileSolidFn(fn){ solidFn = fn; }

  function createBody(x,y,w,h, opts={}) {
    const b = Object.assign({ x,y,w,h, vx:0, vy:0, restitution:0, friction:0.9, onGround:false }, opts);
    bodies.add(b);
    return b;
  }
  function destroyBody(b){ bodies.delete(b); }

  function _isSolidAt(x,y){
    const tx = Math.floor(x/tileSize), ty = Math.floor(y/tileSize);
    return solidFn(tx,ty);
  }

  function _sweepAABB(b, dt) {
    // Integrate velocity
    b.vy += gravity * dt;
    let nx = b.x + b.vx * dt;
    let ny = b.y + b.vy * dt;
    b.onGround = false;

    // Resolve X axis
    const xdir = Math.sign(b.vx);
    if (xdir !== 0) {
      const ahead = xdir > 0 ? (nx + b.w) : nx;
      const top = Math.floor(b.y / tileSize);
      const bottom = Math.floor((b.y + b.h - 1) / tileSize);
      for (let ty = top; ty <= bottom; ty++) {
        const tx = Math.floor(ahead / tileSize);
        if (solidFn(tx, ty)) {
          if (xdir > 0) nx = tx*tileSize - b.w - 0.01;
          else nx = (tx+1)*tileSize + 0.01;
          b.vx = -b.vx * b.restitution;
          break;
        }
      }
    }

    // Resolve Y axis
    const ydir = Math.sign(b.vy);
    if (ydir !== 0) {
      const ahead = ydir > 0 ? (ny + b.h) : ny;
      const left = Math.floor(nx / tileSize);
      const right = Math.floor((nx + b.w - 1) / tileSize);
      for (let tx = left; tx <= right; tx++) {
        const ty = Math.floor(ahead / tileSize);
        if (solidFn(tx, ty)) {
          if (ydir > 0) {
            ny = ty*tileSize - b.h - 0.01;
            b.onGround = true;
          } else {
            ny = (ty+1)*tileSize + 0.01;
          }
          b.vy = -b.vy * b.restitution;
          break;
        }
      }
    }

    // Friction on ground
    if (b.onGround) b.vx *= b.friction;

    b.x = nx; b.y = ny;
  }

  function step(dt) {
    for (const b of bodies) _sweepAABB(b, dt);
  }

  return {
    exposeTo(target) {
      Object.assign(target, {
        createBody, destroyBody, stepPhysics: step, setGravity, setTileSize, setTileSolidFn
      });
    }
  };
}
