import { Application, Text, TextStyle, Graphics } from 'pixi.js';
import { BaseScene } from './BaseScene';
import { Button } from '../ui/Button';
import type { SceneManager } from '../SceneManager';
import type { CharacterClass, BattleConfig } from '@/core/types';
import { getCharacterDef } from '@/characters';

interface CharCardInfo {
  characterClass: CharacterClass;
  name: string;
  hp: number;
  mp: number;
  atk: number;
  def: number;
  agi: number;
  skills: number;
}

const CHARACTERS: CharCardInfo[] = [
  { characterClass: 'knight', name: '骑士', hp: 300, mp: 150, atk: 30, def: 2, agi: 7, skills: 6 },
  { characterClass: 'armored-warrior', name: '装甲战士', hp: 350, mp: 120, atk: 25, def: 3, agi: 4, skills: 5 },
  { characterClass: 'archer', name: '弓箭手', hp: 270, mp: 150, atk: 20, def: 1.5, agi: 6, skills: 6 },
];

/**
 * Character selection screen.
 * Player picks one character, AI opponents are randomly assigned from remaining.
 */
export class CharSelectScene extends BaseScene {
  private sceneManager: SceneManager;
  private selectedIndex = -1;
  private playerCount = 3;
  private cards: Graphics[] = [];

  constructor(app: Application, sceneManager: SceneManager) {
    super(app);
    this.sceneManager = sceneManager;
  }

  onEnter(data?: Record<string, unknown>): void {
    this.container.removeChildren();
    this.selectedIndex = -1;
    this.cards = [];
    this.playerCount = (data?.playerCount as number) ?? 3;

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
    const title = new Text({ text: '选择角色', style: titleStyle });
    title.anchor.set(0.5, 0);
    title.position.set(480, 30);
    this.container.addChild(title);

    // Character cards
    const cardWidth = 240;
    const cardGap = 30;
    const totalWidth = CHARACTERS.length * cardWidth + (CHARACTERS.length - 1) * cardGap;
    const startX = (960 - totalWidth) / 2;

    for (let i = 0; i < CHARACTERS.length; i++) {
      const char = CHARACTERS[i];
      const card = this.createCharCard(char, i);
      card.position.set(startX + i * (cardWidth + cardGap), 80);
      this.container.addChild(card);
      this.cards.push(card);
    }

    // Confirm button
    const confirmBtn = new Button({
      text: '确认选择',
      width: 160,
      height: 44,
      fontSize: 16,
    });
    confirmBtn.enabled = false;
    confirmBtn.position.set(480 - 80, 470);
    confirmBtn.on('pointertap', () => {
      if (this.selectedIndex < 0) return;
      this.startBattle();
    });
    this.container.addChild(confirmBtn);
    // Store reference to update enabled state
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
    const h = 370;

    const card = new Graphics();
    card.roundRect(0, 0, w, h, 8);
    card.fill({ color: 0x1a0e2e, alpha: 0.9 });
    card.stroke({ color: 0x5a3a7a, width: 1 });
    card.eventMode = 'static';
    card.cursor = 'pointer';

    // Character name
    const nameStyle = new TextStyle({
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: 22,
      fill: 0xFFD700,
      fontWeight: 'bold',
    });
    const name = new Text({ text: char.name, style: nameStyle });
    name.anchor.set(0.5, 0);
    name.position.set(w / 2, 15);
    card.addChild(name);

    // Stats
    const stats = [
      { label: 'HP', value: char.hp, color: 0x22CC44 },
      { label: 'MP', value: char.mp, color: 0x4488FF },
      { label: 'ATK', value: char.atk, color: 0xFF4444 },
      { label: 'DEF', value: char.def, color: 0xCCAA44 },
      { label: 'AGI', value: char.agi, color: 0x88CC88 },
      { label: '技能数', value: char.skills, color: 0xCC88FF },
    ];

    const statStyle = new TextStyle({
      fontFamily: '"Microsoft YaHei", monospace',
      fontSize: 13,
      fill: 0xAAAAAA,
    });

    let yPos = 60;
    for (const stat of stats) {
      const label = new Text({ text: `${stat.label}:`, style: statStyle });
      label.position.set(30, yPos);
      card.addChild(label);

      const valStyle = new TextStyle({
        fontFamily: '"Microsoft YaHei", monospace',
        fontSize: 13,
        fill: stat.color,
        fontWeight: 'bold',
      });
      const val = new Text({ text: `${stat.value}`, style: valStyle });
      val.position.set(110, yPos);
      card.addChild(val);

      // Simple bar
      const barBg = new Graphics();
      barBg.rect(150, yPos + 4, 70, 6);
      barBg.fill(0x222222);
      card.addChild(barBg);

      const maxValues: Record<string, number> = { HP: 400, MP: 200, ATK: 40, DEF: 4, AGI: 10, '技能数': 8 };
      const ratio = stat.value / (maxValues[stat.label] ?? 100);
      const barFill = new Graphics();
      barFill.rect(150, yPos + 4, 70 * Math.min(1, ratio), 6);
      barFill.fill(stat.color);
      card.addChild(barFill);

      yPos += 26;
    }

    // Class description
    const descriptions: Record<string, string> = {
      '骑士': '高速全能型\n强力冲锋与追击',
      '装甲战士': '重装防御型\n顶盾+反震硬控',
      '弓箭手': '远程输出型\n游击战术+箭雨',
    };
    const descStyle = new TextStyle({
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: 11,
      fill: 0x888888,
      wordWrap: true,
      wordWrapWidth: w - 40,
      lineHeight: 16,
    });
    const desc = new Text({ text: descriptions[char.name] ?? '', style: descStyle });
    desc.position.set(20, yPos + 15);
    card.addChild(desc);

    // Click handler
    card.on('pointertap', () => this.selectCard(index));
    card.on('pointerover', () => {
      if (this.selectedIndex !== index) {
        card.clear();
        card.roundRect(0, 0, w, h, 8);
        card.fill({ color: 0x2a1a40, alpha: 0.95 });
        card.stroke({ color: 0xd4b060, width: 1 });
      }
    });
    card.on('pointerout', () => {
      if (this.selectedIndex !== index) {
        card.clear();
        card.roundRect(0, 0, w, h, 8);
        card.fill({ color: 0x1a0e2e, alpha: 0.9 });
        card.stroke({ color: 0x5a3a7a, width: 1 });
      }
    });

    return card;
  }

  private selectCard(index: number): void {
    this.selectedIndex = index;

    // Update card styles
    for (let i = 0; i < this.cards.length; i++) {
      const card = this.cards[i];
      card.clear();
      if (i === index) {
        card.roundRect(0, 0, 240, 370, 8);
        card.fill({ color: 0x2a1a20, alpha: 0.95 });
        card.stroke({ color: 0xFFD700, width: 3 });
      } else {
        card.roundRect(0, 0, 240, 370, 8);
        card.fill({ color: 0x1a0e2e, alpha: 0.7 });
        card.stroke({ color: 0x5a3a7a, width: 1 });
      }
    }

    // Enable confirm button
    const confirmBtn = (this as any)._confirmBtn as Button;
    if (confirmBtn) confirmBtn.enabled = true;
  }

  private startBattle(): void {
    const playerChar = CHARACTERS[this.selectedIndex];

    // Build fighter list
    const fighters: BattleConfig['fighters'] = [];

    // Player
    fighters.push({
      characterClass: playerChar.characterClass,
      isPlayer: true,
      displayName: `${playerChar.name} (你)`,
    });

    // AI opponents: pick from remaining characters
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
