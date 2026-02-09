import { Application, Text, TextStyle, Graphics, Sprite } from 'pixi.js';
import { BaseScene } from './BaseScene';
import { Button } from '../ui/Button';
import { OrnamentDivider } from '../ui/OrnamentDivider';
import type { SceneManager } from '../SceneManager';
import type { AssetLoader, CharacterName } from '../AssetLoader';

/**
 * Title screen: multi-layer gradient bg + pixel font title + character previews + ornate dividers.
 */
export class TitleScene extends BaseScene {
  private sceneManager: SceneManager;
  private assetLoader: AssetLoader;

  constructor(app: Application, sceneManager: SceneManager, assetLoader: AssetLoader) {
    super(app);
    this.sceneManager = sceneManager;
    this.assetLoader = assetLoader;
  }

  onEnter(): void {
    this.container.removeChildren();

    // Multi-layer background (radial-ish: center warm, edges dark)
    const bg = new Graphics();
    bg.rect(0, 0, 960, 540);
    bg.fill(0x0a0618);
    this.container.addChild(bg);

    // Radial glow in center (simulated with concentric ellipses)
    const glow = new Graphics();
    glow.ellipse(480, 260, 400, 250);
    glow.fill({ color: 0x1a1428, alpha: 0.6 });
    this.container.addChild(glow);
    const glow2 = new Graphics();
    glow2.ellipse(480, 260, 250, 150);
    glow2.fill({ color: 0x221a30, alpha: 0.4 });
    this.container.addChild(glow2);
    const glow3 = new Graphics();
    glow3.ellipse(480, 240, 120, 80);
    glow3.fill({ color: 0x2a2038, alpha: 0.3 });
    this.container.addChild(glow3);

    // Top ornament divider
    const topDivider = new OrnamentDivider(500);
    topDivider.position.set(230, 110);
    this.container.addChild(topDivider);

    // Title: Press Start 2P for pixel aesthetic
    const titleStyle = new TextStyle({
      fontFamily: '"Press Start 2P", monospace',
      fontSize: 32,
      fill: 0xFFD700,
      letterSpacing: 8,
      stroke: { color: 0x4a2800, width: 3 },
      dropShadow: {
        color: 0x000000,
        blur: 6,
        distance: 3,
        angle: Math.PI / 4,
        alpha: 0.5,
      },
    });
    const title = new Text({ text: '口头对战', style: titleStyle });
    title.anchor.set(0.5, 0);
    title.position.set(480, 125);
    this.container.addChild(title);

    // Bottom ornament divider
    const bottomDivider = new OrnamentDivider(500);
    bottomDivider.position.set(230, 175);
    this.container.addChild(bottomDivider);

    // Subtitle
    const subStyle = new TextStyle({
      fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
      fontSize: 16,
      fill: 0xC8A050,
      letterSpacing: 4,
    });
    const subtitle = new Text({ text: '回合制策略对战', style: subStyle });
    subtitle.anchor.set(0.5, 0);
    subtitle.position.set(480, 190);
    this.container.addChild(subtitle);

    // Character previews (3 sprites with labels)
    const characters: { name: CharacterName; label: string; color: number }[] = [
      { name: 'knight', label: '骑士', color: 0x5A9BD5 },
      { name: 'armored-warrior', label: '装甲战士', color: 0xD45A5A },
      { name: 'archer', label: '弓箭手', color: 0x5ABD6A },
    ];

    const charStartX = 480 - (characters.length - 1) * 120;
    for (let i = 0; i < characters.length; i++) {
      const charInfo = characters[i];
      const x = charStartX + i * 120;
      const y = 290;

      try {
        const assets = this.assetLoader.getCharacter(charInfo.name);
        const texture = assets.rotations['south'] ?? assets.rotations['S'];
        if (texture) {
          const sprite = new Sprite(texture);
          sprite.anchor.set(0.5, 0.5);
          sprite.position.set(x, y);
          sprite.scale.set(0.8);
          this.container.addChild(sprite);
        }
      } catch {
        // Fallback: placeholder square
        const placeholder = new Graphics();
        placeholder.rect(x - 24, y - 24, 48, 48);
        placeholder.fill({ color: charInfo.color, alpha: 0.3 });
        placeholder.stroke({ color: charInfo.color, width: 1 });
        this.container.addChild(placeholder);
      }

      // Character label
      const labelStyle = new TextStyle({
        fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
        fontSize: 11,
        fill: charInfo.color,
      });
      const label = new Text({ text: charInfo.label, style: labelStyle });
      label.anchor.set(0.5, 0);
      label.position.set(x, y + 40);
      this.container.addChild(label);
    }

    // Start button (primary style)
    const startBtn = new Button({
      text: '开始游戏',
      width: 200,
      height: 50,
      fontSize: 14,
      primary: true,
    });
    startBtn.position.set(480 - 100, 380);
    startBtn.on('pointertap', () => {
      this.sceneManager.goTo('playerCount');
    });
    this.container.addChild(startBtn);

    // Version
    const verStyle = new TextStyle({
      fontFamily: '"VT323", monospace',
      fontSize: 14,
      fill: 0x444444,
    });
    const version = new Text({ text: 'v0.3.0-alpha  M3', style: verStyle });
    version.anchor.set(1, 1);
    version.position.set(950, 530);
    this.container.addChild(version);
  }
}
