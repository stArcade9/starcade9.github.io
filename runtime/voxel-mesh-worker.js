/**
 * Nova64 Voxel Mesh Worker — Off-thread greedy meshing
 *
 * Receives padded chunk data (blocks + light + fluid + 1-block border)
 * plus pre-baked registry lookup arrays. Returns raw vertex attribute
 * arrays as Transferable for zero-copy handoff to the main thread.
 */

// ─── State (set via 'init' message) ─────────────────────────────────────
let solidArr, transparentArr, fluidArr, colorArr, textureFaceArr;
let CS = 16; // CHUNK_SIZE
let CH = 128; // CHUNK_HEIGHT
let ATLAS_COLS = 8;
let ATLAS_ROWS = 4;
let FLUID_MAX = 7;
const MAX_LIGHT = 15;

// ─── Constants ──────────────────────────────────────────────────────────
const FACE_DIRS = [
  { axis: 2, sign: 1, u: 0, v: 1 }, // +Z
  { axis: 2, sign: -1, u: 0, v: 1 }, // -Z
  { axis: 0, sign: 1, u: 2, v: 1 }, // +X
  { axis: 0, sign: -1, u: 2, v: 1 }, // -X
  { axis: 1, sign: 1, u: 0, v: 2 }, // +Y
  { axis: 1, sign: -1, u: 0, v: 2 }, // -Y
];

const FACE_NORMALS = [
  [0, 0, 1],
  [0, 0, -1],
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
];

const aoScale = [0.4, 0.6, 0.8, 1.0];

// Per-vertex AO sampling offsets for each face direction (4 corners × 3 neighbors)
const aoOffsets = [
  // +Z face
  [
    [
      [-1, 0, 1],
      [0, -1, 1],
      [-1, -1, 1],
    ],
    [
      [1, 0, 1],
      [0, -1, 1],
      [1, -1, 1],
    ],
    [
      [1, 0, 1],
      [0, 1, 1],
      [1, 1, 1],
    ],
    [
      [-1, 0, 1],
      [0, 1, 1],
      [-1, 1, 1],
    ],
  ],
  // -Z face
  [
    [
      [1, 0, -1],
      [0, -1, -1],
      [1, -1, -1],
    ],
    [
      [-1, 0, -1],
      [0, -1, -1],
      [-1, -1, -1],
    ],
    [
      [-1, 0, -1],
      [0, 1, -1],
      [-1, 1, -1],
    ],
    [
      [1, 0, -1],
      [0, 1, -1],
      [1, 1, -1],
    ],
  ],
  // +X face
  [
    [
      [1, 0, 1],
      [1, -1, 0],
      [1, -1, 1],
    ],
    [
      [1, 0, -1],
      [1, -1, 0],
      [1, -1, -1],
    ],
    [
      [1, 0, -1],
      [1, 1, 0],
      [1, 1, -1],
    ],
    [
      [1, 0, 1],
      [1, 1, 0],
      [1, 1, 1],
    ],
  ],
  // -X face
  [
    [
      [-1, 0, -1],
      [-1, -1, 0],
      [-1, -1, -1],
    ],
    [
      [-1, 0, 1],
      [-1, -1, 0],
      [-1, -1, 1],
    ],
    [
      [-1, 0, 1],
      [-1, 1, 0],
      [-1, 1, 1],
    ],
    [
      [-1, 0, -1],
      [-1, 1, 0],
      [-1, 1, -1],
    ],
  ],
  // +Y face
  [
    [
      [-1, 1, 0],
      [0, 1, 1],
      [-1, 1, 1],
    ],
    [
      [1, 1, 0],
      [0, 1, 1],
      [1, 1, 1],
    ],
    [
      [1, 1, 0],
      [0, 1, -1],
      [1, 1, -1],
    ],
    [
      [-1, 1, 0],
      [0, 1, -1],
      [-1, 1, -1],
    ],
  ],
  // -Y face
  [
    [
      [-1, -1, 0],
      [0, -1, -1],
      [-1, -1, -1],
    ],
    [
      [1, -1, 0],
      [0, -1, -1],
      [1, -1, -1],
    ],
    [
      [1, -1, 0],
      [0, -1, 1],
      [1, -1, 1],
    ],
    [
      [-1, -1, 0],
      [0, -1, 1],
      [-1, -1, 1],
    ],
  ],
];

// ─── Helpers ────────────────────────────────────────────────────────────

function vertexAO(s1, s2, corner) {
  if (s1 && s2) return 0;
  return 3 - (s1 ? 1 : 0) - (s2 ? 1 : 0) - (corner ? 1 : 0);
}

function axisSize(a) {
  return a === 1 ? CH : CS;
}

// ─── Greedy Mesher ──────────────────────────────────────────────────────

function meshChunk(data) {
  const {
    blocks,
    skyLight,
    blockLight,
    fluidLevel,
    baseX,
    baseZ,
    enableAO,
    enableLighting,
    atlasEnabled,
    dayTimeFactor,
  } = data;

  // Padded dimensions
  const PW = CS + 2;
  const PD = CS + 2;

  // Index helpers (padded coords: chunk [0,CS) maps to padded [1,CS+1))
  function pBlock(x, y, z) {
    if (y < 0 || y >= CH) return 0; // AIR
    return blocks[x + 1 + (z + 1) * PW + y * PW * PD];
  }

  function pSkyLight(x, y, z) {
    if (y < 0 || y >= CH) return MAX_LIGHT;
    return skyLight[x + 1 + (z + 1) * PW + y * PW * PD];
  }

  function pBlockLight(x, y, z) {
    if (y < 0 || y >= CH) return 0;
    return blockLight[x + 1 + (z + 1) * PW + y * PW * PD];
  }

  function sampleLight(x, y, z) {
    if (y < 0 || y >= CH) return MAX_LIGHT;
    const sky = pSkyLight(x, y, z) * dayTimeFactor;
    const blk = pBlockLight(x, y, z);
    return Math.max(sky, blk);
  }

  function isOpaqueForAO(x, y, z) {
    if (y < 0 || y >= CH) return false;
    const id = blocks[x + 1 + (z + 1) * PW + y * PW * PD];
    return solidArr[id] === 1 && transparentArr[id] === 0;
  }

  function getFluid(x, y, z) {
    if (y < 0 || y >= CH || x < 0 || x >= CS || z < 0 || z >= CS) return 0;
    return fluidLevel[x + 1 + (z + 1) * PW + y * PW * PD];
  }

  // Output arrays (accumulated then converted to typed arrays)
  const opaqueVerts = [],
    opaqueNorms = [],
    opaqueColors = [],
    opaqueUvs = [],
    opaqueUv2s = [],
    opaqueIdx = [];
  let opaqueVCount = 0;
  const transVerts = [],
    transNorms = [],
    transColors = [],
    transUvs = [],
    transUv2s = [],
    transIdx = [];
  let transVCount = 0;

  // Mask buffers (reused per slice)
  const MAX_MASK = CH * CS;
  const mask = new Int32Array(MAX_MASK);
  const maskTrans = new Uint8Array(MAX_MASK);
  const maskFluidLvl = new Uint8Array(MAX_MASK);

  for (let faceIdx = 0; faceIdx < 6; faceIdx++) {
    const fd = FACE_DIRS[faceIdx];
    const normal = FACE_NORMALS[faceIdx];
    const sliceMax = axisSize(fd.axis);
    const uMax = axisSize(fd.u);
    const vMax = axisSize(fd.v);
    const maskSize = uMax * vMax;
    const aoOff = aoOffsets[faceIdx];

    for (let d = 0; d < sliceMax; d++) {
      // Build mask
      let hasFaces = false;
      for (let i = 0; i < maskSize; i++) {
        mask[i] = 0;
        maskTrans[i] = 0;
        maskFluidLvl[i] = 0;
      }

      for (let vi = 0; vi < vMax; vi++) {
        for (let ui = 0; ui < uMax; ui++) {
          // Map (axis=d, u=ui, v=vi) → (x,y,z)
          let x = 0,
            y = 0,
            z = 0;
          if (fd.axis === 0) x = d;
          else if (fd.axis === 1) y = d;
          else z = d;
          if (fd.u === 0) x = ui;
          else if (fd.u === 1) y = ui;
          else z = ui;
          if (fd.v === 0) x = vi;
          else if (fd.v === 1) y = vi;
          else z = vi;

          const blockType = pBlock(x, y, z);
          const mIdx = ui + vi * uMax;

          if (blockType === 0) {
            mask[mIdx] = 0;
            maskTrans[mIdx] = 0;
            continue;
          }

          // Neighbor in face direction
          const nx = x + normal[0],
            ny = y + normal[1],
            nz = z + normal[2];
          const neighborId = pBlock(nx, ny, nz);

          const blockIsTransparent = transparentArr[blockType] === 1;
          let showFace = false;
          if (blockIsTransparent) {
            if (neighborId === blockType) showFace = false;
            else if (solidArr[neighborId] === 1 && transparentArr[neighborId] === 0)
              showFace = false;
            else showFace = true;
          } else {
            showFace = solidArr[neighborId] === 0 || transparentArr[neighborId] === 1;
          }

          if (!showFace) {
            mask[mIdx] = 0;
            maskTrans[mIdx] = 0;
            continue;
          }

          // AO
          let aoKey = 0;
          if (enableAO) {
            for (let ci = 0; ci < 4; ci++) {
              const s1 = isOpaqueForAO(
                x + aoOff[ci][0][0],
                y + aoOff[ci][0][1],
                z + aoOff[ci][0][2]
              );
              const s2 = isOpaqueForAO(
                x + aoOff[ci][1][0],
                y + aoOff[ci][1][1],
                z + aoOff[ci][1][2]
              );
              const cn = isOpaqueForAO(
                x + aoOff[ci][2][0],
                y + aoOff[ci][2][1],
                z + aoOff[ci][2][2]
              );
              aoKey |= vertexAO(s1, s2, cn) << (ci * 2);
            }
          } else {
            aoKey = 0xff;
          }

          const faceLight = enableLighting ? Math.round(sampleLight(nx, ny, nz)) : MAX_LIGHT;

          mask[mIdx] =
            (blockType & 0xff) | ((aoKey & 0xff) << 8) | ((faceLight & 0xf) << 16) | (1 << 24);
          maskTrans[mIdx] = blockIsTransparent ? 1 : 0;
          if (fluidArr[blockType] === 1) {
            maskFluidLvl[mIdx] = getFluid(x, y, z) || FLUID_MAX;
          }
          hasFaces = true;
        }
      }

      if (!hasFaces) continue;

      // Greedy merge
      for (let vi = 0; vi < vMax; vi++) {
        for (let ui = 0; ui < uMax; ) {
          const mIdx = ui + vi * uMax;
          const key = mask[mIdx];
          if (key === 0) {
            ui++;
            continue;
          }
          const trans = maskTrans[mIdx];
          const flLvl = maskFluidLvl[mIdx];

          // Extend width
          let w = 1;
          while (
            ui + w < uMax &&
            mask[ui + w + vi * uMax] === key &&
            maskTrans[ui + w + vi * uMax] === trans &&
            maskFluidLvl[ui + w + vi * uMax] === flLvl
          )
            w++;

          // Extend height
          let h = 1;
          let canExtend = true;
          while (canExtend && vi + h < vMax) {
            for (let wu = 0; wu < w; wu++) {
              const ci = ui + wu + (vi + h) * uMax;
              if (mask[ci] !== key || maskTrans[ci] !== trans || maskFluidLvl[ci] !== flLvl) {
                canExtend = false;
                break;
              }
            }
            if (canExtend) h++;
          }

          // Clear merged region
          for (let dv = 0; dv < h; dv++)
            for (let du = 0; du < w; du++) mask[ui + du + (vi + dv) * uMax] = 0;

          // Decode face key
          const blockType = key & 0xff;
          const aoKey = (key >> 8) & 0xff;
          const faceLight = (key >> 16) & 0xf;
          const ao0 = aoKey & 3,
            ao1 = (aoKey >> 2) & 3,
            ao2 = (aoKey >> 4) & 3,
            ao3 = (aoKey >> 6) & 3;
          const lightBrightness = 0.05 + (faceLight / MAX_LIGHT) * 0.95;
          const blockColor = colorArr[blockType];

          // Build quad corners
          const slicePos = fd.sign > 0 ? d + 1 : d;
          let c0x = 0,
            c0y = 0,
            c0z = 0;
          let c1x = 0,
            c1y = 0,
            c1z = 0;
          let c2x = 0,
            c2y = 0,
            c2z = 0;
          let c3x = 0,
            c3y = 0,
            c3z = 0;

          if (fd.axis === 0) {
            c0x = c1x = c2x = c3x = slicePos;
          } else if (fd.axis === 1) {
            c0y = c1y = c2y = c3y = slicePos;
          } else {
            c0z = c1z = c2z = c3z = slicePos;
          }
          if (fd.u === 0) {
            c0x = ui;
            c1x = ui + w;
            c2x = ui + w;
            c3x = ui;
          } else if (fd.u === 1) {
            c0y = ui;
            c1y = ui + w;
            c2y = ui + w;
            c3y = ui;
          } else {
            c0z = ui;
            c1z = ui + w;
            c2z = ui + w;
            c3z = ui;
          }
          if (fd.v === 0) {
            c0x = vi;
            c1x = vi;
            c2x = vi + h;
            c3x = vi + h;
          } else if (fd.v === 1) {
            c0y = vi;
            c1y = vi;
            c2y = vi + h;
            c3y = vi + h;
          } else {
            c0z = vi;
            c1z = vi;
            c2z = vi + h;
            c3z = vi + h;
          }

          // Winding order
          let v0x, v0y, v0z, v1x, v1y, v1z, v2x, v2y, v2z, v3x, v3y, v3z;
          let a0, a1, a2, a3;
          if (faceIdx === 0 || faceIdx === 3 || faceIdx === 5) {
            v0x = c0x;
            v0y = c0y;
            v0z = c0z;
            v1x = c1x;
            v1y = c1y;
            v1z = c1z;
            v2x = c2x;
            v2y = c2y;
            v2z = c2z;
            v3x = c3x;
            v3y = c3y;
            v3z = c3z;
            a0 = ao0;
            a1 = ao1;
            a2 = ao2;
            a3 = ao3;
          } else {
            v0x = c1x;
            v0y = c1y;
            v0z = c1z;
            v1x = c0x;
            v1y = c0y;
            v1z = c0z;
            v2x = c3x;
            v2y = c3y;
            v2z = c3z;
            v3x = c2x;
            v3y = c2y;
            v3z = c2z;
            a0 = ao1;
            a1 = ao0;
            a2 = ao3;
            a3 = ao2;
          }

          const isTransparent = trans === 1;
          const verts = isTransparent ? transVerts : opaqueVerts;
          const norms = isTransparent ? transNorms : opaqueNorms;
          const cols = isTransparent ? transColors : opaqueColors;
          const uvArr = isTransparent ? transUvs : opaqueUvs;
          const uv2Arr = isTransparent ? transUv2s : opaqueUv2s;
          const idxArr = isTransparent ? transIdx : opaqueIdx;
          let vCount = isTransparent ? transVCount : opaqueVCount;

          // Fluid top face Y offset
          const fluidYOff =
            faceIdx === 4 && flLvl > 0 && flLvl < FLUID_MAX
              ? -(1.0 - flLvl / FLUID_MAX) * 0.875
              : 0;

          const vxArr = [v0x, v1x, v2x, v3x];
          const vyArr = [v0y, v1y, v2y, v3y];
          const vzArr = [v0z, v1z, v2z, v3z];
          const aoArr = [a0, a1, a2, a3];

          const cr = ((blockColor >> 16) & 0xff) / 255;
          const cg = ((blockColor >> 8) & 0xff) / 255;
          const cb = (blockColor & 0xff) / 255;

          for (let ci = 0; ci < 4; ci++) {
            verts.push(vxArr[ci] + baseX, vyArr[ci] + fluidYOff, vzArr[ci] + baseZ);
            norms.push(normal[0], normal[1], normal[2]);
            const aoLight = aoScale[aoArr[ci]] * lightBrightness;
            if (atlasEnabled) {
              cols.push(aoLight, aoLight, aoLight);
            } else {
              cols.push(cr * aoLight, cg * aoLight, cb * aoLight);
            }
          }

          // UVs
          uvArr.push(0, h, w, h, w, 0, 0, 0);
          if (atlasEnabled) {
            const tileIdx = textureFaceArr[blockType * 6 + faceIdx];
            const tileU = tileIdx >= 0 ? (tileIdx % ATLAS_COLS) / ATLAS_COLS : 0;
            const tileV =
              tileIdx >= 0 ? 1.0 - (Math.floor(tileIdx / ATLAS_COLS) + 1) / ATLAS_ROWS : 0;
            uv2Arr.push(tileU, tileV, tileU, tileV, tileU, tileV, tileU, tileV);
          } else {
            uv2Arr.push(0, 0, 0, 0, 0, 0, 0, 0);
          }

          // Triangulation (AO-aware)
          if (a0 + a2 > a1 + a3) {
            idxArr.push(vCount, vCount + 1, vCount + 2);
            idxArr.push(vCount, vCount + 2, vCount + 3);
          } else {
            idxArr.push(vCount + 1, vCount + 2, vCount + 3);
            idxArr.push(vCount + 1, vCount + 3, vCount);
          }

          if (isTransparent) transVCount += 4;
          else opaqueVCount += 4;
          ui += w;
        }
      }
    }
  }

  // Build result with Float32Array/Uint32Array
  const result = { hasOpaque: opaqueVerts.length > 0, hasTrans: transVerts.length > 0 };
  if (result.hasOpaque) {
    result.opaqueVerts = new Float32Array(opaqueVerts);
    result.opaqueNorms = new Float32Array(opaqueNorms);
    result.opaqueColors = new Float32Array(opaqueColors);
    result.opaqueUvs = new Float32Array(opaqueUvs);
    result.opaqueUv2s = new Float32Array(opaqueUv2s);
    result.opaqueIdx = new Uint32Array(opaqueIdx);
  }
  if (result.hasTrans) {
    result.transVerts = new Float32Array(transVerts);
    result.transNorms = new Float32Array(transNorms);
    result.transColors = new Float32Array(transColors);
    result.transUvs = new Float32Array(transUvs);
    result.transUv2s = new Float32Array(transUv2s);
    result.transIdx = new Uint32Array(transIdx);
  }
  return result;
}

// ─── Message Handler ────────────────────────────────────────────────────

self.onmessage = function (e) {
  const msg = e.data;

  if (msg.type === 'init') {
    solidArr = new Uint8Array(msg.solidArr);
    transparentArr = new Uint8Array(msg.transparentArr);
    fluidArr = new Uint8Array(msg.fluidArr);
    colorArr = new Uint32Array(msg.colorArr);
    textureFaceArr = new Int8Array(msg.textureFaceArr);
    CS = msg.CHUNK_SIZE;
    CH = msg.CHUNK_HEIGHT;
    ATLAS_COLS = msg.ATLAS_COLS;
    ATLAS_ROWS = msg.ATLAS_ROWS;
    FLUID_MAX = msg.FLUID_MAX_LEVEL;
    return;
  }

  if (msg.type === 'registry') {
    solidArr = new Uint8Array(msg.solidArr);
    transparentArr = new Uint8Array(msg.transparentArr);
    fluidArr = new Uint8Array(msg.fluidArr);
    colorArr = new Uint32Array(msg.colorArr);
    textureFaceArr = new Int8Array(msg.textureFaceArr);
    return;
  }

  if (msg.type === 'mesh') {
    const result = meshChunk(msg);
    const transfers = [];
    if (result.hasOpaque) {
      transfers.push(
        result.opaqueVerts.buffer,
        result.opaqueNorms.buffer,
        result.opaqueColors.buffer,
        result.opaqueUvs.buffer,
        result.opaqueUv2s.buffer,
        result.opaqueIdx.buffer
      );
    }
    if (result.hasTrans) {
      transfers.push(
        result.transVerts.buffer,
        result.transNorms.buffer,
        result.transColors.buffer,
        result.transUvs.buffer,
        result.transUv2s.buffer,
        result.transIdx.buffer
      );
    }
    self.postMessage(
      {
        type: 'result',
        jobId: msg.jobId,
        chunkKey: msg.chunkKey,
        hasOpaque: result.hasOpaque,
        hasTrans: result.hasTrans,
        opaqueVerts: result.opaqueVerts,
        opaqueNorms: result.opaqueNorms,
        opaqueColors: result.opaqueColors,
        opaqueUvs: result.opaqueUvs,
        opaqueUv2s: result.opaqueUv2s,
        opaqueIdx: result.opaqueIdx,
        transVerts: result.transVerts,
        transNorms: result.transNorms,
        transColors: result.transColors,
        transUvs: result.transUvs,
        transUv2s: result.transUv2s,
        transIdx: result.transIdx,
      },
      transfers
    );
  }
};
