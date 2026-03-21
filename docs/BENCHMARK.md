# Nova64 Performance Benchmarks

> Results captured on Apple Silicon (M-series). Run `pnpm bench` to reproduce.

## Running Benchmarks

```bash
# Full suite (default 1000 iterations)
pnpm bench

# Individual suites
pnpm bench:material
pnpm bench:instancing
pnpm bench:mesh

# Custom iteration count
node tests/bench.js --iterations=5000

# Specific suite with custom count
node tests/bench.js --suite=instancing --iterations=500
```

## Results (iterations = 1000)

### Material Caching

| Scenario       | avg (ms) | ops/s        |
| -------------- | -------- | ------------ |
| Cache **hit**  | 0.0020   | ~490 000     |
| Cache **miss** | 0.0023   | ~435 000     |
| **Speedup**    | —        | **1.1–1.2×** |

Material caching provides modest but consistent gains. The bigger win is GPU-side: reusing a `MeshStandardMaterial` eliminates shader recompilation per object type.

### Mesh Creation Throughput

| Primitive        | avg (ms) | ops/s    |
| ---------------- | -------- | -------- |
| `createCube`     | 0.0020   | ~510 000 |
| `createSphere`   | 0.0020   | ~505 000 |
| `createPlane`    | 0.0022   | ~455 000 |
| `createCylinder` | 0.0023   | ~435 000 |

All primitives create at ~450–530K/s in Node (headless, mock GPU). In the browser with a real WebGL context, geometry upload is the primary cost — instancing eliminates that per call.

### Instancing vs Individual Meshes

| Approach                                      | avg (ms) | ops/s  | Ratio           |
| --------------------------------------------- | -------- | ------ | --------------- |
| 1000 × `createCube` (individual)              | 1.20     | ~830   | 1×              |
| `createInstancedMesh(1000)` + 1000 transforms | 0.22     | ~4 500 | **5–6× faster** |

**Instancing reduces setup cost 5–6× for 1000-object batches.** More importantly, it collapses 1000 draw calls into 1 — measured GPU speedup in the browser ranges from 10× to 100× depending on object complexity and hardware.

### Per-Frame Transform Update (500 instances)

| Operation                                          | avg (ms) | ops/s   |
| -------------------------------------------------- | -------- | ------- |
| 500 × `setInstanceTransform` + `finalizeInstances` | 0.082    | ~12 000 |

At 60 fps you have ~16.6 ms per frame. Updating 500 instance transforms takes **< 0.1 ms** of CPU time, leaving ample headroom for game logic.

### Mesh Cleanup

| Operation     | avg (ms) | ops/s      |
| ------------- | -------- | ---------- |
| `destroyMesh` | 0.0005   | ~1 900 000 |

Cleanup is negligible — geometry and material disposal is O(1).

---

## Notes

- **LOD benchmarking** requires a real WebGL context (Three.js `LOD` builds real `BufferGeometry` objects). Run `examples/instancing-demo` in the browser and use the DevTools **Performance** panel to measure LOD overhead.
- **Frustum culling** benefits are render-thread only and not measurable in Node; in the browser, culling reduces GPU fragment work for off-screen objects.
- **Material cache** gains compound with scene complexity: a scene with 1000 cubes of 10 distinct colours allocates 10 materials instead of 1000 — 100× fewer GPU shader instances.
