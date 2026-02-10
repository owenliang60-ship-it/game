import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { SkillButton } from './SkillButton';
import { Button } from './Button';
import { TargetSelector } from './TargetSelector';
import { SkillTooltip } from './SkillTooltip';
import { drawRPGPanel } from './RPGPanel';
import { skillTooltipData, baseActionTooltipData } from './tooltipData';
import type { AvailableAction, CharacterId, ChosenAction, Fighter } from '@/core/types';
import { getSkill } from '@/skills';

const PANEL_HEIGHT = 155;
const PANEL_WIDTH = 660;

/**
 * PixiJS-native action panel: skill selection + target selection.
 * Fixed at the bottom-left of the battle scene.
 */
export class ActionPanel extends Container {
  private bg: Graphics;
  private skillButtons: SkillButton[] = [];
  private baseButtons: Button[] = [];
  private buttonContainer: Container;
  private targetSelector: TargetSelector;
  private tooltip: SkillTooltip;
  private resolveAction: ((action: ChosenAction) => void) | null = null;
  private positionMap = new Map<CharacterId, { x: number; y: number }>();
  private spriteContainers = new Map<CharacterId, Container>();

  // Status bar elements
  private statusContainer: Container;

  // AI waiting text
  private aiWaitText: Text;

  // Turn indicator dot
  private turnIndicator: Graphics;

  constructor() {
    super();

    // RPG Panel background
    this.bg = new Graphics();
    drawRPGPanel(this.bg, {
      width: PANEL_WIDTH, height: PANEL_HEIGHT, radius: 0,
      fillColor: 0xF0EBE0, fillAlpha: 0.94,
      shadow: false, innerFrame: true, cornerDots: false,
    });
    this.addChild(this.bg);

    // Status bar at top of panel with separator line below
    this.statusContainer = new Container();
    this.statusContainer.position.set(0, 8);
    this.addChild(this.statusContainer);

    // Status separator line
    const statusLine = new Graphics();
    statusLine.rect(10, 28, PANEL_WIDTH - 20, 1);
    statusLine.fill({ color: 0xD4C8B0, alpha: 0.4 });
    this.addChild(statusLine);

    // Button area
    this.buttonContainer = new Container();
    this.buttonContainer.position.set(0, 35);
    this.addChild(this.buttonContainer);

    // Target selector (managed externally, rendered above the panel)
    this.targetSelector = new TargetSelector();
    this.targetSelector.visible = false;

    // Tooltip (rendered above the panel via negative Y)
    this.tooltip = new SkillTooltip();
    this.addChild(this.tooltip);

    // AI waiting text
    this.aiWaitText = new Text({
      text: 'AI 行动中...',
      style: new TextStyle({
        fontFamily: 'zpix, "VT323", monospace',
        fontSize: 16,
        fill: 0x787068,
      }),
    });
    this.aiWaitText.anchor.set(0.5, 0.5);
    this.aiWaitText.position.set(PANEL_WIDTH / 2, PANEL_HEIGHT / 2);
    this.aiWaitText.visible = false;
    this.addChild(this.aiWaitText);

    // Turn indicator (pulsing gold dot, top-left)
    this.turnIndicator = new Graphics();
    this.turnIndicator.circle(8, 8, 3);
    this.turnIndicator.fill({ color: 0xD4A010, alpha: 0.8 });
    this.turnIndicator.visible = false;
    this.addChild(this.turnIndicator);
  }

  /** Get the target selector to add to the scene container */
  getTargetSelector(): TargetSelector {
    return this.targetSelector;
  }

  /** Show AI waiting state */
  showAiWaiting(): void {
    this.buttonContainer.visible = false;
    this.statusContainer.visible = false;
    this.aiWaitText.visible = true;
    this.turnIndicator.visible = false;
    this.tooltip.hideTooltip();
    this.visible = true;
  }

  /** Hide AI waiting state */
  hideAiWaiting(): void {
    this.aiWaitText.visible = false;
  }

  /**
   * Show the panel and wait for a player action.
   */
  async promptAction(
    player: Readonly<Fighter>,
    availableActions: AvailableAction[],
    enemies: Readonly<Fighter>[],
    positions?: Map<CharacterId, { x: number; y: number }>,
    sprites?: Map<CharacterId, Container>,
  ): Promise<ChosenAction> {
    if (positions) this.positionMap = positions;
    if (sprites) this.spriteContainers = sprites;

    this.aiWaitText.visible = false;
    this.buttonContainer.visible = true;
    this.statusContainer.visible = true;
    this.turnIndicator.visible = true;

    this.buildButtons(player, availableActions, enemies);
    this.buildStatusBar(player);
    this.visible = true;

    return new Promise<ChosenAction>((resolve) => {
      this.resolveAction = resolve;
    });
  }

  private buildStatusBar(player: Readonly<Fighter>): void {
    this.statusContainer.removeChildren();

    const stats = [
      { label: 'HP', value: `${Math.round(player.hp)}/${player.maxHp}`, color: 0xCC3333, dotColor: 0xCC3333 },
      { label: 'MP', value: `${player.mp}/${player.maxMp}`, color: 0x4488CC, dotColor: 0x4488CC },
      { label: 'RAGE', value: `${Math.round(player.rage)}/100`, color: 0xFF6600, dotColor: 0xFF6600 },
      { label: 'AGI', value: `${player.currentAgi}`, color: 0x88CC88, dotColor: 0x88CC88 },
      { label: 'DEF', value: `${player.currentDef}`, color: 0xCCAA44, dotColor: 0xCCAA44 },
    ];

    let xPos = 15;
    for (const stat of stats) {
      // Color marker dot (3x3)
      const dot = new Graphics();
      dot.rect(xPos, 4, 3, 3);
      dot.fill({ color: stat.dotColor, alpha: 0.7 });
      this.statusContainer.addChild(dot);

      const labelStyle = new TextStyle({
        fontFamily: 'zpix, monospace',
        fontSize: 13,
        fill: 0x787068,
      });
      const labelText = new Text({ text: stat.label, style: labelStyle });
      labelText.position.set(xPos + 6, 0);
      this.statusContainer.addChild(labelText);

      const valueStyle = new TextStyle({
        fontFamily: '"VT323", monospace',
        fontSize: 13,
        fill: stat.color,
        fontWeight: 'bold',
      });
      const valueText = new Text({ text: stat.value, style: valueStyle });
      valueText.position.set(xPos + 38, 0);
      this.statusContainer.addChild(valueText);

      xPos += 115;
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

    // Section titles
    const baseTitleStyle = new TextStyle({
      fontFamily: 'zpix, monospace',
      fontSize: 10,
      fill: 0x9A8A70,
    });
    const baseTitle = new Text({ text: '基础', style: baseTitleStyle });
    baseTitle.position.set(15, -6);
    this.buttonContainer.addChild(baseTitle);
    // Underline
    const baseUnderline = new Graphics();
    baseUnderline.rect(15, 6, 60, 1);
    baseUnderline.fill({ color: 0xD4C8B0, alpha: 0.4 });
    this.buttonContainer.addChild(baseUnderline);

    const skillTitleStyle = new TextStyle({
      fontFamily: 'zpix, monospace',
      fontSize: 10,
      fill: 0x9A8A70,
    });
    const skillTitle = new Text({ text: '技能', style: skillTitleStyle });
    skillTitle.position.set(125, -6);
    this.buttonContainer.addChild(skillTitle);
    const skillUnderline = new Graphics();
    skillUnderline.rect(125, 6, 60, 1);
    skillUnderline.fill({ color: 0xD4C8B0, alpha: 0.4 });
    this.buttonContainer.addChild(skillUnderline);

    // Vertical divider between base and skill sections
    const divider = new Graphics();
    divider.rect(110, -6, 1, 110);
    divider.fill({ color: 0xD4C8B0, alpha: 0.3 });
    // Top diamond
    divider.moveTo(110.5, -8);
    divider.lineTo(113, -5.5);
    divider.lineTo(110.5, -3);
    divider.lineTo(108, -5.5);
    divider.closePath();
    divider.fill({ color: 0xC8A050, alpha: 0.4 });
    // Bottom diamond
    divider.moveTo(110.5, 104);
    divider.lineTo(113, 106.5);
    divider.lineTo(110.5, 109);
    divider.lineTo(108, 106.5);
    divider.closePath();
    divider.fill({ color: 0xC8A050, alpha: 0.4 });
    this.buttonContainer.addChild(divider);

    // Base actions (left column)
    const baseActions = actions.filter(a => a.type !== 'skill');
    let y = 12;
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

      // Tooltip on hover
      const actionType = action.type;
      btn.on('pointerover', () => {
        const data = baseActionTooltipData(actionType);
        // Button position in panel coords: buttonContainer offset + btn position
        const bx = btn.position.x + 45; // center of button
        const by = this.buttonContainer.position.y + btn.position.y; // top of button
        this.tooltip.showAt(bx, by, data);
      });
      btn.on('pointerout', () => this.tooltip.hideTooltip());

      this.buttonContainer.addChild(btn);
      this.baseButtons.push(btn);
      y += 36;
    }

    // Skill buttons (grid to the right)
    const skillActions = actions.filter(a => a.type === 'skill');
    const cols = 4;
    const btnW = 120;
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
        resourceType: skill.cost.resource as 'mp' | 'hp' | 'rage',
      });

      const col = i % cols;
      const row = Math.floor(i / cols);
      btn.position.set(startX + col * (btnW + gapX), 12 + row * (btnH + gapY));

      if (action.affordable) {
        btn.on('pointertap', () => this.onSkillAction(action, skill, player, enemies));
      }

      // Tooltip on hover (for all skills, even unaffordable)
      const skillRef = skill;
      btn.on('pointerover', () => {
        const data = skillTooltipData(skillRef);
        const bx = btn.position.x + btnW / 2;
        const by = this.buttonContainer.position.y + btn.position.y;
        this.tooltip.showAt(bx, by, data);
      });
      btn.on('pointerout', () => this.tooltip.hideTooltip());

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
    const targets = enemies.map(e => {
      const pos = this.positionMap.get(e.id);
      return {
        id: e.id,
        name: e.displayName,
        hp: e.hp,
        maxHp: e.maxHp,
        x: pos?.x ?? 480,
        y: pos?.y ?? 200,
      };
    });

    return this.targetSelector.show(targets, maxTargets, this.spriteContainers);
  }

  private submitAction(action: ChosenAction): void {
    this.targetSelector.hide();
    this.tooltip.hideTooltip();
    this.buttonContainer.visible = false;
    this.statusContainer.visible = false;
    this.turnIndicator.visible = false;
    this.showAiWaiting();
    this.resolveAction?.(action);
    this.resolveAction = null;
  }

  hide(): void {
    this.visible = false;
    this.targetSelector.hide();
    this.tooltip.hideTooltip();
  }
}
