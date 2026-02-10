import { Container, Graphics, Text, TextStyle } from 'pixi.js';

export interface SkillButtonConfig {
  name: string;
  costLabel: string;
  affordable: boolean;
  reason?: string;
  width?: number;
  height?: number;
}

/**
 * A skill button showing name + cost, with enabled/disabled state.
 */
export class SkillButton extends Container {
  private bg: Graphics;
  private nameText: Text;
  private costText: Text;
  private _affordable: boolean;
  private _selected = false;
  private btnWidth: number;
  private btnHeight: number;

  constructor(config: SkillButtonConfig) {
    super();
    this.btnWidth = config.width ?? 130;
    this.btnHeight = config.height ?? 40;
    this._affordable = config.affordable;

    // Background
    this.bg = new Graphics();
    this.drawBg();
    this.addChild(this.bg);

    // Skill name
    const nameStyle = new TextStyle({
      fontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif',
      fontSize: 12,
      fill: config.affordable ? 0x3A3530 : 0xA0A0A0,
      fontWeight: 'bold',
    });
    this.nameText = new Text({ text: config.name, style: nameStyle });
    this.nameText.anchor.set(0.5, 0);
    this.nameText.position.set(this.btnWidth / 2, 6);
    this.addChild(this.nameText);

    // Cost label
    const costStyle = new TextStyle({
      fontFamily: '"Microsoft YaHei", monospace',
      fontSize: 12,
      fill: config.affordable ? 0x787068 : 0x909090,
    });
    const costContent = config.affordable ? config.costLabel : (config.reason ?? config.costLabel);
    this.costText = new Text({ text: costContent, style: costStyle });
    this.costText.anchor.set(0.5, 0);
    this.costText.position.set(this.btnWidth / 2, 24);
    this.addChild(this.costText);

    // Interaction
    this.eventMode = 'static';
    this.cursor = config.affordable ? 'pointer' : 'default';

    if (config.affordable) {
      this.on('pointerover', this.onHover);
      this.on('pointerout', this.onOut);
    }
  }

  get affordable(): boolean {
    return this._affordable;
  }

  get selected(): boolean {
    return this._selected;
  }

  set selected(v: boolean) {
    this._selected = v;
    this.drawBg();
  }

  private drawBg(): void {
    this.bg.clear();
    this.bg.roundRect(0, 0, this.btnWidth, this.btnHeight, 4);

    if (this._selected) {
      this.bg.fill({ color: 0xFFF8E0, alpha: 0.9 });
      this.bg.stroke({ color: 0xD4A010, width: 2 });
    } else if (this._affordable) {
      this.bg.fill({ color: 0xF0EBE0, alpha: 0.85 });
      this.bg.stroke({ color: 0xB0A080, width: 1 });
    } else {
      this.bg.fill({ color: 0xE0DCD8, alpha: 0.7 });
      this.bg.stroke({ color: 0xC0C0C0, width: 1 });
    }
  }

  private onHover = () => {
    if (!this._affordable || this._selected) return;
    this.bg.clear();
    this.bg.roundRect(0, 0, this.btnWidth, this.btnHeight, 4);
    this.bg.fill({ color: 0xE8E0D0, alpha: 0.9 });
    this.bg.stroke({ color: 0xB89818, width: 1.5 });
  };

  private onOut = () => {
    this.drawBg();
  };
}
