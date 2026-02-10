import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { drawRPGPanel } from './RPGPanel';

export interface SkillButtonConfig {
  name: string;
  costLabel: string;
  affordable: boolean;
  reason?: string;
  width?: number;
  height?: number;
  /** Resource type for color indicator: 'mp' | 'hp' | 'rage' */
  resourceType?: 'mp' | 'hp' | 'rage';
}

const RESOURCE_COLORS: Record<string, number> = {
  mp: 0x4488CC,
  hp: 0xCC3333,
  rage: 0xFF6600,
};

/**
 * A skill button with RPG panel background, name + cost, resource color indicator.
 */
export class SkillButton extends Container {
  private bg: Graphics;
  private nameText: Text;
  private costText: Text;
  private _affordable: boolean;
  private _selected = false;
  private btnWidth: number;
  private btnHeight: number;
  private resourceType: string;

  constructor(config: SkillButtonConfig) {
    super();
    this.btnWidth = config.width ?? 130;
    this.btnHeight = config.height ?? 40;
    this._affordable = config.affordable;
    this.resourceType = config.resourceType ?? 'mp';

    // Background
    this.bg = new Graphics();
    this.drawBg();
    this.addChild(this.bg);

    // Resource type color indicator (3x3 square, top-left)
    if (config.affordable) {
      const indicator = new Graphics();
      const indColor = RESOURCE_COLORS[this.resourceType] ?? 0x4488CC;
      indicator.rect(6, 6, 4, 4);
      indicator.fill({ color: indColor, alpha: 0.7 });
      this.addChild(indicator);
    }

    // Skill name
    const nameStyle = new TextStyle({
      fontFamily: 'zpix, "PingFang SC", sans-serif',
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
      fontFamily: '"VT323", monospace',
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

    if (this._selected) {
      drawRPGPanel(this.bg, {
        width: this.btnWidth, height: this.btnHeight, radius: 3,
        fillColor: 0xFFF8E0, fillAlpha: 0.92,
        shadow: false, innerFrame: false, cornerDots: false,
        accentColor: 0xD4A010,
      });
    } else if (this._affordable) {
      drawRPGPanel(this.bg, {
        width: this.btnWidth, height: this.btnHeight, radius: 3,
        fillColor: 0xF0EBE0, fillAlpha: 0.88,
        shadow: false, innerFrame: false, cornerDots: false,
      });
    } else {
      this.bg.roundRect(0, 0, this.btnWidth, this.btnHeight, 3);
      this.bg.fill({ color: 0xE0DCD8, alpha: 0.7 });
      this.bg.stroke({ color: 0xC0C0C0, width: 1 });
    }
  }

  private onHover = () => {
    if (!this._affordable || this._selected) return;
    this.bg.clear();
    drawRPGPanel(this.bg, {
      width: this.btnWidth, height: this.btnHeight, radius: 3,
      fillColor: 0xE8E0D0, fillAlpha: 0.92,
      shadow: false, innerFrame: false, cornerDots: false,
      accentColor: 0xB89818,
    });
    this.y -= 1;
  };

  private onOut = () => {
    this.drawBg();
    this.y += 1;
  };
}
