import { Container, Text, TextStyle } from 'pixi.js';
import { TweenManager } from '../animation/TweenManager';
import { Easing } from '../animation/Easing';

export type DamageType = 'normal' | 'true' | 'dodge' | 'heal' | 'crit';

const DAMAGE_COLORS: Record<DamageType, number> = {
  normal: 0xFF3333,
  true: 0xFF00FF,
  dodge: 0xFFAA00,
  heal: 0x33FF66,
  crit: 0xFF3333,
};

/**
 * Floating damage/dodge/heal number.
 * Rises 60px and fades out over 800ms, then self-destructs.
 */
export class DamageNumber extends Container {
  private text: Text;

  constructor(value: string, type: DamageType = 'normal') {
    super();

    const isCrit = type === 'crit';
    const fontSize = isCrit ? 28 : 22;
    const color = DAMAGE_COLORS[type];

    const style = new TextStyle({
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize,
      fill: color,
      fontWeight: 'bold',
      stroke: { color: 0x000000, width: 3 },
    });

    this.text = new Text({ text: value, style });
    this.text.anchor.set(0.5, 0.5);
    this.addChild(this.text);
  }

  /** Play the float-up + fade animation, returns when done */
  async play(): Promise<void> {
    const startY = this.position.y;

    // Scale up quickly then float
    this.scale.set(0.5);
    await TweenManager.add({
      target: this.scale,
      props: { x: 1, y: 1 },
      duration: 100,
      easing: Easing.easeOutBack,
    });

    // Float up and fade out
    await TweenManager.add({
      target: this.position,
      props: { y: startY - 60 },
      duration: 700,
      easing: Easing.easeOutCubic,
    });

    // Parallel fade out at the end
    await TweenManager.add({
      target: this,
      props: { alpha: 0 },
      duration: 200,
      easing: Easing.linear,
    });
  }
}
