// 00-boot.js — synthetic test cart for the boot whitelist.
//
// G1 evaluates carts as ES modules and resolves init/update/draw from the
// module namespace, so this cart uses standard `export function` syntax.

export function init() {
  const result = engine.call('engine.init', {});
  if (!result || !result.capabilities) {
	throw new Error('00-boot: engine.init returned no capabilities');
  }
  const c = result.capabilities;
  if (c.backend !== 'godot') {
	throw new Error('00-boot: expected backend "godot", got "' + c.backend + '"');
  }
  if (typeof c.contractVersion !== 'string' || c.contractVersion.length === 0) {
	throw new Error('00-boot: contractVersion missing or empty');
  }
  if (!Array.isArray(c.features)) {
	throw new Error('00-boot: features is not an array');
  }
  print(
	'[00-boot] OK backend=' + c.backend +
	' contract=' + c.contractVersion +
	' adapter=' + c.adapterVersion +
	' features=' + c.features.length
  );
}

export function update(_dt) {}

export function draw() {}
