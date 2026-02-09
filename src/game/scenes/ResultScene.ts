import { Application, Text, TextStyle, Graphics } from 'pixi.js';
import { BaseScene } from './BaseScene';
import { Button } from '../ui/Button';
import type { SceneManager } from '../SceneManager';

/**
 * Battle result screen: winner display + stats + replay/return buttons.
 */
export class ResultScene extends BaseScene {
  private sceneManager: SceneManager;

  constructor(app: Application, sceneManager: SceneManager) {
    super(app);
    this.sceneManager = sceneManager;
  }

  onEnter(data?: Record<string, unknown>): void {
    this.container.removeChildren();

    const winner = data?.winner as string ?? '???';
    const isDraw = data?.isDraw as boolean ?? false;
    const rounds = data?.rounds as number ?? 0;

    // Background
    const bg = new Graphics();
    bg.rect(0, 0, 960, 540);
    bg.fill(0x0e0820);
    this.container.addChild(bg);

    // Victory/Draw banner
    const bannerStyle = new TextStyle({
      fontFamily: '"Microsoft YaHei", "PingFang SC", serif',
      fontSize: 42,
      fill: isDraw ? 0xAAAAAA : 0xFFD700,
      fontWeight: 'bold',
      stroke: { color: 0x000000, width: 3 },
    });
    const banner = new Text({
      text: isDraw ? '平局!' : '胜利!',
      style: bannerStyle,
    });
    banner.anchor.set(0.5, 0);
    banner.position.set(480, 100);
    this.container.addChild(banner);

    // Winner name
    if (!isDraw) {
      const nameStyle = new TextStyle({
        fontFamily: '"Microsoft YaHei", sans-serif',
        fontSize: 28,
        fill: 0xf5e6c8,
      });
      const nameText = new Text({ text: winner, style: nameStyle });
      nameText.anchor.set(0.5, 0);
      nameText.position.set(480, 160);
      this.container.addChild(nameText);
    }

    // Stats
    const statStyle = new TextStyle({
      fontFamily: '"Microsoft YaHei", monospace',
      fontSize: 16,
      fill: 0xAAAAAA,
    });
    const stats = new Text({
      text: `对战持续 ${rounds} 回合`,
      style: statStyle,
    });
    stats.anchor.set(0.5, 0);
    stats.position.set(480, 220);
    this.container.addChild(stats);

    // Decorative line
    const line = new Graphics();
    line.rect(280, 270, 400, 1);
    line.fill({ color: 0xc8a050, alpha: 0.4 });
    this.container.addChild(line);

    // "Play Again" button
    const replayBtn = new Button({
      text: '再来一局',
      width: 160,
      height: 44,
      fontSize: 16,
    });
    replayBtn.position.set(320, 320);
    replayBtn.on('pointertap', () => {
      this.sceneManager.goTo('charSelect');
    });
    this.container.addChild(replayBtn);

    // "Back to Title" button
    const titleBtn = new Button({
      text: '返回标题',
      width: 160,
      height: 44,
      fontSize: 16,
      fill: 0x1a1a2a,
      borderColor: 0x666666,
      textColor: 0xAAAAAA,
    });
    titleBtn.position.set(520, 320);
    titleBtn.on('pointertap', () => {
      this.sceneManager.goTo('title');
    });
    this.container.addChild(titleBtn);
  }
}
