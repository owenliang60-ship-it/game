import { Graphics } from 'pixi.js';

export interface RPGPanelOptions {
  width: number;
  height: number;
  radius?: number;
  fillColor?: number;
  fillAlpha?: number;
  /** Show drop shadow */
  shadow?: boolean;
  /** Show inner frame line */
  innerFrame?: boolean;
  /** Show corner dot decorations */
  cornerDots?: boolean;
  /** Top accent line color (for selected/active states) */
  accentColor?: number;
}

/**
 * Draw an RPG-style panel with layered depth effects:
 * shadow → outer border → fill → highlight edges → shadow edges → inner frame → corner dots → accent
 */
export function drawRPGPanel(g: Graphics, opts: RPGPanelOptions): void {
  const {
    width: w,
    height: h,
    radius = 6,
    fillColor = 0xF0EBE0,
    fillAlpha = 0.94,
    shadow = true,
    innerFrame = true,
    cornerDots = true,
    accentColor,
  } = opts;

  // 1. Drop shadow
  if (shadow) {
    g.roundRect(3, 3, w, h, radius);
    g.fill({ color: 0x8A7A60, alpha: 0.18 });
  }

  // 2. Outer border
  g.roundRect(-1, -1, w + 2, h + 2, radius + 1);
  g.fill({ color: 0xA09070, alpha: 0.6 });

  // 3. Main fill
  g.roundRect(0, 0, w, h, radius);
  g.fill({ color: fillColor, alpha: fillAlpha });

  // 4. Highlight edges (top + left) — light bevel
  g.rect(4, 1, w - 8, 2);
  g.fill({ color: 0xFFFAF0, alpha: 0.55 });
  g.rect(1, 4, 2, h - 8);
  g.fill({ color: 0xFFFAF0, alpha: 0.35 });

  // 5. Shadow edges (bottom + right) — dark bevel
  g.rect(4, h - 3, w - 8, 2);
  g.fill({ color: 0xC8B898, alpha: 0.5 });
  g.rect(w - 3, 4, 2, h - 8);
  g.fill({ color: 0xC8B898, alpha: 0.35 });

  // 6. Inner frame line
  if (innerFrame) {
    g.roundRect(4, 4, w - 8, h - 8, Math.max(1, radius - 2));
    g.stroke({ color: 0xD4C8B0, width: 1, alpha: 0.4 });
  }

  // 7. Corner dot decorations (2x2 gold squares)
  if (cornerDots) {
    const dotColor = 0xC8A050;
    const dotAlpha = 0.6;
    const inset = 5;
    // Top-left
    g.rect(inset, inset, 2, 2);
    g.fill({ color: dotColor, alpha: dotAlpha });
    // Top-right
    g.rect(w - inset - 2, inset, 2, 2);
    g.fill({ color: dotColor, alpha: dotAlpha });
    // Bottom-left
    g.rect(inset, h - inset - 2, 2, 2);
    g.fill({ color: dotColor, alpha: dotAlpha });
    // Bottom-right
    g.rect(w - inset - 2, h - inset - 2, 2, 2);
    g.fill({ color: dotColor, alpha: dotAlpha });
  }

  // 8. Optional top accent line
  if (accentColor !== undefined) {
    g.rect(6, 2, w - 12, 2);
    g.fill({ color: accentColor, alpha: 0.7 });
  }
}
