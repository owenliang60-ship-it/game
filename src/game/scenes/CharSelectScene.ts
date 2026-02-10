import { Application, Text, TextStyle, Graphics, Sprite } from 'pixi.js';
import { BaseScene } from './BaseScene';
import { Button } from '../ui/Button';
import { OrnamentDivider } from '../ui/OrnamentDivider';
import type { SceneManager } from '../SceneManager';
import type { CharacterClass, BattleConfig } from '@/core/types';
import type { AssetLoader, CharacterName } from '../AssetLoader';

interface CharCardInfo {
  characterClass: CharacterClass;
  name: string;
  assetName: CharacterName;
  hp: number;
  mp: number;
  atk: number;
  def: number;
  agi: number;
  skills: number;
  color: number;
  spriteScale: number;
}

const CHARACTERS: CharCardInfo[] = [
  { characterClass: 'knight', name: '骑士', assetName: 'knight', hp: 300, mp: 150, atk: 30, def: 2, agi: 7, skills: 6, color: 0x5A9BD5, spriteScale: 0.41 },
  { characterClass: 'armored-warrior', name: '装甲战士', assetName: 'armored-warrior', hp: 350, mp: 120, atk: 25, def: 3, agi: 4, skills: 5, color: 0xD45A5A, spriteScale: 0.55 },
  { characterClass: 'archer', name: '弓箭手', assetName: 'archer', hp: 270, mp: 150, atk: 20, def: 1.5, agi: 6, skills: 6, color: 0x5ABD6A, spriteScale: 0.55 },
];

/**
 * Character selection screen with sprite previews, light cards, and class colors.
 */
export class CharSelectScene extends BaseScene {
  private sceneManager: SceneManager;
  private assetLoader: AssetLoader;
  private selectedIndex = -1;
  private playerCount = 3;
  private cards: Graphics[] = [];

  constructor(app: Application, sceneManager: SceneManager, assetLoader: AssetLoader) {
    super(app);
    this.sceneManager = sceneManager;
    this.assetLoader = assetLoader;
  }

  onEnter(data?: Record<string, unknown>): void {
    this.container.removeChildren();
    this.selectedIndex = -1;
    this.cards = [];
    this.playerCount = (data?.playerCount as number) ?? 3;

    // Background
    const bg = new Graphics();
    bg.rect(0, 0, 960, 540);
    bg.fill(0xE8E0D4);
    this.container.addChild(bg);

    // Center glow
    const glow = new Graphics();
    glow.ellipse(480, 280, 400, 240);
    glow.fill({ color: 0xF5EDE0, alpha: 0.4 });
    this.container.addChild(glow);

    // Title
    const titleStyle = new TextStyle({
      fontFamily: '"Press Start 2P", monospace',
      fontSize: 18,
      fill: 0x8B6914,
      letterSpacing: 4,
    });
    const title = new Text({ text: '选择角色', style: titleStyle });
    title.anchor.set(0.5, 0);
    title.position.set(480, 20);
    this.container.addChild(title);

    // Divider
    const divider = new OrnamentDivider(400);
    divider.position.set(280, 55);
    this.container.addChild(divider);

    // Character cards
    const cardWidth = 240;
    const cardGap = 30;
    const totalWidth = CHARACTERS.length * cardWidth + (CHARACTERS.length - 1) * cardGap;
    const startX = (960 - totalWidth) / 2;

    for (let i = 0; i < CHARACTERS.length; i++) {
      const char = CHARACTERS[i];
      const card = this.createCharCard(char, i);
      card.position.set(startX + i * (cardWidth + cardGap), 70);
      this.container.addChild(card);
      this.cards.push(card);
    }

    // Confirm button
    const confirmBtn = new Button({
      text: '确认选择',
      width: 180,
      height: 48,
      fontSize: 14,
      primary: true,
    });
    confirmBtn.enabled = false;
    confirmBtn.position.set(480 - 90, 470);
    confirmBtn.on('pointertap', () => {
      if (this.selectedIndex < 0) return;
      this.startBattle();
    });
    this.container.addChild(confirmBtn);
    (this as any)._confirmBtn = confirmBtn;

    // Back button
    const backBtn = new Button({
      text: '返回',
      width: 80,
      height: 36,
      fontSize: 12,
    });
    backBtn.position.set(20, 480);
    backBtn.on('pointertap', () => {
      this.sceneManager.goTo('playerCount');
    });
    this.container.addChild(backBtn);
  }

  private createCharCard(char: CharCardInfo, index: number): Graphics {
    const w = 240;
    const h = 385;

    const card = new Graphics();
    this.drawCard(card, w, h, char.color, false);
    card.eventMode = 'static';
    card.cursor = 'pointer';

    // Character name with class color
    const nameStyle = new TextStyle({
      fontFamily: '"Press Start 2P", monospace',
      fontSize: 12,
      fill: char.color,
    });
    const name = new Text({ text: char.name, style: nameStyle });
    name.anchor.set(0.5, 0);
    name.position.set(w / 2, 12);
    card.addChild(name);

    // Character sprite
    try {
      const assets = this.assetLoader.getCharacter(char.assetName);
      const texture = assets.rotations['south'] ?? assets.rotations['S'];
      if (texture) {
        const sprite = new Sprite(texture);
        sprite.anchor.set(0.5, 0.5);
        sprite.position.set(w / 2, 85);
        sprite.scale.set(char.spriteScale);
        card.addChild(sprite);
      }
    } catch {
      // Fallback placeholder
      const placeholder = new Graphics();
      placeholder.rect(w / 2 - 24, 60, 48, 48);
      placeholder.fill({ color: char.color, alpha: 0.3 });
      card.addChild(placeholder);
    }

    // Stats (with VT323 font for values)
    const stats = [
      { label: 'HP', value: char.hp, color: 0x22CC44 },
      { label: 'MP', value: char.mp, color: 0x2266CC },
      { label: 'ATK', value: char.atk, color: 0xFF4444 },
      { label: 'DEF', value: char.def, color: 0xCCAA44 },
      { label: 'AGI', value: char.agi, color: 0x88CC88 },
      { label: '技能', value: char.skills, color: 0xCC88FF },
    ];

    const statLabelStyle = new TextStyle({
      fontFamily: '"PingFang SC", "Microsoft YaHei", monospace',
      fontSize: 12,
      fill: 0x787068,
    });

    let yPos = 130;
    for (const stat of stats) {
      const label = new Text({ text: `${stat.label}:`, style: statLabelStyle });
      label.position.set(25, yPos);
      card.addChild(label);

      const valStyle = new TextStyle({
        fontFamily: '"VT323", monospace',
        fontSize: 16,
        fill: stat.color,
        fontWeight: 'bold',
      });
      const val = new Text({ text: `${stat.value}`, style: valStyle });
      val.position.set(85, yPos - 1);
      card.addChild(val);

      // Stat bar background
      const barBg = new Graphics();
      barBg.rect(130, yPos + 3, 85, 6);
      barBg.fill(0xD8D4CC);
      barBg.stroke({ color: 0xC8C0B0, width: 1, alpha: 0.3 });
      card.addChild(barBg);

      const maxValues: Record<string, number> = { HP: 400, MP: 200, ATK: 40, DEF: 4, AGI: 10, '技能': 8 };
      const ratio = stat.value / (maxValues[stat.label] ?? 100);

      // Gradient bar (darker bottom, brighter top)
      const barFill = new Graphics();
      const barW = 85 * Math.min(1, ratio);
      barFill.rect(130, yPos + 3, barW, 6);
      barFill.fill({ color: this.darken(stat.color, 0.6) });
      barFill.rect(130, yPos + 3, barW, 3);
      barFill.fill(stat.color);
      card.addChild(barFill);

      yPos += 24;
    }

    // Class description
    const descriptions: Record<string, string> = {
      '骑士': '高速全能型\n强力冲锋与追击',
      '装甲战士': '重装防御型\n顶盾+反震硬控',
      '弓箭手': '远程输出型\n游击战术+箭雨',
    };
    const descStyle = new TextStyle({
      fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
      fontSize: 11,
      fill: 0x787068,
      wordWrap: true,
      wordWrapWidth: w - 40,
      lineHeight: 16,
    });
    const desc = new Text({ text: descriptions[char.name] ?? '', style: descStyle });
    desc.position.set(20, yPos + 8);
    card.addChild(desc);

    // Click handler
    card.on('pointertap', () => this.selectCard(index));
    card.on('pointerover', () => {
      if (this.selectedIndex !== index) {
        this.drawCard(card, w, h, char.color, true);
      }
    });
    card.on('pointerout', () => {
      if (this.selectedIndex !== index) {
        this.drawCard(card, w, h, char.color, false);
      }
    });

    return card;
  }

  private drawCard(card: Graphics, w: number, h: number, classColor: number, hover: boolean): void {
    card.clear();

    // Outer border
    card.roundRect(-1, -1, w + 2, h + 2, 9);
    card.stroke({ color: hover ? 0xC8B898 : 0xD8D0C4, width: 1, alpha: 0.5 });

    // Inner fill
    card.roundRect(0, 0, w, h, 8);
    card.fill({ color: hover ? 0xEDE5D8 : 0xF5F0E8, alpha: 0.92 });

    // Inner border
    card.roundRect(2, 2, w - 4, h - 4, 6);
    card.stroke({ color: hover ? 0xC8B898 : 0xE0D8CC, width: 1, alpha: 0.4 });

    // Class color accent at top
    card.rect(4, 3, w - 8, 2);
    card.fill({ color: classColor, alpha: hover ? 0.6 : 0.3 });
  }

  private selectCard(index: number): void {
    this.selectedIndex = index;

    for (let i = 0; i < this.cards.length; i++) {
      const card = this.cards[i];
      const char = CHARACTERS[i];
      const w = 240;
      const h = 385;
      card.clear();

      if (i === index) {
        // Selected: gold border, warm background
        card.roundRect(-2, -2, w + 4, h + 4, 10);
        card.fill({ color: 0xD4A010, alpha: 0.15 });
        card.roundRect(0, 0, w, h, 8);
        card.fill({ color: 0xFFF8E0, alpha: 0.95 });
        card.stroke({ color: 0xD4A010, width: 2 });
        card.roundRect(2, 2, w - 4, h - 4, 6);
        card.stroke({ color: 0xC8B898, width: 1, alpha: 0.5 });
        // Gold top glow
        card.rect(4, 3, w - 8, 3);
        card.fill({ color: 0xD4A010, alpha: 0.5 });
      } else {
        // Unselected: slightly dimmed
        card.roundRect(0, 0, w, h, 8);
        card.fill({ color: 0xF5F0E8, alpha: 0.7 });
        card.stroke({ color: 0xD8D0C4, width: 1, alpha: 0.3 });
        card.rect(4, 3, w - 8, 2);
        card.fill({ color: char.color, alpha: 0.15 });
      }
    }

    // Enable confirm button
    const confirmBtn = (this as any)._confirmBtn as Button;
    if (confirmBtn) confirmBtn.enabled = true;
  }

  private darken(color: number, factor: number): number {
    const r = Math.floor(((color >> 16) & 0xff) * factor);
    const g = Math.floor(((color >> 8) & 0xff) * factor);
    const b = Math.floor((color & 0xff) * factor);
    return (r << 16) | (g << 8) | b;
  }

  private startBattle(): void {
    const playerChar = CHARACTERS[this.selectedIndex];

    const fighters: BattleConfig['fighters'] = [];

    fighters.push({
      characterClass: playerChar.characterClass,
      isPlayer: true,
      displayName: `${playerChar.name} (你)`,
    });

    const remaining = CHARACTERS.filter((_, i) => i !== this.selectedIndex);
    const needed = this.playerCount - 1;
    const shuffled = [...remaining].sort(() => Math.random() - 0.5);
    const opponents = shuffled.slice(0, needed);

    for (const opp of opponents) {
      fighters.push({
        characterClass: opp.characterClass,
        isPlayer: false,
        displayName: opp.name,
      });
    }

    this.sceneManager.goTo('battle', {
      battleConfig: { fighters, aiDifficulty: 'normal' },
    });
  }
}
