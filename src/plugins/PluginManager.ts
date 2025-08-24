import type { EffectModule, TransitionModule } from '../engine/types';
import { WireMorph } from './effects/WireMorph';
import { ParticleGrid } from './effects/ParticleGrid';
import { VoronoiFlow } from './effects/VoronoiFlow';
import { CrossFadeTransition } from './transitions/CrossFade';

// Simple in-bundle registry for MVP; later replace with dynamic import and manifests
const effectRegistry: Record<string, EffectModule> = {
  [WireMorph.meta.id]: WireMorph,
  [ParticleGrid.meta.id]: ParticleGrid,
  [VoronoiFlow.meta.id]: VoronoiFlow
};

const transitionRegistry: Record<string, TransitionModule> = {
  [CrossFadeTransition.meta.id]: CrossFadeTransition
};

export function getEffect(id: string): EffectModule | undefined {
  return effectRegistry[id];
}

export function getTransition(id: string): TransitionModule | undefined {
  return transitionRegistry[id];
}

export function listEffects(): EffectModule[] {
  return Object.values(effectRegistry);
}
