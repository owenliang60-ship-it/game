import { Container, Text, TextStyle } from 'pixi.js';
import { DamageNumber, type DamageType } from './DamageNumber';
import { HitFlash } from './HitFlash';
import { SlashEffect } from './SlashEffect';
import { ProjectileEffect } from './ProjectileEffect';
import { DefenseOverlay } from './DefenseOverlay';
import { ShieldWallGlow } from './ShieldWallGlow';
import { CounterShockWave } from './CounterShockWave';
import { ArrowRainEffect } from './ArrowRainEffect';
import { DeathEffect } from './DeathEffect';
import { ChargeEffect } from './ChargeEffect';
import { WhipAuraEffect } from './WhipAuraEffect';
import { TweenManager } from '../animation/TweenManager';
import { Easing } from '../animation/Easing';

/**
 * Factory + manager for all visual effects.
 * Effects are added to a Container layer, played, then removed.
 */
export class EffectsManager {
  private layer: Container;

  constructor(parentContainer: Container) {
    this.layer = new Container();
    parentContainer.addChild(this.layer);
  }

  // --- P0 Core Effects ---

  async showDamageNumber(x: number, y: number, value: string, type: DamageType = 'normal'): Promise<void> {
    const dmg = new DamageNumber(value, type);
    dmg.position.set(x, y - 40);
    this.layer.addChild(dmg);
    await dmg.play();
    this.layer.removeChild(dmg);
    dmg.destroy();
  }

  async showHitFlash(x: number, y: number): Promise<void> {
    const flash = new HitFlash();
    flash.position.set(x, y);
    this.layer.addChild(flash);
    await flash.play();
    this.layer.removeChild(flash);
    flash.destroy();
  }

  async showSlash(x: number, y: number, color = 0x5A4830): Promise<void> {
    const slash = new SlashEffect(color);
    slash.position.set(x, y - 30);
    this.layer.addChild(slash);
    await slash.play();
    this.layer.removeChild(slash);
    slash.destroy();
  }

  async showProjectile(fromX: number, fromY: number, toX: number, toY: number, color = 0xB8960C): Promise<void> {
    const proj = new ProjectileEffect(color);
    proj.position.set(fromX, fromY - 30);
    this.layer.addChild(proj);
    await proj.flyTo(toX, toY - 30);
    this.layer.removeChild(proj);
    proj.destroy();
  }

  showDefenseOverlay(x: number, y: number, color = 0x2060AA): DefenseOverlay {
    const overlay = new DefenseOverlay(color);
    overlay.position.set(x, y);
    this.layer.addChild(overlay);
    overlay.show();
    return overlay;
  }

  async removeDefenseOverlay(overlay: DefenseOverlay): Promise<void> {
    await overlay.hide();
    this.layer.removeChild(overlay);
    overlay.destroy();
  }

  // --- P1 Skill-specific Effects ---

  /** Shield Wall glow (装甲战士顶盾) */
  showShieldWallGlow(x: number, y: number): ShieldWallGlow {
    const glow = new ShieldWallGlow();
    glow.position.set(x, y);
    this.layer.addChild(glow);
    glow.show();
    return glow;
  }

  async removeShieldWallGlow(glow: ShieldWallGlow): Promise<void> {
    await glow.hide();
    this.layer.removeChild(glow);
    glow.destroy();
  }

  /** Counter Shock wave (反震) */
  async showCounterShock(x: number, y: number): Promise<void> {
    const wave = new CounterShockWave();
    wave.position.set(x, y);
    this.layer.addChild(wave);
    await wave.play();
    this.layer.removeChild(wave);
    wave.destroy();
  }

  /** Arrow Rain (漫天花雨) */
  async showArrowRain(): Promise<void> {
    const rain = new ArrowRainEffect();
    this.layer.addChild(rain);
    await rain.play();
    this.layer.removeChild(rain);
    rain.destroy();
  }

  /** Death particle effect */
  async showDeathEffect(x: number, y: number): Promise<void> {
    const death = new DeathEffect();
    death.position.set(x, y);
    this.layer.addChild(death);
    await death.play();
    this.layer.removeChild(death);
    death.destroy();
  }

  /** Charge afterimage (冲锋) */
  async showChargeTrail(fromX: number, fromY: number, toX: number, toY: number): Promise<void> {
    const charge = new ChargeEffect();
    this.layer.addChild(charge);
    await charge.play(fromX, fromY, toX, toY);
    this.layer.removeChild(charge);
    charge.destroy();
  }

  /** Whip aura (马鞭加速) */
  showWhipAura(x: number, y: number): WhipAuraEffect {
    const aura = new WhipAuraEffect();
    aura.position.set(x, y);
    this.layer.addChild(aura);
    aura.show();
    return aura;
  }

  /** Skill label floating above a character */
  showSkillLabel(x: number, y: number, skillName: string, isPlayer: boolean): void {
    const color = isPlayer ? 0xB08000 : 0x4A6FA5;
    const label = new Text({
      text: skillName,
      style: new TextStyle({
        fontFamily: 'zpix, "VT323", monospace',
        fontSize: 16,
        fill: color,
        fontWeight: 'bold',
      }),
    });
    label.anchor.set(0.5, 1);
    label.position.set(x, y - 50);
    this.layer.addChild(label);

    // Float upward
    TweenManager.add({
      target: label.position,
      props: { y: y - 70 },
      duration: 1200,
      easing: Easing.easeOutQuad,
    });

    // Fade out after a delay
    TweenManager.add({
      target: label,
      props: { alpha: 0 },
      duration: 400,
      delay: 800,
      easing: Easing.easeInQuad,
    }).then(() => {
      this.layer.removeChild(label);
      label.destroy();
    });
  }

  /** Clear all effects */
  clear(): void {
    this.layer.removeChildren();
  }
}
