import { Container, Graphics } from 'pixi.js';
import { TweenManager } from '../animation/TweenManager';
import { Easing } from '../animation/Easing';

/**
 * Semi-transparent shield overlay when a character defends.
 * Shows a rounded shield shape that pulses.
 */
export class DefenseOverlay extends Container {
  private shield: Graphics;

  constructor(color = 0x2060AA) {
    super();

    this.shield = new Graphics();
    // Shield shape: rounded rectangle
    this.shield.roundRect(-25, -70, 50, 60, 10);
    this.shield.fill({ color, alpha: 0.25 });
    this.shield.stroke({ color, width: 2, alpha: 0.6 });
    this.shield.alpha = 0;
    this.addChild(this.shield);
  }

  /** Show shield (fade in) */
  async show(): Promise<void> {
    await TweenManager.add({
      target: this.shield,
      props: { alpha: 1 },
      duration: 200,
      easing: Easing.easeOutQuad,
    });
  }

  /** Hide shield (fade out) */
  async hide(): Promise<void> {
    await TweenManager.add({
      target: this.shield,
      props: { alpha: 0 },
      duration: 300,
      easing: Easing.easeInQuad,
    });
  }
}
