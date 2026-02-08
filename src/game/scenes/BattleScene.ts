import { Application, Container, Text, TextStyle, Graphics } from 'pixi.js';
import type { AssetLoader } from '../AssetLoader';
import type { CharacterName } from '../AssetLoader';
import { CharacterSprite } from '../entities/CharacterSprite';
import type { Direction, AnimationState } from '../entities/CharacterSprite';
import { BattleManager } from '@/core/BattleManager';
import type { BattleConfig, CharacterId, CharacterClass, FighterSnapshot } from '@/core/types';

/** Map CharacterClass to asset name */
const CLASS_TO_ASSET: Record<CharacterClass, CharacterName> = {
  'knight': 'knight',
  'armored-warrior': 'armored-warrior',
  'archer': 'archer',
};

/** Map CharacterClass to Chinese display name */
const CLASS_TO_LABEL: Record<CharacterClass, string> = {
  'knight': '骑士',
  'armored-warrior': '装甲战士',
  'archer': '弓箭手',
};

interface SpriteEntry {
  sprite: CharacterSprite;
  label: Text;
  hpBar: Graphics;
  hpText: Text;
  fighterId: CharacterId;
}

/**
 * Battle scene: subscribes to BattleManager events and drives sprite animations.
 * Layout adapts based on fighter count:
 *   2 players: left-right (East vs West)
 *   3+ players: triangular (player bottom N, opponents top S)
 */
export class BattleScene {
  readonly container = new Container();
  private app: Application;
  private assetLoader: AssetLoader;
  private battle: BattleManager;
  private sprites = new Map<CharacterId, SpriteEntry>();
  private lastTime = 0;

  // UI elements
  private roundText!: Text;
  private logText!: Text;
  private logLines: string[] = [];

  constructor(app: Application, assetLoader: AssetLoader, battle: BattleManager) {
    this.app = app;
    this.assetLoader = assetLoader;
    this.battle = battle;
  }

  start(): void {
    this.buildScene();
    this.subscribeToEvents();
    this.lastTime = performance.now();
    this.app.ticker.add(() => this.update());

    // Start the battle and run automatically (M2: all AI, no player input yet)
    this.battle.start();
    this.runAutoBattle();
  }

  private buildScene(): void {
    const state = this.battle.getState();
    const fighters = state.fighters;
    const count = fighters.length;

    // Round info
    const roundStyle = new TextStyle({ fontFamily: 'monospace', fontSize: 18, fill: 0xffd700 });
    this.roundText = new Text({ text: 'Round 0', style: roundStyle });
    this.roundText.anchor.set(0.5, 0);
    this.roundText.position.set(480, 10);
    this.container.addChild(this.roundText);

    // Battle log
    const logStyle = new TextStyle({ fontFamily: 'monospace', fontSize: 11, fill: 0xcccccc, wordWrap: true, wordWrapWidth: 300 });
    this.logText = new Text({ text: '', style: logStyle });
    this.logText.position.set(660, 380);
    this.container.addChild(this.logText);

    // Calculate positions based on fighter count
    const positions = this.calculatePositions(count);

    for (let i = 0; i < fighters.length; i++) {
      const fighter = fighters[i];
      const pos = positions[i];
      const assetName = CLASS_TO_ASSET[fighter.characterClass];
      const assets = this.assetLoader.getCharacter(assetName);

      const charSprite = new CharacterSprite(assets, 3);
      charSprite.setPosition(pos.x, pos.y);
      charSprite.setDirection(pos.dir);
      charSprite.play('idle');
      this.container.addChild(charSprite.container);

      // Name label
      const labelStyle = new TextStyle({ fontFamily: 'monospace', fontSize: 13, fill: fighter.isPlayer ? 0x66ff66 : 0xff6666 });
      const label = new Text({ text: fighter.displayName, style: labelStyle });
      label.anchor.set(0.5, 0);
      label.position.set(pos.x, pos.y + 8);
      this.container.addChild(label);

      // HP bar background
      const hpBar = new Graphics();
      this.drawHpBar(hpBar, pos.x, pos.y + 26, fighter.hp / fighter.maxHp);
      this.container.addChild(hpBar);

      // HP text
      const hpStyle = new TextStyle({ fontFamily: 'monospace', fontSize: 10, fill: 0xffffff });
      const hpText = new Text({ text: `${fighter.hp}/${fighter.maxHp}`, style: hpStyle });
      hpText.anchor.set(0.5, 0);
      hpText.position.set(pos.x, pos.y + 40);
      this.container.addChild(hpText);

      this.sprites.set(fighter.id, {
        sprite: charSprite,
        label,
        hpBar,
        hpText,
        fighterId: fighter.id,
      });
    }
  }

  /**
   * Calculate sprite positions based on fighter count.
   * 2 fighters: left-right (East vs West)
   * 3+ fighters: player bottom (North), opponents top (South)
   */
  private calculatePositions(count: number): { x: number; y: number; dir: Direction }[] {
    const fighters = this.battle.getState().fighters;

    if (count === 2) {
      // Left-right layout
      const groundY = 350;
      return [
        { x: 250, y: groundY, dir: 'east' },   // player (left, facing right)
        { x: 710, y: groundY, dir: 'west' },    // opponent (right, facing left)
      ];
    }

    // Triangular layout: player at bottom, opponents at top
    const positions: { x: number; y: number; dir: Direction }[] = [];
    const playerIndex = fighters.findIndex(f => f.isPlayer);

    // Opponents at top row
    const opponents = fighters.filter(f => !f.isPlayer);
    const topY = 180;
    const topSpacing = Math.min(200, 700 / (opponents.length + 1));
    const topStartX = 480 - (opponents.length - 1) * topSpacing / 2;

    let opIdx = 0;
    for (let i = 0; i < fighters.length; i++) {
      if (i === playerIndex) {
        // Player at bottom center
        positions.push({ x: 480, y: 420, dir: 'north' });
      } else {
        // Opponent at top
        positions.push({
          x: topStartX + opIdx * topSpacing,
          y: topY,
          dir: 'south',
        });
        opIdx++;
      }
    }

    return positions;
  }

  private drawHpBar(g: Graphics, cx: number, y: number, ratio: number): void {
    const w = 80;
    const h = 6;
    const x = cx - w / 2;

    g.clear();
    // Background
    g.rect(x, y, w, h);
    g.fill(0x333333);
    // HP fill
    const color = ratio > 0.5 ? 0x44cc44 : ratio > 0.25 ? 0xcccc44 : 0xcc3333;
    g.rect(x, y, w * Math.max(0, ratio), h);
    g.fill(color);
  }

  private subscribeToEvents(): void {
    const events = this.battle.events;

    events.on('round-start', (e) => {
      this.roundText.text = `Round ${e.data.round}`;
      this.updateAllStats(e.data.fighters);
    });

    events.on('damage-dealt', (e) => {
      const d = e.data;
      const entry = this.sprites.get(d.targetId);
      if (!entry) return;

      if (d.dodged) {
        this.addLog(`${d.attackerId} → ${d.targetId}: MISS`);
      } else {
        // Play hit animation on target
        entry.sprite.play('hit', false, () => {
          if (d.targetDied) {
            entry.sprite.play('death', false);
          } else {
            entry.sprite.play('idle');
          }
        });
        const dmgLabel = d.isTrueDamage ? `${d.finalDamage.toFixed(0)} TRUE` : `${d.finalDamage.toFixed(0)}`;
        this.addLog(`→ ${d.targetId}: -${dmgLabel} HP`);
      }
    });

    events.on('skill-used', (e) => {
      const entry = this.sprites.get(e.data.fighterId);
      if (entry) {
        entry.sprite.play('attack', false, () => entry.sprite.play('idle'));
      }
      this.addLog(`${e.data.fighterId} 使用 ${e.data.skillName}`);
    });

    events.on('escape-attempted', (e) => {
      const entry = this.sprites.get(e.data.fighterId);
      if (entry) {
        entry.sprite.play('escape', true);
      }
      this.addLog(`${e.data.fighterId} ${e.data.success ? '逃跑成功' : '逃跑失败'}`);
    });

    events.on('defend-activated', (e) => {
      const entry = this.sprites.get(e.data.fighterId);
      if (entry) {
        entry.sprite.play('defense', true);
      }
      this.addLog(`${e.data.fighterId} 防御`);
    });

    events.on('buff-applied', (e) => {
      this.addLog(`${e.data.fighterId} 获得 ${e.data.effectApplied?.type ?? '永久增益'}`);
    });

    events.on('fighter-died', (e) => {
      const entry = this.sprites.get(e.data.fighterId);
      if (entry) {
        entry.sprite.play('death', false);
        entry.label.style.fill = 0x666666;
      }
      this.addLog(`*** ${e.data.fighterId} 阵亡 ***`);
    });

    events.on('round-end', (e) => {
      this.updateAllStats(e.data.fighters);
      // Reset alive fighters to idle
      for (const f of e.data.fighters) {
        if (!f.alive) continue;
        const entry = this.sprites.get(f.id);
        if (entry) entry.sprite.play('idle');
      }
    });

    events.on('battle-end', (e) => {
      const winner = e.data.winner;
      if (winner === 'draw') {
        this.addLog(`\n=== 平局! (${e.data.rounds} 回合) ===`);
      } else {
        this.addLog(`\n=== ${winner} 获胜! (${e.data.rounds} 回合) ===`);
      }
    });
  }

  /**
   * Run the battle automatically with delays between phases
   * so animations have time to play. In M2 this is simplified —
   * all actions run with a short timer. M3 will add proper sequencing.
   */
  private runAutoBattle(): void {
    const phaseDelay = 300; // ms between phases
    const roundDelay = 800; // ms between rounds

    const step = () => {
      const state = this.battle.getState();
      if (state.phase === 'battle-end') return;

      this.battle.advancePhase();

      const newState = this.battle.getState();
      const delay = newState.phase === 'round-start' ? roundDelay : phaseDelay;
      setTimeout(step, delay);
    };

    setTimeout(step, 500); // Initial delay
  }

  private updateAllStats(fighters: FighterSnapshot[]): void {
    for (const f of fighters) {
      const entry = this.sprites.get(f.id);
      if (!entry) continue;

      const maxHp = this.battle.getFighter(f.id).maxHp;
      const ratio = Math.max(0, f.hp) / maxHp;
      const pos = entry.sprite.container.position;

      this.drawHpBar(entry.hpBar, pos.x, pos.y + 26, ratio);
      entry.hpText.text = `${Math.max(0, Math.round(f.hp))}/${maxHp}`;
    }
  }

  private addLog(line: string): void {
    this.logLines.push(line);
    if (this.logLines.length > 12) this.logLines.shift();
    this.logText.text = this.logLines.join('\n');
  }

  private update(): void {
    const now = performance.now();
    const deltaMs = now - this.lastTime;
    this.lastTime = now;

    for (const entry of this.sprites.values()) {
      entry.sprite.update(deltaMs);
    }
  }
}
