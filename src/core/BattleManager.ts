import type {
  BattleConfig, BattleState, Fighter, ChosenAction,
  AvailableAction, CharacterId, FighterSnapshot,
} from './types';
import { EventBus } from './EventBus';
import { DamageCalculator } from './DamageCalculator';
import { ActionResolver } from './ActionResolver';
import { StatusEffectManager } from './StatusEffectManager';
import { createBattleState } from './BattleFactory';
import { AIPlayer } from '@/ai';
import { getSkill, DUAL_COST_SKILLS } from '@/skills';
import { clamp, roundTo2 } from './utils';

/**
 * Main battle orchestrator. Drives the state machine from INIT to BATTLE_END.
 * The sole interface between the pure game logic and external systems (UI, tests).
 *
 * Usage:
 *   const battle = new BattleManager(config);
 *   battle.events.on('damage-dealt', handler);
 *   battle.start();
 *   // For automatic (console) mode:
 *   battle.runAutomatic();
 */
export class BattleManager {
  readonly events = new EventBus();
  private state: BattleState;
  private aiPlayer: AIPlayer;
  private damageCalc = new DamageCalculator();
  private resolver: ActionResolver;
  private statusMgr = new StatusEffectManager();
  private playerActionResolve: ((action: ChosenAction) => void) | null = null;

  constructor(config: BattleConfig) {
    this.state = createBattleState(config);
    this.aiPlayer = new AIPlayer();
    this.resolver = new ActionResolver(this.damageCalc, this.statusMgr, this.events);
  }

  // --- Public API ---

  getState(): Readonly<BattleState> {
    return this.state;
  }

  getFighter(id: CharacterId): Readonly<Fighter> {
    const f = this.state.fighters.find(f => f.id === id);
    if (!f) throw new Error(`Fighter not found: ${id}`);
    return f;
  }

  getAliveFighters(): Readonly<Fighter>[] {
    return this.state.fighters.filter(f => f.alive);
  }

  getPlayerFighter(): Fighter | undefined {
    return this.state.fighters.find(f => f.isPlayer && f.alive);
  }

  /**
   * Get available actions for a fighter (for UI action menu).
   */
  getAvailableActions(fighterId: CharacterId): AvailableAction[] {
    const fighter = this.state.fighters.find(f => f.id === fighterId);
    if (!fighter || !fighter.alive) return [];

    const actions: AvailableAction[] = [
      { type: 'basic-attack', affordable: true },
      { type: 'defend', affordable: true },
      { type: 'escape', affordable: true },
    ];

    for (const skillId of fighter.skillIds) {
      const skill = getSkill(skillId);
      const { affordable, reason } = this.checkAffordability(fighter, skillId);
      actions.push({
        type: 'skill',
        skillId: skill.id,
        skillName: skill.name,
        affordable,
        reason,
      });
    }

    return actions;
  }

  /**
   * Get valid targets for an action.
   */
  getValidTargets(fighterId: CharacterId, action: ChosenAction): CharacterId[] {
    const fighter = this.state.fighters.find(f => f.id === fighterId);
    if (!fighter) return [];

    if (action.type === 'defend' || action.type === 'escape') return [];

    if (action.type === 'skill' && action.skillId) {
      const skill = getSkill(action.skillId);
      if (skill.targetMode === 'self') return [fighterId];
      if (skill.targetMode === 'all-enemies') {
        return this.state.fighters.filter(f => f.alive && f.id !== fighterId).map(f => f.id);
      }
    }

    // Single or multi enemy target
    return this.state.fighters.filter(f => f.alive && f.id !== fighterId).map(f => f.id);
  }

  /**
   * Player submits their action for the current round.
   */
  submitPlayerAction(fighterId: CharacterId, action: ChosenAction): void {
    const fighter = this.state.fighters.find(f => f.id === fighterId);
    if (!fighter || !fighter.isPlayer) return;
    fighter.chosenAction = action;

    this.events.emit('action-selected', this.state.round, {
      fighterId,
      isPlayer: true,
    });

    if (this.playerActionResolve) {
      this.playerActionResolve(action);
      this.playerActionResolve = null;
    }
  }

  /**
   * Start the battle.
   */
  start(): void {
    this.state.phase = 'init';
    this.events.emit('battle-start', 0, {
      fighters: this.snapshotFighters(),
    });
  }

  /**
   * Run the entire battle automatically (all AI, no waiting).
   * Used for console testing.
   */
  runAutomatic(): BattleState {
    this.start();

    while (this.state.phase !== 'battle-end') {
      this.advancePhase();
    }

    return this.state;
  }

  /**
   * Advance to the next phase in the state machine.
   * In auto mode, called immediately. In UI mode, called after animations complete.
   */
  advancePhase(): void {
    switch (this.state.phase) {
      case 'init':
        this.phaseRoundStart();
        break;
      case 'round-start':
        this.phaseActionSelect();
        break;
      case 'action-select':
        this.phaseActionResolve();
        break;
      case 'action-resolve':
        this.phaseStatusUpdate();
        break;
      case 'status-update':
        this.phaseDeathCheck();
        break;
      case 'death-check':
        this.phaseRoundEnd();
        break;
      case 'round-end':
        this.phaseRoundStart();
        break;
      case 'battle-end':
        // No-op: battle is over
        break;
    }
  }

  // --- Phase Implementations ---

  private phaseRoundStart(): void {
    this.state.round++;
    this.state.phase = 'round-start';

    // Reset per-round flags
    for (const fighter of this.state.fighters) {
      if (!fighter.alive) continue;
      fighter.chosenAction = null;
      fighter.escapeSuccess = null;
      fighter.isDefending = false;
      fighter.usedRangedSkillThisRound = false;
    }

    // Tick status effects (reduce duration, expire)
    for (const fighter of this.state.fighters) {
      if (!fighter.alive) continue;
      this.statusMgr.tickEffects(fighter, this.events, this.state.round);
    }

    // Trigger passives (round-start)
    for (const fighter of this.state.fighters) {
      if (!fighter.alive) continue;
      for (const passive of fighter.passives) {
        if (passive.trigger === 'round-start') {
          if (passive.effect.type === 'gain-rage') {
            fighter.rage = clamp(fighter.rage + passive.effect.amount, 0, 100);
            this.events.emit('passive-triggered', this.state.round, {
              fighterId: fighter.id,
              passiveId: passive.id,
              description: `${passive.name}: +${passive.effect.amount} 怒气 (${fighter.rage})`,
            });
          }
        }
      }
    }

    this.events.emit('round-start', this.state.round, {
      round: this.state.round,
      fighters: this.snapshotFighters(),
    });
  }

  private phaseActionSelect(): void {
    this.state.phase = 'action-select';

    const aliveFighters = this.state.fighters.filter(f => f.alive);
    this.events.emit('action-select-start', this.state.round, {
      round: this.state.round,
      aliveFighters: aliveFighters.map(f => f.id),
    });

    // AI selects actions for non-player fighters
    for (const fighter of aliveFighters) {
      if (!fighter.isPlayer) {
        const available = this.getAvailableActions(fighter.id);
        const action = this.aiPlayer.chooseAction(
          fighter,
          this.state.fighters,
          available,
          this.state.round
        );
        fighter.chosenAction = action;

        this.events.emit('action-selected', this.state.round, {
          fighterId: fighter.id,
          isPlayer: false,
        });
      }
    }

    // In automatic mode, player also gets AI-controlled
    const player = this.getPlayerFighter();
    if (player && !player.chosenAction) {
      const available = this.getAvailableActions(player.id);
      const action = this.aiPlayer.chooseAction(
        player,
        this.state.fighters,
        available,
        this.state.round
      );
      player.chosenAction = action;

      this.events.emit('action-selected', this.state.round, {
        fighterId: player.id,
        isPlayer: true,
      });
    }
  }

  private phaseActionResolve(): void {
    this.state.phase = 'action-resolve';

    const resolved = this.resolver.resolveRound(this.state, this.state.fighters);

    // Log all actions
    for (const r of resolved) {
      this.state.actionLog.push({
        round: this.state.round,
        actorId: r.actorId,
        action: r.action,
        results: r.results,
      });
    }
  }

  private phaseStatusUpdate(): void {
    this.state.phase = 'status-update';

    // Handle guerrilla tactics for archers
    for (const fighter of this.state.fighters) {
      if (!fighter.alive) continue;
      if (fighter.passives.some(p => p.effect.type === 'guerrilla-tactics')) {
        this.statusMgr.handleGuerrillaTactics(fighter);
      }
    }

    // Handle HP-cost deaths (fighters who paid HP cost and dropped to 0)
    for (const fighter of this.state.fighters) {
      if (fighter.hp <= 0 && fighter.alive) {
        fighter.alive = false;
        this.statusMgr.clearAllEffects(fighter);
        this.events.emit('fighter-died', this.state.round, {
          fighterId: fighter.id,
          killedBy: 'self',
        });
      }
    }
  }

  private phaseDeathCheck(): void {
    this.state.phase = 'death-check';

    const alive = this.state.fighters.filter(f => f.alive);

    if (alive.length <= 1) {
      this.state.phase = 'battle-end';

      if (alive.length === 0) {
        this.state.winner = 'draw';
      } else {
        this.state.winner = alive[0].id;
      }

      this.events.emit('battle-end', this.state.round, {
        winner: this.state.winner,
        rounds: this.state.round,
        survivors: alive.map(f => f.id),
      });
      return;
    }

    // More than 1 alive — continue to round-end
  }

  private phaseRoundEnd(): void {
    this.state.phase = 'round-end';

    this.events.emit('round-end', this.state.round, {
      round: this.state.round,
      fighters: this.snapshotFighters(),
    });
  }

  // --- Helpers ---

  private checkAffordability(fighter: Fighter, skillId: string): { affordable: boolean; reason?: string } {
    const skill = getSkill(skillId);
    const { resource, amount } = skill.cost;

    // Primary cost
    if (resource === 'mp' && fighter.mp < amount) {
      return { affordable: false, reason: `MP不足 (需要${amount}, 当前${fighter.mp})` };
    }
    if (resource === 'hp' && fighter.hp <= amount) {
      return { affordable: false, reason: `HP不足 (需要>${amount}, 当前${fighter.hp})` };
    }
    if (resource === 'rage' && fighter.rage < amount) {
      return { affordable: false, reason: `怒气不足 (需要${amount}, 当前${fighter.rage})` };
    }

    // Dual cost (彩虹穿云)
    const dualCost = DUAL_COST_SKILLS[skillId];
    if (dualCost) {
      if (dualCost.resource === 'rage' && fighter.rage < dualCost.amount) {
        return { affordable: false, reason: `怒气不足 (需要${dualCost.amount}, 当前${fighter.rage})` };
      }
      // Check combined: MP >= primary AND RAGE >= secondary
      if (resource === 'mp' && fighter.mp >= amount && dualCost.resource === 'rage' && fighter.rage < dualCost.amount) {
        return { affordable: false, reason: `怒气不足 (需要${dualCost.amount})` };
      }
    }

    // Whip already used
    if (skillId === 'knight-whip' && fighter.whipUsed) {
      return { affordable: false, reason: '马鞭已使用（永久效果）' };
    }

    return { affordable: true };
  }

  private snapshotFighters(): FighterSnapshot[] {
    return this.state.fighters.map(f => ({
      id: f.id,
      hp: roundTo2(f.hp),
      mp: f.mp,
      rage: roundTo2(f.rage),
      agi: f.currentAgi,
      def: f.currentDef,
      alive: f.alive,
      statusEffects: [...f.statusEffects],
    }));
  }
}
