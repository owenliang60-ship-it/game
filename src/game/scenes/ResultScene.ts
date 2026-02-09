import { Application, Text, TextStyle, Graphics, Sprite } from 'pixi.js';
import { BaseScene } from './BaseScene';
import { Button } from '../ui/Button';
import { OrnamentDivider } from '../ui/OrnamentDivider';
import type { SceneManager } from '../SceneManager';
import type { AssetLoader, CharacterName } from '../AssetLoader';

const NAME_TO_ASSET: Record<string, CharacterName> = {
  '骑士': 'knight',
  '装甲战士': 'armored-warrior',
  '弓箭手': 'archer',
};

/**
 * Battle result screen: winner sprite + stats panel + ornate dividers.
 */
export class ResultScene extends BaseScene {
  private sceneManager: SceneManager;
  private assetLoader: AssetLoader;

  constructor(app: Application, sceneManager: SceneManager, assetLoader: AssetLoader) {
    super(app);
    this.sceneManager = sceneManager;
    this.assetLoader = assetLoader;
  }

  onEnter(data?: Record<string, unknown>): void {
    this.container.removeChildren();

    const winner = data?.winner as string ?? '???';
    const isDraw = data?.isDraw as boolean ?? false;
    const rounds = data?.rounds as number ?? 0;

    // Background
    const bg = new Graphics();
    bg.rect(0, 0, 960, 540);
    bg.fill(0x0a0618);
    this.container.addChild(bg);

    // Center glow (brighter for victory)
    const glow = new Graphics();
    glow.ellipse(480, 250, 300, 200);
    glow.fill({ color: isDraw ? 0x181828 : 0x2a2018, alpha: 0.5 });
    this.container.addChild(glow);

    // Top ornament
    const topDivider = new OrnamentDivider(500);
    topDivider.position.set(230, 80);
    this.container.addChild(topDivider);

    // Victory/Draw banner
    const bannerStyle = new TextStyle({
      fontFamily: '"Press Start 2P", monospace',
      fontSize: 28,
      fill: isDraw ? 0x888888 : 0xFFD700,
      letterSpacing: 6,
      stroke: { color: 0x000000, width: 3 },
      dropShadow: isDraw ? undefined : {
        color: 0xffd700,
        blur: 12,
        distance: 0,
        alpha: 0.3,
      },
    });
    const banner = new Text({
      text: isDraw ? '平局!' : '胜利!',
      style: bannerStyle,
    });
    banner.anchor.set(0.5, 0);
    banner.position.set(480, 95);
    this.container.addChild(banner);

    // Bottom ornament
    const bottomDivider = new OrnamentDivider(500);
    bottomDivider.position.set(230, 140);
    this.container.addChild(bottomDivider);

    // Winner name + sprite
    if (!isDraw) {
      // Try to show winner sprite
      const baseName = winner.replace(/ \(你\)$/, '');
      const assetName = NAME_TO_ASSET[baseName];
      if (assetName) {
        try {
          const assets = this.assetLoader.getCharacter(assetName);
          const texture = assets.rotations['south'] ?? assets.rotations['S'];
          if (texture) {
            const sprite = new Sprite(texture);
            sprite.anchor.set(0.5, 0.5);
            sprite.position.set(480, 220);
            sprite.scale.set(1.2);
            this.container.addChild(sprite);
          }
        } catch {
          // fallback: no sprite
        }
      }

      const nameStyle = new TextStyle({
        fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
        fontSize: 22,
        fill: 0xf5e6c8,
        fontWeight: 'bold',
      });
      const nameText = new Text({ text: winner, style: nameStyle });
      nameText.anchor.set(0.5, 0);
      nameText.position.set(480, 280);
      this.container.addChild(nameText);
    }

    // Stats panel (dark card with borders)
    const panelW = 300;
    const panelH = 60;
    const panelX = (960 - panelW) / 2;
    const panelY = isDraw ? 200 : 320;

    const panel = new Graphics();
    // Outer border
    panel.roundRect(panelX - 1, panelY - 1, panelW + 2, panelH + 2, 7);
    panel.stroke({ color: 0x3a2a5a, width: 1, alpha: 0.5 });
    // Fill
    panel.roundRect(panelX, panelY, panelW, panelH, 6);
    panel.fill({ color: 0x0e0820, alpha: 0.85 });
    // Inner border
    panel.roundRect(panelX + 2, panelY + 2, panelW - 4, panelH - 4, 4);
    panel.stroke({ color: 0x2a1a3e, width: 1, alpha: 0.3 });
    this.container.addChild(panel);

    const statStyle = new TextStyle({
      fontFamily: '"VT323", monospace',
      fontSize: 20,
      fill: 0xAAAAAA,
    });
    const stats = new Text({
      text: `对战持续 ${rounds} 回合`,
      style: statStyle,
    });
    stats.anchor.set(0.5, 0.5);
    stats.position.set(480, panelY + panelH / 2);
    this.container.addChild(stats);

    // Buttons
    const btnY = panelY + panelH + 30;

    const replayBtn = new Button({
      text: '再来一局',
      width: 160,
      height: 48,
      fontSize: 14,
      primary: true,
    });
    replayBtn.position.set(320, btnY);
    replayBtn.on('pointertap', () => {
      this.sceneManager.goTo('charSelect');
    });
    this.container.addChild(replayBtn);

    const titleBtn = new Button({
      text: '返回标题',
      width: 160,
      height: 48,
      fontSize: 14,
      fill: 0x1a1a2a,
      borderColor: 0x666666,
      textColor: 0xAAAAAA,
    });
    titleBtn.position.set(520, btnY);
    titleBtn.on('pointertap', () => {
      this.sceneManager.goTo('title');
    });
    this.container.addChild(titleBtn);
  }
}
