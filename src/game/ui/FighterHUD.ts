import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { NamePlate } from './NamePlate';
import { ResourceBars } from './ResourceBars';

/**
 * Combined HUD for a single fighter: light card background + name + resource bars.
 * Player characters get a gold badge.
 */
export class FighterHUD extends Container {
  private namePlate: NamePlate;
  private resourceBars: ResourceBars;
  private cardBg: Graphics;

  constructor(name: string, isPlayer: boolean, maxHp: number, maxMp: number) {
    super();

    // Light semi-transparent card background
    const cardW = 130;
    const cardH = 52;
    this.cardBg = new Graphics();
    this.cardBg.roundRect(-cardW / 2, -4, cardW, cardH, 4);
    this.cardBg.fill({ color: 0xF0EBE0, alpha: 0.65 });
    this.cardBg.stroke({ color: 0xB0A080, width: 1, alpha: 0.5 });
    this.addChild(this.cardBg);

    this.namePlate = new NamePlate(name, isPlayer);
    this.namePlate.position.set(0, 0);
    this.addChild(this.namePlate);

    // Player badge
    if (isPlayer) {
      const badge = new Text({
        text: '★ 你',
        style: new TextStyle({
          fontFamily: '"PingFang SC", sans-serif',
          fontSize: 9,
          fill: 0xD4A010,
          fontWeight: 'bold',
        }),
      });
      badge.anchor.set(0.5, 0);
      badge.position.set(0, -12);
      this.addChild(badge);
    }

    this.resourceBars = new ResourceBars(maxHp, maxMp, 60);
    this.resourceBars.position.set(-30, 18);
    this.addChild(this.resourceBars);
  }

  updateResources(hp: number, maxHp: number, mp: number, maxMp: number, rage: number): void {
    this.resourceBars.update(hp, maxHp, mp, maxMp, rage);
  }

  /** Call each frame for HP blink animation */
  updateBlink(deltaMs: number): void {
    this.resourceBars.updateBlink(deltaMs);
  }

  setDead(): void {
    this.namePlate.setDead();
    this.alpha = 0.5;
  }
}
