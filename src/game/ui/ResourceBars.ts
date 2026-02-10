import { Container, Graphics, Text, TextStyle } from 'pixi.js';

export interface ResourceBarConfig {
  width: number;
  height: number;
  color: number;
  bgColor?: number;
  label: string;
  maxValue: number;
}

/**
 * A single resource bar (HP, MP, or RAGE) with gradient fill, border, and highlight.
 * HP bar blinks when < 25%.
 */
export class ResourceBar extends Container {
  private bg: Graphics;
  private fillGfx: Graphics;
  private highlight: Graphics;
  private valueText: Text;
  private barWidth: number;
  private barHeight: number;
  private barColor: number;
  private bgColor: number;
  private maxValue: number;
  private _currentRatio = 1;
  private blinkTimer = 0;
  private isBlinking = false;

  constructor(config: ResourceBarConfig) {
    super();
    this.barWidth = config.width;
    this.barHeight = config.height;
    this.barColor = config.color;
    this.bgColor = config.bgColor ?? 0xD0CCC4;
    this.maxValue = config.maxValue;

    // Background track with border
    this.bg = new Graphics();
    this.bg.roundRect(0, 0, this.barWidth, this.barHeight, 2);
    this.bg.fill(this.bgColor);
    this.bg.stroke({ color: 0xB8B0A0, width: 1, alpha: 0.5 });
    this.addChild(this.bg);

    // Fill (gradient simulated with two layers)
    this.fillGfx = new Graphics();
    this.drawFill(1);
    this.addChild(this.fillGfx);

    // Top highlight (semi-transparent white strip)
    this.highlight = new Graphics();
    this.drawHighlight(1);
    this.addChild(this.highlight);

    // Label + value (VT323 for numeric display)
    const style = new TextStyle({
      fontFamily: '"VT323", zpix, monospace',
      fontSize: Math.max(10, this.barHeight + 4),
      fill: 0x3A3530,
    });
    this.valueText = new Text({ text: `${config.label} ${config.maxValue}/${config.maxValue}`, style });
    this.valueText.anchor.set(0, 0.5);
    this.valueText.position.set(this.barWidth + 4, this.barHeight / 2);
    this.addChild(this.valueText);
  }

  /** Update the bar to show current/max values */
  setValue(current: number, max: number, label: string): void {
    this.maxValue = max;
    this._currentRatio = Math.max(0, Math.min(1, current / max));
    this.drawFill(this._currentRatio);
    this.drawHighlight(this._currentRatio);
    this.valueText.text = `${label} ${Math.round(current)}/${max}`;

    // Enable blink for HP bar when low
    this.isBlinking = (this.barColor === 0x22CC44 && this._currentRatio <= 0.25 && this._currentRatio > 0);
  }

  get currentRatio(): number {
    return this._currentRatio;
  }

  /** Call each frame for blink animation */
  updateBlink(deltaMs: number): void {
    if (!this.isBlinking) {
      this.fillGfx.alpha = 1;
      return;
    }
    this.blinkTimer += deltaMs;
    // Pulse alpha between 0.4 and 1.0 at ~3Hz
    this.fillGfx.alpha = 0.7 + 0.3 * Math.sin(this.blinkTimer * 0.006 * Math.PI * 2);
  }

  private drawFill(ratio: number): void {
    this.fillGfx.clear();
    if (ratio <= 0) return;
    const w = this.barWidth * ratio;

    // Color changes for HP when low
    let color = this.barColor;
    if (this.barColor === 0x22CC44) {
      if (ratio <= 0.25) color = 0xCC3333;
      else if (ratio <= 0.5) color = 0xCCAA33;
    }

    // Bottom layer (darker shade)
    const darkerColor = this.darken(color, 0.6);
    this.fillGfx.roundRect(0, 0, w, this.barHeight, 2);
    this.fillGfx.fill(darkerColor);

    // Top layer (brighter, upper half)
    this.fillGfx.roundRect(0, 0, w, Math.ceil(this.barHeight * 0.55), 2);
    this.fillGfx.fill(color);
  }

  private drawHighlight(ratio: number): void {
    this.highlight.clear();
    if (ratio <= 0) return;
    const w = this.barWidth * ratio;
    const h = Math.max(1, Math.floor(this.barHeight * 0.35));
    this.highlight.roundRect(1, 1, w - 2, h, 1);
    this.highlight.fill({ color: 0xffffff, alpha: 0.3 });
  }

  private darken(color: number, factor: number): number {
    const r = Math.floor(((color >> 16) & 0xff) * factor);
    const g = Math.floor(((color >> 8) & 0xff) * factor);
    const b = Math.floor((color & 0xff) * factor);
    return (r << 16) | (g << 8) | b;
  }
}

/**
 * Combined HP + MP + RAGE bars for a single fighter.
 */
export class ResourceBars extends Container {
  private hpBar: ResourceBar;
  private mpBar: ResourceBar;
  private rageBar: ResourceBar;

  constructor(maxHp: number, maxMp: number, barWidth = 60) {
    super();
    const h = 7;
    const gap = 3;

    this.hpBar = new ResourceBar({ width: barWidth, height: h, color: 0x22CC44, label: 'HP', maxValue: maxHp });
    this.hpBar.position.set(0, 0);
    this.addChild(this.hpBar);

    this.mpBar = new ResourceBar({ width: barWidth, height: h, color: 0x2266CC, label: 'MP', maxValue: maxMp });
    this.mpBar.position.set(0, h + gap);
    this.addChild(this.mpBar);

    this.rageBar = new ResourceBar({ width: barWidth, height: h, color: 0xFF6600, label: 'RAGE', maxValue: 100 });
    this.rageBar.position.set(0, (h + gap) * 2);
    this.addChild(this.rageBar);
  }

  update(hp: number, maxHp: number, mp: number, maxMp: number, rage: number): void {
    this.hpBar.setValue(hp, maxHp, 'HP');
    this.mpBar.setValue(mp, maxMp, 'MP');
    this.rageBar.setValue(rage, 100, 'RAGE');
  }

  /** Call each frame for HP blink animation */
  updateBlink(deltaMs: number): void {
    this.hpBar.updateBlink(deltaMs);
  }
}
