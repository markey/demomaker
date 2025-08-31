import * as THREE from 'three';
import type { EffectInstance, EffectModule, TransitionInstance, EffectContext } from './types';
// Postprocessing (types available via three examples)
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ResourceManager } from './ResourceManager';
import { Scheduler } from './Scheduler';
import { getEffect, getTransition } from '../plugins/PluginManager';

export class RendererManager {
  readonly canvas: HTMLCanvasElement;
  readonly renderer: THREE.WebGLRenderer;
  readonly sceneGraph = new (class { scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(60, 16/9, 0.1, 100);} )();
  private _effect: EffectInstance | null = null;
  private _effects = new Map<string, { instance: EffectInstance; params: any }>();
  private _transitions = new Map<string, TransitionInstance>();
  private _renderTargets = new Map<string, THREE.WebGLRenderTarget>();
  private _raf = 0;
  private _running = false;
  private _time = 0;
  private _lastTime = 0; // Track last time for dt calculation
  private _scheduler: Scheduler;
  private _resources: ResourceManager;
  private _events = new Map<string, Set<(d:any)=>void>>();
  private _composer?: EffectComposer;
  private _renderPass?: RenderPass;
  private _bloom?: UnrealBloomPass;
  private _transitionComposer?: EffectComposer;
  private _lastW = 0;
  private _lastH = 0;
  private _lastSafeDpr = 0;
  private _maxDim = 4096;
  private _dprCap = 1.5; // cap DPR to reduce FBO pressure and drift
  private _resizeTimeout: number | null = null;

  constructor(canvas: HTMLCanvasElement, fps = 60) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setClearColor(0x000000, 1);
    this._scheduler = new Scheduler(fps);
    this._resources = new ResourceManager();
    // Cache GPU limits (best-effort)
    try {
      const gl = this.renderer.getContext() as WebGL2RenderingContext;
      const maxRB = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE) as number;
      const maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
      const cap = Math.max(1, Math.min(maxRB || 4096, maxTex || 4096));
      this._maxDim = isFinite(cap) ? cap : 4096;
    } catch {/* ignore */}
  }

  get time() { return this._time; }

  // Set the current time (called by transport)
  setTime(time: number) {
    this._time = time;
  }

  // Load multiple effects for transition scenarios
  async loadMultipleEffects(effects: Array<{ id: string; moduleId: string; params: any }>) {
    const ctx = this.createContext(60); // fps will be set properly later
    const { w, h } = this.getSize();

    // Dispose existing multi-effects
    this.disposeMultiEffects();

    // Load new effects
    for (const effect of effects) {
      try {
        const mod = getEffect(effect.moduleId);
        if (mod) {
          const instance = await mod.init(ctx, effect.params);
          this._effects.set(effect.id, { instance, params: effect.params });

          // Create render target for this effect
          const renderTarget = new THREE.WebGLRenderTarget(w, h, {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBAFormat,
            type: THREE.UnsignedByteType
          });
          this._renderTargets.set(effect.id, renderTarget);
        }
      } catch (error) {
        console.error(`Failed to load effect ${effect.moduleId}:`, error);
        // Continue loading other effects
      }
    }
  }

  // Load transition instances
  async loadTransitions(transitions: Array<{ id: string; moduleId: string; params: any }>) {
    const ctx = this.createContext(60);

    // Dispose existing transitions
    this.disposeTransitions();

    // Load new transitions
    for (const transition of transitions) {
      try {
        const mod = getTransition(transition.moduleId);
        if (mod) {
          const instance = mod.init(ctx, transition.params);
          this._transitions.set(transition.id, instance);
        }
      } catch (error) {
        console.error(`Failed to load transition ${transition.moduleId}:`, error);
        // Continue loading other transitions
      }
    }
  }

  private disposeMultiEffects() {
    for (const [id, effectData] of this._effects) {
      effectData.instance.dispose();
      const renderTarget = this._renderTargets.get(id);
      if (renderTarget) {
        renderTarget.dispose();
      }
    }
    this._effects.clear();
    this._renderTargets.clear();
  }

  private disposeTransitions() {
    for (const transition of this._transitions.values()) {
      transition.dispose();
    }
    this._transitions.clear();
  }

  getSize() {
    const rect = this.canvas.getBoundingClientRect();
    // Use getBoundingClientRect for more accurate sizing, fallback to client dimensions
    let w = rect.width;
    let h = rect.height;
    
    // Fallback to client dimensions if getBoundingClientRect returns 0
    if (!w || !h) {
      w = this.canvas.clientWidth || this.canvas.width;
      h = this.canvas.clientHeight || this.canvas.height;
    }
    
    // Ensure we have valid dimensions
    w = Math.max(1, Math.round(w));
    h = Math.max(1, Math.round(h));
    
    const dpr = window.devicePixelRatio || 1; // raw DPR (clamped later)
    return { w, h, dpr };
  }

  updateViewport() {
    let { w, h, dpr } = this.getSize();
    // Guard against zero or negative sizes during layout transitions
    w = Math.max(1, Math.floor(w));
    h = Math.max(1, Math.floor(h));

    // Clamp effective DPR so FBOs never exceed device limits
    const maxDprByDim = this._maxDim / Math.max(w, h);
    const safeDpr = Math.max(1, Math.min(dpr, this._dprCap, maxDprByDim));

    this.renderer.setPixelRatio(safeDpr);
    this.renderer.setSize(w, h, false);
    const cam = (this._effect?.camera) || this.sceneGraph.camera;
    cam.aspect = w / h;
    cam.updateProjectionMatrix();
    this._effect?.resize?.(w, h, safeDpr);
    if (this._composer) this._composer.setPixelRatio(safeDpr);
    this._composer?.setSize(w, h);
    this._bloom?.setSize(w, h);
    this._lastW = w; this._lastH = h; this._lastSafeDpr = safeDpr;
  }

  private ensureViewport() {
    let { w, h, dpr } = this.getSize();
    // Use rounded CSS sizes to avoid micro-drift from fractional values
    w = Math.max(1, Math.round(w));
    h = Math.max(1, Math.round(h));
    const maxDprByDim = this._maxDim / Math.max(w, h);
    const safeDpr = Math.max(1, Math.min(dpr, this._dprCap, maxDprByDim));
    
    // More precise size checking to prevent drift
    const sizeChanged = Math.abs(w - this._lastW) > 0.5 || Math.abs(h - this._lastH) > 0.5 || Math.abs(safeDpr - this._lastSafeDpr) > 0.01;
    
    if (sizeChanged) {
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

  // Backward compatibility method
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

    // Initialize time tracking
    this._lastTime = performance.now() / 1000;

    // Initial viewport setup
    this.updateViewport();
    
    const loop = (tms: number) => {
      // Use wall time for dt calculation, but ensure consistent timing
      const currentTime = tms / 1000;
      const dt = Math.min(currentTime - this._lastTime, 1/30); // Cap dt to prevent large jumps
      this._lastTime = currentTime;

      // Keep renderer/composer/camera sizes in sync with CSS size each frame
      this.ensureViewport();

      // Choose rendering mode based on active effects
      try {
        if (this._effects.size > 1) {
          // Multi-effect mode: render directly without composer
          this.renderMultiEffects(dt, this._time);
        } else if (this._effects.size === 1) {
          // Single effect from multi-effects map
          const effectData = this._effects.values().next().value;
          if (effectData) {
            effectData.instance.update(dt, this._time, effectData.params);
            this.renderer.render(effectData.instance.scene, effectData.instance.camera);
          }
        } else {
          // Fallback to legacy single effect
          this._effect?.update(dt, this._time, (this as any)._params || {});
          if (this._composer && this._renderPass) {
            this._composer.render();
          } else {
            const scene = this._effect?.scene || this.sceneGraph.scene;
            const camera = this._effect?.camera || this.sceneGraph.camera;
            this.renderer.render(scene, camera);
          }
        }
      } catch (error) {
        console.warn('WebGL rendering error:', error);
        // Continue with minimal rendering on error
        try {
          const scene = this._effect?.scene || this.sceneGraph.scene;
          const camera = this._effect?.camera || this.sceneGraph.camera;
          this.renderer.render(scene, camera);
        } catch (fallbackError) {
          console.error('Fallback rendering also failed:', fallbackError);
        }
      }
      this._raf = requestAnimationFrame(loop);
    };
    this._raf = requestAnimationFrame(loop);
    window.addEventListener('resize', this._onResize);
  }

  stop() {
    this._running = false;
    cancelAnimationFrame(this._raf);
    if (this._resizeTimeout) {
      clearTimeout(this._resizeTimeout);
      this._resizeTimeout = null;
    }
    window.removeEventListener('resize', this._onResize);
  }

  setParams(params: any) { (this as any)._params = params; }

  // Force a viewport update (useful for external resize handling)
  forceViewportUpdate() {
    this.updateViewport();
  }

  private _onResize = () => { 
    // Debounce resize events to prevent excessive updates
    if (this._resizeTimeout) {
      clearTimeout(this._resizeTimeout);
    }
    this._resizeTimeout = setTimeout(() => {
      this.updateViewport();
      this._resizeTimeout = null;
    }, 16); // ~60fps debounce
  };



  private renderMultiEffects(dt: number, time: number) {
    if (this._effects.size === 0) return;

    // For now, just render the first effect as a placeholder
    // TODO: Implement proper transition blending between multiple effects
    const firstEffectData = this._effects.values().next().value;
    if (firstEffectData) {
      firstEffectData.instance.update(dt, time, firstEffectData.params);
      this.renderer.render(firstEffectData.instance.scene, firstEffectData.instance.camera);
    }
  }

  dispose() {
    this.stop();
    if (this._resizeTimeout) {
      clearTimeout(this._resizeTimeout);
      this._resizeTimeout = null;
    }
    this.disposeMultiEffects();
    this.disposeTransitions();
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
