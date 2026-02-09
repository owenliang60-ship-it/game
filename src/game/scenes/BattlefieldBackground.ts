import { Container, Graphics } from 'pixi.js';

const GAME_WIDTH = 960;
const GAME_HEIGHT = 540;

/**
 * Multi-layered battlefield background with atmosphere.
 * Layers (bottom to top):
 * 1. Radial gradient base (#141020 center → #08060E edge)
 * 2. Ground plane (y=300-400)
 * 3. Vignette (darkened corners)
 * 4. Gold frame border
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

      // Interpolate between center (#141020) and edge (#08060E)
      const r = Math.round(0x14 + (0x08 - 0x14) * t);
      const g = Math.round(0x10 + (0x06 - 0x10) * t);
      const b = Math.round(0x20 + (0x0E - 0x20) * t);
      const color = (r << 16) | (g << 8) | b;

      bg.rect(cx - w / 2, cy - h / 2, w, h);
      bg.fill(color);
    }

    this.addChild(bg);
  }

  private buildGroundPlane(): void {
    const ground = new Graphics();

    // Subtle ground area (y=280 to y=440)
    // Dark gradient strip representing the battle floor
    const groundTop = 280;
    const groundBottom = 440;
    const strips = 6;

    for (let i = 0; i < strips; i++) {
      const t = i / strips;
      const y = groundTop + (groundBottom - groundTop) * t;
      const h = (groundBottom - groundTop) / strips;

      // Slightly lighter than background in the middle
      const alpha = 0.03 + 0.04 * Math.sin(t * Math.PI);
      ground.rect(0, y, GAME_WIDTH, h);
      ground.fill({ color: 0x3a2850, alpha });
    }

    // Horizontal line at ground level
    ground.rect(60, 290, GAME_WIDTH - 120, 1);
    ground.fill({ color: 0x4a3a6a, alpha: 0.3 });

    this.addChild(ground);
  }

  private buildVignette(): void {
    const vignette = new Graphics();

    // Four corner darkening overlays
    const cornerSize = 200;
    const corners = [
      { x: 0, y: 0 },                                    // top-left
      { x: GAME_WIDTH - cornerSize, y: 0 },               // top-right
      { x: 0, y: GAME_HEIGHT - cornerSize },               // bottom-left
      { x: GAME_WIDTH - cornerSize, y: GAME_HEIGHT - cornerSize }, // bottom-right
    ];

    for (const corner of corners) {
      vignette.rect(corner.x, corner.y, cornerSize, cornerSize);
      vignette.fill({ color: 0x000000, alpha: 0.25 });
    }

    // Top and bottom edge darkening
    vignette.rect(0, 0, GAME_WIDTH, 40);
    vignette.fill({ color: 0x000000, alpha: 0.3 });
    vignette.rect(0, GAME_HEIGHT - 40, GAME_WIDTH, 40);
    vignette.fill({ color: 0x000000, alpha: 0.3 });

    this.addChild(vignette);
  }

  private buildBorder(): void {
    const border = new Graphics();

    // Gold frame border
    border.rect(0, 0, GAME_WIDTH, 2);
    border.fill({ color: 0xC8A050, alpha: 0.6 });

    border.rect(0, GAME_HEIGHT - 2, GAME_WIDTH, 2);
    border.fill({ color: 0xC8A050, alpha: 0.6 });

    border.rect(0, 0, 2, GAME_HEIGHT);
    border.fill({ color: 0xC8A050, alpha: 0.6 });

    border.rect(GAME_WIDTH - 2, 0, 2, GAME_HEIGHT);
    border.fill({ color: 0xC8A050, alpha: 0.6 });

    // Inner corner accents
    const accentLen = 30;
    const accentColor = 0xD4B060;
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
