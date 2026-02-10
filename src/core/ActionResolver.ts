import type {
  Fighter, BattleState, ChosenAction, ActionResult,
  DamageResult, BuffResult, ResolvedAction, SkillDef, StatusEffect,
} from './types';
import { DamageCalculator } from './DamageCalculator';
import { StatusEffectManager } from './StatusEffectManager';
import { EventBus } from './EventBus';
import { getSkill, DUAL_COST_SKILLS } from '@/skills';
import { roundTo2, clamp, shuffle } from './utils';

/**
 * Resolves all actions for one round in correct order.
 * Handles: AGI ordering, counter-shock priority, escape, defense,
 * condition evaluation, HP cost timing, death cancellation.
 */
export class ActionResolver {
  constructor(
    private damageCalc: DamageCalculator,
    private statusMgr: StatusEffectManager,
    private events: EventBus
  ) {}

  /**
   * Resolve all actions for the current round.
   * Mutates fighter state directly.
   */
  resolveRound(state: BattleState, fighters: Fighter[]): ResolvedAction[] {
    const resolved: ResolvedAction[] = [];
    const round = state.round;

    // Phase 1: Process escapes first (determine success)
    for (const fighter of fighters) {
      if (!fighter.alive || !fighter.chosenAction) continue;
      if (fighter.chosenAction.type === 'escape') {
        fighter.escapeSuccess = this.damageCalc.rollEscapeSuccess(fighter.whipUsed);
        this.events.emit('escape-attempted', round, {
          fighterId: fighter.id,
          success: fighter.escapeSuccess,
          escapeRate: fighter.whipUsed ? 0.7 : 0.5,
          resultType: 'escape',
        });
      }
    }

    // Phase 2: Process defenses
    for (const fighter of fighters) {
      if (!fighter.alive || !fighter.chosenAction) continue;
      if (fighter.chosenAction.type === 'defend') {
        const defBefore = fighter.currentDef;
        fighter.isDefending = true;
        const defAfter = this.damageCalc.getDefenseBoost(fighter);
        this.events.emit('defend-activated', round, {
          fighterId: fighter.id,
          defBefore,
          defAfter,
          resultType: 'defend',
        });
      }
    }

    // Phase 3: Resolve counter-shock FIRST (before AGI ordering)
    // PRD v0.9.1: 反震 resolves first in RESOLVE phase, regardless of AGI
    for (const fighter of fighters) {
      if (!fighter.alive || !fighter.chosenAction) continue;
      if (fighter.chosenAction.type === 'skill' && fighter.chosenAction.skillId === 'warrior-counter-shock') {
        const results = this.resolveBuffAction(fighter, fighter.chosenAction, round);
        resolved.push({ actorId: fighter.id, action: fighter.chosenAction, results });
      }
    }

    // Phase 4: Determine action order (AGI descending, random on tie)
    const orderedFighters = this.determineOrder(fighters);

    this.events.emit('action-resolve-start', round, {
      round,
      order: orderedFighters.map(f => f.id),
    });

    // Phase 5: Resolve each fighter's action in order
    for (const fighter of orderedFighters) {
      if (!fighter.alive) continue;
      if (!fighter.chosenAction) continue;

      // Skip counter-shock (already resolved in Phase 3)
      if (fighter.chosenAction.type === 'skill' && fighter.chosenAction.skillId === 'warrior-counter-shock') {
        continue;
      }

      // Skip escape and defend (already processed)
      if (fighter.chosenAction.type === 'escape' || fighter.chosenAction.type === 'defend') {
        continue;
      }

      this.events.emit('action-resolving', round, {
        fighterId: fighter.id,
        action: fighter.chosenAction,
      });

      const results = this.resolveAction(fighter, fighters, state);
      resolved.push({ actorId: fighter.id, action: fighter.chosenAction, results });
    }

    return resolved;
  }

  /**
   * Determine action resolution order.
   * AGI descending. Same AGI = random. Counter-shock already handled separately.
   */
  private determineOrder(fighters: Fighter[]): Fighter[] {
    const alive = fighters.filter(f => f.alive && f.chosenAction !== null);

    // Group by AGI
    const groups = new Map<number, Fighter[]>();
    for (const f of alive) {
      const agi = f.currentAgi;
      if (!groups.has(agi)) groups.set(agi, []);
      groups.get(agi)!.push(f);
    }

    // Sort AGI descending, shuffle within same AGI
    const sortedAgis = Array.from(groups.keys()).sort((a, b) => b - a);
    const ordered: Fighter[] = [];
    for (const agi of sortedAgis) {
      const group = groups.get(agi)!;
      shuffle(group);
      ordered.push(...group);
    }

    return ordered;
  }

  /**
   * Resolve one fighter's action (attack or buff skill).
   */
  private resolveAction(
    actor: Fighter,
    fighters: Fighter[],
    state: BattleState
  ): ActionResult[] {
    const action = actor.chosenAction!;
    const round = state.round;

    if (action.type === 'skill') {
      const skill = getSkill(action.skillId!);

      // Pay skill cost
      if (!this.paySkillCost(actor, skill, round)) {
        return []; // Can't afford (shouldn't happen if UI checks)
      }

      // Buff skills
      if (skill.type === 'buff') {
        return this.resolveBuffAction(actor, action, round);
      }

      // Track if ranged skill was used (for guerrilla tactics)
      if (skill.triggersGuerrilla) {
        actor.usedRangedSkillThisRound = true;
      }

      // Attack skill — resolve against each target
      return this.resolveAttackTargets(actor, skill, action, fighters, round);
    }

    if (action.type === 'basic-attack') {
      // Track ranged basic attack does NOT trigger guerrilla
      return this.resolveAttackTargets(actor, null, action, fighters, round);
    }

    return [];
  }

  /**
   * Resolve attack against all targets (handles multi-target skills).
   */
  private resolveAttackTargets(
    actor: Fighter,
    skill: SkillDef | null,
    action: ChosenAction,
    fighters: Fighter[],
    round: number
  ): ActionResult[] {
    const results: ActionResult[] = [];

    // Determine targets
    let targetIds: string[];
    if (skill?.targetMode === 'all-enemies') {
      targetIds = fighters.filter(f => f.alive && f.id !== actor.id).map(f => f.id);
    } else {
      targetIds = action.targetIds ?? [];
    }

    if (targetIds.length === 0 && skill?.targetMode !== 'self') {
      console.warn(`[ActionResolver] Empty targetIds for ${action.type} (skill: ${skill?.id ?? 'none'})`);
    }

    const attackType = skill ? skill.type : actor.basicAttackType;
    const isTrueDamage = skill?.isTrueDamage ?? false;
    const isBasicAttack = action.type === 'basic-attack';
    const skillName = skill?.name ?? '普通攻击';

    if (skill) {
      this.events.emit('skill-used', round, {
        fighterId: actor.id,
        skillId: skill.id,
        skillName: skill.name,
        costPaid: skill.cost,
      });
    }

    for (const targetId of targetIds) {
      const target = fighters.find(f => f.id === targetId);
      if (!target || !target.alive) continue;

      // Check escape dodge
      if (target.escapeSuccess) {
        const dodged = this.damageCalc.rollEscapeDodge(
          target.whipUsed,
          skill,
          isBasicAttack,
          isTrueDamage
        );
        if (dodged) {
          this.events.emit('dodge', round, {
            targetId: target.id,
            attackerId: actor.id,
            skillName,
          });
          results.push({
            resultType: 'damage',
            targetId: target.id,
            baseDamage: 0,
            conditionMet: false,
            conditionMultiplier: 1,
            defReduction: 0,
            precisionBonus: 0,
            finalDamage: 0,
            isTrueDamage: false,
            isReflected: false,
            dodged: true,
            rageGained: 0,
            targetHpAfter: target.hp,
            targetDied: false,
          });
          continue;
        }
      }

      // Calculate damage
      const dmgResult = this.damageCalc.calculateDamage(
        actor,
        target,
        skill,
        target.chosenAction ?? { type: 'basic-attack' }
      );

      // Check counter-shock
      if (this.statusMgr.hasEffect(target, 'counter-shock') && !isTrueDamage) {
        const csResult = this.damageCalc.calculateCounterShock(
          dmgResult.finalDamage,
          attackType,
          isTrueDamage
        );

        if (csResult) {
          // Target takes reduced damage
          const reducedDamage = csResult.selfDamage;
          target.hp = roundTo2(target.hp - reducedDamage);
          const targetRage = clamp(target.rage + reducedDamage, 0, 100);
          target.rage = roundTo2(targetRage);

          // Reflect damage back to attacker (no further DEF calc)
          actor.hp = roundTo2(actor.hp - csResult.reflectedDamage);
          const actorRage = clamp(actor.rage + csResult.reflectedDamage, 0, 100);
          actor.rage = roundTo2(actorRage);

          this.events.emit('damage-dealt', round, {
            ...dmgResult,
            attackerId: actor.id,
            finalDamage: reducedDamage,
            rageGained: reducedDamage,
            targetHpAfter: target.hp,
            targetDied: target.hp <= 0,
          });

          this.events.emit('damage-reflected', round, {
            reflectorId: target.id,
            targetId: actor.id,
            reflectedDamage: csResult.reflectedDamage,
          });

          results.push({
            ...dmgResult,
            finalDamage: reducedDamage,
            isReflected: true,
            rageGained: reducedDamage,
            targetHpAfter: target.hp,
            targetDied: target.hp <= 0,
          });

          // Check if attacker died from reflect
          if (actor.hp <= 0) {
            actor.alive = false;
            this.statusMgr.clearAllEffects(actor);
            this.events.emit('fighter-died', round, {
              fighterId: actor.id,
              killedBy: target.id,
            });
            return results; // Actor is dead, can't attack more targets
          }

          // Check if target died
          if (target.hp <= 0) {
            target.alive = false;
            this.statusMgr.clearAllEffects(target);
            this.events.emit('fighter-died', round, {
              fighterId: target.id,
              killedBy: actor.id,
            });
          }

          continue;
        }
      }

      // Apply damage normally
      target.hp = roundTo2(target.hp - dmgResult.finalDamage);
      if (dmgResult.finalDamage > 0) {
        target.rage = roundTo2(clamp(target.rage + dmgResult.finalDamage, 0, 100));
      }

      const died = target.hp <= 0;
      dmgResult.targetHpAfter = target.hp;
      dmgResult.targetDied = died;
      dmgResult.rageGained = dmgResult.finalDamage;

      this.events.emit('damage-dealt', round, {
        ...dmgResult,
        attackerId: actor.id,
      });

      if (died) {
        target.alive = false;
        this.statusMgr.clearAllEffects(target);
        this.events.emit('fighter-died', round, {
          fighterId: target.id,
          killedBy: actor.id,
        });
      }

      results.push(dmgResult);
    }

    return results;
  }

  /**
   * Resolve a buff-type skill action.
   */
  private resolveBuffAction(
    actor: Fighter,
    action: ChosenAction,
    round: number
  ): ActionResult[] {
    const skill = getSkill(action.skillId!);

    // Pay cost for buffs (except counter-shock which was already checked)
    if (skill.id !== 'warrior-counter-shock' || !this.statusMgr.hasEffect(actor, 'counter-shock')) {
      this.paySkillCost(actor, skill, round);
    }

    if (!skill.buffEffect) return [];

    const results: ActionResult[] = [];

    if (skill.buffEffect.type === 'whip-boost') {
      // Whip: permanent AGI +1 and escape rate boost
      actor.whipUsed = true;
      this.statusMgr.recalculateStats(actor);

      this.events.emit('skill-used', round, {
        fighterId: actor.id,
        skillId: skill.id,
        skillName: skill.name,
        costPaid: skill.cost,
      });

      this.events.emit('buff-applied', round, {
        fighterId: actor.id,
        targetId: actor.id,
        effectApplied: null,
        whipPermanent: true,
        agiAfter: actor.currentAgi,
        escapeRateAfter: 0.7,
        resultType: 'buff',
      });

      results.push({
        resultType: 'buff',
        targetId: actor.id,
        effectApplied: null,
        whipPermanent: true,
        agiAfter: actor.currentAgi,
        escapeRateAfter: 0.7,
      });
    } else if (skill.buffEffect.type === 'shield-wall') {
      // Shield Wall: +2 DEF for 3 rounds
      const effect: StatusEffect = {
        type: 'shield-wall',
        remainingRounds: skill.buffEffect.duration,
        defBonus: skill.buffEffect.defBonus,
      };
      this.statusMgr.applyEffect(actor, effect);

      this.events.emit('skill-used', round, {
        fighterId: actor.id,
        skillId: skill.id,
        skillName: skill.name,
        costPaid: skill.cost,
      });

      this.events.emit('buff-applied', round, {
        fighterId: actor.id,
        targetId: actor.id,
        effectApplied: effect,
        resultType: 'buff',
      });

      results.push({
        resultType: 'buff',
        targetId: actor.id,
        effectApplied: effect,
      });
    } else if (skill.buffEffect.type === 'counter-shock') {
      // Counter Shock: apply status for this round
      const effect: StatusEffect = {
        type: 'counter-shock',
        remainingRounds: skill.buffEffect.duration,
      };
      this.statusMgr.applyEffect(actor, effect);

      this.events.emit('skill-used', round, {
        fighterId: actor.id,
        skillId: skill.id,
        skillName: skill.name,
        costPaid: skill.cost,
      });

      this.events.emit('buff-applied', round, {
        fighterId: actor.id,
        targetId: actor.id,
        effectApplied: effect,
        resultType: 'buff',
      });

      results.push({
        resultType: 'buff',
        targetId: actor.id,
        effectApplied: effect,
      });
    }

    return results;
  }

  /**
   * Pay a skill's resource cost. Returns false if can't afford.
   */
  private paySkillCost(actor: Fighter, skill: SkillDef, round: number): boolean {
    const { resource, amount } = skill.cost;

    // Check affordability
    if (resource === 'mp' && actor.mp < amount) return false;
    if (resource === 'hp' && actor.hp <= amount) return false; // HP requires > not >=
    if (resource === 'rage' && actor.rage < amount) return false;

    // Check dual cost (彩虹穿云: 20 MP + 30 RAGE)
    const dualCost = DUAL_COST_SKILLS[skill.id];
    if (dualCost) {
      if (dualCost.resource === 'rage' && actor.rage < dualCost.amount) return false;
    }

    // Deduct primary cost
    if (resource === 'mp') {
      actor.mp -= amount;
    } else if (resource === 'hp') {
      actor.hp -= amount;
      this.events.emit('hp-cost-paid', round, {
        fighterId: actor.id,
        hpCost: amount,
        hpAfter: actor.hp,
        diedFromCost: actor.hp <= 0,
      });
      // HP cost can kill — skill still fires per PRD
      if (actor.hp <= 0) {
        // Don't set alive=false yet — the attack still goes through
        // Death will be checked after attack resolves
      }
    } else if (resource === 'rage') {
      actor.rage -= amount;
    }

    // Deduct dual cost
    if (dualCost) {
      if (dualCost.resource === 'rage') {
        actor.rage -= dualCost.amount;
      }
    }

    return true;
  }
}
