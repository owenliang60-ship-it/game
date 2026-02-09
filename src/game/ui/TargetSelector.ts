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

/**
 * Visual target selection overlay.
 * Shows red brackets around selectable targets, gold on hover.
 */
export class TargetSelector extends Container {
  private markers = new Map<CharacterId, Graphics>();
  private resolveTarget: ((ids: CharacterId[]) => void) | null = null;
  private selectedTargets: CharacterId[] = [];
  private maxTargets: number = 1;
  private promptText: Text;

  constructor() {
    super();

    const style = new TextStyle({
      fontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif',
      fontSize: 14,
      fill: 0xFFD700,
    });
    this.promptText = new Text({ text: '选择目标', style });
    this.promptText.anchor.set(0.5, 0);
    this.promptText.position.set(480, 500);
    this.addChild(this.promptText);
  }

  /**
   * Show targets and wait for player selection.
   * Returns a promise that resolves with selected target IDs.
   */
  show(targets: TargetInfo[], maxTargets: number): Promise<CharacterId[]> {
    this.clear();
    this.visible = true;
    this.maxTargets = maxTargets;
    this.selectedTargets = [];

    if (maxTargets > 1) {
      this.promptText.text = `选择目标 (${this.selectedTargets.length}/${maxTargets})`;
    } else {
      this.promptText.text = '选择目标';
    }

    return new Promise<CharacterId[]>((resolve) => {
      this.resolveTarget = resolve;

      for (const t of targets) {
        const marker = new Graphics();
        this.drawMarker(marker, t.x, t.y, 0xCC3333);
        marker.eventMode = 'static';
        marker.cursor = 'pointer';

        marker.on('pointerover', () => {
          if (!this.selectedTargets.includes(t.id)) {
            this.drawMarker(marker, t.x, t.y, 0xFFD700);
          }
        });

        marker.on('pointerout', () => {
          if (!this.selectedTargets.includes(t.id)) {
            this.drawMarker(marker, t.x, t.y, 0xCC3333);
          }
        });

        marker.on('pointertap', () => {
          this.selectTarget(t.id, marker, t.x, t.y);
        });

        this.addChild(marker);
        this.markers.set(t.id, marker);
      }
    });
  }

  private selectTarget(id: CharacterId, marker: Graphics, x: number, y: number): void {
    if (this.selectedTargets.includes(id)) return;

    this.selectedTargets.push(id);
    this.drawMarker(marker, x, y, 0xFFD700, true);

    if (this.maxTargets > 1) {
      this.promptText.text = `选择目标 (${this.selectedTargets.length}/${this.maxTargets})`;
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
    this.clear();
  }

  cancel(): void {
    this.hide();
    this.resolveTarget?.([]);
    this.resolveTarget = null;
  }

  private clear(): void {
    for (const marker of this.markers.values()) {
      marker.destroy();
    }
    this.markers.clear();
    this.selectedTargets = [];
  }

  private drawMarker(g: Graphics, cx: number, cy: number, color: number, selected = false): void {
    g.clear();
    const size = 50;
    const half = size / 2;

    // Corner brackets
    const len = 12;
    const thick = selected ? 3 : 2;

    g.moveTo(cx - half, cy - half + len);
    g.lineTo(cx - half, cy - half);
    g.lineTo(cx - half + len, cy - half);
    g.stroke({ color, width: thick });

    g.moveTo(cx + half - len, cy - half);
    g.lineTo(cx + half, cy - half);
    g.lineTo(cx + half, cy - half + len);
    g.stroke({ color, width: thick });

    g.moveTo(cx + half, cy + half - len);
    g.lineTo(cx + half, cy + half);
    g.lineTo(cx + half - len, cy + half);
    g.stroke({ color, width: thick });

    g.moveTo(cx - half + len, cy + half);
    g.lineTo(cx - half, cy + half);
    g.lineTo(cx - half, cy + half - len);
    g.stroke({ color, width: thick });

    // Clickable area (invisible fill)
    g.rect(cx - half, cy - half, size, size);
    g.fill({ color: 0xffffff, alpha: 0.01 });
  }
}
