import * as THREE from 'three';
import { createSeededRNG } from '../utils/seededRNG';
import type { ResourceFacade, SeededRNG } from './types';

export class ResourceManager implements ResourceFacade {
  private loader = new THREE.TextureLoader();
  private cache = new Map<string, THREE.Texture>();
  private rng: SeededRNG;

  constructor(seed = 1234) {
    this.rng = createSeededRNG(seed) as unknown as SeededRNG;
  }

  async loadTexture(url: string) {
    if (this.cache.has(url)) return this.cache.get(url)!;
    const tex = await new Promise<THREE.Texture>((resolve, reject) => {
      this.loader.load(url, resolve, undefined, reject);
    });
    this.cache.set(url, tex);
    return tex;
  }

  getRandom(): SeededRNG {
    return this.rng;
  }
}

