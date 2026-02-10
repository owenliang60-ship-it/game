import { Container, Text, TextStyle, Graphics } from 'pixi.js';

/**
 * Top bar showing round number and alive fighter count.
 * Height: 36px, VT323 fonts, warm border decoration.
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
    // Warm border at bottom
    this.bg.rect(4, 34, 952, 1);
    this.bg.fill({ color: 0xC8B898, alpha: 0.35 });
    this.addChild(this.bg);

    // Round number (center)
    const roundStyle = new TextStyle({
      fontFamily: '"VT323", "Microsoft YaHei", monospace',
      fontSize: 18,
      fill: 0x8B6914,
      fontWeight: 'bold',
    });
    this.roundText = new Text({ text: '第 1 回合', style: roundStyle });
    this.roundText.anchor.set(0.5, 0.5);
    this.roundText.position.set(480, 18);
    this.addChild(this.roundText);

    // Alive count (right side)
    const aliveStyle = new TextStyle({
      fontFamily: '"VT323", "Microsoft YaHei", monospace',
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
