// Nova64 Screen Management System
// Provides easy-to-use screen transitions and state management

export class ScreenManager {
  constructor() {
    this.screens = new Map();
    this.currentScreen = null;
    this.nextScreen = null;
    this.transition = null;
    this.defaultScreen = null;
  }

  // Register a screen with the manager
  addScreen(name, screenDefinition) {
    if (typeof screenDefinition === 'function') {
      // If it's a function, wrap it as a screen class
      const ScreenClass = screenDefinition;
      this.screens.set(name, new ScreenClass());
    } else {
      // Direct object with methods
      this.screens.set(name, screenDefinition);
    }
    
    // Set first screen as default
    if (!this.defaultScreen) {
      this.defaultScreen = name;
    }
    
    return this;
  }

  // Switch to a different screen
  switchTo(screenName, data = {}) {
    const screen = this.screens.get(screenName);
    if (!screen) {
      console.warn(`Screen '${screenName}' not found`);
      return false;
    }

    // Exit current screen
    if (this.currentScreen) {
      const currentScreenObj = this.screens.get(this.currentScreen);
      if (currentScreenObj && typeof currentScreenObj.exit === 'function') {
        currentScreenObj.exit();
      }
    }

    // Enter new screen
    this.currentScreen = screenName;
    if (typeof screen.enter === 'function') {
      screen.enter(data);
    }

    return true;
  }

  // Start with the first screen or specified screen
  start(screenName = null) {
    const startScreen = screenName || this.defaultScreen;
    if (startScreen) {
      this.switchTo(startScreen);
    }
  }

  // Update current screen
  update(dt) {
    if (this.currentScreen) {
      const screen = this.screens.get(this.currentScreen);
      if (screen && typeof screen.update === 'function') {
        screen.update(dt);
      }
    }
  }

  // Draw current screen
  draw() {
    if (this.currentScreen) {
      const screen = this.screens.get(this.currentScreen);
      if (screen && typeof screen.draw === 'function') {
        screen.draw();
      }
    }
  }

  // Get current screen name
  getCurrentScreen() {
    return this.currentScreen;
  }

  // Get current screen object
  getCurrentScreenObject() {
    return this.currentScreen ? this.screens.get(this.currentScreen) : null;
  }
}

// Base Screen class for inheritance
export class Screen {
  constructor() {
    this.data = {};
  }

  // Called when entering this screen
  enter(data = {}) {
    this.data = { ...this.data, ...data };
  }

  // Called when exiting this screen
  exit() {
    // Override in subclasses
  }

  // Called every frame
  update(dt) {
    // Override in subclasses
  }

  // Called every frame for rendering
  draw() {
    // Override in subclasses
  }
}

// Utility function to create screen manager API
export function screenApi() {
  const manager = new ScreenManager();

  return {
    manager,
    
    exposeTo(target) {
      // Expose screen management functions globally
      target.ScreenManager = ScreenManager;
      target.Screen = Screen;
      target.screens = manager;
      
      // Convenience functions
      target.addScreen = (name, definition) => manager.addScreen(name, definition);
      target.switchToScreen = (name, data) => manager.switchTo(name, data);
      target.switchScreen = (name, data) => manager.switchTo(name, data); // Alias for compatibility
      target.getCurrentScreen = () => manager.getCurrentScreen();
      target.startScreens = (initialScreen) => manager.start(initialScreen);
    }
  };
}

// Example usage patterns:

// Pattern 1: Object-based screens
/*
addScreen('menu', {
  enter() {
    console.log('Entered menu');
  },
  update(dt) {
    if (key('Space')) {
      switchToScreen('game');
    }
  },
  draw() {
    print('MAIN MENU', 100, 100, rgba8(255, 255, 255));
    print('Press Space to Start', 100, 120, rgba8(200, 200, 200));
  }
});
*/

// Pattern 2: Class-based screens
/*
class GameScreen extends Screen {
  enter(data) {
    super.enter(data);
    this.score = data.score || 0;
    this.lives = 3;
  }
  
  update(dt) {
    // Game logic here
    if (this.lives <= 0) {
      switchToScreen('gameOver', { score: this.score });
    }
  }
  
  draw() {
    print(`Score: ${this.score}`, 10, 10, rgba8(255, 255, 255));
    print(`Lives: ${this.lives}`, 10, 30, rgba8(255, 255, 255));
  }
}

addScreen('game', GameScreen);
*/

// Pattern 3: Function-based screens (creates class internally)
/*
function createMenuScreen() {
  return class extends Screen {
    enter() {
      this.selectedOption = 0;
      this.options = ['Start Game', 'Settings', 'Quit'];
    }
    
    update(dt) {
      if (key('KeyW') && this.selectedOption > 0) this.selectedOption--;
      if (key('KeyS') && this.selectedOption < this.options.length - 1) this.selectedOption++;
      
      if (key('Space')) {
        switch (this.selectedOption) {
          case 0: switchToScreen('game'); break;
          case 1: switchToScreen('settings'); break;
          case 2: quit(); break;
        }
      }
    }
    
    draw() {
      this.options.forEach((option, i) => {
        const color = i === this.selectedOption ? rgba8(255, 255, 0) : rgba8(255, 255, 255);
        print(option, 100, 100 + i * 20, color);
      });
    }
  };
}

addScreen('menu', createMenuScreen());
*/