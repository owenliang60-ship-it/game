import { Container, Text, TextStyle } from 'pixi.js';

/**
 * Character name display. Gold for player, grey for AI.
 */
export class NamePlate extends Container {
  private nameText: Text;

  constructor(name: string, isPlayer: boolean) {
    super();

    const style = new TextStyle({
      fontFamily: '"Microsoft YaHei", "PingFang SC", monospace',
      fontSize: 13,
      fill: isPlayer ? 0xFFD700 : 0xAAAAAA,
      fontWeight: isPlayer ? 'bold' : 'normal',
    });

    this.nameText = new Text({ text: name, style });
    this.nameText.anchor.set(0.5, 0);
    this.addChild(this.nameText);
  }

  setDead(): void {
    this.nameText.style.fill = 0x666666;
    this.nameText.alpha = 0.6;
  }
}
