import { Application, Text, TextStyle, Graphics, Sprite } from 'pixi.js';
import { BaseScene } from './BaseScene';
import { Button } from '../ui/Button';
import { OrnamentDivider } from '../ui/OrnamentDivider';
import { FrameBorder } from '../ui/FrameBorder';
import { drawRPGPanel } from '../ui/RPGPanel';
import { TweenManager } from '../animation/TweenManager';
import { Easing } from '../animation/Easing';
import type { SceneManager } from '../SceneManager';
import type { AssetLoader, CharacterName } from '../AssetLoader';

const NAME_TO_ASSET: Record<string, CharacterName> = {
  '骑士': 'knight',
  '装甲战士': 'armored-warrior',
  '弓箭手': 'archer',
};

/** Per-character result scale (knight=128px canvas needs smaller scale) */
const RESULT_SCALE: Record<string, number> = {
  'knight': 0.71,           // 128px × 0.71 ≈ 91px
  'armored-warrior': 0.95,  // 96px × 0.95 ≈ 91px
  'archer': 0.95,           // 96px × 0.95 ≈ 91px
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
    bg.fill(0xE8E0D4);
    this.container.addChild(bg);

    // Center glow (warmer for victory)
    const glow = new Graphics();
    glow.ellipse(480, 250, 300, 200);
    glow.fill({ color: isDraw ? 0xF0EBE0 : 0xFAF0D8, alpha: 0.5 });
    this.container.addChild(glow);

    // Decorative frame border
    const frame = new FrameBorder();
    this.container.addChild(frame);

    // Top ornament (ornate variant)
    const topDivider = new OrnamentDivider(500, 'ornate');
    topDivider.position.set(230, 80);
    this.container.addChild(topDivider);

    // Victory/Draw banner shadow
    const shadowStyle = new TextStyle({
      fontFamily: 'zpix, "Press Start 2P", monospace',
      fontSize: 28,
      fill: 0xD4C4A0,
      letterSpacing: 6,
    });
    const bannerShadow = new Text({
      text: isDraw ? '平局!' : '胜利!',
      style: shadowStyle,
    });
    bannerShadow.anchor.set(0.5, 0);
    bannerShadow.position.set(482, 97);
    bannerShadow.alpha = 0.4;
    this.container.addChild(bannerShadow);

    // Victory/Draw banner
    const bannerStyle = new TextStyle({
      fontFamily: 'zpix, "Press Start 2P", monospace',
      fontSize: 28,
      fill: isDraw ? 0x787068 : 0x8B6914,
      letterSpacing: 6,
      stroke: { color: 0xE8E0D4, width: 2 },
    });
    const banner = new Text({
      text: isDraw ? '平局!' : '胜利!',
      style: bannerStyle,
    });
    banner.anchor.set(0.5, 0);
    banner.position.set(480, 95);
    this.container.addChild(banner);

    // Victory text entrance: scale bounce
    if (!isDraw) {
      banner.scale.set(1.5);
      banner.alpha = 0;
      bannerShadow.alpha = 0;
      TweenManager.add({
        target: banner,
        props: { alpha: 1 },
        duration: 100,
        easing: Easing.linear,
      });
      TweenManager.add({
        target: banner.scale,
        props: { x: 1.0, y: 1.0 },
        duration: 500,
        easing: Easing.easeOutBack,
      });
      TweenManager.add({
        target: bannerShadow,
        props: { alpha: 0.4 },
        duration: 400,
        delay: 200,
        easing: Easing.linear,
      });
    }

    // Bottom ornament
    const bottomDivider = new OrnamentDivider(500, 'ornate');
    bottomDivider.position.set(230, 140);
    this.container.addChild(bottomDivider);

    // Winner name + sprite
    if (!isDraw) {
      const baseName = winner.replace(/ \(你\)$/, '');
      const assetName = NAME_TO_ASSET[baseName];
      if (assetName) {
        try {
          const assets = this.assetLoader.getCharacter(assetName);
          const texture = assets.rotations['south'] ?? assets.rotations['S'];
          if (texture) {
            // Gold glow behind winner
            const winnerGlow = new Graphics();
            winnerGlow.ellipse(480, 220, 60, 50);
            winnerGlow.fill({ color: 0xD4A010, alpha: 0.12 });
            this.container.addChild(winnerGlow);

            const sprite = new Sprite(texture);
            sprite.anchor.set(0.5, 0.5);
            sprite.position.set(480, 220);
            sprite.scale.set(RESULT_SCALE[assetName] ?? 0.95);
            this.container.addChild(sprite);

            // Ground shadow below sprite
            const groundShadow = new Graphics();
            groundShadow.ellipse(480, 260, 25, 8);
            groundShadow.fill({ color: 0x8B6914, alpha: 0.15 });
            this.container.addChild(groundShadow);
          }
        } catch {
          // fallback: no sprite
        }
      }

      const nameStyle = new TextStyle({
        fontFamily: 'zpix, "PingFang SC", sans-serif',
        fontSize: 22,
        fill: 0x3A3530,
        fontWeight: 'bold',
      });
      const nameText = new Text({ text: winner, style: nameStyle });
      nameText.anchor.set(0.5, 0);
      nameText.position.set(480, 280);
      this.container.addChild(nameText);
    }

    // Stats panel (RPG Panel)
    const panelW = 300;
    const panelH = 60;
    const panelX = (960 - panelW) / 2;
    const panelY = isDraw ? 200 : 320;

    const panel = new Graphics();
    drawRPGPanel(panel, {
      width: panelW, height: panelH, radius: 6,
      fillColor: 0xF0EBE0, fillAlpha: 0.88,
      shadow: true, innerFrame: true, cornerDots: true,
    });
    panel.position.set(panelX, panelY);
    this.container.addChild(panel);

    const statStyle = new TextStyle({
      fontFamily: '"VT323", monospace',
      fontSize: 20,
      fill: 0x606060,
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
      fill: 0xE8E0D0,
      borderColor: 0xC8B898,
      textColor: 0x606060,
    });
    titleBtn.position.set(520, btnY);
    titleBtn.on('pointertap', () => {
      this.sceneManager.goTo('title');
    });
    this.container.addChild(titleBtn);
  }
}
