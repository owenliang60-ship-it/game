import { Container, Graphics } from 'pixi.js';
import { TweenManager } from '../animation/TweenManager';
import { Easing } from '../animation/Easing';

/**
 * Golden speed aura at feet for 马鞭 (whip speed boost).
 */
export class WhipAuraEffect extends Container {
  private aura: Graphics;

  constructor() {
    super();
    this.aura = new Graphics();
    this.drawAura();
    this.aura.alpha = 0;
    this.addChild(this.aura);
  }

  async show(): Promise<void> {
    await TweenManager.add({
      target: this.aura,
      props: { alpha: 1 },
      duration: 300,
      easing: Easing.easeOutQuad,
    });
  }

  async hide(): Promise<void> {
    await TweenManager.add({
      target: this.aura,
      props: { alpha: 0 },
      duration: 300,
      easing: Easing.easeInQuad,
    });
  }

  private drawAura(): void {
    this.aura.clear();
    // Golden speed lines at feet
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const r1 = 15;
      const r2 = 25;
      const x1 = Math.cos(angle) * r1;
      const y1 = Math.sin(angle) * r1 * 0.4; // Flatten for perspective
      const x2 = Math.cos(angle) * r2;
      const y2 = Math.sin(angle) * r2 * 0.4;

      this.aura.moveTo(x1, y1);
      this.aura.lineTo(x2, y2);
      this.aura.stroke({ color: 0xFFD700, width: 2, alpha: 0.6 });
    }

    // Central glow
    this.aura.ellipse(0, 0, 20, 8);
    this.aura.fill({ color: 0xFFD700, alpha: 0.15 });
  }
}
