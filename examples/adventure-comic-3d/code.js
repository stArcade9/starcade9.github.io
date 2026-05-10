// THE VERDICT — A 3D Noir Comic Adventure
// Interrogate a suspect using evidence found at the crime scene.
// WASD to move  |  SPACE to interact / advance dialogue

// ── State ────────────────────────────────────────────────────────────────────
const { print, rect, rectfill, rgba8, screenHeight, screenWidth } = nova64.draw;
const { createCube, createPlane, setPosition, setRotation, setScale } = nova64.scene;
const { setCameraFOV, setCameraPosition, setCameraTarget } = nova64.camera;
const { createPointLight, setAmbientLight, setFog, setLightColor, setLightDirection } =
  nova64.light;
const { enableBloom, enableFXAA, enableVignette } = nova64.fx;
const { btn, key } = nova64.input;
const { sfx } = nova64.audio;
let state = 'title'; // 'title' | 'explore' | 'dialogue'
let sceneTime = 0; // seconds since last state enter
let textScroll = 0;
let lastCharCount = 0; // for typewriter sfx
let tickTimer = 0;

let currentText = '';
let speaker = '';
let dialogStage = 0;
let currentScript = [];
let hasEvidence = false;
let gameFinished = false;

// ── 3D scene handles ─────────────────────────────────────────────────────────
let detective = { body: null, head: null };
let suspect = { body: null, head: null };
let evidence = null;
let deskLamp = null;
let evidenceAngle = 0;

// ── Player state ─────────────────────────────────────────────────────────────
let playerPos = { x: 0, z: 6 };
const SPEED = 5.0; // units per second

// ── Overlay dimensions ───────────────────────────────────────────────────────
let W = 640;
let H = 360;

// ── Scripts ──────────────────────────────────────────────────────────────────
const SCRIPT_SUSPECT = [
  { s: 'Detective', t: 'Where were you on the night of the 14th?' },
  { s: 'Suspect', t: 'I told you, I was at the movies.' },
  { s: 'Detective', t: 'Alone?' },
  { s: 'Suspect', t: 'Yeah. Why would I lie about that?' },
  { s: 'Detective', t: "We'll see..." },
];

const SCRIPT_EVIDENCE = [
  { s: 'Detective', t: 'The safe was forced open...' },
  { s: 'Detective', t: "But the lock mechanism isn't broken." },
  { s: 'Detective', t: "There's a strange glowing cube inside." },
  { s: 'Detective', t: 'I should ask the suspect about this.' },
];

const SCRIPT_CONFRONT = [
  { s: 'Detective', t: 'I found this glowing cube in the safe.' },
  { s: 'Suspect', t: "I've never seen that before in my life!" },
  { s: 'Detective', t: 'Then how did your fingerprints get on it?' },
  { s: 'Narrator', t: '... THE END ...' },
];

// ── Init ─────────────────────────────────────────────────────────────────────
export function init() {
  W = typeof screenWidth === 'function' ? nova64.draw.screenWidth() : 640;
  H = typeof screenHeight === 'function' ? nova64.draw.screenHeight() : 360;
  // Atmosphere
  nova64.light.setFog(0x0a0a14, 8, 28);
  nova64.fx.enableBloom(1.0, 0.5, 0.4);
  nova64.fx.enableFXAA();
  nova64.fx.enableVignette(1.0, 0.85);

  // Lighting — visible but dramatic
  nova64.light.setAmbientLight(0x2a3040, 1.2); // dark blue-gray, still readable
  nova64.light.setLightDirection(-0.4, -1.0, -0.3);
  nova64.light.setLightColor(0xaabbcc); // cool off-white overhead
  deskLamp = nova64.light.createPointLight(0xff9933, 6.0, 14, 0, 2.8, -0.2); // warm amber desk lamp

  // ── Floor ──────────────────────────────────────────────────────────────────
  const floor = nova64.scene.createPlane(20, 20, 0x2a1800, [0, 0, 0], {
    material: 'standard',
    roughness: 0.9,
  });
  nova64.scene.setRotation(floor, -Math.PI / 2, 0, 0);

  // ── Walls ──────────────────────────────────────────────────────────────────
  // Back wall
  const wallBack = nova64.scene.createPlane(20, 6, 0x222222, [0, 3, -8]);

  // Left wall
  const wallLeft = nova64.scene.createPlane(20, 6, 0x1e1e1e, [-8, 3, 0]);
  nova64.scene.setRotation(wallLeft, 0, Math.PI / 2, 0);

  // Right wall (has moonlit window)
  const wallRight = nova64.scene.createPlane(20, 6, 0x1e1e1e, [8, 3, 0]);
  nova64.scene.setRotation(wallRight, 0, -Math.PI / 2, 0);

  // Moonlit window (emissive blue-white glow inset on right wall)
  const window1 = nova64.scene.createPlane(3, 2.5, 0x8ab4d4, [7.9, 3, 0], {
    material: 'emissive',
    emissive: 0x8ab4d4,
  });
  nova64.scene.setRotation(window1, 0, -Math.PI / 2, 0);

  // ── Desk ──────────────────────────────────────────────────────────────────
  const desk = nova64.scene.createCube(1, 0x2a1600, [0, 0.4, 0], {
    material: 'standard',
    roughness: 0.5,
  });
  nova64.scene.setScale(desk, 5, 0.8, 2.5);

  // Desk lamp post
  const lampPost = nova64.scene.createCube(0.12, 0x222222, [1.5, 1.5, -0.3], {
    material: 'metallic',
    metalness: 0.8,
  });
  nova64.scene.setScale(lampPost, 1, 4, 1);

  // Desk lamp shade (emissive)
  const lampShade = nova64.scene.createCube(0.5, 0xffdd88, [1.5, 2.8, -0.3], {
    material: 'emissive',
    emissive: 0xffdd88,
  });
  nova64.scene.setScale(lampShade, 3, 0.7, 3);

  // ── Filing cabinet (back-left corner) ────────────────────────────────────
  const cab1 = nova64.scene.createCube(1, 0x333333, [-6, 0.75, -6.5], {
    material: 'metallic',
    metalness: 0.6,
  });
  nova64.scene.setScale(cab1, 2, 1.5, 1.5);
  const cab2 = nova64.scene.createCube(1, 0x2a2a2a, [-6, 2.25, -6.5], {
    material: 'metallic',
    metalness: 0.6,
  });
  nova64.scene.setScale(cab2, 2, 1.5, 1.5);
  // Cabinet handle details
  const handle = nova64.scene.createCube(0.08, 0x888888, [-6.9, 0.85, -6.5], {
    material: 'metallic',
    metalness: 0.9,
  });
  nova64.scene.setScale(handle, 1, 1, 5);

  // ── Evidence (glowing cube on desk) ──────────────────────────────────────
  evidence = nova64.scene.createCube(0.4, 0x00ff88, [0, 1.1, 0], {
    material: 'emissive',
    emissive: 0x00ff88,
  });

  // ── Detective (multi-part) ────────────────────────────────────────────────
  detective.body = nova64.scene.createCube(1, 0x334477, [playerPos.x, 0.9, playerPos.z], {
    material: 'metallic',
    metalness: 0.4,
    roughness: 0.6,
  });
  nova64.scene.setScale(detective.body, 0.9, 1.8, 0.7);
  detective.head = nova64.scene.createCube(0.7, 0x556688, [playerPos.x, 2.2, playerPos.z], {
    material: 'standard',
    roughness: 0.5,
  });

  // ── Suspect (multi-part) ──────────────────────────────────────────────────
  suspect.body = nova64.scene.createCube(1, 0x883322, [3, 0.9, -2], {
    material: 'standard',
    roughness: 0.6,
  });
  nova64.scene.setScale(suspect.body, 0.9, 1.8, 0.7);
  suspect.head = nova64.scene.createCube(0.7, 0xaa4433, [3, 2.2, -2], {
    material: 'standard',
    roughness: 0.5,
  });

  // Camera
  nova64.camera.setCameraPosition(0, 3, 8);
  nova64.camera.setCameraTarget(0, 1, 0);
  nova64.camera.setCameraFOV(60);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function setDetectivePos(x, z) {
  nova64.scene.setPosition(detective.body, x, 0.9, z);
  nova64.scene.setPosition(detective.head, x, 2.2, z);
}

function processDialog() {
  if (dialogStage >= currentScript.length) {
    state = 'explore';
    nova64.camera.setCameraPosition(playerPos.x, 9, playerPos.z + 6);
    nova64.camera.setCameraTarget(playerPos.x, 0, playerPos.z);
    sceneTime = 0;
    if (gameFinished) state = 'title';
    return;
  }

  speaker = currentScript[dialogStage].s;
  currentText = currentScript[dialogStage].t;
  textScroll = 0;

  // Cinematic camera angles per speaker
  if (speaker === 'Detective') {
    nova64.camera.setCameraPosition(playerPos.x - 1.5, 2.5, playerPos.z + 2);
    nova64.camera.setCameraTarget(playerPos.x, 2, playerPos.z - 1);
  } else if (speaker === 'Suspect') {
    nova64.camera.setCameraPosition(4.5, 2.2, 0);
    nova64.camera.setCameraTarget(3, 2, -2);
    // Face the detective (fixed facing, not sceneTime bug)
    nova64.scene.setRotation(suspect.body, 0, Math.PI * 0.2, 0);
    nova64.scene.setRotation(suspect.head, 0, Math.PI * 0.2, 0);
  } else if (speaker === 'Narrator') {
    nova64.camera.setCameraPosition(0, 9, 0.1);
    nova64.camera.setCameraTarget(0, 0, 0);
  }
}

// ── Update ────────────────────────────────────────────────────────────────────
export function update(dt) {
  sceneTime += dt;

  // Spinning evidence
  evidenceAngle += dt * 3.0;
  nova64.scene.setRotation(evidence, 0, evidenceAngle, evidenceAngle * 0.4);

  if (state === 'title') {
    // Slow cinematic orbit
    const orb = sceneTime * 0.3;
    nova64.camera.setCameraPosition(Math.sin(orb) * 6, 4, Math.cos(orb) * 6 + 2);
    nova64.camera.setCameraTarget(0, 1, 0);

    if (nova64.input.key('Space') || nova64.input.btn('A')) {
      state = 'explore';
      nova64.audio.sfx('confirm');
      hasEvidence = false;
      gameFinished = false;
      playerPos = { x: 0, z: 6 };
      sceneTime = 0;
      // Reset suspect pose
      nova64.scene.setRotation(suspect.body, 0, 0, 0);
      nova64.scene.setRotation(suspect.head, 0, 0, 0);
      nova64.camera.setCameraPosition(playerPos.x, 9, playerPos.z + 6);
      nova64.camera.setCameraTarget(playerPos.x, 0, playerPos.z);
    }
  } else if (state === 'explore') {
    // Top-down camera follows player
    nova64.camera.setCameraPosition(playerPos.x, 9, playerPos.z + 6);
    nova64.camera.setCameraTarget(playerPos.x, 0, playerPos.z);

    if (nova64.input.key('KeyW') || nova64.input.key('ArrowUp')) playerPos.z -= SPEED * dt;
    if (nova64.input.key('KeyS') || nova64.input.key('ArrowDown')) playerPos.z += SPEED * dt;
    if (nova64.input.key('KeyA') || nova64.input.key('ArrowLeft')) playerPos.x -= SPEED * dt;
    if (nova64.input.key('KeyD') || nova64.input.key('ArrowRight')) playerPos.x += SPEED * dt;

    setDetectivePos(playerPos.x, playerPos.z);

    const distToDesk = Math.hypot(playerPos.x, playerPos.z);
    const distToSuspect = Math.hypot(playerPos.x - 3, playerPos.z + 2);

    if (sceneTime > 0.25 && (nova64.input.key('Space') || nova64.input.btn('A'))) {
      if (distToDesk < 2.5 && !hasEvidence) {
        hasEvidence = true;
        state = 'dialogue';
        currentScript = SCRIPT_EVIDENCE;
        dialogStage = 0;
        processDialog();
        sceneTime = 0;
        nova64.audio.sfx('coin');
      } else if (distToSuspect < 2.5) {
        state = 'dialogue';
        currentScript = hasEvidence ? SCRIPT_CONFRONT : SCRIPT_SUSPECT;
        gameFinished = hasEvidence;
        dialogStage = 0;
        processDialog();
        sceneTime = 0;
        nova64.audio.sfx('select');
      }
    }
  } else if (state === 'dialogue') {
    textScroll += 30 * dt; // ~30 chars/sec typewriter

    // Typewriter tick sound
    const charCount = Math.floor(textScroll);
    if (charCount > lastCharCount && charCount <= currentText.length) {
      tickTimer -= dt;
      if (tickTimer <= 0) {
        nova64.audio.sfx('blip');
        tickTimer = 0.06;
      }
    }
    lastCharCount = charCount;

    if (sceneTime > 0.25 && (nova64.input.key('Space') || nova64.input.btn('A'))) {
      if (textScroll < currentText.length) {
        textScroll = currentText.length; // skip to end
        sceneTime = 0;
      } else {
        dialogStage++;
        processDialog();
        sceneTime = 0;
        nova64.audio.sfx('select');
      }
    }
  }
}

// ── Draw helpers ──────────────────────────────────────────────────────────────
function drawComicPanel(x, y, w, h) {
  nova64.draw.rectfill(x, y, w, h, nova64.draw.rgba8(10, 10, 15, 255));
  // Double border (comic book style)
  nova64.draw.rect(x, y, w, h, nova64.draw.rgba8(255, 255, 255, 255));
  nova64.draw.rect(x + 2, y + 2, w - 4, h - 4, nova64.draw.rgba8(200, 200, 200, 255));
}

// ── Draw ──────────────────────────────────────────────────────────────────────
export function draw() {
  if (state === 'title') {
    // Title card
    drawComicPanel(20, 18, 280, 88);
    nova64.draw.print('THE VERDICT', 90, 38, nova64.draw.rgba8(255, 255, 255, 255));
    nova64.draw.print('A 3D Noir Comic Adventure', 46, 58, nova64.draw.rgba8(255, 255, 255, 255));
    nova64.draw.print('Uncover the truth...', 90, 76, nova64.draw.rgba8(255, 255, 255, 255));

    // Pulsing prompt — with dark bg for visibility
    nova64.draw.rectfill(40, 205, 240, 18, nova64.draw.rgba8(0, 0, 0, 220));
    const pulse = Math.floor((Math.sin(sceneTime * 5) * 0.5 + 0.5) * 200 + 55);
    nova64.draw.print(
      'SPACE to begin investigation',
      50,
      210,
      nova64.draw.rgba8(255, 255, 255, pulse)
    );
  } else if (state === 'explore') {
    const distToDesk = Math.hypot(playerPos.x, playerPos.z);
    const distToSuspect = Math.hypot(playerPos.x - 3, playerPos.z + 2);

    // Context prompt
    if (distToDesk < 2.5 && !hasEvidence) {
      drawComicPanel(93, 198, 134, 22);
      nova64.draw.print('[SPACE] Inspect Desk', 98, 204, nova64.draw.rgba8(255, 255, 255, 255));
    } else if (distToSuspect < 2.5) {
      drawComicPanel(85, 198, 150, 22);
      nova64.draw.print('[SPACE] Talk to Suspect', 90, 204, nova64.draw.rgba8(255, 255, 255, 255));
    }

    // Status
    nova64.draw.rectfill(2, 2, 100, 14, nova64.draw.rgba8(0, 0, 0, 220));
    nova64.draw.print('WASD \x97 Move', 6, 6, nova64.draw.rgba8(255, 255, 255, 255));
    if (hasEvidence) {
      nova64.draw.rectfill(2, 16, 150, 14, nova64.draw.rgba8(0, 0, 0, 220));
      nova64.draw.print('EVIDENCE COLLECTED', 6, 20, nova64.draw.rgba8(255, 255, 255, 255));
    }
  } else if (state === 'dialogue') {
    // Cinematic letterbox bars
    nova64.draw.rectfill(0, 0, W, 28, 0x000000);
    nova64.draw.rectfill(0, H - 68, W, 68, 0x000000);

    // Speaker badge
    const speakerColor =
      speaker === 'Detective'
        ? nova64.draw.rgba8(68, 102, 221, 255)
        : speaker === 'Suspect'
          ? nova64.draw.rgba8(221, 51, 51, 255)
          : nova64.draw.rgba8(51, 170, 85, 255);
    const badgeX = speaker === 'Suspect' ? W - 92 : 8;
    nova64.draw.rectfill(badgeX, H - 82, 84, 18, speakerColor);
    nova64.draw.print(
      speaker.toUpperCase(),
      badgeX + 4,
      H - 77,
      nova64.draw.rgba8(255, 255, 255, 255)
    );

    // Dialogue text
    const display = currentText.substring(0, Math.floor(textScroll));
    nova64.draw.print(display, 14, H - 56, nova64.draw.rgba8(255, 255, 255, 255));

    // Advance prompt
    if (textScroll >= currentText.length) {
      const blink = Math.floor(sceneTime * 4) % 2 === 0;
      if (blink)
        nova64.draw.print('\u25BC SPACE', W - 50, H - 18, nova64.draw.rgba8(255, 255, 255, 255));
    }
  }
}
