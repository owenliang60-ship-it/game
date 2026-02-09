import { Container, Graphics } from 'pixi.js';
import { TweenManager } from '../animation/TweenManager';
import { Easing } from '../animation/Easing';

/**
 * Death effect: character fades out + particle burst.
 */
export class DeathEffect extends Container {
  private particles: Graphics;

  constructor() {
    super();
    this.particles = new Graphics();
    this.addChild(this.particles);
  }

  async play(): Promise<void> {
    // Generate particles
    const count = 12;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const dist = 10 + Math.random() * 20;
      const x = Math.cos(angle) * dist;
      const y = -30 + Math.sin(angle) * dist;
      const size = 2 + Math.random() * 3;

      this.particles.rect(x - size / 2, y - size / 2, size, size);
      this.particles.fill({ color: 0xFF4444, alpha: 0.8 });
    }

    // Expand and fade
    const progress = { value: 0 };
    await TweenManager.add({
      target: progress,
      props: { value: 1 },
      duration: 500,
      easing: Easing.easeOutCubic,
      onUpdate: () => {
        this.particles.scale.set(1 + progress.value * 1.5);
        this.particles.alpha = 1 - progress.value;
      },
    });
  }
}
