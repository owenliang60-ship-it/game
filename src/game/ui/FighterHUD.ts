import { Container } from 'pixi.js';
import { NamePlate } from './NamePlate';
import { ResourceBars } from './ResourceBars';

/**
 * Combined HUD for a single fighter: name + resource bars.
 * Positioned relative to the character sprite.
 */
export class FighterHUD extends Container {
  private namePlate: NamePlate;
  private resourceBars: ResourceBars;

  constructor(name: string, isPlayer: boolean, maxHp: number, maxMp: number) {
    super();

    this.namePlate = new NamePlate(name, isPlayer);
    this.namePlate.position.set(0, 0);
    this.addChild(this.namePlate);

    this.resourceBars = new ResourceBars(maxHp, maxMp, 60);
    // Center the bars below the name (bars are left-aligned, so offset by -30)
    this.resourceBars.position.set(-30, 18);
    this.addChild(this.resourceBars);
  }

  updateResources(hp: number, maxHp: number, mp: number, maxMp: number, rage: number): void {
    this.resourceBars.update(hp, maxHp, mp, maxMp, rage);
  }

  setDead(): void {
    this.namePlate.setDead();
    this.alpha = 0.5;
  }
}
