import { Application, Container, Graphics } from 'pixi.js';
import type { AssetLoader } from '../AssetLoader';
import type { CharacterName } from '../AssetLoader';
import { CharacterSprite } from '../entities/CharacterSprite';
import type { Direction } from '../entities/CharacterSprite';
import { BattleManager } from '@/core/BattleManager';
import type { CharacterId, CharacterClass, FighterSnapshot } from '@/core/types';
import { ActionPanel } from '../ui/ActionPanel';
import { BaseScene } from './BaseScene';
import { RoundInfoBar } from '../ui/RoundInfoBar';
import { BattleLog } from '../ui/BattleLog';
import { FighterHUD } from '../ui/FighterHUD';
import { BattleDirector } from '../BattleDirector';
import { EffectsManager } from '../effects/EffectsManager';
import { BattlefieldBackground } from './BattlefieldBackground';
import { drawRPGPanel } from '../ui/RPGPanel';
import type { SceneManager } from '../SceneManager';

/** Map CharacterClass to asset name */
const CLASS_TO_ASSET: Record<CharacterClass, CharacterName> = {
  'knight': 'knight',
  'armored-warrior': 'armored-warrior',
  'archer': 'archer',
};

/** Per-character battle scale — normalize for different canvas sizes (knight=128px, others=96px) */
const BATTLE_SCALE: Record<CharacterClass, number> = {
  'knight': 1.8,           // 128px × 1.8 = 230px (mounted + lance fits arena)
  'armored-warrior': 2.4,  // 96px × 2.4 = 230px
  'archer': 2.4,           // 96px × 2.4 = 230px
};

interface SpriteEntry {
  sprite: CharacterSprite;
  hud: FighterHUD;
  fighterId: CharacterId;
  baseX: number;
  baseY: number;
}

/**
 * Battle scene: subscribes to BattleManager events and drives sprite animations.
 * Layout (960x540):
 *   TopBar:      y=0-36
 *   Arena:       y=36-375 (fighters)
 *   BottomPanel: y=375-540 (ActionPanel left + BattleLog right)
 */
export class BattleScene extends BaseScene {
  private assetLoader: AssetLoader;
  private sceneManager: SceneManager;
  private battle!: BattleManager;
  private sprites = new Map<CharacterId, SpriteEntry>();
  private breatheTime = 0;

  // UI components
  private roundInfoBar!: RoundInfoBar;
  private battleLog!: BattleLog;
  private actionPanel: ActionPanel;
  private effects!: EffectsManager;
  private director!: BattleDirector;

  constructor(app: Application, assetLoader: AssetLoader, sceneManager: SceneManager) {
    super(app);
    this.assetLoader = assetLoader;
    this.sceneManager = sceneManager;
    this.actionPanel = new ActionPanel();
  }

  onEnter(data?: Record<string, unknown>): void {
    const config = (data?.battleConfig as any) ?? {
      fighters: [
        { characterClass: 'knight', isPlayer: true, displayName: '骑士 (你)' },
        { characterClass: 'armored-warrior', isPlayer: false, displayName: '装甲战士' },
        { characterClass: 'archer', isPlayer: false, displayName: '弓箭手' },
      ],
      aiDifficulty: 'normal',
    };

    this.battle = new BattleManager(config);
    this.sprites.clear();
    this.container.removeChildren();
    this.breatheTime = 0;

    this.buildScene();
    this.subscribeToEvents();

    // Create effects layer and battle director
    this.effects = new EffectsManager(this.container);
    this.director = new BattleDirector(this.battle, this, this.actionPanel, this.effects);
    this.director.run();
  }

  onExit(): void {
    this.director?.stop();
    this.effects?.clear();
    this.actionPanel.hide();
    this.sprites.clear();
  }

  /** Get a sprite entry by fighter ID */
  getSpriteEntry(id: CharacterId): SpriteEntry | undefined {
    return this.sprites.get(id);
  }

  /** Get sprite containers for all alive fighters (for target selection) */
  getSpriteContainers(): Map<CharacterId, Container> {
    const map = new Map<CharacterId, Container>();
    for (const [id, entry] of this.sprites) {
      try {
        const fighter = this.battle.getFighter(id);
        if (fighter.hp > 0) {
          map.set(id, entry.sprite.container);
        }
      } catch {
        // Fighter not found, skip
      }
    }
    return map;
  }

  /** Get the battle manager (for BattleDirector) */
  getBattle(): BattleManager {
    return this.battle;
  }

  private buildScene(): void {
    const state = this.battle.getState();
    const fighters = state.fighters;
    const count = fighters.length;

    // Background (first — behind everything)
    const bg = new BattlefieldBackground();
    this.container.addChild(bg);

    // Round info bar (top, height 36)
    this.roundInfoBar = new RoundInfoBar();
    this.roundInfoBar.setAliveCount(fighters.filter(f => f.alive).length, fighters.length);
    this.container.addChild(this.roundInfoBar);

    // Calculate positions based on fighter count (within arena y=36-375)
    const positions = this.calculatePositions(count);

    for (let i = 0; i < fighters.length; i++) {
      const fighter = fighters[i];
      const pos = positions[i];
      const assetName = CLASS_TO_ASSET[fighter.characterClass];
      const assets = this.assetLoader.getCharacter(assetName);

      const scale = BATTLE_SCALE[fighter.characterClass] ?? 2.4;
      const charSprite = new CharacterSprite(assets, scale);
      charSprite.setPosition(pos.x, pos.y);
      charSprite.setDirection(pos.dir);
      charSprite.play('idle');
      this.container.addChild(charSprite.container);

      // Fighter HUD (name + resource bars)
      const hud = new FighterHUD(
        fighter.displayName,
        fighter.isPlayer,
        fighter.maxHp,
        fighter.maxMp,
      );
      hud.position.set(pos.x, pos.y + 8);
      this.container.addChild(hud);

      this.sprites.set(fighter.id, {
        sprite: charSprite,
        hud,
        fighterId: fighter.id,
        baseX: pos.x,
        baseY: pos.y,
      });
    }

    // --- Bottom Panel (y=375-540, full width) ---
    const bottomPanel = new Graphics();
    drawRPGPanel(bottomPanel, {
      width: 960, height: 165, radius: 0,
      fillColor: 0xE8E0D4, fillAlpha: 0.85,
      shadow: false, innerFrame: false, cornerDots: false,
    });
    bottomPanel.position.set(0, 375);
    // Decorative top border with accent
    bottomPanel.rect(0, 0, 960, 2);
    bottomPanel.fill({ color: 0xC8B898, alpha: 0.6 });
    bottomPanel.rect(4, 2, 952, 1);
    bottomPanel.fill({ color: 0xD4C8B0, alpha: 0.3 });
    this.container.addChild(bottomPanel);

    // Action panel (left side of bottom panel)
    this.actionPanel.position.set(0, 375);
    this.actionPanel.showAiWaiting();
    this.container.addChild(this.actionPanel);

    // Vertical decorative separator between ActionPanel and BattleLog
    const panelSeparator = new Graphics();
    panelSeparator.rect(660, 380, 1, 150);
    panelSeparator.fill({ color: 0xD4C8B0, alpha: 0.35 });
    // Top diamond
    panelSeparator.moveTo(660.5, 378);
    panelSeparator.lineTo(663, 380.5);
    panelSeparator.lineTo(660.5, 383);
    panelSeparator.lineTo(658, 380.5);
    panelSeparator.closePath();
    panelSeparator.fill({ color: 0xC8A050, alpha: 0.4 });
    // Bottom diamond
    panelSeparator.moveTo(660.5, 528);
    panelSeparator.lineTo(663, 530.5);
    panelSeparator.lineTo(660.5, 533);
    panelSeparator.lineTo(658, 530.5);
    panelSeparator.closePath();
    panelSeparator.fill({ color: 0xC8A050, alpha: 0.4 });
    this.container.addChild(panelSeparator);

    // Battle log (right side of bottom panel)
    this.battleLog = new BattleLog(280, 160, 10);
    this.battleLog.position.set(670, 375);
    this.container.addChild(this.battleLog);

    // Target selector (rendered on top of the scene)
    this.container.addChild(this.actionPanel.getTargetSelector());
  }

  private calculatePositions(count: number): { x: number; y: number; dir: Direction }[] {
    const fighters = this.battle.getState().fighters;

    if (count === 2) {
      const groundY = 250;
      return [
        { x: 250, y: groundY, dir: 'east' },
        { x: 710, y: groundY, dir: 'west' },
      ];
    }

    const positions: { x: number; y: number; dir: Direction }[] = [];
    const playerIndex = fighters.findIndex(f => f.isPlayer);

    const opponents = fighters.filter(f => !f.isPlayer);
    const topY = 140;
    const topSpacing = Math.min(200, 700 / (opponents.length + 1));
    const topStartX = 480 - (opponents.length - 1) * topSpacing / 2;

    let opIdx = 0;
    for (let i = 0; i < fighters.length; i++) {
      if (i === playerIndex) {
        positions.push({ x: 480, y: 320, dir: 'north' });
      } else {
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

  private nameOf(id: CharacterId): string {
    try {
      return this.battle.getFighter(id).displayName;
    } catch {
      return id;
    }
  }

  private subscribeToEvents(): void {
    const events = this.battle.events;

    events.on('round-start', (e) => {
      this.roundInfoBar.setRound(e.data.round);
      this.battleLog.add(`--- 第 ${e.data.round} 回合 ---`, 'system');
      this.updateAllStats(e.data.fighters);
    });

    events.on('damage-dealt', (e) => {
      const d = e.data;
      const entry = this.sprites.get(d.targetId);
      if (!entry) return;

      if (d.dodged) {
        this.battleLog.add(`${this.nameOf(d.attackerId)} → ${this.nameOf(d.targetId)}: 闪避!`, 'info');
      } else {
        entry.sprite.play('hit', false, () => {
          if (d.targetDied) {
            entry.sprite.play('death', false);
          } else {
            entry.sprite.play('idle');
          }
        });
        const dmgLabel = d.isTrueDamage
          ? `${d.finalDamage.toFixed(0)} 真实伤害`
          : `${d.finalDamage.toFixed(0)}`;
        const condStr = d.conditionMet ? ' [触发条件]' : '';
        this.battleLog.add(`  → ${this.nameOf(d.targetId)}: -${dmgLabel}${condStr}`, 'damage');
      }
    });

    events.on('skill-used', (e) => {
      const entry = this.sprites.get(e.data.fighterId);
      if (entry) {
        entry.sprite.play('attack', false, () => entry.sprite.play('idle'));
      }
      const fighter = this.battle.getFighter(e.data.fighterId);
      const logType = fighter.isPlayer ? 'player' : 'enemy';
      this.battleLog.add(`${this.nameOf(e.data.fighterId)} 使用 ${e.data.skillName}`, logType);
    });

    events.on('escape-attempted', (e) => {
      const entry = this.sprites.get(e.data.fighterId);
      if (entry) {
        entry.sprite.play('escape', true);
      }
      this.battleLog.add(
        `${this.nameOf(e.data.fighterId)} ${e.data.success ? '逃跑成功!' : '逃跑失败'}`,
        'info',
      );
    });

    events.on('defend-activated', (e) => {
      const entry = this.sprites.get(e.data.fighterId);
      if (entry) {
        entry.sprite.play('defense', true);
      }
      this.battleLog.add(
        `${this.nameOf(e.data.fighterId)} 防御 (DEF ${e.data.defBefore.toFixed(1)}→${e.data.defAfter.toFixed(1)})`,
        'info',
      );
    });

    events.on('buff-applied', (e) => {
      const buffName = e.data.effectApplied?.type === 'shield-wall' ? '顶盾'
        : e.data.effectApplied?.type === 'counter-shock' ? '反震'
        : e.data.whipPermanent ? '马鞭加速'
        : '增益';
      this.battleLog.add(`${this.nameOf(e.data.fighterId)} 激活 ${buffName}`, 'info');
    });

    events.on('fighter-died', (e) => {
      const entry = this.sprites.get(e.data.fighterId);
      if (entry) {
        entry.sprite.play('death', false);
        entry.hud.setDead();
      }
      this.battleLog.add(`★ ${this.nameOf(e.data.fighterId)} 阵亡!`, 'damage');
      const alive = this.battle.getAliveFighters().length;
      const total = this.battle.getState().fighters.length;
      this.roundInfoBar.setAliveCount(alive, total);
    });

    events.on('round-end', (e) => {
      this.updateAllStats(e.data.fighters);
      for (const f of e.data.fighters) {
        if (!f.alive) continue;
        const entry = this.sprites.get(f.id);
        if (entry) entry.sprite.play('idle');
      }
    });

    events.on('battle-end', (e) => {
      const winner = e.data.winner;
      const isDraw = winner === 'draw';
      const winnerName = isDraw ? '' : (winner ? this.nameOf(winner) : '???');

      if (isDraw) {
        this.battleLog.add(`=== 平局! (${e.data.rounds} 回合) ===`, 'system');
      } else if (winner) {
        this.battleLog.add(`=== ${winnerName} 获胜! (${e.data.rounds} 回合) ===`, 'system');
      }

      setTimeout(() => {
        this.sceneManager.goTo('result', {
          winner: winnerName,
          isDraw,
          rounds: e.data.rounds,
        });
      }, 2000);
    });
  }

  private updateAllStats(fighters: FighterSnapshot[]): void {
    for (const f of fighters) {
      const entry = this.sprites.get(f.id);
      if (!entry) continue;

      const fighter = this.battle.getFighter(f.id);
      entry.hud.updateResources(f.hp, fighter.maxHp, f.mp, fighter.maxMp, f.rage);
    }
  }

  override update(deltaMs: number): void {
    this.breatheTime += deltaMs;

    let index = 0;
    for (const entry of this.sprites.values()) {
      entry.sprite.update(deltaMs);
      entry.hud.updateBlink(deltaMs);

      // Idle breathing: subtle Y oscillation
      try {
        const fighter = this.battle.getFighter(entry.fighterId);
        if (fighter.hp > 0) {
          const breatheOffset = Math.sin(this.breatheTime * 0.002 + index) * 1.5;
          entry.sprite.setPosition(entry.baseX, entry.baseY + breatheOffset);
        }
      } catch {
        // Fighter may not exist during cleanup
      }
      index++;
    }
  }
}
