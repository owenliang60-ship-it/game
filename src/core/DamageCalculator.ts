import type { Fighter, SkillDef, DamageResult, ChosenAction } from './types';
import { roundTo2, clamp } from './utils';
import { evaluateCondition } from '@/skills/skillConditions';

/**
 * Pure damage calculation functions.
 * No side effects — takes fighter data and skill data, returns numbers.
 */
export class DamageCalculator {

  /**
   * Calculate damage for one attacker → one target.
   * Handles normal damage, true damage, conditions, DEF, and precision bonus.
   */
  calculateDamage(
    attacker: Readonly<Fighter>,
    target: Readonly<Fighter>,
    skill: SkillDef | null,
    targetAction: ChosenAction
  ): DamageResult {
    const isTrueDamage = skill?.isTrueDamage ?? false;
    const baseDamage = skill ? skill.baseDamage : attacker.baseAtk;

    // True damage: fixed, ignores everything
    if (isTrueDamage) {
      return {
        resultType: 'damage',
        targetId: target.id,
        baseDamage,
        conditionMet: false,
        conditionMultiplier: 1,
        defReduction: 0,
        precisionBonus: 0,
        finalDamage: baseDamage,
        isTrueDamage: true,
        isReflected: false,
        dodged: false,
        rageGained: baseDamage,
        targetHpAfter: roundTo2(target.hp - baseDamage),
        targetDied: target.hp - baseDamage <= 0,
      };
    }

    // Evaluate skill condition
    const condResult = skill
      ? evaluateCondition(skill.condition, skill.conditionMultiplier, skill.conditionZeroDamage, targetAction)
      : { met: false, multiplier: 1, zeroDamage: false };

    // 冲锋 special: damage → 0 if target escaping
    if (condResult.zeroDamage) {
      return {
        resultType: 'damage',
        targetId: target.id,
        baseDamage,
        conditionMet: true,
        conditionMultiplier: 0,
        defReduction: 0,
        precisionBonus: 0,
        finalDamage: 0,
        isTrueDamage: false,
        isReflected: false,
        dodged: false,
        rageGained: 0,
        targetHpAfter: target.hp,
        targetDied: false,
      };
    }

    // Normal damage formula: baseDmg * conditionMult * (10 - DEF) / 10
    const effectiveDef = target.isDefending
      ? this.getDefenseBoost(target)
      : target.currentDef;

    const afterCondition = baseDamage * condResult.multiplier;
    const defFactor = (10 - effectiveDef) / 10;
    const afterDef = afterCondition * defFactor;
    const defReduction = afterCondition - afterDef;

    // Precision bonus (archer passive)
    const precisionBonus = this.calculatePrecisionBonus(attacker, target);

    const finalDamage = roundTo2(Math.max(0, afterDef + precisionBonus));
    const targetHpAfter = roundTo2(target.hp - finalDamage);

    return {
      resultType: 'damage',
      targetId: target.id,
      baseDamage,
      conditionMet: condResult.met,
      conditionMultiplier: condResult.multiplier,
      defReduction: roundTo2(defReduction),
      precisionBonus: roundTo2(precisionBonus),
      finalDamage,
      isTrueDamage: false,
      isReflected: false,
      dodged: false,
      rageGained: finalDamage,
      targetHpAfter,
      targetDied: targetHpAfter <= 0,
    };
  }

  /**
   * Counter-shock calculation.
   * Only applies to melee attacks. Returns null if not applicable.
   */
  calculateCounterShock(
    incomingDamage: number,
    attackType: string,
    isTrueDamage: boolean
  ): { selfDamage: number; reflectedDamage: number } | null {
    // True damage ignores counter-shock entirely
    if (isTrueDamage) return null;

    // Only melee triggers counter-shock
    if (attackType !== 'melee') return null;

    return {
      selfDamage: roundTo2(incomingDamage * 0.25),
      reflectedDamage: roundTo2(incomingDamage * 0.75),
    };
  }

  /**
   * Calculate precision bonus for archer's passive.
   * +5 per AGI advantage. Only when attacker has 'precise-aim' passive.
   */
  calculatePrecisionBonus(
    attacker: Readonly<Fighter>,
    target: Readonly<Fighter>
  ): number {
    const preciseAim = attacker.passives.find(p => p.effect.type === 'precise-aim');
    if (!preciseAim) return 0;

    const agiDiff = attacker.currentAgi - target.currentAgi;
    if (agiDiff <= 0) return 0;

    const damagePerAgi = preciseAim.effect.type === 'precise-aim' ? preciseAim.effect.damagePerAgi : 5;
    return damagePerAgi * agiDiff;
  }

  /**
   * Get effective DEF when defending.
   * DEF = baseDEF * (1 + 0.1 * baseDEF)
   */
  getDefenseBoost(fighter: Readonly<Fighter>): number {
    return roundTo2(fighter.currentDef * (1 + 0.1 * fighter.baseDef));
  }

  /**
   * Roll escape dodge for one incoming attack.
   * Returns true if the attack is dodged.
   */
  rollEscapeDodge(
    hasWhip: boolean,
    skill: SkillDef | null,
    isBasicAttack: boolean,
    isTrueDamage: boolean
  ): boolean {
    // True damage: always hits, no dodge
    if (isTrueDamage) return false;

    // Pursuit skills: always hit escaped targets
    if (skill?.isPursuit) return false;

    let dodgeRate: number;

    if (isBasicAttack) {
      dodgeRate = hasWhip ? 1.0 : 0.8;
    } else {
      // Non-pursuit skill
      dodgeRate = hasWhip ? 0.8 : 0.5;
    }

    return Math.random() < dodgeRate;
  }

  /**
   * Roll escape success.
   */
  rollEscapeSuccess(hasWhip: boolean): boolean {
    const rate = hasWhip ? 0.7 : 0.5;
    return Math.random() < rate;
  }
}
