import { Container, Graphics } from 'pixi.js';
import { TweenManager } from '../animation/TweenManager';
import { Easing } from '../animation/Easing';

/**
 * Arrow rain effect for 漫天花雨 (archer ultimate).
 * Sky darkens + arrows fall from above.
 */
export class ArrowRainEffect extends Container {
  private darkOverlay: Graphics;
  private arrows: Graphics;

  constructor(screenWidth = 960, screenHeight = 540) {
    super();

    // Sky darkening overlay
    this.darkOverlay = new Graphics();
    this.darkOverlay.rect(0, 0, screenWidth, screenHeight);
    this.darkOverlay.fill({ color: 0x8090A0, alpha: 0.3 });
    this.darkOverlay.alpha = 0;
    this.addChild(this.darkOverlay);

    // Arrow particles container
    this.arrows = new Graphics();
    this.addChild(this.arrows);
  }

  async play(): Promise<void> {
    // Darken sky
    await TweenManager.add({
      target: this.darkOverlay,
      props: { alpha: 1 },
      duration: 300,
      easing: Easing.easeOutQuad,
    });

    // Arrow rain animation (multiple waves)
    for (let wave = 0; wave < 3; wave++) {
      this.drawArrowWave(wave);
      await new Promise(resolve => setTimeout(resolve, 150));
    }

    // Fade everything
    await TweenManager.add({
      target: this,
      props: { alpha: 0 },
      duration: 400,
      easing: Easing.easeInQuad,
    });
  }

  private drawArrowWave(wave: number): void {
    const count = 8 + wave * 4;
    for (let i = 0; i < count; i++) {
      const x = 100 + Math.random() * 760;
      const y = 100 + Math.random() * 300 + wave * 30;

      // Small arrow pointing down
      this.arrows.moveTo(x, y - 8);
      this.arrows.lineTo(x, y + 8);
      this.arrows.stroke({ color: 0xB8960C, width: 1.5, alpha: 0.8 - wave * 0.2 });

      // Arrow head
      this.arrows.moveTo(x - 3, y + 4);
      this.arrows.lineTo(x, y + 8);
      this.arrows.lineTo(x + 3, y + 4);
      this.arrows.stroke({ color: 0xB8960C, width: 1, alpha: 0.6 });
    }
  }
}
