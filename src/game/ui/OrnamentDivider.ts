import { Container, Graphics } from 'pixi.js';

/**
 * Gold ornamental divider: left gradient line + diamond + right gradient line.
 * Matches the HTML prototype's `.ornate-divider` style.
 */
export class OrnamentDivider extends Container {
  constructor(totalWidth = 400) {
    super();

    const halfW = totalWidth / 2;
    const diamondSize = 5;
    const lineY = 0;

    // Left gradient line (fades from transparent to gold)
    const leftLine = new Graphics();
    const segments = 10;
    const segW = (halfW - diamondSize - 4) / segments;
    for (let i = 0; i < segments; i++) {
      const alpha = (i / segments) * 0.7;
      leftLine.rect(i * segW, lineY, segW + 1, 1);
      leftLine.fill({ color: 0xc8a050, alpha });
    }
    this.addChild(leftLine);

    // Center diamond
    const diamond = new Graphics();
    const cx = halfW;
    diamond.moveTo(cx, lineY - diamondSize);
    diamond.lineTo(cx + diamondSize, lineY);
    diamond.lineTo(cx, lineY + diamondSize);
    diamond.lineTo(cx - diamondSize, lineY);
    diamond.closePath();
    diamond.fill({ color: 0xc8a050, alpha: 0.8 });
    this.addChild(diamond);

    // Right gradient line (fades from gold to transparent)
    const rightLine = new Graphics();
    const rightStart = halfW + diamondSize + 4;
    for (let i = 0; i < segments; i++) {
      const alpha = (1 - i / segments) * 0.7;
      rightLine.rect(rightStart + i * segW, lineY, segW + 1, 1);
      rightLine.fill({ color: 0xc8a050, alpha });
    }
    this.addChild(rightLine);
  }
}
