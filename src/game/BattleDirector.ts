import type { BattleManager } from '@/core/BattleManager';
import type { ActionLogEntry, CharacterId, DamageResult } from '@/core/types';
import type { BattleScene } from './scenes/BattleScene';
import type { ActionPanel } from './ui/ActionPanel';
import { EffectsManager } from './effects/EffectsManager';
import type { DamageType } from './effects/DamageNumber';
import { getSkill } from '@/skills';

/** Delay helper */
const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

/**
 * BattleDirector: async/await choreography engine.
 * Drives BattleManager phases and orchestrates visual sequences with effects.
 */
export class BattleDirector {
  private battle: BattleManager;
  private scene: BattleScene;
  private actionPanel: ActionPanel;
  private effects: EffectsManager;
  private stopped = false;

  constructor(battle: BattleManager, scene: BattleScene, actionPanel: ActionPanel, effects: EffectsManager) {
    this.battle = battle;
    this.scene = scene;
    this.actionPanel = actionPanel;
    this.effects = effects;
  }

  async run(): Promise<void> {
    this.stopped = false;
    this.battle.start();
    await wait(400);

    while (!this.stopped) {
      const state = this.battle.getState();
      if (state.phase === 'battle-end') break;

      await this.playRound();
    }
  }

  stop(): void {
    this.stopped = true;
  }

  private async playRound(): Promise<void> {
    this.battle.advancePhase(); // → round-start
    await wait(300);

    // Player action selection
    const player = this.battle.getPlayerFighter();
    if (player) {
      const available = this.battle.getAvailableActions(player.id);
      const enemies = this.battle.getAliveFighters().filter(f => f.id !== player.id);
      const action = await this.actionPanel.promptAction(player, available, enemies);
      this.battle.submitPlayerAction(player.id, action);
    }

    this.battle.advancePhase(); // → action-select
    await wait(100);

    this.battle.advancePhase(); // → action-resolve

    // Animate each action in order
    const actionLog = this.battle.getState().actionLog;
    const currentRound = this.battle.getState().round;
    const roundActions = actionLog.filter(a => a.round === currentRound);

    for (const action of roundActions) {
      if (this.stopped) return;
      await this.playAction(action);
    }

    this.battle.advancePhase(); // → status-update
    await wait(200);

    this.battle.advancePhase(); // → death-check

    if (this.battle.getState().phase === 'battle-end') {
      await this.playBattleEnd();
      return;
    }

    this.battle.advancePhase(); // → round-end
    await wait(400);
  }

  private async playAction(action: ActionLogEntry): Promise<void> {
    const actorEntry = this.scene.getSpriteEntry(action.actorId);
    if (!actorEntry) return;

    const actorSprite = actorEntry.sprite;

    switch (action.action.type) {
      case 'basic-attack':
      case 'skill': {
        await wait(100);

        const firstTargetId = action.action.targetIds?.[0];
        const skillId = action.action.skillId;
        const isMelee = action.action.type === 'basic-attack' || this.isSkillMelee(skillId);
        const isRanged = !isMelee && skillId ? this.isSkillRanged(skillId) : false;

        // Skill-specific pre-effects
        const isCharge = skillId === 'knight-charge' || skillId === 'warrior-charge';
        const isArrowRain = skillId === 'archer-arrow-rain';
        const isShieldWall = skillId === 'warrior-shield-wall';
        const isCounterShock = skillId === 'warrior-counter-shock';
        const isWhip = skillId === 'knight-whip';

        // Arrow Rain: full-screen effect
        if (isArrowRain) {
          await this.effects.showArrowRain();
        }

        // Shield Wall / Counter Shock: buff effects
        if (isShieldWall) {
          this.effects.showShieldWallGlow(actorEntry.baseX, actorEntry.baseY);
        }
        if (isCounterShock) {
          this.effects.showCounterShock(actorEntry.baseX, actorEntry.baseY);
        }
        if (isWhip) {
          this.effects.showWhipAura(actorEntry.baseX, actorEntry.baseY);
        }

        // Charge: show afterimage trail
        if (isCharge && firstTargetId) {
          const targetEntry = this.scene.getSpriteEntry(firstTargetId);
          if (targetEntry) {
            this.effects.showChargeTrail(actorEntry.baseX, actorEntry.baseY, targetEntry.baseX, targetEntry.baseY);
          }
        }

        // Melee: lunge toward target
        if (isMelee && firstTargetId) {
          const targetEntry = this.scene.getSpriteEntry(firstTargetId);
          if (targetEntry) {
            await actorSprite.lungeToward(targetEntry.baseX, targetEntry.baseY);
          }
        }

        // Play attack animation
        actorSprite.play('attack', false, () => actorSprite.play('idle'));

        // Process each result with visual effects
        for (const result of action.results) {
          if (result.resultType === 'damage') {
            await this.playDamageResult(result, action.actorId, isMelee, isRanged);
          } else if (result.resultType === 'buff') {
            // Buff effects handled by event listeners
            await wait(200);
          }
        }

        // Return to base if lunged
        if (isMelee && firstTargetId) {
          await actorSprite.returnToBase();
        }

        await wait(200);
        break;
      }

      case 'defend': {
        actorSprite.play('defense', true);
        // Show defense overlay
        this.effects.showDefenseOverlay(actorEntry.baseX, actorEntry.baseY);
        await wait(300);
        break;
      }

      case 'escape': {
        actorSprite.play('escape', true);
        await wait(400);
        const escapeResult = action.results.find(r => r.resultType === 'escape');
        if (escapeResult && escapeResult.resultType === 'escape') {
          if (escapeResult.success) {
            await this.effects.showDamageNumber(actorEntry.baseX, actorEntry.baseY, '逃跑!', 'dodge');
          } else {
            actorSprite.play('idle');
            await this.effects.showDamageNumber(actorEntry.baseX, actorEntry.baseY, '失败', 'normal');
          }
        }
        break;
      }
    }
  }

  private async playDamageResult(
    result: DamageResult,
    attackerId: CharacterId,
    isMelee: boolean,
    isRanged: boolean,
  ): Promise<void> {
    const targetEntry = this.scene.getSpriteEntry(result.targetId);
    const attackerEntry = this.scene.getSpriteEntry(attackerId);
    if (!targetEntry) return;

    const targetSprite = targetEntry.sprite;

    if (result.dodged) {
      // Show "Miss" floating text
      await this.effects.showDamageNumber(targetEntry.baseX, targetEntry.baseY, 'Miss', 'dodge');
      return;
    }

    // Ranged: show projectile flying
    if (isRanged && attackerEntry) {
      await this.effects.showProjectile(
        attackerEntry.baseX, attackerEntry.baseY,
        targetEntry.baseX, targetEntry.baseY,
        result.isTrueDamage ? 0xFF00FF : 0xFFD700,
      );
    }

    // Melee: show slash effect
    if (isMelee) {
      // Don't await slash — play simultaneously with hit
      this.effects.showSlash(targetEntry.baseX, targetEntry.baseY);
    }

    // Hit reaction
    targetSprite.play('hit', false, () => {
      if (result.targetDied) {
        targetSprite.play('death', false);
      } else {
        targetSprite.play('idle');
      }
    });

    // Parallel: shake + flash + hit flash
    await Promise.all([
      targetSprite.shake(5, 200),
      this.effects.showHitFlash(targetEntry.baseX, targetEntry.baseY),
    ]);

    // Damage number
    const dmgType: DamageType = result.isTrueDamage ? 'true' : 'normal';
    const dmgText = result.isTrueDamage
      ? `${result.finalDamage.toFixed(0)} 真伤`
      : `-${result.finalDamage.toFixed(0)}`;

    // Show damage number (don't block on it — it floats independently)
    this.effects.showDamageNumber(targetEntry.baseX, targetEntry.baseY, dmgText, dmgType);
    await wait(150);

    // Death effect
    if (result.targetDied) {
      targetEntry.hud.setDead();
      await this.effects.showDeathEffect(targetEntry.baseX, targetEntry.baseY);
      await wait(200);
    }
  }

  private isSkillMelee(skillId?: string): boolean {
    if (!skillId) return false;
    try {
      return getSkill(skillId).type === 'melee';
    } catch {
      return false;
    }
  }

  private isSkillRanged(skillId?: string): boolean {
    if (!skillId) return false;
    try {
      return getSkill(skillId).type === 'ranged';
    } catch {
      return false;
    }
  }

  private async playBattleEnd(): Promise<void> {
    await wait(800);
    this.effects.clear();
  }
}
