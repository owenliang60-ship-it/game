import { Container, Graphics } from 'pixi.js';
import { drawCornerOrnament } from './CornerOrnament';

/**
 * Full-screen decorative RPG frame border.
 * Outer frame (3px) + inner frame (1px) + four corner ornaments.
 */
export class FrameBorder extends Container {
  constructor(width = 960, height = 540) {
    super();

    const g = new Graphics();
    const outerColor = 0xB8A888;
    const innerColor = 0xC8B898;

    // Outer frame (3px border)
    g.rect(0, 0, width, 3);
    g.fill({ color: outerColor, alpha: 0.6 });
    g.rect(0, height - 3, width, 3);
    g.fill({ color: outerColor, alpha: 0.6 });
    g.rect(0, 0, 3, height);
    g.fill({ color: outerColor, alpha: 0.6 });
    g.rect(width - 3, 0, 3, height);
    g.fill({ color: outerColor, alpha: 0.6 });

    // Inner frame line (1px, inset 6px)
    const inset = 6;
    g.rect(inset, inset, width - inset * 2, 1);
    g.fill({ color: innerColor, alpha: 0.35 });
    g.rect(inset, height - inset - 1, width - inset * 2, 1);
    g.fill({ color: innerColor, alpha: 0.35 });
    g.rect(inset, inset, 1, height - inset * 2);
    g.fill({ color: innerColor, alpha: 0.35 });
    g.rect(width - inset - 1, inset, 1, height - inset * 2);
    g.fill({ color: innerColor, alpha: 0.35 });

    // Corner ornaments
    const arm = 24;
    drawCornerOrnament(g, 8, 8, arm);                          // Top-left
    drawCornerOrnament(g, width - 8, 8, arm, 0xC8A050, 0.5, true);       // Top-right
    drawCornerOrnament(g, 8, height - 8, arm, 0xC8A050, 0.5, false, true); // Bottom-left
    drawCornerOrnament(g, width - 8, height - 8, arm, 0xC8A050, 0.5, true, true); // Bottom-right

    this.addChild(g);
  }
}
