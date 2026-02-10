import type { TooltipData } from './SkillTooltip';
import type { SkillDef } from '@/core/types';
import { DUAL_COST_SKILLS } from '@/skills/skillDefs';

const TYPE_LABELS: Record<string, string> = {
  melee: '近战',
  ranged: '远程',
  magic: '魔法',
  buff: '增益',
};

const CONDITION_TEXT: Record<string, string> = {
  'target-escaping': '目标逃跑时',
  'target-defending': '目标防御时',
  'target-not-defending': '目标未防御时',
  'target-using-skill': '目标使用技能时',
  'target-using-melee-skill': '目标使用近战技能时',
  'target-basic-attacking': '目标普攻时',
  'target-not-escaping': '目标未逃跑时',
};

/** Generate tooltip data from a SkillDef */
export function skillTooltipData(skill: SkillDef): TooltipData {
  const data: TooltipData = {
    name: skill.name,
    type: TYPE_LABELS[skill.type] ?? skill.type,
    cost: `${skill.cost.resource.toUpperCase()} ${skill.cost.amount}`,
  };

  // Dual-cost skill
  const dual = DUAL_COST_SKILLS[skill.id];
  if (dual) {
    data.cost2 = `${dual.resource.toUpperCase()} ${dual.amount}`;
  }

  // Damage
  if (skill.baseDamage > 0) {
    if (skill.isTrueDamage) {
      data.damage = `真实伤害 ${skill.baseDamage} (无视防御)`;
    } else {
      data.damage = `伤害 ${skill.baseDamage}`;
    }
  }

  // Condition
  const condLabel = CONDITION_TEXT[skill.condition];
  if (condLabel) {
    if (skill.conditionZeroDamage) {
      data.condition = `${condLabel}: 伤害归零`;
    } else if (skill.conditionMultiplier && skill.conditionMultiplier > 1) {
      data.condition = `${condLabel}: ×${skill.conditionMultiplier}伤害`;
    }
  }

  // Extra flags
  const extras: string[] = [];
  if (skill.isPursuit) extras.push('100%命中逃跑目标');
  if (skill.buffEffect?.type === 'shield-wall') extras.push('自身DEF+2, 持续3回合');
  if (skill.buffEffect?.type === 'counter-shock') extras.push('反弹受到伤害, 持续1回合');
  if (skill.buffEffect?.type === 'whip-boost') extras.push('永久AGI+1, 逃跑率+0.7');
  if (extras.length > 0) data.extra = extras.join('; ');

  return data;
}

/** Tooltip data for base actions */
export function baseActionTooltipData(type: string): TooltipData {
  switch (type) {
    case 'basic-attack':
      return { name: '普通攻击', desc: '物理攻击, 伤害基于ATK' };
    case 'defend':
      return { name: '防御', desc: 'DEF+2, 减少本回合受到伤害' };
    case 'escape':
      return { name: '逃跑', desc: '尝试逃离战斗, 成功率基于AGI' };
    default:
      return { name: type };
  }
}
