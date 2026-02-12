import type { Fighter, AvailableAction, SkillDef, ChosenAction, ActionType } from '@/core/types';
import { getSkill, DUAL_COST_SKILLS } from '@/skills';
import { evaluateCondition } from '@/skills/skillConditions';
import { DamageCalculator } from '@/core/DamageCalculator';

/**
 * 1v1 Payoff Matrix: exhaustive outcome simulation for game-theoretic AI.
 *
 * For every (myAction, opAction) pair, computes the deterministic/expected outcome.
 * Condition skills are resolved exactly — no probability estimates needed.
 * Counter-shock, escape dodge, and DEF boost are all calculated precisely.
 */

// --- Data Structures ---

export interface MatrixCell {
  myDmgDealt: number;
  myDmgTaken: number;
  myHpCost: number;
  myMpSpent: number;
  myRageSpent: number;
  myRageGained: number;
  opRageGained: number;
  buffValue: number;
  canKill: boolean;
  couldDie: boolean;
  payoff: number;
}

export interface PayoffResult {
  myActions: AvailableAction[];
  opActions: AvailableAction[];
  matrix: MatrixCell[][];
  opPayoffs: number[][];
}

// --- Helpers ---

const dmgCalc = new DamageCalculator();

/** Get the effective DEF when defending: def * (1 + 0.1 * baseDef) */
function getDefendDef(fighter: Readonly<Fighter>): number {
  return fighter.currentDef * (1 + 0.1 * fighter.baseDef);
}

/** Calculate damage after DEF reduction */
function applyDef(baseDmg: number, def: number): number {
  return Math.max(0, baseDmg * (10 - def) / 10);
}

/** Precision bonus for archer passive */
function precisionBonus(attacker: Readonly<Fighter>, target: Readonly<Fighter>): number {
  return dmgCalc.calculatePrecisionBonus(attacker, target);
}

/** Check if a skill has counter-shock interaction (melee, non-true-damage) */
function triggersCounterShock(skill: SkillDef | null, basicAttackType: string): boolean {
  if (skill) return skill.type === 'melee' && !skill.isTrueDamage;
  return basicAttackType === 'melee';
}

/** Convert an AvailableAction to a ChosenAction stub for condition evaluation */
function toChosenAction(action: AvailableAction): ChosenAction {
  if (action.type === 'skill' && action.skillId) {
    return { type: 'skill', skillId: action.skillId };
  }
  return { type: action.type };
}

// --- Escape Expected Value ---

/**
 * Compute expected damage multiplier when target is escaping.
 * Returns the fraction of damage that gets through on average.
 *
 * Escape flow: escape roll → if success, dodge roll per incoming attack.
 * P(hit) = P(escape fail) + P(escape success) × P(not dodged)
 */
function escapeExpectedHitRate(
  targetHasWhip: boolean,
  skill: SkillDef | null,
  isBasicAttack: boolean,
  isTrueDamage: boolean
): number {
  if (isTrueDamage) return 1.0;
  if (skill?.isPursuit) return 1.0;

  const escapeSuccessRate = targetHasWhip ? 0.7 : 0.5;

  let dodgeRate: number;
  if (isBasicAttack) {
    dodgeRate = targetHasWhip ? 1.0 : 0.8;
  } else {
    dodgeRate = targetHasWhip ? 0.8 : 0.5;
  }

  return (1 - escapeSuccessRate) + escapeSuccessRate * (1 - dodgeRate);
}

// --- Core: Compute a Single Cell ---

/**
 * Compute one cell of the payoff matrix: what happens when I do myAction and opponent does opAction.
 */
function computeCell(
  me: Readonly<Fighter>,
  op: Readonly<Fighter>,
  myAction: AvailableAction,
  opAction: AvailableAction,
  round: number
): MatrixCell {
  let myDmgDealt = 0;
  let myDmgTaken = 0;
  let myHpCost = 0;
  let myMpSpent = 0;
  let myRageSpent = 0;
  let myRageGained = 0;
  let opRageGained = 0;
  let buffValue = 0;

  const opChosenAction = toChosenAction(opAction);
  const myChosenAction = toChosenAction(myAction);

  // --- My action effects ---
  if (myAction.type === 'basic-attack') {
    const effectiveDef = opAction.type === 'defend' ? getDefendDef(op) : op.currentDef;
    let dmg = applyDef(me.baseAtk, effectiveDef) + precisionBonus(me, op);

    if (opAction.type === 'escape') {
      dmg *= escapeExpectedHitRate(op.whipUsed, null, true, false);
    }

    if (me.basicAttackType === 'melee' && hasCounterShock(op, opAction)) {
      myDmgDealt += dmg * 0.25;
      opRageGained += dmg * 0.25;
      myDmgTaken += dmg * 0.75;
      myRageGained += dmg * 0.75;
    } else {
      myDmgDealt += dmg;
      opRageGained += dmg;
    }

  } else if (myAction.type === 'skill' && myAction.skillId) {
    const skill = getSkill(myAction.skillId);

    if (skill.cost.resource === 'mp') myMpSpent = skill.cost.amount;
    else if (skill.cost.resource === 'hp') myHpCost = skill.cost.amount;
    else if (skill.cost.resource === 'rage') myRageSpent = skill.cost.amount;
    const dualCost = DUAL_COST_SKILLS[skill.id];
    if (dualCost && dualCost.resource === 'rage') myRageSpent += dualCost.amount;

    if (skill.type === 'buff') {
      buffValue = estimateBuffValue(skill, me, op, round);
    } else {
      let dmg = computeAttackDamage(skill, me, op, opAction, opChosenAction);

      // Apply escape dodge rate when opponent is escaping
      if (opAction.type === 'escape') {
        dmg *= escapeExpectedHitRate(
          op.whipUsed, skill, false, skill.isTrueDamage ?? false
        );
      }

      if (triggersCounterShock(skill, me.basicAttackType) && hasCounterShock(op, opAction)) {
        myDmgDealt += dmg * 0.25;
        opRageGained += dmg * 0.25;
        myDmgTaken += dmg * 0.75;
        myRageGained += dmg * 0.75;
      } else {
        myDmgDealt += dmg;
        opRageGained += dmg;
      }
    }
  }
  // escape and defend: no damage dealt (value is from reducing damage taken)

  // --- Opponent's action effects on me ---
  if (opAction.type === 'basic-attack') {
    const myDef = myAction.type === 'defend' ? getDefendDef(me) : me.currentDef;
    let dmg = applyDef(op.baseAtk, myDef) + precisionBonus(op, me);

    if (myAction.type === 'escape') {
      dmg *= escapeExpectedHitRate(me.whipUsed, null, true, false);
    }

    if (op.basicAttackType === 'melee' && hasCounterShock(me, myAction)) {
      myDmgTaken += dmg * 0.25;
      myRageGained += dmg * 0.25;
    } else {
      myDmgTaken += dmg;
      myRageGained += dmg;
    }

  } else if (opAction.type === 'skill' && opAction.skillId) {
    const opSkill = getSkill(opAction.skillId);

    if (opSkill.type !== 'buff') {
      let dmg = computeAttackDamage(opSkill, op, me, myAction, myChosenAction);

      if (myAction.type === 'escape') {
        dmg *= escapeExpectedHitRate(
          me.whipUsed, opSkill, false, opSkill.isTrueDamage ?? false
        );
      }

      if (triggersCounterShock(opSkill, op.basicAttackType) && hasCounterShock(me, myAction)) {
        myDmgTaken += dmg * 0.25;
        myRageGained += dmg * 0.25;
      } else {
        myDmgTaken += dmg;
        myRageGained += dmg;
      }
    }
  }

  // --- Kill / death checks ---
  const canKill = (op.hp - myDmgDealt) <= 0;
  const couldDie = (me.hp - myHpCost - myDmgTaken) <= 0;

  // --- Payoff scoring ---
  const hpPct = me.hp / me.maxHp;
  const survivalWeight = 1.0 + (1 - hpPct) * 1.0;

  let payoff = myDmgDealt
    - myDmgTaken * survivalWeight
    - myHpCost
    + buffValue
    + (canKill ? 100 : 0)
    - (couldDie ? 200 : 0);

  // Avoid feeding rage to opponent near rage-skill threshold
  if (op.rage + opRageGained >= 60) {
    payoff -= 10;
  }

  return {
    myDmgDealt, myDmgTaken, myHpCost, myMpSpent,
    myRageSpent, myRageGained, opRageGained,
    buffValue, canKill, couldDie, payoff,
  };
}

/** Check if a fighter has counter-shock (either already active, or activating this round) */
function hasCounterShock(fighter: Readonly<Fighter>, action: AvailableAction): boolean {
  if (fighter.statusEffects.some(e => e.type === 'counter-shock')) return true;
  if (action.type === 'skill' && action.skillId === 'warrior-counter-shock') return true;
  return false;
}

/**
 * Compute deterministic damage for an attack skill given known target action.
 * Does NOT account for escape dodge or counter-shock (caller handles those).
 */
function computeAttackDamage(
  skill: SkillDef,
  attacker: Readonly<Fighter>,
  target: Readonly<Fighter>,
  targetAction: AvailableAction,
  targetChosenAction: ChosenAction
): number {
  if (skill.isTrueDamage) {
    return skill.baseDamage;
  }

  const effectiveDef = targetAction.type === 'defend' ? getDefendDef(target) : target.currentDef;

  const condResult = evaluateCondition(
    skill.condition,
    skill.conditionMultiplier,
    skill.conditionZeroDamage,
    targetChosenAction
  );

  if (condResult.zeroDamage) return 0;

  const afterCondition = skill.baseDamage * condResult.multiplier;
  const afterDef = afterCondition * (10 - effectiveDef) / 10;
  const precision = precisionBonus(attacker, target);

  return Math.max(0, afterDef + precision);
}

// --- Buff Value Estimation ---

function estimateBuffValue(
  skill: SkillDef,
  me: Readonly<Fighter>,
  op: Readonly<Fighter>,
  round: number
): number {
  if (!skill.buffEffect) return 0;

  switch (skill.buffEffect.type) {
    case 'whip-boost': {
      if (me.whipUsed) return -100;
      return 35 * Math.max(0.5, 1 - round / 10);
    }
    case 'shield-wall': {
      const estDmgPerRound = applyDef(op.baseAtk, me.currentDef);
      const boostedDef = me.currentDef + (skill.buffEffect.defBonus ?? 2);
      const reducedDmgPerRound = applyDef(op.baseAtk, boostedDef);
      return (estDmgPerRound - reducedDmgPerRound) * 3;
    }
    case 'counter-shock': {
      // Exact value is captured in cell interactions; baseline = 0
      return 0;
    }
    default:
      return 10;
  }
}

// --- Main: Build Payoff Matrix ---

export function buildPayoffMatrix(
  me: Readonly<Fighter>,
  op: Readonly<Fighter>,
  myActions: AvailableAction[],
  opActions: AvailableAction[],
  round: number
): PayoffResult {
  const matrix: MatrixCell[][] = [];
  const opPayoffs: number[][] = [];

  for (let i = 0; i < myActions.length; i++) {
    matrix[i] = [];
    opPayoffs[i] = [];
    for (let j = 0; j < opActions.length; j++) {
      const cell = computeCell(me, op, myActions[i], opActions[j], round);
      matrix[i][j] = cell;

      // Opponent's payoff from their perspective
      const opCell = computeCell(op, me, opActions[j], myActions[i], round);
      opPayoffs[i][j] = opCell.payoff;
    }
  }

  return { myActions, opActions, matrix, opPayoffs };
}

// --- Opponent Prediction ---

/**
 * Predict opponent action probabilities using level-1 reasoning.
 * "What's best for them on average, assuming uniform distribution over my actions?"
 */
export function predictOpponent(
  result: PayoffResult,
  historyFreq: Map<ActionType, number> | null,
  historyCount: number
): number[] {
  const { opActions, opPayoffs, myActions } = result;
  const n = myActions.length;
  const m = opActions.length;

  const opExpected: number[] = new Array(m).fill(0);
  for (let j = 0; j < m; j++) {
    for (let i = 0; i < n; i++) {
      opExpected[j] += opPayoffs[i][j];
    }
    opExpected[j] /= n;
  }

  const matrixProbs = softmax(opExpected, 1.0);

  // Blend with history if enough observations
  if (historyFreq && historyCount >= 3) {
    const blended: number[] = [];
    for (let j = 0; j < m; j++) {
      const actionType: ActionType = opActions[j].type === 'skill' ? 'skill' : opActions[j].type;
      const freq = historyFreq.get(actionType) ?? 0;
      blended.push(0.6 * matrixProbs[j] + 0.4 * freq);
    }
    const total = blended.reduce((a, b) => a + b, 0);
    return total > 0 ? blended.map(p => p / total) : matrixProbs;
  }

  return matrixProbs;
}

// --- Best Response Selection ---

export function selectBestResponse(
  result: PayoffResult,
  opProbs: number[],
  temperature: number
): number {
  const { myActions, matrix } = result;
  const n = myActions.length;
  const m = opProbs.length;

  const myExpected: number[] = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      myExpected[i] += opProbs[j] * matrix[i][j].payoff;
    }
  }

  return softmaxSample(myExpected, temperature);
}

// --- Opponent Affordability ---

export function getOpponentAffordableActions(op: Readonly<Fighter>): AvailableAction[] {
  const actions: AvailableAction[] = [
    { type: 'basic-attack', affordable: true },
    { type: 'defend', affordable: true },
    { type: 'escape', affordable: true },
  ];

  for (const skillId of op.skillIds) {
    const skill = getSkill(skillId);
    if (checkAffordable(op, skill)) {
      actions.push({ type: 'skill', skillId: skill.id, skillName: skill.name, affordable: true });
    }
  }

  return actions;
}

function checkAffordable(fighter: Readonly<Fighter>, skill: SkillDef): boolean {
  const { resource, amount } = skill.cost;

  if (resource === 'mp' && fighter.mp < amount) return false;
  if (resource === 'hp' && fighter.hp <= amount) return false;
  if (resource === 'rage' && fighter.rage < amount) return false;

  if (skill.buffEffect?.type === 'whip-boost' && fighter.whipUsed) return false;

  const dualCost = DUAL_COST_SKILLS[skill.id];
  if (dualCost) {
    if (dualCost.resource === 'rage' && fighter.rage < dualCost.amount) return false;
  }

  return true;
}

// --- Utility Functions ---

function softmax(values: number[], temperature: number): number[] {
  if (values.length === 0) return [];
  const maxVal = Math.max(...values);
  const exps = values.map(v => Math.exp((v - maxVal) / temperature));
  const sum = exps.reduce((a, b) => a + b, 0);
  if (sum === 0) return values.map(() => 1 / values.length);
  return exps.map(e => e / sum);
}

function softmaxSample(values: number[], temperature: number): number {
  if (values.length <= 1) return 0;
  const probs = softmax(values, temperature);
  const r = Math.random();
  let cum = 0;
  for (let i = 0; i < probs.length; i++) {
    cum += probs[i];
    if (r <= cum) return i;
  }
  return probs.length - 1;
}
