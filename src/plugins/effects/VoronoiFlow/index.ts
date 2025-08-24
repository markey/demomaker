import * as THREE from 'three';
import type { EffectContext, EffectInstance, EffectModule } from '../../../engine/types';

type VoronoiFlowParams = {
  speed: number;    // animation speed
  scale: number;    // UV scale
  contrast: number; // sharpen edges
  palette: 0 | 1 | 2;
};

function palette(p: number, t: number): THREE.Color {
  // simple two-color gradients
  const c0 = new THREE.Color(p === 1 ? 0x222222 : p === 2 ? 0x0a2a1a : 0x0a102a);
  const c1 = new THREE.Color(p === 1 ? 0xf5a524 : p === 2 ? 0x22c55e : 0x60a5fa);
  return c0.clone().lerp(c1, t);
}

const fs = `
precision highp float;
uniform float uTime; uniform float uScale; uniform float uContrast; uniform vec3 uColA; uniform vec3 uColB;
varying vec2 vUv;

// hash and noise helpers
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
vec2 hash2(vec2 p){ return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453); }

void main(){
  vec2 uv = vUv * uScale;
  vec2 i = floor(uv);
  vec2 f = fract(uv);
  float minDist = 1.0;
  float secDist = 1.0;
  vec2 cell = vec2(0.0);
  for(int y=-1;y<=1;y++){
    for(int x=-1;x<=1;x++){
      vec2 g = vec2(float(x), float(y));
      vec2 o = hash2(i + g);
      o = 0.5 + 0.5 * sin(uTime*0.6 + 6.2831*o);
      vec2 r = g + o - f;
      float d = dot(r, r);
      if(d < minDist){ secDist = minDist; minDist = d; cell = g + o; }
      else if(d < secDist){ secDist = d; }
    }
  }
  float edge = clamp((sqrt(secDist) - sqrt(minDist)) * uContrast, 0.0, 1.0);
  vec3 col = mix(uColA, uColB, edge);
  gl_FragColor = vec4(col, 1.0);
}
`;

class VoronoiFlowInstance implements EffectInstance {
  scene = new THREE.Scene();
  camera: THREE.OrthographicCamera;
  private mesh: THREE.Mesh;
  private mat: THREE.ShaderMaterial;

  constructor(_ctx: EffectContext, params: VoronoiFlowParams) {
    const geo = new THREE.PlaneGeometry(2, 2);
    this.mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uScale: { value: params.scale },
        uContrast: { value: params.contrast },
        uColA: { value: palette(params.palette, 0.0).toArray() },
        uColB: { value: palette(params.palette, 1.0).toArray() }
      },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position,1.0); }',
      fragmentShader: fs
    });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.scene.add(this.mesh);

    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }

  update(_dt: number, t: number, params: VoronoiFlowParams): void {
    this.mat.uniforms.uTime.value = t * params.speed;
    this.mat.uniforms.uScale.value = params.scale;
    this.mat.uniforms.uContrast.value = params.contrast;
    const a = palette(params.palette, 0.0);
    const b = palette(params.palette, 1.0);
    this.mat.uniforms.uColA.value = a.toArray();
    this.mat.uniforms.uColB.value = b.toArray();
  }

  resize(): void {}
  dispose(): void { this.mesh.geometry.dispose(); this.mat.dispose(); }
}

export const VoronoiFlow: EffectModule<VoronoiFlowParams> = {
  meta: { id: '@pack/voronoi-flow', name: 'VoronoiFlow', author: 'demomaker', version: '0.1.0' },
  defaultParams: { speed: 1.0, scale: 3.0, contrast: 4.0, palette: 0 },
  init(ctx: EffectContext, params: VoronoiFlowParams) {
    return new VoronoiFlowInstance(ctx, params);
  }
};

export default VoronoiFlow;

