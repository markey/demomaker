import type { Project } from '../state/projectStore';
import { encodeWavPCM16 } from '../utils/wav';

export type ExportOptions = { fps?: number; frames?: number; onFrame?: (i: number, blob: Blob) => void };

export class ExportPipeline {
  constructor(private canvas: HTMLCanvasElement, private project: Project) {}

  async exportPNGSequence(opts: ExportOptions = {}) {
    const fps = opts.fps ?? this.project.meta.fps;
    const frames = opts.frames ?? Math.floor(this.project.meta.duration * fps);
    for (let i = 0; i < frames; i++) {
      const blob: Blob = await new Promise((resolve) => this.canvas.toBlob((b) => resolve(b!), 'image/png'));
      opts.onFrame?.(i, blob);
    }
  }

  async exportSilentWAV(durationSec: number, sampleRate = 48000, channels = 2): Promise<Blob> {
    const frames = Math.floor(durationSec * sampleRate);
    const buffers: Float32Array[] = [];
    for (let ch = 0; ch < channels; ch++) buffers.push(new Float32Array(frames));
    return encodeWavPCM16(buffers, sampleRate);
  }
}
