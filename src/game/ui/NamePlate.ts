import { Container, Text, TextStyle } from 'pixi.js';

/**
 * Character name display. Deep gold for player, grey for AI.
 */
export class NamePlate extends Container {
  private nameText: Text;

  constructor(name: string, isPlayer: boolean) {
    super();

    const style = new TextStyle({
      fontFamily: '"Microsoft YaHei", "PingFang SC", monospace',
      fontSize: 13,
      fill: isPlayer ? 0xB08000 : 0x606060,
      fontWeight: isPlayer ? 'bold' : 'normal',
    });

    this.nameText = new Text({ text: name, style });
    this.nameText.anchor.set(0.5, 0);
    this.addChild(this.nameText);
  }

  setDead(): void {
    this.nameText.style.fill = 0xB0B0B0;
    this.nameText.alpha = 0.6;
  }
}
