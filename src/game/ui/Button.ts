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
  primary?: boolean;
}

// Gradient layer colors for normal buttons (light theme)
const GRAD_TOP = 0xE8E0D0;
const GRAD_MID = 0xDCD4C4;
const GRAD_BOT = 0xD0C8B8;

// Gradient layer colors for primary buttons (gold theme)
const PRIM_TOP = 0xE8C848;
const PRIM_MID = 0xD4B438;
const PRIM_BOT = 0xC0A028;

/**
 * Reusable PixiJS button with 3-layer gradient, border, and hover/press/disabled states.
 */
export class Button extends Container {
  private bg: Graphics;
  private labelText: Text;
  private config: Required<ButtonConfig>;
  private _enabled = true;

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

    // Label
    const fontFamily = isPrimary
      ? '"Press Start 2P", "PingFang SC", monospace'
      : '"PingFang SC", "Microsoft YaHei", sans-serif';
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
      this.bg.roundRect(0, 0, width, height, 4);
      this.bg.fill({ color: this.config.disabledFill, alpha: 0.85 });
      this.bg.stroke({ color: 0xC0C0C0, width: 1 });
      return;
    }

    const isPrimary = primary;
    let top: number, mid: number, bot: number;
    let borderCol: number;
    let borderWidth: number;

    switch (state) {
      case 'hover':
        top = isPrimary ? 0xF0D858 : 0xF0E8D8;
        mid = isPrimary ? 0xDCC048 : 0xE4DCD0;
        bot = isPrimary ? 0xC8AC30 : 0xD8D0C0;
        borderCol = isPrimary ? 0xD4A010 : 0xC8B898;
        borderWidth = 2;
        break;
      case 'press':
        top = isPrimary ? 0xB89820 : 0xC8C0B0;
        mid = isPrimary ? 0xA88818 : 0xBCB4A4;
        bot = isPrimary ? 0x987810 : 0xB0A898;
        borderCol = 0xD4A010;
        borderWidth = 2;
        break;
      default: // normal
        top = isPrimary ? PRIM_TOP : GRAD_TOP;
        mid = isPrimary ? PRIM_MID : GRAD_MID;
        bot = isPrimary ? PRIM_BOT : GRAD_BOT;
        borderCol = this.config.borderColor;
        borderWidth = 2;
    }

    // 3-layer gradient simulation: top strip, middle, bottom strip
    const topH = Math.floor(height * 0.3);
    const botH = Math.floor(height * 0.3);
    const midH = height - topH - botH;

    // Full rounded background (bottom layer)
    this.bg.roundRect(0, 0, width, height, 4);
    this.bg.fill({ color: bot, alpha: 0.9 });

    // Middle strip
    this.bg.rect(1, topH, width - 2, midH);
    this.bg.fill({ color: mid, alpha: 0.9 });

    // Top strip
    this.bg.roundRect(0, 0, width, topH + 2, 4);
    this.bg.fill({ color: top, alpha: 0.85 });

    // Border
    this.bg.roundRect(0, 0, width, height, 4);
    this.bg.stroke({ color: borderCol, width: borderWidth, alpha: 0.7 });

    if (state === 'hover') {
      this.position.y -= 0; // keep position stable
    }
  }

  private onHover = () => {
    if (!this._enabled) return;
    this.drawBg('hover');
    this.y -= 1;
  };

  private onOut = () => {
    if (!this._enabled) return;
    this.drawBg('normal');
    this.y += 1;
  };

  private onPress = () => {
    if (!this._enabled) return;
    this.drawBg('press');
    this.scale.set(0.97);
  };

  private onRelease = () => {
    if (!this._enabled) return;
    this.drawBg('normal');
    this.scale.set(1);
  };
}
