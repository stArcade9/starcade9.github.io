// examples/startscreen-demo/code.js
// NML Start Screen Demo — demonstrates parseCanvasUI for a full game title screen.
// Shows: full-screen backgrounds, title text, animated star decorations, nav buttons,
//        panel modals, SVG path decorations, and mouse-interactive menu navigation.

const MAIN_MENU_XML = `<ui>
  <!-- ── Full-screen dark sky gradient ── -->
  <rect x="0" y="0" width="100%" height="100%" fill="#050515" />

  <!-- Subtle grid lines for depth -->
  <line x1="0"   y1="120" x2="640" y2="120" color="#ffffff08" width="1" />
  <line x1="0"   y1="240" x2="640" y2="240" color="#ffffff08" width="1" />
  <line x1="160" y1="0"   x2="160" y2="360" color="#ffffff08" width="1" />
  <line x1="320" y1="0"   x2="320" y2="360" color="#ffffff08" width="1" />
  <line x1="480" y1="0"   x2="480" y2="360" color="#ffffff08" width="1" />

  <!-- Decorative star field (static, small dots) -->
  <circle x="42"  y="28"  r="1.5" fill="#ffffffcc" />
  <circle x="118" y="55"  r="1"   fill="#ffffff99" />
  <circle x="210" y="18"  r="2"   fill="#aabbffcc" />
  <circle x="290" y="42"  r="1"   fill="#ffffffbb" />
  <circle x="388" y="15"  r="1.5" fill="#ffffff99" />
  <circle x="460" y="60"  r="1"   fill="#ffffffcc" />
  <circle x="530" y="22"  r="2"   fill="#ccddffcc" />
  <circle x="600" y="44"  r="1"   fill="#ffffffaa" />
  <circle x="75"  y="88"  r="1"   fill="#ffffffaa" />
  <circle x="555" y="80"  r="1.5" fill="#ffffff88" />

  <!-- Large animated star decorations (position updated via data binding) -->
  <star x="60"  y="85"  r="{s1r}" inner-r="{s1ir}" points="6" fill="#4466ff44" rotation="{rot1}" />
  <star x="580" y="75"  r="{s2r}" inner-r="{s2ir}" points="5" fill="#ff449944" rotation="{rot2}" />
  <star x="110" y="290" r="{s3r}" inner-r="{s3ir}" points="4" fill="#44ffcc33" rotation="{rot3}" />
  <star x="530" y="295" r="{s4r}" inner-r="{s4ir}" points="7" fill="#ffaa2244" rotation="{rot4}" />

  <!-- SVG path: decorative arc on top and bottom -->
  <path d="M 0 10 Q 320 60 640 10" stroke="#4466ff33" fill="none" stroke-width="2" />
  <path d="M 0 350 Q 320 300 640 350" stroke="#4466ff33" fill="none" stroke-width="2" />

  <!-- ── Title block ── -->
  <text x="320" y="72" anchor-x="center" color="#ffffff" size="42" bold="true"
        font="monospace" shadow="true" shadow-color="#3355ff" shadow-blur="24"
        shadow-x="0" shadow-y="0">NOVA 64</text>

  <text x="320" y="122" anchor-x="center" color="#88aaff" size="11" font="monospace"
        shadow="true" shadow-color="#000" shadow-blur="4">ULTIMATE 3D FANTASY CONSOLE</text>

  <!-- Thin separator line -->
  <line x1="180" y1="144" x2="460" y2="144" color="#4466ffaa" width="1" />

  <!-- ── Nav menu ── -->
  <button x="50%" y="168" width="220" height="38" anchor-x="center"
          text="▶  PLAY GAME"
          fill="#1a2d6e" hover="#2a4db0" stroke="#5577ee" text-color="#ffffff"
          font-size="13" radius="6" onclick="onPlay" />

  <button x="50%" y="216" width="220" height="38" anchor-x="center"
          text="⚙  OPTIONS"
          fill="#1a1a3a" hover="#2a2a5a" stroke="#444488" text-color="#cccccc"
          font-size="13" radius="6" onclick="onOptions" />

  <button x="50%" y="264" width="220" height="38" anchor-x="center"
          text="ℹ  CREDITS"
          fill="#1a1a3a" hover="#2a2a5a" stroke="#444488" text-color="#cccccc"
          font-size="13" radius="6" onclick="onCredits" />

  <!-- Press start hint -->
  <text x="320" y="318" anchor-x="center" color="{hintColor}" size="9"
        font="monospace">{hintText}</text>

  <!-- Version badge -->
  <rect x="0" y="348" width="640" height="12" fill="#ffffff08" />
  <text x="8" y="349" color="#555577" size="8" font="monospace">v0.4.8</text>
  <text x="632" y="349" anchor-x="right" color="#555577" size="8" font="monospace">STARCADE9</text>
</ui>`;

const OPTIONS_PANEL_XML = `<ui>
  <panel x="50%" y="50%" width="280" height="180" anchor="center"
         fill="#050518ee" stroke="#5577ee" title="OPTIONS" radius="8"
         title-height="32" title-size="12">
    <text x="20" y="50"  color="#aaaacc" size="10">Music Volume</text>
    <progressbar x="20" y="68" width="240" height="12"
      value="75" max="100" fill="#5577ee" background="#222244" radius="4" />

    <text x="20" y="92"  color="#aaaacc" size="10">SFX Volume</text>
    <progressbar x="20" y="110" width="240" height="12"
      value="90" max="100" fill="#44aaff" background="#222244" radius="4" />

    <button x="50" y="136" width="80" height="28" text="SAVE"
            fill="#224488" hover="#3366cc" text-color="#fff" radius="4" onclick="onSave" />
    <button x="150" y="136" width="80" height="28" text="BACK"
            fill="#332244" hover="#553366" text-color="#ccc" radius="4" onclick="onBack" />
  </panel>
</ui>`;

const CREDITS_PANEL_XML = `<ui>
  <panel x="50%" y="50%" width="300" height="200" anchor="center"
         fill="#050518ee" stroke="#ff449988" title="CREDITS" radius="8"
         title-height="32" title-size="12" title-color="#ffaacc">
    <text x="150" y="48"  anchor-x="center" color="#ffffff" size="11" bold="true">Nova64 Fantasy Console</text>
    <text x="150" y="68"  anchor-x="center" color="#aaaacc" size="9">Built with Three.js + WebGL</text>
    <text x="150" y="90"  anchor-x="center" color="#ffaacc" size="10">Engine Design</text>
    <text x="150" y="106" anchor-x="center" color="#ffffff" size="9">Starcade9 / Brendon Smith</text>
    <text x="150" y="126" anchor-x="center" color="#ffaacc" size="10">Open Source — MIT License</text>
    <path d="M 30 152 L 270 152" stroke="#ff449966" fill="none" stroke-width="1" />
    <text x="150" y="158" anchor-x="center" color="#666688" size="8">github.com/starcade9/nova64</text>
    <button x="110" y="152" width="80" height="26" text="BACK"
            fill="#332244" hover="#553366" text-color="#ccc" radius="4" onclick="onBack" />
  </panel>
</ui>`;

let mainUI, optionsUI, creditsUI;
let t = 0;
let activeScreen = 'main'; // 'main' | 'options' | 'credits'

const handlers = {
  onPlay: () => {
    activeScreen = 'playing';
  },
  onOptions: () => {
    activeScreen = 'options';
  },
  onCredits: () => {
    activeScreen = 'credits';
  },
  onBack: () => {
    activeScreen = 'main';
  },
  onSave: () => {
    activeScreen = 'main';
  },
};

export function init() {
  mainUI = parseCanvasUI(MAIN_MENU_XML);
  optionsUI = parseCanvasUI(OPTIONS_PANEL_XML);
  creditsUI = parseCanvasUI(CREDITS_PANEL_XML);

  // Minimal 3D background — just a dark void with a rotating ring
  setFog(0x020008, 5, 30);
  setAmbientLight(0x112233, 0.5);
  setCameraPosition(0, 0, 8);
  setCameraTarget(0, 0, 0);

  // Decorative ring geometry
  const ring = createTorus(4, 0.08, 0x3344aa);
  const ringMesh = getMesh(ring);
  if (ringMesh) ringMesh.userData._ring = true;
}

export function update(dt) {
  t += dt;

  // Rotate the 3D ring in the background
  const mesh = globalThis.scene?.children?.find?.(c => c.userData._ring);
  // Update all active UIs
  if (activeScreen === 'main') updateCanvasUI(mainUI, dt);
  if (activeScreen === 'options') updateCanvasUI(optionsUI, dt);
  if (activeScreen === 'credits') updateCanvasUI(creditsUI, dt);
}

export function draw() {
  if (activeScreen === 'playing') {
    // Placeholder — in a real game you'd loadCart to the game here
    renderCanvasUI(mainUI, buildMainData(), handlers);
    return;
  }

  if (activeScreen === 'main') {
    renderCanvasUI(mainUI, buildMainData(), handlers);
  } else if (activeScreen === 'options') {
    // Render main behind options as a dim backdrop
    renderCanvasUI(mainUI, buildMainData(), {});
    renderCanvasUI(optionsUI, {}, handlers);
  } else if (activeScreen === 'credits') {
    renderCanvasUI(mainUI, buildMainData(), {});
    renderCanvasUI(creditsUI, {}, handlers);
  }
}

function buildMainData() {
  // Animate decorative stars with pulsing size and rotation
  const pulse = Math.sin(t * 1.2);
  return {
    s1r: (18 + pulse * 3).toFixed(1),
    s1ir: (7 + pulse).toFixed(1),
    rot1: (t * 25).toFixed(1),
    s2r: (14 + pulse * 2).toFixed(1),
    s2ir: (6).toFixed(1),
    rot2: (-t * 20).toFixed(1),
    s3r: (12 + pulse * 4).toFixed(1),
    s3ir: (5).toFixed(1),
    rot3: (t * 30).toFixed(1),
    s4r: (22 + pulse * 2).toFixed(1),
    s4ir: (9).toFixed(1),
    rot4: (-t * 18).toFixed(1),
    hintColor: Math.sin(t * 2) > 0 ? '#8899ff' : '#5566cc',
    hintText: 'CLICK A BUTTON OR PRESS START',
  };
}
