import type { CharacterDef, CharacterClass } from '@/core/types';

/**
 * Static character definitions matching PRD v0.9.1.
 * Each character has base stats, skill IDs, and passive abilities.
 */

export const KNIGHT: CharacterDef = {
  characterClass: 'knight',
  name: '骑士',
  maxHp: 300,
  maxMp: 150,
  baseAgi: 7,
  baseDef: 2,
  baseAtk: 30,
  basicAttackType: 'melee',
  skills: [
    'knight-dragon-strike',
    'knight-charge',
    'knight-chase-slash',
    'knight-sun-bow',
    'knight-whip',
    'knight-flying-trample',
  ],
  passives: [],  // Knight has no passives (high AGI is the advantage)
};

export const ARMORED_WARRIOR: CharacterDef = {
  characterClass: 'armored-warrior',
  name: '装甲战士',
  maxHp: 350,
  maxMp: 120,
  baseAgi: 4,
  baseDef: 3,
  baseAtk: 25,
  basicAttackType: 'melee',
  skills: [
    'warrior-charge',
    'warrior-shield-wall',
    'warrior-heavy-hammer',
    'warrior-shield-bash',
    'warrior-counter-shock',
  ],
  passives: [
    {
      id: 'iron-will',
      name: '钢铁意志',
      trigger: 'round-start',
      effect: { type: 'gain-rage', amount: 5 },
    },
  ],
};

export const ARCHER: CharacterDef = {
  characterClass: 'archer',
  name: '弓箭手',
  maxHp: 270,
  maxMp: 150,
  baseAgi: 6,
  baseDef: 1.5,
  baseAtk: 20,
  basicAttackType: 'ranged',
  skills: [
    'archer-sun-bow',
    'archer-rainbow-pierce',
    'archer-rainbow-cloud',
    'archer-return-shot',
    'archer-dagger-thrust',
    'archer-arrow-rain',
  ],
  passives: [
    {
      id: 'guerrilla-tactics',
      name: '游击战术',
      trigger: 'on-ranged-skill',
      effect: { type: 'guerrilla-tactics', agiBonus: 2 },
    },
    {
      id: 'precise-aim',
      name: '精确瞄准',
      trigger: 'on-damage-dealt',
      effect: { type: 'precise-aim', damagePerAgi: 5 },
    },
  ],
};

const CHARACTER_DEFS: Record<CharacterClass, CharacterDef> = {
  'knight': KNIGHT,
  'armored-warrior': ARMORED_WARRIOR,
  'archer': ARCHER,
};

export function getCharacterDef(characterClass: CharacterClass): CharacterDef {
  return CHARACTER_DEFS[characterClass];
}

export function getAllCharacterDefs(): CharacterDef[] {
  return Object.values(CHARACTER_DEFS);
}
