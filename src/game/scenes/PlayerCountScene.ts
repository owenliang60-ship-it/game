import { Application, Text, TextStyle, Graphics } from 'pixi.js';
import { BaseScene } from './BaseScene';
import { Button } from '../ui/Button';
import type { SceneManager } from '../SceneManager';

/**
 * Player count selection: choose 2-8 players.
 * For now, only 2-3 are implemented (1 human + AI opponents).
 */
export class PlayerCountScene extends BaseScene {
  private sceneManager: SceneManager;

  constructor(app: Application, sceneManager: SceneManager) {
    super(app);
    this.sceneManager = sceneManager;
  }

  onEnter(): void {
    this.container.removeChildren();

    // Background
    const bg = new Graphics();
    bg.rect(0, 0, 960, 540);
    bg.fill(0x0e0820);
    this.container.addChild(bg);

    // Title
    const titleStyle = new TextStyle({
      fontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif',
      fontSize: 28,
      fill: 0xFFD700,
      fontWeight: 'bold',
    });
    const title = new Text({ text: '选择人数', style: titleStyle });
    title.anchor.set(0.5, 0);
    title.position.set(480, 80);
    this.container.addChild(title);

    // Description
    const descStyle = new TextStyle({
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: 14,
      fill: 0xAAAAAA,
    });
    const desc = new Text({ text: '你将操控一位角色，其余由AI控制', style: descStyle });
    desc.anchor.set(0.5, 0);
    desc.position.set(480, 125);
    this.container.addChild(desc);

    // Player count buttons
    const counts = [2, 3];
    const labels: Record<number, string> = {
      2: '2人对战',
      3: '3人混战',
    };
    const descs: Record<number, string> = {
      2: '1v1 经典对决',
      3: '自由混战 三人乱斗',
    };

    const startX = 480 - (counts.length - 1) * 110;

    for (let i = 0; i < counts.length; i++) {
      const count = counts[i];

      const btnBg = new Graphics();
      btnBg.roundRect(0, 0, 200, 180, 8);
      btnBg.fill({ color: 0x1a0e2e, alpha: 0.9 });
      btnBg.stroke({ color: 0xc8a050, width: 1 });
      btnBg.position.set(startX + i * 220 - 100, 180);
      btnBg.eventMode = 'static';
      btnBg.cursor = 'pointer';

      // Number
      const numStyle = new TextStyle({
        fontFamily: '"Microsoft YaHei", sans-serif',
        fontSize: 48,
        fill: 0xFFD700,
        fontWeight: 'bold',
      });
      const num = new Text({ text: `${count}`, style: numStyle });
      num.anchor.set(0.5, 0);
      num.position.set(100, 20);
      btnBg.addChild(num);

      // Label
      const labelStyle = new TextStyle({
        fontFamily: '"Microsoft YaHei", sans-serif',
        fontSize: 16,
        fill: 0xf5e6c8,
      });
      const labelText = new Text({ text: labels[count], style: labelStyle });
      labelText.anchor.set(0.5, 0);
      labelText.position.set(100, 85);
      btnBg.addChild(labelText);

      // Description
      const dStyle = new TextStyle({
        fontFamily: '"Microsoft YaHei", sans-serif',
        fontSize: 12,
        fill: 0x999999,
      });
      const dText = new Text({ text: descs[count], style: dStyle });
      dText.anchor.set(0.5, 0);
      dText.position.set(100, 115);
      btnBg.addChild(dText);

      btnBg.on('pointerover', () => {
        btnBg.clear();
        btnBg.roundRect(0, 0, 200, 180, 8);
        btnBg.fill({ color: 0x2a1a40, alpha: 0.95 });
        btnBg.stroke({ color: 0xffd700, width: 2 });
      });
      btnBg.on('pointerout', () => {
        btnBg.clear();
        btnBg.roundRect(0, 0, 200, 180, 8);
        btnBg.fill({ color: 0x1a0e2e, alpha: 0.9 });
        btnBg.stroke({ color: 0xc8a050, width: 1 });
      });

      btnBg.on('pointertap', () => {
        this.sceneManager.goTo('charSelect', { playerCount: count });
      });

      this.container.addChild(btnBg);
    }

    // Back button
    const backBtn = new Button({
      text: '返回',
      width: 80,
      height: 36,
      fontSize: 12,
    });
    backBtn.position.set(20, 480);
    backBtn.on('pointertap', () => {
      this.sceneManager.goTo('title');
    });
    this.container.addChild(backBtn);
  }
}
