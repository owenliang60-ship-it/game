import { Container } from 'pixi.js';
import type { Application } from 'pixi.js';

/**
 * Abstract base class for all game scenes.
 * Each scene owns a Container that is added/removed by SceneManager.
 */
export abstract class BaseScene {
  readonly container = new Container();
  protected app: Application;

  constructor(app: Application) {
    this.app = app;
  }

  /** Called when the scene becomes active (after transition in) */
  abstract onEnter(data?: Record<string, unknown>): void;

  /** Called when the scene is about to leave (before transition out) */
  onExit(): void {
    // Override in subclasses if cleanup is needed
  }

  /** Called every frame while the scene is active */
  update(_deltaMs: number): void {
    // Override in subclasses if per-frame updates are needed
  }

  /** Clean up resources when scene is permanently removed */
  destroy(): void {
    this.container.destroy({ children: true });
  }
}
