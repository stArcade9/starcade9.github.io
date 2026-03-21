// runtime/ui/buttons.js
// Button creation, update, and rendering

/**
 * @param {{ g: object, colors: object, buttons: Array, mouse: { x:number, y:number, down:boolean, pressed:boolean },
 *           state: object, drawText: Function, setTextAlign: Function, setTextBaseline: Function }} ctx
 */
export function uiButtonsModule({
  g,
  colors,
  buttons,
  mouse,
  state,
  drawText,
  setTextAlign,
  setTextBaseline,
}) {
  function createButton(x, y, width, height, text, callback, options = {}) {
    const button = {
      id: `button_${Date.now()}_${Math.random()}`,
      x,
      y,
      width,
      height,
      text,
      callback,
      enabled: options.enabled !== undefined ? options.enabled : true,
      visible: options.visible !== undefined ? options.visible : true,
      normalColor: options.normalColor || colors.primary,
      hoverColor: options.hoverColor || g.rgba8(50, 150, 255, 255),
      pressedColor: options.pressedColor || g.rgba8(0, 80, 200, 255),
      disabledColor: options.disabledColor || g.rgba8(100, 100, 100, 255),
      textColor: options.textColor || colors.white,
      borderColor: options.borderColor || colors.white,
      borderWidth: options.borderWidth !== undefined ? options.borderWidth : 2,
      hovered: false,
      pressed: false,
      rounded: options.rounded || false,
      icon: options.icon || null,
    };
    buttons.push(button);
    return button;
  }

  function updateButton(button) {
    if (!button.enabled || !button.visible) {
      button.hovered = false;
      button.pressed = false;
      return false;
    }
    const over =
      mouse.x >= button.x &&
      mouse.x <= button.x + button.width &&
      mouse.y >= button.y &&
      mouse.y <= button.y + button.height;
    button.hovered = over;
    button.pressed = over && mouse.down;
    if (over && mouse.pressed) {
      if (button.callback) button.callback();
      return true;
    }
    return false;
  }

  function drawButton(button) {
    if (!button.visible) return;
    const { x, y, width, height } = button;
    let bgColor = button.normalColor;
    if (!button.enabled) bgColor = button.disabledColor;
    else if (button.pressed) bgColor = button.pressedColor;
    else if (button.hovered) bgColor = button.hoverColor;

    g.rect(x, y, width, height, bgColor, true);

    if (button.borderWidth > 0) {
      const bCol = button.hovered ? button.hoverColor : button.borderColor;
      for (let i = 0; i < button.borderWidth; i++) {
        g.rect(x + i, y + i, width - i * 2, height - i * 2, bCol, false);
      }
    }

    if (button.pressed)
      g.rect(x + 2, y + 2, width - 4, height - 4, g.rgba8(255, 255, 255, 50), true);

    const oldAlign = state.textAlign;
    const oldBaseline = state.textBaseline;
    setTextAlign('center');
    setTextBaseline('middle');
    const textY = button.pressed ? y + height / 2 + 1 : y + height / 2;
    drawText(button.text, x + width / 2, textY, button.textColor, 1);
    setTextAlign(oldAlign);
    setTextBaseline(oldBaseline);
  }

  function updateAllButtons() {
    let anyClicked = false;
    buttons.forEach(b => {
      if (updateButton(b)) anyClicked = true;
    });
    mouse.pressed = false; // consume click after all buttons have seen it
    return anyClicked;
  }

  function drawAllButtons() {
    buttons.forEach(b => drawButton(b));
  }
  function removeButton(b) {
    const i = buttons.indexOf(b);
    if (i >= 0) buttons.splice(i, 1);
  }
  function clearButtons() {
    buttons.length = 0;
  }

  return {
    createButton,
    updateButton,
    drawButton,
    updateAllButtons,
    drawAllButtons,
    removeButton,
    clearButtons,
  };
}
