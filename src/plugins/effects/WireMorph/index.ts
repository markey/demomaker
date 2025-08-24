import * as THREE from 'three';
import type { EffectModule, EffectInstance, EffectContext } from '../../../engine/types';

type WireMorphParams = {
  palette: 0 | 1 | 2;
  morph: number; // 0..1
  autoRotate: boolean;
  pulseSpeed?: number;
  pointSize?: number;
  starDensity?: number;
  interactive?: boolean;
};

class WireMorphInstance implements EffectInstance {
  scene = new THREE.Scene();
  camera: THREE.PerspectiveCamera;
  private nodes: THREE.Points;
  private edges: THREE.LineSegments;
  private rotation = 0;

  constructor(private ctx: EffectContext, params: WireMorphParams) {
    this.camera = new THREE.PerspectiveCamera(60, 16/9, 0.1, 100);
    this.camera.position.set(0, 0, 3.2);

    // Simple placeholder geometry: icosahedron morph scale
    const geo = new THREE.IcosahedronGeometry(1, 2);
    const pts = new THREE.PointsMaterial({ color: 0x7fd1ff, size: (params.pointSize ?? 0.02) });
    this.nodes = new THREE.Points(geo, pts);
    this.scene.add(this.nodes);

    const edgesGeo = new THREE.EdgesGeometry(geo);
    this.edges = new THREE.LineSegments(edgesGeo, new THREE.LineBasicMaterial({ color: 0x2e9afe, opacity: 0.35, transparent: true }));
    this.scene.add(this.edges);

    const light = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(light);
  }

  update(dt: number, _t: number, params: WireMorphParams): void {
    const m = THREE.MathUtils.clamp(params.morph ?? 0, 0, 1);
    const scale = 0.8 + 0.6 * m;
    this.nodes.scale.setScalar(scale);
    this.edges.scale.setScalar(scale);
    if (params.autoRotate) {
      this.rotation += dt * 0.5;
      this.nodes.rotation.y = this.rotation;
      this.edges.rotation.y = this.rotation;
    }
  }

  resize(): void {}
  dispose(): void {
    this.nodes.geometry.dispose();
    (this.nodes.material as THREE.Material).dispose();
    this.edges.geometry.dispose();
    (this.edges.material as THREE.Material).dispose();
  }
}

export const WireMorph: EffectModule<WireMorphParams> = {
  meta: { id: '@pack/wire-morph', name: 'WireMorph', author: 'demomaker', version: '0.1.0' },
  defaultParams: {
    palette: 0,
    morph: 0,
    autoRotate: true,
    pulseSpeed: 15,
    pointSize: 0.02,
    starDensity: 0.7,
    interactive: true
  },
  init(ctx: EffectContext, params: WireMorphParams) {
    return new WireMorphInstance(ctx, params);
  }
};

export default WireMorph;

