import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { NamePlate } from './NamePlate';
import { ResourceBars } from './ResourceBars';
import { drawRPGPanel } from './RPGPanel';

/**
 * Combined HUD for a single fighter: RPG panel card + name + resource bars.
 * Player characters get a gold badge.
 */
export class FighterHUD extends Container {
  private namePlate: NamePlate;
  private resourceBars: ResourceBars;
  private cardBg: Graphics;

  constructor(name: string, isPlayer: boolean, maxHp: number, maxMp: number) {
    super();

    // RPG panel card background (lightweight: no shadow, no corner dots)
    const cardW = 180;
    const cardH = 52;
    this.cardBg = new Graphics();
    drawRPGPanel(this.cardBg, {
      width: cardW,
      height: cardH,
      radius: 4,
      fillColor: 0xF0EBE0,
      fillAlpha: 0.7,
      shadow: false,
      innerFrame: false,
      cornerDots: false,
    });
    this.cardBg.position.set(-cardW / 2, -4);
    this.addChild(this.cardBg);

    this.namePlate = new NamePlate(name, isPlayer);
    this.namePlate.position.set(0, 0);
    this.addChild(this.namePlate);

    // Player badge
    if (isPlayer) {
      const badge = new Text({
        text: '★ 你',
        style: new TextStyle({
          fontFamily: 'zpix, "PingFang SC", sans-serif',
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
    this.resourceBars.position.set(-55, 18);
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
