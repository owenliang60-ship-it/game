import { Container, Graphics } from 'pixi.js';

export type DividerVariant = 'default' | 'ornate';

/**
 * Gold ornamental divider: left gradient line + diamond + right gradient line.
 * 'ornate' variant adds a double diamond + side dots.
 */
export class OrnamentDivider extends Container {
  constructor(totalWidth = 400, variant: DividerVariant = 'default') {
    super();

    const halfW = totalWidth / 2;
    const diamondSize = variant === 'ornate' ? 6 : 5;
    const lineY = 0;

    // Left gradient line (fades from transparent to gold)
    const leftLine = new Graphics();
    const segments = 10;
    const segW = (halfW - diamondSize - 4) / segments;
    for (let i = 0; i < segments; i++) {
      const alpha = (i / segments) * 0.7;
      leftLine.rect(i * segW, lineY, segW + 1, 1);
      leftLine.fill({ color: 0xB8960C, alpha });
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
    diamond.fill({ color: 0xB8960C, alpha: 0.8 });

    if (variant === 'ornate') {
      // Inner smaller diamond
      const s2 = diamondSize * 0.5;
      diamond.moveTo(cx, lineY - s2);
      diamond.lineTo(cx + s2, lineY);
      diamond.lineTo(cx, lineY + s2);
      diamond.lineTo(cx - s2, lineY);
      diamond.closePath();
      diamond.fill({ color: 0xD4A010, alpha: 0.6 });

      // Side dots (left and right of diamond)
      diamond.circle(cx - diamondSize - 5, lineY, 1.5);
      diamond.fill({ color: 0xB8960C, alpha: 0.5 });
      diamond.circle(cx + diamondSize + 5, lineY, 1.5);
      diamond.fill({ color: 0xB8960C, alpha: 0.5 });
    }

    this.addChild(diamond);

    // Right gradient line (fades from gold to transparent)
    const rightLine = new Graphics();
    const rightStart = halfW + diamondSize + 4;
    for (let i = 0; i < segments; i++) {
      const alpha = (1 - i / segments) * 0.7;
      rightLine.rect(rightStart + i * segW, lineY, segW + 1, 1);
      rightLine.fill({ color: 0xB8960C, alpha });
    }
    this.addChild(rightLine);
  }
}
