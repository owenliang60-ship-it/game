import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { drawRPGPanel } from './RPGPanel';

export interface TooltipData {
  name: string;
  type?: string;        // '近战' | '远程' | '魔法' | '增益'
  cost?: string;        // 'MP 10' | 'HP 10' | 'RAGE 80'
  cost2?: string;       // secondary cost for dual-cost skills
  damage?: string;      // '伤害 50' or '真实伤害 80'
  condition?: string;   // '目标逃跑时: ×4伤害'
  extra?: string;       // '100%命中逃跑目标' etc.
  desc?: string;        // general description for base actions
}

const FONT = 'zpix, "VT323", monospace';

/**
 * Hover tooltip for skill/action buttons.
 * Shows above the button as an RPGPanel with skill details.
 */
export class SkillTooltip extends Container {
  private panel: Graphics;

  constructor() {
    super();
    this.panel = new Graphics();
    this.addChild(this.panel);
    this.visible = false;
  }

  /** Show tooltip at position (x, y is the TOP of the button in parent coords) */
  showAt(x: number, y: number, data: TooltipData): void {
    this.removeChildren();
    this.panel = new Graphics();
    this.addChild(this.panel);

    const lines: { text: string; color: number; indent?: boolean }[] = [];

    // Line 1: Name + type tag
    if (data.type) {
      lines.push({ text: `${data.name}  [${data.type}]`, color: 0x3A3530 });
    } else {
      lines.push({ text: data.name, color: 0x3A3530 });
    }

    // Cost
    if (data.cost) {
      const costLine = data.cost2 ? `消耗: ${data.cost} + ${data.cost2}` : `消耗: ${data.cost}`;
      lines.push({ text: costLine, color: 0x787068 });
    }

    // Damage
    if (data.damage) {
      lines.push({ text: data.damage, color: 0xA04020 });
    }

    // Description (for base actions)
    if (data.desc) {
      lines.push({ text: data.desc, color: 0x787068 });
    }

    // Condition
    if (data.condition) {
      lines.push({ text: `▸ ${data.condition}`, color: 0x8B6914, indent: true });
    }

    // Extra info
    if (data.extra) {
      lines.push({ text: `▸ ${data.extra}`, color: 0x6A8A4A, indent: true });
    }

    // Calculate dimensions
    const padX = 10;
    const padY = 7;
    const lineH = 15;
    const panelW = 200;
    const panelH = padY * 2 + lines.length * lineH;

    // Draw panel
    drawRPGPanel(this.panel, {
      width: panelW,
      height: panelH,
      radius: 4,
      fillColor: 0xFAF6F0,
      fillAlpha: 0.96,
      shadow: true,
      innerFrame: false,
      cornerDots: false,
    });

    // Render text lines
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const style = new TextStyle({
        fontFamily: FONT,
        fontSize: i === 0 ? 12 : 11,
        fill: line.color,
        fontWeight: i === 0 ? 'bold' : 'normal',
      });
      const t = new Text({ text: line.text, style });
      t.position.set(padX, padY + i * lineH);
      this.addChild(t);
    }

    // Position: above the button, centered horizontally
    this.position.set(x - panelW / 2, y - panelH - 6);

    // Clamp to screen bounds (960x540)
    if (this.position.x < 5) this.position.x = 5;
    if (this.position.x + panelW > 955) this.position.x = 955 - panelW;
    if (this.position.y < 5) this.position.y = 5;

    this.visible = true;
  }

  hideTooltip(): void {
    this.visible = false;
  }
}
