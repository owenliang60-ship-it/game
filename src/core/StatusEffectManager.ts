import type { Fighter, StatusEffect } from './types';
import type { EventBus } from './EventBus';

/**
 * Manages status effects on fighters: apply, tick, expire, recalculate stats.
 */
export class StatusEffectManager {

  applyEffect(fighter: Fighter, effect: StatusEffect): void {
    fighter.statusEffects.push({ ...effect });
    this.recalculateStats(fighter);
  }

  /**
   * Tick all effects at round start.
   * Reduces remaining rounds by 1 and removes expired effects.
   * Called AFTER round increments but BEFORE action select.
   */
  tickEffects(fighter: Fighter, events: EventBus, round: number): void {
    const expired: StatusEffect[] = [];

    for (const effect of fighter.statusEffects) {
      if (effect.remainingRounds > 0) {
        effect.remainingRounds--;
        if (effect.remainingRounds <= 0) {
          expired.push(effect);
        }
      }
      // remainingRounds === 0 means permanent (never expires from tick)
      // But counter-shock with duration 1 will be set to remainingRounds=1 at application,
      // and expire the next round-start tick.
    }

    for (const effect of expired) {
      const idx = fighter.statusEffects.indexOf(effect);
      if (idx !== -1) {
        fighter.statusEffects.splice(idx, 1);
        events.emit('status-effect-expired', round, {
          fighterId: fighter.id,
          effectType: effect.type,
        });
      }
    }

    this.recalculateStats(fighter);
  }

  clearAllEffects(fighter: Fighter): void {
    fighter.statusEffects = [];
    fighter.guerrillaActive = false;
    fighter.whipUsed = false;
    this.recalculateStats(fighter);
  }

  hasEffect(fighter: Readonly<Fighter>, type: StatusEffect['type']): boolean {
    return fighter.statusEffects.some(e => e.type === type);
  }

  /**
   * Recalculate currentDef and currentAgi from base + status effects + flags.
   */
  recalculateStats(fighter: Fighter): void {
    let def = fighter.baseDef;
    let agi = fighter.baseAgi;

    for (const effect of fighter.statusEffects) {
      if (effect.defBonus) def += effect.defBonus;
      if (effect.agiBonus) agi += effect.agiBonus;
    }

    // Whip permanent AGI bonus
    if (fighter.whipUsed) {
      agi += 1;
    }

    fighter.currentDef = def;
    fighter.currentAgi = agi;
  }

  /**
   * Handle guerrilla tactics at round boundaries.
   * If archer used a ranged skill this round, activate guerrilla for next round.
   * If guerrilla was active but non-ranged was used, deactivate.
   */
  handleGuerrillaTactics(fighter: Fighter): void {
    if (fighter.usedRangedSkillThisRound) {
      // Activate guerrilla for next round if not already
      if (!this.hasEffect(fighter, 'guerrilla-boost')) {
        this.applyEffect(fighter, {
          type: 'guerrilla-boost',
          remainingRounds: 2, // Will tick down to 1 at next round-start, expire at round after
          agiBonus: 2,
        });
      }
      fighter.guerrillaActive = true;
    } else {
      // Remove guerrilla if was active but didn't use ranged this round
      if (fighter.guerrillaActive) {
        fighter.statusEffects = fighter.statusEffects.filter(e => e.type !== 'guerrilla-boost');
        fighter.guerrillaActive = false;
        this.recalculateStats(fighter);
      }
    }
  }
}
