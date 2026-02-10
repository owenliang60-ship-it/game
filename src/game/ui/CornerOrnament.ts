import { Graphics } from 'pixi.js';

/**
 * L-shaped gold corner ornament for scene framing.
 * Draw at each corner with appropriate rotation/flip.
 */
export function drawCornerOrnament(
  g: Graphics,
  x: number,
  y: number,
  armLength = 20,
  color = 0xC8A050,
  alpha = 0.5,
  flipX = false,
  flipY = false,
): void {
  const dx = flipX ? -1 : 1;
  const dy = flipY ? -1 : 1;

  // Horizontal arm
  g.rect(x, y, armLength * dx, 2);
  g.fill({ color, alpha });
  // Vertical arm
  g.rect(x, y, 2 * (flipX ? -1 : 1), armLength * dy);
  g.fill({ color, alpha });
  // Corner dot (where arms meet)
  g.rect(x - (flipX ? 2 : 0), y - (flipY ? 2 : 0), 2, 2);
  g.fill({ color, alpha: alpha + 0.15 });
}
