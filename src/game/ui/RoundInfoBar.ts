import { Container, Text, TextStyle, Graphics } from 'pixi.js';
import { OrnamentDivider } from './OrnamentDivider';

/**
 * Top bar showing round number and alive fighter count.
 * Height: 36px, with ornament dividers flanking the round text.
 */
export class RoundInfoBar extends Container {
  private roundText: Text;
  private aliveText: Text;
  private bg: Graphics;

  constructor() {
    super();

    // Light background strip
    this.bg = new Graphics();
    this.bg.rect(0, 0, 960, 36);
    this.bg.fill({ color: 0xF0EBE0, alpha: 0.45 });
    // Bottom border with bevel
    this.bg.rect(4, 33, 952, 1);
    this.bg.fill({ color: 0xC8B898, alpha: 0.35 });
    this.bg.rect(4, 34, 952, 1);
    this.bg.fill({ color: 0xB8A888, alpha: 0.2 });
    this.addChild(this.bg);

    // Left ornament divider
    const leftDivider = new OrnamentDivider(150);
    leftDivider.position.set(240, 18);
    this.addChild(leftDivider);

    // Round number (center)
    const roundStyle = new TextStyle({
      fontFamily: 'zpix, "VT323", monospace',
      fontSize: 18,
      fill: 0x8B6914,
      fontWeight: 'bold',
    });
    this.roundText = new Text({ text: '第 1 回合', style: roundStyle });
    this.roundText.anchor.set(0.5, 0.5);
    this.roundText.position.set(480, 18);
    this.addChild(this.roundText);

    // Right ornament divider
    const rightDivider = new OrnamentDivider(150);
    rightDivider.position.set(570, 18);
    this.addChild(rightDivider);

    // Alive count (right side)
    const aliveStyle = new TextStyle({
      fontFamily: 'zpix, "VT323", monospace',
      fontSize: 14,
      fill: 0x606060,
    });
    this.aliveText = new Text({ text: '存活: 3', style: aliveStyle });
    this.aliveText.anchor.set(1, 0.5);
    this.aliveText.position.set(940, 18);
    this.addChild(this.aliveText);
  }

  setRound(round: number): void {
    this.roundText.text = `第 ${round} 回合`;
  }

  setAliveCount(count: number, total: number): void {
    this.aliveText.text = `存活: ${count}/${total}`;
  }
}
