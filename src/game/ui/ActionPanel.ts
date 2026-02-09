import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { SkillButton } from './SkillButton';
import { Button } from './Button';
import { TargetSelector } from './TargetSelector';
import { TweenManager } from '../animation/TweenManager';
import { Easing } from '../animation/Easing';
import type { AvailableAction, CharacterId, ChosenAction, Fighter } from '@/core/types';
import { getSkill } from '@/skills';

const PANEL_Y_HIDDEN = 540;
const PANEL_Y_VISIBLE = 385;
const PANEL_HEIGHT = 155;

/**
 * PixiJS-native action panel: skill selection + target selection.
 * Slides in from the bottom when it's the player's turn.
 */
export class ActionPanel extends Container {
  private bg: Graphics;
  private skillButtons: SkillButton[] = [];
  private baseButtons: Button[] = [];
  private buttonContainer: Container;
  private targetSelector: TargetSelector;
  private resolveAction: ((action: ChosenAction) => void) | null = null;
  private currentSkillId: string | null = null;

  // Status bar elements
  private statusContainer: Container;

  constructor() {
    super();
    this.position.y = PANEL_Y_HIDDEN;

    // Background
    this.bg = new Graphics();
    this.bg.rect(0, 0, 960, PANEL_HEIGHT);
    this.bg.fill({ color: 0x0e0820, alpha: 0.92 });
    this.bg.rect(0, 0, 960, 2);
    this.bg.fill(0xc8a050);
    this.addChild(this.bg);

    // Status bar at top of panel
    this.statusContainer = new Container();
    this.statusContainer.position.set(0, 8);
    this.addChild(this.statusContainer);

    // Button area
    this.buttonContainer = new Container();
    this.buttonContainer.position.set(0, 35);
    this.addChild(this.buttonContainer);

    // Target selector (managed externally, rendered above the panel)
    this.targetSelector = new TargetSelector();
    this.targetSelector.visible = false;
  }

  /** Get the target selector to add to the scene container */
  getTargetSelector(): TargetSelector {
    return this.targetSelector;
  }

  /**
   * Show the panel and wait for a player action.
   */
  async promptAction(
    player: Readonly<Fighter>,
    availableActions: AvailableAction[],
    enemies: Readonly<Fighter>[],
  ): Promise<ChosenAction> {
    this.buildButtons(player, availableActions, enemies);
    this.buildStatusBar(player);
    await this.slideIn();

    return new Promise<ChosenAction>((resolve) => {
      this.resolveAction = resolve;
    });
  }

  private buildStatusBar(player: Readonly<Fighter>): void {
    this.statusContainer.removeChildren();

    const stats = [
      { label: 'HP', value: `${Math.round(player.hp)}/${player.maxHp}`, color: 0xCC3333 },
      { label: 'MP', value: `${player.mp}/${player.maxMp}`, color: 0x4488CC },
      { label: 'RAGE', value: `${Math.round(player.rage)}/100`, color: 0xFF6600 },
      { label: 'AGI', value: `${player.currentAgi}`, color: 0x88CC88 },
      { label: 'DEF', value: `${player.currentDef}`, color: 0xCCAA44 },
    ];

    let xPos = 20;
    for (const stat of stats) {
      const labelStyle = new TextStyle({
        fontFamily: '"Microsoft YaHei", monospace',
        fontSize: 11,
        fill: 0x999999,
      });
      const labelText = new Text({ text: stat.label, style: labelStyle });
      labelText.position.set(xPos, 0);
      this.statusContainer.addChild(labelText);

      const valueStyle = new TextStyle({
        fontFamily: '"Microsoft YaHei", monospace',
        fontSize: 11,
        fill: stat.color,
        fontWeight: 'bold',
      });
      const valueText = new Text({ text: stat.value, style: valueStyle });
      valueText.position.set(xPos + 35, 0);
      this.statusContainer.addChild(valueText);

      xPos += 100;
    }
  }

  private buildButtons(
    player: Readonly<Fighter>,
    actions: AvailableAction[],
    enemies: Readonly<Fighter>[],
  ): void {
    this.buttonContainer.removeChildren();
    this.skillButtons = [];
    this.baseButtons = [];

    // Base actions (left column)
    const baseActions = actions.filter(a => a.type !== 'skill');
    let y = 0;
    for (const action of baseActions) {
      let label = '';
      switch (action.type) {
        case 'basic-attack': label = '普通攻击'; break;
        case 'defend': label = '防御'; break;
        case 'escape': label = '逃跑'; break;
      }

      const btn = new Button({
        text: label,
        width: 90,
        height: 32,
        fontSize: 12,
      });
      btn.position.set(15, y);
      btn.on('pointertap', () => this.onBaseAction(action, player, enemies));
      this.buttonContainer.addChild(btn);
      this.baseButtons.push(btn);
      y += 36;
    }

    // Skill buttons (grid to the right)
    const skillActions = actions.filter(a => a.type === 'skill');
    const cols = 4;
    const btnW = 140;
    const btnH = 40;
    const gapX = 6;
    const gapY = 6;
    const startX = 125;

    for (let i = 0; i < skillActions.length; i++) {
      const action = skillActions[i];
      const skill = getSkill(action.skillId!);
      const costStr = `${skill.cost.amount} ${skill.cost.resource.toUpperCase()}`;

      const btn = new SkillButton({
        name: skill.name,
        costLabel: costStr,
        affordable: action.affordable,
        reason: action.reason,
        width: btnW,
        height: btnH,
      });

      const col = i % cols;
      const row = Math.floor(i / cols);
      btn.position.set(startX + col * (btnW + gapX), row * (btnH + gapY));

      if (action.affordable) {
        btn.on('pointertap', () => this.onSkillAction(action, skill, player, enemies));
      }

      this.buttonContainer.addChild(btn);
      this.skillButtons.push(btn);
    }
  }

  private onBaseAction(
    action: AvailableAction,
    player: Readonly<Fighter>,
    enemies: Readonly<Fighter>[],
  ): void {
    if (action.type === 'defend') {
      this.submitAction({ type: 'defend' });
    } else if (action.type === 'escape') {
      this.submitAction({ type: 'escape' });
    } else if (action.type === 'basic-attack') {
      this.pickTargets(enemies, 1).then(ids => {
        if (ids.length > 0) {
          this.submitAction({ type: 'basic-attack', targetIds: ids });
        }
      });
    }
  }

  private onSkillAction(
    action: AvailableAction,
    skill: any,
    player: Readonly<Fighter>,
    enemies: Readonly<Fighter>[],
  ): void {
    const skillId = action.skillId!;

    if (skill.targetMode === 'self') {
      this.submitAction({ type: 'skill', skillId });
    } else if (skill.targetMode === 'all-enemies') {
      this.submitAction({
        type: 'skill',
        skillId,
        targetIds: enemies.map(e => e.id),
      });
    } else {
      const maxTargets = skill.targetMode === 'multi-enemy' ? (skill.maxTargets ?? 1) : 1;
      this.pickTargets(enemies, maxTargets).then(ids => {
        if (ids.length > 0) {
          this.submitAction({ type: 'skill', skillId, targetIds: ids });
        }
      });
    }
  }

  private async pickTargets(enemies: Readonly<Fighter>[], maxTargets: number): Promise<CharacterId[]> {
    const targets = enemies.map(e => ({
      id: e.id,
      name: e.displayName,
      hp: e.hp,
      maxHp: e.maxHp,
      x: 0, // Will be set from sprite positions
      y: 0,
    }));

    // Use target selector (positions are relative to scene, not panel)
    return this.targetSelector.show(targets, maxTargets);
  }

  private async submitAction(action: ChosenAction): Promise<void> {
    this.targetSelector.hide();
    await this.slideOut();
    this.resolveAction?.(action);
    this.resolveAction = null;
  }

  private async slideIn(): Promise<void> {
    this.visible = true;
    await TweenManager.add({
      target: this.position,
      props: { y: PANEL_Y_VISIBLE },
      duration: 250,
      easing: Easing.easeOutCubic,
    });
  }

  private async slideOut(): Promise<void> {
    await TweenManager.add({
      target: this.position,
      props: { y: PANEL_Y_HIDDEN },
      duration: 200,
      easing: Easing.easeInQuad,
    });
    this.visible = false;
  }

  hide(): void {
    this.visible = false;
    this.position.y = PANEL_Y_HIDDEN;
    this.targetSelector.hide();
  }
}
