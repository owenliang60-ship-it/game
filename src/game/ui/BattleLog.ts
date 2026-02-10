import { Container, Text, TextStyle, Graphics } from 'pixi.js';
import { TweenManager } from '../animation/TweenManager';
import { Easing } from '../animation/Easing';
import { drawRPGPanel } from './RPGPanel';

export type LogType = 'system' | 'player' | 'enemy' | 'damage' | 'heal' | 'info';

const LOG_COLORS: Record<LogType, number> = {
  system: 0x787068,
  player: 0xB08000,
  enemy: 0x4A6FA5,
  damage: 0xCC3333,
  heal: 0x228B22,
  info: 0x606060,
};

/**
 * Scrollable battle log panel with RPG panel background and per-line colored messages.
 */
export class BattleLog extends Container {
  private logContainer: Container;
  private bg: Graphics;
  private maxLines: number;
  private lineTexts: Text[] = [];
  private panelWidth: number;
  private panelHeight: number;
  private titleText: Text;
  private scrollIndicator: Graphics;

  constructor(width = 280, height = 160, maxLines = 10) {
    super();
    this.maxLines = maxLines;
    this.panelWidth = width;
    this.panelHeight = height;

    // RPG Panel background
    this.bg = new Graphics();
    drawRPGPanel(this.bg, {
      width, height, radius: 4,
      fillColor: 0xF0EBE0, fillAlpha: 0.82,
      shadow: true, innerFrame: true, cornerDots: true,
    });
    this.addChild(this.bg);

    // Fixed title
    this.titleText = new Text({
      text: '战斗日志',
      style: new TextStyle({
        fontFamily: 'zpix, "Press Start 2P", monospace',
        fontSize: 12,
        fill: 0x8B6914,
      }),
    });
    this.titleText.position.set(10, 6);
    this.addChild(this.titleText);

    // Scrollable log container (below title)
    this.logContainer = new Container();
    this.logContainer.position.set(10, 22);
    this.addChild(this.logContainer);

    // Mask to clip overflow
    const mask = new Graphics();
    mask.rect(0, 22, width - 10, height - 26);
    mask.fill(0xffffff);
    this.addChild(mask);
    this.logContainer.mask = mask;

    // Scroll indicator arrow (hidden by default)
    this.scrollIndicator = new Graphics();
    this.scrollIndicator.visible = false;
    this.addChild(this.scrollIndicator);
  }

  add(text: string, type: LogType = 'info'): void {
    const color = LOG_COLORS[type] ?? 0x606060;

    const lineText = new Text({
      text,
      style: new TextStyle({
        fontFamily: 'zpix, "VT323", monospace',
        fontSize: 14,
        fill: color,
        wordWrap: true,
        wordWrapWidth: this.panelWidth - 24,
      }),
    });

    this.lineTexts.push(lineText);
    this.logContainer.addChild(lineText);

    // Remove oldest if over limit
    while (this.lineTexts.length > this.maxLines) {
      const old = this.lineTexts.shift()!;
      this.logContainer.removeChild(old);
      old.destroy();
    }

    // Reposition all lines
    this.layoutLines();

    // New message slide-in from right
    lineText.alpha = 0;
    lineText.x += 20;
    TweenManager.add({
      target: lineText,
      props: { alpha: 0.85, x: lineText.x - 20 },
      duration: 200,
      easing: Easing.easeOutQuad,
    });

    // Update scroll indicator
    this.updateScrollIndicator();
  }

  clear(): void {
    for (const t of this.lineTexts) {
      t.destroy();
    }
    this.lineTexts = [];
    this.logContainer.removeChildren();
    this.scrollIndicator.visible = false;
  }

  private layoutLines(): void {
    const lineHeight = 17;
    const availableHeight = this.panelHeight - 26;
    const totalHeight = this.lineTexts.length * lineHeight;
    const startY = Math.max(0, availableHeight - totalHeight);
    for (let i = 0; i < this.lineTexts.length; i++) {
      this.lineTexts[i].position.set(0, startY + i * lineHeight);
    }
  }

  private updateScrollIndicator(): void {
    const lineHeight = 17;
    const availableHeight = this.panelHeight - 26;
    const totalHeight = this.lineTexts.length * lineHeight;
    const hasOverflow = totalHeight > availableHeight;

    this.scrollIndicator.visible = hasOverflow;
    if (hasOverflow) {
      this.scrollIndicator.clear();
      const x = this.panelWidth - 14;
      const y = this.panelHeight - 12;
      // Tiny downward arrow
      this.scrollIndicator.moveTo(x, y);
      this.scrollIndicator.lineTo(x + 4, y + 4);
      this.scrollIndicator.lineTo(x - 4, y + 4);
      this.scrollIndicator.closePath();
      this.scrollIndicator.fill({ color: 0x8B6914, alpha: 0.5 });
    }
  }
}
