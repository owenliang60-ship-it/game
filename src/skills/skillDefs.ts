import type { SkillDef, CharacterClass } from '@/core/types';

/**
 * All 18 skill definitions, exactly matching PRD v0.9.1.
 * Skills are stored by ID in a Map for O(1) lookup.
 */
const SKILL_DEFS = new Map<string, SkillDef>([
  // ============================================================
  // KNIGHT (骑士) — 6 skills
  // ============================================================
  ['knight-dragon-strike', {
    id: 'knight-dragon-strike',
    name: '升龙击',
    nameEn: 'Dragon Strike',
    characterClass: 'knight',
    type: 'melee',
    cost: { resource: 'mp', amount: 10 },
    targetMode: 'single-enemy',
    baseDamage: 50,
    condition: 'unconditional',
    conditionMultiplier: 1,
  }],

  ['knight-charge', {
    id: 'knight-charge',
    name: '冲锋',
    nameEn: 'Charge',
    characterClass: 'knight',
    type: 'melee',
    cost: { resource: 'hp', amount: 10 },
    targetMode: 'single-enemy',
    baseDamage: 75,
    condition: 'target-escaping',
    conditionZeroDamage: true,  // damage → 0 if target escaping
  }],

  ['knight-chase-slash', {
    id: 'knight-chase-slash',
    name: '追砍',
    nameEn: 'Chase Slash',
    characterClass: 'knight',
    type: 'melee',
    cost: { resource: 'mp', amount: 10 },
    targetMode: 'single-enemy',
    baseDamage: 15,
    condition: 'target-escaping',
    conditionMultiplier: 4,
    isPursuit: true,  // 100% hit on escaped targets
  }],

  ['knight-sun-bow', {
    id: 'knight-sun-bow',
    name: '太阳之弓',
    nameEn: 'Sun Bow',
    characterClass: 'knight',
    type: 'ranged',
    cost: { resource: 'mp', amount: 15 },
    targetMode: 'single-enemy',
    baseDamage: 30,
    condition: 'target-using-skill',
    conditionMultiplier: 2,
  }],

  ['knight-whip', {
    id: 'knight-whip',
    name: '马鞭',
    nameEn: 'Whip',
    characterClass: 'knight',
    type: 'buff',
    cost: { resource: 'mp', amount: 0 },
    targetMode: 'self',
    baseDamage: 0,
    condition: 'none',
    buffEffect: {
      type: 'whip-boost',
      duration: 0,  // permanent
      agiBonus: 1,
      escapeBoost: 0.7,
    },
  }],

  ['knight-flying-trample', {
    id: 'knight-flying-trample',
    name: '马踏飞燕',
    nameEn: 'Flying Trample',
    characterClass: 'knight',
    type: 'melee',
    cost: { resource: 'rage', amount: 80 },
    targetMode: 'single-enemy',
    baseDamage: 50,
    condition: 'target-defending',
    conditionMultiplier: 1.5,
  }],

  // ============================================================
  // ARMORED WARRIOR (装甲战士) — 5 skills
  // ============================================================
  ['warrior-charge', {
    id: 'warrior-charge',
    name: '冲锋',
    nameEn: 'Charge',
    characterClass: 'armored-warrior',
    type: 'melee',
    cost: { resource: 'hp', amount: 10 },
    targetMode: 'single-enemy',
    baseDamage: 75,
    condition: 'target-escaping',
    conditionZeroDamage: true,
  }],

  ['warrior-shield-wall', {
    id: 'warrior-shield-wall',
    name: '顶盾',
    nameEn: 'Shield Wall',
    characterClass: 'armored-warrior',
    type: 'buff',
    cost: { resource: 'rage', amount: 60 },
    targetMode: 'self',
    baseDamage: 0,
    condition: 'none',
    buffEffect: {
      type: 'shield-wall',
      duration: 3,  // 3 rounds including activation
      defBonus: 2,
    },
  }],

  ['warrior-heavy-hammer', {
    id: 'warrior-heavy-hammer',
    name: '重锤',
    nameEn: 'Heavy Hammer',
    characterClass: 'armored-warrior',
    type: 'melee',
    cost: { resource: 'mp', amount: 20 },
    targetMode: 'single-enemy',
    baseDamage: 50,
    condition: 'target-defending',
    conditionMultiplier: 1.5,
  }],

  ['warrior-shield-bash', {
    id: 'warrior-shield-bash',
    name: '盾击',
    nameEn: 'Shield Bash',
    characterClass: 'armored-warrior',
    type: 'melee',
    cost: { resource: 'mp', amount: 20 },
    targetMode: 'single-enemy',
    baseDamage: 40,
    condition: 'target-basic-attacking',
    conditionMultiplier: 1.5,
  }],

  ['warrior-counter-shock', {
    id: 'warrior-counter-shock',
    name: '反震',
    nameEn: 'Counter Shock',
    characterClass: 'armored-warrior',
    type: 'buff',
    cost: { resource: 'rage', amount: 60 },
    targetMode: 'self',
    baseDamage: 0,
    condition: 'none',
    buffEffect: {
      type: 'counter-shock',
      duration: 1,  // this round only
    },
  }],

  // ============================================================
  // ARCHER (弓箭手) — 7 skills (includes 1 melee: 匕首突刺)
  // ============================================================
  ['archer-sun-bow', {
    id: 'archer-sun-bow',
    name: '太阳之弓',
    nameEn: 'Sun Bow',
    characterClass: 'archer',
    type: 'ranged',
    cost: { resource: 'mp', amount: 15 },
    targetMode: 'single-enemy',
    baseDamage: 30,
    condition: 'target-using-skill',
    conditionMultiplier: 2,
    triggersGuerrilla: true,
  }],

  ['archer-rainbow-pierce', {
    id: 'archer-rainbow-pierce',
    name: '长虹贯日',
    nameEn: 'Rainbow Pierce',
    characterClass: 'archer',
    type: 'ranged',
    cost: { resource: 'mp', amount: 20 },
    targetMode: 'multi-enemy',
    maxTargets: 2,
    baseDamage: 30,
    condition: 'target-not-escaping',
    conditionMultiplier: 1.5,
    triggersGuerrilla: true,
  }],

  ['archer-rainbow-cloud', {
    id: 'archer-rainbow-cloud',
    name: '彩虹穿云',
    nameEn: 'Rainbow Cloud',
    characterClass: 'archer',
    type: 'ranged',
    cost: { resource: 'mp', amount: 20 },
    targetMode: 'single-enemy',
    baseDamage: 50,
    condition: 'target-not-defending',
    conditionMultiplier: 1.5,
    triggersGuerrilla: true,
  }],

  ['archer-return-shot', {
    id: 'archer-return-shot',
    name: '回马枪',
    nameEn: 'Return Shot',
    characterClass: 'archer',
    type: 'ranged',
    cost: { resource: 'mp', amount: 15 },
    targetMode: 'single-enemy',
    baseDamage: 30,
    condition: 'target-using-melee-skill',
    conditionMultiplier: 2,
    triggersGuerrilla: true,
  }],

  ['archer-dagger-thrust', {
    id: 'archer-dagger-thrust',
    name: '匕首突刺',
    nameEn: 'Dagger Thrust',
    characterClass: 'archer',
    type: 'melee',
    cost: { resource: 'mp', amount: 10 },
    targetMode: 'single-enemy',
    baseDamage: 35,
    condition: 'unconditional',
    conditionMultiplier: 1,
    // Note: melee, does NOT trigger guerrilla tactics
  }],

  ['archer-arrow-rain', {
    id: 'archer-arrow-rain',
    name: '漫天花雨',
    nameEn: 'Arrow Rain',
    characterClass: 'archer',
    type: 'ranged',
    cost: { resource: 'rage', amount: 80 },
    targetMode: 'all-enemies',
    baseDamage: 80,
    isTrueDamage: true,
    condition: 'none',
    triggersGuerrilla: true,
  }],

  // Note: 彩虹穿云 also costs 30 RAGE — handled as dual-cost in BattleManager
  // The SkillDef.cost only tracks the primary resource. RAGE cost is checked separately.
]);

// Override: 彩虹穿云 has dual cost (20 MP + 30 RAGE)
// We store the primary cost as MP, and track the secondary RAGE cost
export const DUAL_COST_SKILLS: Record<string, { resource: ResourceType; amount: number }> = {
  'archer-rainbow-cloud': { resource: 'rage', amount: 30 },
};

import type { ResourceType } from '@/core/types';

export function getSkill(id: string): SkillDef {
  const skill = SKILL_DEFS.get(id);
  if (!skill) throw new Error(`Unknown skill: ${id}`);
  return skill;
}

export function getSkillsForClass(characterClass: CharacterClass): SkillDef[] {
  return Array.from(SKILL_DEFS.values()).filter(s => s.characterClass === characterClass);
}

export function getAllSkills(): Map<string, SkillDef> {
  return SKILL_DEFS;
}
