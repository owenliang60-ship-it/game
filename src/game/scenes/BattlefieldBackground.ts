import { Container, Graphics } from 'pixi.js';

const GAME_WIDTH = 960;
const GAME_HEIGHT = 540;

/**
 * Multi-layered battlefield background with light atmosphere.
 * Layers (bottom to top):
 * 1. Soft sky gradient (light blue center → edges)
 * 2. Ground plane (warm sand, y=280-440)
 * 3. (vignette removed for bright theme)
 * 4. Warm frame border
 */
export class BattlefieldBackground extends Container {
  constructor() {
    super();
    this.buildBackground();
    this.buildGroundPlane();
    this.buildVignette();
    this.buildBorder();
  }

  private buildBackground(): void {
    const bg = new Graphics();

    // Approximate radial gradient with concentric rectangles
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const steps = 8;

    for (let i = steps; i >= 0; i--) {
      const t = i / steps;
      const w = GAME_WIDTH * (0.5 + 0.5 * t);
      const h = GAME_HEIGHT * (0.5 + 0.5 * t);

      // Interpolate between center (#C5DCE8) and edge (#A8C8D8)
      const r = Math.round(0xC5 + (0xA8 - 0xC5) * t);
      const g = Math.round(0xDC + (0xC8 - 0xDC) * t);
      const b = Math.round(0xE8 + (0xD8 - 0xE8) * t);
      const color = (r << 16) | (g << 8) | b;

      bg.rect(cx - w / 2, cy - h / 2, w, h);
      bg.fill(color);
    }

    this.addChild(bg);
  }

  private buildGroundPlane(): void {
    const ground = new Graphics();

    // Subtle ground area (y=280 to y=440)
    // Warm sand strip representing the battle floor
    const groundTop = 280;
    const groundBottom = 440;
    const strips = 6;

    for (let i = 0; i < strips; i++) {
      const t = i / strips;
      const y = groundTop + (groundBottom - groundTop) * t;
      const h = (groundBottom - groundTop) / strips;

      // Slightly visible warm sand tones
      const alpha = 0.03 + 0.04 * Math.sin(t * Math.PI);
      ground.rect(0, y, GAME_WIDTH, h);
      ground.fill({ color: 0xC0B898, alpha });
    }

    // Horizontal line at ground level
    ground.rect(60, 290, GAME_WIDTH - 120, 1);
    ground.fill({ color: 0xB8A888, alpha: 0.3 });

    this.addChild(ground);
  }

  private buildVignette(): void {
    // Vignette removed for bright theme — method kept for interface compatibility
  }

  private buildBorder(): void {
    const border = new Graphics();

    // Warm frame border
    border.rect(0, 0, GAME_WIDTH, 2);
    border.fill({ color: 0xB8A888, alpha: 0.6 });

    border.rect(0, GAME_HEIGHT - 2, GAME_WIDTH, 2);
    border.fill({ color: 0xB8A888, alpha: 0.6 });

    border.rect(0, 0, 2, GAME_HEIGHT);
    border.fill({ color: 0xB8A888, alpha: 0.6 });

    border.rect(GAME_WIDTH - 2, 0, 2, GAME_HEIGHT);
    border.fill({ color: 0xB8A888, alpha: 0.6 });

    // Inner corner accents
    const accentLen = 30;
    const accentColor = 0xC8B898;
    const accentAlpha = 0.4;

    // Top-left
    border.rect(4, 4, accentLen, 1);
    border.fill({ color: accentColor, alpha: accentAlpha });
    border.rect(4, 4, 1, accentLen);
    border.fill({ color: accentColor, alpha: accentAlpha });

    // Top-right
    border.rect(GAME_WIDTH - 4 - accentLen, 4, accentLen, 1);
    border.fill({ color: accentColor, alpha: accentAlpha });
    border.rect(GAME_WIDTH - 5, 4, 1, accentLen);
    border.fill({ color: accentColor, alpha: accentAlpha });

    // Bottom-left
    border.rect(4, GAME_HEIGHT - 5, accentLen, 1);
    border.fill({ color: accentColor, alpha: accentAlpha });
    border.rect(4, GAME_HEIGHT - 4 - accentLen, 1, accentLen);
    border.fill({ color: accentColor, alpha: accentAlpha });

    // Bottom-right
    border.rect(GAME_WIDTH - 4 - accentLen, GAME_HEIGHT - 5, accentLen, 1);
    border.fill({ color: accentColor, alpha: accentAlpha });
    border.rect(GAME_WIDTH - 5, GAME_HEIGHT - 4 - accentLen, 1, accentLen);
    border.fill({ color: accentColor, alpha: accentAlpha });

    this.addChild(border);
  }
}
