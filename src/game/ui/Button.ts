import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { drawRPGPanel } from './RPGPanel';

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
  primary?: boolean;
}

/**
 * RPG-styled button with bevel, shadow, and hover/press/disabled states.
 */
export class Button extends Container {
  private bg: Graphics;
  private labelText: Text;
  private config: Required<ButtonConfig>;
  private _enabled = true;
  private hoverGlow: Graphics;

  constructor(config: ButtonConfig) {
    super();

    const isPrimary = config.primary ?? false;

    this.config = {
      text: config.text,
      width: config.width,
      height: config.height,
      fontSize: config.fontSize ?? 13,
      fill: config.fill ?? 0xDCD4C4,
      textColor: config.textColor ?? (isPrimary ? 0x4A3A10 : 0x3A3530),
      borderColor: config.borderColor ?? (isPrimary ? 0xB89818 : 0xB8A888),
      disabledFill: config.disabledFill ?? 0xDCD8D0,
      disabledTextColor: config.disabledTextColor ?? 0xA0A0A0,
      primary: isPrimary,
    };

    // Background
    this.bg = new Graphics();
    this.drawBg('normal');
    this.addChild(this.bg);

    // Hover glow line (hidden by default)
    this.hoverGlow = new Graphics();
    this.hoverGlow.alpha = 0;
    this.addChild(this.hoverGlow);

    // Label
    const fontFamily = isPrimary
      ? 'zpix, "Press Start 2P", monospace'
      : 'zpix, "PingFang SC", sans-serif';
    const style = new TextStyle({
      fontFamily,
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
      this.drawBg('disabled');
      this.labelText.style.fill = this.config.disabledTextColor;
    } else {
      this.drawBg('normal');
      this.labelText.style.fill = this.config.textColor;
    }
  }

  setText(text: string): void {
    this.labelText.text = text;
  }

  private drawBg(state: 'normal' | 'hover' | 'press' | 'disabled'): void {
    const { width, height, primary } = this.config;
    this.bg.clear();

    if (state === 'disabled') {
      this.bg.roundRect(0, 0, width, height, 3);
      this.bg.fill({ color: this.config.disabledFill, alpha: 0.85 });
      this.bg.stroke({ color: 0xC0C0C0, width: 1 });
      return;
    }

    if (state === 'press') {
      // Pressed: inverted bevel (top=shadow, bottom=highlight) + y+1
      const fillColor = primary ? 0xC0A028 : 0xC8C0B0;
      drawRPGPanel(this.bg, {
        width, height, radius: 3,
        fillColor, fillAlpha: 0.92,
        shadow: false, innerFrame: false, cornerDots: false,
      });
      // Override bevel: dark top, light bottom (press effect)
      this.bg.rect(4, 1, width - 8, 1);
      this.bg.fill({ color: 0xC8B898, alpha: 0.5 });
      this.bg.rect(4, height - 2, width - 8, 1);
      this.bg.fill({ color: 0xFFFAF0, alpha: 0.4 });
      return;
    }

    if (state === 'hover') {
      const fillColor = primary ? 0xE8D050 : 0xE8E0D0;
      drawRPGPanel(this.bg, {
        width, height, radius: 3,
        fillColor, fillAlpha: 0.94,
        shadow: true, innerFrame: false, cornerDots: false,
        accentColor: primary ? 0xD4A010 : 0xC8A050,
      });
      return;
    }

    // Normal
    const fillColor = primary ? 0xE8C848 : 0xE0D8C8;
    drawRPGPanel(this.bg, {
      width, height, radius: 3,
      fillColor, fillAlpha: 0.92,
      shadow: true, innerFrame: false, cornerDots: false,
    });
  }

  private onHover = () => {
    if (!this._enabled) return;
    this.drawBg('hover');
    this.y -= 1;
    // Show hover glow line
    this.hoverGlow.clear();
    this.hoverGlow.rect(4, 2, this.config.width - 8, 1);
    this.hoverGlow.fill({ color: 0xD4A010, alpha: 0.6 });
    this.hoverGlow.alpha = 1;
  };

  private onOut = () => {
    if (!this._enabled) return;
    this.drawBg('normal');
    this.y += 1;
    this.hoverGlow.alpha = 0;
  };

  private onPress = () => {
    if (!this._enabled) return;
    this.drawBg('press');
    this.y += 1;
  };

  private onRelease = () => {
    if (!this._enabled) return;
    this.drawBg('normal');
    this.y -= 1;
    this.hoverGlow.alpha = 0;
  };
}
