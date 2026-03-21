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
  emitterX?: number;
  emitterY?: number;
  emitterZ?: number;
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
}

export interface ParticleEmitter {
  x: number;
  y: number;
  z: number;
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
    size?: number,
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

  // Model loading
  loadModel(
    url: string,
    position?: [number, number, number],
    options?: MeshOptions
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
  getPosition(meshId: MeshId): { x: number; y: number; z: number } | null;
  getRotation(meshId: MeshId): { x: number; y: number; z: number } | null;
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
// Global cart API (injected into globalThis at runtime)
// Augment with: declare global { ... } in your cart's .d.ts if needed.
// ---------------------------------------------------------------------------

export interface Nova64CartGlobals {
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
}
