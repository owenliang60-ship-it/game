import type {
  Fighter, ChosenAction, AvailableAction, CharacterId, CharacterClass, SkillDef, ActionType,
} from '@/core/types';
import { getSkill } from '@/skills';

/**
 * AI decision engine with opponent prediction system.
 *
 * Two-phase approach:
 *   1. Predict each opponent's likely action (character-aware, state-aware)
 *   2. Evaluate own actions based on those predictions
 *
 * Escape/defend are valued by damage avoidance/mitigation, not just HP%.
 * Condition skills use predictions instead of static probabilities.
 * This naturally produces emergent character-specific combat styles.
 */

/** Predicted probability distribution of an opponent's actions */
interface ActionPrediction {
  escape: number;
  defend: number;
  basicAttack: number;
  skill: number;
  meleeSkill: number; // subset of skill — P(melee skill specifically)
}

/** Base action probabilities by character class */
const BASE_PROBS: Record<CharacterClass, { escape: number; defend: number; basicAttack: number; skill: number }> = {
  'knight':          { escape: 0.05, defend: 0.10, basicAttack: 0.30, skill: 0.55 },
  'armored-warrior': { escape: 0.08, defend: 0.22, basicAttack: 0.25, skill: 0.45 },
  'archer':          { escape: 0.10, defend: 0.05, basicAttack: 0.15, skill: 0.70 },
};

/** Knight with whip has shifted base probabilities (guerrilla identity) */
const KNIGHT_WHIP_PROBS = { escape: 0.25, defend: 0.05, basicAttack: 0.20, skill: 0.50 };

/** Fraction of attack skills that are melee, per class */
const MELEE_SKILL_FRACTION: Record<CharacterClass, number> = {
  'knight': 0.8,          // 4/5 attack skills are melee
  'armored-warrior': 1.0, // 3/3 attack skills are melee
  'archer': 0.2,          // 1/5 attack skills is melee (dagger thrust)
};

export class AIPlayer {
  private readonly temperature = 0.8;
  private readonly surpriseRate = 0.05;
  private actionHistory = new Map<string, ActionType[]>();

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

    const affordable = availableActions.filter(a => a.affordable);
    if (affordable.length === 0) {
      const chosen: ChosenAction = { type: 'basic-attack', targetIds: [this.pickTarget(fighter, enemies, null)] };
      this.recordAction(fighter.id, chosen.type);
      return chosen;
    }

    // Surprise: occasionally pick a random action
    if (Math.random() < this.surpriseRate) {
      const random = affordable[Math.floor(Math.random() * affordable.length)];
      const chosen = this.buildAction(random, fighter, enemies);
      this.recordAction(fighter.id, chosen.type);
      return chosen;
    }

    // Phase 1: Predict opponent actions
    const predictions = new Map<string, ActionPrediction>();
    for (const enemy of enemies) {
      predictions.set(enemy.id, this.predictActions(enemy, allFighters));
    }

    // Phase 2: Evaluate each action using predictions
    const rawScores = affordable.map(a => this.evaluateAction(a, fighter, enemies, round, predictions));
    const maxRaw = Math.max(...rawScores);
    const minRaw = Math.min(...rawScores);
    const range = maxRaw - minRaw || 1;
    const scores = rawScores.map(s => ((s - minRaw) / range) * 5);

    // Softmax selection
    const index = this.softmaxSelect(scores);
    const chosen = this.buildAction(affordable[index], fighter, enemies);
    this.recordAction(fighter.id, chosen.type);
    return chosen;
  }

  // ============================================================
  // Phase 1: Opponent Action Prediction
  // ============================================================

  /**
   * Predict an opponent's action distribution for this round.
   * Factors: character type, HP pressure, resources, buffs, history, threat level.
   */
  private predictActions(
    opponent: Readonly<Fighter>,
    allFighters: Readonly<Fighter>[]
  ): ActionPrediction {
    // 1. Character-type base probabilities
    const isKnightWithWhip = opponent.characterClass === 'knight' && opponent.whipUsed;
    const probs = isKnightWithWhip
      ? { ...KNIGHT_WHIP_PROBS }
      : { ...BASE_PROBS[opponent.characterClass] };

    // 2. HP pressure: low HP → more escape/defend
    const hpPercent = opponent.hp / opponent.maxHp;
    if (hpPercent < 0.5) {
      const pressure = 1 - hpPercent;
      const escapeBoost = pressure * 0.25;
      const defendBoost = pressure * 0.15;
      const totalBoost = escapeBoost + defendBoost;
      const offensiveTotal = probs.basicAttack + probs.skill;
      if (offensiveTotal > totalBoost) {
        const scale = (offensiveTotal - totalBoost) / offensiveTotal;
        probs.basicAttack *= scale;
        probs.skill *= scale;
      }
      probs.escape += escapeBoost;
      probs.defend += defendBoost;
    }

    // 3. Resource state: low MP and low rage → shift from skill to attack/defend
    if (opponent.mp < 10 && opponent.rage < 60) {
      const transfer = probs.skill * 0.4;
      probs.skill -= transfer;
      probs.basicAttack += transfer * 0.6;
      probs.defend += transfer * 0.4;
    }

    // 4. Active buffs reduce defensive needs
    if (opponent.statusEffects.some(e => e.type === 'counter-shock')) {
      const reduction = probs.defend * 0.5;
      probs.defend -= reduction;
      probs.skill += reduction;
    }
    if (opponent.statusEffects.some(e => e.type === 'shield-wall')) {
      const reduction = probs.defend * 0.3;
      probs.defend -= reduction;
      probs.skill += reduction * 0.5;
      probs.basicAttack += reduction * 0.5;
    }

    // 5. Threat level: more enemies alive → more defensive
    const enemyCount = allFighters.filter(f => f.alive && f.id !== opponent.id).length;
    if (enemyCount >= 3) {
      const threatBoost = 0.05;
      probs.escape += threatBoost;
      probs.defend += threatBoost;
      const totalReduction = threatBoost * 2;
      const offensiveTotal = probs.basicAttack + probs.skill;
      if (offensiveTotal > totalReduction) {
        const scale = (offensiveTotal - totalReduction) / offensiveTotal;
        probs.basicAttack *= scale;
        probs.skill *= scale;
      }
    }

    // 6. History mix: blend prior with observed frequency (after 3+ rounds)
    const history = this.actionHistory.get(opponent.id);
    if (history && history.length >= 3) {
      const recent = history.slice(-5);
      const observed = { escape: 0, defend: 0, basicAttack: 0, skill: 0 };
      for (const action of recent) {
        if (action === 'escape') observed.escape++;
        else if (action === 'defend') observed.defend++;
        else if (action === 'basic-attack') observed.basicAttack++;
        else observed.skill++;
      }
      const n = recent.length;
      probs.escape = 0.6 * probs.escape + 0.4 * (observed.escape / n);
      probs.defend = 0.6 * probs.defend + 0.4 * (observed.defend / n);
      probs.basicAttack = 0.6 * probs.basicAttack + 0.4 * (observed.basicAttack / n);
      probs.skill = 0.6 * probs.skill + 0.4 * (observed.skill / n);
    }

    // Normalize to sum = 1.0
    const total = probs.escape + probs.defend + probs.basicAttack + probs.skill;
    if (total > 0) {
      probs.escape /= total;
      probs.defend /= total;
      probs.basicAttack /= total;
      probs.skill /= total;
    }

    return {
      ...probs,
      meleeSkill: probs.skill * MELEE_SKILL_FRACTION[opponent.characterClass],
    };
  }

  // ============================================================
  // Phase 2: Action Evaluation
  // ============================================================

  private evaluateAction(
    action: AvailableAction,
    fighter: Readonly<Fighter>,
    enemies: Readonly<Fighter>[],
    round: number,
    predictions: Map<string, ActionPrediction>
  ): number {
    switch (action.type) {
      case 'basic-attack': {
        const bestTarget = this.findBestTarget(fighter, enemies, null);
        return fighter.baseAtk * (10 - bestTarget.currentDef) / 10;
      }

      case 'skill': {
        const skill = getSkill(action.skillId!);
        if (skill.type === 'buff') {
          return this.evaluateBuff(skill, fighter, enemies, round);
        }
        const bestTarget = this.findBestTarget(fighter, enemies, skill);
        return this.evaluateAttackSkill(skill, fighter, bestTarget, enemies, predictions);
      }

      case 'escape':
        return this.evaluateEscape(fighter, enemies, predictions);

      case 'defend':
        return this.evaluateDefend(fighter, enemies, predictions);
    }

    return 0;
  }

  /**
   * Escape evaluation: damage avoidance model.
   * Value = tactical damage avoided + strategic identity bonus + combo setup
   *       × survival multiplier × anti-repeat penalty
   */
  private evaluateEscape(
    fighter: Readonly<Fighter>,
    enemies: Readonly<Fighter>[],
    predictions: Map<string, ActionPrediction>
  ): number {
    const hasWhip = fighter.whipUsed;
    const escapeSuccessRate = hasWhip ? 0.7 : 0.5;
    const avgDodgeRate = hasWhip ? 0.90 : 0.65;

    // Tactical: expected damage avoided by escaping
    let escapeValue = 0;
    for (const enemy of enemies) {
      const pred = predictions.get(enemy.id);
      if (!pred) continue;
      const attackProb = pred.basicAttack + pred.skill;
      const estimatedDmg = enemy.baseAtk * (10 - fighter.currentDef) / 10;
      escapeValue += attackProb * estimatedDmg * escapeSuccessRate * avgDodgeRate;
    }

    // Strategic: character identity bonuses
    if (fighter.characterClass === 'knight' && hasWhip) {
      escapeValue += 15; // guerrilla warfare is knight's design core
    }
    if (fighter.characterClass === 'archer' && fighter.hp / fighter.maxHp < 0.5) {
      escapeValue += 8; // squishy, escape is wise
    }

    // Combo: chase-slash setup (knight escape → pursuit next round)
    if (fighter.characterClass === 'knight' && fighter.mp >= 10) {
      escapeValue += 8;
    }

    // Survival multiplier: lower HP = more valuable to avoid damage
    const hpPercent = fighter.hp / fighter.maxHp;
    escapeValue *= (1 + (1 - hpPercent) * 1.5);

    // Anti-repeat: consecutive escape penalty
    const history = this.actionHistory.get(fighter.id);
    if (history && history.length > 0 && history[history.length - 1] === 'escape') {
      escapeValue *= 0.5;
    }

    return escapeValue;
  }

  /**
   * Defend evaluation: damage mitigation model.
   * Value = tactical damage mitigated + strategic identity bonus
   *       × survival multiplier × anti-repeat penalty
   */
  private evaluateDefend(
    fighter: Readonly<Fighter>,
    enemies: Readonly<Fighter>[],
    predictions: Map<string, ActionPrediction>
  ): number {
    const currentDef = fighter.currentDef;
    const defendDef = currentDef * (1 + 0.1 * fighter.baseDef);
    const defGap = 10 - currentDef;

    // Tactical: expected damage mitigated by defending
    let defendValue = 0;
    if (defGap > 0) {
      const mitigationGain = (defendDef - currentDef) / defGap;
      for (const enemy of enemies) {
        const pred = predictions.get(enemy.id);
        if (!pred) continue;
        const attackProb = pred.basicAttack + pred.skill;
        const estimatedDmg = enemy.baseAtk * defGap / 10;
        defendValue += attackProb * estimatedDmg * mitigationGain;
      }
    }

    // Strategic: character identity bonuses
    if (fighter.characterClass === 'armored-warrior') {
      defendValue += 12;
      if (fighter.statusEffects.some(e => e.type === 'shield-wall')) {
        defendValue += 8; // stacking DEF is powerful
      }
    }

    // Survival multiplier
    const hpPercent = fighter.hp / fighter.maxHp;
    defendValue *= (1 + (1 - hpPercent) * 1.5);

    // Anti-repeat: consecutive defend penalty
    const history = this.actionHistory.get(fighter.id);
    if (history && history.length > 0 && history[history.length - 1] === 'defend') {
      defendValue *= 0.6;
    }

    return defendValue;
  }

  /**
   * Attack skill evaluation using opponent predictions for condition chances.
   * Fixes conditionZeroDamage handling (Charge damage → 0 when target escapes).
   */
  private evaluateAttackSkill(
    skill: SkillDef,
    fighter: Readonly<Fighter>,
    target: Readonly<Fighter>,
    enemies: Readonly<Fighter>[],
    predictions: Map<string, ActionPrediction>
  ): number {
    let baseDmg = skill.baseDamage * (10 - target.currentDef) / 10;

    // True damage: fixed, hits all enemies
    if (skill.isTrueDamage) {
      baseDmg = skill.baseDamage * enemies.length;
    }

    // Condition handling using opponent predictions
    const pred = predictions.get(target.id);
    const condChance = pred
      ? this.getConditionChance(skill, pred)
      : this.getFallbackConditionChance(skill, target);

    let expectedDmg: number;
    if (skill.conditionZeroDamage) {
      // Charge-type skills: damage → 0 when condition is met (target escaping)
      expectedDmg = baseDmg * (1 - condChance);
    } else {
      const condMult = skill.conditionMultiplier ?? 1;
      expectedDmg = baseDmg * (condChance * condMult + (1 - condChance));
    }

    // Precision bonus (archer passive)
    if (fighter.passives.some(p => p.effect.type === 'precise-aim')) {
      const agiDiff = fighter.currentAgi - target.currentAgi;
      if (agiDiff > 0) {
        expectedDmg += 5 * agiDiff;
      }
    }

    // Can kill bonus
    if (expectedDmg >= target.hp) {
      return expectedDmg + 50;
    }

    // HP cost penalty
    if (skill.cost.resource === 'hp') {
      expectedDmg -= skill.cost.amount;
    }

    // Pursuit skill bonus: value increases when target likely escaping
    if (skill.isPursuit && pred) {
      expectedDmg += pred.escape * 15;
    }

    return Math.max(0, expectedDmg);
  }

  /** Get condition trigger chance from opponent prediction */
  private getConditionChance(skill: SkillDef, pred: ActionPrediction): number {
    switch (skill.condition) {
      case 'target-escaping':        return pred.escape;
      case 'target-defending':       return pred.defend;
      case 'target-not-defending':   return 1 - pred.defend;
      case 'target-using-skill':     return pred.skill;
      case 'target-using-melee-skill': return pred.meleeSkill;
      case 'target-basic-attacking': return pred.basicAttack;
      case 'target-not-escaping':    return 1 - pred.escape;
      case 'unconditional':          return 1.0;
      case 'none':                   return 0;
    }
  }

  /** Fallback when no prediction available (safety net) */
  private getFallbackConditionChance(skill: SkillDef, target: Readonly<Fighter>): number {
    switch (skill.condition) {
      case 'target-escaping':        return 0.15;
      case 'target-defending':       return 0.2;
      case 'target-not-defending':   return 0.8;
      case 'target-using-skill':     return 0.5;
      case 'target-using-melee-skill': return target.basicAttackType === 'melee' ? 0.35 : 0.1;
      case 'target-basic-attacking': return 0.25;
      case 'target-not-escaping':    return 0.85;
      case 'unconditional':          return 1.0;
      case 'none':                   return 0;
    }
  }

  /** Record a fighter's chosen action for history-based prediction */
  private recordAction(fighterId: string, actionType: ActionType): void {
    let history = this.actionHistory.get(fighterId);
    if (!history) {
      history = [];
      this.actionHistory.set(fighterId, history);
    }
    history.push(actionType);
    if (history.length > 5) {
      history.shift();
    }
  }

  // ============================================================
  // Unchanged: action building, buff evaluation, targeting, softmax
  // ============================================================

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
    if (enemies.length === 0) return fighter;

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

    // High rage = threat (especially for archer with arrow rain)
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
    if (sum === 0) return Math.floor(Math.random() * scores.length);
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
