// runtime/textinput.js
class TextInput {
  constructor() {
    this.active = false;
    this.value = '';
    this.maxLen = 128;
    this.placeholder = '';
    this._build();
  }
  _build() {
    const el = document.createElement('input');
    el.type = 'text';
    el.autocomplete = 'off';
    el.spellcheck = false;
    el.style.position = 'fixed';
    el.style.left = '50%';
    el.style.top = '10px';
    el.style.transform = 'translateX(-50%)';
    el.style.zIndex = '9998';
    el.style.fontSize = '14px';
    el.style.padding = '6px 10px';
    el.style.borderRadius = '8px';
    el.style.border = '1px solid #2a324a';
    el.style.background = '#202538';
    el.style.color = '#dcdfe4';
    el.style.display = 'none';
    document.body.appendChild(el);
    el.addEventListener('input', () => {
      if (el.value.length > this.maxLen) el.value = el.value.slice(0, this.maxLen);
      this.value = el.value;
    });
    // Enter submits, Escape cancels — so carts (e.g. chat) can resolve a line
    // without polling. The DOM input has focus while active, so canvas key
    // state won't see these; we surface them via onSubmit / onCancel callbacks.
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const v = this.value;
        const cb = this._onSubmit;
        this.stop();
        if (cb) cb(v);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        const cb = this._onCancel;
        this.stop();
        if (cb) cb();
      }
      // Don't let gameplay keybinds further up the DOM react while typing.
      e.stopPropagation();
    });
    this.el = el;
  }
  start(opts = {}) {
    this.active = true;
    this.value = opts.value || '';
    this.maxLen = opts.maxLen || 128;
    this.placeholder = opts.placeholder || '';
    this._onSubmit = typeof opts.onSubmit === 'function' ? opts.onSubmit : null;
    this._onCancel = typeof opts.onCancel === 'function' ? opts.onCancel : null;
    this.el.placeholder = this.placeholder;
    this.el.value = this.value;
    this.el.style.display = 'block';
    this.el.focus();
    this.el.selectionStart = this.el.selectionEnd = this.el.value.length;
  }
  isActive() {
    return this.active;
  }
  stop() {
    this.active = false;
    this.el.style.display = 'none';
    this.el.blur();
    return this.value;
  }
  get() {
    return this.value;
  }
}

const input = new TextInput();

export function textInputApi() {
  return {
    exposeTo(target) {
      Object.assign(target, {
        startTextInput: opts => input.start(opts || {}),
        stopTextInput: () => input.stop(),
        getTextInput: () => input.get(),
        isTextInputActive: () => input.isActive(),
      });
    },
  };
}
