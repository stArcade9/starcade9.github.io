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
    this.el = el;
  }
  start(opts={}) {
    this.active = true;
    this.value = opts.value || '';
    this.maxLen = opts.maxLen || 128;
    this.placeholder = opts.placeholder || '';
    this.el.placeholder = this.placeholder;
    this.el.value = this.value;
    this.el.style.display = 'block';
    this.el.focus();
    this.el.selectionStart = this.el.selectionEnd = this.el.value.length;
  }
  stop() {
    this.active = false;
    this.el.style.display = 'none';
    this.el.blur();
    return this.value;
  }
  get() { return this.value; }
}

const input = new TextInput();

export function textInputApi() {
  return {
    exposeTo(target) {
      Object.assign(target, {
        startTextInput: (opts)=>input.start(opts||{}),
        stopTextInput: ()=>input.stop(),
        getTextInput: ()=>input.get()
      });
    }
  };
}
