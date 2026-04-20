// runtime/debug-panel.js
// In-browser debug overlay for Nova64 — toggle with F9 or ?debug=1
// Provides live scene graph, camera inspector, performance stats, light editors,
// time controls, object inspector, console log viewer, and cart reload.

export class DebugPanel {
  constructor(gpu) {
    this.gpu = gpu;
    this.opened = false;
    this._highlightHelper = null;
    this._selectedObj = null;
    this._timeScale = 1;
    this._onPause = null;
    this._onStep = null;
    this._onReload = null;
    this._isPaused = false;
    this._logHistory = [];
    this._maxLogs = 80;
    this._buildUI();
    this._lastRefresh = 0;
    this._hookConsole();
  }

  // ── public API ──────────────────────────────────────────────────────────────

  toggle() {
    this.opened = !this.opened;
    this.wrap.style.display = this.opened ? 'flex' : 'none';
    if (this.opened) this._refresh();
  }

  /** Call once per frame from the game loop */
  update() {
    if (!this.opened) return;
    const now = performance.now();
    if (now - this._lastRefresh < 100) return;
    this._lastRefresh = now;
    this._refreshStats();
    this._refreshCamera();
    this._refreshInspector();
  }

  /** Returns the current time scale multiplier (1 = normal, 0.25 = slow-mo) */
  getTimeScale() {
    return this._timeScale;
  }

  /** Set pause state from outside (keeps button in sync) */
  setPaused(v) {
    this._isPaused = v;
    if (this._pauseBtn) this._pauseBtn.textContent = v ? '\u25B6' : '\u23F8';
  }

  /** Wire control callbacks from main.js */
  setCallbacks({ onPause, onStep, onReload }) {
    this._onPause = onPause;
    this._onStep = onStep;
    this._onReload = onReload;
  }

  destroy() {
    this._removeHighlight();
    this.wrap.remove();
  }

  // ── UI construction ─────────────────────────────────────────────────────────

  _buildUI() {
    const wrap = document.createElement('div');
    wrap.id = 'nova64-debug';
    wrap.style.cssText = [
      'position:fixed;top:0;right:0;bottom:0;width:340px',
      'background:rgba(12,14,22,0.92);color:#dcdfe4;font:12px/1.5 monospace',
      'display:none;flex-direction:column;z-index:99998;border-left:1px solid #2a2f42',
      'overflow-y:auto;user-select:none;backdrop-filter:blur(6px)',
    ].join(';');
    this.wrap = wrap;

    // Header
    const hdr = this._el('div', {
      css: 'padding:8px 12px;background:#151822;border-bottom:1px solid #2a2f42;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;',
    });
    hdr.innerHTML = '<span style="font-weight:700;color:#c084fc">\u{1F3AE} Nova64 Debug</span>';
    const closeBtn = this._el('button', {
      css: 'background:none;border:none;color:#888;cursor:pointer;font:14px monospace;',
      text: '\u2715',
    });
    closeBtn.onclick = () => this.toggle();
    hdr.appendChild(closeBtn);
    wrap.appendChild(hdr);

    // ── Time Controls (inline bar) ────────────────────────────────────────
    const timeBar = this._el('div', {
      css: 'padding:6px 12px;background:#111422;border-bottom:1px solid #1f2433;display:flex;align-items:center;gap:6px;flex-shrink:0;',
    });

    const pauseBtn = this._el('button', {
      text: '\u23F8',
      css: 'background:#1a1d2e;border:1px solid #2a2f42;color:#e2e8f0;cursor:pointer;padding:2px 8px;border-radius:3px;font:13px monospace;',
    });
    pauseBtn.title = 'Pause / Resume';
    pauseBtn.onclick = () => {
      if (this._onPause) this._onPause();
    };
    this._pauseBtn = pauseBtn;
    timeBar.appendChild(pauseBtn);

    const stepBtn = this._el('button', {
      text: '\u23ED',
      css: 'background:#1a1d2e;border:1px solid #2a2f42;color:#e2e8f0;cursor:pointer;padding:2px 8px;border-radius:3px;font:13px monospace;',
    });
    stepBtn.title = 'Step one frame';
    stepBtn.onclick = () => {
      if (this._onStep) this._onStep();
    };
    timeBar.appendChild(stepBtn);

    const reloadBtn = this._el('button', {
      text: '\u21BB',
      css: 'background:#1a1d2e;border:1px solid #2a2f42;color:#e2e8f0;cursor:pointer;padding:2px 8px;border-radius:3px;font:13px monospace;',
    });
    reloadBtn.title = 'Reload cart';
    reloadBtn.onclick = () => {
      if (this._onReload) this._onReload();
    };
    timeBar.appendChild(reloadBtn);

    // Time scale slider
    timeBar.appendChild(
      this._el('span', { text: 'Speed', css: 'color:#888;font-size:10px;margin-left:4px;' })
    );
    const speedSlider = document.createElement('input');
    speedSlider.type = 'range';
    speedSlider.min = '0';
    speedSlider.max = '2';
    speedSlider.step = '0.05';
    speedSlider.value = '1';
    speedSlider.style.cssText = 'flex:1;accent-color:#c084fc;';
    const speedLabel = this._el('span', {
      text: '1.0x',
      css: 'color:#e2e8f0;font-size:10px;width:28px;text-align:right;',
    });
    speedSlider.oninput = () => {
      this._timeScale = parseFloat(speedSlider.value);
      speedLabel.textContent = this._timeScale.toFixed(1) + 'x';
    };
    timeBar.appendChild(speedSlider);
    timeBar.appendChild(speedLabel);
    wrap.appendChild(timeBar);

    // ── Sections ──────────────────────────────────────────────────────────
    this.statsSection = this._section('\u{1F4CA} Performance');
    this.statsBody = this.statsSection.querySelector('.dbg-body');
    wrap.appendChild(this.statsSection);

    this.cameraSection = this._section('\u{1F4F7} Camera');
    this.cameraBody = this.cameraSection.querySelector('.dbg-body');
    wrap.appendChild(this.cameraSection);

    this.sceneSection = this._section('\u{1F333} Scene Graph');
    this.sceneBody = this.sceneSection.querySelector('.dbg-body');
    wrap.appendChild(this.sceneSection);

    this.inspectorSection = this._section('\u{1F50D} Inspector', true);
    this.inspectorBody = this.inspectorSection.querySelector('.dbg-body');
    this.inspectorBody.innerHTML =
      '<span style="color:#666;font-size:11px">Click an object in the scene graph</span>';
    wrap.appendChild(this.inspectorSection);

    this.lightsSection = this._section('\u{1F4A1} Lights');
    this.lightsBody = this.lightsSection.querySelector('.dbg-body');
    wrap.appendChild(this.lightsSection);

    this.logSection = this._section('\u{1F4DD} Console Log', true);
    this.logBody = this.logSection.querySelector('.dbg-body');
    this.logBody.style.cssText += 'max-height:200px;overflow-y:auto;font-size:10px;';
    wrap.appendChild(this.logSection);

    document.body.appendChild(wrap);
  }

  /**
   * @param {string} title
   * @param {boolean} [collapsed=false] start collapsed
   */
  _section(title, collapsed) {
    const sec = this._el('div', { css: 'border-bottom:1px solid #1f2433;' });
    const hdr = this._el('div', {
      css: 'padding:6px 12px;background:#1a1d2e;cursor:pointer;display:flex;justify-content:space-between;align-items:center;',
    });
    const label = this._el('span', { text: title, css: 'font-weight:600;font-size:11px;' });
    const arrow = this._el('span', {
      text: collapsed ? '\u25B8' : '\u25BE',
      css: 'font-size:10px;color:#888;',
    });
    hdr.appendChild(label);
    hdr.appendChild(arrow);
    const body = this._el('div', { css: 'padding:6px 12px;' });
    body.className = 'dbg-body';
    if (collapsed) body.style.display = 'none';
    hdr.onclick = () => {
      const isCollapsed = body.style.display === 'none';
      body.style.display = isCollapsed ? 'block' : 'none';
      arrow.textContent = isCollapsed ? '\u25BE' : '\u25B8';
    };
    sec.appendChild(hdr);
    sec.appendChild(body);
    return sec;
  }

  _el(tag, opts = {}) {
    const el = document.createElement(tag);
    if (opts.css) el.style.cssText = opts.css;
    if (opts.text) el.textContent = opts.text;
    return el;
  }

  // ── Stats ───────────────────────────────────────────────────────────────────

  _refreshStats() {
    const info = this.gpu.renderer.info;
    const fps = typeof globalThis.getFPS === 'function' ? globalThis.getFPS() : '\u2014';
    const mem = info.memory || {};
    const render = info.render || {};
    this.statsBody.innerHTML = [
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:2px 12px;">',
      '<span style="color:#888">FPS</span><span style="color:#4ade80;font-weight:700">' +
        fps +
        '</span>',
      '<span style="color:#888">Triangles</span><span>' + (render.triangles ?? 0) + '</span>',
      '<span style="color:#888">Draw calls</span><span>' + (render.calls ?? 0) + '</span>',
      '<span style="color:#888">Geometries</span><span>' + (mem.geometries ?? 0) + '</span>',
      '<span style="color:#888">Textures</span><span>' + (mem.textures ?? 0) + '</span>',
      '<span style="color:#888">Programs</span><span>' + (info.programs?.length ?? 0) + '</span>',
      '</div>',
    ].join('');
  }

  // ── Camera ──────────────────────────────────────────────────────────────────

  _refreshCamera() {
    const cam = this.gpu.camera;
    if (!cam) return;
    const p = cam.position;
    const t = this.gpu.cameraTarget;
    if (this.cameraBody.querySelector('input:focus')) return;
    this.cameraBody.innerHTML = '';
    const grid = this._el('div', {
      css: 'display:grid;grid-template-columns:auto 1fr 1fr 1fr;gap:4px;align-items:center;',
    });

    grid.appendChild(this._el('span', { text: 'Pos', css: 'color:#888;' }));
    grid.appendChild(
      this._numInput(p.x, v => {
        if (typeof globalThis.setCameraPosition === 'function')
          globalThis.setCameraPosition(v, p.y, p.z);
      })
    );
    grid.appendChild(
      this._numInput(p.y, v => {
        if (typeof globalThis.setCameraPosition === 'function')
          globalThis.setCameraPosition(p.x, v, p.z);
      })
    );
    grid.appendChild(
      this._numInput(p.z, v => {
        if (typeof globalThis.setCameraPosition === 'function')
          globalThis.setCameraPosition(p.x, p.y, v);
      })
    );

    if (t) {
      grid.appendChild(this._el('span', { text: 'Tgt', css: 'color:#888;' }));
      grid.appendChild(
        this._numInput(t.x, v => {
          if (typeof globalThis.setCameraTarget === 'function')
            globalThis.setCameraTarget(v, t.y, t.z);
        })
      );
      grid.appendChild(
        this._numInput(t.y, v => {
          if (typeof globalThis.setCameraTarget === 'function')
            globalThis.setCameraTarget(t.x, v, t.z);
        })
      );
      grid.appendChild(
        this._numInput(t.z, v => {
          if (typeof globalThis.setCameraTarget === 'function')
            globalThis.setCameraTarget(t.x, t.y, v);
        })
      );
    }

    grid.appendChild(this._el('span', { text: 'FOV', css: 'color:#888;' }));
    const fovInput = this._numInput(cam.fov, v => {
      if (typeof globalThis.setCameraFOV === 'function') globalThis.setCameraFOV(v);
    });
    fovInput.style.gridColumn = 'span 3';
    grid.appendChild(fovInput);

    this.cameraBody.appendChild(grid);
  }

  _numInput(value, onChange) {
    const inp = document.createElement('input');
    inp.type = 'number';
    inp.step = '0.1';
    inp.value = Number(value).toFixed(2);
    inp.style.cssText =
      'width:100%;background:#0d0f18;border:1px solid #2a2f42;color:#e2e8f0;padding:2px 4px;border-radius:3px;font:11px monospace;';
    inp.onchange = () => {
      const v = parseFloat(inp.value);
      if (Number.isFinite(v)) onChange(v);
    };
    return inp;
  }

  // ── Scene Graph ─────────────────────────────────────────────────────────────

  _refresh() {
    this._refreshStats();
    this._refreshCamera();
    this._refreshScene();
    this._refreshLights();
    this._refreshLog();
  }

  _refreshScene() {
    this.sceneBody.innerHTML = '';
    const scene = this.gpu.scene;
    if (!scene) return;
    for (const child of scene.children) {
      this._buildTree(child, this.sceneBody, 0);
    }
  }

  _buildTree(obj, parent, depth) {
    if (obj === this._highlightHelper) return;
    if (obj.isLight) return;
    if (depth > 6) return;

    const isSelected = obj === this._selectedObj;
    const row = this._el('div', {
      css:
        'padding:2px 0 2px ' +
        depth * 14 +
        'px;display:flex;align-items:center;gap:6px;cursor:pointer;border-radius:3px;' +
        (isSelected ? 'background:#262a3d;' : ''),
    });
    row.onmouseenter = () => {
      row.style.background = isSelected ? '#262a3d' : '#1f2433';
    };
    row.onmouseleave = () => {
      row.style.background = isSelected ? '#262a3d' : 'transparent';
    };

    const visibleChildren = obj.children
      ? obj.children.filter(c => !c.isLight && c !== this._highlightHelper)
      : [];
    const hasChildren = visibleChildren.length > 0;

    const arrow = this._el('span', {
      text: hasChildren ? '\u25B8' : ' ',
      css: 'font-size:9px;color:#888;width:10px;flex-shrink:0;',
    });
    row.appendChild(arrow);

    row.appendChild(
      this._el('span', { text: this._typeIcon(obj), css: 'font-size:10px;flex-shrink:0;' })
    );

    const name = obj.name || obj.type || 'Object3D';
    row.appendChild(
      this._el('span', {
        text: name,
        css: 'flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;',
      })
    );

    const visIcon = this._el('span', {
      text: obj.visible ? '\u{1F441}' : '\u{1F6AB}',
      css: 'font-size:10px;cursor:pointer;flex-shrink:0;',
    });
    visIcon.onclick = e => {
      e.stopPropagation();
      obj.visible = !obj.visible;
      visIcon.textContent = obj.visible ? '\u{1F441}' : '\u{1F6AB}';
    };
    row.appendChild(visIcon);

    row.onclick = () => {
      this._selectedObj = obj;
      this._highlightObject(obj);
      this._refreshInspector();
      this._refreshScene(); // re-render to show selection highlight
    };

    parent.appendChild(row);

    if (hasChildren) {
      const childrenWrap = this._el('div', { css: 'display:none;' });
      for (const child of visibleChildren) {
        this._buildTree(child, childrenWrap, depth + 1);
      }
      parent.appendChild(childrenWrap);
      arrow.style.cursor = 'pointer';
      arrow.onclick = e => {
        e.stopPropagation();
        const collapsed = childrenWrap.style.display === 'none';
        childrenWrap.style.display = collapsed ? 'block' : 'none';
        arrow.textContent = collapsed ? '\u25BE' : '\u25B8';
      };
    }
  }

  _typeIcon(obj) {
    if (obj.isMesh) return '\u{1F537}';
    if (obj.isGroup) return '\u{1F4C1}';
    if (obj.isLine) return '\u{1F4CF}';
    if (obj.isPoints) return '\u2728';
    if (obj.isSprite) return '\u{1F5BC}';
    if (obj.isInstancedMesh) return '\u26A1';
    return '\u25FB\uFE0F';
  }

  // ── Object Inspector ────────────────────────────────────────────────────────

  _refreshInspector() {
    const obj = this._selectedObj;
    if (!obj) return;
    if (this.inspectorBody.querySelector('input:focus')) return;

    this.inspectorBody.innerHTML = '';
    const name = obj.name || obj.type || 'Object3D';
    this.inspectorBody.appendChild(
      this._el('div', {
        text: name,
        css: 'font-weight:600;font-size:11px;margin-bottom:6px;color:#c084fc;',
      })
    );

    const grid = this._el('div', {
      css: 'display:grid;grid-template-columns:auto 1fr 1fr 1fr;gap:4px;align-items:center;',
    });

    // Position
    const p = obj.position;
    grid.appendChild(this._el('span', { text: 'Pos', css: 'color:#888;' }));
    grid.appendChild(
      this._numInput(p.x, v => {
        p.x = v;
      })
    );
    grid.appendChild(
      this._numInput(p.y, v => {
        p.y = v;
      })
    );
    grid.appendChild(
      this._numInput(p.z, v => {
        p.z = v;
      })
    );

    // Rotation (degrees)
    const r = obj.rotation;
    const toDeg = v => (v * 180) / Math.PI;
    const toRad = v => (v * Math.PI) / 180;
    grid.appendChild(this._el('span', { text: 'Rot', css: 'color:#888;' }));
    grid.appendChild(
      this._numInput(toDeg(r.x), v => {
        r.x = toRad(v);
      })
    );
    grid.appendChild(
      this._numInput(toDeg(r.y), v => {
        r.y = toRad(v);
      })
    );
    grid.appendChild(
      this._numInput(toDeg(r.z), v => {
        r.z = toRad(v);
      })
    );

    // Scale
    const s = obj.scale;
    grid.appendChild(this._el('span', { text: 'Scl', css: 'color:#888;' }));
    grid.appendChild(
      this._numInput(s.x, v => {
        s.x = v;
      })
    );
    grid.appendChild(
      this._numInput(s.y, v => {
        s.y = v;
      })
    );
    grid.appendChild(
      this._numInput(s.z, v => {
        s.z = v;
      })
    );

    this.inspectorBody.appendChild(grid);

    // Material info
    if (obj.material) {
      const mat = obj.material;
      const matRow = this._el('div', { css: 'margin-top:6px;' });
      matRow.appendChild(
        this._el('div', {
          text: 'Material: ' + (mat.type || 'unknown'),
          css: 'color:#888;font-size:10px;margin-bottom:4px;',
        })
      );

      if (mat.color) {
        const colorRow = this._el('div', { css: 'display:flex;align-items:center;gap:6px;' });
        colorRow.appendChild(
          this._el('span', { text: 'Color', css: 'color:#888;font-size:10px;' })
        );
        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.value = '#' + mat.color.getHexString();
        colorInput.style.cssText =
          'width:32px;height:18px;border:none;background:none;cursor:pointer;padding:0;';
        colorInput.oninput = () => {
          mat.color.set(colorInput.value);
        };
        colorRow.appendChild(colorInput);

        if (mat.opacity !== undefined) {
          colorRow.appendChild(
            this._el('span', {
              text: 'Opacity',
              css: 'color:#888;font-size:10px;margin-left:6px;',
            })
          );
          const opInput = document.createElement('input');
          opInput.type = 'range';
          opInput.min = '0';
          opInput.max = '1';
          opInput.step = '0.05';
          opInput.value = String(mat.opacity);
          opInput.style.cssText = 'width:60px;accent-color:#c084fc;';
          opInput.oninput = () => {
            mat.opacity = parseFloat(opInput.value);
            mat.transparent = mat.opacity < 1;
          };
          colorRow.appendChild(opInput);
        }
        matRow.appendChild(colorRow);
      }

      // Wireframe toggle
      if (mat.wireframe !== undefined) {
        const wfLabel = document.createElement('label');
        wfLabel.style.cssText =
          'display:flex;align-items:center;gap:4px;margin-top:4px;font-size:10px;color:#888;cursor:pointer;';
        const wfCheck = document.createElement('input');
        wfCheck.type = 'checkbox';
        wfCheck.checked = mat.wireframe;
        wfCheck.onchange = () => {
          mat.wireframe = wfCheck.checked;
        };
        wfLabel.appendChild(wfCheck);
        wfLabel.appendChild(document.createTextNode('Wireframe'));
        matRow.appendChild(wfLabel);
      }

      this.inspectorBody.appendChild(matRow);
    }
  }

  // ── Highlight ───────────────────────────────────────────────────────────────

  _highlightObject(obj) {
    this._removeHighlight();
    if (!obj.geometry && !obj.isGroup) return;

    try {
      const THREE = globalThis.__THREE__;
      if (!THREE) return;

      if (obj.geometry) {
        obj.geometry.computeBoundingBox();
        const box = obj.geometry.boundingBox;
        if (box) {
          const size = box.getSize(new THREE.Vector3());
          const geo = new THREE.BoxGeometry(size.x * 1.05, size.y * 1.05, size.z * 1.05);
          const mat = new THREE.MeshBasicMaterial({
            color: 0x00ff88,
            wireframe: true,
            transparent: true,
            opacity: 0.6,
            depthTest: false,
          });
          const helper = new THREE.Mesh(geo, mat);
          obj.updateWorldMatrix(true, false);
          helper.applyMatrix4(obj.matrixWorld);
          helper.raycast = () => {};
          this.gpu.scene.add(helper);
          this._highlightHelper = helper;
        }
      }
    } catch {
      // Highlight is best-effort
    }

    const p = obj.position;
    console.log(
      '%c[Nova64 Debug]%c Selected: ' +
        (obj.name || obj.type) +
        ' @ (' +
        p.x.toFixed(1) +
        ', ' +
        p.y.toFixed(1) +
        ', ' +
        p.z.toFixed(1) +
        ')',
      'color:#c084fc;font-weight:bold',
      'color:inherit',
      obj
    );
  }

  _removeHighlight() {
    if (this._highlightHelper) {
      this._highlightHelper.geometry?.dispose();
      this._highlightHelper.material?.dispose();
      this.gpu.scene.remove(this._highlightHelper);
      this._highlightHelper = null;
    }
  }

  // ── Lights ──────────────────────────────────────────────────────────────────

  _refreshLights() {
    this.lightsBody.innerHTML = '';
    const scene = this.gpu.scene;
    if (!scene) return;

    const lights = [];
    scene.traverse(obj => {
      if (obj.isLight) lights.push(obj);
    });

    if (lights.length === 0) {
      this.lightsBody.innerHTML =
        '<span style="color:#666;font-size:11px">No lights in scene</span>';
      return;
    }

    for (const light of lights) {
      const row = this._el('div', {
        css: 'margin-bottom:6px;padding:4px;background:#0d0f18;border-radius:4px;',
      });

      const header = this._el('div', {
        css: 'display:flex;align-items:center;gap:6px;margin-bottom:4px;',
      });
      header.appendChild(this._el('span', { text: '\u{1F4A1}', css: 'font-size:10px;' }));
      header.appendChild(
        this._el('span', {
          text: light.type + (light.name ? ' (' + light.name + ')' : ''),
          css: 'font-size:11px;flex:1;',
        })
      );
      row.appendChild(header);

      const colorRow = this._el('div', { css: 'display:flex;align-items:center;gap:6px;' });
      colorRow.appendChild(
        this._el('span', { text: 'Color', css: 'color:#888;font-size:10px;width:36px;' })
      );
      const colorInput = document.createElement('input');
      colorInput.type = 'color';
      colorInput.value = '#' + light.color.getHexString();
      colorInput.style.cssText =
        'width:32px;height:18px;border:none;background:none;cursor:pointer;padding:0;';
      colorInput.oninput = () => {
        light.color.set(colorInput.value);
      };
      colorRow.appendChild(colorInput);

      colorRow.appendChild(
        this._el('span', { text: 'Int', css: 'color:#888;font-size:10px;margin-left:6px;' })
      );
      const intInput = document.createElement('input');
      intInput.type = 'range';
      intInput.min = '0';
      intInput.max = '5';
      intInput.step = '0.1';
      intInput.value = String(light.intensity);
      intInput.style.cssText = 'flex:1;accent-color:#c084fc;';
      const intLabel = this._el('span', {
        text: light.intensity.toFixed(1),
        css: 'color:#e2e8f0;font-size:10px;width:24px;text-align:right;',
      });
      intInput.oninput = () => {
        light.intensity = parseFloat(intInput.value);
        intLabel.textContent = light.intensity.toFixed(1);
      };
      colorRow.appendChild(intInput);
      colorRow.appendChild(intLabel);

      row.appendChild(colorRow);
      this.lightsBody.appendChild(row);
    }
  }

  // ── Console Log ─────────────────────────────────────────────────────────────

  _hookConsole() {
    const orig = {
      log: console.log.bind(console),
      warn: console.warn.bind(console),
      error: console.error.bind(console),
    };
    const self = this;

    const capture = (level, origFn) =>
      function (...args) {
        origFn(...args);
        // Skip our own debug panel logs
        if (typeof args[0] === 'string' && args[0].includes('[Nova64 Debug]')) return;
        self._logHistory.push({
          level,
          text: args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '),
          ts: Date.now(),
        });
        if (self._logHistory.length > self._maxLogs) self._logHistory.shift();
        if (self.opened) self._refreshLog();
      };

    console.log = capture('log', orig.log);
    console.warn = capture('warn', orig.warn);
    console.error = capture('error', orig.error);
  }

  _refreshLog() {
    const body = this.logBody;
    // Skip if section is collapsed
    if (body.style.display === 'none') return;
    const wasScrolled = body.scrollTop + body.clientHeight >= body.scrollHeight - 10;

    body.innerHTML = '';
    if (this._logHistory.length === 0) {
      body.innerHTML = '<span style="color:#666">No logs yet</span>';
      return;
    }

    const colors = { log: '#dcdfe4', warn: '#facc15', error: '#f87171' };
    const icons = { log: '', warn: '\u26A0 ', error: '\u2716 ' };

    for (const entry of this._logHistory) {
      const line = this._el('div', {
        css: `color:${colors[entry.level]};word-break:break-word;padding:1px 0;border-bottom:1px solid #1a1d2e;`,
      });
      const text =
        icons[entry.level] + entry.text.substring(0, 200) + (entry.text.length > 200 ? '…' : '');
      line.textContent = text;
      body.appendChild(line);
    }

    if (wasScrolled) body.scrollTop = body.scrollHeight;
  }
}
