// Nova64 Screen Management System Demo
// Demonstrates the new screen management API for creating multi-screen games

const {
  cls,
  drawGlowTextCentered,
  drawGradient,
  drawPixelBorder,
  drawRadialGradient,
  drawScanlines,
  line,
  print,
  printCentered,
  rgba8,
} = nova64.draw;
const { createCube, destroyMesh, setPosition, setRotation } = nova64.scene;
const { setCameraFOV, setCameraPosition, setCameraTarget } = nova64.camera;
const { setFog } = nova64.light;
const { isKeyPressed } = nova64.input;
const { Screen, addScreen, centerY, startScreens, switchToScreen } = nova64.ui;
const W = 640,
  H = 360;

export async function init() {
  console.log('🖥️ Nova64 Screen Management Demo');

  // Setup 3D scene
  cls();
  setCameraPosition(0, 5, 10);
  setCameraTarget(0, 0, 0);
  setCameraFOV(60);

  // Set background fog
  setFog(0x001122, 20, 100);

  // Register Menu Screen
  addScreen('menu', {
    enter() {
      console.log('📋 Menu Screen Active');
      this.selectedOption = 0;
      this.options = ['Start Game', 'Settings', 'Credits', 'Quit'];
      this.animTime = 0;
    },

    update(dt) {
      this.animTime += dt;

      if ((isKeyPressed('w') || isKeyPressed('ArrowUp')) && this.selectedOption > 0) {
        this.selectedOption--;
      }
      if (
        (isKeyPressed('s') || isKeyPressed('ArrowDown')) &&
        this.selectedOption < this.options.length - 1
      ) {
        this.selectedOption++;
      }

      if (isKeyPressed(' ') || isKeyPressed('Enter')) {
        switch (this.selectedOption) {
          case 0:
            switchToScreen('game', { level: 1 });
            break;
          case 1:
            switchToScreen('settings');
            break;
          case 2:
            switchToScreen('credits');
            break;
          case 3:
            console.log('Quit selected');
            break;
        }
      }
    },

    draw() {
      const cx = W / 2;

      // Dark gradient background
      drawGradient(0, 0, W, H, rgba8(5, 5, 22, 255), rgba8(16, 8, 42, 255), 'v');

      // Radial spotlight behind title
      drawRadialGradient(cx, 70, 120, rgba8(0, 180, 120, 35), rgba8(0, 0, 0, 0));

      // Title with glow
      const titleY = 40 + Math.sin(this.animTime * 2) * 3;
      drawGlowTextCentered('NOVA64', cx, titleY, rgba8(100, 255, 200, 255), rgba8(0, 100, 80, 140));

      // Pixel-bordered option box
      const boxY = 100;
      const boxH = this.options.length * 38 + 24;
      drawPixelBorder(
        60,
        boxY,
        W - 120,
        boxH,
        rgba8(70, 150, 255, 180),
        rgba8(18, 45, 110, 180),
        2
      );

      // Menu options
      this.options.forEach((option, i) => {
        const y = 115 + i * 38;
        const selected = i === this.selectedOption;

        if (selected) {
          // Highlight bar
          drawGradient(
            62,
            y - 3,
            W - 124,
            30,
            rgba8(50, 110, 255, 130),
            rgba8(25, 55, 190, 80),
            'v'
          );
          drawGlowTextCentered(
            '> ' + option + ' <',
            cx,
            y,
            rgba8(255, 255, 80, 255),
            rgba8(120, 100, 0, 90)
          );
        } else {
          printCentered(option, cx, y, rgba8(175, 180, 205, 255));
        }
      });

      printCentered(
        'W/S/\u2191\u2193  Navigate    Space/Enter  Select',
        cx,
        H - 60,
        rgba8(110, 115, 135, 255)
      );

      // CRT scanlines overlay
      drawScanlines(48, 2);
    },
  });

  // Register Game Screen
  addScreen('game', {
    enter(data) {
      console.log('🎮 Game Screen Active');
      this.level = data.level || 1;
      this.score = 0;
      this.time = 0;
      this.cube = createCube(2, 0x44aaff, [0, 0, 0]);
      this.rotation = 0;
    },

    update(dt) {
      this.time += dt;
      this.rotation += dt;
      this.score += Math.floor(dt * 10);

      setRotation(this.cube, this.rotation, this.rotation * 0.7, 0);
      setPosition(this.cube, Math.sin(this.time) * 3, 0, 0);

      if (isKeyPressed('m')) {
        switchToScreen('menu');
      }

      if (this.time > 15) {
        switchToScreen('gameOver', {
          score: this.score,
          level: this.level,
        });
      }
    },

    draw() {
      print(`Level: ${this.level}`, 10, 10, rgba8(255, 255, 255));
      print(`Score: ${this.score}`, 10, 30, rgba8(255, 255, 255));
      print(`Time: ${Math.floor(this.time)}s`, 10, 50, rgba8(255, 255, 255));
      print('Press M for Menu', W - 120, 10, rgba8(200, 200, 200));

      // Crosshair
      const centerX = W / 2,
        centerY = H / 2;
      line(centerX - 8, centerY, centerX + 8, centerY, 0xffffff);
      line(centerX, centerY - 8, centerX, centerY + 8, 0xffffff);
    },

    exit() {
      if (this.cube) destroyMesh(this.cube);
    },
  });

  // Register Settings Screen
  addScreen('settings', {
    enter() {
      console.log('⚙️ Settings Screen Active');
      this.volume = 75;
      this.difficulty = 'Normal';
    },

    update(dt) {
      if (isKeyPressed('a')) this.volume = Math.max(0, this.volume - 5);
      if (isKeyPressed('d')) this.volume = Math.min(100, this.volume + 5);

      if (isKeyPressed('m')) {
        switchToScreen('menu');
      }
    },

    draw() {
      const centerX = W / 2;

      print('SETTINGS', centerX - 30, 50, rgba8(255, 255, 100));
      print(`Volume: ${this.volume}%`, centerX - 40, 100, rgba8(255, 255, 255));
      print('A/D to adjust volume', centerX - 50, 120, rgba8(150, 150, 150));
      print('Press M for Menu', centerX - 40, 160, rgba8(200, 200, 200));
    },
  });

  // Register Credits Screen
  addScreen('credits', {
    enter() {
      console.log('📜 Credits Screen Active');
      this.scrollY = 200;
    },

    update(dt) {
      this.scrollY -= dt * 30;

      if (this.scrollY < -200) {
        this.scrollY = 200;
      }

      if (isKeyPressed('m')) {
        switchToScreen('menu');
      }
    },

    draw() {
      const centerX = W / 2;
      const credits = [
        'NOVA64 SCREEN SYSTEM',
        '',
        'Programming: GitHub Copilot',
        'Framework: Nova64 v0.2.0',
        'Graphics: Three.js',
        '',
        'Built for retro gaming!',
      ];

      credits.forEach((line, i) => {
        const y = this.scrollY + i * 25;
        if (y > -20 && y < H) {
          const color = line === '' ? 0 : rgba8(200, 200, 255);
          if (color !== 0) {
            print(line, centerX - line.length * 3, y, color);
          }
        }
      });

      print('Press M for Menu', centerX - 40, H - 20, rgba8(150, 150, 150));
    },
  });

  // Register Game Over Screen
  addScreen('gameOver', {
    enter(data) {
      console.log('💀 Game Over Screen Active');
      this.data = data;
      this.animTime = 0;
    },

    update(dt) {
      this.animTime += dt;

      if (isKeyPressed(' ')) {
        switchToScreen('menu');
      }

      if (isKeyPressed('r')) {
        switchToScreen('game', { level: this.data.level });
      }
    },

    draw() {
      const centerX = W / 2,
        centerY = H / 2;

      const flash = Math.sin(this.animTime * 6) > 0;
      const color = flash ? rgba8(255, 100, 100) : rgba8(200, 50, 50);

      print('GAME OVER', centerX - 35, centerY - 20, color);
      print(`Score: ${this.data.score}`, centerX - 30, centerY + 10, rgba8(255, 255, 255));
      print('Space = Menu, R = Retry', centerX - 55, centerY + 40, rgba8(200, 200, 200));
    },
  });

  // Start with menu
  startScreens('menu');
  console.log('✅ Screen System Ready!');
}

export function update(dt) {
  // Screen manager handles updates automatically
}

export function draw() {
  cls();
  // Screen manager handles drawing automatically
}
