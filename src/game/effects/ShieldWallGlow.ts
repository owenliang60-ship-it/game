import { Container, Graphics } from 'pixi.js';
import { TweenManager } from '../animation/TweenManager';
import { Easing } from '../animation/Easing';

/**
 * Blue glow sphere for Shield Wall (装甲战士顶盾).
 * Pulses while active.
 */
export class ShieldWallGlow extends Container {
  private glow: Graphics;
  private _active = false;

  constructor() {
    super();
    this.glow = new Graphics();
    this.drawGlow();
    this.glow.alpha = 0;
    this.addChild(this.glow);
  }

  async show(): Promise<void> {
    this._active = true;
    await TweenManager.add({
      target: this.glow,
      props: { alpha: 0.8 },
      duration: 300,
      easing: Easing.easeOutQuad,
    });
    this.pulse();
  }

  async hide(): Promise<void> {
    this._active = false;
    await TweenManager.add({
      target: this.glow,
      props: { alpha: 0 },
      duration: 300,
      easing: Easing.easeInQuad,
    });
  }

  private async pulse(): Promise<void> {
    while (this._active) {
      await TweenManager.add({
        target: this.glow,
        props: { alpha: 0.5 },
        duration: 800,
        easing: Easing.easeInOutQuad,
      });
      if (!this._active) break;
      await TweenManager.add({
        target: this.glow,
        props: { alpha: 0.8 },
        duration: 800,
        easing: Easing.easeInOutQuad,
      });
    }
  }

  private drawGlow(): void {
    this.glow.clear();
    // Blue sphere
    this.glow.circle(0, -40, 35);
    this.glow.fill({ color: 0x4488FF, alpha: 0.3 });
    this.glow.circle(0, -40, 25);
    this.glow.fill({ color: 0x66AAFF, alpha: 0.2 });
    this.glow.circle(0, -40, 15);
    this.glow.fill({ color: 0x88CCFF, alpha: 0.15 });
  }
}
