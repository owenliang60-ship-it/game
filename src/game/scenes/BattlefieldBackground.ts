import { Container, Graphics } from 'pixi.js';
import { drawCornerOrnament } from '../ui/CornerOrnament';

const GAME_WIDTH = 960;
const GAME_HEIGHT = 540;

/**
 * Multi-layered battlefield background with light atmosphere.
 * Layers (bottom to top):
 * 1. Soft sky gradient (light blue center → edges)
 * 2. Ground plane with subtle grid lines
 * 3. Warm frame border with extended corner ornaments
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
    const groundTop = 280;
    const groundBottom = 440;
    const strips = 6;

    for (let i = 0; i < strips; i++) {
      const t = i / strips;
      const y = groundTop + (groundBottom - groundTop) * t;
      const h = (groundBottom - groundTop) / strips;

      const alpha = 0.03 + 0.04 * Math.sin(t * Math.PI);
      ground.rect(0, y, GAME_WIDTH, h);
      ground.fill({ color: 0xC0B898, alpha });
    }

    // Horizontal line at ground level
    ground.rect(60, 290, GAME_WIDTH - 120, 1);
    ground.fill({ color: 0xB8A888, alpha: 0.3 });

    // Subtle grid lines on ground area (80px spacing)
    const gridSpacing = 80;
    for (let x = gridSpacing; x < GAME_WIDTH; x += gridSpacing) {
      ground.rect(x, groundTop, 1, groundBottom - groundTop);
      ground.fill({ color: 0xB8A888, alpha: 0.06 });
    }
    for (let y = groundTop; y < groundBottom; y += gridSpacing) {
      ground.rect(0, y, GAME_WIDTH, 1);
      ground.fill({ color: 0xB8A888, alpha: 0.06 });
    }

    this.addChild(ground);
  }

  private buildVignette(): void {
    // Vignette removed for bright theme — method kept for interface compatibility
  }

  private buildBorder(): void {
    const border = new Graphics();

    // Warm frame border (3px)
    border.rect(0, 0, GAME_WIDTH, 3);
    border.fill({ color: 0xB8A888, alpha: 0.6 });

    border.rect(0, GAME_HEIGHT - 3, GAME_WIDTH, 3);
    border.fill({ color: 0xB8A888, alpha: 0.6 });

    border.rect(0, 0, 3, GAME_HEIGHT);
    border.fill({ color: 0xB8A888, alpha: 0.6 });

    border.rect(GAME_WIDTH - 3, 0, 3, GAME_HEIGHT);
    border.fill({ color: 0xB8A888, alpha: 0.6 });

    // Inner corner accents (extended to 50px + diagonal decorations)
    const accentLen = 50;
    const accentColor = 0xC8B898;

    // Corner ornaments using L-shaped ornaments
    drawCornerOrnament(border, 5, 5, accentLen, accentColor, 0.4);
    drawCornerOrnament(border, GAME_WIDTH - 5, 5, accentLen, accentColor, 0.4, true);
    drawCornerOrnament(border, 5, GAME_HEIGHT - 5, accentLen, accentColor, 0.4, false, true);
    drawCornerOrnament(border, GAME_WIDTH - 5, GAME_HEIGHT - 5, accentLen, accentColor, 0.4, true, true);

    // Small diagonal accent at each corner (3px line at 45deg)
    const diag = 8;
    // Top-left
    for (let d = 0; d < diag; d++) {
      border.rect(5 + accentLen + 2 + d, 5 + d, 1, 1);
      border.fill({ color: accentColor, alpha: 0.25 });
    }
    // Top-right
    for (let d = 0; d < diag; d++) {
      border.rect(GAME_WIDTH - 5 - accentLen - 2 - d, 5 + d, 1, 1);
      border.fill({ color: accentColor, alpha: 0.25 });
    }
    // Bottom-left
    for (let d = 0; d < diag; d++) {
      border.rect(5 + accentLen + 2 + d, GAME_HEIGHT - 5 - d, 1, 1);
      border.fill({ color: accentColor, alpha: 0.25 });
    }
    // Bottom-right
    for (let d = 0; d < diag; d++) {
      border.rect(GAME_WIDTH - 5 - accentLen - 2 - d, GAME_HEIGHT - 5 - d, 1, 1);
      border.fill({ color: accentColor, alpha: 0.25 });
    }

    this.addChild(border);
  }
}
