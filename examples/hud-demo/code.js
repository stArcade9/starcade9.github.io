// examples/hud-demo/code.js
// NML HUD Demo — demonstrates parseCanvasUI for in-game HUD overlaid on a 3D scene.
// Shows: progressbars, text data-binding, star rating, radar, animated elements.

const { circle, line, rect } = nova64.draw;
const { createCube, getMesh } = nova64.scene;
const { setCameraPosition, setCameraTarget } = nova64.camera;
const { setAmbientLight, setFog } = nova64.light;
const { parseCanvasUI, renderCanvasUI, updateCanvasUI } = nova64.ui;
const { color } = nova64.util;

const HUD_XML = `<ui>
  <!-- ── Health / Mana / XP bars ── -->
  <group x="10" y="10" width="200" height="80" clip="false">
    <text x="0" y="0"  color="#ff5555" size="9"  bold="true">HP</text>
    <progressbar x="26" y="0" width="174" height="12"
      value="{health}" max="100" fill="#e74c3c" background="#3a0000" radius="4" />

    <text x="0" y="18" color="#5599ff" size="9"  bold="true">MP</text>
    <progressbar x="26" y="18" width="174" height="12"
      value="{mana}" max="100" fill="#3498db" background="#001133" radius="4" />

    <text x="0" y="36" color="#ffcc00" size="9"  bold="true">XP</text>
    <progressbar x="26" y="36" width="174" height="12"
      value="{xp}" max="{xpMax}" fill="#f39c12" background="#1a1000" radius="4" />
  </group>

  <!-- ── Score ── -->
  <text x="630" y="10" anchor-x="right" color="#ffffff" size="11" bold="true"
        shadow="true" shadow-color="#000" shadow-blur="6">SCORE</text>
  <text x="630" y="24" anchor-x="right" color="#ffdd44" size="18" bold="true"
        font="monospace" shadow="true" shadow-color="#000">{score}</text>

  <!-- ── Ammo / Weapon ── -->
  <group x="530" y="310" width="100" height="44" clip="false">
    <text x="100" y="0"  anchor-x="right" color="#aaaaaa" size="8">AMMO</text>
    <text x="100" y="12" anchor-x="right" color="#ffffff" size="22" bold="true"
          font="monospace">{ammo}</text>
  </group>

  <!-- ── Star rating (top center) ── -->
  <star x="284" y="18" r="10" inner-r="4" points="5" fill="{star1}" />
  <star x="304" y="18" r="10" inner-r="4" points="5" fill="{star2}" />
  <star x="324" y="18" r="10" inner-r="4" points="5" fill="{star3}" />
  <star x="344" y="18" r="10" inner-r="4" points="5" fill="{star4}" />
  <star x="364" y="18" r="10" inner-r="4" points="5" fill="{star5}" />

  <!-- ── Radar (bottom-right) ── -->
  <circle x="574" y="300" r="44" fill="#00002288" stroke="#00ffccaa" />
  <circle x="574" y="300" r="30" fill="none"      stroke="#00ffcc44" />
  <line x1="530" y1="300" x2="618" y2="300" color="#00ffcc33" width="1" />
  <line x1="574" y1="256" x2="574" y2="344" color="#00ffcc33" width="1" />
  <!-- Radar sweep arm -->
  <line x1="574" y1="300" x2="{sweepX}" y2="{sweepY}" color="#00ffccaa" width="1.5" />
  <!-- Player dot -->
  <circle x="574" y="300" r="3" fill="#00ffff" />
  <!-- Enemy dots -->
  <circle x="{e1x}" y="{e1y}" r="3" fill="#ff4444" />
  <circle x="{e2x}" y="{e2y}" r="3" fill="#ff4444" />

  <!-- ── Wave / Level indicator ── -->
  <rect x="10" y="340" width="120" height="16" fill="#ffffff18" radius="4" stroke="#ffffff22" />
  <text x="18" y="340" color="#cccccc" size="9">WAVE {wave}</text>

  <!-- ── Boss warning (conditionally bright) ── -->
  <text x="320" y="340" anchor-x="center" color="{bossColor}" size="10" bold="true"
        shadow="true" shadow-color="#ff0000" shadow-blur="8">{bossMsg}</text>
</ui>`;

let ui;
let scene3D = [];
let t = 0;

// Game state
let health = 80,
  mana = 55,
  xp = 1340;
let score = 0;
let ammo = 24;
let wave = 3;
let bossActive = false;

export function init() {
  ui = parseCanvasUI(HUD_XML);

  // 3D scene: a few spinning cubes at different positions
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const dist = 6;
    const id = createCube(1.2, [0x3399ff, 0xff6644, 0x44ff88, 0xff33cc, 0xffcc00, 0x00ddff][i], [
      Math.cos(angle) * dist,
      0,
      Math.sin(angle) * dist - 8,
    ]);
    scene3D.push({ id, angle });
  }

  setCameraPosition(0, 8, 4);
  setCameraTarget(0, 0, -6);
  setAmbientLight(0x223344, 0.8);
  setFog(0x0a0a1a, 12, 40);
}

export function update(dt) {
  t += dt;

  // Spin cubes
  for (const obj of scene3D) {
    const mesh = getMesh(obj.id);
    if (mesh) {
      mesh.rotation.x += dt * 0.7;
      mesh.rotation.y += dt * 1.1;
    }
  }

  // Drain/refill values to demo the bars
  health = 50 + Math.sin(t * 0.3) * 30;
  mana = 30 + Math.sin(t * 0.5 + 1) * 25;
  xp = 800 + Math.sin(t * 0.2) * 700;
  score = Math.floor(t * 130);
  ammo = Math.max(0, 24 - (Math.floor(t * 0.8) % 25));
  bossActive = Math.sin(t * 0.15) > 0.7;

  updateCanvasUI(ui, dt);
}

export function draw() {
  // 3D scene renders automatically — just supply HUD data
  const starOn = '#ffcc00';
  const starOff = '#333333';
  const stars = Math.ceil((health / 100) * 5);

  // Radar sweep angle
  const sweepAngle = t * 1.4;
  const sweepDist = 40;

  renderCanvasUI(ui, {
    health: health.toFixed(0),
    mana: mana.toFixed(0),
    xp: xp.toFixed(0),
    xpMax: 2000,
    score: String(score).padStart(8, '0'),
    ammo: String(ammo).padStart(3, ' '),
    wave,
    // Stars
    star1: stars >= 1 ? starOn : starOff,
    star2: stars >= 2 ? starOn : starOff,
    star3: stars >= 3 ? starOn : starOff,
    star4: stars >= 4 ? starOn : starOff,
    star5: stars >= 5 ? starOn : starOff,
    // Radar sweep endpoint
    sweepX: (574 + Math.cos(sweepAngle) * sweepDist).toFixed(1),
    sweepY: (300 + Math.sin(sweepAngle) * sweepDist).toFixed(1),
    // Enemy dots (orbit the radar)
    e1x: (574 + Math.cos(t * 0.6) * 28).toFixed(1),
    e1y: (300 + Math.sin(t * 0.6) * 28).toFixed(1),
    e2x: (574 + Math.cos(t * 0.9 + 2.1) * 20).toFixed(1),
    e2y: (300 + Math.sin(t * 0.9 + 2.1) * 20).toFixed(1),
    // Boss
    bossColor: bossActive ? '#ff3333' : '#00000000',
    bossMsg: bossActive ? '⚠ BOSS INCOMING' : '',
  });
}
