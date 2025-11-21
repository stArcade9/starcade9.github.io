// examples/3d-advanced/code.js
// Epic space battle scene with capital ships, fighters, and spectacular effects

let capitalShips = [];
let fighters = [];
let projectiles = [];
let explosions = [];
let stars = [];
let nebula = [];
let time = 0;
let battleIntensity = 0;
let cameraTarget = { x: 0, y: 0, z: 0 };

// Screen management
let gameState = 'start'; // 'start', 'battle'
let startScreenTime = 0;
let uiButtons = [];

export async function init() {
  clearScene();
  
  // Cinematic camera setup
  setCameraPosition(0, 15, 30);
  setCameraTarget(0, 0, 0);
  setCameraFOV(80); // Wide cinematic FOV
  
  // Space atmosphere
  enablePixelation(1.1);
  enableDithering(true);
  setFog(0x0a0a30, 50, 150); // Lighter space fog with blue tint
  
  // 💡 PROPER LIGHTING SETUP - Make scene visible!
  setLightDirection(0.5, -0.7, -0.5); // Directional key light
  setLightColor(0xaabbff); // Bright blue-white light
  setAmbientLight(0x334466); // Essential ambient light to see everything!
  
  // Create the epic space battle
  createStarfield();
  createNebula();
  createCapitalShips();
  createFighterSquadrons();
  createBattleEffects();
  
  // Initialize start screen
  initStartScreen();
  
  console.log('Epic Space Battle initialized');
}

function initStartScreen() {
  uiButtons = [];
  
  uiButtons.push(
    createButton(centerX(240), 150, 240, 60, '▶ START BATTLE', () => {
      console.log('🎯 START BATTLE CLICKED! Changing gameState to battle...');
      gameState = 'battle';
      console.log('✅ gameState is now:', gameState);
    }, {
      normalColor: rgba8(200, 50, 50, 255),
      hoverColor: rgba8(230, 80, 80, 255),
      pressedColor: rgba8(170, 30, 30, 255)
    })
  );
  
  uiButtons.push(
    createButton(centerX(200), 355, 200, 45, '⚡ INFO', () => {
      console.log('3D Advanced - Epic space battle with advanced effects');
    }, {
      normalColor: rgba8(100, 150, 255, 255),
      hoverColor: rgba8(130, 180, 255, 255),
      pressedColor: rgba8(70, 120, 220, 255)
    })
  );
}

function createStarfield() {
  // ✨ Dense, beautiful starfield (BRIGHTER for visibility)
  for (let i = 0; i < 200; i++) {
    const distance = 50 + Math.random() * 100;
    const angle1 = Math.random() * Math.PI * 2;
    const angle2 = (Math.random() - 0.5) * Math.PI;
    
    const x = Math.cos(angle1) * Math.cos(angle2) * distance;
    const y = Math.sin(angle2) * distance;
    const z = Math.sin(angle1) * Math.cos(angle2) * distance;
    
    const brightness = Math.random();
    // Brighter star colors
    const color = brightness > 0.8 ? 0xeeffff : brightness > 0.6 ? 0xffdddd : 0xffffdd;
    const size = brightness > 0.9 ? 0.4 : 0.15;
    
    const star = createCube(size, color);
    setPosition(star, x, y, z);
    stars.push({ 
      mesh: star, 
      brightness, 
      twinkle: Math.random() * Math.PI * 2,
      originalPos: [x, y, z]
    });
  }
}

function createNebula() {
  // 🌌 Colorful nebula clouds for visual depth (BRIGHTER!)
  for (let i = 0; i < 15; i++) {
    const x = (Math.random() - 0.5) * 120;
    const y = (Math.random() - 0.5) * 60;
    const z = (Math.random() - 0.5) * 120;
    
    // Brighter nebula colors for visibility
    const colors = [0x8844aa, 0x4488aa, 0xaa8844, 0xaa4488, 0x44aa88];
    const cloud = createSphere(8 + Math.random() * 12, colors[i % colors.length], [0, 0, 0], 6);
    setPosition(cloud, x, y, z);
    
    nebula.push({
      mesh: cloud,
      drift: [(Math.random() - 0.5) * 0.1, (Math.random() - 0.5) * 0.05, (Math.random() - 0.5) * 0.1],
      rotation: [(Math.random() - 0.5) * 0.01, (Math.random() - 0.5) * 0.01, (Math.random() - 0.5) * 0.01],
      originalPos: [x, y, z]
    });
  }
}

function createCapitalShips() {
  // 🚀 Massive capital ships engaged in battle (BRIGHTER!)
  const shipConfigs = [
    { pos: [-25, 5, -15], color: 0x4499ff, faction: 'blue', size: [8, 3, 15] },
    { pos: [20, -3, 10], color: 0xff4499, faction: 'red', size: [6, 2, 12] },
    { pos: [-15, 8, 25], color: 0x4499ff, faction: 'blue', size: [10, 4, 18] },
    { pos: [30, -5, -20], color: 0xff4499, faction: 'red', size: [7, 3, 14] }
  ];
  
  shipConfigs.forEach((config, i) => {
    // Main hull
    const hull = createCube(1, config.color);
    setScale(hull, ...config.size);
    setPosition(hull, ...config.pos);
    setRotation(hull, 0, Math.random() * Math.PI * 2, Math.sin(i) * 0.1);
    
    // Command bridge (brighter)
    const bridge = createCube(1, config.color + 0x222222);
    setScale(bridge, config.size[0] * 0.3, config.size[1] * 1.5, config.size[2] * 0.2);
    setPosition(bridge, config.pos[0], config.pos[1] + config.size[1] * 0.8, config.pos[2]);
    
    // Engine glow (brighter cyan)
    const engine = createCube(1, 0x44ffff);
    setScale(engine, config.size[0] * 0.6, config.size[1] * 0.4, config.size[2] * 0.1);
    setPosition(engine, config.pos[0], config.pos[1], config.pos[2] - config.size[2] * 0.6);
    
    // Weapon turrets (brighter)
    for (let t = 0; t < 4; t++) {
      const turret = createSphere(0.8, 0x999999, [0, 0, 0], 8);
      const offsetX = (t % 2 === 0 ? -1 : 1) * config.size[0] * 0.4;
      const offsetZ = (t < 2 ? -1 : 1) * config.size[2] * 0.3;
      setPosition(turret, config.pos[0] + offsetX, config.pos[1] + config.size[1] * 0.6, config.pos[2] + offsetZ);
      
      capitalShips.push({ mesh: turret, parent: hull, type: 'turret', targetAngle: Math.random() * Math.PI * 2 });
    }
    
    capitalShips.push({ 
      mesh: hull, 
      bridge, 
      engine, 
      faction: config.faction,
      pos: config.pos,
      size: config.size,
      health: 100,
      fireTimer: Math.random() * 3,
      type: 'capital'
    });
  });
}

function createFighterSquadrons() {
  // ✈️ Swarms of small fighters (BRIGHTER!)
  for (let squad = 0; squad < 4; squad++) {
    const squadColor = squad % 2 === 0 ? 0x44aaff : 0xff44aa;
    const squadCenter = [
      (Math.random() - 0.5) * 60,
      (Math.random() - 0.5) * 20,
      (Math.random() - 0.5) * 60
    ];
    
    for (let f = 0; f < 8; f++) {
      const fighter = createCube(0.3, squadColor);
      setScale(fighter, 1.5, 0.4, 2);
      
      const angle = (f / 8) * Math.PI * 2;
      const radius = 3;
      const x = squadCenter[0] + Math.cos(angle) * radius;
      const y = squadCenter[1] + Math.sin(f * 0.5) * 2;
      const z = squadCenter[2] + Math.sin(angle) * radius;
      
      setPosition(fighter, x, y, z);
      setRotation(fighter, 0, angle, 0);
      
      // Engine trail (brighter)
      const trail = createCube(0.1, 0x66ddff);
      setScale(trail, 0.3, 0.1, 1);
      setPosition(trail, x - Math.cos(angle) * 1.2, y, z - Math.sin(angle) * 1.2);
      
      fighters.push({
        mesh: fighter,
        trail,
        squad,
        formation: { angle, radius },
        speed: 0.5 + Math.random() * 0.3,
        squadCenter,
        dodgeTimer: Math.random() * 2,
        fireTimer: Math.random() * 1.5
      });
    }
  }
}

function createBattleEffects() {
  // Weapon fire and explosions
  for (let i = 0; i < 50; i++) {
    const projectile = createCube(0.1, 0xffff00);
    setPosition(projectile, Math.random() * 100 - 50, Math.random() * 40 - 20, Math.random() * 100 - 50);
    
    projectiles.push({
      mesh: projectile,
      velocity: [(Math.random() - 0.5) * 20, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 20],
      life: Math.random() * 2,
      maxLife: 0.5 + Math.random(),
      type: Math.random() > 0.7 ? 'torpedo' : 'laser'
    });
  }
}

export function update(dt) {
  time += dt;
  battleIntensity = 0.5 + Math.sin(time * 0.3) * 0.5;
  
  if (gameState === 'start') {
    startScreenTime += dt;
    updateAllButtons();
    
    // Animate scene in background (with safety check)
    if (stars && stars.length > 0) {
      stars.forEach((star) => {
        if (star && star.mesh) {
          star.twinkle += dt * 2;
          const twinkleIntensity = (Math.sin(star.twinkle) + 1) * 0.5;
          const scale = star.brightness * (0.8 + twinkleIntensity * 0.4);
          setScale(star.mesh, scale);
        }
      });
    }
    
    // Slow camera orbit
    const angle = time * 0.15;
    setCameraPosition(Math.cos(angle) * 35, 20, Math.sin(angle) * 35);
    setCameraTarget(0, 0, 0);
    return;
  }
  
  // Twinkling stars (with safety check)
  if (stars && stars.length > 0) {
    stars.forEach((star) => {
      if (star && star.mesh) {
        star.twinkle += dt * 2;
        const twinkleIntensity = (Math.sin(star.twinkle) + 1) * 0.5;
        const scale = star.brightness * (0.8 + twinkleIntensity * 0.4);
        setScale(star.mesh, scale);
      }
    });
  }
  
  // Drifting nebula clouds (with safety check)
  if (nebula && nebula.length > 0) {
    nebula.forEach(cloud => {
      if (cloud && cloud.mesh) {
        const pos = getPosition(cloud.mesh);
        setPosition(cloud.mesh, 
          pos[0] + cloud.drift[0] * dt,
          pos[1] + cloud.drift[1] * dt,
          pos[2] + cloud.drift[2] * dt
        );
        rotateMesh(cloud.mesh, cloud.rotation[0] * dt, cloud.rotation[1] * dt, cloud.rotation[2] * dt);
      }
    });
  }
  
  // Capital ship battle animations (with safety check)
  if (capitalShips && capitalShips.length > 0) {
    capitalShips.forEach((ship, i) => {
    if (ship.type === 'capital') {
      // Ship movement and combat
      ship.fireTimer -= dt;
      if (ship.fireTimer <= 0) {
        ship.fireTimer = 2 + Math.random() * 3;
        spawnWeaponFire(ship.pos, ship.faction);
      }
      
      // Ship rocking from battle damage
      const rockIntensity = (100 - ship.health) / 100;
      const rock = Math.sin(time * 2 + i) * rockIntensity * 0.1;
      const yawAngle = Math.sin(time * 0.5 + i) * 0.2;
      setRotation(ship.mesh, rock * 0.5, yawAngle, rock);
      
      // Engine pulse
      const enginePulse = 0.8 + Math.sin(time * 5 + i) * 0.2;
      setScale(ship.engine, ship.size[0] * 0.6, ship.size[1] * 0.4, ship.size[2] * 0.1 * enginePulse);
      
    } else if (ship.type === 'turret') {
      // Turret tracking and rotation
      ship.targetAngle += dt * 0.5;
      rotateMesh(ship.mesh, 0, dt * 0.3, 0);
    }
    });
  }
  
  // Fighter squadron maneuvers (with safety check)
  if (fighters && fighters.length > 0) {
    fighters.forEach((fighter, i) => {
    fighter.dodgeTimer -= dt;
    fighter.fireTimer -= dt;
    
    // Formation flying with evasive maneuvers
    const formationAngle = fighter.formation.angle + time * fighter.speed;
    const evasion = fighter.dodgeTimer > 0 ? Math.sin(time * 10 + i) * 2 : 0;
    
    const targetX = fighter.squadCenter[0] + Math.cos(formationAngle) * (fighter.formation.radius + evasion);
    const targetY = fighter.squadCenter[1] + Math.sin(time * 2 + i) * 3 + evasion * 0.5;
    const targetZ = fighter.squadCenter[2] + Math.sin(formationAngle) * (fighter.formation.radius + evasion);
    
    setPosition(fighter.mesh, targetX, targetY, targetZ);
    setRotation(fighter.mesh, evasion * 0.1, formationAngle + Math.PI/2, evasion * 0.05);
    
    // Engine trail follows
    setPosition(fighter.trail, 
      targetX - Math.cos(formationAngle + Math.PI/2) * 1.5,
      targetY,
      targetZ - Math.sin(formationAngle + Math.PI/2) * 1.5
    );
    
    // Random evasive maneuvers
    if (Math.random() < 0.02) {
      fighter.dodgeTimer = 1 + Math.random();
    }
    
    // Weapon fire
    if (fighter.fireTimer <= 0) {
      fighter.fireTimer = 0.5 + Math.random() * 1.5;
      spawnProjectile([targetX, targetY, targetZ], 'fighter');
    }
    });
  }
  
  // Projectile physics and combat (with safety check)
  if (projectiles && projectiles.length > 0) {
    projectiles.forEach((proj) => {
    proj.life -= dt;
    if (proj.life <= 0) {
      proj.life = proj.maxLife;
      // Respawn projectile from random ship position
      const randomShip = capitalShips[Math.floor(Math.random() * capitalShips.length)];
      if (randomShip && randomShip.pos) {
        setPosition(proj.mesh, ...randomShip.pos);
        proj.velocity = [(Math.random() - 0.5) * 15, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 15];
      }
    }
    
    const pos = getPosition(proj.mesh);
    setPosition(proj.mesh,
      pos[0] + proj.velocity[0] * dt,
      pos[1] + proj.velocity[1] * dt,
      pos[2] + proj.velocity[2] * dt
    );
    
    // Projectile glow effect
    const glowIntensity = proj.life / proj.maxLife;
    setScale(proj.mesh, glowIntensity * (proj.type === 'torpedo' ? 0.3 : 0.1));
    
    // Spin torpedoes
    if (proj.type === 'torpedo') {
      rotateMesh(proj.mesh, dt * 5, dt * 3, 0);
    }
    });
  }
  
  // Dynamic cinematic camera
  const cameraDistance = 35 + Math.sin(time * 0.1) * 15;
  const cameraHeight = 8 + Math.sin(time * 0.15) * 12;
  const cameraAngle = time * 0.08 + Math.sin(time * 0.05) * 0.5;
  
  const camX = Math.cos(cameraAngle) * cameraDistance;
  const camY = cameraHeight;
  const camZ = Math.sin(cameraAngle) * cameraDistance;
  
  setCameraPosition(camX, camY, camZ);
  
  // Camera focuses on different parts of the battle
  const focusTarget = Math.floor(time * 0.1) % 3;
  switch (focusTarget) {
    case 0:
      cameraTarget = { x: 0, y: 0, z: 0 }; // Center of battle
      break;
    case 1: {
      // Find first capital ship (not turret)
      const capitalShip = capitalShips.find(s => s.type === 'capital');
      if (capitalShip && capitalShip.pos) {
        cameraTarget = { x: capitalShip.pos[0], y: capitalShip.pos[1], z: capitalShip.pos[2] };
      }
      break;
    }
    case 2:
      if (fighters.length > 0 && fighters[0].squadCenter) {
        cameraTarget = { x: fighters[0].squadCenter[0], y: fighters[0].squadCenter[1], z: fighters[0].squadCenter[2] };
      }
      break;
  }
  
  setCameraTarget(cameraTarget.x, cameraTarget.y, cameraTarget.z);
  
  // 💡 Dynamic lighting effects (maintains visibility!)
  const lightIntensity = battleIntensity;
  const lightX = 0.3 + Math.cos(time * 0.3) * 0.3;
  const lightY = -0.7 + Math.sin(time * 0.4) * 0.2;
  const lightZ = -0.5 + Math.sin(time * 0.2) * 0.3;
  setLightDirection(lightX, lightY, lightZ);
  
  // Pulsing light color for battle effects (ensure it stays bright!)
  const lightColorVariation = Math.floor(lightIntensity * 0x110033);
  setLightColor(0xaabbff + lightColorVariation);
  
  // Keep ambient light consistent for visibility (CRITICAL!)
  const ambientVariation = Math.floor(lightIntensity * 0x081018);
  setAmbientLight(0x334466 + ambientVariation);
  
  // 🌫️ Battle fog effects (lighter for visibility)
  const fogNear = 50 + battleIntensity * 15;
  const fogFar = 150 + battleIntensity * 30;
  const fogColor = Math.floor(0x0a0a30 + battleIntensity * 0x0a0a20);
  setFog(fogColor, fogNear, fogFar);
  
  // 🔧 DEBUG: Log lighting values to ensure they're set
  if (time < 1) {
    console.log('🔦 Battle Lighting:', {
      lightColor: (0xaabbff + lightColorVariation).toString(16),
      ambientLight: (0x334466 + ambientVariation).toString(16),
      fogColor: fogColor.toString(16)
    });
  }
}

function spawnWeaponFire(pos, faction) {
  // Create muzzle flash effect
  const flash = createCube(0.5, 0xffaa00);
  setPosition(flash, pos[0], pos[1], pos[2]);
  setTimeout(() => destroyMesh(flash), 100);
}

function spawnProjectile(pos, type) {
  // Find available projectile to reuse
  const availableProj = projectiles.find(p => p.life <= 0);
  if (availableProj) {
    availableProj.life = availableProj.maxLife;
    setPosition(availableProj.mesh, ...pos);
    availableProj.velocity = [(Math.random() - 0.5) * 12, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 12];
  }
}

export function draw() {
  if (gameState === 'start') {
    drawStartScreen();
    return;
  }
  
  // DON'T call cls() here - it clears the 3D scene!
  // The 3D scene is automatically rendered by the GPU
  
  // Epic space battle HUD (2D overlay on top of 3D scene)
  const hudColor = rgba8(0, 255, 100, 255);
  const warningColor = rgba8(255, 50, 50, 255);
  const infoColor = rgba8(100, 200, 255, 255);
  
  // Battle status
  print('GALACTIC BATTLE COMMAND', 8, 8, hudColor);
  
  const battlePhase = Math.floor(time / 10) % 3;
  const phases = ['ENGAGEMENT', 'HEAVY COMBAT', 'CRITICAL PHASE'];
  print(`STATUS: ${phases[battlePhase]}`, 8, 24, battlePhase === 2 ? warningColor : hudColor);
  
  // Fleet status
  const blueFleet = capitalShips.filter(s => s.faction === 'blue').length;
  const redFleet = capitalShips.filter(s => s.faction === 'red').length;
  print(`BLUE FLEET: ${blueFleet} SHIPS`, 8, 40, rgba8(100, 150, 255, 255));
  print(`RED FLEET: ${redFleet} SHIPS`, 8, 56, rgba8(255, 100, 150, 255));
  
  // Fighter status
  const activeFighters = fighters.length;
  print(`FIGHTERS: ${activeFighters} ACTIVE`, 8, 72, rgba8(255, 255, 100, 255));
  
  // Battle intensity
  const intensity = Math.floor(battleIntensity * 100);
  const intensityColor = intensity > 70 ? warningColor : intensity > 40 ? rgba8(255, 200, 0, 255) : hudColor;
  print(`INTENSITY: ${intensity}%`, 8, 88, intensityColor);
  
  // Tactical display (mini radar)
  const radarX = 220, radarY = 20, radarSize = 80;
  rect(radarX, radarY, radarSize, radarSize, rgba8(0, 50, 0, 150), true);
  rect(radarX, radarY, radarSize, radarSize, hudColor, false);
  
  // Grid lines
  for (let i = 1; i < 4; i++) {
    const gridPos = radarX + (radarSize / 4) * i;
    line(gridPos, radarY, gridPos, radarY + radarSize, rgba8(0, 100, 0, 100));
    line(radarX, radarY + (radarSize / 4) * i, radarX + radarSize, radarY + (radarSize / 4) * i, rgba8(0, 100, 0, 100));
  }
  
  // Radar blips for capital ships
  capitalShips.forEach(ship => {
    if (ship.type === 'capital') {
      const radarPosX = radarX + radarSize/2 + (ship.pos[0] / 60) * radarSize/2;
      const radarPosY = radarY + radarSize/2 + (ship.pos[2] / 60) * radarSize/2;
      const color = ship.faction === 'blue' ? rgba8(100, 150, 255, 255) : rgba8(255, 100, 150, 255);
      rect(radarPosX - 2, radarPosY - 2, 4, 4, color, true);
    }
  });
  
  // Radar sweep
  const sweepAngle = time * 2;
  const sweepX = radarX + radarSize/2 + Math.cos(sweepAngle) * radarSize/2;
  const sweepY = radarY + radarSize/2 + Math.sin(sweepAngle) * radarSize/2;
  line(radarX + radarSize/2, radarY + radarSize/2, sweepX, sweepY, rgba8(0, 255, 0, 150));
  
  // Performance stats
  if (typeof get3DStats === 'function') {
    const stats = get3DStats();
    if (stats.render) {
      print(`OBJECTS: ${stats.render.geometries}`, 8, 120, infoColor);
      print(`TRIANGLES: ${stats.render.triangles}`, 8, 136, infoColor);
      print(`DRAW CALLS: ${stats.render.calls}`, 8, 152, infoColor);
    }
  }
  
  // Mission briefing
  print('MISSION: Secure the sector', 8, 172, rgba8(255, 255, 255, 200));
  
  // Stardate
  const stardate = (2387 + time * 0.1).toFixed(1);
  print(`STARDATE: ${stardate}`, 200, 172, rgba8(200, 200, 200, 200));
}

function drawStartScreen() {
  // Deep space gradient background
  drawGradientRect(0, 0, 640, 360,
    rgba8(10, 5, 20, 235),
    rgba8(5, 2, 10, 250),
    true
  );
  
  // Animated title
  setFont('huge');
  setTextAlign('center');
  const pulse = Math.sin(startScreenTime * 3) * 0.4 + 0.6;
  const combatColor = rgba8(
    Math.floor(pulse * 255),
    Math.floor(pulse * 100),
    Math.floor(pulse * 50),
    255
  );
  
  const shake = Math.random() > 0.9 ? Math.floor(Math.random() * 6) - 3 : 0;
  drawTextShadow('3D ADVANCED', 320 + shake, 50, combatColor, rgba8(0, 0, 0, 255), 7, 1);
  drawTextShadow('SPACE BATTLE', 320, 105, rgba8(100, 150, 255, 255), rgba8(0, 0, 0, 255), 7, 1);
  
  // Subtitle
  setFont('large');
  const glow = Math.sin(startScreenTime * 4) * 0.2 + 0.8;
  drawTextOutline('⚡ Epic Capital Ship Combat ⚡', 320, 165, 
    rgba8(255, 200, 100, Math.floor(glow * 255)), 
    rgba8(0, 0, 0, 255), 1);
  
  // Info panel
  const panel = createPanel(centerX(480), 210, 480, 190, {
    bgColor: rgba8(15, 10, 25, 215),
    borderColor: rgba8(200, 50, 50, 255),
    borderWidth: 3,
    shadow: true,
    gradient: true,
    gradientColor: rgba8(25, 15, 35, 215)
  });
  drawPanel(panel);
  
  setFont('normal');
  setTextAlign('center');
  drawText('GALACTIC WAR SIMULATION', 320, 230, rgba8(255, 100, 100, 255), 1);
  
  setFont('small');
  drawText('⚡ Capital Ships + Fighter Squadrons', 320, 255, uiColors.light, 1);
  drawText('⚡ Real-time Combat with Projectiles & Explosions', 320, 270, uiColors.light, 1);
  drawText('⚡ 200+ Stars + Nebula Backgrounds', 320, 285, uiColors.light, 1);
  drawText('⚡ Advanced 3D Effects & Cinematic Camera', 320, 300, uiColors.light, 1);
  
  setFont('tiny');
  drawText('Demonstrates advanced Three.js features', 320, 320, uiColors.secondary, 1);
  
  // Draw buttons
  drawAllButtons();
  
  // Pulsing prompt
  const alpha = Math.floor((Math.sin(startScreenTime * 6) * 0.5 + 0.5) * 255);
  setFont('normal');
  drawText('⚡ PREPARE FOR BATTLE ⚡', 320, 430, rgba8(255, 100, 50, alpha), 1);
  
  // Info
  setFont('tiny');
  drawText('Full GPU-Accelerated 3D Combat', 320, 345, rgba8(150, 100, 150, 150), 1);
}