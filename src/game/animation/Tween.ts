import { Easing, type EasingFn } from './Easing';

export interface TweenConfig {
  /** Target object whose properties will be animated */
  target: Record<string, any>;
  /** Properties to animate: { x: 100, alpha: 0 } */
  props: Record<string, number>;
  /** Duration in milliseconds */
  duration: number;
  /** Easing function (defaults to easeOutQuad) */
  easing?: EasingFn;
  /** Delay before starting (ms) */
  delay?: number;
  /** Called each update tick */
  onUpdate?: () => void;
}

/**
 * A single tween that interpolates numeric properties on a target object.
 * Managed by TweenManager; not meant to be created directly.
 */
export class Tween {
  private target: Record<string, any>;
  private startValues: Record<string, number> = {};
  private endValues: Record<string, number>;
  private duration: number;
  private easing: EasingFn;
  private delay: number;
  private onUpdate?: () => void;

  private elapsed = 0;
  private delayRemaining: number;
  private _finished = false;
  private _resolve?: () => void;

  constructor(config: TweenConfig) {
    this.target = config.target;
    this.endValues = config.props;
    this.duration = config.duration;
    this.easing = config.easing ?? Easing.easeOutQuad;
    this.delay = config.delay ?? 0;
    this.delayRemaining = this.delay;
    this.onUpdate = config.onUpdate;

    // Capture start values
    for (const key of Object.keys(this.endValues)) {
      this.startValues[key] = this.target[key] as number;
    }
  }

  get finished(): boolean {
    return this._finished;
  }

  /** Set the promise resolver (called by TweenManager) */
  setResolve(resolve: () => void): void {
    this._resolve = resolve;
  }

  /** Advance tween by deltaMs. Returns true when complete. */
  update(deltaMs: number): boolean {
    if (this._finished) return true;

    // Handle delay
    if (this.delayRemaining > 0) {
      this.delayRemaining -= deltaMs;
      if (this.delayRemaining > 0) return false;
      // Overflow into elapsed
      deltaMs = -this.delayRemaining;
      this.delayRemaining = 0;
    }

    this.elapsed += deltaMs;
    const progress = Math.min(this.elapsed / this.duration, 1);
    const easedProgress = this.easing(progress);

    // Interpolate properties
    for (const key of Object.keys(this.endValues)) {
      const start = this.startValues[key];
      const end = this.endValues[key];
      this.target[key] = start + (end - start) * easedProgress;
    }

    this.onUpdate?.();

    if (progress >= 1) {
      this._finished = true;
      this._resolve?.();
      return true;
    }

    return false;
  }

  /** Kill the tween immediately, optionally jumping to end values */
  kill(complete = false): void {
    if (this._finished) return;
    if (complete) {
      for (const key of Object.keys(this.endValues)) {
        this.target[key] = this.endValues[key];
      }
    }
    this._finished = true;
    this._resolve?.();
  }
}
