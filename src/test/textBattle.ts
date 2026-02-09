/**
 * Text-based 1v1 battle for verifying engine logic in conversation.
 *
 * Usage:
 *   npx tsx src/test/textBattle.ts init <class1> <class2>
 *   npx tsx src/test/textBattle.ts show
 *   npx tsx src/test/textBattle.ts act <action1> <action2>
 *
 * Actions:
 *   attack             — basic attack (auto-targets enemy in 1v1)
 *   defend             — defend
 *   escape             — escape
 *   skill:<skillId>    — use skill (auto-targets enemy or self)
 *
 * Example:
 *   npx tsx src/test/textBattle.ts init knight archer
 *   npx tsx src/test/textBattle.ts act "skill:knight-dragon-strike" "skill:archer-sun-bow"
 */
import fs from 'fs';
import path from 'path';
import { BattleManager } from '../core/BattleManager';
import type { BattleConfig, ChosenAction, Fighter, CharacterClass, BattleState } from '../core/types';
import { getSkill, getSkillsForClass } from '../skills';

const STATE_FILE = path.join(import.meta.dirname, 'battle-state.json');

function createBattle(class1: CharacterClass, class2: CharacterClass): BattleManager {
  const config: BattleConfig = {
    fighters: [
      { characterClass: class1, isPlayer: true, displayName: getClassName(class1) },
      { characterClass: class2, isPlayer: true, displayName: getClassName(class2) },
    ],
    aiDifficulty: 'normal',
  };
  return new BattleManager(config);
}

function getClassName(c: CharacterClass): string {
  return { knight: '骑士', 'armored-warrior': '装甲战士', archer: '弓箭手' }[c];
}

function saveState(battle: BattleManager): void {
  const state = battle.getState();
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function loadBattle(): BattleManager {
  const saved: BattleState = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
  // Recreate battle with same classes
  const classes = saved.fighters.map(f => f.characterClass);
  const battle = createBattle(classes[0], classes[1]);
  // Overwrite internal state
  (battle as any).state = saved;
  return battle;
}

function registerEvents(battle: BattleManager): string[] {
  const log: string[] = [];
  const events = battle.events;
  const name = (id: string) => {
    try { return battle.getFighter(id).displayName; } catch { return id; }
  };

  events.on('round-start', e => {
    log.push(`\n${'─'.repeat(40)}`);
    log.push(`📍 第 ${e.data.round} 回合开始`);
    for (const f of e.data.fighters) {
      if (!f.alive) continue;
      const effs = f.statusEffects.map(s => s.type).join(', ') || '无';
      log.push(`  ${name(f.id)}: HP=${f.hp}/${battle.getFighter(f.id).maxHp} MP=${f.mp} RAGE=${f.rage.toFixed(0)} AGI=${f.agi} DEF=${f.def} [${effs}]`);
    }
  });

  events.on('passive-triggered', e => {
    log.push(`  ⚡ [被动] ${e.data.description}`);
  });

  events.on('action-resolve-start', e => {
    log.push(`  ⚔️  行动顺序: ${e.data.order.map(id => name(id)).join(' → ')}`);
  });

  events.on('skill-used', e => {
    const cost = `${e.data.costPaid.amount}${e.data.costPaid.resource.toUpperCase()}`;
    log.push(`  🎯 ${name(e.data.fighterId)} 使用【${e.data.skillName}】(消耗 ${cost})`);
  });

  events.on('damage-dealt', e => {
    const d = e.data;
    if (d.dodged) {
      log.push(`     ${name(d.attackerId)} → ${name(d.targetId)}: 闪避！`);
    } else if (d.isTrueDamage) {
      log.push(`     ${name(d.attackerId)} → ${name(d.targetId)}: ${d.finalDamage.toFixed(1)} 真实伤害`);
    } else {
      const cond = d.conditionMet ? ` [条件触发 ×${d.conditionMultiplier}]` : '';
      const prec = d.precisionBonus > 0 ? ` [精确+${d.precisionBonus.toFixed(0)}]` : '';
      const refl = d.isReflected ? ' [反震]' : '';
      log.push(`     ${name(d.attackerId)} → ${name(d.targetId)}: ${d.finalDamage.toFixed(1)} 伤害${cond}${prec}${refl}`);
    }
  });

  events.on('damage-reflected', e => {
    log.push(`     🔄 ${name(e.data.reflectorId)} 反震 → ${name(e.data.targetId)}: ${e.data.reflectedDamage.toFixed(1)} 伤害`);
  });

  events.on('escape-attempted', e => {
    log.push(`  🏃 ${name(e.data.fighterId)} 尝试逃跑 (${(e.data.escapeRate * 100).toFixed(0)}%): ${e.data.success ? '成功！' : '失败'}`);
  });

  events.on('defend-activated', e => {
    log.push(`  🛡️  ${name(e.data.fighterId)} 防御 (DEF: ${e.data.defBefore.toFixed(1)} → ${e.data.defAfter.toFixed(1)})`);
  });

  events.on('buff-applied', e => {
    const d = e.data;
    if (d.whipPermanent) {
      log.push(`  🐴 ${name(d.fighterId)} 使用马鞭 (AGI→${d.agiAfter}, 逃跑率→${((d.escapeRateAfter ?? 0) * 100).toFixed(0)}%)`);
    } else if (d.effectApplied) {
      const buffName = d.effectApplied.type === 'shield-wall' ? '顶盾' :
                        d.effectApplied.type === 'counter-shock' ? '反震' : d.effectApplied.type;
      log.push(`  ✨ ${name(d.fighterId)} 激活【${buffName}】(${d.effectApplied.remainingRounds}回合)`);
    }
  });

  events.on('hp-cost-paid', e => {
    log.push(`     ${name(e.data.fighterId)} 支付HP代价: -${e.data.hpCost} (剩余HP: ${e.data.hpAfter.toFixed(1)})`);
  });

  events.on('status-effect-expired', e => {
    log.push(`  ⏰ ${name(e.data.fighterId)} 效果结束: ${e.data.effectType}`);
  });

  events.on('fighter-died', e => {
    log.push(`  💀 ${name(e.data.fighterId)} 阵亡！(击杀者: ${name(e.data.killedBy)})`);
  });

  events.on('round-end', e => {
    log.push(`\n  📊 回合结束状态:`);
    for (const f of e.data.fighters) {
      const status = f.alive ? `HP=${f.hp.toFixed(1)} MP=${f.mp} RAGE=${f.rage.toFixed(0)}` : '已阵亡';
      log.push(`     ${name(f.id)}: ${status}`);
    }
  });

  events.on('battle-end', e => {
    log.push(`\n${'═'.repeat(40)}`);
    if (e.data.winner === 'draw') {
      log.push(`  🏁 结果: 平局！(${e.data.rounds}回合)`);
    } else {
      log.push(`  🏆 ${name(e.data.winner!)} 获胜！(${e.data.rounds}回合)`);
    }
    log.push(`${'═'.repeat(40)}`);
  });

  return log;
}

function parseAction(actionStr: string, fighterId: string, enemyId: string): ChosenAction {
  actionStr = actionStr.trim().toLowerCase();

  if (actionStr === 'attack' || actionStr === 'a') {
    return { type: 'basic-attack', targetIds: [enemyId] };
  }
  if (actionStr === 'defend' || actionStr === 'd') {
    return { type: 'defend' };
  }
  if (actionStr === 'escape' || actionStr === 'e') {
    return { type: 'escape' };
  }
  if (actionStr.startsWith('skill:') || actionStr.startsWith('s:')) {
    const skillId = actionStr.replace(/^(skill:|s:)/, '');
    const skill = getSkill(skillId);
    if (skill.targetMode === 'self') {
      return { type: 'skill', skillId };
    } else if (skill.targetMode === 'all-enemies') {
      return { type: 'skill', skillId, targetIds: [enemyId] };
    } else {
      return { type: 'skill', skillId, targetIds: [enemyId] };
    }
  }

  throw new Error(`Unknown action: ${actionStr}`);
}

function showAvailableActions(battle: BattleManager, fighterId: string): void {
  const actions = battle.getAvailableActions(fighterId as any);
  const fighter = battle.getFighter(fighterId as any);
  console.log(`\n${fighter.displayName} 可用行动:`);
  console.log(`  attack          — 普通攻击 (ATK ${fighter.baseAtk})`);
  console.log(`  defend          — 防御`);
  console.log(`  escape          — 逃跑`);

  for (const a of actions) {
    if (a.type !== 'skill') continue;
    const skill = getSkill(a.skillId!);
    const costStr = `${skill.cost.amount}${skill.cost.resource.toUpperCase()}`;
    const dmgStr = skill.baseDamage > 0 ? ` 伤害:${skill.baseDamage}` : '';
    const condStr = skill.condition !== 'none' ? ` [${skill.condition}${skill.conditionMultiplier ? `×${skill.conditionMultiplier}` : ''}]` : '';
    const status = a.affordable ? '' : ` ⛔ ${a.reason}`;
    console.log(`  skill:${skill.id.padEnd(25)} — ${skill.name} (${costStr}${dmgStr}${condStr})${status}`);
  }
}

// --- Main ---
const [cmd, ...args] = process.argv.slice(2);

switch (cmd) {
  case 'init': {
    const [c1, c2] = args as CharacterClass[];
    if (!c1 || !c2) {
      console.log('Usage: init <class1> <class2>');
      console.log('Classes: knight, armored-warrior, archer');
      process.exit(1);
    }
    const battle = createBattle(c1, c2);
    const log = registerEvents(battle);

    battle.start();
    battle.advancePhase(); // → round-start

    console.log(log.join('\n'));

    const f1 = battle.getState().fighters[0];
    const f2 = battle.getState().fighters[1];
    showAvailableActions(battle, f1.id);
    showAvailableActions(battle, f2.id);

    saveState(battle);
    console.log('\n✅ 战斗已创建，等待双方行动指令');
    break;
  }

  case 'show': {
    const battle = loadBattle();
    const state = battle.getState();
    console.log(`\n当前: 第 ${state.round} 回合 (${state.phase})`);
    for (const f of state.fighters) {
      const status = f.alive ? `HP=${f.hp.toFixed(1)}/${f.maxHp} MP=${f.mp} RAGE=${f.rage.toFixed(0)} AGI=${f.currentAgi} DEF=${f.currentDef}` : '已阵亡';
      console.log(`  ${f.displayName} (${f.id}): ${status}`);
    }
    showAvailableActions(battle, state.fighters[0].id);
    showAvailableActions(battle, state.fighters[1].id);
    break;
  }

  case 'act': {
    const [a1, a2] = args;
    if (!a1 || !a2) {
      console.log('Usage: act <action1> <action2>');
      process.exit(1);
    }

    const battle = loadBattle();
    const log = registerEvents(battle);
    const state = battle.getState();
    const f1 = state.fighters[0];
    const f2 = state.fighters[1];

    // Parse actions
    const action1 = parseAction(a1, f1.id, f2.id);
    const action2 = parseAction(a2, f2.id, f1.id);

    // Submit both actions
    battle.submitPlayerAction(f1.id as any, action1);
    battle.submitPlayerAction(f2.id as any, action2);

    // Advance through: action-select → resolve → status → death → round-end
    while (state.phase !== 'round-end' && state.phase !== 'battle-end') {
      battle.advancePhase();
    }

    // Print results
    console.log(log.join('\n'));

    if (state.phase !== 'battle-end') {
      // Start next round (tick effects, passives)
      battle.advancePhase(); // → round-start of next round
      const nextLog: string[] = [];
      // Re-register for the round-start print
      const nextState = battle.getState();
      console.log(`\n${'─'.repeat(40)}`);
      console.log(`📍 第 ${nextState.round} 回合准备`);
      for (const f of nextState.fighters) {
        if (!f.alive) continue;
        const effs = f.statusEffects.map(s => s.type).join(', ') || '无';
        console.log(`  ${f.displayName}: HP=${f.hp.toFixed(1)}/${f.maxHp} MP=${f.mp} RAGE=${f.rage.toFixed(0)} AGI=${f.currentAgi} DEF=${f.currentDef} [${effs}]`);
      }
      showAvailableActions(battle, f1.id);
      showAvailableActions(battle, f2.id);
    }

    saveState(battle);
    break;
  }

  default:
    console.log('Commands: init, show, act');
    console.log('  init <class1> <class2>    — 创建新战斗');
    console.log('  show                      — 查看当前状态');
    console.log('  act <action1> <action2>   — 双方行动');
}
