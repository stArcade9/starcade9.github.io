// Nova64 Screen Management System Demo
// Demonstrates the new screen management API for creating multi-screen games

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
      
      if (isKeyPressed('w') && this.selectedOption > 0) {
        this.selectedOption--;
      }
      if (isKeyPressed('s') && this.selectedOption < this.options.length - 1) {
        this.selectedOption++;
      }
      
      if (isKeyPressed(' ')) {
        switch (this.selectedOption) {
          case 0: switchToScreen('game', { level: 1 }); break;
          case 1: switchToScreen('settings'); break;
          case 2: switchToScreen('credits'); break;
          case 3: console.log('Quit selected'); break;
        }
      }
    },
    
    draw() {
      const centerX = 160;
      
      // Animated title
      const titleY = 40 + Math.sin(this.animTime * 2) * 3;
      print('NOVA64 SCREENS', centerX - 50, titleY, rgba8(100, 255, 100));
      
      // Menu options
      this.options.forEach((option, i) => {
        const y = 100 + i * 25;
        const selected = i === this.selectedOption;
        const color = selected ? rgba8(255, 255, 0) : rgba8(200, 200, 200);
        
        if (selected) {
          print('> ' + option + ' <', centerX - 40, y, color);
        } else {
          print(option, centerX - 30, y, color);
        }
      });
      
      print('WASD = Navigate, Space = Select', centerX - 70, 200, rgba8(150, 150, 150));
    }
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
          level: this.level 
        });
      }
    },
    
    draw() {
      print(`Level: ${this.level}`, 10, 10, rgba8(255, 255, 255));
      print(`Score: ${this.score}`, 10, 30, rgba8(255, 255, 255));
      print(`Time: ${Math.floor(this.time)}s`, 10, 50, rgba8(255, 255, 255));
      print('Press M for Menu', 200, 10, rgba8(200, 200, 200));
      
      // Crosshair
      const centerX = 160, centerY = 90;
      line(centerX - 8, centerY, centerX + 8, centerY, 0xffffff);
      line(centerX, centerY - 8, centerX, centerY + 8, 0xffffff);
    },
    
    exit() {
      if (this.cube) destroyMesh(this.cube);
    }
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
      const centerX = 160;
      
      print('SETTINGS', centerX - 30, 50, rgba8(255, 255, 100));
      print(`Volume: ${this.volume}%`, centerX - 40, 100, rgba8(255, 255, 255));
      print('A/D to adjust volume', centerX - 50, 120, rgba8(150, 150, 150));
      print('Press M for Menu', centerX - 40, 160, rgba8(200, 200, 200));
    }
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
      const centerX = 160;
      const credits = [
        'NOVA64 SCREEN SYSTEM',
        '',
        'Programming: GitHub Copilot',
        'Framework: Nova64 v0.2.0',
        'Graphics: Three.js',
        '',
        'Built for retro gaming!'
      ];
      
      credits.forEach((line, i) => {
        const y = this.scrollY + i * 25;
        if (y > -20 && y < 200) {
          const color = line === '' ? 0 : rgba8(200, 200, 255);
          if (color !== 0) {
            print(line, centerX - line.length * 3, y, color);
          }
        }
      });
      
      print('Press M for Menu', centerX - 40, 220, rgba8(150, 150, 150));
    }
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
      const centerX = 160, centerY = 90;
      
      const flash = Math.sin(this.animTime * 6) > 0;
      const color = flash ? rgba8(255, 100, 100) : rgba8(200, 50, 50);
      
      print('GAME OVER', centerX - 35, centerY - 20, color);
      print(`Score: ${this.data.score}`, centerX - 30, centerY + 10, rgba8(255, 255, 255));
      print('Space = Menu, R = Retry', centerX - 55, centerY + 40, rgba8(200, 200, 200));
    }
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

init();