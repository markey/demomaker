import * as THREE from 'three';

export type Size = { w: number; h: number; dpr: number };

export interface AudioFacade {
  now(): number; // audio clock seconds
  fft(size?: number): Float32Array | null;
  energy(band: string): number; // 0..1 normalized band energy
  beat(subdiv?: string): boolean; // flag for beat events
}

export interface ResourceFacade {
  loadTexture(url: string): Promise<THREE.Texture>;
  getRandom(): SeededRNG;
}

export interface SeededRNG {
  next(): number; // [0,1)
  int(max: number): number;
  range(min: number, max: number): number;
}

export interface EventBus {
  emit(type: string, data?: any): void;
  on(type: string, fn: (data: any) => void): () => void;
}

export type EffectContext = {
  gl: WebGL2RenderingContext;
  renderer: THREE.WebGLRenderer;
  composer?: any; // EffectComposer (imported lazily to decouple types)
  time: () => number; // seconds since project start
  fps: number;
  size: () => Size;
  audio: AudioFacade;
  resources: ResourceFacade;
  random: SeededRNG;
  events: EventBus;
};

export interface EffectInstance {
  scene: THREE.Scene;
  camera: THREE.Camera;
  update(dt: number, t: number, params: any): void;
  onPointer?(e: { x: number; y: number; type: string }): void;
  resize?(vw: number, vh: number, dpr: number): void;
  dispose(): void;
}

export interface EffectModule<P extends object = any> {
  meta: { id: string; name: string; author?: string; version: string };
  defaultParams: P;
  schema?: any;
  init(ctx: EffectContext, params: P): Promise<EffectInstance> | EffectInstance;
}

export interface TransitionInstance {
  render(fromTex: THREE.Texture, toTex: THREE.Texture, progress: number, params: any): void;
  resize?(w: number, h: number, dpr: number): void;
  dispose(): void;
}

export interface TransitionModule<P = any> {
  meta: { id: string; name: string; version: string };
  defaultParams: P;
  init(ctx: EffectContext, params: P): TransitionInstance;
}

