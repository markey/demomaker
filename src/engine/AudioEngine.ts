import type { AudioFacade } from './types';

export class AudioEngine implements AudioFacade {
  private _ctx: AudioContext | null = null;
  private _analyser: AnalyserNode | null = null;
  private _fftData: Float32Array | null = null;
  private _startTime = 0;
  private _offset = 0;
  private _source: AudioBufferSourceNode | null = null;
  private _gain: GainNode | null = null;

  async loadAndDecode(url: string) {
    if (!this._ctx) this._ctx = new AudioContext();
    const res = await fetch(url);
    const buf = await res.arrayBuffer();
    const decoded = await this._ctx.decodeAudioData(buf);
    return decoded;
  }

  attachBuffer(buffer: AudioBuffer, offset = 0, gain = 1) {
    if (!this._ctx) this._ctx = new AudioContext();
    this._offset = offset;
    this._gain = this._ctx.createGain();
    this._gain.gain.value = gain;
    this._analyser = this._ctx.createAnalyser();
    this._analyser.fftSize = 2048;
    this._fftData = new Float32Array(this._analyser.frequencyBinCount);
    this._source = this._ctx.createBufferSource();
    this._source.buffer = buffer;
    this._source.connect(this._gain).connect(this._analyser).connect(this._ctx.destination);
  }

  play() {
    if (!this._ctx || !this._source) return;
    if ((this._ctx.state as any) === 'suspended') this._ctx.resume();
    this._startTime = this._ctx.currentTime - this._offset;
    this._source.start(0, this._offset);
  }

  stop() {
    this._source?.stop();
  }

  now(): number {
    if (!this._ctx) return 0;
    return this._ctx.currentTime - this._startTime;
  }

  fft(): Float32Array | null {
    if (!this._analyser || !this._fftData) return null;
    this._analyser.getFloatFrequencyData(this._fftData);
    return this._fftData;
    // Note: mapping to bands/energy will be added later
  }

  energy(_band: string): number {
    // Placeholder: return 0
    return 0;
  }

  beat(_subdiv?: string): boolean {
    // Placeholder beat detector
    return false;
  }
}

