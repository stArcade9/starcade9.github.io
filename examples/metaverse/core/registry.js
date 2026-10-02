// registry.js — the extensibility seams for the metaverse.
//
// Three registries so the platform can grow without touching the core:
//   - render backends (web / godot / xr) implementing the RenderBackend shape
//   - plugins (chat, presence, …) implementing the Plugin lifecycle
//   - chat transport providers (colyseus relay / matrix / p2p …)
//
// See docs/METAVERSE.md for the interface contracts. Everything here is plain
// data + lookup; no nova64 globals are touched so it runs anywhere (incl. tests).

const backends = new Map();
const chatProviders = new Map();

export function registerBackend(backend) {
  if (!backend || !backend.id) throw new Error('registerBackend: backend needs an id');
  backends.set(backend.id, backend);
  return backend;
}

export function getBackend(id) {
  return backends.get(id) || backends.get('web') || null;
}

export function listBackends() {
  return Array.from(backends.keys());
}

export function registerChatProvider(provider) {
  if (!provider || !provider.id) throw new Error('registerChatProvider: provider needs an id');
  chatProviders.set(provider.id, provider);
  return provider;
}

export function getChatProvider(id) {
  return chatProviders.get(id) || chatProviders.get('colyseus') || null;
}

// A plugin set is just an ordered list; the app owns its own instance so two
// metaverse instances don't share plugin state.
export function createPluginSet() {
  const plugins = [];
  return {
    use(plugin) {
      if (!plugin || !plugin.id) throw new Error('use(): plugin needs an id');
      // Replace by id so re-registering a plugin swaps it rather than duplicating.
      const i = plugins.findIndex(p => p.id === plugin.id);
      if (i >= 0) plugins[i] = plugin;
      else plugins.push(plugin);
      return plugin;
    },
    get: id => plugins.find(p => p.id === id) || null,
    all: () => plugins.slice(),
  };
}
