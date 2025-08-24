export class Scheduler {
  private _last = 0;
  private _fps: number;
  constructor(fps: number) { this._fps = fps; }
  tick(now: number) {
    const dt = this._last === 0 ? 0 : Math.max(0, Math.min(now - this._last, 1));
    this._last = now;
    return dt;
  }
  fixedIndex(t: number) {
    return Math.floor(t * this._fps);
  }
}

