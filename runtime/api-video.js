// runtime/api-video.js
// nova64.video — cross-backend video texture + playback API.
//
// Provides two surfaces:
//   1. In-world video texture: `nova64.video.loadTexture(url, opts)` returns
//      a handle whose `.applyToMesh(meshId)` binds the video as that mesh's
//      diffuse/albedo map. Backed by `THREE.VideoTexture` on Three.js and
//      `BABYLON.VideoTexture` on Babylon.js. Stub no-ops on RetroArch /
//      Godot (until those hosts have a real implementation).
//   2. Full-screen playback: `nova64.video.playFullscreen(url, opts)` drops
//      a `<video>` element over the cart canvas (z=15, between scanlines
//      and the studio panel) and resolves when the video ends or the
//      caller hits skip.
//
// Both surfaces share a single `HTMLVideoElement` per URL so a video shown
// in-world and full-screen at once shares decode work.
//
// Backend caveats:
//   - Browsers may block autoplay-with-audio until a user gesture. Default
//     muted:true so autoplay works; opt back in via `muted: false`.
//   - Background `canvas { background: #000 }` rule (see mempalace
//     `feedback_render_bug_strategy.md`) bites here too — full-screen
//     overlay sets `background: transparent` explicitly.

const FULLSCREEN_OVERLAY_ID = '__nova64_video_overlay__';

function hasDocument() {
  return (
    typeof document !== 'undefined' &&
    typeof document.createElement === 'function' &&
    typeof document.getElementById === 'function' &&
    document.body
  );
}

function detectBackend(gpu) {
  // Heuristic: threejs gpu exposes `.renderer.outputColorSpace` (Three),
  // babylon gpu exposes `.scene` and an engine field. RetroArch / Godot
  // hosts mount different shapes — for those we drop into a no-op stub.
  if (!gpu) return 'unknown';
  if (gpu.renderer && (gpu.renderer.outputColorSpace || gpu.renderer.isWebGLRenderer))
    return 'threejs';
  if (gpu.scene && gpu.engine && (gpu.engine.getCaps || gpu.engine.beginFrame)) return 'babylon';
  return 'unknown';
}

export function videoApi(gpu) {
  const backend = detectBackend(gpu);
  const handles = new Set();

  // ── In-world texture ────────────────────────────────────────────────────

  function loadTexture(url, opts = {}) {
    if (!hasDocument()) return makeStubHandle(url, opts);
    const video = document.createElement('video');
    video.src = url;
    video.crossOrigin = opts.crossOrigin || 'anonymous';
    video.muted = opts.muted !== false; // default true so autoplay works
    video.loop = !!opts.loop;
    video.playsInline = true;
    video.preload = opts.preload || 'auto';
    if (opts.autoplay !== false) {
      // Autoplay attempt; safe to ignore the promise — failure surfaces in
      // the returned handle.isReady / play().
      const p = video.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    }

    if (backend === 'threejs') return makeThreeHandle(url, video, opts);
    if (backend === 'babylon') return makeBabylonHandle(url, video, opts);
    return makeWebTextureFallback(url, video, opts);
  }

  function makeThreeHandle(url, video, _opts) {
    let texture = null;
    try {
      const THREE = globalThis.THREE;
      if (!THREE?.VideoTexture) throw new Error('THREE.VideoTexture missing');
      texture = new THREE.VideoTexture(video);
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.NearestFilter;
      texture.generateMipmaps = false;
      texture.colorSpace = THREE.SRGBColorSpace || texture.colorSpace;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[nova64.video] threejs VideoTexture init failed:', e?.message);
    }
    const handle = {
      backend: 'threejs',
      url,
      video,
      texture,
      isReady() {
        return video.readyState >= 2;
      },
      play() {
        return video.play().catch(() => {});
      },
      pause() {
        video.pause();
      },
      setVolume(v) {
        video.volume = Math.max(0, Math.min(1, v));
      },
      seek(s) {
        try {
          video.currentTime = s;
        } catch (_) {
          /* swallow */
        }
      },
      applyToMesh(meshId) {
        if (!texture) return false;
        const getMesh = gpu?.getMesh || globalThis.nova64?.scene?.getMesh;
        const mesh = typeof getMesh === 'function' ? getMesh(meshId) : null;
        if (!mesh?.traverse) return false;
        mesh.traverse(child => {
          if (!child?.isMesh) return;
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          for (const mat of mats) {
            if (!mat) continue;
            mat.map = texture;
            mat.needsUpdate = true;
          }
        });
        return true;
      },
      dispose() {
        try {
          video.pause();
          video.removeAttribute('src');
          video.load();
        } catch (_) {
          /* swallow */
        }
        try {
          texture?.dispose?.();
        } catch (_) {
          /* swallow */
        }
        handles.delete(handle);
      },
    };
    handles.add(handle);
    return handle;
  }

  function makeBabylonHandle(url, video, opts) {
    let texture = null;
    try {
      const BAB = globalThis.BABYLON;
      const ctor = BAB?.VideoTexture;
      if (!ctor) throw new Error('BABYLON.VideoTexture missing');
      texture = new ctor(url, video, gpu.scene, true, true, BAB.Texture?.NEAREST_SAMPLINGMODE, {
        autoPlay: opts.autoplay !== false,
        loop: !!opts.loop,
        muted: opts.muted !== false,
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[nova64.video] babylon VideoTexture init failed:', e?.message);
    }
    const handle = {
      backend: 'babylon',
      url,
      video,
      texture,
      isReady() {
        return video.readyState >= 2;
      },
      play() {
        return video.play().catch(() => {});
      },
      pause() {
        video.pause();
      },
      setVolume(v) {
        video.volume = Math.max(0, Math.min(1, v));
      },
      seek(s) {
        try {
          video.currentTime = s;
        } catch (_) {
          /* swallow */
        }
      },
      applyToMesh(meshId) {
        if (!texture) return false;
        const getMesh = gpu?.getMesh || globalThis.nova64?.scene?.getMesh;
        const node = typeof getMesh === 'function' ? getMesh(meshId) : null;
        if (!node) return false;
        const meshes =
          typeof node.getChildMeshes === 'function' ? [node, ...node.getChildMeshes()] : [node];
        for (const m of meshes) {
          if (!m?.material) continue;
          const mat = m.material;
          if ('diffuseTexture' in mat) mat.diffuseTexture = texture;
          if ('albedoTexture' in mat) mat.albedoTexture = texture;
          if ('emissiveTexture' in mat && opts.emissive) mat.emissiveTexture = texture;
        }
        return true;
      },
      dispose() {
        try {
          video.pause();
          video.removeAttribute('src');
          video.load();
        } catch (_) {
          /* swallow */
        }
        try {
          texture?.dispose?.();
        } catch (_) {
          /* swallow */
        }
        handles.delete(handle);
      },
    };
    handles.add(handle);
    return handle;
  }

  function makeWebTextureFallback(url, video, _opts) {
    // Unknown / RetroArch / Godot — return a handle that owns the video
    // element but can't bind it as a 3D texture. Callers can still pull
    // pixels via the `video` field if they want to blit it through the
    // cart framebuffer.
    const handle = {
      backend,
      url,
      video,
      texture: null,
      isReady() {
        return video.readyState >= 2;
      },
      play() {
        return video.play().catch(() => {});
      },
      pause() {
        video.pause();
      },
      setVolume(v) {
        video.volume = Math.max(0, Math.min(1, v));
      },
      seek(s) {
        try {
          video.currentTime = s;
        } catch (_) {
          /* swallow */
        }
      },
      applyToMesh() {
        // eslint-disable-next-line no-console
        console.warn(
          `[nova64.video] applyToMesh not supported on backend "${backend}" — see roadmap`
        );
        return false;
      },
      dispose() {
        try {
          video.pause();
          video.removeAttribute('src');
          video.load();
        } catch (_) {
          /* swallow */
        }
        handles.delete(handle);
      },
    };
    handles.add(handle);
    return handle;
  }

  function makeStubHandle(url) {
    return {
      backend: 'stub',
      url,
      video: null,
      texture: null,
      isReady: () => false,
      play: () => Promise.resolve(),
      pause: () => {},
      setVolume: () => {},
      seek: () => {},
      applyToMesh: () => false,
      dispose: () => {},
    };
  }

  // ── Full-screen playback ────────────────────────────────────────────────

  function playFullscreen(url, opts = {}) {
    if (!hasDocument()) return Promise.resolve({ played: false });
    const existing = document.getElementById(FULLSCREEN_OVERLAY_ID);
    if (existing && typeof existing.remove === 'function') existing.remove();

    const overlay = document.createElement('div');
    overlay.id = FULLSCREEN_OVERLAY_ID;
    overlay.style.cssText = [
      'position:absolute',
      'inset:0',
      'z-index:15',
      'background:transparent',
      'pointer-events:none',
      'display:flex',
      'align-items:center',
      'justify-content:center',
    ].join(';');

    const video = document.createElement('video');
    video.src = url;
    video.style.cssText = 'width:100%;height:100%;object-fit:contain;background:#000';
    video.muted = opts.muted !== false;
    video.loop = !!opts.loop;
    video.playsInline = true;
    if (opts.controls) video.controls = true;
    overlay.appendChild(video);

    const parent = document.getElementById('screen')?.parentElement || document.body;
    if (
      parent &&
      typeof getComputedStyle === 'function' &&
      getComputedStyle(parent).position === 'static'
    )
      parent.style.position = 'relative';
    parent.appendChild(overlay);

    let settled = false;
    return new Promise(resolve => {
      const cleanup = info => {
        if (settled) return;
        settled = true;
        try {
          video.pause();
        } catch (_) {
          /* swallow */
        }
        try {
          overlay.remove();
        } catch (_) {
          /* swallow */
        }
        if (typeof opts.onFinish === 'function') {
          try {
            opts.onFinish(info);
          } catch (_) {
            /* swallow */
          }
        }
        resolve(info);
      };
      video.addEventListener('ended', () => cleanup({ played: true, skipped: false }));
      video.addEventListener('error', () => cleanup({ played: false, error: true }));
      if (opts.skipKey !== null) {
        const skipKey = opts.skipKey || 'Escape';
        const onKey = e => {
          if (e.key === skipKey || e.key === 'Enter' || e.key === ' ') {
            if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
              window.removeEventListener('keydown', onKey);
            }
            cleanup({ played: true, skipped: true });
          }
        };
        if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
          window.addEventListener('keydown', onKey);
        }
      }
      const p = video.play();
      if (p && typeof p.catch === 'function') {
        p.catch(err => cleanup({ played: false, error: true, message: err?.message }));
      }
    });
  }

  function getBackendName() {
    return backend;
  }
  function isSupported() {
    return backend === 'threejs' || backend === 'babylon';
  }

  function disposeAll() {
    for (const h of Array.from(handles)) h.dispose();
  }

  function exposeTo(target) {
    target.video = {
      loadTexture,
      playFullscreen,
      backend: getBackendName,
      isSupported,
    };
  }

  return {
    loadTexture,
    playFullscreen,
    getBackendName,
    isSupported,
    exposeTo,
    _disposeAll: disposeAll,
  };
}
