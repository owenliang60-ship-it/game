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
      fill: config.affordable ? 0xf5e6c8 : 0x666666,
      fontWeight: 'bold',
    });
    this.nameText = new Text({ text: config.name, style: nameStyle });
    this.nameText.anchor.set(0.5, 0);
    this.nameText.position.set(this.btnWidth / 2, 5);
    this.addChild(this.nameText);

    // Cost label
    const costStyle = new TextStyle({
      fontFamily: '"Microsoft YaHei", monospace',
      fontSize: 10,
      fill: config.affordable ? 0xaaaacc : 0x555555,
    });
    const costContent = config.affordable ? config.costLabel : (config.reason ?? config.costLabel);
    this.costText = new Text({ text: costContent, style: costStyle });
    this.costText.anchor.set(0.5, 0);
    this.costText.position.set(this.btnWidth / 2, 22);
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
      this.bg.fill({ color: 0x3a2a20, alpha: 0.9 });
      this.bg.stroke({ color: 0xffd700, width: 2 });
    } else if (this._affordable) {
      this.bg.fill({ color: 0x2a1a3e, alpha: 0.85 });
      this.bg.stroke({ color: 0xc8a050, width: 1 });
    } else {
      this.bg.fill({ color: 0x1a1a2a, alpha: 0.7 });
      this.bg.stroke({ color: 0x444444, width: 1 });
    }
  }

  private onHover = () => {
    if (!this._affordable || this._selected) return;
    this.bg.clear();
    this.bg.roundRect(0, 0, this.btnWidth, this.btnHeight, 4);
    this.bg.fill({ color: 0x3a2a50, alpha: 0.9 });
    this.bg.stroke({ color: 0xd4b060, width: 1 });
  };

  private onOut = () => {
    this.drawBg();
  };
}
