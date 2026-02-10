import { Application, Text, TextStyle, Graphics } from 'pixi.js';
import { BaseScene } from './BaseScene';
import { Button } from '../ui/Button';
import { OrnamentDivider } from '../ui/OrnamentDivider';
import { FrameBorder } from '../ui/FrameBorder';
import { drawRPGPanel } from '../ui/RPGPanel';
import type { SceneManager } from '../SceneManager';

/**
 * Player count selection: choose 2-8 players.
 * RPG panel cards with Press Start 2P numbers.
 */
export class PlayerCountScene extends BaseScene {
  private sceneManager: SceneManager;
  private selectedCount = -1;
  private countButtons: Graphics[] = [];

  constructor(app: Application, sceneManager: SceneManager) {
    super(app);
    this.sceneManager = sceneManager;
  }

  onEnter(): void {
    this.container.removeChildren();
    this.selectedCount = -1;
    this.countButtons = [];

    // Background
    const bg = new Graphics();
    bg.rect(0, 0, 960, 540);
    bg.fill(0xE8E0D4);
    this.container.addChild(bg);

    // Subtle center glow
    const glow = new Graphics();
    glow.ellipse(480, 270, 350, 200);
    glow.fill({ color: 0xF5EDE0, alpha: 0.5 });
    this.container.addChild(glow);

    // Decorative frame border
    const frame = new FrameBorder();
    this.container.addChild(frame);

    // Title
    const titleStyle = new TextStyle({
      fontFamily: 'zpix, "Press Start 2P", monospace',
      fontSize: 20,
      fill: 0x8B6914,
      letterSpacing: 4,
    });
    const title = new Text({ text: '选择人数', style: titleStyle });
    title.anchor.set(0.5, 0);
    title.position.set(480, 80);
    this.container.addChild(title);

    // Ornament divider below title
    const divider = new OrnamentDivider(400);
    divider.position.set(280, 120);
    this.container.addChild(divider);

    // Description
    const descStyle = new TextStyle({
      fontFamily: 'zpix, "PingFang SC", sans-serif',
      fontSize: 14,
      fill: 0x787068,
    });
    const desc = new Text({ text: '你将操控一位角色，其余由AI控制', style: descStyle });
    desc.anchor.set(0.5, 0);
    desc.position.set(480, 140);
    this.container.addChild(desc);

    // Player count buttons (RPG panel cards)
    const counts = [2, 3];
    const labels: Record<number, string> = {
      2: '1v1',
      3: '混战',
    };
    const descs: Record<number, string> = {
      2: '经典对决',
      3: '三人乱斗',
    };

    const btnSize = 160;
    const btnGap = 40;
    const totalW = counts.length * btnSize + (counts.length - 1) * btnGap;
    const startX = (960 - totalW) / 2;

    for (let i = 0; i < counts.length; i++) {
      const count = counts[i];
      const x = startX + i * (btnSize + btnGap);
      const y = 200;

      const card = new Graphics();
      this.drawCountCard(card, btnSize, false);
      card.position.set(x, y);
      card.eventMode = 'static';
      card.cursor = 'pointer';

      // Number (Press Start 2P)
      const numStyle = new TextStyle({
        fontFamily: '"Press Start 2P", monospace',
        fontSize: 36,
        fill: 0x8B6914,
      });
      const num = new Text({ text: `${count}`, style: numStyle });
      num.anchor.set(0.5, 0);
      num.position.set(btnSize / 2, 25);
      card.addChild(num);

      // Small OrnamentDivider under number
      const cardDivider = new OrnamentDivider(80);
      cardDivider.position.set(btnSize / 2 - 40, 70);
      card.addChild(cardDivider);

      // Mode label
      const labelStyle = new TextStyle({
        fontFamily: 'zpix, "PingFang SC", sans-serif',
        fontSize: 16,
        fill: 0x3A3530,
      });
      const labelText = new Text({ text: labels[count], style: labelStyle });
      labelText.anchor.set(0.5, 0);
      labelText.position.set(btnSize / 2, 80);
      card.addChild(labelText);

      // Desc
      const dStyle = new TextStyle({
        fontFamily: 'zpix, "PingFang SC", sans-serif',
        fontSize: 12,
        fill: 0x787068,
      });
      const dText = new Text({ text: descs[count], style: dStyle });
      dText.anchor.set(0.5, 0);
      dText.position.set(btnSize / 2, 108);
      card.addChild(dText);

      card.on('pointerover', () => {
        if (this.selectedCount !== count) {
          this.drawCountCard(card, btnSize, true);
        }
      });
      card.on('pointerout', () => {
        if (this.selectedCount !== count) {
          this.drawCountCard(card, btnSize, false);
        }
      });
      card.on('pointertap', () => {
        this.sceneManager.goTo('charSelect', { playerCount: count });
      });

      this.container.addChild(card);
      this.countButtons.push(card);
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

  private drawCountCard(card: Graphics, size: number, hover: boolean): void {
    card.clear();
    drawRPGPanel(card, {
      width: size, height: 140, radius: 6,
      fillColor: hover ? 0xEDE5D8 : 0xF0EBE0,
      fillAlpha: 0.92,
      shadow: true,
      innerFrame: true,
      cornerDots: true,
      accentColor: hover ? 0xD4A010 : undefined,
    });
  }
}
