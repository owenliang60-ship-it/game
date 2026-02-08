import type {
  Fighter, ChosenAction, AvailableAction, AIDifficulty, CharacterId, SkillDef,
} from '@/core/types';
import { getSkill, DUAL_COST_SKILLS } from '@/skills';

/**
 * AI decision engine using softmax selection over expected values.
 * Temperature controls exploration vs exploitation.
 * Scores are normalized to 0-5 range before softmax to ensure
 * meaningful probability distribution across actions.
 */
export class AIPlayer {
  private temperature: number;
  private surpriseRate: number;

  constructor(difficulty: AIDifficulty) {
    switch (difficulty) {
      case 'easy':
        this.temperature = 1.5;
        this.surpriseRate = 0.10;
        break;
      case 'normal':
        this.temperature = 0.8;
        this.surpriseRate = 0.05;
        break;
      case 'hard':
        this.temperature = 0.3;
        this.surpriseRate = 0.03;
        break;
    }
  }

  /**
   * Choose action and targets for an AI fighter.
   */
  chooseAction(
    fighter: Readonly<Fighter>,
    allFighters: Readonly<Fighter>[],
    availableActions: AvailableAction[],
    round: number
  ): ChosenAction {
    const enemies = allFighters.filter(f => f.alive && f.id !== fighter.id);
    if (enemies.length === 0) {
      return { type: 'defend' };
    }

    // Filter to affordable actions only
    const affordable = availableActions.filter(a => a.affordable);
    if (affordable.length === 0) {
      return { type: 'basic-attack', targetIds: [this.pickTarget(fighter, enemies, null)] };
    }

    // Surprise: occasionally pick a random action
    if (Math.random() < this.surpriseRate) {
      const random = affordable[Math.floor(Math.random() * affordable.length)];
      return this.buildAction(random, fighter, enemies);
    }

    // Evaluate each action and normalize scores to 0-5 range for softmax
    const rawScores = affordable.map(a => this.evaluateAction(a, fighter, enemies, round));
    const maxRaw = Math.max(...rawScores);
    const minRaw = Math.min(...rawScores);
    const range = maxRaw - minRaw || 1;
    const scores = rawScores.map(s => ((s - minRaw) / range) * 5);

    // Softmax selection
    const index = this.softmaxSelect(scores);
    return this.buildAction(affordable[index], fighter, enemies);
  }

  private buildAction(
    available: AvailableAction,
    fighter: Readonly<Fighter>,
    enemies: Readonly<Fighter>[]
  ): ChosenAction {
    const action: ChosenAction = { type: available.type };

    if (available.skillId) {
      action.skillId = available.skillId;
      const skill = getSkill(available.skillId);

      if (skill.targetMode === 'self') {
        // No target needed for self-buffs
      } else if (skill.targetMode === 'all-enemies') {
        // All enemies targeted automatically
        action.targetIds = enemies.map(e => e.id);
      } else if (skill.targetMode === 'multi-enemy') {
        // Pick 1-2 targets
        const maxTargets = skill.maxTargets ?? 2;
        const sorted = [...enemies].sort((a, b) => this.scoreTarget(fighter, a, skill) - this.scoreTarget(fighter, b, skill)).reverse();
        action.targetIds = sorted.slice(0, Math.min(maxTargets, sorted.length)).map(e => e.id);
      } else {
        // Single enemy
        action.targetIds = [this.pickTarget(fighter, enemies, skill)];
      }
    } else if (available.type === 'basic-attack') {
      action.targetIds = [this.pickTarget(fighter, enemies, null)];
    }
    // defend and escape have no targets

    return action;
  }

  /**
   * Evaluate an action's expected value.
   */
  private evaluateAction(
    action: AvailableAction,
    fighter: Readonly<Fighter>,
    enemies: Readonly<Fighter>[],
    round: number
  ): number {
    let score = 0;

    switch (action.type) {
      case 'basic-attack': {
        // Base score: expected damage
        const bestTarget = this.findBestTarget(fighter, enemies, null);
        score = fighter.baseAtk * (10 - bestTarget.currentDef) / 10;
        break;
      }

      case 'skill': {
        const skill = getSkill(action.skillId!);

        if (skill.type === 'buff') {
          score = this.evaluateBuff(skill, fighter, enemies, round);
        } else {
          // Attack skill
          const bestTarget = this.findBestTarget(fighter, enemies, skill);
          score = this.evaluateAttackSkill(skill, fighter, bestTarget, enemies);
        }
        break;
      }

      case 'defend': {
        // Value defense more when low HP
        const hpPercent = fighter.hp / fighter.maxHp;
        score = 15 + (1 - hpPercent) * 25;
        // Less valuable if no enemies are attacking
        break;
      }

      case 'escape': {
        const hpPercent = fighter.hp / fighter.maxHp;
        score = 10 + (1 - hpPercent) * 30;
        // More valuable when low HP
        if (hpPercent < 0.3) score += 20;
        break;
      }
    }

    return score;
  }

  private evaluateAttackSkill(
    skill: SkillDef,
    fighter: Readonly<Fighter>,
    target: Readonly<Fighter>,
    enemies: Readonly<Fighter>[]
  ): number {
    let baseDmg = skill.baseDamage * (10 - target.currentDef) / 10;

    // True damage
    if (skill.isTrueDamage) {
      baseDmg = skill.baseDamage * enemies.length; // All enemies
    }

    // Condition bonus (estimate ~40% chance of condition being met)
    const condChance = this.estimateConditionChance(skill, target);
    const condMult = skill.conditionMultiplier ?? 1;
    const expectedDmg = baseDmg * (condChance * condMult + (1 - condChance));

    // Precision bonus
    if (fighter.passives.some(p => p.effect.type === 'precise-aim')) {
      const agiDiff = fighter.currentAgi - target.currentAgi;
      if (agiDiff > 0) {
        baseDmg += 5 * agiDiff;
      }
    }

    // Can kill bonus
    if (expectedDmg >= target.hp) {
      return expectedDmg + 50;
    }

    // HP cost penalty
    if (skill.cost.resource === 'hp') {
      baseDmg -= skill.cost.amount;
    }

    return Math.max(0, expectedDmg);
  }

  private evaluateBuff(
    skill: SkillDef,
    fighter: Readonly<Fighter>,
    enemies: Readonly<Fighter>[],
    round: number
  ): number {
    if (!skill.buffEffect) return 0;

    switch (skill.buffEffect.type) {
      case 'shield-wall':
        // Value more when multiple enemies or low HP
        return 25 + enemies.length * 10 + (1 - fighter.hp / fighter.maxHp) * 20;

      case 'counter-shock':
        // Value if enemies likely to use melee
        return 30 + enemies.filter(e => e.basicAttackType === 'melee').length * 10;

      case 'whip-boost':
        // Value early game (AGI and escape benefits compound)
        if (fighter.whipUsed) return -100; // Already used, don't pick again
        return round <= 3 ? 35 : 15;

      default:
        return 10;
    }
  }

  private estimateConditionChance(skill: SkillDef, target: Readonly<Fighter>): number {
    switch (skill.condition) {
      case 'target-escaping':
        return target.hp / target.maxHp < 0.3 ? 0.4 : 0.15;
      case 'target-defending':
        return 0.2;
      case 'target-not-defending':
        return 0.8;
      case 'target-using-skill':
        return 0.5;
      case 'target-using-melee-skill':
        return target.basicAttackType === 'melee' ? 0.35 : 0.1;
      case 'target-basic-attacking':
        return 0.25;
      case 'target-not-escaping':
        return 0.85;
      case 'unconditional':
        return 1.0;
      case 'none':
        return 0;
    }
  }

  /**
   * Pick the best target for an attack.
   */
  private pickTarget(
    fighter: Readonly<Fighter>,
    enemies: Readonly<Fighter>[],
    skill: SkillDef | null
  ): CharacterId {
    return this.findBestTarget(fighter, enemies, skill).id;
  }

  private findBestTarget(
    fighter: Readonly<Fighter>,
    enemies: Readonly<Fighter>[],
    skill: SkillDef | null
  ): Readonly<Fighter> {
    let bestScore = -Infinity;
    let best = enemies[0];

    for (const enemy of enemies) {
      const score = this.scoreTarget(fighter, enemy, skill);
      if (score > bestScore) {
        bestScore = score;
        best = enemy;
      }
    }

    return best;
  }

  /**
   * Score a target for prioritization.
   */
  private scoreTarget(
    fighter: Readonly<Fighter>,
    target: Readonly<Fighter>,
    skill: SkillDef | null
  ): number {
    let score = 0;

    // Prefer low HP (can kill)
    const hpPercent = target.hp / target.maxHp;
    score += (1 - hpPercent) * 30;

    // Can kill bonus
    const estimatedDmg = skill
      ? skill.baseDamage * (10 - target.currentDef) / 10
      : fighter.baseAtk * (10 - target.currentDef) / 10;

    if (estimatedDmg >= target.hp) {
      score += 100;
    }

    // High rage = threat (especially for archer with 漫天花雨)
    if (target.rage >= 60) score += 15;

    // Precision bonus target (low AGI)
    if (fighter.passives.some(p => p.effect.type === 'precise-aim')) {
      const agiDiff = fighter.currentAgi - target.currentAgi;
      if (agiDiff > 0) score += agiDiff * 3;
    }

    // Lower DEF = more damage
    score += (5 - target.currentDef) * 3;

    return score;
  }

  /**
   * Softmax selection: convert scores to probabilities and sample.
   */
  private softmaxSelect(scores: number[]): number {
    if (scores.length === 0) return 0;
    if (scores.length === 1) return 0;

    const maxScore = Math.max(...scores);
    const exps = scores.map(s => Math.exp((s - maxScore) / this.temperature));
    const sum = exps.reduce((a, b) => a + b, 0);
    const probs = exps.map(e => e / sum);

    // Sample from distribution
    const r = Math.random();
    let cumulative = 0;
    for (let i = 0; i < probs.length; i++) {
      cumulative += probs[i];
      if (r <= cumulative) return i;
    }
    return probs.length - 1;
  }
}
