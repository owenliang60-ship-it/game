import type { BattleConfig, Fighter, BattleState } from './types';
import { getCharacterDef } from '@/characters';

/**
 * Create initial battle state and fighters from config.
 */
export function createBattleState(config: BattleConfig): BattleState {
  const fighters = config.fighters.map((fc, index) => createFighter(fc, index));
  return {
    round: 0,
    phase: 'init',
    fighters,
    actionLog: [],
    winner: null,
  };
}

function createFighter(
  config: BattleConfig['fighters'][number],
  index: number
): Fighter {
  const def = getCharacterDef(config.characterClass);
  const id = `${config.characterClass}-${index}`;

  return {
    id,
    characterClass: config.characterClass,
    displayName: config.displayName,
    isPlayer: config.isPlayer,

    hp: def.maxHp,
    maxHp: def.maxHp,
    mp: def.maxMp,
    maxMp: def.maxMp,
    rage: 0,
    currentAgi: def.baseAgi,
    currentDef: def.baseDef,
    baseAgi: def.baseAgi,
    baseDef: def.baseDef,
    baseAtk: def.baseAtk,

    alive: true,
    statusEffects: [],
    whipUsed: false,
    guerrillaActive: false,
    usedRangedSkillThisRound: false,

    chosenAction: null,
    escapeSuccess: null,
    isDefending: false,

    passives: def.passives,
    skillIds: def.skills,
    basicAttackType: def.basicAttackType,
  };
}
