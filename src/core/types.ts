// ============================================================
// Core type definitions for the battle system
// NO PixiJS dependencies — pure game logic types
// ============================================================

// --- Identity ---
export type CharacterId = string;
export type CharacterClass = 'knight' | 'armored-warrior' | 'archer';

// --- Enums as string unions ---
export type SkillType = 'melee' | 'ranged' | 'magic' | 'buff';
export type ResourceType = 'mp' | 'hp' | 'rage';
export type ActionType = 'basic-attack' | 'defend' | 'escape' | 'skill';

export type ConditionType =
  | 'target-escaping'
  | 'target-defending'
  | 'target-not-defending'
  | 'target-using-skill'
  | 'target-using-melee-skill'
  | 'target-basic-attacking'
  | 'target-not-escaping'
  | 'unconditional'
  | 'none';

export type TargetMode = 'single-enemy' | 'self' | 'all-enemies' | 'multi-enemy';

// --- Skill Definition (static data) ---
export interface SkillDef {
  id: string;
  name: string;
  nameEn: string;
  characterClass: CharacterClass;
  type: SkillType;
  cost: { resource: ResourceType; amount: number };
  targetMode: TargetMode;
  maxTargets?: number;
  baseDamage: number;
  isTrueDamage?: boolean;
  condition: ConditionType;
  conditionMultiplier?: number;
  conditionZeroDamage?: boolean;
  isPursuit?: boolean;
  buffEffect?: BuffEffect;
  triggersGuerrilla?: boolean;
}

export interface BuffEffect {
  type: 'shield-wall' | 'counter-shock' | 'whip-boost';
  duration: number;
  defBonus?: number;
  agiBonus?: number;
  escapeBoost?: number;
}

// --- Character Definition (static data template) ---
export interface CharacterDef {
  characterClass: CharacterClass;
  name: string;
  maxHp: number;
  maxMp: number;
  baseAgi: number;
  baseDef: number;
  baseAtk: number;
  skills: string[];
  passives: PassiveDef[];
  basicAttackType: SkillType;
}

export interface PassiveDef {
  id: string;
  name: string;
  trigger: 'round-start' | 'on-ranged-skill' | 'on-damage-dealt';
  effect: PassiveEffect;
}

export type PassiveEffect =
  | { type: 'gain-rage'; amount: number }
  | { type: 'guerrilla-tactics'; agiBonus: number }
  | { type: 'precise-aim'; damagePerAgi: number };

// --- Runtime: Fighter (mutable battle state per character) ---
export interface Fighter {
  id: CharacterId;
  characterClass: CharacterClass;
  displayName: string;
  isPlayer: boolean;

  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  rage: number;
  currentAgi: number;
  currentDef: number;
  baseAgi: number;
  baseDef: number;
  baseAtk: number;

  alive: boolean;
  statusEffects: StatusEffect[];
  whipUsed: boolean;
  guerrillaActive: boolean;
  usedRangedSkillThisRound: boolean;

  chosenAction: ChosenAction | null;
  escapeSuccess: boolean | null;
  isDefending: boolean;

  passives: PassiveDef[];
  skillIds: string[];
  basicAttackType: SkillType;
}

export interface StatusEffect {
  type: 'shield-wall' | 'counter-shock' | 'guerrilla-boost';
  remainingRounds: number;
  defBonus?: number;
  agiBonus?: number;
}

// --- Actions ---
export interface ChosenAction {
  type: ActionType;
  skillId?: string;
  targetIds?: CharacterId[];
}

export interface ResolvedAction {
  actorId: CharacterId;
  action: ChosenAction;
  results: ActionResult[];
}

export type ActionResult =
  | DamageResult
  | BuffResult
  | EscapeResult
  | DefendResult;

export interface DamageResult {
  resultType: 'damage';
  targetId: CharacterId;
  baseDamage: number;
  conditionMet: boolean;
  conditionMultiplier: number;
  defReduction: number;
  precisionBonus: number;
  finalDamage: number;
  isTrueDamage: boolean;
  isReflected: boolean;
  dodged: boolean;
  rageGained: number;
  targetHpAfter: number;
  targetDied: boolean;
}

export interface BuffResult {
  resultType: 'buff';
  targetId: CharacterId;
  effectApplied: StatusEffect | null;
  whipPermanent?: boolean;
  agiAfter?: number;
  escapeRateAfter?: number;
}

export interface EscapeResult {
  resultType: 'escape';
  success: boolean;
  escapeRate: number;
}

export interface DefendResult {
  resultType: 'defend';
  defBefore: number;
  defAfter: number;
}

// --- Battle State ---
export type BattlePhase =
  | 'init'
  | 'round-start'
  | 'action-select'
  | 'action-resolve'
  | 'status-update'
  | 'death-check'
  | 'round-end'
  | 'battle-end';

export interface BattleState {
  round: number;
  phase: BattlePhase;
  fighters: Fighter[];
  actionLog: ActionLogEntry[];
  winner: CharacterId | 'draw' | null;
}

export interface ActionLogEntry {
  round: number;
  actorId: CharacterId;
  action: ChosenAction;
  results: ActionResult[];
}

export interface FighterSnapshot {
  id: CharacterId;
  hp: number;
  mp: number;
  rage: number;
  agi: number;
  def: number;
  alive: boolean;
  statusEffects: StatusEffect[];
}

// --- Available Actions (for UI) ---
export interface AvailableAction {
  type: ActionType;
  skillId?: string;
  skillName?: string;
  affordable: boolean;
  reason?: string;
}

// --- Battle Config ---
export interface BattleConfig {
  fighters: {
    characterClass: CharacterClass;
    isPlayer: boolean;
    displayName: string;
  }[];
  aiDifficulty?: AIDifficulty;
}

export type AIDifficulty = 'easy' | 'normal' | 'hard';

// --- Events ---
export type BattleEventType =
  | 'battle-start'
  | 'round-start'
  | 'passive-triggered'
  | 'action-select-start'
  | 'action-selected'
  | 'action-resolve-start'
  | 'action-resolving'
  | 'damage-dealt'
  | 'damage-reflected'
  | 'dodge'
  | 'buff-applied'
  | 'escape-attempted'
  | 'defend-activated'
  | 'skill-used'
  | 'hp-cost-paid'
  | 'status-effect-expired'
  | 'fighter-died'
  | 'round-end'
  | 'battle-end';

export interface BattleEventDataMap {
  'battle-start': { fighters: FighterSnapshot[] };
  'round-start': { round: number; fighters: FighterSnapshot[] };
  'passive-triggered': { fighterId: CharacterId; passiveId: string; description: string };
  'action-select-start': { round: number; aliveFighters: CharacterId[] };
  'action-selected': { fighterId: CharacterId; isPlayer: boolean };
  'action-resolve-start': { round: number; order: CharacterId[] };
  'action-resolving': { fighterId: CharacterId; action: ChosenAction };
  'damage-dealt': DamageResult & { attackerId: CharacterId };
  'damage-reflected': { reflectorId: CharacterId; targetId: CharacterId; reflectedDamage: number };
  'dodge': { targetId: CharacterId; attackerId: CharacterId; skillName: string };
  'buff-applied': BuffResult & { fighterId: CharacterId };
  'escape-attempted': EscapeResult & { fighterId: CharacterId };
  'defend-activated': DefendResult & { fighterId: CharacterId };
  'skill-used': { fighterId: CharacterId; skillId: string; skillName: string; costPaid: { resource: ResourceType; amount: number } };
  'hp-cost-paid': { fighterId: CharacterId; hpCost: number; hpAfter: number; diedFromCost: boolean };
  'status-effect-expired': { fighterId: CharacterId; effectType: string };
  'fighter-died': { fighterId: CharacterId; killedBy: CharacterId | 'self' };
  'round-end': { round: number; fighters: FighterSnapshot[] };
  'battle-end': { winner: CharacterId | 'draw' | null; rounds: number; survivors: CharacterId[] };
}

export interface BattleEvent<T extends BattleEventType = BattleEventType> {
  type: T;
  round: number;
  data: BattleEventDataMap[T];
}
