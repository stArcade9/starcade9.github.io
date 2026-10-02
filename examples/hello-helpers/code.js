/* eslint-disable no-undef */
// hello-helpers — walkthrough cart for the four cart-builder helpers landed
// alongside this demo:
//
//   1. nova64.loader  — boot / asset-progress overlay
//   2. nova64.story   — slide-based intro / cutscene
//   3. nova64.level   — grid-driven dungeon builder
//   4. nova64.video   — in-world video texture + full-screen playback
//
// The cart is structured as a tiny "screen state machine":
//   loading → story → game → (optional video cutscene)
//
// Open this cart on http://localhost:3000/console.html?demo=hello-helpers
// and walk through with Enter / Space. Read the comments in each handler
// for the API contract.

let screen = 'boot';
let level = null;
let timer = 0;

// Plain JSON map. Each cell value is a key into the `tiles` map below; 1
// = wall, 0 = open. nova64.level.fromGrid builds meshes + lights for the
// whole thing in one call.
const MAP = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 0, 1, 0, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 0, 0, 0, 1, 0, 1],
  [1, 0, 0, 0, 1, 0, 0, 0, 1],
  [1, 0, 1, 0, 0, 0, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1],
];

const STORY_SLIDES = [
  {
    image: '/assets/novaOS/novaMascot.png',
    text: 'You are a cart author. Your toolkit just grew.',
    prompt: 'Press Enter — slide 1 of 3',
  },
  {
    image: '/assets/novaOS/novaMascot.png',
    text: 'Loader, story, level, video — all reusable, all engine-blessed.',
    prompt: 'Press Enter — slide 2 of 3',
  },
  {
    image: '/assets/novaOS/novaMascot.png',
    text: 'Stop hand-rolling these patterns. Ship gameplay instead.',
    prompt: 'Press Enter to enter the dungeon',
  },
];

// ── Cart lifecycle ─────────────────────────────────────────────────────────

export function init() {
  // 1) Loader: show an overlay + track a couple of asset URLs so the user
  //    sees a real progress bar. We resolve them by hand below so this demo
  //    doesn't require external assets to exist.
  nova64.loader.show({
    title: 'HELLO HELPERS',
    subtitle: 'BOOT SEQUENCE',
    status: 'INITIALISING…',
  });
  nova64.loader.track(['demo://shader/cube', 'demo://shader/torus', 'demo://audio/boot.wav']);

  // Simulate async asset arrivals so the bar fills smoothly.
  setTimeout(() => {
    nova64.loader.setStatus('LOADING SHADERS…');
    nova64.loader.resolve('demo://shader/cube');
  }, 300);
  setTimeout(() => {
    nova64.loader.resolve('demo://shader/torus');
  }, 700);
  setTimeout(() => {
    nova64.loader.setStatus('READY');
    nova64.loader.resolve('demo://audio/boot.wav');
  }, 1100);

  nova64.loader.whenReady().then(() => {
    nova64.loader.hide();
    runStory();
  });
}

function runStory() {
  screen = 'story';
  // 2) Story: 3 slides, pixel-melt transitions, Enter to advance, Escape to
  //    skip. The returned promise resolves with { finished, superseded }.
  nova64.story
    .play(STORY_SLIDES, {
      transition: 'pixel-melt',
      onAdvance: idx => {
        console.log('[hello-helpers] story advanced to slide', idx);
      },
    })
    .then(({ finished }) => {
      if (finished) enterDungeon();
    });
}

function enterDungeon() {
  screen = 'game';
  // 3) Level: build the maze from the grid above. The handle exposes
  //    isWall / cellToWorld / specialAt / destroy.
  level = nova64.level.fromGrid({
    grid: MAP,
    tileSize: 2,
    origin: [0, 0, 0],
    tiles: {
      1: {
        type: 'wall',
        color: 0x10051c,
        height: 3,
        emissive: 0x00aaff,
        emissiveIntensity: 0.25,
      },
      0: {
        type: 'open',
        floorColor: 0x07010d,
        ceilingColor: 0x1f4f9a,
        floorEmissive: 0x0de7ff,
        floorEmissiveIntensity: 0.15,
        ceilingHeight: 3,
      },
    },
    specials: [
      {
        x: 4,
        z: 4,
        type: 'portal',
        color: 0xff00cc,
        emissive: 0xff00cc,
        emissiveIntensity: 0.8,
        light: { color: 0xff00cc, intensity: 1.4, distance: 8 },
      },
      {
        x: 7,
        z: 1,
        type: 'save_point',
        color: 0x00ff88,
        light: { color: 0x00ff88, intensity: 1.0, distance: 6 },
      },
    ],
  });

  // Park the camera looking at the portal.
  const portal = level.cellToWorld(4, 4);
  nova64.camera.setCameraPosition(portal.x, 2.2, portal.z + 6);
  nova64.camera.setCameraTarget(portal.x, 1.2, portal.z);
  nova64.camera.setCameraFOV(70);

  // Dim ambient so the emissive walls/floor actually show their glow.
  nova64.light.setAmbientLight(0x202040, 0.6);
  nova64.scene.setClearColor?.(0x080018);
}

export function update(dt) {
  timer += dt;
  if (screen !== 'game') return;
  // Tiny camera dolly so the dungeon doesn't feel static.
  const portal = level?.specialAt?.(4, 4) ? level.cellToWorld(4, 4) : { x: 0, y: 0, z: 0 };
  const t = timer * 0.35;
  nova64.camera.setCameraPosition(
    portal.x + Math.sin(t) * 1.2,
    2.0 + Math.cos(t * 0.7) * 0.4,
    portal.z + 6 + Math.cos(t) * 1.2
  );
  nova64.camera.setCameraTarget(portal.x, 1.2, portal.z);
}

export function draw() {
  if (screen === 'boot') {
    // Loader paints itself as an HTML overlay; nothing for the cart to do.
    return;
  }
  if (screen === 'story') {
    // story.play() paints to its own overlay canvas too. Cart still needs
    // a draw() so the engine ticks; we leave the framebuffer empty.
    return;
  }
  // screen === 'game': overlay a small caption so users know what they're
  // looking at.
  const W = width();
  const H = height();
  fill(0, 0, W, 16, 0x000020cc);
  drawText('HELLO HELPERS  —  level + loader + story all wired up', 6, 4, 0x00ffff, 9);

  drawText('press R to replay story • V to skip video', 6, H - 12, 0x88aaff, 8);
}

// Quick dev hook: press R to replay the story without rebooting.
globalThis.__HELLO_HELPERS_DEBUG = {
  replayStory: runStory,
  playVideo() {
    // 4) Video: example of full-screen cutscene playback. Replace the URL
    //    with a real .mp4 you've dropped in /public to test on the real
    //    threejs/babylon backends. Stub returns { played:false } on hosts
    //    that don't have a working VideoTexture.
    return nova64.video.playFullscreen('/assets/sample.mp4', {
      onFinish: info => console.log('[hello-helpers] video finished:', info),
    });
  },
  meshVideo(meshId) {
    // In-world: bind a video texture to an existing mesh. On threejs this
    // returns a THREE.VideoTexture handle; on babylon a BABYLON.VideoTexture.
    const tex = nova64.video.loadTexture('/assets/sample.mp4', {
      loop: true,
      muted: true,
    });
    tex.applyToMesh(meshId);
    return tex;
  },
};
