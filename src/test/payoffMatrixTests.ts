/**
 * Payoff Matrix Tests — Verify 1v1 AI matrix computation correctness.
 * Usage: npx tsx src/test/payoffMatrixTests.ts
 *
 * Tests matrix dimensions, specific cell outcomes (charge vs escape, counter-shock),
 * buff value estimates, opponent prediction, and best response selection.
 */
import { createBattleState } from '../core/BattleFactory';
import {
  buildPayoffMatrix, predictOpponent, selectBestResponse,
  getOpponentAffordableActions,
} from '../ai/PayoffMatrix';
import type { Fighter, AvailableAction, BattleConfig, CharacterClass } from '../core/types';

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

function assertApprox(actual: number, expected: number, tolerance: number, testName: string): void {
  const diff = Math.abs(actual - expected);
  assert(diff <= tolerance, testName, `expected ~${expected}, got ${actual} (diff=${diff.toFixed(4)})`);
}

function section(title: string): void {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`TEST: ${title}`);
  console.log(`${'='.repeat(60)}`);
}

function createTestBattle(class1: CharacterClass, class2: CharacterClass): { fighters: Fighter[] } {
  const config: BattleConfig = {
    fighters: [
      { characterClass: class1, isPlayer: false, displayName: class1 },
      { characterClass: class2, isPlayer: false, displayName: class2 },
    ],
  };
  return createBattleState(config);
}

function getAffordable(fighter: Readonly<Fighter>): AvailableAction[] {
  return getOpponentAffordableActions(fighter);
}

// ============================================================
// Test 1: Matrix Dimensions
// ============================================================
function testMatrixDimensions(): void {
  section('Matrix Dimensions');

  const state = createTestBattle('knight', 'armored-warrior');
  const knight = state.fighters[0];
  const warrior = state.fighters[1];

  const myActions = getAffordable(knight);
  const opActions = getAffordable(warrior);

  const result = buildPayoffMatrix(knight, warrior, myActions, opActions, 1);

  assert(result.myActions.length === myActions.length,
    'myActions length matches',
    `expected ${myActions.length}, got ${result.myActions.length}`);

  assert(result.opActions.length === opActions.length,
    'opActions length matches',
    `expected ${opActions.length}, got ${result.opActions.length}`);

  assert(result.matrix.length === myActions.length,
    'matrix rows match myActions',
    `expected ${myActions.length}, got ${result.matrix.length}`);

  assert(result.matrix[0].length === opActions.length,
    'matrix cols match opActions',
    `expected ${opActions.length}, got ${result.matrix[0].length}`);

  assert(result.opPayoffs.length === myActions.length,
    'opPayoffs rows match',
    `expected ${myActions.length}, got ${result.opPayoffs.length}`);

  // Knight at full resources: basic-attack, defend, escape + 6 skills (whip is free, flying trample needs rage)
  // Knight has 0 rage, so flying-trample not affordable
  const knightActions = myActions.filter(a => a.affordable);
  console.log(`  Knight affordable actions: ${knightActions.length} (${knightActions.map(a => a.skillId ?? a.type).join(', ')})`);

  assert(knightActions.length >= 7,
    'Knight has at least 7 affordable actions (3 base + 4 MP skills + whip)',
    `got ${knightActions.length}`);
}

// ============================================================
// Test 2: Charge vs Escape → Zero Damage
// ============================================================
function testChargeVsEscape(): void {
  section('Charge vs Escape (conditionZeroDamage)');

  const state = createTestBattle('knight', 'archer');
  const knight = state.fighters[0];
  const archer = state.fighters[1];

  const chargeAction: AvailableAction = { type: 'skill', skillId: 'knight-charge', affordable: true };
  const escapeAction: AvailableAction = { type: 'escape', affordable: true };

  const result = buildPayoffMatrix(knight, archer, [chargeAction], [escapeAction], 1);
  const cell = result.matrix[0][0];

  // Charge (conditionZeroDamage when target-escaping) → 0 damage
  // But HP cost is still paid (10 HP)
  assertApprox(cell.myDmgDealt, 0, 0.01,
    'Charge vs escape deals 0 damage');
  assertApprox(cell.myHpCost, 10, 0.01,
    'Charge still costs 10 HP');

  // Knight also takes some damage from archer basic attack? No — archer chose escape, not attack
  // So myDmgTaken should be 0 as well
  assertApprox(cell.myDmgTaken, 0, 0.01,
    'No damage taken when opponent escapes');
}

// ============================================================
// Test 3: Charge vs Defend → Full Damage with DEF
// ============================================================
function testChargeVsDefend(): void {
  section('Charge vs Defend');

  const state = createTestBattle('knight', 'armored-warrior');
  const knight = state.fighters[0];
  const warrior = state.fighters[1];

  const chargeAction: AvailableAction = { type: 'skill', skillId: 'knight-charge', affordable: true };
  const defendAction: AvailableAction = { type: 'defend', affordable: true };

  const result = buildPayoffMatrix(knight, warrior, [chargeAction], [defendAction], 1);
  const cell = result.matrix[0][0];

  // Charge vs defend: condition 'target-escaping' NOT met → full damage
  // Warrior DEF = 3, defending DEF = 3 * (1 + 0.1 * 3) = 3.9
  // Damage = 75 * (10 - 3.9) / 10 = 75 * 0.61 = 45.75
  const expectedDef = 3 * (1 + 0.1 * 3); // 3.9
  const expectedDmg = 75 * (10 - expectedDef) / 10;

  assertApprox(cell.myDmgDealt, expectedDmg, 0.5,
    `Charge vs defend deals ~${expectedDmg.toFixed(1)} damage`);
  assertApprox(cell.myHpCost, 10, 0.01,
    'Charge HP cost = 10');
}

// ============================================================
// Test 4: Heavy Hammer vs Defend → 1.5x Multiplier
// ============================================================
function testHeavyHammerVsDefend(): void {
  section('Heavy Hammer vs Defend (condition multiplier)');

  const state = createTestBattle('armored-warrior', 'knight');
  const warrior = state.fighters[0];
  const knight = state.fighters[1];

  const hammerAction: AvailableAction = { type: 'skill', skillId: 'warrior-heavy-hammer', affordable: true };
  const defendAction: AvailableAction = { type: 'defend', affordable: true };
  const basicAction: AvailableAction = { type: 'basic-attack', affordable: true };

  const result = buildPayoffMatrix(warrior, knight, [hammerAction], [defendAction, basicAction], 1);
  const cellVsDefend = result.matrix[0][0];
  const cellVsAttack = result.matrix[0][1];

  // Vs defend: 50 * 1.5 * (10 - defendDef) / 10
  // Knight DEF = 2, defending DEF = 2 * (1 + 0.1 * 2) = 2.4
  const knightDefendDef = 2 * (1 + 0.1 * 2); // 2.4
  const expectedVsDefend = 50 * 1.5 * (10 - knightDefendDef) / 10;

  // Vs basic-attack: 50 * 1 * (10 - 2) / 10 = 40
  const expectedVsAttack = 50 * (10 - 2) / 10;

  assertApprox(cellVsDefend.myDmgDealt, expectedVsDefend, 0.5,
    `Heavy Hammer vs defend = ~${expectedVsDefend.toFixed(1)} (1.5x)`);
  assertApprox(cellVsAttack.myDmgDealt, expectedVsAttack, 0.5,
    `Heavy Hammer vs attack = ~${expectedVsAttack.toFixed(1)} (1.0x)`);

  assert(cellVsDefend.myDmgDealt > cellVsAttack.myDmgDealt,
    'Heavy Hammer deals MORE damage vs defending target');
}

// ============================================================
// Test 5: Counter-shock vs Melee → Reflect 75%
// ============================================================
function testCounterShockVsMelee(): void {
  section('Counter-shock vs Melee Attack');

  const state = createTestBattle('armored-warrior', 'knight');
  const warrior = state.fighters[0];
  const knight = state.fighters[1];

  // Give warrior enough rage for counter-shock
  (warrior as Fighter).rage = 60;

  const csAction: AvailableAction = { type: 'skill', skillId: 'warrior-counter-shock', affordable: true };
  const dragonStrike: AvailableAction = { type: 'skill', skillId: 'knight-dragon-strike', affordable: true };

  const result = buildPayoffMatrix(warrior, knight, [csAction], [dragonStrike], 1);
  const cell = result.matrix[0][0];

  // Dragon Strike: 50 * (10 - warrior.def) / 10 = 50 * (10 - 3) / 10 = 35
  // Counter-shock reflects 75%: warrior takes 35*0.25=8.75, knight takes 35*0.75=26.25
  const incomingDmg = 50 * (10 - warrior.currentDef) / 10;

  assertApprox(cell.myDmgTaken, incomingDmg * 0.25, 0.5,
    `Counter-shock: take 25% of ${incomingDmg.toFixed(1)} = ~${(incomingDmg * 0.25).toFixed(1)}`);

  // The reflected damage shows up as opponent damage (their perspective)
  // From warrior perspective: they deal no direct damage, but reflect happens
  // myDmgDealt = 0 (counter-shock is a buff, doesn't deal damage directly from warrior)
  assertApprox(cell.myDmgDealt, 0, 0.01,
    'Counter-shock buff itself deals 0 direct damage');
}

// ============================================================
// Test 6: Counter-shock vs Ranged → No Reflect
// ============================================================
function testCounterShockVsRanged(): void {
  section('Counter-shock vs Ranged Attack (no reflect)');

  const state = createTestBattle('armored-warrior', 'archer');
  const warrior = state.fighters[0];
  const archer = state.fighters[1];

  (warrior as Fighter).rage = 60;

  const csAction: AvailableAction = { type: 'skill', skillId: 'warrior-counter-shock', affordable: true };
  const sunBow: AvailableAction = { type: 'skill', skillId: 'archer-sun-bow', affordable: true };

  const result = buildPayoffMatrix(warrior, archer, [csAction], [sunBow], 1);
  const cell = result.matrix[0][0];

  // Sun Bow is ranged → counter-shock doesn't trigger
  // Sun Bow: condition = target-using-skill, warrior IS using a skill → 30 * 2 = 60
  // After warrior DEF 3: 60 * (10-3)/10 = 42
  // Archer precision: AGI 6 - 4 = 2 → +10
  const precisionDmg = 5 * (archer.currentAgi - warrior.currentAgi);
  const expectedDmg = 30 * 2 * (10 - warrior.currentDef) / 10 + precisionDmg;

  assertApprox(cell.myDmgTaken, expectedDmg, 0.5,
    `Full ranged damage taken (no reflect): ~${expectedDmg.toFixed(1)}`);
}

// ============================================================
// Test 7: Buff Value Estimates
// ============================================================
function testBuffValues(): void {
  section('Buff Value Estimates');

  const state = createTestBattle('knight', 'armored-warrior');
  const knight = state.fighters[0];
  const warrior = state.fighters[1];

  // Whip value should be positive in early rounds
  const whipAction: AvailableAction = { type: 'skill', skillId: 'knight-whip', affordable: true };
  const opDefend: AvailableAction = { type: 'defend', affordable: true };

  const result = buildPayoffMatrix(knight, warrior, [whipAction], [opDefend], 1);
  const whipCell = result.matrix[0][0];

  assert(whipCell.buffValue > 0,
    'Whip buff value is positive in round 1',
    `got ${whipCell.buffValue.toFixed(2)}`);

  // Whip value should decrease in later rounds
  const resultLate = buildPayoffMatrix(knight, warrior, [whipAction], [opDefend], 8);
  const whipCellLate = resultLate.matrix[0][0];

  assert(whipCellLate.buffValue < whipCell.buffValue,
    'Whip value decreases in later rounds',
    `round 1: ${whipCell.buffValue.toFixed(2)}, round 8: ${whipCellLate.buffValue.toFixed(2)}`);

  // Whip already used → very negative
  const knightUsed = { ...knight, whipUsed: true } as Readonly<Fighter>;
  const resultUsed = buildPayoffMatrix(knightUsed, warrior, [whipAction], [opDefend], 1);
  assert(resultUsed.matrix[0][0].buffValue < 0,
    'Whip value is negative when already used',
    `got ${resultUsed.matrix[0][0].buffValue}`);
}

// ============================================================
// Test 8: Opponent Affordability
// ============================================================
function testOpponentAffordability(): void {
  section('Opponent Affordability');

  const state = createTestBattle('archer', 'knight');
  const archer = state.fighters[0];

  // Full resources
  let actions = getAffordable(archer);
  const hasArrowRain = actions.some(a => a.skillId === 'archer-arrow-rain');
  assert(!hasArrowRain,
    'Arrow Rain not affordable at 0 rage');

  // Give archer 80 rage
  (archer as Fighter).rage = 80;
  actions = getAffordable(archer);
  const hasArrowRainNow = actions.some(a => a.skillId === 'archer-arrow-rain');
  assert(hasArrowRainNow,
    'Arrow Rain affordable at 80 rage');

  // Rainbow Cloud needs 20 MP + 30 RAGE
  (archer as Fighter).mp = 20;
  (archer as Fighter).rage = 30;
  actions = getAffordable(archer);
  const hasRC = actions.some(a => a.skillId === 'archer-rainbow-cloud');
  assert(hasRC,
    'Rainbow Cloud affordable with exact resources (20 MP + 30 RAGE)');

  (archer as Fighter).rage = 29;
  actions = getAffordable(archer);
  const hasRCno = actions.some(a => a.skillId === 'archer-rainbow-cloud');
  assert(!hasRCno,
    'Rainbow Cloud NOT affordable with 29 RAGE (need 30)');
}

// ============================================================
// Test 9: Opponent Prediction (Softmax Behavior)
// ============================================================
function testOpponentPrediction(): void {
  section('Opponent Prediction');

  const state = createTestBattle('knight', 'armored-warrior');
  const knight = state.fighters[0];
  const warrior = state.fighters[1];

  const myActions = getAffordable(knight);
  const opActions = getAffordable(warrior);
  const result = buildPayoffMatrix(knight, warrior, myActions, opActions, 1);

  // No history: pure matrix-based prediction
  const probs = predictOpponent(result, null, 0);

  assert(probs.length === opActions.length,
    'Prediction length matches opponent actions',
    `expected ${opActions.length}, got ${probs.length}`);

  const sum = probs.reduce((a, b) => a + b, 0);
  assertApprox(sum, 1.0, 0.01,
    'Prediction probabilities sum to ~1.0');

  assert(probs.every(p => p >= 0),
    'All prediction probabilities are non-negative');
}

// ============================================================
// Test 10: Best Response Selection
// ============================================================
function testBestResponse(): void {
  section('Best Response Selection');

  const state = createTestBattle('knight', 'armored-warrior');
  const knight = state.fighters[0];
  const warrior = state.fighters[1];

  const myActions = getAffordable(knight);
  const opActions = getAffordable(warrior);
  const result = buildPayoffMatrix(knight, warrior, myActions, opActions, 1);
  const opProbs = predictOpponent(result, null, 0);

  // Run selection many times to verify it returns valid indices
  const selections = new Set<number>();
  for (let i = 0; i < 100; i++) {
    const idx = selectBestResponse(result, opProbs, 0.8);
    assert(idx >= 0 && idx < myActions.length,
      `Selection ${i}: index ${idx} is valid`);
    selections.add(idx);
  }

  // With softmax, should occasionally pick different actions
  assert(selections.size >= 2,
    `Multiple distinct actions selected (${selections.size} unique)`,
    `only got index: ${[...selections].join(', ')}`);
}

// ============================================================
// Test 11: Escape Hit Rate Calculations
// ============================================================
function testEscapeInteractions(): void {
  section('Escape Interactions');

  const state = createTestBattle('knight', 'archer');
  const knight = state.fighters[0];
  const archer = state.fighters[1];

  // Knight basic-attack vs archer escape (no whip)
  const attackAction: AvailableAction = { type: 'basic-attack', affordable: true };
  const escapeAction: AvailableAction = { type: 'escape', affordable: true };
  const result = buildPayoffMatrix(knight, archer, [attackAction], [escapeAction], 1);
  const cell = result.matrix[0][0];

  // No whip: escape 50%, dodge basic-attack 80%
  // Expected hit rate = 0.5 + 0.5 * (1-0.8) = 0.5 + 0.1 = 0.6
  // Damage = 30 * (10-1.5)/10 * 0.6 = 30 * 0.85 * 0.6 = 15.3
  const fullDmg = knight.baseAtk * (10 - archer.currentDef) / 10;
  const expectedHitRate = 0.5 + 0.5 * 0.2;
  const expectedDmg = fullDmg * expectedHitRate;

  assertApprox(cell.myDmgDealt, expectedDmg, 0.5,
    `Basic attack vs escape: ~${expectedDmg.toFixed(1)} (${(expectedHitRate*100).toFixed(0)}% hit rate)`);

  // Chase Slash (pursuit) vs escape → always hits, condition met (4x)
  const chaseSlash: AvailableAction = { type: 'skill', skillId: 'knight-chase-slash', affordable: true };
  const result2 = buildPayoffMatrix(knight, archer, [chaseSlash], [escapeAction], 1);
  const cell2 = result2.matrix[0][0];

  // Chase slash: 15 * 4 * (10-1.5)/10 = 60 * 0.85 = 51
  const chaseDmg = 15 * 4 * (10 - archer.currentDef) / 10;
  assertApprox(cell2.myDmgDealt, chaseDmg, 0.5,
    `Chase Slash (pursuit) vs escape: full ${chaseDmg.toFixed(1)} (always hits)`);
}

// ============================================================
// Test 12: True Damage ignores DEF and escape
// ============================================================
function testTrueDamage(): void {
  section('True Damage (Arrow Rain)');

  const state = createTestBattle('archer', 'armored-warrior');
  const archer = state.fighters[0];
  const warrior = state.fighters[1];

  (archer as Fighter).rage = 80;

  const arrowRain: AvailableAction = { type: 'skill', skillId: 'archer-arrow-rain', affordable: true };
  const escapeAction: AvailableAction = { type: 'escape', affordable: true };
  const defendAction: AvailableAction = { type: 'defend', affordable: true };

  const result = buildPayoffMatrix(archer, warrior, [arrowRain], [escapeAction, defendAction], 1);

  // Arrow Rain: 80 true damage, ignores DEF and escape
  assertApprox(result.matrix[0][0].myDmgDealt, 80, 0.5,
    'Arrow Rain vs escape = 80 (true damage, ignores escape)');
  assertApprox(result.matrix[0][1].myDmgDealt, 80, 0.5,
    'Arrow Rain vs defend = 80 (true damage, ignores DEF)');
}

// ============================================================
// Test 13: Kill/Die Detection
// ============================================================
function testKillDieDetection(): void {
  section('Kill/Die Detection');

  const state = createTestBattle('knight', 'archer');
  const knight = state.fighters[0];
  const archer = state.fighters[1];

  // Lower archer HP so dragon strike can kill
  (archer as Fighter).hp = 30;

  const dragonStrike: AvailableAction = { type: 'skill', skillId: 'knight-dragon-strike', affordable: true };
  const defendAction: AvailableAction = { type: 'defend', affordable: true };

  const result = buildPayoffMatrix(knight, archer, [dragonStrike], [defendAction], 1);
  const cell = result.matrix[0][0];

  // Dragon Strike: 50 * (10 - 1.5 * (1+0.1*1.5))/10 with archer defending
  // Archer DEF = 1.5, defending = 1.5 * (1 + 0.15) = 1.725
  // Damage = 50 * (10 - 1.725)/10 = 50 * 0.8275 = 41.375
  // 41.375 > 30 HP → canKill = true
  assert(cell.canKill === true,
    'Dragon Strike can kill 30 HP archer',
    `myDmgDealt=${cell.myDmgDealt.toFixed(1)}, archerHP=30`);

  // Verify payoff includes kill bonus
  assert(cell.payoff > 50,
    'Payoff includes kill bonus (>50)',
    `payoff=${cell.payoff.toFixed(1)}`);
}

// ============================================================
// Test 14: Precision Bonus (Archer vs low AGI)
// ============================================================
function testPrecisionBonus(): void {
  section('Precision Bonus (Archer Passive)');

  const state = createTestBattle('archer', 'armored-warrior');
  const archer = state.fighters[0];
  const warrior = state.fighters[1];

  // Archer AGI=6, Warrior AGI=4 → diff=2 → +10 precision
  const basicAction: AvailableAction = { type: 'basic-attack', affordable: true };
  const opBasic: AvailableAction = { type: 'basic-attack', affordable: true };

  const result = buildPayoffMatrix(archer, warrior, [basicAction], [opBasic], 1);
  const cell = result.matrix[0][0];

  // Basic attack: 20 * (10-3)/10 + 5*2 = 14 + 10 = 24
  const baseDmg = 20 * (10 - warrior.currentDef) / 10;
  const expected = baseDmg + 5 * (archer.currentAgi - warrior.currentAgi);

  assertApprox(cell.myDmgDealt, expected, 0.5,
    `Archer basic attack with precision: ~${expected.toFixed(1)}`);
}

// ============================================================
// Run All Tests
// ============================================================
console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║         PAYOFF MATRIX TESTS                            ║');
console.log('╚══════════════════════════════════════════════════════════╝');

testMatrixDimensions();
testChargeVsEscape();
testChargeVsDefend();
testHeavyHammerVsDefend();
testCounterShockVsMelee();
testCounterShockVsRanged();
testBuffValues();
testOpponentAffordability();
testOpponentPrediction();
testBestResponse();
testEscapeInteractions();
testTrueDamage();
testKillDieDetection();
testPrecisionBonus();

console.log(`\n${'='.repeat(60)}`);
console.log(`RESULTS: ${passCount}/${testCount} passed, ${failCount} failed`);
console.log(`${'='.repeat(60)}`);

if (failCount > 0) {
  process.exit(1);
}
