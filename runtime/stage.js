// runtime/stage.js
// Flash/PixiJS-class display list for Nova64.
//
// Architecture:
//   All nodes render onto the stage Canvas2D overlay (gpu.getStageCtx()).
//   Nodes form a tree: Container → [SpriteNode | GraphicsNode | TextNode | Container]
//   drawStage(root) walks the tree and renders each node with inherited transforms.
//
// Cart usage:
//   let root, ship;
//   export function init() {
//     root = createContainer();
//     ship = createSpriteNode(myImage, { anchorX: 0.5, anchorY: 0.5 });
//     addChild(root, ship);
//   }
//   export function draw() {
//     ship.x = playerX; ship.y = playerY;
//     drawStage(root);
//   }

// ─── Node factory helpers ─────────────────────────────────────────────────────

/** Create a base node with common transform & visibility properties */
function _baseNode(type) {
  const node = {
    _type: type,
    x: 0,
    y: 0,
    scaleX: 1,
    scaleY: 1,
    rotation: 0, // radians
    alpha: 1,
    visible: true,
    blendMode: 'source-over',
    children: [],
  };
  // Tween helpers — delegates to the unified createTween in tween.js via globalThis
  node.tweenTo = (props, dur, opts = {}) => globalThis.createTween?.(node, props, dur, opts);
  node.killTweens = () => globalThis.killTweensOf?.(node);
  return node;
}

/**
 * createContainer — an invisible node that groups children.
 * @returns {StageNode}
 */
function createContainer() {
  return _baseNode('container');
}

/**
 * createSpriteNode — a node that draws an image or sprite.
 * @param {HTMLImageElement|HTMLCanvasElement|ImageBitmap} image
 * @param {object} [opts]
 * @param {number} [opts.sx=0]       source x
 * @param {number} [opts.sy=0]       source y
 * @param {number} [opts.sw]         source width (defaults to image.width)
 * @param {number} [opts.sh]         source height (defaults to image.height)
 * @param {number} [opts.dw]         dest width (defaults to sw)
 * @param {number} [opts.dh]         dest height (defaults to sh)
 * @param {number} [opts.anchorX=0]  pivot X 0..1 (0=left, 0.5=center, 1=right)
 * @param {number} [opts.anchorY=0]  pivot Y 0..1
 * @param {number|null} [opts.tint]  0xRRGGBB color tint
 */
function createSpriteNode(image, opts = {}) {
  const node = _baseNode('sprite');
  node.image = image;
  node.sx = opts.sx ?? 0;
  node.sy = opts.sy ?? 0;
  node.sw = opts.sw ?? image?.width ?? 0;
  node.sh = opts.sh ?? image?.height ?? 0;
  node.dw = opts.dw ?? node.sw;
  node.dh = opts.dh ?? node.sh;
  node.anchorX = opts.anchorX ?? 0;
  node.anchorY = opts.anchorY ?? 0;
  node.tint = opts.tint ?? null;
  node.flipX = opts.flipX ?? false;
  node.flipY = opts.flipY ?? false;
  return node;
}

/**
 * createGraphicsNode — a node whose content is rendered by a custom draw() callback.
 * @param {function} drawFn  - Called with (ctx, node). Override ctx.fillStyle etc. inside.
 */
function createGraphicsNode(drawFn) {
  const node = _baseNode('graphics');
  node.draw = drawFn;
  return node;
}

/**
 * createTextNode — a node that renders a string.
 * @param {string} text
 * @param {object} [opts]
 * @param {string} [opts.font='16px monospace']
 * @param {string} [opts.fill='#ffffff']
 * @param {string} [opts.align='left']
 * @param {string} [opts.baseline='top']
 * @param {string} [opts.stroke]        optional stroke color
 * @param {number} [opts.strokeWidth=2]
 * @param {number} [opts.maxWidth]
 */
function createTextNode(text, opts = {}) {
  const node = _baseNode('text');
  node.text = text;
  node.font = opts.font ?? '16px monospace';
  node.fill = opts.fill ?? '#ffffff';
  node.align = opts.align ?? 'left';
  node.baseline = opts.baseline ?? 'top';
  node.stroke = opts.stroke ?? null;
  node.strokeWidth = opts.strokeWidth ?? 2;
  node.maxWidth = opts.maxWidth ?? undefined;
  return node;
}

// ─── Display list mutations ───────────────────────────────────────────────────

/** Append child to parent node. Returns child. */
function addChild(parent, child) {
  parent.children.push(child);
  return child;
}

/** Remove child from parent. Returns true if found & removed. */
function removeChild(parent, child) {
  const i = parent.children.indexOf(child);
  if (i === -1) return false;
  parent.children.splice(i, 1);
  return true;
}

/** Remove all children from parent. */
function removeAllChildren(parent) {
  parent.children.length = 0;
}

/** Swap node order within parent (useful for z-ordering). */
function setChildIndex(parent, child, index) {
  const i = parent.children.indexOf(child);
  if (i === -1) return;
  parent.children.splice(i, 1);
  parent.children.splice(Math.max(0, index), 0, child);
}

// ─── Tint helper (OffscreenCanvas multiply) ──────────────────────────────────

function _applyTint(ctx, image, sx, sy, sw, sh, dx, dy, dw, dh, tint) {
  const oc = new OffscreenCanvas(sw, sh);
  const oc2 = oc.getContext('2d');
  oc2.drawImage(image, sx, sy, sw, sh, 0, 0, sw, sh);
  oc2.globalCompositeOperation = 'multiply';
  const tr = (tint >> 16) & 0xff;
  const tg = (tint >> 8) & 0xff;
  const tb = tint & 0xff;
  oc2.fillStyle = `rgb(${tr},${tg},${tb})`;
  oc2.fillRect(0, 0, sw, sh);
  oc2.globalCompositeOperation = 'destination-in';
  oc2.drawImage(image, sx, sy, sw, sh, 0, 0, sw, sh);
  ctx.drawImage(oc, dx, dy, dw, dh);
}

// ─── Rendering ───────────────────────────────────────────────────────────────

/** Internal renderer — walks tree with cumulative transforms */
function _renderNode(ctx, node, parentAlpha) {
  if (!node.visible) return;

  const alpha = parentAlpha * node.alpha;

  ctx.save();

  // Apply local transform
  ctx.translate(node.x, node.y);
  if (node.rotation) ctx.rotate(node.rotation);
  if (node.scaleX !== 1 || node.scaleY !== 1) ctx.scale(node.scaleX, node.scaleY);

  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = node.blendMode;

  // Draw node content
  switch (node._type) {
    case 'sprite': {
      if (node.image) {
        const ox = -node.anchorX * node.dw;
        const oy = -node.anchorY * node.dh;
        ctx.save();
        if (node.flipX || node.flipY) ctx.scale(node.flipX ? -1 : 1, node.flipY ? -1 : 1);
        if (node.tint !== null) {
          _applyTint(
            ctx,
            node.image,
            node.sx,
            node.sy,
            node.sw,
            node.sh,
            ox,
            oy,
            node.dw,
            node.dh,
            node.tint
          );
        } else {
          ctx.drawImage(node.image, node.sx, node.sy, node.sw, node.sh, ox, oy, node.dw, node.dh);
        }
        ctx.restore();
      }
      break;
    }
    case 'graphics': {
      if (typeof node.draw === 'function') node.draw(ctx, node);
      break;
    }
    case 'text': {
      ctx.font = node.font;
      ctx.textAlign = node.align;
      ctx.textBaseline = node.baseline;
      if (node.stroke) {
        ctx.strokeStyle = node.stroke;
        ctx.lineWidth = node.strokeWidth;
        ctx.strokeText(node.text, 0, 0, node.maxWidth);
      }
      ctx.fillStyle = node.fill;
      ctx.fillText(node.text, 0, 0, node.maxWidth);
      break;
    }
    case 'container':
      // Containers only propagate transforms to children
      break;
  }

  // Recurse into children
  for (const child of node.children) {
    _renderNode(ctx, child, alpha);
  }

  ctx.restore();
}

/**
 * drawStage — render a display list tree onto the stage canvas.
 * Call this inside your cart's draw() function.
 * @param {StageNode} root         - Root container node
 * @param {GpuThreeJS} gpu         - The gpu instance (to access stage context)
 */
function drawStage(root, gpu) {
  const ctx = gpu?.getStageCtx?.();
  if (!ctx || !root) return;
  _renderNode(ctx, root, 1);
}

/**
 * hitTest — check if a point (px, py) is inside a node's bounding box.
 * Accounts for local position and anchor, but not rotation/scale.
 * For precise hit detection use hitTestPoint().
 */
function hitTest(node, px, py) {
  if (!node.visible) return false;
  const left = node.x - node.anchorX * (node.dw ?? node.sw ?? 0);
  const top = node.y - node.anchorY * (node.dh ?? node.sh ?? 0);
  const right = left + (node.dw ?? node.sw ?? 0);
  const bottom = top + (node.dh ?? node.sh ?? 0);
  return px >= left && px <= right && py >= top && py <= bottom;
}

export function stageApi(gpu) {
  // Curry drawStage so carts don't pass gpu
  function _drawStage(root) {
    drawStage(root, gpu);
  }

  return {
    exposeTo(target) {
      Object.assign(target, {
        createContainer,
        createSpriteNode,
        createGraphicsNode,
        createTextNode,
        addChild,
        removeChild,
        removeAllChildren,
        setChildIndex,
        drawStage: _drawStage,
        hitTest,
      });
    },
  };
}
