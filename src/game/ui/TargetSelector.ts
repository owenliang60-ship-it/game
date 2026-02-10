import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { CharacterId } from '@/core/types';

interface TargetInfo {
  id: CharacterId;
  name: string;
  hp: number;
  maxHp: number;
  x: number;
  y: number;
}

interface SpriteState {
  originalEventMode: string;
  originalCursor: string;
  originalScaleX: number;
  originalScaleY: number;
  indicator: Graphics;
}

/**
 * Target selection via clicking on character sprites.
 * Shows pulsing gold ellipses below selectable targets.
 * Hover brightens the indicator and slightly scales up the sprite.
 */
export class TargetSelector extends Container {
  private resolveTarget: ((ids: CharacterId[]) => void) | null = null;
  private selectedTargets: CharacterId[] = [];
  private maxTargets: number = 1;
  private promptText: Text;
  private spriteStates = new Map<CharacterId, SpriteState>();
  private spriteRefs = new Map<CharacterId, Container>();
  private indicatorPhase = 0;
  private animating = false;

  constructor() {
    super();

    const style = new TextStyle({
      fontFamily: '"VT323", "Microsoft YaHei", sans-serif',
      fontSize: 14,
      fill: 0xB08000,
    });
    this.promptText = new Text({ text: '点击目标角色', style });
    this.promptText.anchor.set(0.5, 0);
    this.promptText.position.set(480, 360);
    this.addChild(this.promptText);
  }

  /**
   * Show targets and wait for player selection.
   * Now accepts sprite containers for direct click interaction.
   */
  show(
    targets: TargetInfo[],
    maxTargets: number,
    spriteContainers?: Map<CharacterId, Container>,
  ): Promise<CharacterId[]> {
    this.cleanup();
    this.visible = true;
    this.maxTargets = maxTargets;
    this.selectedTargets = [];

    if (maxTargets > 1) {
      this.promptText.text = `点击目标角色 (${this.selectedTargets.length}/${maxTargets})`;
    } else {
      this.promptText.text = '点击目标角色';
    }

    return new Promise<CharacterId[]>((resolve) => {
      this.resolveTarget = resolve;

      for (const t of targets) {
        const spriteContainer = spriteContainers?.get(t.id);

        // Draw pulsing indicator ellipse below the sprite position
        const indicator = new Graphics();
        this.drawIndicator(indicator, t.x, t.y + 30, 0xC8B898, 0.5);
        this.addChild(indicator);

        if (spriteContainer) {
          // Store original state and reference
          const state: SpriteState = {
            originalEventMode: spriteContainer.eventMode ?? 'auto',
            originalCursor: spriteContainer.cursor ?? 'default',
            originalScaleX: spriteContainer.scale.x,
            originalScaleY: spriteContainer.scale.y,
            indicator,
          };
          this.spriteStates.set(t.id, state);
          this.spriteRefs.set(t.id, spriteContainer);

          // Make sprite interactive
          spriteContainer.eventMode = 'static';
          spriteContainer.cursor = 'pointer';

          spriteContainer.on('pointerover', () => this.onSpriteHover(t.id, spriteContainer, t.x, t.y));
          spriteContainer.on('pointerout', () => this.onSpriteOut(t.id, spriteContainer, t.x, t.y));
          spriteContainer.on('pointertap', () => this.onSpriteClick(t.id, t.x, t.y));
        } else {
          // Fallback: make indicator clickable
          const state: SpriteState = {
            originalEventMode: 'auto',
            originalCursor: 'default',
            originalScaleX: 1,
            originalScaleY: 1,
            indicator,
          };
          this.spriteStates.set(t.id, state);

          indicator.eventMode = 'static';
          indicator.cursor = 'pointer';
          indicator.on('pointertap', () => this.onSpriteClick(t.id, t.x, t.y));
          indicator.on('pointerover', () => {
            this.drawIndicator(indicator, t.x, t.y + 30, 0xD4A010, 0.8);
          });
          indicator.on('pointerout', () => {
            if (!this.selectedTargets.includes(t.id)) {
              this.drawIndicator(indicator, t.x, t.y + 30, 0xC8B898, 0.5);
            }
          });
        }
      }

      // Start pulsing animation
      this.animating = true;
      this.startPulse();
    });
  }

  private onSpriteHover(id: CharacterId, sprite: Container, x: number, y: number): void {
    if (this.selectedTargets.includes(id)) return;
    const state = this.spriteStates.get(id);
    if (!state) return;

    // Brighten indicator
    this.drawIndicator(state.indicator, x, y + 30, 0xD4A010, 0.8);

    // Scale up sprite slightly
    sprite.scale.set(state.originalScaleX * 1.05, state.originalScaleY * 1.05);
  }

  private onSpriteOut(id: CharacterId, sprite: Container, x: number, y: number): void {
    if (this.selectedTargets.includes(id)) return;
    const state = this.spriteStates.get(id);
    if (!state) return;

    // Reset indicator
    this.drawIndicator(state.indicator, x, y + 30, 0xC8B898, 0.5);

    // Reset scale
    sprite.scale.set(state.originalScaleX, state.originalScaleY);
  }

  private onSpriteClick(id: CharacterId, x: number, y: number): void {
    if (this.selectedTargets.includes(id)) return;

    this.selectedTargets.push(id);
    const state = this.spriteStates.get(id);
    if (state) {
      this.drawIndicator(state.indicator, x, y + 30, 0xD4A010, 1.0);
    }

    if (this.maxTargets > 1) {
      this.promptText.text = `点击目标角色 (${this.selectedTargets.length}/${this.maxTargets})`;
    }

    if (this.selectedTargets.length >= this.maxTargets) {
      this.confirm();
    }
  }

  private confirm(): void {
    const ids = [...this.selectedTargets];
    this.hide();
    this.resolveTarget?.(ids);
    this.resolveTarget = null;
  }

  hide(): void {
    this.visible = false;
    this.animating = false;
    this.restoreSprites();
    this.cleanup();
  }

  cancel(): void {
    this.hide();
    this.resolveTarget?.([]);
    this.resolveTarget = null;
  }

  private restoreSprites(): void {
    for (const [id, state] of this.spriteStates) {
      const sprite = this.spriteRefs.get(id);
      if (sprite) {
        sprite.eventMode = state.originalEventMode as any;
        sprite.cursor = state.originalCursor;
        sprite.scale.set(state.originalScaleX, state.originalScaleY);
        sprite.removeAllListeners('pointerover');
        sprite.removeAllListeners('pointerout');
        sprite.removeAllListeners('pointertap');
      }
    }
    this.spriteRefs.clear();
  }

  private cleanup(): void {
    // Remove indicators
    for (const state of this.spriteStates.values()) {
      if (state.indicator.parent) {
        state.indicator.parent.removeChild(state.indicator);
      }
      state.indicator.destroy();
    }
    this.spriteStates.clear();
    this.selectedTargets = [];
  }

  private drawIndicator(g: Graphics, cx: number, cy: number, color: number, alpha: number): void {
    g.clear();
    // Ellipse below the sprite
    g.ellipse(cx, cy, 30, 10);
    g.stroke({ color, width: 2, alpha });
    g.ellipse(cx, cy, 28, 8);
    g.fill({ color, alpha: alpha * 0.15 });

    // Invisible hit area for fallback click mode
    g.rect(cx - 40, cy - 50, 80, 60);
    g.fill({ color: 0xffffff, alpha: 0.01 });
  }

  private startPulse(): void {
    if (!this.animating) return;

    this.indicatorPhase += 0.05;
    const pulseAlpha = 0.4 + Math.sin(this.indicatorPhase) * 0.15;

    for (const [id, state] of this.spriteStates) {
      if (!this.selectedTargets.includes(id)) {
        state.indicator.alpha = pulseAlpha;
      }
    }

    requestAnimationFrame(() => this.startPulse());
  }
}
