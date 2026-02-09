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
 * A single resource bar (HP, MP, or RAGE) with animated fill and label.
 */
export class ResourceBar extends Container {
  private bg: Graphics;
  private fill: Graphics;
  private valueText: Text;
  private barWidth: number;
  private barHeight: number;
  private barColor: number;
  private bgColor: number;
  private maxValue: number;
  private _currentRatio = 1;

  constructor(config: ResourceBarConfig) {
    super();
    this.barWidth = config.width;
    this.barHeight = config.height;
    this.barColor = config.color;
    this.bgColor = config.bgColor ?? 0x222222;
    this.maxValue = config.maxValue;

    // Background
    this.bg = new Graphics();
    this.bg.roundRect(0, 0, this.barWidth, this.barHeight, 2);
    this.bg.fill(this.bgColor);
    this.addChild(this.bg);

    // Fill
    this.fill = new Graphics();
    this.drawFill(1);
    this.addChild(this.fill);

    // Label + value
    const style = new TextStyle({
      fontFamily: '"Microsoft YaHei", monospace',
      fontSize: Math.max(8, this.barHeight - 1),
      fill: 0xffffff,
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
    this.valueText.text = `${label} ${Math.round(current)}/${max}`;
  }

  /** Get current ratio [0, 1] */
  get currentRatio(): number {
    return this._currentRatio;
  }

  private drawFill(ratio: number): void {
    this.fill.clear();
    if (ratio <= 0) return;
    const w = this.barWidth * ratio;

    // Color changes for HP when low
    let color = this.barColor;
    if (this.barColor === 0x22CC44) {
      // HP bar: yellow when 25-50%, red when <25%
      if (ratio <= 0.25) color = 0xCC3333;
      else if (ratio <= 0.5) color = 0xCCAA33;
    }

    this.fill.roundRect(0, 0, w, this.barHeight, 2);
    this.fill.fill(color);
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
    const h = 6;
    const gap = 2;

    this.hpBar = new ResourceBar({ width: barWidth, height: h, color: 0x22CC44, label: 'HP', maxValue: maxHp });
    this.hpBar.position.set(0, 0);
    this.addChild(this.hpBar);

    this.mpBar = new ResourceBar({ width: barWidth, height: h, color: 0x4488FF, label: 'MP', maxValue: maxMp });
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
}
