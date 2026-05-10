// runtime/backends/babylon/noa-prototype.js
// Experimental NOA probe for Babylon voxel parity work.
// Now integrates with noa-adapter.js for full NOA engine support.

const NOA_MODULE_SPECIFIER = 'noa-engine';
const NOA_STORAGE_KEY = 'nova64:noaVoxel';
const DEFAULT_NOA_MODE = 'probe';

const NOA_AGENT_NOTES = Object.freeze([
  'Keep runtime/api-voxel.js as the cart-facing contract; do not let NOA bypass it.',
  'Treat this as a Babylon-only prototype seam until chunk meshing and entity parity are proven.',
  'Use minecraft-demo and voxel-creatures first when validating any NOA-backed experiment.',
  'Prefer borrowing NOA chunk/world ideas incrementally before considering deeper ownership changes.',
  'The noa-adapter.js provides full NOA engine integration when noa-engine is installed.',
  'NOA features are backwards-compatible: carts work the same whether NOA is active or not.',
]);

const NOA_NEXT_STEP_FILES = Object.freeze([
  'runtime/backends/babylon/noa-prototype.js',
  'runtime/backends/babylon/noa-adapter.js',
  'runtime/backends/babylon/voxel.js',
  'runtime/api-voxel.js',
  'tests/playwright/wad-vox-regression.spec.js',
  'docs/BABYLON_NOA_PROTOTYPE.md',
]);

function normalizeNoaMode(value) {
  if (value === true) return DEFAULT_NOA_MODE;
  if (value === false || value == null) return null;

  const text = String(value).trim().toLowerCase();
  if (!text || text === '0' || text === 'false' || text === 'off') return null;
  if (text === '1' || text === 'true' || text === 'on') return DEFAULT_NOA_MODE;
  if (text === 'probe') return 'probe';
  return DEFAULT_NOA_MODE;
}

function readRequestedNoaMode() {
  if (typeof window === 'undefined') {
    return { requested: false, mode: null, source: 'runtime' };
  }

  const params = new URLSearchParams(window.location.search);
  const paramMode = normalizeNoaMode(params.get('noaVoxel'));
  if (paramMode) return { requested: true, mode: paramMode, source: 'url' };

  try {
    const storedMode = normalizeNoaMode(window.localStorage?.getItem(NOA_STORAGE_KEY));
    if (storedMode) return { requested: true, mode: storedMode, source: 'localStorage' };
  } catch {
    // Ignore localStorage access failures and continue with other request sources.
  }

  const globalMode = normalizeNoaMode(globalThis.NOVA64_NOA_PROTOTYPE);
  if (globalMode) return { requested: true, mode: globalMode, source: 'global' };

  return { requested: false, mode: null, source: 'runtime' };
}

function summarizeNoaModule(mod) {
  const exportedKeys = Object.keys(mod ?? {}).sort();
  const defaultExport = mod?.default;

  return {
    exportedKeys,
    hasDefaultExport: defaultExport !== undefined,
    defaultExportType: typeof defaultExport,
    hasEngineFactory:
      typeof defaultExport === 'function' ||
      typeof mod?.Engine === 'function' ||
      typeof mod?.Noa === 'function',
  };
}

function createStatus(self, overrides = {}) {
  return {
    backend: self?.backendName ?? 'unknown',
    requested: false,
    available: false,
    active: false,
    mode: 'off',
    source: 'runtime',
    specifier: NOA_MODULE_SPECIFIER,
    reason: 'disabled',
    error: null,
    exportedKeys: [],
    hasDefaultExport: false,
    defaultExportType: 'undefined',
    hasEngineFactory: false,
    agentNotes: [...NOA_AGENT_NOTES],
    nextStepFiles: [...NOA_NEXT_STEP_FILES],
    ...overrides,
  };
}

async function importNoaModule(specifier) {
  return await import(/* @vite-ignore */ specifier);
}

export function createBabylonNoaPrototypeApi(self) {
  let status = createStatus(self);

  function getNoaPrototypeStatus() {
    return {
      ...status,
      agentNotes: [...status.agentNotes],
      nextStepFiles: [...status.nextStepFiles],
      exportedKeys: [...status.exportedKeys],
    };
  }

  async function probeNoaPrototype(options = {}) {
    const requestedMode = normalizeNoaMode(options.mode ?? options.requested ?? true);
    const request =
      requestedMode == null
        ? { requested: false, mode: null, source: options.source ?? 'manual' }
        : {
            requested: true,
            mode: requestedMode,
            source: options.source ?? 'manual',
          };

    if (!request.requested) {
      status = createStatus(self, {
        source: request.source,
      });
      return getNoaPrototypeStatus();
    }

    status = createStatus(self, {
      requested: true,
      mode: request.mode,
      source: request.source,
      reason: 'requested-pending',
    });

    try {
      const mod = await importNoaModule(options.specifier ?? NOA_MODULE_SPECIFIER);
      const summary = summarizeNoaModule(mod);
      status = createStatus(self, {
        requested: true,
        available: true,
        active: false,
        mode: request.mode,
        source: request.source,
        reason: 'loaded-awaiting-adapter',
        exportedKeys: summary.exportedKeys,
        hasDefaultExport: summary.hasDefaultExport,
        defaultExportType: summary.defaultExportType,
        hasEngineFactory: summary.hasEngineFactory,
      });
    } catch (error) {
      status = createStatus(self, {
        requested: true,
        available: false,
        active: false,
        mode: request.mode,
        source: request.source,
        reason: 'dependency-missing',
        error: error?.message ?? String(error),
      });

      if (!options.silent) {
        console.warn(
          '[Nova64:WARN] NOA prototype requested, but noa-engine is not available. Continuing with the built-in Babylon voxel path.'
        );
      }
    }

    return getNoaPrototypeStatus();
  }

  const initialRequest = readRequestedNoaMode();
  if (initialRequest.requested) {
    status = createStatus(self, {
      requested: true,
      mode: initialRequest.mode,
      source: initialRequest.source,
      reason: 'requested-pending',
    });

    Promise.resolve()
      .then(() =>
        probeNoaPrototype({
          requested: true,
          mode: initialRequest.mode,
          source: initialRequest.source,
          silent: true,
        })
      )
      .catch(() => {});
  }

  return {
    getNoaPrototypeStatus,
    probeNoaPrototype,
  };
}
