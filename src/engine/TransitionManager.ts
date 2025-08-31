import type { Track, TransitionTrack } from '../state/projectStore';

export interface ActiveTransition {
  transition: TransitionTrack;
  fromEffect: Track | null;
  toEffect: Track | null;
  progress: number; // 0 to 1
  time: number; // current time within transition
}

export class TransitionManager {
  private cachedTransitions: Map<string, ActiveTransition> = new Map();

  /**
   * Detects and calculates transitions between overlapping effects at a given time
   */
  getActiveTransitions(time: number, effects: Track[], transitions: TransitionTrack[]): ActiveTransition[] {
    const activeTransitions: ActiveTransition[] = [];

    // Find all overlapping effect pairs that need transitions
    const overlappingEffects = this.findOverlappingEffects(effects);

    for (const overlap of overlappingEffects) {
      // Check if there's already a transition defined for this overlap
      const existingTransition = transitions.find(t =>
        (t.fromTrackId === overlap.from.id && t.toTrackId === overlap.to.id) ||
        (t.fromTrackId === overlap.to.id && t.toTrackId === overlap.from.id)
      );

      if (existingTransition) {
        // Calculate progress within the transition
        const transitionProgress = this.calculateTransitionProgress(time, existingTransition, overlap);
        if (transitionProgress !== null) {
          activeTransitions.push({
            transition: existingTransition,
            fromEffect: overlap.from,
            toEffect: overlap.to,
            progress: transitionProgress.progress,
            time: transitionProgress.time
          });
        }
      } else {
        // Auto-create a transition for overlapping effects
        const autoTransition = this.createAutoTransition(time, overlap);
        if (autoTransition) {
          activeTransitions.push(autoTransition);
        }
      }
    }

    // Handle explicit transitions that may not have overlapping effects
    for (const transition of transitions) {
      if (!activeTransitions.find(at => at.transition.id === transition.id)) {
        const fromEffect = effects.find(e => e.id === transition.fromTrackId) || null;
        const toEffect = effects.find(e => e.id === transition.toTrackId) || null;

        if (fromEffect || toEffect) {
          const transitionProgress = this.calculateTransitionProgress(time, transition, {
            from: fromEffect || toEffect!,
            to: toEffect || fromEffect!,
            overlapStart: Math.max(fromEffect?.range[0] || 0, toEffect?.range[0] || 0),
            overlapEnd: Math.min(fromEffect?.range[1] || Infinity, toEffect?.range[1] || Infinity)
          });

          if (transitionProgress !== null) {
            activeTransitions.push({
              transition,
              fromEffect,
              toEffect,
              progress: transitionProgress.progress,
              time: transitionProgress.time
            });
          }
        }
      }
    }

    return activeTransitions;
  }

  /**
   * Find overlapping effect pairs that should transition
   */
  private findOverlappingEffects(effects: Track[]): Array<{
    from: Track;
    to: Track;
    overlapStart: number;
    overlapEnd: number;
  }> {
    const overlaps: Array<{
      from: Track;
      to: Track;
      overlapStart: number;
      overlapEnd: number;
    }> = [];

    for (let i = 0; i < effects.length; i++) {
      for (let j = i + 1; j < effects.length; j++) {
        const effect1 = effects[i];
        const effect2 = effects[j];

        const overlapStart = Math.max(effect1.range[0], effect2.range[0]);
        const overlapEnd = Math.min(effect1.range[1], effect2.range[1]);

        if (overlapStart < overlapEnd) {
          // There is an overlap
          overlaps.push({
            from: effect1,
            to: effect2,
            overlapStart,
            overlapEnd
          });
        }
      }
    }

    return overlaps;
  }

  /**
   * Calculate transition progress within an overlap
   */
  private calculateTransitionProgress(
    currentTime: number,
    transition: TransitionTrack,
    overlap: { overlapStart: number; overlapEnd: number }
  ): { progress: number; time: number } | null {
    const transitionStart = Math.max(transition.range[0], overlap.overlapStart);
    const transitionEnd = Math.min(transition.range[1], overlap.overlapEnd);

    if (currentTime < transitionStart || currentTime > transitionEnd) {
      return null;
    }

    const transitionDuration = transitionEnd - transitionStart;
    const elapsedTime = currentTime - transitionStart;
    const progress = Math.max(0, Math.min(1, elapsedTime / transitionDuration));

    return { progress, time: elapsedTime };
  }

  /**
   * Create an automatic transition for overlapping effects
   */
  private createAutoTransition(
    time: number,
    overlap: { from: Track; to: Track; overlapStart: number; overlapEnd: number }
  ): ActiveTransition | null {
    const overlapDuration = overlap.overlapEnd - overlap.overlapStart;

    if (overlapDuration <= 0 || time < overlap.overlapStart || time > overlap.overlapEnd) {
      return null;
    }

    // Use a default cross-fade transition for auto-transitions
    const autoTransition: TransitionTrack = {
      id: `auto_${overlap.from.id}_${overlap.to.id}`,
      kind: 'transition',
      module: '@trans/cross-fade',
      range: [overlap.overlapStart, overlap.overlapEnd],
      params: { curve: 'linear' },
      fromTrackId: overlap.from.id,
      toTrackId: overlap.to.id,
      duration: overlapDuration
    };

    const elapsedTime = time - overlap.overlapStart;
    const progress = elapsedTime / overlapDuration;

    return {
      transition: autoTransition,
      fromEffect: overlap.from,
      toEffect: overlap.to,
      progress: Math.max(0, Math.min(1, progress)),
      time: elapsedTime
    };
  }

  /**
   * Clear cached transitions (useful when project changes)
   */
  clearCache(): void {
    this.cachedTransitions.clear();
  }
}
