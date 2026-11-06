const { dist, frameCount } = nova64.util;
const { t } = nova64.data;

const PAL = {
  bg: 0x0a0515,
  deep: 0x1a1030,
  crystal: 0xff3fa4,
  bat: 0xff8833,
  glow: 0x44e0ff,
  light: 0xffd23c,
};

let state = 'start';
let player;
let crystals = [];
let bats = [];
let particles = [];
let score = 0;
let combo = 0;
let comboTimer = 0;
let timeLeft = 60;
let flash = 0;
let shake = null;
let lastCrystall = 0;

const CRYSPEED = 0.8;
const BAT_SPEED = 1.5;

export function init() {
  nova64.light.setAmbientLight(0x332222, 0.5);
  nova64.light.setLightDirection(0, -1, 0);
  nova64.light.setLightColor(0xaa8866);
  nova64.light.setFog(PAL.bg, 3, 25);
  nova64.light.createGradientSkybox(PAL.bg, PAL.deep);
  nova64.light.enableSkyboxAutoAnimate(0.3);
  nova64.fx.enableRetroEffects({
    bloom: { strength: 1.2, radius: 0.5, threshold: 0.2 },
    vignette: { darkness: 0.9, offset: 0.85 },
    fxaa: true,
    dithering: true,
  });

  player = nova64.scene.createCube(0.5, PAL.glow, [0, 0.5, 0], {
    material: 'emissive',
    emissive: PAL.glow,
    intensity: 1.5,
  });

  const ground = nova64.scene.createPlane(20, 20, PAL.deep, [0, -0.5, 0], {
    material: 'standard',
    roughness: 0.8,
    metalness: 0.1,
  });
  nova64.scene.setRotation(ground, -Math.PI / 2, 0, 0);

  for (let i = 0; i < 8; i++) {
    const x = (Math.random() - 0.5) * 12;
    const z = (Math.random() - 0.5) * 12;
    const crystal = nova64.scene.createSphere(0.3, PAL.crystal, [x, 0.5, z], {
      material: 'emissive',
      emissive: PAL.crystal,
      intensity: 2,
    });
    const light = nova64.light.createPointLight(PAL.crystal, 2.5, 8, x, 0.8, z);
    crystals.push({ mesh: crystal, light, x, z });
  }

  for (let i = 0; i < 4; i++) {
    const x = (Math.random() - 0.5) * 12;
    const z = (Math.random() - 0.5) * 12;
    const bat = nova64.scene.createSphere(0.4, PAL.bat, [x, 0.5, z], {
      material: 'emissive',
      emissive: PAL.bat,
      intensity: 1.2,
    });
    const light = nova64.light.createPointLight(PAL.bat, 1.5, 6, x, 0.8, z);
    bats.push({ mesh: bat, light, x, z, vx: 0, vz: 0, pattern: i % 3 });
  }

  shake = nova64.util.createShake({ decay: 5 });
  nova64.camera.setCameraPosition(0, 5, 10);
  nova64.camera.setCameraTarget(0, 0, 0);
}

export function update(dt) {
  if (state === 'start') {
    if (nova64.input.keyp('Space') || nova64.input.keyp('KeyZ')) {
      state = 'play';
      score = 0;
      combo = 0;
      timeLeft = 60;
      comboTimer = 0;
      nova64.util.triggerShake(shake, 0.5);
      flash = 200;
    }
    return;
  }

  if (state === 'gameover') {
    if (nova64.input.keyp('Space') || nova64.input.keyp('KeyZ')) {
      state = 'start';
      score = 0;
      combo = 0;
      timeLeft = 60;
      comboTimer = 0;
      flash = 0;
      for (const c of crystals) {
        nova64.scene.setMeshVisible(c.mesh, true);
        nova64.light.setLightVisible(c.light, true);
      }
      for (const b of bats) {
        nova64.scene.setMeshVisible(b.mesh, true);
        nova64.light.setLightVisible(b.light, true);
      }
    }
    return;
  }

  const speed = 5;
  const moveX = (nova64.input.key('KeyA') ? -1 : 0) + (nova64.input.key('KeyD') ? 1 : 0);
  const moveZ = (nova64.input.key('KeyW') ? -1 : 0) + (nova64.input.key('KeyS') ? 1 : 0);
  const dx = moveX * speed * dt;
  const dz = moveZ * speed * dt;

  const pos = nova64.scene.getPosition(player);
  pos[0] += dx;
  pos[2] += dz;
  nova64.scene.setPosition(player, pos[0], pos[1], pos[2]);

  const camPos = [pos[0], 5, pos[2] + 8];
  const camTarget = [pos[0], 0, pos[2]];
  nova64.camera.setCameraPosition(camPos[0], camPos[1], camPos[2]);
  nova64.camera.setCameraTarget(camTarget[0], camTarget[1], camTarget[2]);

  timeLeft -= dt;
  if (timeLeft <= 0) {
    state = 'gameover';
    return;
  }

  comboTimer -= dt;
  if (comboTimer <= 0) combo = 0;

  for (const c of crystals) {
    const dist = Math.hypot(pos[0] - c.x, pos[2] - c.z);
    if (dist < 0.8) {
      nova64.scene.setMeshVisible(c.mesh, false);
      nova64.light.setLightVisible(c.light, false);
      score += 10 + combo * 5;
      combo++;
      comboTimer = 0.5;
      nova64.audio.sfx('coin');
      nova64.util.triggerShake(shake, 0.3);
      flash = 200;
    }
  }

  for (const b of bats) {
    const dist = Math.hypot(pos[0] - b.x, pos[2] - b.z);
    if (dist < 1.2) {
      state = 'gameover';
      nova64.audio.sfx('hit');
      nova64.util.triggerShake(shake, 0.8);
      flash = 255;
      return;
    }

    let vx = 0,
      vz = 0;
    const t = frameCount * 0.02;
    switch (b.pattern) {
      case 0:
        vx = Math.sin(t) * BAT_SPEED;
        vz = Math.cos(t) * BAT_SPEED;
        break;
      case 1:
        vx = Math.cos(t) * BAT_SPEED;
        vz = Math.sin(t) * BAT_SPEED;
        break;
      case 2:
        vx = Math.sin(t * 1.5) * BAT_SPEED;
        vz = Math.cos(t * 1.5) * BAT_SPEED;
        break;
    }

    b.x += vx * dt;
    b.z += vz * dt;
    nova64.scene.setPosition(b.mesh, b.x, 0.5, b.z);
    nova64.light.setPointLightPosition(b.light, b.x, 0.8, b.z);
  }

  nova64.util.updateShake(shake, dt);
  if (flash > 0) flash -= 300 * dt;
}

export function draw() {
  if (state === 'start') {
    const t = frameCount * 0.02;
    const fade = Math.floor(nova64.util.smoothstep(0, 2.0, t) * 255);
    nova64.draw.drawGradient(
      0,
      0,
      640,
      160,
      nova64.draw.rgba8(0, 0, 10, Math.floor(fade * 0.7)),
      nova64.draw.rgba8(0, 0, 5, 0),
      'v'
    );
    nova64.draw.drawStarburst(
      320,
      65,
      120,
      40,
      12,
      nova64.draw.rgba8(255, 180, 50, Math.floor(nova64.util.pulse(t, 0.8) * 40 + 20))
    );
    nova64.draw.drawRadialGradient(
      320,
      65,
      100,
      nova64.draw.rgba8(180, 120, 40, Math.floor(fade * 0.2)),
      nova64.draw.rgba8(0, 0, 0, 0)
    );
    nova64.draw.drawGlowTextCentered(
      'CRYSTAL CAVE',
      320,
      50,
      nova64.draw.rgba8(255, 210, 60, fade),
      nova64.draw.rgba8(200, 120, 0, Math.floor(fade * 0.6)),
      6
    );
    nova64.draw.printCentered(
      'Collect crystals, avoid bats',
      320,
      100,
      nova64.draw.rgba8(220, 180, 100, fade),
      2
    );
    nova64.draw.printCentered(
      '60 seconds to score high',
      320,
      130,
      nova64.draw.rgba8(170, 150, 130, fade)
    );
    if (t > 1.5) {
      nova64.draw.drawPulsingText(
        'Press Space to begin',
        320,
        260,
        nova64.draw.rgba8(255, 255, 255, 255),
        t,
        { frequency: 2.5, minAlpha: 160 }
      );
    }
    return;
  }

  if (state === 'gameover') {
    nova64.draw.drawGradient(
      0,
      0,
      640,
      360,
      nova64.draw.rgba8(0, 0, 0, 200),
      nova64.draw.rgba8(0, 0, 0, 255),
      'v'
    );
    nova64.draw.drawGlowTextCentered(
      'GAME OVER',
      320,
      120,
      nova64.draw.rgba8(255, 50, 50, 255),
      nova64.draw.rgba8(200, 0, 0, 150),
      6
    );
    nova64.draw.printCentered(`Score: ${score}`, 320, 180, nova64.draw.rgba8(255, 210, 60, 255), 3);
    nova64.draw.printCentered(
      'Press Space to restart',
      320,
      240,
      nova64.draw.rgba8(255, 255, 255, 255),
      2
    );
    return;
  }

  if (flash > 0) {
    nova64.draw.drawFlash(nova64.draw.rgba8(255, 255, 255, Math.floor(flash)));
  }

  const [sx, sy] = nova64.util.getShakeOffset(shake);
  nova64.camera.setCameraPosition(0 + sx * 0.02, 5 + sy * 0.02, 10 + sx * 0.02);

  nova64.draw.drawPanel(0, 308, 640, 52, {
    bgColor: nova64.draw.rgba8(10, 8, 15, 220),
    borderLight: nova64.draw.rgba8(60, 50, 40, 200),
    borderDark: nova64.draw.rgba8(20, 15, 10, 200),
  });

  const comboColor =
    combo > 0 ? nova64.draw.rgba8(255, 255, 0, 255) : nova64.draw.rgba8(255, 255, 255, 255);
  nova64.draw.print(`SCORE ${score}`, 10, 312, nova64.draw.rgba8(255, 210, 60, 255));
  nova64.draw.print(`COMBO x${combo}`, 120, 312, comboColor);
  nova64.draw.print(`TIME ${Math.ceil(timeLeft)}`, 500, 312, nova64.draw.rgba8(255, 255, 255, 255));
}
