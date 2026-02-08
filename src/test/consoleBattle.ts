/**
 * Console Battle Runner — run a full 3-AI battle for verification.
 * Usage: npx tsx src/test/consoleBattle.ts
 */
import { BattleManager } from '../core/BattleManager';
import type { BattleEventDataMap } from '../core/types';

function runConsoleBattle(battleNum: number): string | null {
  const battle = new BattleManager({
    fighters: [
      { characterClass: 'knight', isPlayer: false, displayName: '骑士' },
      { characterClass: 'armored-warrior', isPlayer: false, displayName: '装甲战士' },
      { characterClass: 'archer', isPlayer: false, displayName: '弓箭手' },
    ],
    aiDifficulty: 'normal',
  });

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Battle #${battleNum}`);
  console.log(`${'='.repeat(60)}`);

  // Event logging
  battle.events.on('round-start', (e) => {
    const d = e.data;
    console.log(`\n--- Round ${d.round} ---`);
    for (const f of d.fighters) {
      if (!f.alive) continue;
      const effects = f.statusEffects.map(s => s.type).join(',') || 'none';
      console.log(`  ${f.id}: HP=${f.hp} MP=${f.mp} RAGE=${f.rage.toFixed(1)} AGI=${f.agi} DEF=${f.def} [${effects}]`);
    }
  });

  battle.events.on('passive-triggered', (e) => {
    console.log(`  [被动] ${e.data.description}`);
  });

  battle.events.on('action-resolve-start', (e) => {
    console.log(`  行动顺序: ${e.data.order.join(' → ')}`);
  });

  battle.events.on('skill-used', (e) => {
    const d = e.data;
    console.log(`  ${d.fighterId} 使用 ${d.skillName} (${d.costPaid.resource}: -${d.costPaid.amount})`);
  });

  battle.events.on('damage-dealt', (e) => {
    const d = e.data;
    if (d.dodged) {
      console.log(`  ${d.attackerId} → ${d.targetId}: DODGED!`);
    } else if (d.isReflected) {
      console.log(`  ${d.attackerId} → ${d.targetId}: ${d.finalDamage.toFixed(2)} dmg (反震: 自受25%)`);
    } else if (d.isTrueDamage) {
      console.log(`  ${d.attackerId} → ${d.targetId}: ${d.finalDamage.toFixed(2)} TRUE dmg`);
    } else {
      const cond = d.conditionMet ? ` [条件x${d.conditionMultiplier}]` : '';
      const prec = d.precisionBonus > 0 ? ` [精确+${d.precisionBonus.toFixed(1)}]` : '';
      console.log(`  ${d.attackerId} → ${d.targetId}: ${d.finalDamage.toFixed(2)} dmg${cond}${prec}`);
    }
  });

  battle.events.on('damage-reflected', (e) => {
    console.log(`  [反震] ${e.data.reflectorId} 反弹 ${e.data.reflectedDamage.toFixed(2)} dmg → ${e.data.targetId}`);
  });

  battle.events.on('escape-attempted', (e) => {
    console.log(`  ${e.data.fighterId} 尝试逃跑: ${e.data.success ? '成功!' : '失败'} (${(e.data.escapeRate * 100).toFixed(0)}%)`);
  });

  battle.events.on('defend-activated', (e) => {
    console.log(`  ${e.data.fighterId} 防御 (DEF: ${e.data.defBefore.toFixed(1)} → ${e.data.defAfter.toFixed(1)})`);
  });

  battle.events.on('buff-applied', (e) => {
    const d = e.data;
    if (d.whipPermanent) {
      console.log(`  ${d.fighterId} 使用马鞭 (AGI→${d.agiAfter}, 逃跑率→${((d.escapeRateAfter ?? 0) * 100).toFixed(0)}%)`);
    } else if (d.effectApplied) {
      console.log(`  ${d.fighterId} 获得 ${d.effectApplied.type} (${d.effectApplied.remainingRounds}回合)`);
    }
  });

  battle.events.on('hp-cost-paid', (e) => {
    console.log(`  ${e.data.fighterId} HP消耗: -${e.data.hpCost} (剩余HP: ${e.data.hpAfter.toFixed(1)})`);
  });

  battle.events.on('status-effect-expired', (e) => {
    console.log(`  [效果结束] ${e.data.fighterId} ${e.data.effectType}`);
  });

  battle.events.on('fighter-died', (e) => {
    console.log(`  *** ${e.data.fighterId} 阵亡! (击杀者: ${e.data.killedBy}) ***`);
  });

  let winner: string | null = null;
  battle.events.on('battle-end', (e) => {
    const d = e.data;
    console.log(`\n${'='.repeat(40)}`);
    if (d.winner === 'draw') {
      console.log(`结果: 平局! (${d.rounds}回合)`);
      winner = 'draw';
    } else {
      console.log(`结果: ${d.winner} 获胜! (${d.rounds}回合)`);
      winner = d.winner;
    }
    console.log(`存活: ${d.survivors.join(', ') || '无'}`);
  });

  // Run the battle
  const finalState = battle.runAutomatic();

  // Print final stats
  console.log('\n--- 最终状态 ---');
  for (const f of finalState.fighters) {
    console.log(`  ${f.displayName} (${f.id}): HP=${f.hp.toFixed(1)}/${f.maxHp} alive=${f.alive}`);
  }

  return winner;
}

// Run multiple battles for statistics
function main() {
  const numBattles = 5;
  const wins: Record<string, number> = {};

  console.log(`Running ${numBattles} battles...\n`);

  for (let i = 1; i <= numBattles; i++) {
    const winner = runConsoleBattle(i);
    if (winner) {
      wins[winner] = (wins[winner] ?? 0) + 1;
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('Win Statistics:');
  for (const [id, count] of Object.entries(wins).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${id}: ${count}/${numBattles} (${((count / numBattles) * 100).toFixed(1)}%)`);
  }
}

main();
