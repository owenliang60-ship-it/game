import { Container, Graphics } from 'pixi.js';
import { TweenManager } from '../animation/TweenManager';
import { Easing } from '../animation/Easing';

/**
 * Charge afterimage effect (冲锋残影).
 * Creates fading ghost images along the charge path.
 */
export class ChargeEffect extends Container {
  private ghosts: Graphics;

  constructor() {
    super();
    this.ghosts = new Graphics();
    this.addChild(this.ghosts);
  }

  /** Play charge trail from source to target direction */
  async play(fromX: number, fromY: number, toX: number, toY: number): Promise<void> {
    const dx = toX - fromX;
    const dy = toY - fromY;
    const steps = 4;

    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const x = fromX + dx * t * 0.3;
      const y = fromY + dy * t * 0.3;
      const alpha = 0.4 * (1 - t);

      // Simple rectangle ghost
      this.ghosts.roundRect(x - 15, y - 60, 30, 50, 4);
      this.ghosts.fill({ color: 0x6B5A30, alpha });
    }

    // Fade out the trail
    await TweenManager.add({
      target: this.ghosts,
      props: { alpha: 0 },
      duration: 300,
      easing: Easing.easeOutQuad,
    });
  }
}
