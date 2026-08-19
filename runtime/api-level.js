// runtime/api-level.js
// nova64.level — grid-driven dungeon / tile-map level builder.
//
// Generalises the pattern used in `examples/indie-odyssey/code.js`
// (buildLevel + getCurrentMap + isWall + cellToWorld + getSpecialLocations)
// into a reusable engine API. Carts pass a 2D grid + tile definitions + an
// optional list of "special" locations; the engine creates the meshes,
// lights, and exposes a handle for queries and cleanup.
//
// Usage:
//   const level = nova64.level.fromGrid({
//     grid: [
//       [1, 1, 1, 1, 1],
//       [1, 0, 0, 0, 1],
//       [1, 0, 0, 0, 1],
//       [1, 0, 0, 0, 1],
//       [1, 1, 1, 1, 1],
//     ],
//     tileSize: 1,
//     origin: [0, 0, 0],
//     tiles: {
//       1: {  // wall
//         type: 'wall',
//         color: 0x10051c,
//         height: 2,
//         emissive: 0x00aaff,
//         emissiveIntensity: 0.3,
//       },
//       0: {  // floor + ceiling
//         type: 'open',
//         floorColor: 0x07010d,
//         ceilingColor: 0x1f4f9a,
//         floorEmissive: 0x0de7ff,
//         floorEmissiveIntensity: 0.15,
//       },
//     },
//     specials: [
//       { x: 2, z: 2, type: 'portal', color: 0xff00cc, model: 'portal.glb',
//         light: { color: 0xff00cc, intensity: 1.2 }, name: 'Level Portal' },
//     ],
//   });
//
//   level.isWall(x, z);             // grid coordinate lookup
//   level.cellToWorld(x, z);        // → { x, y, z } in world space
//   level.specialAt(x, z);          // → spec entry or null
//   level.size;                     // { w, h }
//   level.meshes;                   // array of created mesh ids (walls + floors)
//   level.specialMeshes;            // array of special-location mesh ids
//   level.lights;                   // array of light ids
//
//   // On cart cleanup / level change:
//   level.destroy();
//
// The level API is intentionally backend-agnostic — it routes everything
// through `nova64.scene.*` and `nova64.light.*` so any backend that
// implements the core primitives gets level support for free.

function getApi(target, path) {
  const parts = path.split('.');
  let cur = target;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}

export function levelApi(/* gpu */) {
  // Levels are owned by the cart — we don't hold references after the cart
  // calls destroy(). The factory returns handles that close over their own
  // mesh / light lists.

  function fromGrid(opts = {}) {
    const nova64 = globalThis.nova64;
    if (!nova64?.scene) {
      // eslint-disable-next-line no-console
      console.warn('[nova64.level] nova64.scene API not available');
      return makeEmptyHandle();
    }

    const grid = opts.grid;
    if (!Array.isArray(grid) || grid.length === 0 || !Array.isArray(grid[0])) {
      // eslint-disable-next-line no-console
      console.warn('[nova64.level] grid must be a non-empty 2D array');
      return makeEmptyHandle();
    }

    const tileSize = typeof opts.tileSize === 'number' && opts.tileSize > 0 ? opts.tileSize : 1;
    const origin = Array.isArray(opts.origin) && opts.origin.length >= 3 ? opts.origin : [0, 0, 0];
    const tiles = opts.tiles || {};
    const specials = Array.isArray(opts.specials) ? opts.specials : [];

    const h = grid.length;
    const w = grid[0].length;

    const meshes = [];
    const specialMeshes = [];
    const specialsByCell = new Map(); // 'x,z' -> spec
    const lights = [];

    function key(x, z) {
      return x + ',' + z;
    }

    function cellToWorld(x, z) {
      return {
        x: origin[0] + (x - (w - 1) / 2) * tileSize,
        y: origin[1],
        z: origin[2] + (z - (h - 1) / 2) * tileSize,
      };
    }

    function spawnWall(spec, x, z, p) {
      const height = typeof spec.height === 'number' ? spec.height : 2;
      const wallW = typeof spec.width === 'number' ? spec.width : tileSize;
      const wallD = typeof spec.depth === 'number' ? spec.depth : tileSize;
      const id = nova64.scene.createCube(
        wallW,
        height,
        wallD,
        spec.color ?? 0x222244,
        [p.x, p.y + height / 2, p.z],
        spec.options || {}
      );
      if (id != null && id !== false) {
        if (spec.emissive != null && typeof nova64.scene.setMeshEmissive === 'function') {
          nova64.scene.setMeshEmissive(id, spec.emissive, spec.emissiveIntensity ?? 0.25);
        }
        meshes.push(id);
      }
      return id;
    }

    function spawnOpen(spec, x, z, p) {
      const floorY = p.y - 0.001;
      const ceilingHeight = typeof spec.ceilingHeight === 'number' ? spec.ceilingHeight : 2;
      if (spec.floorColor != null) {
        const fid = nova64.scene.createPlane(tileSize, tileSize, spec.floorColor, [
          p.x,
          floorY,
          p.z,
        ]);
        if (fid != null && fid !== false) {
          if (spec.floorEmissive != null && typeof nova64.scene.setMeshEmissive === 'function') {
            nova64.scene.setMeshEmissive(
              fid,
              spec.floorEmissive,
              spec.floorEmissiveIntensity ?? 0.15
            );
          }
          meshes.push(fid);
        }
      }
      if (spec.ceilingColor != null) {
        const cid = nova64.scene.createPlane(tileSize, tileSize, spec.ceilingColor, [
          p.x,
          p.y + ceilingHeight,
          p.z,
        ]);
        if (cid != null && cid !== false) {
          if (spec.ceilingEmissive != null && typeof nova64.scene.setMeshEmissive === 'function') {
            nova64.scene.setMeshEmissive(
              cid,
              spec.ceilingEmissive,
              spec.ceilingEmissiveIntensity ?? 0.1
            );
          }
          meshes.push(cid);
        }
      }
    }

    function spawnSpecial(spec, p) {
      let id = null;
      const color = spec.color ?? 0xffffff;
      const yOffset = typeof spec.yOffset === 'number' ? spec.yOffset : 1.0;
      const worldY = p.y + yOffset;
      switch (spec.shape || spec.type) {
        case 'portal':
        case 'torus':
          id = nova64.scene.createTorus?.(0.85, 0.18, color, [p.x, worldY, p.z]);
          if (id == null || id === false) {
            id = nova64.scene.createSphere(0.65, color, [p.x, worldY, p.z]);
          }
          break;
        case 'save_point':
        case 'cylinder':
          id = nova64.scene.createCylinder?.(0.45, 0.45, 1.4, color, [p.x, worldY, p.z]);
          if (id == null || id === false) {
            id = nova64.scene.createCube(0.6, 1.4, 0.6, color, [p.x, worldY, p.z]);
          }
          break;
        case 'treasure':
        case 'cube':
          id = nova64.scene.createCube(0.7, 0.7, 0.7, color, [p.x, worldY, p.z]);
          break;
        case 'cone':
          id = nova64.scene.createCone?.(0.5, 0.9, color, [p.x, worldY, p.z]);
          if (id == null || id === false) {
            id = nova64.scene.createCube(0.5, 0.9, 0.5, color, [p.x, worldY, p.z]);
          }
          break;
        case 'sphere':
        default:
          id = nova64.scene.createSphere(0.5, color, [p.x, worldY, p.z]);
          break;
      }
      if (id != null && id !== false) {
        if (spec.emissive != null && typeof nova64.scene.setMeshEmissive === 'function') {
          nova64.scene.setMeshEmissive(id, spec.emissive ?? color, spec.emissiveIntensity ?? 0.6);
        }
        specialMeshes.push(id);
        if (spec.model && typeof nova64.scene.loadModel === 'function') {
          const modelScale = typeof spec.modelScale === 'number' ? spec.modelScale : 0.6;
          const result = nova64.scene.loadModel(spec.model, [p.x, worldY - 0.4, p.z], modelScale);
          // loadModel can return a Promise or an id depending on backend; if
          // promise, hide the placeholder once the GLB lands.
          if (result && typeof result.then === 'function') {
            result
              .then(modelId => {
                if (modelId != null && modelId !== false) {
                  specialMeshes.push(modelId);
                  // Hide the placeholder cube/sphere now that the model is in.
                  if (typeof nova64.scene.setMeshVisible === 'function') {
                    nova64.scene.setMeshVisible(id, false);
                  }
                }
              })
              .catch(() => {});
          } else if (result != null && result !== false) {
            specialMeshes.push(result);
            if (typeof nova64.scene.setMeshVisible === 'function') {
              nova64.scene.setMeshVisible(id, false);
            }
          }
        }
        if (spec.light && nova64.light?.createPointLight) {
          const lc = spec.light;
          const lid = nova64.light.createPointLight(
            lc.color ?? color,
            lc.intensity ?? 1.0,
            lc.distance ?? 6,
            p.x,
            worldY + (lc.heightOffset ?? 0.4),
            p.z
          );
          if (lid != null && lid !== false) lights.push(lid);
        }
      }
      return id;
    }

    // ── Build pass ────────────────────────────────────────────────────────
    for (let z = 0; z < h; z++) {
      const row = grid[z];
      for (let x = 0; x < w; x++) {
        const tile = row[x];
        const spec = tiles[tile];
        if (!spec) continue;
        const p = cellToWorld(x, z);
        if (spec.type === 'wall') {
          spawnWall(spec, x, z, p);
        } else if (spec.type === 'open' || spec.type === 'floor') {
          spawnOpen(spec, x, z, p);
        } else if (typeof spec.spawn === 'function') {
          // Custom per-tile spawner — pass world position + tile metadata.
          try {
            const ids = spec.spawn(p, x, z, tile);
            if (Array.isArray(ids)) {
              for (const id of ids) {
                if (id != null && id !== false) meshes.push(id);
              }
            } else if (ids != null && ids !== false) {
              meshes.push(ids);
            }
          } catch (e) {
            // eslint-disable-next-line no-console
            console.error('[nova64.level] custom tile spawn threw:', e);
          }
        }
      }
    }

    for (const sp of specials) {
      if (sp == null) continue;
      const x = sp.x;
      const z = sp.z;
      if (typeof x !== 'number' || typeof z !== 'number') continue;
      const p = cellToWorld(x, z);
      specialsByCell.set(key(x, z), sp);
      spawnSpecial(sp, p);
    }

    // ── Returned handle ───────────────────────────────────────────────────
    const handle = {
      size: { w, h },
      tileSize,
      origin: origin.slice(),
      meshes,
      specialMeshes,
      lights,

      isWall(x, z) {
        if (x < 0 || z < 0 || x >= w || z >= h) return true;
        const tile = grid[z][x];
        return tiles[tile]?.type === 'wall';
      },

      tileAt(x, z) {
        if (x < 0 || z < 0 || x >= w || z >= h) return undefined;
        return grid[z][x];
      },

      cellToWorld,

      worldToCell(wx, wz) {
        return {
          x: Math.round((wx - origin[0]) / tileSize + (w - 1) / 2),
          z: Math.round((wz - origin[2]) / tileSize + (h - 1) / 2),
        };
      },

      specialAt(x, z) {
        return specialsByCell.get(key(x, z)) || null;
      },

      setMeshVisible(visible) {
        if (typeof nova64.scene.setMeshVisible !== 'function') return;
        for (const id of meshes) nova64.scene.setMeshVisible(id, visible);
        for (const id of specialMeshes) nova64.scene.setMeshVisible(id, visible);
      },

      setLightsVisible(visible) {
        const setVis = getApi(nova64, 'scene.setLightVisible');
        if (typeof setVis !== 'function') return;
        for (const id of lights) setVis(id, visible);
      },

      destroy() {
        for (const id of meshes) nova64.scene.destroyMesh?.(id);
        for (const id of specialMeshes) nova64.scene.destroyMesh?.(id);
        for (const id of lights) nova64.light?.removeLight?.(id);
        meshes.length = 0;
        specialMeshes.length = 0;
        lights.length = 0;
      },
    };

    return handle;
  }

  function makeEmptyHandle() {
    return {
      size: { w: 0, h: 0 },
      tileSize: 1,
      origin: [0, 0, 0],
      meshes: [],
      specialMeshes: [],
      lights: [],
      isWall: () => true,
      tileAt: () => undefined,
      cellToWorld: () => ({ x: 0, y: 0, z: 0 }),
      worldToCell: () => ({ x: 0, z: 0 }),
      specialAt: () => null,
      setMeshVisible: () => {},
      setLightsVisible: () => {},
      destroy: () => {},
    };
  }

  function exposeTo(target) {
    target.level = { fromGrid };
  }

  return { fromGrid, exposeTo };
}
