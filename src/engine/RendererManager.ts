import * as THREE from 'three';
import type { EffectInstance, EffectModule, EffectContext } from './types';
// Postprocessing (types available via three examples)
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ResourceManager } from './ResourceManager';
import { Scheduler } from './Scheduler';

export class RendererManager {
  readonly canvas: HTMLCanvasElement;
  readonly renderer: THREE.WebGLRenderer;
  readonly sceneGraph = new (class { scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(60, 16/9, 0.1, 100);} )();
  private _effect: EffectInstance | null = null;
  private _raf = 0;
  private _running = false;
  private _time = 0;
  private _scheduler: Scheduler;
  private _resources: ResourceManager;
  private _events = new Map<string, Set<(d:any)=>void>>();
  private _composer?: EffectComposer;
  private _renderPass?: RenderPass;
  private _bloom?: UnrealBloomPass;
  private _lastW = 0;
  private _lastH = 0;
  private _lastDpr = 0;

  constructor(canvas: HTMLCanvasElement, fps = 60) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setClearColor(0x000000, 1);
    this._scheduler = new Scheduler(fps);
    this._resources = new ResourceManager();
  }

  get time() { return this._time; }

  getSize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = this.canvas.clientWidth || this.canvas.width;
    const h = this.canvas.clientHeight || this.canvas.height;
    return { w, h, dpr };
  }

  private updateViewport() {
    let { w, h, dpr } = this.getSize();
    // Guard against zero or negative sizes during layout transitions
    w = Math.max(1, Math.floor(w));
    h = Math.max(1, Math.floor(h));

    // Clamp effective DPR so FBOs never exceed device limits
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const maxRB = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE) as number;
    const maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
    const maxDim = Math.max(1, Math.min(maxRB || 4096, maxTex || 4096));
    const maxDprByDim = maxDim / Math.max(w, h);
    const safeDpr = Math.max(1, Math.min(dpr, 2, maxDprByDim));

    this.renderer.setPixelRatio(safeDpr);
    this.renderer.setSize(w, h, false);
    const cam = (this._effect?.camera) || this.sceneGraph.camera;
    cam.aspect = w / h;
    cam.updateProjectionMatrix();
    this._effect?.resize?.(w, h, safeDpr);
    this._composer?.setPixelRatio(safeDpr);
    this._composer?.setSize(w, h);
    this._bloom?.setSize(w, h);
    this._lastW = w; this._lastH = h; this._lastDpr = safeDpr;
  }

  private ensureViewport() {
    const { w, h, dpr } = this.getSize();
    if (w !== this._lastW || h !== this._lastH || dpr !== this._lastDpr) {
      this.updateViewport();
    }
  }

  createContext(fps: number): EffectContext {
    const gl = this.renderer.getContext();
    return {
      gl: gl as WebGL2RenderingContext,
      renderer: this.renderer,
      composer: undefined,
      time: () => this._time,
      fps,
      size: () => this.getSize(),
      audio: { now: () => this._time, fft: () => null, energy: () => 0, beat: () => false },
      resources: this._resources,
      random: this._resources.getRandom(),
      events: { emit: (t: string, d?: any) => this.emit(t, d), on: (t: string, fn: (d:any)=>void) => this.on(t, fn) }
    };
  }

  async loadEffect(mod: EffectModule<any>, params: any, fps: number) {
    if (this._effect) { this._effect.dispose(); this._effect = null; }
    const ctx = this.createContext(fps);
    this._effect = await mod.init(ctx, params);
    // (Re)build composer based on current scene/camera
    const { w, h } = this.getSize();
    this._composer = new EffectComposer(this.renderer);
    this._renderPass = new RenderPass(this._effect.scene, this._effect.camera);
    this._composer.addPass(this._renderPass);
    if (this._bloom) this._composer.addPass(this._bloom);
    this._composer.setSize(w, h);
    this.updateViewport();
  }

  start() {
    if (this._running) return;
    this._running = true;
    const loop = (tms: number) => {
      const t = tms / 1000;
      const dt = this._scheduler.tick(t) || 0;
      this._time += dt;
      // Keep renderer/composer/camera sizes in sync with CSS size
      this.ensureViewport();
      this._effect?.update(dt, this._time, (this as any)._params || {});
      if (this._composer && this._renderPass) {
        this._composer.render();
      } else {
        const scene = this._effect?.scene || this.sceneGraph.scene;
        const camera = this._effect?.camera || this.sceneGraph.camera;
        this.renderer.render(scene, camera);
      }
      this._raf = requestAnimationFrame(loop);
    };
    this._raf = requestAnimationFrame(loop);
    window.addEventListener('resize', this._onResize);
  }

  stop() {
    this._running = false;
    cancelAnimationFrame(this._raf);
    window.removeEventListener('resize', this._onResize);
  }

  setParams(params: any) { (this as any)._params = params; }

  private _onResize = () => this.updateViewport();

  dispose() {
    this.stop();
    this._effect?.dispose();
    this.renderer.dispose();
  }

  emit(type: string, data?: any) {
    const set = this._events.get(type);
    set?.forEach((fn) => fn(data));
  }
  on(type: string, fn: (d:any)=>void) {
    let set = this._events.get(type);
    if (!set) { set = new Set(); this._events.set(type, set); }
    set.add(fn);
    return () => set?.delete(fn);
  }
}

export type PostPassConfig = { pass: 'Bloom'; params?: { strength?: number; radius?: number; threshold?: number } }[];

export function configurePost(rm: RendererManager, post: PostPassConfig) {
  // Simple helper to configure bloom only for MVP
  const bloomCfg = post.find(p => p.pass === 'Bloom');
  const canvas = rm.canvas;
  const w = canvas.clientWidth || canvas.width;
  const h = canvas.clientHeight || canvas.height;
  if (bloomCfg) {
    const strength = bloomCfg.params?.strength ?? 0.8;
    const radius = bloomCfg.params?.radius ?? 0.2;
    const threshold = bloomCfg.params?.threshold ?? 0.8;
    (rm as any)._bloom = new UnrealBloomPass(new THREE.Vector2(w, h), strength, radius, threshold);
    if ((rm as any)._composer && (rm as any)._renderPass) {
      (rm as any)._composer.addPass((rm as any)._bloom);
    }
  }
}
