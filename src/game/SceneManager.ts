import { Container, Graphics } from 'pixi.js';
import type { Application } from 'pixi.js';
import { TweenManager } from './animation/TweenManager';
import { Easing } from './animation/Easing';
import type { BaseScene } from './scenes/BaseScene';

/**
 * Manages scene transitions with fade in/out.
 * Only one scene is active at a time. Scenes are registered by name.
 */
export class SceneManager {
  private app: Application;
  private sceneRoot: Container;
  private scenes = new Map<string, BaseScene>();
  private currentScene: BaseScene | null = null;
  private currentName = '';
  private fadeOverlay: Graphics;
  private transitioning = false;

  constructor(app: Application) {
    this.app = app;

    // Scene container added to stage
    this.sceneRoot = new Container();
    app.stage.addChild(this.sceneRoot);

    // Full-screen fade overlay (on top of everything)
    this.fadeOverlay = new Graphics();
    this.fadeOverlay.rect(0, 0, app.screen.width, app.screen.height);
    this.fadeOverlay.fill(0x000000);
    this.fadeOverlay.alpha = 0;
    this.fadeOverlay.eventMode = 'none';
    app.stage.addChild(this.fadeOverlay);
  }

  /** Register a scene by name */
  register(name: string, scene: BaseScene): void {
    this.scenes.set(name, scene);
  }

  /** Get the current scene name */
  get current(): string {
    return this.currentName;
  }

  /**
   * Transition to a named scene with fade.
   * @param name - Scene name to switch to
   * @param data - Optional data passed to scene.onEnter()
   * @param fadeDuration - Fade out + fade in duration each (ms)
   */
  async goTo(name: string, data?: Record<string, unknown>, fadeDuration = 300): Promise<void> {
    if (this.transitioning) return;
    const nextScene = this.scenes.get(name);
    if (!nextScene) throw new Error(`Scene not registered: ${name}`);
    if (name === this.currentName && this.currentScene) return;

    this.transitioning = true;

    // Fade out current scene
    if (this.currentScene) {
      await TweenManager.add({
        target: this.fadeOverlay,
        props: { alpha: 1 },
        duration: fadeDuration,
        easing: Easing.easeInQuad,
      });

      this.currentScene.onExit();
      this.sceneRoot.removeChild(this.currentScene.container);
    } else {
      // First scene: start from black
      this.fadeOverlay.alpha = 1;
    }

    // Switch scene
    this.currentScene = nextScene;
    this.currentName = name;
    this.sceneRoot.addChild(nextScene.container);
    nextScene.onEnter(data);

    // Fade in new scene
    await TweenManager.add({
      target: this.fadeOverlay,
      props: { alpha: 0 },
      duration: fadeDuration,
      easing: Easing.easeOutQuad,
    });

    this.transitioning = false;
  }

  /** Update the active scene */
  update(deltaMs: number): void {
    this.currentScene?.update(deltaMs);
  }
}
