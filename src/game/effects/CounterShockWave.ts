import { Container, Graphics } from 'pixi.js';
import { TweenManager } from '../animation/TweenManager';
import { Easing } from '../animation/Easing';

/**
 * Purple ripple + rebound line for Counter Shock (反震).
 */
export class CounterShockWave extends Container {
  private ripple: Graphics;
  private progress = { value: 0 };

  constructor() {
    super();
    this.ripple = new Graphics();
    this.addChild(this.ripple);
  }

  async play(): Promise<void> {
    this.progress.value = 0;

    // Expanding ripple
    await TweenManager.add({
      target: this.progress,
      props: { value: 1 },
      duration: 400,
      easing: Easing.easeOutCubic,
      onUpdate: () => this.drawRipple(),
    });

    // Fade out
    await TweenManager.add({
      target: this,
      props: { alpha: 0 },
      duration: 200,
      easing: Easing.linear,
    });
  }

  private drawRipple(): void {
    const p = this.progress.value;
    this.ripple.clear();

    // Expanding circle
    const radius = 20 + 40 * p;
    const alpha = 0.8 * (1 - p);
    const lineWidth = 3 * (1 - p * 0.5);

    this.ripple.circle(0, -30, radius);
    this.ripple.stroke({ color: 0xAA44FF, width: lineWidth, alpha });

    // Inner flash
    if (p < 0.5) {
      const innerAlpha = 0.4 * (1 - p * 2);
      this.ripple.circle(0, -30, radius * 0.5);
      this.ripple.fill({ color: 0xCC66FF, alpha: innerAlpha });
    }
  }
}
