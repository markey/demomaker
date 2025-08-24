import * as THREE from 'three';
import type { EffectInstance } from './types';

export class SceneGraph {
  activeEffect: EffectInstance | null = null;
  cameraFallback = new THREE.PerspectiveCamera(60, 16/9, 0.1, 100);
  sceneFallback = new THREE.Scene();
}

