import type { ConditionType, ChosenAction, SkillDef } from '@/core/types';
import { getSkill } from './skillDefs';

export interface ConditionResult {
  met: boolean;
  multiplier: number;
  zeroDamage: boolean;
}

/**
 * Evaluate a skill's condition against the target's chosen action.
 * All actions are selected simultaneously before resolution,
 * so the target's action is known at evaluation time.
 */
export function evaluateCondition(
  condition: ConditionType,
  conditionMultiplier: number | undefined,
  conditionZeroDamage: boolean | undefined,
  targetAction: ChosenAction
): ConditionResult {
  const mult = conditionMultiplier ?? 1;
  let met = false;

  switch (condition) {
    case 'target-escaping':
      met = targetAction.type === 'escape';
      break;

    case 'target-defending':
      met = targetAction.type === 'defend';
      break;

    case 'target-not-defending':
      met = targetAction.type !== 'defend';
      break;

    case 'target-using-skill':
      met = targetAction.type === 'skill';
      break;

    case 'target-using-melee-skill':
      if (targetAction.type === 'skill' && targetAction.skillId) {
        const targetSkill = getSkill(targetAction.skillId);
        met = targetSkill.type === 'melee';
      }
      break;

    case 'target-basic-attacking':
      met = targetAction.type === 'basic-attack';
      break;

    case 'target-not-escaping':
      met = targetAction.type !== 'escape';
      break;

    case 'unconditional':
      met = true;
      break;

    case 'none':
      met = false;
      break;
  }

  return {
    met,
    multiplier: met ? mult : 1,
    zeroDamage: met && (conditionZeroDamage ?? false),
  };
}
