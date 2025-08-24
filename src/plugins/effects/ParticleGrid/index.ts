import * as THREE from 'three';
import type { EffectContext, EffectInstance, EffectModule } from '../../../engine/types';

type ParticleGridParams = {
  seed: number;
  grid: number;         // grid resolution per side
  spacing: number;      // world space distance between points
  amplitude: number;    // z displacement amplitude
  speed: number;        // animation speed
  pointSize: number;    // points material size
  palette: 0 | 1 | 2;   // color theme
};

function colorFromPalette(p: number): number {
  switch (p) {
    case 1: return 0xf5a524; // amber
    case 2: return 0x22c55e; // green
    default: return 0x60a5fa; // blue
  }
}

class ParticleGridInstance implements EffectInstance {
  scene = new THREE.Scene();
  camera: THREE.PerspectiveCamera;
  private points: THREE.Points;
  private basePositions: Float32Array; // original XY positions
  private grid: number;
  private spacing: number;

  constructor(_ctx: EffectContext, params: ParticleGridParams) {
    this.grid = params.grid;
    this.spacing = params.spacing;

    const geo = new THREE.BufferGeometry();
    const count = this.grid * this.grid;
    const positions = new Float32Array(count * 3);
    const half = (this.grid - 1) * this.spacing * 0.5;
    let i = 0;
    for (let y = 0; y < this.grid; y++) {
      for (let x = 0; x < this.grid; x++) {
        positions[i++] = x * this.spacing - half; // x
        positions[i++] = y * this.spacing - half; // y
        positions[i++] = 0; // z animated later
      }
    }
    this.basePositions = positions.slice();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ color: colorFromPalette(params.palette), size: params.pointSize, sizeAttenuation: true });
    this.points = new THREE.Points(geo, mat);
    this.scene.add(this.points);

    this.camera = new THREE.PerspectiveCamera(60, 16/9, 0.1, 100);
    this.camera.position.set(0, 0, Math.max(6, this.grid * this.spacing * 0.7));
  }

  private rebuild(grid: number, spacing: number) {
    this.grid = grid; this.spacing = spacing;
    const count = grid * grid;
    const positions = new Float32Array(count * 3);
    const half = (grid - 1) * spacing * 0.5;
    let i = 0;
    for (let y = 0; y < grid; y++) {
      for (let x = 0; x < grid; x++) {
        positions[i++] = x * spacing - half; // x
        positions[i++] = y * spacing - half; // y
        positions[i++] = 0; // z animated later
      }
    }
    this.basePositions = positions.slice();
    this.points.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.camera.position.set(0, 0, Math.max(6, grid * spacing * 0.7));
  }

  update(_dt: number, t: number, params: ParticleGridParams): void {
    if (params.grid !== this.grid || Math.abs(params.spacing - this.spacing) > 1e-6) {
      const g = Math.max(2, Math.min(256, Math.floor(params.grid)));
      this.rebuild(g, params.spacing);
    }
    const pos = this.points.geometry.getAttribute('position') as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    const amp = params.amplitude;
    const spd = params.speed;
    const g = this.grid;
    for (let i = 0; i < arr.length; i += 3) {
      const x = this.basePositions[i + 0];
      const y = this.basePositions[i + 1];
      const nx = (x / (g * params.spacing));
      const ny = (y / (g * params.spacing));
      const phase = Math.sin(nx * 4.0 + t * spd) + Math.cos(ny * 4.0 - t * spd * 1.2);
      arr[i + 2] = amp * 0.5 * phase;
    }
    pos.needsUpdate = true;
    (this.points.material as THREE.PointsMaterial).size = params.pointSize;
    (this.points.material as THREE.PointsMaterial).color.setHex(colorFromPalette(params.palette));
  }

  resize(): void {}
  dispose(): void {
    this.points.geometry.dispose();
    (this.points.material as THREE.Material).dispose();
  }
}

export const ParticleGrid: EffectModule<ParticleGridParams> = {
  meta: { id: '@pack/particle-grid', name: 'ParticleGrid', author: 'demomaker', version: '0.1.0' },
  defaultParams: {
    seed: 42,
    grid: 64,
    spacing: 0.08,
    amplitude: 0.7,
    speed: 1.8,
    pointSize: 0.02,
    palette: 0
  },
  init(ctx: EffectContext, params: ParticleGridParams) {
    return new ParticleGridInstance(ctx, params);
  }
};

export default ParticleGrid;
