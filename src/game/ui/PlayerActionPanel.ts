import type { AvailableAction, CharacterId, ChosenAction, Fighter } from '@/core/types';
import { getSkill } from '@/skills';

/**
 * Simple DOM-based player action panel for M2 testing.
 * Overlays HTML buttons on top of the game canvas.
 * Will be replaced by PixiJS UI in M3.
 */
export class PlayerActionPanel {
  private overlay: HTMLDivElement;
  private actionPanel: HTMLDivElement;
  private targetPanel: HTMLDivElement;
  private statusPanel: HTMLDivElement;
  private resolveAction: ((action: ChosenAction) => void) | null = null;

  constructor() {
    // Create overlay container
    this.overlay = document.createElement('div');
    this.overlay.id = 'player-action-overlay';
    Object.assign(this.overlay.style, {
      position: 'fixed',
      bottom: '0',
      left: '0',
      right: '0',
      zIndex: '1000',
      display: 'none',
      fontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif',
    });

    // Status bar (shows player HP/MP/RAGE)
    this.statusPanel = document.createElement('div');
    Object.assign(this.statusPanel.style, {
      background: 'rgba(20, 10, 40, 0.9)',
      borderTop: '2px solid #c8a050',
      padding: '8px 20px',
      display: 'flex',
      gap: '20px',
      justifyContent: 'center',
      fontSize: '14px',
      color: '#f5e6c8',
    });
    this.overlay.appendChild(this.statusPanel);

    // Action buttons
    this.actionPanel = document.createElement('div');
    Object.assign(this.actionPanel.style, {
      background: 'rgba(30, 15, 50, 0.95)',
      borderTop: '1px solid #5a3a7a',
      padding: '12px 20px',
      display: 'flex',
      flexWrap: 'wrap',
      gap: '8px',
      justifyContent: 'center',
    });
    this.overlay.appendChild(this.actionPanel);

    // Target selection
    this.targetPanel = document.createElement('div');
    Object.assign(this.targetPanel.style, {
      background: 'rgba(40, 20, 60, 0.95)',
      borderTop: '1px solid #5a3a7a',
      padding: '10px 20px',
      display: 'none',
      flexWrap: 'wrap',
      gap: '8px',
      justifyContent: 'center',
    });
    this.overlay.appendChild(this.targetPanel);

    document.body.appendChild(this.overlay);
  }

  /**
   * Show the action panel and wait for player to choose.
   * Returns a Promise that resolves with the chosen action.
   */
  promptAction(
    player: Readonly<Fighter>,
    availableActions: AvailableAction[],
    enemies: Readonly<Fighter>[],
  ): Promise<ChosenAction> {
    return new Promise((resolve) => {
      this.resolveAction = resolve;
      this.overlay.style.display = 'block';
      this.targetPanel.style.display = 'none';

      // Update status bar
      this.statusPanel.innerHTML = '';
      const addStat = (label: string, value: string, color: string) => {
        const span = document.createElement('span');
        span.innerHTML = `<span style="color:#999">${label}</span> <span style="color:${color};font-weight:bold">${value}</span>`;
        this.statusPanel.appendChild(span);
      };
      addStat('HP', `${Math.round(player.hp)}/${player.maxHp}`, '#cc3333');
      addStat('MP', `${player.mp}/${player.maxMp}`, '#4488cc');
      addStat('RAGE', `${Math.round(player.rage)}/100`, '#ff6600');
      addStat('AGI', `${player.currentAgi}`, '#88cc88');
      addStat('DEF', `${player.currentDef}`, '#ccaa44');

      // Build action buttons
      this.actionPanel.innerHTML = '';

      for (const action of availableActions) {
        const btn = document.createElement('button');
        const isSkill = action.type === 'skill' && action.skillId;
        let label = '';
        let tooltip = '';

        switch (action.type) {
          case 'basic-attack':
            label = '⚔️ 普通攻击';
            tooltip = `伤害: ${player.baseAtk}`;
            break;
          case 'defend':
            label = '🛡️ 防御';
            tooltip = `DEF: ${player.currentDef} → ${(player.currentDef * (1 + 0.1 * player.baseDef)).toFixed(1)}`;
            break;
          case 'escape':
            label = '🏃 逃跑';
            tooltip = player.whipUsed ? '成功率: 70%' : '成功率: 50%';
            break;
          case 'skill': {
            const skill = getSkill(action.skillId!);
            const costStr = `${skill.cost.amount}${skill.cost.resource.toUpperCase()}`;
            label = `${skill.name} (${costStr})`;
            tooltip = action.reason ?? `伤害: ${skill.baseDamage}`;
            break;
          }
        }

        Object.assign(btn.style, {
          padding: '8px 16px',
          fontSize: '14px',
          fontFamily: '"Microsoft YaHei", sans-serif',
          border: action.affordable ? '1px solid #c8a050' : '1px solid #555',
          borderRadius: '4px',
          background: action.affordable ? 'rgba(200, 160, 80, 0.2)' : 'rgba(50, 50, 50, 0.5)',
          color: action.affordable ? '#f5e6c8' : '#666',
          cursor: action.affordable ? 'pointer' : 'not-allowed',
          transition: 'all 0.15s',
        });

        btn.textContent = label;
        btn.title = tooltip;

        if (action.affordable) {
          btn.addEventListener('mouseenter', () => {
            btn.style.background = 'rgba(200, 160, 80, 0.4)';
          });
          btn.addEventListener('mouseleave', () => {
            btn.style.background = 'rgba(200, 160, 80, 0.2)';
          });

          btn.addEventListener('click', () => {
            if (action.type === 'defend') {
              this.submitAction({ type: 'defend' });
            } else if (action.type === 'escape') {
              this.submitAction({ type: 'escape' });
            } else if (action.type === 'basic-attack') {
              this.showTargetSelection(enemies, (targetId) => {
                this.submitAction({ type: 'basic-attack', targetIds: [targetId] });
              });
            } else if (action.type === 'skill' && action.skillId) {
              const skill = getSkill(action.skillId);
              if (skill.targetMode === 'self') {
                this.submitAction({ type: 'skill', skillId: action.skillId });
              } else if (skill.targetMode === 'all-enemies') {
                this.submitAction({
                  type: 'skill',
                  skillId: action.skillId,
                  targetIds: enemies.map(e => e.id),
                });
              } else {
                // single-enemy or multi-enemy: pick target(s)
                this.showTargetSelection(enemies, (targetId) => {
                  this.submitAction({
                    type: 'skill',
                    skillId: action.skillId!,
                    targetIds: [targetId],
                  });
                }, skill.targetMode === 'multi-enemy' ? skill.maxTargets : 1);
              }
            }
          });
        }

        this.actionPanel.appendChild(btn);
      }
    });
  }

  private showTargetSelection(
    enemies: Readonly<Fighter>[],
    onSelect: (targetId: CharacterId) => void,
    _maxTargets = 1,
  ): void {
    this.targetPanel.innerHTML = '<span style="color:#999;font-size:13px;margin-right:8px;">选择目标:</span>';
    this.targetPanel.style.display = 'flex';

    for (const enemy of enemies) {
      const btn = document.createElement('button');
      const hpPercent = Math.round((enemy.hp / enemy.maxHp) * 100);
      btn.textContent = `${enemy.displayName} (HP:${Math.round(enemy.hp)} ${hpPercent}%)`;

      Object.assign(btn.style, {
        padding: '6px 14px',
        fontSize: '13px',
        fontFamily: '"Microsoft YaHei", sans-serif',
        border: '1px solid #cc3333',
        borderRadius: '4px',
        background: 'rgba(200, 50, 50, 0.2)',
        color: '#ffaaaa',
        cursor: 'pointer',
        transition: 'all 0.15s',
      });

      btn.addEventListener('mouseenter', () => {
        btn.style.background = 'rgba(200, 50, 50, 0.4)';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.background = 'rgba(200, 50, 50, 0.2)';
      });

      btn.addEventListener('click', () => {
        onSelect(enemy.id);
      });

      this.targetPanel.appendChild(btn);
    }

    // Cancel button
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = '取消';
    Object.assign(cancelBtn.style, {
      padding: '6px 14px',
      fontSize: '13px',
      fontFamily: '"Microsoft YaHei", sans-serif',
      border: '1px solid #666',
      borderRadius: '4px',
      background: 'rgba(100, 100, 100, 0.3)',
      color: '#999',
      cursor: 'pointer',
    });
    cancelBtn.addEventListener('click', () => {
      this.targetPanel.style.display = 'none';
    });
    this.targetPanel.appendChild(cancelBtn);
  }

  private submitAction(action: ChosenAction): void {
    this.overlay.style.display = 'none';
    if (this.resolveAction) {
      this.resolveAction(action);
      this.resolveAction = null;
    }
  }

  hide(): void {
    this.overlay.style.display = 'none';
  }

  destroy(): void {
    this.overlay.remove();
  }
}
