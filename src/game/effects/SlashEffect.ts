import { Container, Graphics } from 'pixi.js';
import { TweenManager } from '../animation/TweenManager';
import { Easing } from '../animation/Easing';

/**
 * Melee slash arc effect drawn with Graphics.
 * A curved line that sweeps and fades.
 */
export class SlashEffect extends Container {
  private arc: Graphics;
  private progress = { value: 0 };
  private slashColor: number;

  constructor(color = 0x5A4830) {
    super();
    this.slashColor = color;
    this.arc = new Graphics();
    this.addChild(this.arc);
  }

  /** Play slash arc animation */
  async play(): Promise<void> {
    this.progress.value = 0;

    await TweenManager.add({
      target: this.progress,
      props: { value: 1 },
      duration: 200,
      easing: Easing.easeOutQuad,
      onUpdate: () => this.drawArc(),
    });

    // Fade out
    await TweenManager.add({
      target: this,
      props: { alpha: 0 },
      duration: 150,
      easing: Easing.linear,
    });
  }

  private drawArc(): void {
    const p = this.progress.value;
    this.arc.clear();

    // Draw a sweeping arc
    const radius = 40;
    const startAngle = -Math.PI * 0.8;
    const endAngle = startAngle + Math.PI * 1.2 * p;
    const steps = Math.max(3, Math.floor(20 * p));

    for (let i = 0; i < steps - 1; i++) {
      const t1 = i / (steps - 1);
      const t2 = (i + 1) / (steps - 1);
      const a1 = startAngle + (endAngle - startAngle) * t1;
      const a2 = startAngle + (endAngle - startAngle) * t2;

      const x1 = Math.cos(a1) * radius;
      const y1 = Math.sin(a1) * radius;
      const x2 = Math.cos(a2) * radius;
      const y2 = Math.sin(a2) * radius;

      // Width tapers toward the end
      const width = 4 * (1 - t1 * 0.5);
      const lineAlpha = 1 - t1 * 0.3;

      this.arc.moveTo(x1, y1);
      this.arc.lineTo(x2, y2);
      this.arc.stroke({ color: this.slashColor, width, alpha: lineAlpha });
    }
  }
}
