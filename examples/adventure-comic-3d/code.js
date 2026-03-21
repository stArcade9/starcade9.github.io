// THE VERDICT — A 3D Noir Comic Adventure
// Interrogate a suspect using evidence found at the crime scene.
// WASD to move  |  SPACE to interact / advance dialogue

// ── State ────────────────────────────────────────────────────────────────────
let state = 'title'; // 'title' | 'explore' | 'dialogue'
let sceneTime = 0; // seconds since last state enter
let textScroll = 0;

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
const W = 320;
const H = 240;

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
  // Atmosphere
  setFog(0x0a0a14, 8, 28);
  enableBloom(1.0, 0.5, 0.4);
  enableFXAA();
  enableVignette(1.0, 0.85);

  // Lighting — visible but dramatic
  setAmbientLight(0x2a3040, 1.2); // dark blue-gray, still readable
  setLightDirection(-0.4, -1.0, -0.3);
  setLightColor(0xaabbcc); // cool off-white overhead
  deskLamp = createPointLight(0xff9933, 6.0, 14, 0, 2.8, -0.2); // warm amber desk lamp

  // ── Floor ──────────────────────────────────────────────────────────────────
  const floor = createPlane(20, 20, 0x2a1800, [0, 0, 0], { material: 'standard', roughness: 0.9 });
  setRotation(floor, -Math.PI / 2, 0, 0);

  // ── Walls ──────────────────────────────────────────────────────────────────
  // Back wall
  const wallBack = createPlane(20, 6, 0x222222, [0, 3, -8]);

  // Left wall
  const wallLeft = createPlane(20, 6, 0x1e1e1e, [-8, 3, 0]);
  setRotation(wallLeft, 0, Math.PI / 2, 0);

  // Right wall (has moonlit window)
  const wallRight = createPlane(20, 6, 0x1e1e1e, [8, 3, 0]);
  setRotation(wallRight, 0, -Math.PI / 2, 0);

  // Moonlit window (emissive blue-white glow inset on right wall)
  const window1 = createPlane(3, 2.5, 0x8ab4d4, [7.9, 3, 0], {
    material: 'emissive',
    emissive: 0x8ab4d4,
  });
  setRotation(window1, 0, -Math.PI / 2, 0);

  // ── Desk ──────────────────────────────────────────────────────────────────
  const desk = createCube(1, 0x2a1600, [0, 0.4, 0], { material: 'standard', roughness: 0.5 });
  setScale(desk, 5, 0.8, 2.5);

  // Desk lamp post
  const lampPost = createCube(0.12, 0x222222, [1.5, 1.5, -0.3], {
    material: 'metallic',
    metalness: 0.8,
  });
  setScale(lampPost, 1, 4, 1);

  // Desk lamp shade (emissive)
  const lampShade = createCube(0.5, 0xffdd88, [1.5, 2.8, -0.3], {
    material: 'emissive',
    emissive: 0xffdd88,
  });
  setScale(lampShade, 3, 0.7, 3);

  // ── Filing cabinet (back-left corner) ────────────────────────────────────
  const cab1 = createCube(1, 0x333333, [-6, 0.75, -6.5], { material: 'metallic', metalness: 0.6 });
  setScale(cab1, 2, 1.5, 1.5);
  const cab2 = createCube(1, 0x2a2a2a, [-6, 2.25, -6.5], { material: 'metallic', metalness: 0.6 });
  setScale(cab2, 2, 1.5, 1.5);
  // Cabinet handle details
  const handle = createCube(0.08, 0x888888, [-6.9, 0.85, -6.5], {
    material: 'metallic',
    metalness: 0.9,
  });
  setScale(handle, 1, 1, 5);

  // ── Evidence (glowing cube on desk) ──────────────────────────────────────
  evidence = createCube(0.4, 0x00ff88, [0, 1.1, 0], { material: 'emissive', emissive: 0x00ff88 });

  // ── Detective (multi-part) ────────────────────────────────────────────────
  detective.body = createCube(1, 0x334477, [playerPos.x, 0.9, playerPos.z], {
    material: 'metallic',
    metalness: 0.4,
    roughness: 0.6,
  });
  setScale(detective.body, 0.9, 1.8, 0.7);
  detective.head = createCube(0.7, 0x556688, [playerPos.x, 2.2, playerPos.z], {
    material: 'standard',
    roughness: 0.5,
  });

  // ── Suspect (multi-part) ──────────────────────────────────────────────────
  suspect.body = createCube(1, 0x883322, [3, 0.9, -2], { material: 'standard', roughness: 0.6 });
  setScale(suspect.body, 0.9, 1.8, 0.7);
  suspect.head = createCube(0.7, 0xaa4433, [3, 2.2, -2], { material: 'standard', roughness: 0.5 });

  // Camera
  setCameraPosition(0, 3, 8);
  setCameraTarget(0, 1, 0);
  setCameraFOV(60);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function setDetectivePos(x, z) {
  setPosition(detective.body, x, 0.9, z);
  setPosition(detective.head, x, 2.2, z);
}

function processDialog() {
  if (dialogStage >= currentScript.length) {
    state = 'explore';
    setCameraPosition(playerPos.x, 9, playerPos.z + 6);
    setCameraTarget(playerPos.x, 0, playerPos.z);
    sceneTime = 0;
    if (gameFinished) state = 'title';
    return;
  }

  speaker = currentScript[dialogStage].s;
  currentText = currentScript[dialogStage].t;
  textScroll = 0;

  // Cinematic camera angles per speaker
  if (speaker === 'Detective') {
    setCameraPosition(playerPos.x - 1.5, 2.5, playerPos.z + 2);
    setCameraTarget(playerPos.x, 2, playerPos.z - 1);
  } else if (speaker === 'Suspect') {
    setCameraPosition(4.5, 2.2, 0);
    setCameraTarget(3, 2, -2);
    // Face the detective (fixed facing, not sceneTime bug)
    setRotation(suspect.body, 0, Math.PI * 0.2, 0);
    setRotation(suspect.head, 0, Math.PI * 0.2, 0);
  } else if (speaker === 'Narrator') {
    setCameraPosition(0, 9, 0.1);
    setCameraTarget(0, 0, 0);
  }
}

// ── Update ────────────────────────────────────────────────────────────────────
export function update(dt) {
  sceneTime += dt;

  // Spinning evidence
  evidenceAngle += dt * 3.0;
  setRotation(evidence, 0, evidenceAngle, evidenceAngle * 0.4);

  if (state === 'title') {
    // Slow cinematic orbit
    const orb = sceneTime * 0.3;
    setCameraPosition(Math.sin(orb) * 6, 4, Math.cos(orb) * 6 + 2);
    setCameraTarget(0, 1, 0);

    if (key('Space') || btn('A')) {
      state = 'explore';
      hasEvidence = false;
      gameFinished = false;
      playerPos = { x: 0, z: 6 };
      sceneTime = 0;
      // Reset suspect pose
      setRotation(suspect.body, 0, 0, 0);
      setRotation(suspect.head, 0, 0, 0);
      setCameraPosition(playerPos.x, 9, playerPos.z + 6);
      setCameraTarget(playerPos.x, 0, playerPos.z);
    }
  } else if (state === 'explore') {
    // Top-down camera follows player
    setCameraPosition(playerPos.x, 9, playerPos.z + 6);
    setCameraTarget(playerPos.x, 0, playerPos.z);

    if (key('KeyW') || key('ArrowUp')) playerPos.z -= SPEED * dt;
    if (key('KeyS') || key('ArrowDown')) playerPos.z += SPEED * dt;
    if (key('KeyA') || key('ArrowLeft')) playerPos.x -= SPEED * dt;
    if (key('KeyD') || key('ArrowRight')) playerPos.x += SPEED * dt;

    setDetectivePos(playerPos.x, playerPos.z);

    const distToDesk = Math.hypot(playerPos.x, playerPos.z);
    const distToSuspect = Math.hypot(playerPos.x - 3, playerPos.z + 2);

    if (sceneTime > 0.25 && (key('Space') || btn('A'))) {
      if (distToDesk < 2.5 && !hasEvidence) {
        hasEvidence = true;
        state = 'dialogue';
        currentScript = SCRIPT_EVIDENCE;
        dialogStage = 0;
        processDialog();
        sceneTime = 0;
      } else if (distToSuspect < 2.5) {
        state = 'dialogue';
        currentScript = hasEvidence ? SCRIPT_CONFRONT : SCRIPT_SUSPECT;
        gameFinished = hasEvidence;
        dialogStage = 0;
        processDialog();
        sceneTime = 0;
      }
    }
  } else if (state === 'dialogue') {
    textScroll += 30 * dt; // ~30 chars/sec typewriter

    if (sceneTime > 0.25 && (key('Space') || btn('A'))) {
      if (textScroll < currentText.length) {
        textScroll = currentText.length; // skip to end
        sceneTime = 0;
      } else {
        dialogStage++;
        processDialog();
        sceneTime = 0;
      }
    }
  }
}

// ── Draw helpers ──────────────────────────────────────────────────────────────
function drawComicPanel(x, y, w, h) {
  rectfill(x, y, w, h, 0x110e0eee);
  // Double border (comic book style)
  rect(x, y, w, h, 0xffffff);
  rect(x + 2, y + 2, w - 4, h - 4, 0xaaaaaa);
}

// ── Draw ──────────────────────────────────────────────────────────────────────
export function draw() {
  if (state === 'title') {
    // Title card
    drawComicPanel(20, 18, 280, 88);
    print('THE VERDICT', 90, 38, 0xffbb00);
    print('A 3D Noir Comic Adventure', 46, 58, 0xffffff);
    print('Uncover the truth...', 90, 76, 0xaaaaaa);

    // Pulsing prompt
    const pulse = Math.floor((Math.sin(sceneTime * 5) * 0.5 + 0.5) * 200 + 55);
    print('SPACE to begin investigation', 50, 210, rgba8(180, 180, 180, pulse));
  } else if (state === 'explore') {
    const distToDesk = Math.hypot(playerPos.x, playerPos.z);
    const distToSuspect = Math.hypot(playerPos.x - 3, playerPos.z + 2);

    // Context prompt
    if (distToDesk < 2.5 && !hasEvidence) {
      drawComicPanel(93, 198, 134, 22);
      print('[SPACE] Inspect Desk', 98, 204, 0xffffff);
    } else if (distToSuspect < 2.5) {
      drawComicPanel(85, 198, 150, 22);
      print('[SPACE] Talk to Suspect', 90, 204, 0xffffff);
    }

    // Status
    print('WASD — Move', 6, 6, 0x666666);
    if (hasEvidence) print('EVIDENCE COLLECTED', 6, 20, rgba8(0, 255, 136, 200));
  } else if (state === 'dialogue') {
    // Cinematic letterbox bars
    rectfill(0, 0, W, 28, 0x000000);
    rectfill(0, H - 68, W, 68, 0x000000);

    // Speaker badge
    const speakerColor =
      speaker === 'Detective' ? 0x3355cc : speaker === 'Suspect' ? 0xcc2222 : 0x228844;
    const badgeX = speaker === 'Suspect' ? W - 92 : 8;
    rectfill(badgeX, H - 82, 84, 18, speakerColor);
    print(speaker.toUpperCase(), badgeX + 4, H - 77, 0xffffff);

    // Dialogue text
    const display = currentText.substring(0, Math.floor(textScroll));
    print(display, 14, H - 56, 0xf0f0f0);

    // Advance prompt
    if (textScroll >= currentText.length) {
      const blink = Math.floor(sceneTime * 4) % 2 === 0;
      if (blink) print('▼ SPACE', W - 50, H - 18, 0xcccccc);
    }
  }
}
