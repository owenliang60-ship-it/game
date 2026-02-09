import { Container, Graphics } from 'pixi.js';
import { TweenManager } from '../animation/TweenManager';
import { Easing } from '../animation/Easing';

/**
 * Arrow/projectile flying from source to target.
 * Small triangle shape + optional trail.
 */
export class ProjectileEffect extends Container {
  private arrow: Graphics;
  private trail: Graphics;
  private arrowColor: number;

  constructor(color = 0xFFD700) {
    super();
    this.arrowColor = color;

    this.trail = new Graphics();
    this.addChild(this.trail);

    this.arrow = new Graphics();
    this.drawArrow();
    this.addChild(this.arrow);
  }

  /** Fly from current position to target (tx, ty) in scene coords */
  async flyTo(tx: number, ty: number): Promise<void> {
    const startX = this.position.x;
    const startY = this.position.y;

    // Rotate arrow to face target
    const angle = Math.atan2(ty - startY, tx - startX);
    this.arrow.rotation = angle;

    await TweenManager.add({
      target: this.position,
      props: { x: tx, y: ty },
      duration: 300,
      easing: Easing.linear,
      onUpdate: () => this.updateTrail(startX, startY),
    });

    // Quick fade on impact
    await TweenManager.add({
      target: this,
      props: { alpha: 0 },
      duration: 100,
      easing: Easing.linear,
    });
  }

  private drawArrow(): void {
    this.arrow.clear();
    // Simple triangle arrow head
    this.arrow.moveTo(8, 0);
    this.arrow.lineTo(-4, -4);
    this.arrow.lineTo(-2, 0);
    this.arrow.lineTo(-4, 4);
    this.arrow.closePath();
    this.arrow.fill(this.arrowColor);
  }

  private updateTrail(startX: number, startY: number): void {
    this.trail.clear();
    // Draw a fading line from start to current position
    const dx = this.position.x - startX;
    const dy = this.position.y - startY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 5) return;

    // Trail in local coordinates (from current pos back toward start)
    const angle = Math.atan2(-dy, -dx);
    const trailLen = Math.min(dist, 30);

    this.trail.moveTo(0, 0);
    this.trail.lineTo(
      Math.cos(angle) * trailLen,
      Math.sin(angle) * trailLen,
    );
    this.trail.stroke({ color: this.arrowColor, width: 2, alpha: 0.5 });
  }
}
