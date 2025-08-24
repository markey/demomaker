import * as THREE from 'three';
import type { EffectContext, TransitionInstance, TransitionModule } from '../../engine/types';

type CrossFadeParams = { curve?: 'linear' | 'easeIn' | 'easeOut' };

class CrossFade implements TransitionInstance {
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private quad: THREE.Mesh;
  private mat: THREE.ShaderMaterial;

  constructor(_ctx: EffectContext, _params: CrossFadeParams) {
    const geo = new THREE.PlaneGeometry(2, 2);
    this.mat = new THREE.ShaderMaterial({
      transparent: false,
      uniforms: {
        uFrom: { value: null },
        uTo: { value: null },
        uMix: { value: 0 }
      },
      vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position,1.0); }`,
      fragmentShader: `
        varying vec2 vUv; uniform sampler2D uFrom; uniform sampler2D uTo; uniform float uMix;
        void main(){
          vec4 a = texture2D(uFrom, vUv);
          vec4 b = texture2D(uTo, vUv);
          gl_FragColor = mix(a, b, uMix);
        }
      `
    });
    this.quad = new THREE.Mesh(geo, this.mat);
    this.scene.add(this.quad);
  }

  render(fromTex: THREE.Texture, toTex: THREE.Texture, progress: number): void {
    this.mat.uniforms.uFrom.value = fromTex;
    this.mat.uniforms.uTo.value = toTex;
    this.mat.uniforms.uMix.value = THREE.MathUtils.clamp(progress, 0, 1);
  }

  resize(): void {}
  dispose(): void { this.mat.dispose(); this.quad.geometry.dispose(); }
}

export const CrossFadeTransition: TransitionModule<CrossFadeParams> = {
  meta: { id: '@trans/cross-fade', name: 'Cross Fade', version: '0.1.0' },
  defaultParams: { curve: 'linear' },
  init(ctx: EffectContext, params: CrossFadeParams): TransitionInstance {
    return new CrossFade(ctx, params);
  }
};

export default CrossFadeTransition;

