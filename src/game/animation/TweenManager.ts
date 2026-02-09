import { Tween, type TweenConfig } from './Tween';
import type { Ticker } from 'pixi.js';

/**
 * Central manager for all active tweens.
 * Call `init(ticker)` once at startup to hook into the PixiJS update loop.
 */
export class TweenManager {
  private static tweens: Tween[] = [];
  private static initialized = false;

  /** Hook into a PixiJS ticker for automatic updates */
  static init(ticker: Ticker): void {
    if (TweenManager.initialized) return;
    TweenManager.initialized = true;
    ticker.add((tick) => {
      TweenManager.update(tick.deltaMS);
    });
  }

  /**
   * Create and start a tween. Returns a Promise that resolves when complete.
   */
  static add(config: TweenConfig): Promise<void> {
    const tween = new Tween(config);
    TweenManager.tweens.push(tween);

    return new Promise<void>((resolve) => {
      tween.setResolve(resolve);
    });
  }

  /** Update all active tweens */
  static update(deltaMs: number): void {
    for (let i = TweenManager.tweens.length - 1; i >= 0; i--) {
      const done = TweenManager.tweens[i].update(deltaMs);
      if (done) {
        TweenManager.tweens.splice(i, 1);
      }
    }
  }

  /** Kill all active tweens */
  static killAll(complete = false): void {
    for (const tween of TweenManager.tweens) {
      tween.kill(complete);
    }
    TweenManager.tweens = [];
  }

  /** Number of active tweens */
  static get count(): number {
    return TweenManager.tweens.length;
  }
}
