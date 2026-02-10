/**
 * Balance Simulator — large-scale AI vs AI battle statistics.
 * Usage:
 *   npx tsx src/test/balanceSimulator.ts              # default: 500 3-player battles
 *   npx tsx src/test/balanceSimulator.ts 1000          # custom battle count
 *   npx tsx src/test/balanceSimulator.ts 1000 4        # custom count + player count
 */
import { BattleManager } from '../core/BattleManager';
import type { CharacterClass, BattleConfig } from '../core/types';

// ============================================================
// Config
// ============================================================

const ALL_CLASSES: CharacterClass[] = ['knight', 'armored-warrior', 'archer'];
const CLASS_NAMES: Record<CharacterClass, string> = {
  'knight': '骑士',
  'armored-warrior': '装甲战士',
  'archer': '弓箭手',
};

// ============================================================
// Silent battle runner (no event logging)
// ============================================================

function runSilentBattle(classes: CharacterClass[]): { winner: CharacterClass | 'draw'; rounds: number } {
  const config: BattleConfig = {
    fighters: classes.map((c, i) => ({
      characterClass: c,
      isPlayer: false,
      displayName: `${CLASS_NAMES[c]}-${i}`,
    })),
    aiDifficulty: 'normal',
  };

  const battle = new BattleManager(config);
  const state = battle.runAutomatic();

  if (state.winner === 'draw' || state.winner === null) {
    return { winner: 'draw', rounds: state.round };
  }

  // Extract character class from winner ID (e.g. "knight-0" -> "knight")
  const winnerFighter = state.fighters.find(f => f.id === state.winner);
  return {
    winner: winnerFighter?.characterClass ?? 'draw' as any,
    rounds: state.round,
  };
}

// ============================================================
// Statistics
// ============================================================

interface BattleStats {
  wins: Record<string, number>;
  totalRounds: number;
  battleCount: number;
  draws: number;
}

function runBattleSeries(classes: CharacterClass[], count: number): BattleStats {
  const stats: BattleStats = {
    wins: {},
    totalRounds: 0,
    battleCount: count,
    draws: 0,
  };

  for (const c of classes) {
    stats.wins[c] = 0;
  }

  for (let i = 0; i < count; i++) {
    const result = runSilentBattle(classes);
    stats.totalRounds += result.rounds;
    if (result.winner === 'draw') {
      stats.draws++;
    } else {
      stats.wins[result.winner] = (stats.wins[result.winner] ?? 0) + 1;
    }
  }

  return stats;
}

// ============================================================
// Output formatting
// ============================================================

function padRight(s: string, len: number): string {
  // Account for CJK characters (width 2)
  let width = 0;
  for (const ch of s) {
    width += ch.charCodeAt(0) > 0x7f ? 2 : 1;
  }
  return s + ' '.repeat(Math.max(0, len - width));
}

function printFreeForAll(classes: CharacterClass[], count: number): void {
  console.log(`\n=== ${classes.length}人对战 (${count}场) ===`);
  const stats = runBattleSeries(classes, count);
  const avgRounds = (stats.totalRounds / stats.battleCount).toFixed(1);

  console.log(`${padRight('角色', 16)}${padRight('胜场', 8)}${padRight('胜率', 8)}${padRight('平均回合', 10)}`);

  // Sort by wins descending
  const sorted = Object.entries(stats.wins).sort((a, b) => b[1] - a[1]);
  for (const [cls, wins] of sorted) {
    const name = CLASS_NAMES[cls as CharacterClass] ?? cls;
    const rate = ((wins / stats.battleCount) * 100).toFixed(1) + '%';
    console.log(`${padRight(name, 16)}${padRight(String(wins), 8)}${padRight(rate, 8)}${padRight(avgRounds, 10)}`);
  }
  if (stats.draws > 0) {
    const drawRate = ((stats.draws / stats.battleCount) * 100).toFixed(1) + '%';
    console.log(`${padRight('平局', 16)}${padRight(String(stats.draws), 8)}${padRight(drawRate, 8)}${padRight('—', 10)}`);
  }
}

function printDuels(count: number): void {
  console.log(`\n=== 1v1 对决 (各${count}场) ===`);
  const pairs: [CharacterClass, CharacterClass][] = [
    ['knight', 'armored-warrior'],
    ['knight', 'archer'],
    ['armored-warrior', 'archer'],
  ];

  console.log(`${padRight('对阵', 20)}${padRight('胜A', 14)}${padRight('胜B', 14)}${padRight('平局', 10)}`);

  for (const [a, b] of pairs) {
    const stats = runBattleSeries([a, b], count);
    const winsA = stats.wins[a] ?? 0;
    const winsB = stats.wins[b] ?? 0;
    const pctA = ((winsA / count) * 100).toFixed(0);
    const pctB = ((winsB / count) * 100).toFixed(0);
    const pctD = ((stats.draws / count) * 100).toFixed(0);

    const label = `${CLASS_NAMES[a]} vs ${CLASS_NAMES[b]}`;
    const colA = `${winsA}(${pctA}%)`;
    const colB = `${winsB}(${pctB}%)`;
    const colD = `${stats.draws}(${pctD}%)`;

    console.log(`${padRight(label, 20)}${padRight(colA, 14)}${padRight(colB, 14)}${padRight(colD, 10)}`);
  }
}

// ============================================================
// Main
// ============================================================

function main(): void {
  const args = process.argv.slice(2);
  const battleCount = parseInt(args[0] ?? '500', 10);
  const playerCount = parseInt(args[1] ?? '0', 10); // 0 = run all presets

  console.log('############################################################');
  console.log('#          BALANCE SIMULATOR                               #');
  console.log('############################################################');

  if (playerCount > 0) {
    // Single mode: run N battles with specified player count
    const classes: CharacterClass[] = [];
    for (let i = 0; i < playerCount; i++) {
      classes.push(ALL_CLASSES[i % ALL_CLASSES.length]);
    }
    printFreeForAll(classes, battleCount);
    return;
  }

  // Default: comprehensive suite
  // 1) 3-player FFA (main mode)
  printFreeForAll(['knight', 'armored-warrior', 'archer'], battleCount);

  // 2) 1v1 duels
  printDuels(200);

  // 3) 4-player (one extra knight for variety)
  printFreeForAll(['knight', 'armored-warrior', 'archer', 'knight'], 100);

  // 4) 6-player (two of each)
  printFreeForAll([
    'knight', 'armored-warrior', 'archer',
    'knight', 'armored-warrior', 'archer',
  ], 50);

  console.log('\n############################################################');
  console.log('#          SIMULATION COMPLETE                             #');
  console.log('############################################################');
}

main();
