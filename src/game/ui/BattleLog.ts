import { Container, Text, TextStyle, Graphics } from 'pixi.js';
import { TweenManager } from '../animation/TweenManager';
import { Easing } from '../animation/Easing';

export type LogType = 'system' | 'player' | 'enemy' | 'damage' | 'heal' | 'info';

const LOG_COLORS: Record<LogType, number> = {
  system: 0x999999,
  player: 0xFFD700,
  enemy: 0x6688CC,
  damage: 0xFF4444,
  heal: 0x33FF66,
  info: 0xCCCCCC,
};

/**
 * Scrollable battle log panel with per-line colored messages.
 * Each message is a separate Text object for independent styling.
 */
export class BattleLog extends Container {
  private logContainer: Container;
  private bg: Graphics;
  private maxLines: number;
  private lineTexts: Text[] = [];
  private panelWidth: number;
  private panelHeight: number;
  private titleText: Text;

  constructor(width = 280, height = 160, maxLines = 10) {
    super();
    this.maxLines = maxLines;
    this.panelWidth = width;
    this.panelHeight = height;

    // Semi-transparent background
    this.bg = new Graphics();
    this.bg.roundRect(0, 0, width, height, 4);
    this.bg.fill({ color: 0x0a0a1a, alpha: 0.75 });
    this.bg.stroke({ color: 0x333355, width: 1 });
    this.addChild(this.bg);

    // Fixed title
    this.titleText = new Text({
      text: '战斗日志',
      style: new TextStyle({
        fontFamily: '"Press Start 2P", "VT323", monospace',
        fontSize: 10,
        fill: 0xc8a050,
      }),
    });
    this.titleText.position.set(8, 4);
    this.addChild(this.titleText);

    // Scrollable log container (below title)
    this.logContainer = new Container();
    this.logContainer.position.set(8, 20);
    this.addChild(this.logContainer);

    // Mask to clip overflow
    const mask = new Graphics();
    mask.rect(0, 20, width - 8, height - 24);
    mask.fill(0xffffff);
    this.addChild(mask);
    this.logContainer.mask = mask;
  }

  add(text: string, type: LogType = 'info'): void {
    const color = LOG_COLORS[type] ?? 0xCCCCCC;

    const lineText = new Text({
      text,
      style: new TextStyle({
        fontFamily: '"VT323", "Microsoft YaHei", monospace',
        fontSize: 13,
        fill: color,
        wordWrap: true,
        wordWrapWidth: this.panelWidth - 20,
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

    // New message highlight: flash alpha
    lineText.alpha = 1;
    TweenManager.add({
      target: lineText,
      props: { alpha: 0.85 },
      duration: 200,
      easing: Easing.linear,
    });
  }

  clear(): void {
    for (const t of this.lineTexts) {
      t.destroy();
    }
    this.lineTexts = [];
    this.logContainer.removeChildren();
  }

  private layoutLines(): void {
    let y = 0;
    for (const line of this.lineTexts) {
      line.position.set(0, y);
      y += 14;
    }
  }
}
