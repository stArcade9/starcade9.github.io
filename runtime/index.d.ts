// Nova64 — Type declarations
// https://github.com/seacloud9/nova64

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

/** Hex colour integer, e.g. 0xff0000 for red. */
export type Color = number;

/** Mesh identifier returned by primitive-creation functions. */
export type MeshId = number;

/** Light identifier returned by createPointLight. */
export type LightId = number;

/** Instanced-mesh identifier returned by createInstancedMesh. */
export type InstancedMeshId = number;

/** LOD identifier returned by createLODMesh. */
export type LODId = number;

/** Particle system identifier returned by createParticleSystem. */
export type ParticleSystemId = number;

export interface ParticleSystemOptions {
  shape?: 'sphere' | 'cube';
  size?: number;
  segments?: number;
  color?: Color;
  emissive?: Color;
  emissiveIntensity?: number;
  gravity?: number;
  drag?: number;
  blending?: 'normal' | 'additive';
  emitterX?: number;
  emitterY?: number;
  emitterZ?: number;
  directionX?: number;
  directionY?: number;
  directionZ?: number;
  emitRate?: number;
  minLife?: number;
  maxLife?: number;
  minSpeed?: number;
  maxSpeed?: number;
  spread?: number;
  minSize?: number;
  maxSize?: number;
  startColor?: Color;
  endColor?: Color;
  turbulence?: number;
  turbulenceScale?: number;
  attractorX?: number | null;
  attractorY?: number | null;
  attractorZ?: number | null;
  attractorStrength?: number;
  sizeOverLife?: [number, number, number] | null;
  opacity?: number;
  opacityOverLife?: [number, number, number] | null;
  rotationSpeed?: number;
}

export interface ParticleEmitter {
  x: number;
  y: number;
  z: number;
  directionX: number;
  directionY: number;
  directionZ: number;
  emitRate: number;
  minLife: number;
  maxLife: number;
  minSpeed: number;
  maxSpeed: number;
  spread: number;
  minSize: number;
  maxSize: number;
}

export interface ParticleOverrides {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  directionX: number;
  directionY: number;
  directionZ: number;
  spread: number;
  r: number;
  g: number;
  b: number;
}

/** Panel object returned by createPanel. */
export interface Panel {
  x: number;
  y: number;
  width: number;
  height: number;
  options: PanelOptions;
}

/** Button object returned by createButton. */
export interface Button {
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  callback: () => void;
  options: ButtonOptions;
  hovered: boolean;
  pressed: boolean;
}

export interface MousePosition {
  x: number;
  y: number;
}

// ---------------------------------------------------------------------------
// Material / primitive options
// ---------------------------------------------------------------------------

export interface MeshOptions {
  /** @default 'standard' */
  material?: 'standard' | 'holographic' | 'metallic' | 'emissive' | 'wireframe';
  roughness?: number;
  metalness?: number;
  emissive?: Color;
  emissiveIntensity?: number;
  transparent?: boolean;
  opacity?: number;
  wireframe?: boolean;
  flatShading?: boolean;
  segments?: number;
  size?: number;
  height?: number;
  width?: number;
}

export interface LODLevel {
  shape?: 'cube' | 'sphere' | 'plane' | 'cylinder' | 'cone';
  size?: number;
  color?: Color;
  distance: number;
  options?: MeshOptions;
}

export interface PBRMaps {
  normalMap?: THREE.Texture | null;
  roughnessMap?: THREE.Texture | null;
  metalnessMap?: THREE.Texture | null;
  aoMap?: THREE.Texture | null;
}

// ---------------------------------------------------------------------------
// UI options
// ---------------------------------------------------------------------------

export interface PanelOptions {
  color?: Color;
  border?: Color;
  borderWidth?: number;
  alpha?: number;
  radius?: number;
  title?: string;
}

export interface ButtonOptions {
  normalColor?: Color;
  hoverColor?: Color;
  pressedColor?: Color;
  textColor?: Color;
  borderColor?: Color;
  borderWidth?: number;
  radius?: number;
  fontSize?: number;
}

export interface ProgressBarOptions {
  backgroundColor?: Color;
  fillColor?: Color;
  borderColor?: Color;
  showText?: boolean;
  textColor?: Color;
  radius?: number;
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

export interface Stats3D {
  meshCount: number;
  lightCount: number;
  instancedMeshCount: number;
  lodCount: number;
}

// ---------------------------------------------------------------------------
// Logger
// ---------------------------------------------------------------------------

export interface LogRecord {
  level: number;
  message: string;
  args: unknown[];
  timestamp: number;
}

export declare const LogLevel: Readonly<{
  DEBUG: 0;
  INFO: 1;
  WARN: 2;
  ERROR: 3;
  NONE: 4;
}>;

export declare class Logger {
  level: number;
  history: LogRecord[];
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
  setLevel(level: number): void;
  getHistory(): LogRecord[];
  clearHistory(): void;
}

export declare const logger: Logger;

// ---------------------------------------------------------------------------
// 3D API
// ---------------------------------------------------------------------------

export interface ThreeDApiInstance {
  // Primitives
  createCube(
    width?: number,
    height?: number,
    depth?: number,
    color?: Color,
    position?: [number, number, number],
    options?: MeshOptions
  ): MeshId;
  createCube(
    size?: number,
    color?: Color,
    position?: [number, number, number],
    options?: MeshOptions
  ): MeshId;
  createSphere(
    radius?: number,
    color?: Color,
    position?: [number, number, number],
    options?: MeshOptions
  ): MeshId;
  createSphere(
    radius?: number,
    color?: Color,
    position?: [number, number, number],
    segments?: number,
    options?: MeshOptions
  ): MeshId;
  createCylinder(
    radius?: number,
    height?: number,
    color?: Color,
    position?: [number, number, number],
    options?: MeshOptions
  ): MeshId;
  createCylinder(
    radius?: number,
    height?: number,
    color?: Color,
    segments?: number,
    position?: [number, number, number],
    options?: MeshOptions
  ): MeshId;
  createCylinder(
    radiusTop?: number,
    radiusBottom?: number,
    height?: number,
    color?: Color,
    position?: [number, number, number],
    options?: MeshOptions
  ): MeshId;
  createPlane(
    width?: number,
    height?: number,
    color?: Color,
    position?: [number, number, number]
  ): MeshId;
  createAdvancedCube(
    size?: number,
    materialOptions?: MeshOptions,
    position?: [number, number, number]
  ): MeshId;
  createAdvancedSphere(
    radius?: number,
    materialOptions?: MeshOptions,
    position?: [number, number, number]
  ): MeshId;
  createTorus(
    radius?: number,
    tube?: number,
    color?: Color,
    position?: [number, number, number],
    options?: MeshOptions
  ): MeshId;
  createCone(
    radius?: number,
    height?: number,
    color?: Color,
    position?: [number, number, number],
    options?: MeshOptions
  ): MeshId;
  createCapsule(
    radius?: number,
    length?: number,
    color?: Color,
    position?: [number, number, number],
    options?: MeshOptions
  ): MeshId;

  // Mesh management
  destroyMesh(id: MeshId): void;
  removeMesh(id: MeshId): void;
  getMesh(id: MeshId): THREE.Mesh | undefined;
  getBackendCapabilities(): Record<string, boolean | string>;

  // Model loading
  loadModel(
    url: string,
    position?: [number, number, number],
    scale?: number,
    materialOptions?: MeshOptions & { fog?: boolean }
  ): Promise<MeshId>;
  playAnimation(
    meshId: MeshId,
    nameOrIndex?: string | number,
    loop?: boolean,
    timeScale?: number
  ): void;
  updateAnimations(dt: number): void;
  loadTexture(url: string): Promise<THREE.Texture>;

  // Transforms
  setPosition(meshId: MeshId, x: number, y: number, z: number): void;
  setRotation(meshId: MeshId, x: number, y: number, z: number): void;
  setScale(meshId: MeshId, x: number, y: number, z: number): void;
  getPosition(meshId: MeshId): [number, number, number] | null;
  getRotation(meshId: MeshId): [number, number, number] | null;
  rotateMesh(meshId: MeshId, dX: number, dY: number, dZ: number): void;
  moveMesh(meshId: MeshId, x: number, y: number, z: number): void;

  // Mesh helpers
  setFlatShading(meshId: MeshId, enabled?: boolean): void;
  setMeshVisible(meshId: MeshId, visible: boolean): void;
  setMeshOpacity(meshId: MeshId, opacity: number): void;
  setCastShadow(meshId: MeshId, cast: boolean): void;
  setReceiveShadow(meshId: MeshId, receive: boolean): void;

  // Camera
  setCameraPosition(x: number, y: number, z: number): void;
  setCameraTarget(x: number, y: number, z: number): void;
  setCameraLookAt(direction: [number, number, number]): void;
  setCameraFOV(fov: number): void;

  // Atmosphere
  setFog(color: Color, near?: number, far?: number): void;
  clearFog(): void;
  setLightDirection(x: number, y: number, z: number): void;
  setLightColor(color: Color): void;
  setAmbientLight(color: Color, intensity?: number): void;
  setDirectionalLight(direction: [number, number, number], color?: Color, intensity?: number): void;

  // Scene
  clearScene(): void;
  setupScene(opts?: { fog?: boolean; grid?: boolean; axes?: boolean }): void;

  // Effects
  enablePixelation(factor?: number): void;
  enableDithering(enabled?: boolean): void;

  // Dynamic lights
  createPointLight(
    color?: Color,
    intensity?: number,
    distance?: number,
    x?: number,
    y?: number,
    z?: number
  ): LightId;
  setPointLightPosition(lightId: LightId, x: number, y: number, z: number): void;
  setPointLightColor(lightId: LightId, color: Color): void;
  removeLight(lightId: LightId): void;

  // GPU instancing
  createInstancedMesh(
    shape?: 'cube' | 'sphere' | 'plane' | 'cylinder',
    count?: number,
    color?: Color,
    options?: MeshOptions
  ): InstancedMeshId;
  setInstanceTransform(
    instancedId: InstancedMeshId,
    index: number,
    x?: number,
    y?: number,
    z?: number,
    rx?: number,
    ry?: number,
    rz?: number,
    sx?: number,
    sy?: number,
    sz?: number
  ): boolean;
  setInstanceColor(instancedId: InstancedMeshId, index: number, color: Color): boolean;
  finalizeInstances(instancedId: InstancedMeshId): boolean;
  removeInstancedMesh(instancedId: InstancedMeshId): boolean;

  // GPU particle system
  createParticleSystem(maxParticles?: number, options?: ParticleSystemOptions): ParticleSystemId;
  setParticleEmitter(systemId: ParticleSystemId, emitter: Partial<ParticleEmitter>): void;
  emitParticle(systemId: ParticleSystemId, overrides?: Partial<ParticleOverrides>): void;
  burstParticles(
    systemId: ParticleSystemId,
    count?: number,
    overrides?: Partial<ParticleOverrides>
  ): void;
  updateParticles(dt: number): void;
  removeParticleSystem(systemId: ParticleSystemId): boolean;
  getParticleStats(
    systemId: ParticleSystemId
  ): { active: number; max: number; free: number } | null;

  // LOD system
  createLODMesh(levels?: LODLevel[], position?: [number, number, number]): LODId;
  setLODPosition(lodId: LODId, x: number, y: number, z: number): void;
  removeLODMesh(lodId: LODId): boolean;
  updateLODs(): void;

  // Normal / PBR maps
  loadNormalMap(url: string): Promise<THREE.Texture>;
  setNormalMap(meshId: MeshId, texture: THREE.Texture): void;
  setPBRMaps(meshId: MeshId, maps?: PBRMaps): void;

  // Raycasting / stats
  raycastFromCamera(x: number, y: number): THREE.Intersection | null;
  get3DStats(): Stats3D;

  // Direct Three.js access
  getScene(): THREE.Scene;
  getCamera(): THREE.PerspectiveCamera;
  getRenderer(): THREE.WebGLRenderer;

  exposeTo(target: object): void;
}

export declare function threeDApi(gpu: unknown): ThreeDApiInstance;

// ---------------------------------------------------------------------------
// UI API
// ---------------------------------------------------------------------------

export interface UIApiInstance {
  // Font / text
  setFont(fontName: string): void;
  getFont(): string;
  setTextAlign(align: CanvasTextAlign): void;
  setTextBaseline(baseline: CanvasTextBaseline): void;
  measureText(text: string, scale?: number): number;
  drawText(text: string, x: number, y: number, color?: Color, scale?: number): void;
  drawTextShadow(
    text: string,
    x: number,
    y: number,
    color?: Color,
    shadowColor?: Color,
    scale?: number
  ): void;
  drawTextOutline(
    text: string,
    x: number,
    y: number,
    color?: Color,
    outlineColor?: Color,
    scale?: number
  ): void;

  // Panels
  createPanel(x: number, y: number, width: number, height: number, options?: PanelOptions): Panel;
  drawPanel(panel: Panel): void;
  drawAllPanels(): void;
  removePanel(panel: Panel): void;
  clearPanels(): void;

  // Buttons
  createButton(
    x: number,
    y: number,
    width: number,
    height: number,
    text: string,
    callback: () => void,
    options?: ButtonOptions
  ): Button;
  updateButton(button: Button): void;
  drawButton(button: Button): void;
  updateAllButtons(): void;
  drawAllButtons(): void;
  removeButton(button: Button): void;
  clearButtons(): void;

  // Progress bar
  drawProgressBar(
    x: number,
    y: number,
    width: number,
    height: number,
    value: number,
    maxValue: number,
    options?: ProgressBarOptions
  ): void;

  // Shapes
  drawRoundedRect(
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    color: Color,
    filled?: boolean
  ): void;
  drawGradientRect(
    x: number,
    y: number,
    width: number,
    height: number,
    color1: Color,
    color2: Color,
    vertical?: boolean
  ): void;

  // Layout
  centerX(width: number, screenWidth?: number): number;
  centerY(height: number, screenHeight?: number): number;
  grid(
    cols: number,
    rows: number,
    cellWidth: number,
    cellHeight: number,
    paddingX?: number,
    paddingY?: number
  ): Array<{ x: number; y: number; col: number; row: number }>;

  // Mouse
  setMousePosition(x: number, y: number): void;
  setMouseButton(down: boolean): void;
  getMousePosition(): MousePosition;
  isMouseDown(): boolean;
  isMousePressed(): boolean;

  // Palettes
  uiColors: Record<string, Color>;
  uiFonts: Record<string, string>;

  exposeTo(target: object): void;
}

export declare function uiApi(ctx2d: CanvasRenderingContext2D | null): UIApiInstance;

// ---------------------------------------------------------------------------
// Sub-module factory types (for tree-shaking imports)
// ---------------------------------------------------------------------------

export declare function materialsModule(ctx: object): object;
export declare function primitivesModule(ctx: object): object;
export declare function transformsModule(ctx: object): object;
export declare function cameraModule(ctx: object): object;
export declare function lightsModule(ctx: object): object;
export declare function modelsModule(ctx: object): object;
export declare function instancingModule(ctx: object): object;
export declare function pbrModule(ctx: object): object;
export declare function sceneModule(ctx: object): object;

export declare function uiTextModule(ctx: object): object;
export declare function uiPanelsModule(ctx: object): object;
export declare function uiButtonsModule(ctx: object): object;
export declare function uiWidgetsModule(ctx: object): object;

// ---------------------------------------------------------------------------
// Engine adapter — renderer-agnostic API for cart authors
// ---------------------------------------------------------------------------

/** Opaque material object returned by engine.createMaterial(). */
export type EngineMaterial = object;

/** Opaque texture object returned by engine.create*Texture(). */
export type EngineTexture = object;

/** Opaque color object returned by engine.createColor(). */
export type EngineColor = object;

/** Opaque geometry object returned by engine.createPlaneGeometry(). */
export type EngineGeometry = object;

export type EngineMaterialType = 'basic' | 'phong' | 'standard';
export type EngineFilterMode = 'nearest' | 'linear';
export type EngineWrapMode = 'repeat' | 'clamp';
export type EngineSideMode = 'front' | 'back' | 'double';

export interface EngineMaterialOptions {
  map?: EngineTexture;
  color?: Color | EngineColor;
  transparent?: boolean;
  alphaTest?: number;
  side?: EngineSideMode;
  roughness?: number;
  metalness?: number;
  emissive?: Color;
  flatShading?: boolean;
  vertexColors?: boolean;
}

export interface EngineDataTextureOptions {
  /** @default 'rgba' */
  format?: 'rgba';
  /** @default 'nearest' */
  filter?: EngineFilterMode;
  /** @default 'clamp' */
  wrap?: EngineWrapMode;
  /** @default true */
  generateMipmaps?: boolean;
}

export interface EngineCanvasTextureOptions {
  filter?: EngineFilterMode;
  wrap?: EngineWrapMode;
}

export interface EngineAdapter {
  /** Create a material of the given type. */
  createMaterial(type: EngineMaterialType, opts?: EngineMaterialOptions): EngineMaterial;
  /** Create a GPU texture from raw RGBA pixel data. */
  createDataTexture(
    data: Uint8Array | Uint8ClampedArray,
    width: number,
    height: number,
    opts?: EngineDataTextureOptions
  ): EngineTexture;
  /** Create a GPU texture from an HTMLCanvasElement. */
  createCanvasTexture(canvas: HTMLCanvasElement, opts?: EngineCanvasTextureOptions): EngineTexture;
  /** Clone a texture. */
  cloneTexture(tex: EngineTexture): EngineTexture;
  /** Set repeat wrapping and tile count on a texture. */
  setTextureRepeat(tex: EngineTexture, x: number, y: number): void;
  /** Mark a texture as needing a GPU re-upload. */
  invalidateTexture(tex: EngineTexture): void;
  /** Create an opaque color value from r/g/b components (0–1). */
  createColor(r: number, g: number, b: number): EngineColor;
  /** Create a plane geometry. */
  createPlaneGeometry(width: number, height: number, segX?: number, segY?: number): EngineGeometry;
  /** Assign a material to a mesh by its Nova64 mesh ID. */
  setMeshMaterial(meshId: MeshId, material: EngineMaterial): void;
  /** Return the current camera world position. */
  getCameraPosition(): { x: number; y: number; z: number };
  /** Report what this backend supports. */
  getCapabilities(): AdapterCapabilities;
}

export interface EngineBridgeMessage {
  method: string;
  payload: Record<string, unknown>;
}

export interface AdapterCapabilities {
  /** Backend identifier: 'threejs', 'unity', 'babylon', 'godot', … */
  backend: string;
  /** Must equal ADAPTER_CONTRACT_VERSION. */
  contractVersion: string;
  /** Backend-specific semver. */
  adapterVersion: string;
  /** Feature strings declared by this backend. */
  features: readonly string[];
  /** Return true if this backend declares the given feature identifier. */
  supports(feature: string): boolean;
}

export interface CommandBufferAdapterOptions {
  /** Execute each call immediately without buffering. Default: false. */
  autoFlush?: boolean;
  /** Warn when queue exceeds this size. Default: 512. */
  maxQueueSize?: number;
}

export interface CommandBufferAdapter extends EngineAdapter {
  /** Drain all queued commands to the inner adapter in order. */
  flush(): void;
  /** Return the number of commands currently in the buffer. */
  pendingCount(): number;
  /** Discard all pending commands without executing them. */
  discardPending(): void;
}

export interface UnityBridgeTransport {
  call?(method: string, payload?: Record<string, unknown>): unknown;
  invoke?(method: string, payload?: Record<string, unknown>): unknown;
  send?(message: EngineBridgeMessage): void;
  postMessage?(message: { type: 'nova64'; method: string; payload: Record<string, unknown> }): void;
  getCameraPosition?(): { x: number; y: number; z: number };
  getCapabilities?(): string[];
}

export declare const ADAPTER_CONTRACT_VERSION: string;
export declare const engine: EngineAdapter;
export declare function initAdapter(gpu: unknown): void;
export declare function createThreeEngineAdapter(options?: {
  getGpu?: () => unknown;
  resolveMesh?: (meshId: MeshId) => unknown;
}): EngineAdapter;
export declare function createUnityBridgeAdapter(
  bridge: UnityBridgeTransport,
  options?: { methodPrefix?: string; features?: string[] }
): EngineAdapter;
export declare function createCommandBufferAdapter(
  innerAdapter: EngineAdapter,
  options?: CommandBufferAdapterOptions
): CommandBufferAdapter;
export declare function setEngineAdapter(adapter: EngineAdapter): EngineAdapter;
export declare function installUnityBridge(
  bridge: UnityBridgeTransport,
  options?: { methodPrefix?: string; features?: string[] }
): EngineAdapter;
export declare function resetEngineAdapter(): EngineAdapter;

// Babylon adapter
export interface BabylonAdapterOptions {
  /** Optional mesh resolver — maps a MeshId to the engine mesh object. */
  resolveMesh?: (meshId: MeshId) => unknown;
}

/**
 * Create a Nova64 EngineAdapter backed by a Babylon.js scene.
 *
 * Pass the full Babylon namespace as the first argument so the adapter can be
 * tested with a mock object in Node.js without needing a real DOM or WebGL
 * context.
 *
 * @param BABYLON — Babylon.js namespace (e.g. `import * as BABYLON from '@babylonjs/core'`)
 * @param scene   — A `BABYLON.Scene` instance
 * @param options — Optional configuration
 */
export declare function createBabylonEngineAdapter(
  BABYLON: object,
  scene: object,
  options?: BabylonAdapterOptions
): EngineAdapter;

/**
 * GpuBabylon — standalone Babylon.js GPU backend for Nova64.
 *
 * Provides the same cart-facing API as the Three.js backend
 * (createCube, setCameraPosition, rotateMesh, etc.) through a compatibility
 * surface backed by runtime/backends/babylon/* modules.
 *
 * Phase 2 implementation — see runtime/gpu-babylon.js for full feature list.
 */
export declare class GpuBabylon {
  constructor(canvas: HTMLCanvasElement, w: number, h: number);

  // Primitives
  createCube(
    width?: number,
    height?: number,
    depth?: number,
    color?: number,
    position?: [number, number, number] | { x: number; y: number; z: number },
    options?: object
  ): number;
  createCube(
    size?: number,
    color?: number,
    position?: [number, number, number] | { x: number; y: number; z: number },
    options?: object
  ): number;
  createSphere(
    radius?: number,
    color?: number,
    position?: [number, number, number] | { x: number; y: number; z: number },
    options?: object
  ): number;
  createSphere(
    radius?: number,
    color?: number,
    position?: [number, number, number] | { x: number; y: number; z: number },
    segments?: number,
    options?: object
  ): number;
  createPlane(
    width?: number,
    height?: number,
    color?: number,
    position?: [number, number, number] | { x: number; y: number; z: number },
    options?: object
  ): number;
  createCylinder(
    radius?: number,
    height?: number,
    color?: number,
    position?: [number, number, number] | { x: number; y: number; z: number },
    options?: object
  ): number;
  createCylinder(
    radius?: number,
    height?: number,
    color?: number,
    segments?: number,
    position?: [number, number, number] | { x: number; y: number; z: number },
    options?: object
  ): number;
  createCylinder(
    rTop?: number,
    rBottom?: number,
    height?: number,
    color?: number,
    position?: [number, number, number] | { x: number; y: number; z: number },
    options?: object
  ): number;
  createCone(
    radius?: number,
    height?: number,
    color?: number,
    position?: [number, number, number] | { x: number; y: number; z: number },
    options?: object
  ): number;
  destroyMesh(id: number): void;
  removeMesh(id: number): void;
  getMesh(id: number): object | null;
  getBackendCapabilities(): Record<string, boolean | string>;

  // Transforms
  setPosition(id: number, x: number, y: number, z: number): void;
  setScale(id: number, x: number, y: number, z: number): void;
  setRotation(id: number, x: number, y: number, z: number): void;
  getPosition(id: number): [number, number, number] | null;
  rotateMesh(id: number, rx: number, ry: number, rz: number): void;

  // Camera
  setCameraPosition(x: number, y: number, z: number): void;
  setCameraTarget(x: number, y: number, z: number): void;
  setCameraFOV(fovDegrees: number): void;

  // Lights
  setAmbientLight(color?: number, intensity?: number): void;
  setLightDirection(x: number, y: number, z: number): void;
  setLightColor(color: number): void;
  createPointLight(
    color?: number,
    intensity?: number,
    distanceOrPosition?: number | [number, number, number] | { x: number; y: number; z: number },
    x?: number | [number, number, number] | { x: number; y: number; z: number },
    y?: number,
    z?: number
  ): number;

  // Scene
  setFog(color?: number, near?: number, far?: number): void;
  clearFog(): void;
  get3DStats(): { triangles: number; drawCalls: number; meshes: number; backend: string };

  // 2D HUD
  cls(color?: number): void;
  print(text: string, x: number, y: number, color?: number, size?: number): void;

  // Babylon accessors
  getScene(): object;
  getCamera(): object;
  getRenderer(): object;

  // Cart integration
  exposeTo(target: object): void;
}

// ---------------------------------------------------------------------------
// Global cart API (injected into globalThis at runtime)
// Augment with: declare global { ... } in your cart's .d.ts if needed.
// ---------------------------------------------------------------------------

export interface Nova64CartGlobals {
  // Engine adapter
  engine: EngineAdapter;

  // 3D
  createCube: ThreeDApiInstance['createCube'];
  createSphere: ThreeDApiInstance['createSphere'];
  createCylinder: ThreeDApiInstance['createCylinder'];
  createPlane: ThreeDApiInstance['createPlane'];
  createTorus: ThreeDApiInstance['createTorus'];
  createCone: ThreeDApiInstance['createCone'];
  createCapsule: ThreeDApiInstance['createCapsule'];
  createAdvancedCube: ThreeDApiInstance['createAdvancedCube'];
  createAdvancedSphere: ThreeDApiInstance['createAdvancedSphere'];
  destroyMesh: ThreeDApiInstance['destroyMesh'];
  removeMesh: ThreeDApiInstance['removeMesh'];
  getMesh: ThreeDApiInstance['getMesh'];
  loadModel: ThreeDApiInstance['loadModel'];
  playAnimation: ThreeDApiInstance['playAnimation'];
  updateAnimations: ThreeDApiInstance['updateAnimations'];
  loadTexture: ThreeDApiInstance['loadTexture'];
  setPosition: ThreeDApiInstance['setPosition'];
  setRotation: ThreeDApiInstance['setRotation'];
  setScale: ThreeDApiInstance['setScale'];
  getPosition: ThreeDApiInstance['getPosition'];
  getRotation: ThreeDApiInstance['getRotation'];
  rotateMesh: ThreeDApiInstance['rotateMesh'];
  moveMesh: ThreeDApiInstance['moveMesh'];
  setFlatShading: ThreeDApiInstance['setFlatShading'];
  setMeshVisible: ThreeDApiInstance['setMeshVisible'];
  setMeshOpacity: ThreeDApiInstance['setMeshOpacity'];
  setCastShadow: ThreeDApiInstance['setCastShadow'];
  setReceiveShadow: ThreeDApiInstance['setReceiveShadow'];
  setCameraPosition: ThreeDApiInstance['setCameraPosition'];
  setCameraTarget: ThreeDApiInstance['setCameraTarget'];
  setCameraLookAt: ThreeDApiInstance['setCameraLookAt'];
  setCameraFOV: ThreeDApiInstance['setCameraFOV'];
  setFog: ThreeDApiInstance['setFog'];
  clearFog: ThreeDApiInstance['clearFog'];
  setLightDirection: ThreeDApiInstance['setLightDirection'];
  setLightColor: ThreeDApiInstance['setLightColor'];
  setAmbientLight: ThreeDApiInstance['setAmbientLight'];
  setDirectionalLight: ThreeDApiInstance['setDirectionalLight'];
  clearScene: ThreeDApiInstance['clearScene'];
  enablePixelation: ThreeDApiInstance['enablePixelation'];
  enableDithering: ThreeDApiInstance['enableDithering'];
  createPointLight: ThreeDApiInstance['createPointLight'];
  setPointLightPosition: ThreeDApiInstance['setPointLightPosition'];
  setPointLightColor: ThreeDApiInstance['setPointLightColor'];
  removeLight: ThreeDApiInstance['removeLight'];
  createInstancedMesh: ThreeDApiInstance['createInstancedMesh'];
  setInstanceTransform: ThreeDApiInstance['setInstanceTransform'];
  setInstanceColor: ThreeDApiInstance['setInstanceColor'];
  finalizeInstances: ThreeDApiInstance['finalizeInstances'];
  removeInstancedMesh: ThreeDApiInstance['removeInstancedMesh'];
  createParticleSystem: ThreeDApiInstance['createParticleSystem'];
  setParticleEmitter: ThreeDApiInstance['setParticleEmitter'];
  emitParticle: ThreeDApiInstance['emitParticle'];
  burstParticles: ThreeDApiInstance['burstParticles'];
  updateParticles: ThreeDApiInstance['updateParticles'];
  removeParticleSystem: ThreeDApiInstance['removeParticleSystem'];
  getParticleStats: ThreeDApiInstance['getParticleStats'];
  createLODMesh: ThreeDApiInstance['createLODMesh'];
  setLODPosition: ThreeDApiInstance['setLODPosition'];
  removeLODMesh: ThreeDApiInstance['removeLODMesh'];
  updateLODs: ThreeDApiInstance['updateLODs'];
  loadNormalMap: ThreeDApiInstance['loadNormalMap'];
  setNormalMap: ThreeDApiInstance['setNormalMap'];
  setPBRMaps: ThreeDApiInstance['setPBRMaps'];
  raycastFromCamera: ThreeDApiInstance['raycastFromCamera'];
  get3DStats: ThreeDApiInstance['get3DStats'];
  getScene: ThreeDApiInstance['getScene'];
  getCamera: ThreeDApiInstance['getCamera'];
  getRenderer: ThreeDApiInstance['getRenderer'];

  // UI
  setFont: UIApiInstance['setFont'];
  getFont: UIApiInstance['getFont'];
  setTextAlign: UIApiInstance['setTextAlign'];
  setTextBaseline: UIApiInstance['setTextBaseline'];
  measureText: UIApiInstance['measureText'];
  drawText: UIApiInstance['drawText'];
  drawTextShadow: UIApiInstance['drawTextShadow'];
  drawTextOutline: UIApiInstance['drawTextOutline'];
  createPanel: UIApiInstance['createPanel'];
  drawPanel: UIApiInstance['drawPanel'];
  drawAllPanels: UIApiInstance['drawAllPanels'];
  removePanel: UIApiInstance['removePanel'];
  clearPanels: UIApiInstance['clearPanels'];
  createButton: UIApiInstance['createButton'];
  updateButton: UIApiInstance['updateButton'];
  drawButton: UIApiInstance['drawButton'];
  updateAllButtons: UIApiInstance['updateAllButtons'];
  drawAllButtons: UIApiInstance['drawAllButtons'];
  removeButton: UIApiInstance['removeButton'];
  clearButtons: UIApiInstance['clearButtons'];
  drawProgressBar: UIApiInstance['drawProgressBar'];
  drawRoundedRect: UIApiInstance['drawRoundedRect'];
  drawGradientRect: UIApiInstance['drawGradientRect'];
  centerX: UIApiInstance['centerX'];
  centerY: UIApiInstance['centerY'];
  grid: UIApiInstance['grid'];
  setMousePosition: UIApiInstance['setMousePosition'];
  setMouseButton: UIApiInstance['setMouseButton'];
  getMousePosition: UIApiInstance['getMousePosition'];
  isMouseDown: UIApiInstance['isMouseDown'];
  isMousePressed: UIApiInstance['isMousePressed'];
  uiColors: UIApiInstance['uiColors'];
  uiFonts: UIApiInstance['uiFonts'];

  // Input (runtime/input.js)
  key(code: string): boolean;
  keyp(code: string): boolean;
  btn(index: number): boolean;
  btnp(index: number): boolean;

  // 2D drawing (runtime/framebuffer.js / api-2d.js)
  cls(color?: Color): void;
  print(text: string, x: number, y: number, color?: Color, scale?: number): void;
  printCentered(text: string, y: number, color?: Color, scale?: number): void;
  line(x1: number, y1: number, x2: number, y2: number, color?: Color): void;
  circle(x: number, y: number, r: number, color?: Color, filled?: boolean): void;
  drawRect(x: number, y: number, w: number, h: number, color?: Color): void;
  rgba8(r: number, g: number, b: number, a: number): Color;

  // Storage (runtime/storage.js)
  saveData(key: string, value: unknown): void;
  loadData(key: string, fallback?: unknown): unknown;
  deleteData(key: string): void;

  // Audio (runtime/audio.js)
  sfx(preset: string | { wave?: string; freq?: number; dur?: number; vol?: number }): void;

  // ─── 2D Stage API ────────────────────────────────────────────────────────────

  // Blend modes (runtime/api-blend.js)
  BM: {
    NORMAL: string;
    ADD: string;
    MULTIPLY: string;
    SCREEN: string;
    OVERLAY: string;
    DARKEN: string;
    LIGHTEN: string;
    DIFFERENCE: string;
    EXCLUSION: string;
    HUE: string;
    SATURATION: string;
    COLOR: string;
    LUMINOSITY: string;
    ERASE: string;
    NONE: string;
  };
  setBlendMode(mode: string): void;
  resetBlendMode(): void;
  withBlend(mode: string, fn: (ctx: CanvasRenderingContext2D | null) => void): void;
  withAlpha(alpha: number, fn: (ctx: CanvasRenderingContext2D | null) => void): void;

  // Stage display list (runtime/stage.js)
  createContainer(): StageNode;
  createSpriteNode(
    image: HTMLImageElement | HTMLCanvasElement | ImageBitmap,
    opts?: SpriteNodeOpts
  ): StageNode;
  createGraphicsNode(drawFn: (ctx: CanvasRenderingContext2D, node: StageNode) => void): StageNode;
  createTextNode(text: string, opts?: TextNodeOpts): StageNode;
  addChild(parent: StageNode, child: StageNode): StageNode;
  removeChild(parent: StageNode, child: StageNode): boolean;
  removeAllChildren(parent: StageNode): void;
  setChildIndex(parent: StageNode, child: StageNode, index: number): void;
  drawStage(root: StageNode): void;
  hitTest(node: StageNode, px: number, py: number): boolean;

  // MovieClip (runtime/movie-clip.js)
  createMovieClip(frames: MovieClipFrame[], fps?: number, opts?: MovieClipOpts): MovieClip;
  playClip(clip: MovieClip): void;
  pauseClip(clip: MovieClip): void;
  stopClip(clip: MovieClip): void;
  gotoAndPlay(clip: MovieClip, labelOrIndex: string | number): void;
  gotoAndStop(clip: MovieClip, labelOrIndex: string | number): void;
  updateClips(dt: number): void;
  drawClip(clip: MovieClip, x: number, y: number, opts?: SprOpts): void;

  // Filters (runtime/api-filters.js)
  F: {
    blur(px: number): string;
    brightness(v: number): string;
    contrast(v: number): string;
    grayscale(v?: number): string;
    sepia(v?: number): string;
    saturate(v: number): string;
    hueRotate(deg: number): string;
    invert(v?: number): string;
    opacity(v: number): string;
    glow(color: number, radius?: number): string;
    shadow(color: number, dx?: number, dy?: number, radius?: number): string;
    combine(...filters: string[]): string;
  };
  CM: {
    identity: number[];
    grayscale: number[];
    sepia: number[];
    invert: number[];
    nightVision: number[];
    warmth: number[];
  };
  withFilter(filter: string, fn: (ctx: CanvasRenderingContext2D | null) => void): void;
  withColorMatrix(
    matrix: number[],
    fn: (ctx: OffscreenCanvasRenderingContext2D) => void,
    x?: number,
    y?: number,
    w?: number,
    h?: number
  ): void;
  applyColorMatrix(matrix: number[], x?: number, y?: number, w?: number, h?: number): void;

  // Camera2D (runtime/camera-2d.js)
  createCamera2D(opts?: Camera2DOpts): Camera2D;
  beginCamera2D(cam: Camera2D): void;
  endCamera2D(cam: Camera2D): void;
  cam2DApply(cam: Camera2D): void;
  cam2DReset(cam: Camera2D): void;
  cam2DFollow(
    cam: Camera2D,
    targetX: number,
    targetY: number,
    dt: number,
    lerpFactor?: number
  ): void;
  cam2DShake(cam: Camera2D, magnitude: number, duration: number): void;
  updateCamera2D(cam: Camera2D, dt: number): void;
  cam2DWorldToScreen(cam: Camera2D, wx: number, wy: number): { x: number; y: number };
  cam2DScreenToWorld(cam: Camera2D, sx: number, sy: number): { x: number; y: number };
  cam2DGetBounds(cam: Camera2D): { left: number; right: number; top: number; bottom: number };

  // 2D Particles (runtime/api-particles-2d.js)
  createEmitter2D(opts?: Emitter2DOpts): Emitter2D;
  burstEmitter2D(emitter: Emitter2D, count: number): void;
  setEmitter2DActive(emitter: Emitter2D, active: boolean): void;
  updateEmitter2D(emitter: Emitter2D, dt: number): void;
  drawEmitter2D(emitter: Emitter2D): void;
  getParticleCount(emitter: Emitter2D): number;
  clearEmitter2D(emitter: Emitter2D): void;

  // Tween engine (runtime/tween.js)
  Ease: Record<string, (t: number) => number>;
  createTween(
    target: object,
    to: Record<string, number>,
    duration: number,
    opts?: TweenOpts
  ): Tween;
  killTween(tween: Tween): void;
  killTweensOf(target: object): void;
  updateTweens(dt: number): void;
  getTweenCount(): number;

  // Enhanced sprite API (runtime/api-sprites.js)
  sprRect(
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    dx: number,
    dy: number,
    opts?: SprOpts
  ): void;
  loadAtlas(url: string): Promise<string>;
  sprByName(name: string, x: number, y: number, opts?: SprOpts): void;
  getAtlasFrame(
    name: string
  ): { x: number; y: number; w: number; h: number; atlasId: string } | null;
}

// ─── Supporting types ─────────────────────────────────────────────────────────

export interface SprOpts {
  flipX?: boolean;
  flipY?: boolean;
  scale?: number;
  scaleX?: number;
  scaleY?: number;
  parallax?: number;
  rot?: number;
  alpha?: number;
  anchorX?: number;
  anchorY?: number;
  blendMode?: string;
  tint?: number | null;
}

export interface StageNode {
  _type: string;
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  alpha: number;
  visible: boolean;
  blendMode: string;
  children: StageNode[];
  // SpriteNode extras
  image?: HTMLImageElement | HTMLCanvasElement | ImageBitmap;
  sx?: number;
  sy?: number;
  sw?: number;
  sh?: number;
  dw?: number;
  dh?: number;
  anchorX?: number;
  anchorY?: number;
  tint?: number | null;
  flipX?: boolean;
  flipY?: boolean;
  // TextNode extras
  text?: string;
  font?: string;
  fill?: string;
  align?: string;
  baseline?: string;
  stroke?: string | null;
  strokeWidth?: number;
  maxWidth?: number;
  // GraphicsNode extras
  draw?: (ctx: CanvasRenderingContext2D, node: StageNode) => void;
}

export interface SpriteNodeOpts {
  sx?: number;
  sy?: number;
  sw?: number;
  sh?: number;
  dw?: number;
  dh?: number;
  anchorX?: number;
  anchorY?: number;
  tint?: number | null;
  flipX?: boolean;
  flipY?: boolean;
}

export interface TextNodeOpts {
  font?: string;
  fill?: string;
  align?: string;
  baseline?: string;
  stroke?: string;
  strokeWidth?: number;
  maxWidth?: number;
}

export type MovieClipFrame =
  | string
  | { image: HTMLImageElement | HTMLCanvasElement; sx: number; sy: number; sw: number; sh: number };

export interface MovieClipOpts {
  loop?: boolean;
  autoPlay?: boolean;
  labels?: Record<string, number>;
}

export interface MovieClip {
  frames: MovieClipFrame[];
  fps: number;
  loop: boolean;
  playing: boolean;
  frame: number;
  labels: Record<string, number>;
  onLoop: (() => void) | null;
  onComplete: (() => void) | null;
}

export interface Camera2DOpts {
  x?: number;
  y?: number;
  zoom?: number;
  rotation?: number;
  screenW?: number;
  screenH?: number;
}

export interface Camera2D {
  x: number;
  y: number;
  zoom: number;
  rotation: number;
  screenW: number | null;
  screenH: number | null;
}

export interface Emitter2DOpts {
  x?: number;
  y?: number;
  image?: HTMLImageElement | null;
  frames?: Array<{ sx: number; sy: number; sw: number; sh: number }> | null;
  blendMode?: string;
  maxParticles?: number;
  emitRate?: number;
  speed?: number | [number, number];
  angle?: number | [number, number];
  life?: number | [number, number];
  scale?: number | [number, number];
  alpha?: number | [number, number];
  fadeOut?: boolean;
  scaleDown?: boolean;
  gravity?: number;
  friction?: number;
  tint?: number | null;
  rotating?: boolean;
  rotateSpeed?: number | null;
}

export interface Emitter2D {
  x: number;
  y: number;
  active: boolean;
  emitRate: number;
}

export interface TweenOpts {
  ease?: (t: number) => number;
  delay?: number;
  loop?: boolean;
  yoyo?: boolean;
  onUpdate?: (target: object, progress: number) => void;
  onComplete?: (target: object) => void;
}

export interface Tween {
  target: object;
  from: Record<string, number>;
  to: Record<string, number>;
  duration: number;
  _done: boolean;
}
