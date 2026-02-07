import { Application, Container, Text, TextStyle } from 'pixi.js';
import type { AssetLoader } from '../AssetLoader';
import { CharacterSprite } from '../entities/CharacterSprite';
import type { Direction, AnimationState } from '../entities/CharacterSprite';

/**
 * Battle scene: displays characters in a 梦幻西游-style left-right layout.
 * This is the demo scene for M1 - shows all 3 characters with idle animation.
 */
export class BattleScene {
  readonly container = new Container();
  private app: Application;
  private assetLoader: AssetLoader;
  private characters: CharacterSprite[] = [];
  private lastTime = 0;

  constructor(app: Application, assetLoader: AssetLoader) {
    this.app = app;
    this.assetLoader = assetLoader;
  }

  start() {
    this.buildScene();
    this.lastTime = performance.now();
    this.app.ticker.add(() => this.update());
  }

  private buildScene() {
    // Title text
    const titleStyle = new TextStyle({
      fontFamily: 'monospace',
      fontSize: 24,
      fill: 0xffffff,
      align: 'center',
    });
    const title = new Text({ text: '口头对战游戏 - M1 Demo', style: titleStyle });
    title.anchor.set(0.5, 0);
    title.position.set(480, 16);
    this.container.addChild(title);

    // Info text
    const infoStyle = new TextStyle({
      fontFamily: 'monospace',
      fontSize: 14,
      fill: 0xaaaaaa,
    });
    const info = new Text({
      text: '3 characters loaded | idle animation playing | press 1-3 to cycle animations',
      style: infoStyle,
    });
    info.anchor.set(0.5, 0);
    info.position.set(480, 50);
    this.container.addChild(info);

    // Ground line
    const groundY = 400;

    // Place 3 characters in battle formation
    const charConfigs: { name: string; x: number; dir: Direction; label: string }[] = [
      { name: 'knight', x: 200, dir: 'east', label: '骑士' },
      { name: 'armored-warrior', x: 480, dir: 'south', label: '装甲战士' },
      { name: 'archer', x: 760, dir: 'west', label: '弓箭手' },
    ];

    for (const config of charConfigs) {
      const assets = this.assetLoader.getCharacter(config.name);
      const charSprite = new CharacterSprite(assets, 3);
      charSprite.setPosition(config.x, groundY);
      charSprite.setDirection(config.dir);
      charSprite.play('idle');
      this.container.addChild(charSprite.container);
      this.characters.push(charSprite);

      // Character name label
      const labelStyle = new TextStyle({
        fontFamily: 'monospace',
        fontSize: 14,
        fill: 0xffcc00,
      });
      const label = new Text({ text: config.label, style: labelStyle });
      label.anchor.set(0.5, 0);
      label.position.set(config.x, groundY + 8);
      this.container.addChild(label);
    }

    // Keyboard controls for demo
    const animStates: AnimationState[] = ['idle', 'attack', 'hit', 'death', 'run', 'defense', 'escape', 'idle-alt'];
    let currentAnimIndex = 0;

    const animLabel = new Text({
      text: `Animation: idle (←→ to change)`,
      style: new TextStyle({ fontFamily: 'monospace', fontSize: 16, fill: 0x66ff66 }),
    });
    animLabel.anchor.set(0.5, 0);
    animLabel.position.set(480, 480);
    this.container.addChild(animLabel);

    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        if (e.key === 'ArrowRight') {
          currentAnimIndex = (currentAnimIndex + 1) % animStates.length;
        } else {
          currentAnimIndex = (currentAnimIndex - 1 + animStates.length) % animStates.length;
        }
        const state = animStates[currentAnimIndex];
        const isLoop = state === 'idle' || state === 'idle-alt' || state === 'run' || state === 'escape';
        for (const char of this.characters) {
          char.play(state, isLoop, () => {
            // After non-looping animation, return to idle
            char.play('idle');
          });
        }
        animLabel.text = `Animation: ${state} (←→ to change)`;
      }
    });
  }

  private update() {
    const now = performance.now();
    const deltaMs = now - this.lastTime;
    this.lastTime = now;

    for (const char of this.characters) {
      char.update(deltaMs);
    }
  }
}
