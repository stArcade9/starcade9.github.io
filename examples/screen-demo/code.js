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
  nova64.draw.cls();
  nova64.camera.setCameraPosition(0, 5, 10);
  nova64.camera.setCameraTarget(0, 0, 0);
  nova64.camera.setCameraFOV(60);

  // Set background fog
  nova64.light.setFog(0x001122, 20, 100);

  // Register Menu Screen
  nova64.ui.addScreen('menu', {
    enter() {
      console.log('📋 Menu Screen Active');
      this.selectedOption = 0;
      this.options = ['Start Game', 'Settings', 'Credits', 'Quit'];
      this.animTime = 0;
    },

    update(dt) {
      this.animTime += dt;

      if (
        (nova64.input.isKeyPressed('w') || nova64.input.isKeyPressed('ArrowUp')) &&
        this.selectedOption > 0
      ) {
        this.selectedOption--;
      }
      if (
        (nova64.input.isKeyPressed('s') || nova64.input.isKeyPressed('ArrowDown')) &&
        this.selectedOption < this.options.length - 1
      ) {
        this.selectedOption++;
      }

      if (nova64.input.isKeyPressed(' ') || nova64.input.isKeyPressed('Enter')) {
        switch (this.selectedOption) {
          case 0:
            nova64.ui.switchToScreen('game', { level: 1 });
            break;
          case 1:
            nova64.ui.switchToScreen('settings');
            break;
          case 2:
            nova64.ui.switchToScreen('credits');
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
      nova64.draw.drawGradient(
        0,
        0,
        W,
        H,
        nova64.draw.rgba8(5, 5, 22, 255),
        nova64.draw.rgba8(16, 8, 42, 255),
        'v'
      );

      // Radial spotlight behind title
      nova64.draw.drawRadialGradient(
        cx,
        70,
        120,
        nova64.draw.rgba8(0, 180, 120, 35),
        nova64.draw.rgba8(0, 0, 0, 0)
      );

      // Title with glow
      const titleY = 40 + Math.sin(this.animTime * 2) * 3;
      nova64.draw.drawGlowTextCentered(
        'NOVA64',
        cx,
        titleY,
        nova64.draw.rgba8(100, 255, 200, 255),
        nova64.draw.rgba8(0, 100, 80, 140)
      );

      // Pixel-bordered option box
      const boxY = 100;
      const boxH = this.options.length * 38 + 24;
      nova64.draw.drawPixelBorder(
        60,
        boxY,
        W - 120,
        boxH,
        nova64.draw.rgba8(70, 150, 255, 180),
        nova64.draw.rgba8(18, 45, 110, 180),
        2
      );

      // Menu options
      this.options.forEach((option, i) => {
        const y = 115 + i * 38;
        const selected = i === this.selectedOption;

        if (selected) {
          // Highlight bar
          nova64.draw.drawGradient(
            62,
            y - 3,
            W - 124,
            30,
            nova64.draw.rgba8(50, 110, 255, 130),
            nova64.draw.rgba8(25, 55, 190, 80),
            'v'
          );
          nova64.draw.drawGlowTextCentered(
            '> ' + option + ' <',
            cx,
            y,
            nova64.draw.rgba8(255, 255, 80, 255),
            nova64.draw.rgba8(120, 100, 0, 90)
          );
        } else {
          nova64.draw.printCentered(option, cx, y, nova64.draw.rgba8(175, 180, 205, 255));
        }
      });

      nova64.draw.printCentered(
        'W/S/\u2191\u2193  Navigate    Space/Enter  Select',
        cx,
        H - 60,
        nova64.draw.rgba8(110, 115, 135, 255)
      );

      // CRT scanlines overlay
      nova64.draw.drawScanlines(48, 2);
    },
  });

  // Register Game Screen
  nova64.ui.addScreen('game', {
    enter(data) {
      console.log('🎮 Game Screen Active');
      this.level = data.level || 1;
      this.score = 0;
      this.time = 0;
      this.cube = nova64.scene.createCube(2, 0x44aaff, [0, 0, 0]);
      this.rotation = 0;
    },

    update(dt) {
      this.time += dt;
      this.rotation += dt;
      this.score += Math.floor(dt * 10);

      nova64.scene.setRotation(this.cube, this.rotation, this.rotation * 0.7, 0);
      nova64.scene.setPosition(this.cube, Math.sin(this.time) * 3, 0, 0);

      if (nova64.input.isKeyPressed('m')) {
        nova64.ui.switchToScreen('menu');
      }

      if (this.time > 15) {
        nova64.ui.switchToScreen('gameOver', {
          score: this.score,
          level: this.level,
        });
      }
    },

    draw() {
      nova64.draw.print(`Level: ${this.level}`, 10, 10, nova64.draw.rgba8(255, 255, 255));
      nova64.draw.print(`Score: ${this.score}`, 10, 30, nova64.draw.rgba8(255, 255, 255));
      nova64.draw.print(
        `Time: ${Math.floor(this.time)}s`,
        10,
        50,
        nova64.draw.rgba8(255, 255, 255)
      );
      nova64.draw.print('Press M for Menu', W - 120, 10, nova64.draw.rgba8(200, 200, 200));

      // Crosshair
      const centerX = W / 2,
        centerY = H / 2;
      nova64.draw.line(centerX - 8, centerY, centerX + 8, centerY, 0xffffff);
      nova64.draw.line(centerX, centerY - 8, centerX, centerY + 8, 0xffffff);
    },

    exit() {
      if (this.cube) nova64.scene.destroyMesh(this.cube);
    },
  });

  // Register Settings Screen
  nova64.ui.addScreen('settings', {
    enter() {
      console.log('⚙️ Settings Screen Active');
      this.volume = 75;
      this.difficulty = 'Normal';
    },

    update(dt) {
      if (nova64.input.isKeyPressed('a')) this.volume = Math.max(0, this.volume - 5);
      if (nova64.input.isKeyPressed('d')) this.volume = Math.min(100, this.volume + 5);

      if (nova64.input.isKeyPressed('m')) {
        nova64.ui.switchToScreen('menu');
      }
    },

    draw() {
      const centerX = W / 2;

      nova64.draw.print('SETTINGS', centerX - 30, 50, nova64.draw.rgba8(255, 255, 100));
      nova64.draw.print(
        `Volume: ${this.volume}%`,
        centerX - 40,
        100,
        nova64.draw.rgba8(255, 255, 255)
      );
      nova64.draw.print(
        'A/D to adjust volume',
        centerX - 50,
        120,
        nova64.draw.rgba8(150, 150, 150)
      );
      nova64.draw.print('Press M for Menu', centerX - 40, 160, nova64.draw.rgba8(200, 200, 200));
    },
  });

  // Register Credits Screen
  nova64.ui.addScreen('credits', {
    enter() {
      console.log('📜 Credits Screen Active');
      this.scrollY = 200;
    },

    update(dt) {
      this.scrollY -= dt * 30;

      if (this.scrollY < -200) {
        this.scrollY = 200;
      }

      if (nova64.input.isKeyPressed('m')) {
        nova64.ui.switchToScreen('menu');
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
          const color = line === '' ? 0 : nova64.draw.rgba8(200, 200, 255);
          if (color !== 0) {
            nova64.draw.print(line, centerX - line.length * 3, y, color);
          }
        }
      });

      nova64.draw.print('Press M for Menu', centerX - 40, H - 20, nova64.draw.rgba8(150, 150, 150));
    },
  });

  // Register Game Over Screen
  nova64.ui.addScreen('gameOver', {
    enter(data) {
      console.log('💀 Game Over Screen Active');
      this.data = data;
      this.animTime = 0;
    },

    update(dt) {
      this.animTime += dt;

      if (nova64.input.isKeyPressed(' ')) {
        nova64.ui.switchToScreen('menu');
      }

      if (nova64.input.isKeyPressed('r')) {
        nova64.ui.switchToScreen('game', { level: this.data.level });
      }
    },

    draw() {
      const centerX = W / 2,
        centerY = H / 2;

      const flash = Math.sin(this.animTime * 6) > 0;
      const color = flash ? nova64.draw.rgba8(255, 100, 100) : nova64.draw.rgba8(200, 50, 50);

      nova64.draw.print('GAME OVER', centerX - 35, centerY - 20, color);
      nova64.draw.print(
        `Score: ${this.data.score}`,
        centerX - 30,
        centerY + 10,
        nova64.draw.rgba8(255, 255, 255)
      );
      nova64.draw.print(
        'Space = Menu, R = Retry',
        centerX - 55,
        centerY + 40,
        nova64.draw.rgba8(200, 200, 200)
      );
    },
  });

  // Start with menu
  nova64.ui.startScreens('menu');
  console.log('✅ Screen System Ready!');
}

export function update(dt) {
  // Screen manager handles updates automatically
}

export function draw() {
  nova64.draw.cls();
  // Screen manager handles drawing automatically
}
