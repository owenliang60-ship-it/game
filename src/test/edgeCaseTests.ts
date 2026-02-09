/**
 * Edge Case Tests — Targeted unit tests for specific battle mechanics.
 * Usage: npx tsx src/test/edgeCaseTests.ts
 *
 * Tests counter-shock, HP cost thresholds, RAGE cap, true damage,
 * whip one-time use, and guerrilla tactics timing.
 */
import { BattleManager } from '../core/BattleManager';
import { DamageCalculator } from '../core/DamageCalculator';
import { StatusEffectManager } from '../core/StatusEffectManager';
import { ActionResolver } from '../core/ActionResolver';
import { EventBus } from '../core/EventBus';
import { createBattleState } from '../core/BattleFactory';
import { getSkill } from '../skills';
import { clamp, roundTo2 } from '../core/utils';
import type {
  Fighter, BattleState, ChosenAction, StatusEffect,
  BattleConfig, CharacterClass,
} from '../core/types';

// ============================================================
// Test Helpers
// ============================================================

let testCount = 0;
let passCount = 0;
let failCount = 0;

function assert(condition: boolean, testName: string, detail: string = ''): void {
  testCount++;
  if (condition) {
    passCount++;
    console.log(`  [PASS] ${testName}`);
  } else {
    failCount++;
    console.log(`  [FAIL] ${testName}${detail ? ' — ' + detail : ''}`);
  }
}

function section(title: string): void {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`TEST: ${title}`);
  console.log(`${'='.repeat(60)}`);
}

/**
 * Create a minimal 2-fighter battle state for controlled testing.
 * Returns the BattleState with fighters you can directly manipulate.
 */
function createTestBattle(
  class1: CharacterClass,
  class2: CharacterClass,
): { state: BattleState; f1: Fighter; f2: Fighter; damageCalc: DamageCalculator; statusMgr: StatusEffectManager; resolver: ActionResolver; events: EventBus } {
  const config: BattleConfig = {
    fighters: [
      { characterClass: class1, isPlayer: false, displayName: `${class1}-test` },
      { characterClass: class2, isPlayer: false, displayName: `${class2}-test` },
    ],
  };
  const state = createBattleState(config);
  const events = new EventBus();
  const damageCalc = new DamageCalculator();
  const statusMgr = new StatusEffectManager();
  const resolver = new ActionResolver(damageCalc, statusMgr, events);

  return {
    state,
    f1: state.fighters[0],
    f2: state.fighters[1],
    damageCalc,
    statusMgr,
    resolver,
    events,
  };
}

// ============================================================
// Test 1: Counter-shock vs ranged attack — should NOT reflect
// ============================================================
function testCounterShockVsRanged(): void {
  section('1. Counter-shock vs ranged attack (should NOT reflect)');

  const { state, f1, f2, damageCalc, statusMgr, resolver, events } = createTestBattle(
    'armored-warrior', // f1: warrior with counter-shock
    'archer',          // f2: archer using ranged attack
  );

  // Setup: give warrior enough rage for counter-shock
  f1.rage = 60;
  state.round = 1;

  // Apply counter-shock to warrior
  const csEffect: StatusEffect = { type: 'counter-shock', remainingRounds: 1 };
  statusMgr.applyEffect(f1, csEffect);

  // Record HP before
  const f1HpBefore = f1.hp;
  const f2HpBefore = f2.hp;

  // Test DamageCalculator.calculateCounterShock directly with ranged type
  const csResult = damageCalc.calculateCounterShock(50, 'ranged', false);

  assert(csResult === null, 'Counter-shock returns null for ranged attacks');

  // Now test through the full resolver: archer uses 太阳之弓 (ranged) vs warrior
  f2.chosenAction = { type: 'skill', skillId: 'archer-sun-bow', targetIds: [f1.id] };
  f1.chosenAction = { type: 'skill', skillId: 'warrior-counter-shock' };

  let reflectedDetected = false;
  events.on('damage-reflected', () => { reflectedDetected = true; });

  state.phase = 'action-resolve';
  resolver.resolveRound(state, state.fighters);

  assert(!reflectedDetected, 'No damage-reflected event emitted for ranged attack on counter-shock');

  // Warrior should take full damage (no 25% reduction)
  const sunBow = getSkill('archer-sun-bow');
  // Archer uses sun-bow (base 30) against warrior choosing skill -> condition met x2 = 60
  // DEF reduction: 60 * (10 - 3) / 10 = 42
  // Precision: archer AGI=6, warrior AGI=4, diff=2, +5*2=10
  // Final: 42 + 10 = 52
  const expectedDamage = roundTo2(30 * 2 * (10 - f1.baseDef) / 10 + 5 * (f2.baseAgi - f1.baseAgi));
  const actualDamage = roundTo2(f1HpBefore - f1.hp);

  // Note: counter-shock was applied as buff in Phase 3, cost is paid.
  // The damage should be the full amount, not reduced to 25%.
  console.log(`  Warrior HP: ${f1HpBefore} -> ${f1.hp} (damage: ${actualDamage})`);
  assert(actualDamage > 0, 'Warrior took damage from ranged attack');
  assert(f2.hp === f2HpBefore, `Archer HP unchanged (no reflect): ${f2.hp}`,
    `Expected ${f2HpBefore}, got ${f2.hp}`);
}

// ============================================================
// Test 2: Counter-shock vs melee attack — SHOULD reflect
// ============================================================
function testCounterShockVsMelee(): void {
  section('2. Counter-shock vs melee attack (SHOULD reflect 25%/75%)');

  const { state, f1, f2, damageCalc, statusMgr, resolver, events } = createTestBattle(
    'armored-warrior', // f1: warrior with counter-shock
    'knight',          // f2: knight using melee
  );

  f1.rage = 60;
  state.round = 1;

  // Apply counter-shock
  statusMgr.applyEffect(f1, { type: 'counter-shock', remainingRounds: 1 });

  const f1HpBefore = f1.hp;
  const f2HpBefore = f2.hp;

  // Knight uses 升龙击 (melee, unconditional, base 50)
  f2.chosenAction = { type: 'skill', skillId: 'knight-dragon-strike', targetIds: [f1.id] };
  f1.chosenAction = { type: 'skill', skillId: 'warrior-counter-shock' };

  let reflectedDamage = 0;
  events.on('damage-reflected', (e) => { reflectedDamage = e.data.reflectedDamage; });

  state.phase = 'action-resolve';
  resolver.resolveRound(state, state.fighters);

  // 升龙击: base 50, unconditional (x1), DEF=3 -> 50 * 7/10 = 35. No precision (knight).
  const rawDamage = roundTo2(50 * (10 - f1.baseDef) / 10); // = 35
  const expectedSelfDamage = roundTo2(rawDamage * 0.25); // = 8.75
  const expectedReflected = roundTo2(rawDamage * 0.75); // = 26.25
  const actualWarriorDamage = roundTo2(f1HpBefore - f1.hp);
  const actualKnightDamage = roundTo2(f2HpBefore - f2.hp);

  console.log(`  Raw damage: ${rawDamage}`);
  console.log(`  Warrior HP: ${f1HpBefore} -> ${f1.hp} (took ${actualWarriorDamage}, expected 25%=${expectedSelfDamage})`);
  console.log(`  Knight HP: ${f2HpBefore} -> ${f2.hp} (took ${actualKnightDamage}, expected 75%=${expectedReflected})`);

  assert(reflectedDamage > 0, 'Damage was reflected');
  assert(actualWarriorDamage === expectedSelfDamage,
    `Warrior takes 25% = ${expectedSelfDamage}`,
    `Got ${actualWarriorDamage}`);
  assert(actualKnightDamage === expectedReflected,
    `Knight takes 75% = ${expectedReflected}`,
    `Got ${actualKnightDamage}`);

  // Also verify the DamageCalculator directly
  const csResult = damageCalc.calculateCounterShock(rawDamage, 'melee', false);
  assert(csResult !== null, 'Counter-shock result is not null for melee');
  assert(csResult!.selfDamage === expectedSelfDamage, `selfDamage = ${expectedSelfDamage}`);
  assert(csResult!.reflectedDamage === expectedReflected, `reflectedDamage = ${expectedReflected}`);
}

// ============================================================
// Test 3: HP cost — Fighter with 11 HP uses 冲锋 (10 HP cost) — should survive
// ============================================================
function testHpCostSurvival(): void {
  section('3. HP cost: 11 HP uses 冲锋 (10 HP cost) — should survive and attack');

  const { state, f1, f2, resolver, events } = createTestBattle(
    'knight',          // f1: knight at 11 HP
    'armored-warrior', // f2: target
  );

  f1.hp = 11;
  state.round = 1;

  f1.chosenAction = { type: 'skill', skillId: 'knight-charge', targetIds: [f2.id] };
  f2.chosenAction = { type: 'defend' }; // not escaping => charge hits

  const f2HpBefore = f2.hp;
  let hpCostPaid = false;
  let hpAfterCost = 0;
  events.on('hp-cost-paid', (e) => {
    hpCostPaid = true;
    hpAfterCost = e.data.hpAfter;
  });

  state.phase = 'action-resolve';
  resolver.resolveRound(state, state.fighters);

  assert(hpCostPaid, 'HP cost was paid');
  assert(hpAfterCost === 1, `HP after cost = 1 (11 - 10)`, `Got ${hpAfterCost}`);
  assert(f1.hp === 1 || f1.hp < 1, `Fighter HP after cost+action = ${f1.hp}`);
  // The attack should have gone through (target is defending, not escaping)
  // 冲锋: base 75, condition: target-escaping -> NOT met, so conditionZeroDamage applies when met.
  // Target is defending, not escaping, so conditionZeroDamage = false for this action.
  // Wait: conditionZeroDamage triggers when target IS escaping. Target is defending.
  // So damage = 75 * 1 * (10 - DEF) / 10
  const expectedDamage = roundTo2(75 * (10 - f2.baseDef) / 10); // 75 * 7/10 = 52.5
  const actualDamage = roundTo2(f2HpBefore - f2.hp);

  // Note: target is defending, so DEF is boosted. Let's check.
  // When defending: DEF = currentDef * (1 + 0.1 * baseDef) = 3 * (1 + 0.3) = 3.9
  // So damage = 75 * (10 - 3.9) / 10 = 75 * 6.1 / 10 = 45.75
  const defBoosted = roundTo2(f2.baseDef * (1 + 0.1 * f2.baseDef));
  const expectedDamageDefending = roundTo2(75 * (10 - defBoosted) / 10);

  console.log(`  HP cost paid: ${hpCostPaid}, HP after cost: ${hpAfterCost}`);
  console.log(`  Target DEF boosted: ${defBoosted}`);
  console.log(`  Target HP: ${f2HpBefore} -> ${f2.hp} (damage: ${actualDamage}, expected: ${expectedDamageDefending})`);
  assert(actualDamage === expectedDamageDefending,
    `Attack went through for ${expectedDamageDefending} damage`,
    `Got ${actualDamage}`);
}

// ============================================================
// Test 4: HP cost — Fighter with 10 HP cannot use 冲锋 (HP must be > cost)
// ============================================================
function testHpCostCannotAfford(): void {
  section('4. HP cost: 10 HP tries 冲锋 (10 HP cost) — should NOT be able to');

  const battle = new BattleManager({
    fighters: [
      { characterClass: 'knight', isPlayer: false, displayName: '骑士' },
      { characterClass: 'armored-warrior', isPlayer: false, displayName: '装甲战士' },
    ],
  });

  // Directly manipulate state to set HP = 10
  const state = battle.getState() as any;
  const knight = state.fighters[0] as Fighter;
  knight.hp = 10;

  const available = battle.getAvailableActions(knight.id);
  const chargeAction = available.find(a => a.skillId === 'knight-charge');

  assert(chargeAction !== undefined, 'Charge skill exists in available actions');
  assert(chargeAction?.affordable === false,
    'Charge is NOT affordable at 10 HP',
    `affordable=${chargeAction?.affordable}, reason=${chargeAction?.reason}`);

  console.log(`  Knight HP: ${knight.hp}`);
  console.log(`  Charge affordable: ${chargeAction?.affordable}`);
  console.log(`  Reason: ${chargeAction?.reason}`);

  // Also verify at 11 HP it IS affordable
  knight.hp = 11;
  const available2 = battle.getAvailableActions(knight.id);
  const chargeAction2 = available2.find(a => a.skillId === 'knight-charge');
  assert(chargeAction2?.affordable === true,
    'Charge IS affordable at 11 HP',
    `affordable=${chargeAction2?.affordable}`);
}

// ============================================================
// Test 5: RAGE cap at 100
// ============================================================
function testRageCap(): void {
  section('5. RAGE cap: 200 damage with 50 RAGE should cap at 100');

  const { state, f1, f2, resolver, events } = createTestBattle(
    'armored-warrior', // f1: will take big damage
    'knight',          // f2: will deal big damage
  );

  f1.rage = 50;
  f1.hp = 500; // extra HP so we don't die

  // We need to test the clamp directly since normal skills can't do 200 damage.
  // Let's test via the clamp utility and the damage application logic.

  // Direct test: clamp(50 + 200, 0, 100) should be 100
  const result = clamp(50 + 200, 0, 100);
  assert(result === 100, `clamp(50+200, 0, 100) = ${result}`, `Expected 100, got ${result}`);

  // Test with actual battle damage: knight basic attack deals baseAtk=30 damage
  // DEF=3, so 30 * (10-3)/10 = 21
  // Rage gained = 21, so 50 + 21 = 71 (under cap, but proves the mechanic)
  state.round = 1;
  f2.chosenAction = { type: 'basic-attack', targetIds: [f1.id] };
  f1.chosenAction = { type: 'basic-attack', targetIds: [f2.id] };

  state.phase = 'action-resolve';
  resolver.resolveRound(state, state.fighters);

  console.log(`  Warrior RAGE after taking damage: ${f1.rage}`);
  assert(f1.rage <= 100, `RAGE is <= 100: ${f1.rage}`);

  // Now test with high starting RAGE
  const { state: state2, f1: f1b, f2: f2b, resolver: resolver2 } = createTestBattle(
    'armored-warrior',
    'knight',
  );
  f1b.rage = 95;
  f1b.hp = 500;
  state2.round = 1;

  f2b.chosenAction = { type: 'basic-attack', targetIds: [f1b.id] };
  f1b.chosenAction = { type: 'basic-attack', targetIds: [f2b.id] };

  state2.phase = 'action-resolve';
  resolver2.resolveRound(state2, state2.fighters);

  console.log(`  Warrior RAGE (started 95, took damage): ${f1b.rage}`);
  assert(f1b.rage === 100, `RAGE capped at 100, not ${f1b.rage}`, `Got ${f1b.rage}`);
}

// ============================================================
// Test 6: True damage ignores DEF — 漫天花雨 deals exactly 80
// ============================================================
function testTrueDamage(): void {
  section('6. True damage: 漫天花雨 should deal exactly 80 regardless of DEF');

  const { state, f1, f2, resolver, events } = createTestBattle(
    'archer',          // f1: uses arrow rain
    'armored-warrior', // f2: high DEF target
  );

  f1.rage = 80; // arrow rain costs 80 RAGE
  f1.mp = 150;
  state.round = 1;

  const f2HpBefore = f2.hp;
  const f2Def = f2.currentDef; // Should be 3

  f1.chosenAction = { type: 'skill', skillId: 'archer-arrow-rain', targetIds: [f2.id] };
  f2.chosenAction = { type: 'defend' }; // Defending = even higher DEF

  let damageDealt = 0;
  let wasTrueDamage = false;
  events.on('damage-dealt', (e) => {
    damageDealt = e.data.finalDamage;
    wasTrueDamage = e.data.isTrueDamage;
  });

  state.phase = 'action-resolve';
  resolver.resolveRound(state, state.fighters);

  const actualDamage = roundTo2(f2HpBefore - f2.hp);

  console.log(`  Target DEF: ${f2Def} (defending)`);
  console.log(`  Damage dealt: ${actualDamage} (expected exactly 80)`);
  console.log(`  Is true damage: ${wasTrueDamage}`);

  assert(wasTrueDamage, 'Damage is flagged as true damage');
  assert(actualDamage === 80, `True damage = exactly 80`, `Got ${actualDamage}`);
  assert(damageDealt === 80, `Event reports 80 damage`, `Got ${damageDealt}`);

  // Also test via DamageCalculator directly
  const dc = new DamageCalculator();
  const dmgResult = dc.calculateDamage(f1, f2, getSkill('archer-arrow-rain'), { type: 'defend' });
  assert(dmgResult.isTrueDamage, 'DamageCalculator marks as true damage');
  assert(dmgResult.finalDamage === 80, `DamageCalculator finalDamage = 80`, `Got ${dmgResult.finalDamage}`);
  assert(dmgResult.defReduction === 0, `No DEF reduction for true damage`, `Got ${dmgResult.defReduction}`);
}

// ============================================================
// Test 7: Whip one-time use
// ============================================================
function testWhipOneTime(): void {
  section('7. Whip one-time: After use, should not be available again');

  const battle = new BattleManager({
    fighters: [
      { characterClass: 'knight', isPlayer: false, displayName: '骑士' },
      { characterClass: 'armored-warrior', isPlayer: false, displayName: '装甲战士' },
    ],
  });

  const state = battle.getState() as any;
  const knight = state.fighters[0] as Fighter;

  // Before use: whip should be available
  const before = battle.getAvailableActions(knight.id);
  const whipBefore = before.find(a => a.skillId === 'knight-whip');
  assert(whipBefore !== undefined, 'Whip exists in actions list');
  assert(whipBefore?.affordable === true, 'Whip is affordable before use');

  console.log(`  Before use: whipUsed=${knight.whipUsed}, affordable=${whipBefore?.affordable}`);

  // Use whip
  knight.whipUsed = true;

  // After use: whip should NOT be affordable
  const after = battle.getAvailableActions(knight.id);
  const whipAfter = after.find(a => a.skillId === 'knight-whip');
  assert(whipAfter !== undefined, 'Whip still in actions list after use');
  assert(whipAfter?.affordable === false,
    'Whip is NOT affordable after use',
    `affordable=${whipAfter?.affordable}`);

  console.log(`  After use: whipUsed=${knight.whipUsed}, affordable=${whipAfter?.affordable}`);
  console.log(`  Reason: ${whipAfter?.reason}`);

  // Verify AGI was boosted
  const smgr = new StatusEffectManager();
  smgr.recalculateStats(knight);
  assert(knight.currentAgi === knight.baseAgi + 1,
    `AGI boosted from ${knight.baseAgi} to ${knight.currentAgi}`,
    `Expected ${knight.baseAgi + 1}, got ${knight.currentAgi}`);
}

// ============================================================
// Test 8: Guerrilla tactics timing
// ============================================================
function testGuerrillaTactics(): void {
  section('8. Guerrilla tactics: ranged skill -> AGI+2 next round; non-ranged -> AGI returns');

  const { state, f1, f2, statusMgr, resolver, events } = createTestBattle(
    'archer',          // f1: archer with guerrilla passive
    'armored-warrior', // f2: target
  );

  const baseAgi = f1.baseAgi; // 6
  state.round = 1;

  console.log(`  Base AGI: ${baseAgi}`);

  // Round 1: Archer uses ranged skill (太阳之弓)
  f1.chosenAction = { type: 'skill', skillId: 'archer-sun-bow', targetIds: [f2.id] };
  f2.chosenAction = { type: 'basic-attack', targetIds: [f1.id] };

  state.phase = 'action-resolve';
  resolver.resolveRound(state, state.fighters);

  // After action resolve, handle guerrilla (normally done in status-update phase)
  statusMgr.handleGuerrillaTactics(f1);

  console.log(`  After ranged skill: guerrillaActive=${f1.guerrillaActive}, AGI=${f1.currentAgi}`);
  assert(f1.guerrillaActive, 'Guerrilla is active after ranged skill');
  assert(f1.currentAgi === baseAgi + 2,
    `AGI = ${baseAgi + 2} (base + guerrilla bonus)`,
    `Got ${f1.currentAgi}`);

  // Simulate next round start: tick effects
  // guerrilla-boost was applied with remainingRounds=2
  // After tick: remainingRounds=1 (still active)
  state.round = 2;
  f1.usedRangedSkillThisRound = false; // Reset for new round

  // Round 2: Archer uses non-ranged skill (匕首突刺 = melee)
  f1.chosenAction = { type: 'skill', skillId: 'archer-dagger-thrust', targetIds: [f2.id] };
  f2.chosenAction = { type: 'basic-attack', targetIds: [f1.id] };

  state.phase = 'action-resolve';
  resolver.resolveRound(state, state.fighters);

  // Handle guerrilla for non-ranged: should deactivate
  statusMgr.handleGuerrillaTactics(f1);

  console.log(`  After non-ranged skill: guerrillaActive=${f1.guerrillaActive}, AGI=${f1.currentAgi}`);
  assert(!f1.guerrillaActive, 'Guerrilla deactivated after non-ranged skill');
  assert(f1.currentAgi === baseAgi,
    `AGI returns to base ${baseAgi}`,
    `Got ${f1.currentAgi}`);
}

// ============================================================
// Main
// ============================================================
function main(): void {
  console.log('');
  console.log('############################################################');
  console.log('#          EDGE CASE BATTLE TESTS                          #');
  console.log('############################################################');

  testCounterShockVsRanged();
  testCounterShockVsMelee();
  testHpCostSurvival();
  testHpCostCannotAfford();
  testRageCap();
  testTrueDamage();
  testWhipOneTime();
  testGuerrillaTactics();

  console.log(`\n${'='.repeat(60)}`);
  console.log(`RESULTS: ${passCount}/${testCount} passed, ${failCount} failed`);
  console.log(`${'='.repeat(60)}\n`);

  if (failCount > 0) {
    process.exit(1);
  }
}

main();
