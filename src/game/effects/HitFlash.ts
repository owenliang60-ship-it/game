import { Container, Graphics } from 'pixi.js';
import { TweenManager } from '../animation/TweenManager';
import { Easing } from '../animation/Easing';

/**
 * Hit flash: brief white overlay + screen shake on the target area.
 */
export class HitFlash extends Container {
  private flash: Graphics;

  constructor(width = 60, height = 80) {
    super();

    this.flash = new Graphics();
    this.flash.rect(-width / 2, -height, width, height);
    this.flash.fill({ color: 0xFFA040, alpha: 0.5 });
    this.flash.alpha = 0;
    this.addChild(this.flash);
  }

  /** Play flash effect, returns when done */
  async play(): Promise<void> {
    // Flash in
    await TweenManager.add({
      target: this.flash,
      props: { alpha: 0.8 },
      duration: 50,
      easing: Easing.linear,
    });

    // Flash out
    await TweenManager.add({
      target: this.flash,
      props: { alpha: 0 },
      duration: 150,
      easing: Easing.easeOutQuad,
    });
  }
}
