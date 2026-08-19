// examples/canvas-ui-showcase/code.js
// NML Canvas UI Showcase — a complete reference demo of every supported element.
// Organized into labelled sections, all on one screen with a scrollable panel.

const { circle, line, rect } = nova64.draw;
const { setCameraPosition, setCameraTarget } = nova64.camera;
const { setAmbientLight, setFog } = nova64.light;
const { parseCanvasUI, renderCanvasUI, updateCanvasUI } = nova64.ui;
const { bezier, color, ellipse, pulse } = nova64.util;

const SHOWCASE_XML = `<ui>
  <!-- Full background -->
  <rect x="0" y="0" width="100%" height="100%" fill="#0a0a18" />
  <text x="320" y="6" anchor-x="center" color="#88aaff" size="9" bold="true"
        font="monospace">NML CANVAS UI SHOWCASE — ALL ELEMENTS</text>
  <line x1="0" y1="18" x2="640" y2="18" color="#334488" width="1" />

  <!-- ══════════════════════════════════════════════
       COLUMN 1 — PRIMITIVES (left)
       ══════════════════════════════════════════════ -->
  <text x="8" y="22" color="#4488ff" size="8" bold="true">PRIMITIVES</text>

  <rect  x="8"  y="33" width="60" height="36" fill="#1a3a7a" stroke="#4488ff" radius="4" />
  <text  x="38" y="71" anchor-x="center" color="#4488ff" size="7">rect</text>

  <circle x="108" y="51" r="18" fill="#7a1a1a" stroke="#ff4444" />
  <text   x="108" y="71" anchor-x="center" color="#ff4444" size="7">circle</text>

  <ellipse x="168" y="51" rx="26" ry="14" fill="#1a5a1a" stroke="#44ff88" />
  <text    x="168" y="71" anchor-x="center" color="#44ff88" size="7">ellipse</text>

  <triangle x="228" y="47" size="32" fill="#5a3a00" stroke="#ffaa22" />
  <text     x="228" y="71" anchor-x="center" color="#ffaa22" size="7">triangle</text>

  <star x="288" y="47" r="18" inner-r="7" points="5" fill="#3a005a" stroke="#cc44ff" />
  <text x="288" y="71" anchor-x="center" color="#cc44ff" size="7">star</text>

  <line x1="308" y1="33" x2="350" y2="64" color="#ff88cc" width="2" />
  <text x="329" y="71" anchor-x="center" color="#ff88cc" size="7">line</text>

  <!-- ══════════════════════════════════════════════
       SVG SUPPORT
       ══════════════════════════════════════════════ -->
  <text x="8" y="82" color="#ff8844" size="8" bold="true">SVG INTEGRATION</text>

  <!-- SVG path (Canvas2D Path2D — native SVG path strings) -->
  <path x="8" y="92" d="M0 20 L20 0 L40 20 L20 40 Z" fill="#442200" stroke="#ff8844" stroke-width="2" />
  <text x="28" y="136" anchor-x="center" color="#ff8844" size="7">&lt;path d=&quot;...&quot;&gt;</text>

  <!-- SVG path: bezier curve decoration -->
  <path x="54" y="92" d="M0 30 C15 0 35 0 50 30 S85 60 100 30"
        stroke="#ffcc44" fill="none" stroke-width="2.5" />
  <text x="104" y="136" anchor-x="center" color="#ffcc44" size="7">bezier path</text>

  <!-- Inline SVG block -->
  <svg x="160" y="92" width="60" height="44">
    <circle cx="30" cy="22" r="20" fill="#003366" />
    <circle cx="30" cy="22" r="12" fill="#0055aa" />
    <circle cx="30" cy="22" r="5"  fill="#00aaff" />
    <line x1="10" y1="22" x2="50" y2="22" stroke="#00ffff" stroke-width="1" />
    <line x1="30" y1="2"  x2="30" y2="42" stroke="#00ffff" stroke-width="1" />
  </svg>
  <text x="190" y="138" anchor-x="center" color="#00aaff" size="7">inline &lt;svg&gt;</text>

  <!-- ══════════════════════════════════════════════
       TEXT VARIANTS
       ══════════════════════════════════════════════ -->
  <text x="8" y="150" color="#44ffcc" size="8" bold="true">TEXT STYLES</text>

  <text x="8"   y="162" color="#ffffff" size="8">Normal text</text>
  <text x="8"   y="176" color="#ffcc44" size="11" bold="true">Bold text</text>
  <text x="8"   y="193" color="#ffffff" size="9"
        shadow="true" shadow-color="#0055ff" shadow-blur="8"
        shadow-x="0" shadow-y="0">Glow shadow</text>
  <text x="8"   y="210" color="#ff8844" size="9"
        outline="#000000" outline-width="2">Outlined text</text>
  <text x="8"   y="228" color="#88ffcc" size="8" font="sans-serif">Sans-serif font</text>
  <text x="8"   y="244" color="#cc88ff" size="8" font="serif">Serif font</text>

  <!-- Data-bound text token -->
  <text x="8"   y="260" color="#aaaaff" size="8">Score: {score}</text>
  <text x="8"   y="275" color="#ffaa44" size="8">Timer: {timer}s</text>

  <!-- ══════════════════════════════════════════════
       COLUMN 2 — INTERACTIVE (center)
       ══════════════════════════════════════════════ -->
  <text x="240" y="150" color="#ffcc44" size="8" bold="true">INTERACTIVE</text>

  <!-- Buttons with different states -->
  <button x="240" y="162" width="120" height="30" text="CLICK ME"
          fill="#1a3a6a" hover="#2a5aaa" stroke="#4488ff"
          text-color="#ffffff" radius="5" onclick="onButton1" />

  <button x="240" y="200" width="120" height="30" text="ACTION ★"
          fill="#3a1a00" hover="#7a3a00" stroke="#ff8800"
          text-color="#ffcc44" font-size="11" radius="5" onclick="onButton2" />

  <button x="240" y="238" width="120" height="30" text="TOGGLE UI"
          fill="#1a003a" hover="#3a0066" stroke="#aa44ff"
          text-color="#cc88ff" radius="5" onclick="onToggle" />

  <!-- Progress bars -->
  <text x="240" y="278" color="#aaaaff" size="8" bold="true">PROGRESS BARS</text>
  <progressbar x="240" y="290" width="155" height="12"
    value="{health}" max="100" fill="#e74c3c" background="#330000" radius="3" label="HP" />
  <progressbar x="240" y="308" width="155" height="12"
    value="{mana}" max="100" fill="#3498db" background="#000033" radius="3" label="MP" />
  <progressbar x="240" y="326" width="155" height="12"
    value="{cycle}" max="100" fill="#f39c12" background="#332200" radius="3" />

  <!-- ══════════════════════════════════════════════
       COLUMN 3 — GROUP + PANEL (right)
       ══════════════════════════════════════════════ -->
  <text x="420" y="22" color="#cc44ff" size="8" bold="true">GROUP &amp; PANEL</text>

  <!-- Group (clips children) -->
  <group x="420" y="33" width="210" height="70" clip="true">
    <rect  x="0"   y="0"  width="100%" height="100%" fill="#0a0a30" stroke="#cc44ff" />
    <text  x="8"   y="8"  color="#cc44ff" size="8">Clipped group</text>
    <circle x="140" y="35" r="50" fill="#331155cc" />
    <star  x="50"  y="35" r="20" inner-r="8" points="5" fill="#6622aa88" />
    <text  x="8"   y="54" color="#9966cc" size="7">Overflow is clipped →</text>
  </group>

  <!-- Panel with children -->
  <panel x="420" y="112" width="210" height="110"
         fill="#05051888" stroke="#44ccff"
         title="PANEL" title-height="26" title-size="10">
    <text x="12" y="36" color="#88ccff" size="9">Panels have titles</text>
    <text x="12" y="52" color="#aaaacc" size="8">+ nested children</text>
    <rect x="12" y="66" width="90"  height="10" fill="#1a3a5a" radius="2" />
    <rect x="12" y="66" width="{panelBar}" height="10" fill="#44aaff" radius="2" />
    <text x="12" y="80" color="#557799" size="7">Animated inner bar</text>
  </panel>

  <!-- Animated decorative stars in bottom-right -->
  <text x="420" y="232" color="#ffaa44" size="8" bold="true">ANIMATED</text>
  <star x="450" y="278" r="{rotR}" inner-r="{rotIr}" points="6"
        fill="#ffaa2288" stroke="#ffcc44" rotation="{rot}" />
  <star x="530" y="272" r="{rotR2}" inner-r="{rotIr2}" points="5"
        fill="#4466ff88" stroke="#88aaff" rotation="{rot2}" />
  <circle x="490" y="300" r="{pulseR}" fill="#ff224488" />
  <text x="490" y="335" anchor-x="center" color="#666688" size="7">stars + pulse</text>

  <!-- ══════════════════════════════════════════════
       MODAL (shown when toggled)
       ══════════════════════════════════════════════ -->
  <panel x="50%" y="50%" width="260" height="150" anchor="center"
         fill="#08081eee" stroke="#ffcc44" title="MODAL PANEL"
         radius="8" title-height="30">
    <text x="14" y="44" color="#ffffff" size="10" bold="true">Hello from a modal!</text>
    <text x="14" y="62" color="#aaaacc" size="8">Panels can overlay everything.</text>
    <text x="14" y="78" color="#aaaacc" size="8">Use anchor=&quot;center&quot; to centre.</text>
    <button x="14" y="100" width="100" height="26" text="CLOSE"
            fill="#332211" hover="#664422" stroke="#ffcc44"
            text-color="#ffcc44" radius="4" onclick="onToggle" />
  </panel>
</ui>`;

// Version without modal
const NO_MODAL_XML = SHOWCASE_XML.replace(/<panel x="50%"[\s\S]*?<\/panel>\s*<\/ui>/, '</ui>');

let uiFull, uiNoModal;
let t = 0;
let showModal = false;
let clickCount = 0;
let lastAction = 'none';

const handlers = {
  onButton1: () => {
    clickCount++;
    lastAction = 'button1';
  },
  onButton2: () => {
    clickCount++;
    lastAction = 'button2';
  },
  onToggle: () => {
    showModal = !showModal;
  },
};

export function init() {
  uiFull = parseCanvasUI(SHOWCASE_XML);
  uiNoModal = parseCanvasUI(NO_MODAL_XML);

  // Minimal 3D: just a dark clear
  setFog(0x0a0a18, 20, 60);
  setAmbientLight(0x111122, 0.4);
  setCameraPosition(0, 0, 10);
  setCameraTarget(0, 0, 0);
}

export function update(dt) {
  t += dt;
  const ui = showModal ? uiFull : uiNoModal;
  updateCanvasUI(ui, dt);
}

export function draw() {
  const cycle = ((Math.sin(t * 0.8) + 1) / 2) * 100;
  const panelBar = Math.round(((Math.sin(t * 1.5) + 1) / 2) * 90);

  const data = {
    score: String(Math.floor(t * 77)).padStart(6, '0'),
    timer: t.toFixed(1),
    health: (50 + Math.sin(t * 0.4) * 40).toFixed(0),
    mana: (40 + Math.cos(t * 0.6) * 35).toFixed(0),
    cycle: cycle.toFixed(0),
    panelBar,
    // Animated star
    rot: (t * 40).toFixed(1),
    rotR: (20 + Math.sin(t * 1.1) * 5).toFixed(1),
    rotIr: (8 + Math.sin(t * 1.1) * 2).toFixed(1),
    rot2: (-t * 28).toFixed(1),
    rotR2: (16 + Math.cos(t * 0.9) * 4).toFixed(1),
    rotIr2: (6).toFixed(1),
    pulseR: (10 + Math.abs(Math.sin(t * 2)) * 14).toFixed(1),
  };

  const ui = showModal ? uiFull : uiNoModal;
  renderCanvasUI(ui, data, handlers);
}
