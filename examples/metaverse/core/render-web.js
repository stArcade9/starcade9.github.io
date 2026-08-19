// render-web.js — the reference RenderBackend (Three.js via nova64).
//
// Translates abstract world/avatar/camera + 2D UI intent into nova64.scene /
// nova64.camera / nova64.draw calls. A Godot or XR backend implements the same
// shape (see docs/METAVERSE.md) and registers under a different id; the app and
// plugins are unchanged.
//
// Colors from the UI layer are 0xAARRGGBB; we unpack to nova64.draw.rgba8.

function unpack(color) {
  const n = color >>> 0;
  if (n > 0xffffff) {
    return { a: (n >>> 24) & 0xff, r: (n >>> 16) & 0xff, g: (n >>> 8) & 0xff, b: n & 0xff };
  }
  return { r: (n >>> 16) & 0xff, g: (n >>> 8) & 0xff, b: n & 0xff, a: 255 };
}
function packDraw(color) {
  const c = unpack(color);
  return nova64.draw.rgba8 ? nova64.draw.rgba8(c.r, c.g, c.b, c.a) : (c.r << 16) | (c.g << 8) | c.b;
}
function hex(color) {
  const c = unpack(color);
  return (c.r << 16) | (c.g << 8) | c.b;
}

const FOV_Y = 75; // vertical FOV in degrees (matches nova64's default perspective camera)
const DESIGN_W = 640;
const DESIGN_H = 360;
const ASPECT = DESIGN_W / DESIGN_H;

export function createWebBackend() {
  const avatars = new Map(); // id -> { body }
  let lastCam = null; // { eye:{x,y,z}, target:{x,y,z} } — kept for worldToScreen
  return {
    id: 'web',

    init(world) {
      if (nova64.light.setAmbientLight) nova64.light.setAmbientLight(0x334455, 0.6);
      nova64.light.setDirectionalLight([-1, -2, -1], 0xfff0dd, 0.9);
      // Pin the FOV so worldToScreen's projection matches what's rendered.
      if (nova64.camera.setCameraFOV) nova64.camera.setCameraFOV(FOV_Y);

      const floor = nova64.scene.createPlane(
        world.size || 80,
        world.size || 80,
        0x10141f,
        [0, 0, 0],
        {
          material: 'standard',
          color: 0x10141f,
          roughness: 1.0,
        }
      );
      nova64.scene.setRotation(floor, -Math.PI / 2, 0, 0);

      const ring = world.pillars == null ? 8 : world.pillars;
      const radius = world.ringRadius || 14;
      for (let i = 0; i < ring; i++) {
        const a = (i / ring) * Math.PI * 2;
        const pillar = nova64.scene.createCube(
          1.5,
          0x2a3550,
          [Math.cos(a) * radius, 2, Math.sin(a) * radius],
          {
            material: 'standard',
            color: 0x2a3550,
            roughness: 0.8,
          }
        );
        nova64.scene.setScale(pillar, 1, 3, 1);
      }
      const beacon = nova64.scene.createCube(1, 0xffcc44, [0, 0.5, 0], {
        material: 'emissive',
        color: 0xffcc44,
        intensity: 0.6,
      });
      nova64.scene.setScale(beacon, 0.4, 1, 0.4);
    },

    addAvatar(id, opts) {
      const c = hex(opts && opts.color != null ? opts.color : 0xff55aaff);
      const body = nova64.scene.createCube(1, c, [0, 0.9, 0], {
        material: 'standard',
        color: c,
        roughness: 0.7,
      });
      avatars.set(id, { body });
    },
    updateAvatar(id, pose) {
      const a = avatars.get(id);
      if (!a) return;
      nova64.scene.setPosition(a.body, pose.x, 0.9, pose.z);
      nova64.scene.setRotation(a.body, 0, pose.ry || 0, 0);
    },
    removeAvatar(id) {
      const a = avatars.get(id);
      if (a) {
        try {
          nova64.scene.destroyMesh(a.body);
        } catch (_) {
          /* ignore */
        }
      }
      avatars.delete(id);
    },
    setAvatarVisible(id, visible) {
      const a = avatars.get(id);
      if (a && nova64.scene.setMeshVisible) nova64.scene.setMeshVisible(a.body, !!visible);
    },
    // Recolor an existing avatar in place (appearance customization). Guarded so
    // it no-ops cleanly on hosts whose scene shim lacks the engine material call.
    setAvatarStyle(id, style) {
      const a = avatars.get(id);
      if (!a || !style || style.color == null) return;
      const eng = nova64.scene.engine;
      if (eng && typeof eng.setMeshMaterial === 'function') {
        eng.setMeshMaterial(a.body, {
          material: 'standard',
          color: hex(style.color),
          roughness: 0.7,
        });
      }
    },

    setCamera(cam) {
      const eyeY = 1.6;
      const lookX = Math.sin(cam.yaw) * Math.cos(cam.pitch);
      const lookY = Math.sin(cam.pitch);
      const lookZ = Math.cos(cam.yaw) * Math.cos(cam.pitch);
      let eye, target;
      if (cam.mode === 'third') {
        const back = 6;
        eye = { x: cam.x - lookX * back, y: eyeY + 2.5, z: cam.z - lookZ * back };
        target = { x: cam.x, y: eyeY, z: cam.z };
      } else {
        eye = { x: cam.x, y: eyeY, z: cam.z };
        target = { x: cam.x + lookX, y: eyeY + lookY, z: cam.z + lookZ };
      }
      lastCam = { eye, target };
      nova64.camera.setCameraPosition(eye.x, eye.y, eye.z);
      nova64.camera.setCameraTarget(target.x, target.y, target.z);
    },

    // Project a world point into 2D design space (640x360), so plugins can pin
    // labels/UI to things in the 3D scene (name tags, markers). Pure math from
    // the camera we set above — no engine call — so it's identical on any host
    // that drives this backend (web or Godot). Returns { x, y, visible, dist };
    // visible is false when the point is behind the camera or well off-screen.
    worldToScreen(wx, wy, wz) {
      const cam = lastCam;
      if (!cam) return { x: 0, y: 0, visible: false, dist: 0 };
      const ex = cam.eye.x;
      const ey = cam.eye.y;
      const ez = cam.eye.z;
      // Forward (camera looks down -Z in view space).
      let fx = cam.target.x - ex;
      let fy = cam.target.y - ey;
      let fz = cam.target.z - ez;
      const fl = Math.hypot(fx, fy, fz) || 1;
      fx /= fl;
      fy /= fl;
      fz /= fl;
      // Right = normalize(cross(forward, up)), up = (0,1,0).
      let sx = -fz;
      let sy = 0;
      let sz = fx;
      const sl = Math.hypot(sx, sy, sz) || 1;
      sx /= sl;
      sy /= sl;
      sz /= sl;
      // Recomputed up = cross(right, forward).
      const ux = sy * fz - sz * fy;
      const uy = sz * fx - sx * fz;
      const uz = sx * fy - sy * fx;
      const dx = wx - ex;
      const dy = wy - ey;
      const dz = wz - ez;
      const vX = dx * sx + dy * sy + dz * sz;
      const vY = dx * ux + dy * uy + dz * uz;
      const vZ = -(dx * fx + dy * fy + dz * fz); // < 0 when in front of the camera
      if (vZ > -0.05) return { x: 0, y: 0, visible: false, dist: 0 };
      const t = Math.tan((FOV_Y * Math.PI) / 180 / 2);
      const ndcX = vX / (-vZ * t * ASPECT);
      const ndcY = vY / (-vZ * t);
      const px = (ndcX * 0.5 + 0.5) * DESIGN_W;
      const py = (0.5 - ndcY * 0.5) * DESIGN_H;
      const visible = px >= -40 && px <= DESIGN_W + 40 && py >= -40 && py <= DESIGN_H + 40;
      return { x: px, y: py, visible, dist: -vZ };
    },

    // 2D UI ops (design space 640x360).
    drawRect(x, y, w, h, color) {
      nova64.draw.rectfill(x | 0, y | 0, w | 0, h | 0, packDraw(color));
    },
    drawText(text, x, y, color) {
      nova64.draw.print(text, x | 0, y | 0, packDraw(color));
    },
    drawCircle(x, y, r, color, filled) {
      if (nova64.draw.circle) nova64.draw.circle(x | 0, y | 0, r | 0, packDraw(color), !!filled);
      else
        nova64.draw.rectfill((x - r) | 0, (y - r) | 0, (r * 2) | 0, (r * 2) | 0, packDraw(color));
    },
    measureText(s) {
      return String(s).length * 6; // nova64 bitmap font ~6px advance
    },
    viewport() {
      return { w: 640, h: 360 };
    },
  };
}
