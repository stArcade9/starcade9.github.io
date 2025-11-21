// runtime/input.js
// Gamepad button mapping (standard gamepad layout)
const GAMEPAD_BUTTONS = {
  0: 12,  // A button → Start (button 12)
  1: 13,  // B button → Select (button 13)
  2: 4,   // X button → button 4
  3: 5,   // Y button → button 5
  4: 6,   // LB → button 6
  5: 7,   // RB → button 7
  6: 8,   // LT → button 8
  7: 9,   // RT → button 9
  8: 13,  // Select → button 13
  9: 12,  // Start → button 12
  12: 0,  // D-pad Up → button 0
  13: 3,  // D-pad Down → button 3
  14: 1,  // D-pad Left → button 1
  15: 2,  // D-pad Right → button 2
};

const KEYMAP = {
  // arrows + Z X C V
  0: 'ArrowLeft',  // left
  1: 'ArrowRight', // right
  2: 'ArrowUp',    // up
  3: 'ArrowDown',  // down
  4: 'KeyZ',
  5: 'KeyX',
  6: 'KeyC',
  7: 'KeyV',
  8: 'KeyA',
  9: 'KeyS',
  10: 'KeyQ',
  11: 'KeyW',
  12: 'Enter',  // Start
  13: 'Space',  // Select/Action
};

class Input {
  constructor() {
    this.keys = new Map();
    this.prev = new Map();
    this.mouse = { x:0, y:0, down:false, prevDown: false };
    this.uiCallbacks = { setMousePosition: null, setMouseButton: null };
    
    // Gamepad state
    this.gamepadButtons = new Map();
    this.gamepadPrev = new Map();
    this.gamepadAxes = { leftX: 0, leftY: 0, rightX: 0, rightY: 0 };
    this.gamepadDeadzone = 0.15;
    
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', e => { this.keys.set(e.code, true); });
      window.addEventListener('keyup', e => { this.keys.set(e.code, false); });
      window.addEventListener('blur', () => { this.keys.clear(); });
      
      // Mouse event listeners
      window.addEventListener('mousemove', e => {
        const canvas = document.querySelector('canvas');
        if (canvas) {
          const rect = canvas.getBoundingClientRect();
          // Scale mouse position to Nova64's 640x360 resolution
          this.mouse.x = Math.floor((e.clientX - rect.left) / rect.width * 640);
          this.mouse.y = Math.floor((e.clientY - rect.top) / rect.height * 360);
          
          // Update UI system if connected
          if (this.uiCallbacks.setMousePosition) {
            this.uiCallbacks.setMousePosition(this.mouse.x, this.mouse.y);
          }
        }
      });
      
      window.addEventListener('mousedown', _e => {
        this.mouse.down = true;
        if (this.uiCallbacks.setMouseButton) {
          this.uiCallbacks.setMouseButton(true);
        }
      });
      
      window.addEventListener('mouseup', _e => {
        this.mouse.down = false;
        if (this.uiCallbacks.setMouseButton) {
          this.uiCallbacks.setMouseButton(false);
        }
      });
      
      // Gamepad connection events
      window.addEventListener('gamepadconnected', (_e) => {
        // Gamepad connected
      });
      
      window.addEventListener('gamepaddisconnected', (_e) => {
        this.gamepadButtons.clear();
        this.gamepadPrev.clear();
      });
    }
  }
  
  pollGamepad() {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gamepad = gamepads[0]; // Use first connected gamepad
    
    if (gamepad) {
      // Read button states
      gamepad.buttons.forEach((button, index) => {
        const mappedButton = GAMEPAD_BUTTONS[index];
        if (mappedButton !== undefined) {
          this.gamepadButtons.set(mappedButton, button.pressed);
        }
      });
      
      // Read axes with deadzone
      if (gamepad.axes.length >= 4) {
        this.gamepadAxes.leftX = Math.abs(gamepad.axes[0]) > this.gamepadDeadzone ? gamepad.axes[0] : 0;
        this.gamepadAxes.leftY = Math.abs(gamepad.axes[1]) > this.gamepadDeadzone ? gamepad.axes[1] : 0;
        this.gamepadAxes.rightX = Math.abs(gamepad.axes[2]) > this.gamepadDeadzone ? gamepad.axes[2] : 0;
        this.gamepadAxes.rightY = Math.abs(gamepad.axes[3]) > this.gamepadDeadzone ? gamepad.axes[3] : 0;
      }
    }
  }
  
  // Connect UI system callbacks
  connectUI(setMousePosition, setMouseButton) {
    this.uiCallbacks.setMousePosition = setMousePosition;
    this.uiCallbacks.setMouseButton = setMouseButton;
  }
  step() {
    this.prev = new Map(this.keys);
    this.mouse.prevDown = this.mouse.down;
    this.gamepadPrev = new Map(this.gamepadButtons);
    this.pollGamepad(); // Poll gamepad state every frame
  }
  btn(i) { 
    // Check keyboard OR gamepad
    return !!this.keys.get(KEYMAP[i|0] || '') || !!this.gamepadButtons.get(i|0);
  }
  btnp(i) { 
    const code = KEYMAP[i|0] || ''; 
    const keyPressed = !!this.keys.get(code) && !this.prev.get(code);
    const gamepadPressed = !!this.gamepadButtons.get(i|0) && !this.gamepadPrev.get(i|0);
    return keyPressed || gamepadPressed;
  }
  key(code) { return !!this.keys.get(code); } // Direct key code checking
  
  // Gamepad-specific functions
  getGamepadAxis(axisName) {
    return this.gamepadAxes[axisName] || 0;
  }
  
  isGamepadConnected() {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    return gamepads[0] !== null && gamepads[0] !== undefined;
  }
  
  // Helper functions for easier key checking
  isKeyDown(keyCode) { 
    // Handle single character keys by converting to KeyCode format
    if (keyCode.length === 1) {
      keyCode = 'Key' + keyCode.toUpperCase();
    }
    return !!this.keys.get(keyCode); 
  }
  
  isKeyPressed(keyCode) { 
    // Handle single character keys by converting to KeyCode format
    if (keyCode.length === 1) {
      keyCode = 'Key' + keyCode.toUpperCase();
    }
    // Handle space key specially
    if (keyCode === ' ') keyCode = 'Space';
    return !!this.keys.get(keyCode) && !this.prev.get(keyCode); 
  }
}

export const input = new Input();

export function inputApi() {
  return {
    exposeTo(target) {
      Object.assign(target, {
        btn: (i)=>input.btn(i),
        btnp: (i)=>input.btnp(i),
        key: (code)=>input.key(code),
        isKeyDown: (code)=>input.isKeyDown(code),
        isKeyPressed: (code)=>input.isKeyPressed(code),
        // Mouse functions
        mouseX: () => input.mouse.x,
        mouseY: () => input.mouse.y,
        mouseDown: () => input.mouse.down,
        mousePressed: () => input.mouse.down && !input.mouse.prevDown,
        // Gamepad functions
        gamepadAxis: (axisName) => input.getGamepadAxis(axisName),
        gamepadConnected: () => input.isGamepadConnected(),
        // Axis aliases for convenience
        leftStickX: () => input.getGamepadAxis('leftX'),
        leftStickY: () => input.getGamepadAxis('leftY'),
        rightStickX: () => input.getGamepadAxis('rightX'),
        rightStickY: () => input.getGamepadAxis('rightY')
      });
    },
    step() { input.step(); },
    connectUI(setMousePosition, setMouseButton) {
      input.connectUI(setMousePosition, setMouseButton);
    }
  };
}
