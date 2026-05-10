export function createStudioCartFunction(userCode) {
  if (typeof userCode !== 'string') {
    throw new TypeError('Studio cart code must be a string');
  }

  return new Function(
    `${userCode}
; return {
  init: typeof init !== "undefined" ? init : null,
  update: typeof update !== "undefined" ? update : null,
  draw: typeof draw !== "undefined" ? draw : null,
  render: typeof render !== "undefined" ? render : null
};`
  );
}

export function executeStudioCartCode(userCode) {
  return createStudioCartFunction(userCode)();
}
