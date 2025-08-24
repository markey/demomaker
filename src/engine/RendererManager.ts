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
    const { w, h, dpr } = this.getSize();
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    const cam = (this._effect?.camera) || this.sceneGraph.camera;
    cam.aspect = w / h;
    cam.updateProjectionMatrix();
    this._effect?.resize?.(w, h, dpr);
    this._composer?.setPixelRatio(dpr);
    this._composer?.setSize(w, h);
    this._bloom?.setSize(w, h);
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

