import { Container, Graphics, Text, TextStyle } from 'pixi.js';

export interface ButtonConfig {
  text: string;
  width: number;
  height: number;
  fontSize?: number;
  fill?: number;
  textColor?: number;
  borderColor?: number;
  disabledFill?: number;
  disabledTextColor?: number;
}

/**
 * Reusable PixiJS button with hover/press/disabled states.
 */
export class Button extends Container {
  private bg: Graphics;
  private labelText: Text;
  private config: Required<ButtonConfig>;
  private _enabled = true;

  constructor(config: ButtonConfig) {
    super();

    this.config = {
      text: config.text,
      width: config.width,
      height: config.height,
      fontSize: config.fontSize ?? 13,
      fill: config.fill ?? 0x2a1a3e,
      textColor: config.textColor ?? 0xf5e6c8,
      borderColor: config.borderColor ?? 0xc8a050,
      disabledFill: config.disabledFill ?? 0x1a1a2a,
      disabledTextColor: config.disabledTextColor ?? 0x555555,
    };

    // Background
    this.bg = new Graphics();
    this.drawBg(this.config.fill, this.config.borderColor);
    this.addChild(this.bg);

    // Label
    const style = new TextStyle({
      fontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif',
      fontSize: this.config.fontSize,
      fill: this.config.textColor,
    });
    this.labelText = new Text({ text: config.text, style });
    this.labelText.anchor.set(0.5, 0.5);
    this.labelText.position.set(config.width / 2, config.height / 2);
    this.addChild(this.labelText);

    // Interaction
    this.eventMode = 'static';
    this.cursor = 'pointer';

    this.on('pointerover', this.onHover);
    this.on('pointerout', this.onOut);
    this.on('pointerdown', this.onPress);
    this.on('pointerup', this.onRelease);
  }

  get enabled(): boolean {
    return this._enabled;
  }

  set enabled(v: boolean) {
    this._enabled = v;
    this.cursor = v ? 'pointer' : 'default';
    this.alpha = v ? 1 : 0.6;
    if (!v) {
      this.drawBg(this.config.disabledFill, 0x444444);
      this.labelText.style.fill = this.config.disabledTextColor;
    } else {
      this.drawBg(this.config.fill, this.config.borderColor);
      this.labelText.style.fill = this.config.textColor;
    }
  }

  setText(text: string): void {
    this.labelText.text = text;
  }

  private drawBg(fill: number, border: number): void {
    this.bg.clear();
    this.bg.roundRect(0, 0, this.config.width, this.config.height, 4);
    this.bg.fill({ color: fill, alpha: 0.85 });
    this.bg.stroke({ color: border, width: 1 });
  }

  private onHover = () => {
    if (!this._enabled) return;
    this.drawBg(0x3a2a50, 0xd4b060);
  };

  private onOut = () => {
    if (!this._enabled) return;
    this.drawBg(this.config.fill, this.config.borderColor);
  };

  private onPress = () => {
    if (!this._enabled) return;
    this.drawBg(0x1a0e2e, 0xffd700);
    this.scale.set(0.97);
  };

  private onRelease = () => {
    if (!this._enabled) return;
    this.drawBg(this.config.fill, this.config.borderColor);
    this.scale.set(1);
  };
}
