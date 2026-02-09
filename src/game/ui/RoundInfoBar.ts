import { Container, Text, TextStyle, Graphics } from 'pixi.js';

/**
 * Top bar showing round number and alive fighter count.
 */
export class RoundInfoBar extends Container {
  private roundText: Text;
  private aliveText: Text;
  private bg: Graphics;

  constructor() {
    super();

    // Semi-transparent background strip
    this.bg = new Graphics();
    this.bg.rect(0, 0, 960, 32);
    this.bg.fill({ color: 0x000000, alpha: 0.4 });
    this.addChild(this.bg);

    // Round number (center)
    const roundStyle = new TextStyle({
      fontFamily: '"Microsoft YaHei", monospace',
      fontSize: 16,
      fill: 0xFFD700,
      fontWeight: 'bold',
    });
    this.roundText = new Text({ text: '第 1 回合', style: roundStyle });
    this.roundText.anchor.set(0.5, 0.5);
    this.roundText.position.set(480, 16);
    this.addChild(this.roundText);

    // Alive count (right side)
    const aliveStyle = new TextStyle({
      fontFamily: '"Microsoft YaHei", monospace',
      fontSize: 12,
      fill: 0xCCCCCC,
    });
    this.aliveText = new Text({ text: '存活: 3', style: aliveStyle });
    this.aliveText.anchor.set(1, 0.5);
    this.aliveText.position.set(940, 16);
    this.addChild(this.aliveText);
  }

  setRound(round: number): void {
    this.roundText.text = `第 ${round} 回合`;
  }

  setAliveCount(count: number, total: number): void {
    this.aliveText.text = `存活: ${count}/${total}`;
  }
}
