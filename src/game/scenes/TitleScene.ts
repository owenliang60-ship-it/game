import { Application, Text, TextStyle, Graphics } from 'pixi.js';
import { BaseScene } from './BaseScene';
import { Button } from '../ui/Button';
import type { SceneManager } from '../SceneManager';

/**
 * Title screen: game title + character silhouettes + start button.
 */
export class TitleScene extends BaseScene {
  private sceneManager: SceneManager;

  constructor(app: Application, sceneManager: SceneManager) {
    super(app);
    this.sceneManager = sceneManager;
  }

  onEnter(): void {
    this.container.removeChildren();

    // Background gradient
    const bg = new Graphics();
    bg.rect(0, 0, 960, 540);
    bg.fill(0x0e0820);
    this.container.addChild(bg);

    // Subtle decorative lines
    const deco = new Graphics();
    deco.rect(0, 260, 960, 1);
    deco.fill({ color: 0xc8a050, alpha: 0.3 });
    deco.rect(0, 270, 960, 1);
    deco.fill({ color: 0xc8a050, alpha: 0.15 });
    this.container.addChild(deco);

    // Title
    const titleStyle = new TextStyle({
      fontFamily: '"Microsoft YaHei", "PingFang SC", serif',
      fontSize: 48,
      fill: 0xFFD700,
      fontWeight: 'bold',
      stroke: { color: 0x4a2800, width: 4 },
    });
    const title = new Text({ text: '口头对战', style: titleStyle });
    title.anchor.set(0.5, 0);
    title.position.set(480, 120);
    this.container.addChild(title);

    // Subtitle
    const subStyle = new TextStyle({
      fontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif',
      fontSize: 18,
      fill: 0xC8A050,
    });
    const subtitle = new Text({ text: '回合制策略对战', style: subStyle });
    subtitle.anchor.set(0.5, 0);
    subtitle.position.set(480, 185);
    this.container.addChild(subtitle);

    // Character names preview
    const charStyle = new TextStyle({
      fontFamily: '"Microsoft YaHei", monospace',
      fontSize: 14,
      fill: 0x999999,
    });
    const chars = new Text({ text: '骑士  ·  装甲战士  ·  弓箭手', style: charStyle });
    chars.anchor.set(0.5, 0);
    chars.position.set(480, 290);
    this.container.addChild(chars);

    // Start button
    const startBtn = new Button({
      text: '开始游戏',
      width: 180,
      height: 50,
      fontSize: 18,
    });
    startBtn.position.set(480 - 90, 360);
    startBtn.on('pointertap', () => {
      this.sceneManager.goTo('playerCount');
    });
    this.container.addChild(startBtn);

    // Version
    const verStyle = new TextStyle({
      fontFamily: 'monospace',
      fontSize: 10,
      fill: 0x555555,
    });
    const version = new Text({ text: 'v0.3.0-alpha  M3', style: verStyle });
    version.anchor.set(1, 1);
    version.position.set(950, 530);
    this.container.addChild(version);
  }
}
