import { Container, Text, TextStyle, Graphics } from 'pixi.js';

export type LogType = 'system' | 'player' | 'enemy' | 'damage' | 'heal' | 'info';

const LOG_COLORS: Record<LogType, number> = {
  system: 0x999999,
  player: 0xFFD700,
  enemy: 0x6688CC,
  damage: 0xFF4444,
  heal: 0x33FF66,
  info: 0xCCCCCC,
};

interface LogEntry {
  text: string;
  type: LogType;
}

/**
 * Scrollable battle log panel with colored messages.
 */
export class BattleLog extends Container {
  private entries: LogEntry[] = [];
  private textDisplay: Text;
  private bg: Graphics;
  private maxLines: number;

  constructor(width = 280, height = 150, maxLines = 12) {
    super();
    this.maxLines = maxLines;

    // Semi-transparent background
    this.bg = new Graphics();
    this.bg.roundRect(0, 0, width, height, 4);
    this.bg.fill({ color: 0x0a0a1a, alpha: 0.7 });
    this.bg.stroke({ color: 0x333355, width: 1 });
    this.addChild(this.bg);

    // Text display
    const style = new TextStyle({
      fontFamily: '"Microsoft YaHei", "PingFang SC", monospace',
      fontSize: 11,
      fill: 0xcccccc,
      wordWrap: true,
      wordWrapWidth: width - 16,
      lineHeight: 15,
    });
    this.textDisplay = new Text({ text: '', style });
    this.textDisplay.position.set(8, 6);
    this.addChild(this.textDisplay);
  }

  add(text: string, type: LogType = 'info'): void {
    this.entries.push({ text, type });
    if (this.entries.length > this.maxLines) {
      this.entries.shift();
    }
    this.render();
  }

  clear(): void {
    this.entries = [];
    this.textDisplay.text = '';
  }

  private render(): void {
    // For now, use single color for the Text (PixiJS Text doesn't support inline color changes).
    // Use the most recent entry's color as the overall tint, or keep default.
    // The full text concatenation preserves readability.
    this.textDisplay.text = this.entries.map(e => e.text).join('\n');
  }
}
