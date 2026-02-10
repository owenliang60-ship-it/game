import { Application, Text, TextStyle, Graphics, Sprite } from 'pixi.js';
import { BaseScene } from './BaseScene';
import { Button } from '../ui/Button';
import { OrnamentDivider } from '../ui/OrnamentDivider';
import { FrameBorder } from '../ui/FrameBorder';
import { TweenManager } from '../animation/TweenManager';
import { Easing } from '../animation/Easing';
import type { SceneManager } from '../SceneManager';
import type { AssetLoader, CharacterName } from '../AssetLoader';

/**
 * Title screen: FrameBorder + multi-layer glow + pixel font title + character previews.
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

    // Light warm background
    const bg = new Graphics();
    bg.rect(0, 0, 960, 540);
    bg.fill(0xE8E0D4);
    this.container.addChild(bg);

    // Multi-layer glow (3 layers, decreasing)
    const glow3 = new Graphics();
    glow3.ellipse(480, 260, 420, 260);
    glow3.fill({ color: 0xF0E8D8, alpha: 0.35 });
    this.container.addChild(glow3);
    const glow2 = new Graphics();
    glow2.ellipse(480, 260, 300, 180);
    glow2.fill({ color: 0xF5EDE0, alpha: 0.5 });
    this.container.addChild(glow2);
    const glow1 = new Graphics();
    glow1.ellipse(480, 260, 180, 110);
    glow1.fill({ color: 0xFAF4E8, alpha: 0.4 });
    this.container.addChild(glow1);

    // Decorative frame border
    const frame = new FrameBorder();
    this.container.addChild(frame);

    // Top ornament divider (ornate variant)
    const topDivider = new OrnamentDivider(500, 'ornate');
    topDivider.position.set(230, 110);
    this.container.addChild(topDivider);

    // Title shadow
    const shadowStyle = new TextStyle({
      fontFamily: 'zpix, "Press Start 2P", monospace',
      fontSize: 32,
      fill: 0xD4C4A0,
      letterSpacing: 8,
    });
    const titleShadow = new Text({ text: '口头对战', style: shadowStyle });
    titleShadow.anchor.set(0.5, 0);
    titleShadow.position.set(482, 127);
    titleShadow.alpha = 0.5;
    this.container.addChild(titleShadow);

    // Title: zpix for pixel aesthetic
    const titleStyle = new TextStyle({
      fontFamily: 'zpix, "Press Start 2P", monospace',
      fontSize: 32,
      fill: 0x8B6914,
      letterSpacing: 8,
      stroke: { color: 0xD4C4A0, width: 2 },
    });
    const title = new Text({ text: '口头对战', style: titleStyle });
    title.anchor.set(0.5, 0);
    title.position.set(480, 125);
    this.container.addChild(title);

    // Title entrance animation: fade in + slide up
    title.alpha = 0;
    title.y += 15;
    titleShadow.alpha = 0;
    titleShadow.y += 15;
    TweenManager.add({
      target: title,
      props: { alpha: 1, y: 125 },
      duration: 600,
      easing: Easing.easeOutCubic,
    });
    TweenManager.add({
      target: titleShadow,
      props: { alpha: 0.5, y: 127 },
      duration: 600,
      easing: Easing.easeOutCubic,
    });

    // Bottom ornament divider (ornate variant)
    const bottomDivider = new OrnamentDivider(500, 'ornate');
    bottomDivider.position.set(230, 175);
    this.container.addChild(bottomDivider);

    // Subtitle
    const subStyle = new TextStyle({
      fontFamily: 'zpix, "PingFang SC", sans-serif',
      fontSize: 16,
      fill: 0x787068,
      letterSpacing: 4,
    });
    const subtitle = new Text({ text: '回合制策略对战', style: subStyle });
    subtitle.anchor.set(0.5, 0);
    subtitle.position.set(480, 190);
    this.container.addChild(subtitle);

    // Character previews (3 sprites with labels)
    const characters: { name: CharacterName; label: string; color: number; scale: number }[] = [
      { name: 'knight', label: '骑士', color: 0x5A9BD5, scale: 0.49 },
      { name: 'armored-warrior', label: '装甲战士', color: 0xD45A5A, scale: 0.65 },
      { name: 'archer', label: '弓箭手', color: 0x5ABD6A, scale: 0.65 },
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
          sprite.scale.set(charInfo.scale);
          this.container.addChild(sprite);

          // Staggered fade-in
          sprite.alpha = 0;
          TweenManager.add({
            target: sprite,
            props: { alpha: 1 },
            duration: 400,
            delay: 300 + i * 150,
            easing: Easing.easeOutQuad,
          });
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
        fontFamily: 'zpix, "PingFang SC", sans-serif',
        fontSize: 11,
        fill: charInfo.color,
      });
      const label = new Text({ text: charInfo.label, style: labelStyle });
      label.anchor.set(0.5, 0);
      label.position.set(x, y + 40);
      this.container.addChild(label);
    }

    // Floating gold particles (subtle ambient)
    for (let i = 0; i < 4; i++) {
      const particle = new Graphics();
      particle.rect(0, 0, 2, 2);
      particle.fill({ color: 0xC8A050, alpha: 0.4 });
      const px = 300 + Math.random() * 360;
      const py = 220 + Math.random() * 100;
      particle.position.set(px, py);
      this.container.addChild(particle);

      // Slow float upward
      particle.alpha = 0;
      const floatUp = () => {
        particle.alpha = 0;
        particle.y = py;
        TweenManager.add({
          target: particle,
          props: { alpha: 0.5 },
          duration: 800,
          delay: i * 600,
          easing: Easing.linear,
        }).then(() => {
          TweenManager.add({
            target: particle,
            props: { y: py - 30, alpha: 0 },
            duration: 2000,
            easing: Easing.linear,
          }).then(floatUp);
        });
      };
      floatUp();
    }

    // Darkened corner vignette (subtle)
    const vignette = new Graphics();
    // Top-left corner
    vignette.rect(0, 0, 80, 80);
    vignette.fill({ color: 0xC8B898, alpha: 0.08 });
    // Top-right
    vignette.rect(880, 0, 80, 80);
    vignette.fill({ color: 0xC8B898, alpha: 0.08 });
    // Bottom-left
    vignette.rect(0, 460, 80, 80);
    vignette.fill({ color: 0xC8B898, alpha: 0.08 });
    // Bottom-right
    vignette.rect(880, 460, 80, 80);
    vignette.fill({ color: 0xC8B898, alpha: 0.08 });
    this.container.addChild(vignette);

    // Start button (primary style) with breathing animation
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

    // Breathing scale animation for start button
    const breathe = () => {
      TweenManager.add({
        target: startBtn.scale,
        props: { x: 1.02, y: 1.02 },
        duration: 1200,
        easing: Easing.easeInOutQuad,
      }).then(() => {
        TweenManager.add({
          target: startBtn.scale,
          props: { x: 1.0, y: 1.0 },
          duration: 1200,
          easing: Easing.easeInOutQuad,
        }).then(breathe);
      });
    };
    breathe();

    // Version
    const verStyle = new TextStyle({
      fontFamily: '"VT323", monospace',
      fontSize: 14,
      fill: 0xA09890,
    });
    const version = new Text({ text: 'v1.0.0-beta  M4', style: verStyle });
    version.anchor.set(1, 1);
    version.position.set(950, 530);
    this.container.addChild(version);
  }
}
