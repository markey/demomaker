import * as THREE from 'three';
import type { EffectContext, EffectInstance, EffectModule } from '../../../engine/types';

type PulsarFieldParams = {
  palette: 0 | 1 | 2;
  morph: number;          // 0..1 sphere -> star
  pointSize: number;      // base point size
  autoRotate: boolean;
  pulseSpeed: number;     // world units per second
  particleCount: number;  // number of particles on surface
};

function pickPalette(p: number): THREE.Color[] {
  // Three simple demoscene-ish palettes
  if (p === 1) return [new THREE.Color(0xF59E0B), new THREE.Color(0xF97316), new THREE.Color(0xDC2626), new THREE.Color(0x7F1D1D)];
  if (p === 2) return [new THREE.Color(0x10B981), new THREE.Color(0xA3E635), new THREE.Color(0xFACC15), new THREE.Color(0xFB923C)];
  return [new THREE.Color(0x4F46E5), new THREE.Color(0x7C3AED), new THREE.Color(0xC026D3), new THREE.Color(0xDB2777)];
}

// Minimal hash-based pseudo-noise for shader
const NOISE_GLSL = `
float hash(float n){ return fract(sin(n)*43758.5453123); }
float noise(vec3 x){
  vec3 p=floor(x), f=fract(x); f=f*f*(3.0-2.0*f);
  float n=p.x+p.y*57.0+113.0*p.z;
  return mix(mix(mix(hash(n+  0.0),hash(n+  1.0),f.x),
                 mix(hash(n+ 57.0),hash(n+ 58.0),f.x),f.y),
             mix(mix(hash(n+113.0),hash(n+114.0),f.x),
                 mix(hash(n+170.0),hash(n+171.0),f.x),f.y),f.z);
}
`;

class PulsarFieldInstance implements EffectInstance {
  scene = new THREE.Scene();
  camera: THREE.PerspectiveCamera;

  private points!: THREE.Points;
  private starfield!: THREE.Points;
  private mat!: THREE.ShaderMaterial;
  private uniforms: any;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private radius = 1.2;
  private rotation = 0;

  private pulsesPos = [new THREE.Vector3(1e3,1e3,1e3), new THREE.Vector3(1e3,1e3,1e3), new THREE.Vector3(1e3,1e3,1e3)];
  private pulsesTime = [-1e3, -1e3, -1e3];
  private lastPulseIndex = 0;

  constructor(private ctx: EffectContext, params: PulsarFieldParams) {
    this.camera = new THREE.PerspectiveCamera(60, 16/9, 0.1, 100);
    this.camera.position.set(0, 0, 4.5);

    // Starfield background
    const starGeo = new THREE.BufferGeometry();
    const starCount = 3000;
    const starPos = new Float32Array(starCount * 3);
    for (let i=0;i<starCount;i++) {
      const i3 = i*3;
      starPos[i3+0] = THREE.MathUtils.randFloatSpread(40);
      starPos[i3+1] = THREE.MathUtils.randFloatSpread(40);
      starPos[i3+2] = THREE.MathUtils.randFloatSpread(40);
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos,3));
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.02, sizeAttenuation: true, transparent: true, opacity: 0.7, depthWrite: false });
    this.starfield = new THREE.Points(starGeo, starMat);
    this.scene.add(this.starfield);

    // Particle surface: sphere with morph target to spiky star
    const count = Math.max(2000, Math.min(20000, Math.floor(params.particleCount)));
    const { geo, morph } = this.buildSurface(count);

    const palette = pickPalette(params.palette);
    const colors = new Float32Array(count * 3);
    for (let i=0;i<count;i++){
      const c = palette[i % palette.length];
      colors[i*3+0] = c.r; colors[i*3+1] = c.g; colors[i*3+2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors,3));
    geo.morphAttributes.position = [morph];

    this.uniforms = {
      uTime: { value: 0 },
      uPointSize: { value: params.pointSize },
      uPulseSpeed: { value: params.pulseSpeed },
      uPulsePositions: { value: this.pulsesPos },
      uPulseTimes: { value: this.pulsesTime },
    };

    const vertex = `
      uniform float uTime; uniform float uPointSize; uniform float uPulseSpeed;\n
      uniform vec3 uPulsePositions[3]; uniform float uPulseTimes[3];\n
      attribute vec3 color; varying vec3 vColor; varying float vPulse;\n
      ${NOISE_GLSL}\n
      #include <morphtarget_pars_vertex>\n
      float pulse(vec3 wp){\n
        float total=0.0;\n
        for(int i=0;i<3;i++){\n
          if(uPulseTimes[i] < 0.0) continue;\n
          float dt=uTime - uPulseTimes[i]; if(dt<0.0 || dt>3.5) continue;\n
          float r=dt*uPulseSpeed; float d=distance(wp,uPulsePositions[i]);\n
          float th=0.15; float prox=abs(d - r);\n
          float ring=smoothstep(th, 0.0, prox) * smoothstep(3.5, 0.0, dt);\n
          total += ring;\n
        }\n
        return clamp(total, 0.0, 1.0);\n
      }\n
      void main(){\n
        vColor = color;\n
        vec3 transformed = position;\n
        // apply morph target influence from mesh.morphTargetInfluences[0]
        #include <morphtarget_vertex>\n
        // subtle wobble
        float wob = noise(transformed * 2.0 + vec3(uTime*0.4));\n
        vec3 displaced = transformed * (1.0 + wob*0.05);\n
        vec4 wp4 = modelMatrix * vec4(displaced, 1.0);\n
        vec3 wp = wp4.xyz;\n
        vPulse = pulse(wp) + 0.4 * noise(wp*1.5 + vec3(uTime*1.2));\n
        vec4 mv = modelViewMatrix * vec4(displaced, 1.0);\n
        float size = (uPointSize * 200.0 / -mv.z) * (1.0 + vPulse*1.6);\n
        gl_PointSize = size;\n
        gl_Position = projectionMatrix * mv;\n
      }
    `;

    const fragment = `
      varying vec3 vColor; varying float vPulse;\n
      void main(){\n
        vec2 uv = gl_PointCoord - 0.5;\n
        float d = length(uv); if(d>0.5) discard;\n
        float fall = smoothstep(0.5, 0.0, d);\n
        vec3 col = mix(vColor, vec3(1.0), clamp(vPulse,0.0,1.0));\n
        float alpha = fall * (0.6 + vPulse*0.6);\n
        gl_FragColor = vec4(col, alpha);\n
      }
    `;

    this.mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: vertex,
      fragmentShader: fragment,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      morphTargets: true
    });

    this.points = new THREE.Points(geo, this.mat);
    this.points.morphTargetInfluences = [params.morph];
    this.scene.add(this.points);

    // Input for pulses
    const el = this.ctx.renderer.domElement;
    const onClick = (e: MouseEvent) => this.triggerPulse(e.clientX, e.clientY);
    const onTouch = (e: TouchEvent) => { if(e.touches.length>0) this.triggerPulse(e.touches[0].clientX, e.touches[0].clientY); };
    el.addEventListener('click', onClick);
    el.addEventListener('touchstart', onTouch, { passive: true });
    // Store off for disposal
    (this as any)._off = () => { el.removeEventListener('click', onClick); el.removeEventListener('touchstart', onTouch); };
  }

  private buildSurface(count: number) {
    // Fibonacci sphere distribution
    const pos = new Float32Array(count * 3);
    const morph = new Float32Array(count * 3);
    const g = (Math.sqrt(5) + 1) / 2; // golden ratio
    for (let i = 0; i < count; i++) {
      const t = i / count;
      const y = 1.0 - 2.0 * t;
      const r = Math.sqrt(1.0 - y * y);
      const phi = 2.0 * Math.PI * i / g;
      const x = Math.cos(phi) * r;
      const z = Math.sin(phi) * r;
      const i3 = i * 3;
      const base = new THREE.Vector3(x, y, z).multiplyScalar(this.radius);
      pos[i3+0] = base.x; pos[i3+1] = base.y; pos[i3+2] = base.z;
      // star morph: spiky radius modulation by angular frequency
      const sph = new THREE.Spherical().setFromVector3(base);
      const spike = 0.35 * Math.sin(sph.theta * 8.0) * Math.sin(sph.phi * 8.0);
      sph.radius *= 1.0 + spike;
      const s = new THREE.Vector3().setFromSpherical(sph);
      morph[i3+0] = s.x; morph[i3+1] = s.y; morph[i3+2] = s.z;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos,3));
    const morphAttr = new THREE.BufferAttribute(morph,3);
    return { geo, morph: morphAttr };
  }

  private triggerPulse(clientX: number, clientY: number) {
    const el = this.ctx.renderer.domElement;
    const rect = el.getBoundingClientRect();
    this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -(((clientY - rect.top) / rect.height) * 2 - 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const sphere = new THREE.Sphere(new THREE.Vector3(0,0,0), this.radius);
    const pt = new THREE.Vector3();
    if (this.raycaster.ray.intersectSphere(sphere, pt)) {
      this.lastPulseIndex = (this.lastPulseIndex + 1) % 3;
      this.pulsesPos[this.lastPulseIndex].copy(pt);
      this.pulsesTime[this.lastPulseIndex] = this.ctx.time();
    }
  }

  update(dt: number, t: number, params: PulsarFieldParams): void {
    this.uniforms.uTime.value = t;
    this.uniforms.uPointSize.value = params.pointSize;
    this.uniforms.uPulseSpeed.value = params.pulseSpeed;
    // drive built-in morph influence
    if (this.points.morphTargetInfluences) this.points.morphTargetInfluences[0] = THREE.MathUtils.clamp(params.morph, 0, 1);

    // Slow camera/mesh motion
    if (params.autoRotate) {
      this.rotation += dt * 0.3;
      this.points.rotation.y = this.rotation;
    }
    this.starfield.rotation.y += 0.0006;

    // Update colors if palette changed
    const palette = pickPalette(params.palette);
    const colAttr = this.points.geometry.getAttribute('color') as THREE.BufferAttribute;
    // Lightweight cycling tint
    const tint = 0.5 + 0.5 * Math.sin(t*0.3);
    for (let i=0;i<colAttr.count;i++){
      const c = palette[i % palette.length];
      colAttr.setXYZ(i, THREE.MathUtils.lerp(c.r, 1, tint*0.1), THREE.MathUtils.lerp(c.g, 1, tint*0.1), THREE.MathUtils.lerp(c.b, 1, tint*0.1));
    }
    colAttr.needsUpdate = true;
  }

  resize(): void {}
  dispose(): void {
    (this as any)._off?.();
    this.points.geometry.dispose();
    (this.points.material as THREE.Material).dispose();
    this.starfield.geometry.dispose();
    (this.starfield.material as THREE.Material).dispose();
  }
}

export const PulsarField: EffectModule<PulsarFieldParams> = {
  meta: { id: '@pack/pulsar-field', name: 'PulsarField', author: 'demomaker', version: '0.1.0' },
  defaultParams: {
    palette: 0,
    morph: 0.15,
    pointSize: 0.02,
    autoRotate: true,
    pulseSpeed: 3.5,
    particleCount: 8000,
  },
  init(ctx: EffectContext, params: PulsarFieldParams) {
    return new PulsarFieldInstance(ctx, params);
  }
};

export default PulsarField;
