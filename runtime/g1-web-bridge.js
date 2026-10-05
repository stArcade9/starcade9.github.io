// runtime/g1-web-bridge.js
//
// G1 command router for the WEB (Three.js) runtime. G1-adapter carts drive the
// renderer through `engine.call(method, payload)` — the same contract the Godot
// host implements natively (see docs/GODOT_HOST_CONTRACT.md). The web runtime
// otherwise exposes only the higher-level `nova64.*` API, so those carts throw
// "engine is not defined". This bridge installs a `globalThis.engine` that maps
// the G1 command set onto Three.js objects in the runtime's scene, giving parity
// so G1 carts run in the browser + desktop Studio preview.
//
// Handle-based: create* commands return { handle }, and transform/material
// commands reference objects by handle. reset() tears the scene contributions
// down between cart runs.

export function createG1WebBridge({ gpu, THREE }) {
  const handles = new Map(); // id -> { type, object }
  let nextId = 1;
  const defaultCamera = gpu.camera; // restored on reset()

  const store = (type, object) => {
    const id = nextId++;
    handles.set(id, { type, object });
    return id;
  };
  const objOf = h => (handles.has(h) ? handles.get(h).object : null);
  const color = c => new THREE.Color(c?.[0] ?? 1, c?.[1] ?? 1, c?.[2] ?? 1);

  const commands = {
    'engine.init': () => ({
      capabilities: {
        backend: 'threejs-web',
        adapterVersion: '1.0.0',
        features: ['mesh', 'instanced', 'light', 'camera', 'material', 'texture', 'particles'],
      },
    }),

    'light.createDirectional': p => {
      const light = new THREE.DirectionalLight(color(p.color), p.energy ?? 1);
      light.position.set(2, 4, 3);
      gpu.scene.add(light);
      return { handle: store('light', light) };
    },

    'material.create': p => {
      const a = p.albedo || [1, 1, 1, 1];
      const mat = new THREE.MeshStandardMaterial({
        color: color(a),
        metalness: p.metallic ?? 0,
        roughness: p.roughness ?? 1,
        transparent: (a[3] ?? 1) < 1,
        opacity: a[3] ?? 1,
      });
      return { handle: store('material', mat) };
    },

    'geometry.createBox': p => {
      const s = p.size || [1, 1, 1];
      return { handle: store('geometry', new THREE.BoxGeometry(s[0], s[1], s[2])) };
    },

    'geometry.createPlane': p => {
      const s = p.size || [p.width ?? 1, p.height ?? 1];
      return { handle: store('geometry', new THREE.PlaneGeometry(s[0], s[1])) };
    },

    'mesh.create': p => {
      const geom = objOf(p.geometry);
      if (!geom) return { error: 'mesh.create: invalid geometry handle' };
      const mat = objOf(p.material) || new THREE.MeshStandardMaterial({ color: 0xcccccc });
      const mesh = new THREE.Mesh(geom, mat);
      gpu.scene.add(mesh);
      return { handle: store('mesh', mesh) };
    },

    'mesh.createInstanced': p => {
      const geom = objOf(p.geometry);
      if (!geom) return { error: 'mesh.createInstanced: invalid geometry handle' };
      const mat = objOf(p.material) || new THREE.MeshStandardMaterial({ color: 0xcccccc });
      const count = Math.max(1, p.count | 0 || 1);
      const inst = new THREE.InstancedMesh(geom, mat, count);
      const m = new THREE.Matrix4();
      const transforms = Array.isArray(p.transforms) ? p.transforms : [];
      for (let i = 0; i < count; i++) {
        const t = transforms[i];
        if (t && t.position) m.makeTranslation(t.position[0], t.position[1], t.position[2]);
        else m.identity();
        inst.setMatrixAt(i, m);
      }
      inst.instanceMatrix.needsUpdate = true;
      gpu.scene.add(inst);
      return { handle: store('mesh', inst) };
    },

    'mesh.setMaterial': p => {
      const mesh = objOf(p.mesh);
      const mat = objOf(p.material);
      if (!mesh || !mat) return { error: 'mesh.setMaterial: invalid handle' };
      mesh.material = mat;
      return {};
    },

    'transform.set': p => {
      const o = objOf(p.handle);
      if (!o) return { error: 'transform.set: invalid handle' };
      if (p.position) o.position.set(p.position[0], p.position[1], p.position[2]);
      if (p.rotation) o.rotation.set(p.rotation[0], p.rotation[1], p.rotation[2]);
      if (p.scale != null) {
        if (Array.isArray(p.scale)) o.scale.set(p.scale[0], p.scale[1], p.scale[2]);
        else o.scale.setScalar(p.scale);
      }
      if (o.isCamera && o.updateProjectionMatrix) o.updateProjectionMatrix();
      return {};
    },

    'camera.create': p => {
      const aspect = gpu.camera?.aspect ?? 1.6;
      const cam = new THREE.PerspectiveCamera(p.fov ?? 60, aspect, p.near ?? 0.1, p.far ?? 1000);
      return { handle: store('camera', cam) };
    },

    'camera.setActive': p => {
      const cam = objOf(p.handle);
      if (!cam || !cam.isCamera) return { error: 'camera.setActive: invalid camera handle' };
      cam.aspect = gpu.camera?.aspect ?? cam.aspect;
      cam.updateProjectionMatrix();
      gpu.camera = cam; // the render loop reads gpu.camera every frame
      return {};
    },

    'texture.createFromImage': () => {
      // Image decoding is host-specific/async; return a neutral 1×1 texture so
      // texture carts run without a ReferenceError (visual fidelity is limited).
      const tex = new THREE.DataTexture(
        new Uint8Array([200, 200, 200, 255]),
        1,
        1,
        THREE.RGBAFormat
      );
      tex.needsUpdate = true;
      return { handle: store('texture', tex) };
    },

    'particles.create': p => {
      const n = Math.max(1, p.count | 0 || 100);
      const geom = new THREE.BufferGeometry();
      const pos = new Float32Array(n * 3);
      for (let i = 0; i < n * 3; i++) pos[i] = (Math.random() - 0.5) * 4;
      geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const points = new THREE.Points(
        geom,
        new THREE.PointsMaterial({ color: color(p.color), size: p.size ?? 0.1 })
      );
      gpu.scene.add(points);
      return { handle: store('particles', points) };
    },

    'input.poll': () => {
      // Best-effort bridge to the web input API when present.
      const inp = globalThis.nova64?.input;
      const axis = name => {
        try {
          return typeof inp?.axis === 'function' ? +inp.axis(name) || 0 : 0;
        } catch {
          return 0;
        }
      };
      return {
        axes: {
          leftX: axis('leftX'),
          leftY: axis('leftY'),
          rightX: axis('rightX'),
          rightY: axis('rightY'),
        },
        buttons: {},
      };
    },
  };

  return {
    call(method, payload) {
      const fn = commands[method];
      if (!fn) return { error: `unknown G1 command: ${method}` };
      try {
        return fn(payload || {}) || {};
      } catch (e) {
        return { error: `${method}: ${e && e.message ? e.message : e}` };
      }
    },

    /** Remove this bridge's scene contributions and reset handles (between runs). */
    reset() {
      for (const { object } of handles.values()) {
        if (object && object.parent) object.parent.remove(object);
        object?.geometry?.dispose?.();
        if (object?.material?.dispose) object.material.dispose();
      }
      handles.clear();
      nextId = 1;
      gpu.camera = defaultCamera;
    },
  };
}
