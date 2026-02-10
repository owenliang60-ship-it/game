import { Container, Sprite, Texture } from 'pixi.js';
import type { CharacterAssets } from '../AssetLoader';
import { TweenManager } from '../animation/TweenManager';
import { Easing } from '../animation/Easing';

export type Direction = 'south' | 'west' | 'north' | 'east';
export type AnimationState = 'idle' | 'attack' | 'hit' | 'death' | 'run' | 'defense' | 'escape' | 'idle-alt';

/**
 * Visual representation of a character on the battle field.
 * Handles sprite display and frame-based animation playback.
 */
export class CharacterSprite {
  readonly container = new Container();
  private sprite: Sprite;
  private assets: CharacterAssets;

  private currentState: AnimationState = 'idle';
  private currentDirection: Direction = 'south';
  private currentFrame = 0;
  private frameTimer = 0;
  private frameDuration = 150; // ms per frame
  private playing = false;
  private loop = true;
  private onComplete?: () => void;

  /** Display scale for pixel art (nearest neighbor) */
  private displayScale: number;

  /** Original position for returning after lunge */
  private _baseX = 0;
  private _baseY = 0;

  constructor(assets: CharacterAssets, scale = 2) {
    this.assets = assets;
    this.displayScale = scale;

    // Start with idle south rotation sprite
    this.sprite = new Sprite(assets.rotations['south']);
    this.sprite.anchor.set(0.5, 1); // anchor at bottom center
    this.sprite.scale.set(scale);
    this.container.addChild(this.sprite);
  }

  get direction(): Direction {
    return this.currentDirection;
  }

  get state(): AnimationState {
    return this.currentState;
  }

  get baseX(): number { return this._baseX; }
  get baseY(): number { return this._baseY; }

  /** Apply a visual Y offset for idle breathing (does not affect base position or tweens) */
  setBreatheOffset(offsetY: number): void {
    this.sprite.y = offsetY;
  }

  setDirection(dir: Direction) {
    this.currentDirection = dir;
    this.currentFrame = 0;
    this.updateTexture();
  }

  /**
   * Play an animation state.
   * @param state - The animation to play
   * @param loop - Whether to loop (idle loops, attack doesn't)
   * @param onComplete - Callback when non-looping animation finishes
   */
  play(state: AnimationState, loop = true, onComplete?: () => void) {
    this.currentState = state;
    this.currentFrame = 0;
    this.frameTimer = 0;
    this.playing = true;
    this.loop = loop;
    this.onComplete = onComplete;
    this.updateTexture();
  }

  /**
   * Play an animation and return a Promise that resolves when it completes.
   * Always non-looping.
   */
  playAsync(state: AnimationState): Promise<void> {
    return new Promise<void>((resolve) => {
      this.play(state, false, resolve);
    });
  }

  /** Stop animation, show current frame */
  stop() {
    this.playing = false;
  }

  /** Update animation (call each frame with delta ms) */
  update(deltaMs: number) {
    if (!this.playing) return;

    this.frameTimer += deltaMs;
    if (this.frameTimer >= this.frameDuration) {
      this.frameTimer -= this.frameDuration;
      this.advanceFrame();
    }
  }

  /** Set position (bottom-center anchor) */
  setPosition(x: number, y: number) {
    this.container.position.set(x, y);
    this._baseX = x;
    this._baseY = y;
  }

  /**
   * Lunge toward a target position (for melee attacks).
   * Moves partway toward target then returns.
   */
  async lungeToward(targetX: number, targetY: number): Promise<void> {
    const pos = this.container.position;
    const dx = targetX - pos.x;
    const dy = targetY - pos.y;
    // Move 40% of the distance toward target
    const lungeX = pos.x + dx * 0.4;
    const lungeY = pos.y + dy * 0.4;

    await TweenManager.add({
      target: pos,
      props: { x: lungeX, y: lungeY },
      duration: 150,
      easing: Easing.easeOutQuad,
    });
  }

  /** Return to base position after lunge */
  async returnToBase(): Promise<void> {
    await TweenManager.add({
      target: this.container.position,
      props: { x: this._baseX, y: this._baseY },
      duration: 200,
      easing: Easing.easeOutBack,
    });
  }

  /** Shake the sprite (for hit reactions) */
  async shake(intensity = 4, duration = 200): Promise<void> {
    const pos = this.container.position;
    const startX = pos.x;
    const steps = 4;
    const stepDuration = duration / steps;

    for (let i = 0; i < steps; i++) {
      const offsetX = (i % 2 === 0 ? 1 : -1) * intensity;
      await TweenManager.add({
        target: pos,
        props: { x: startX + offsetX },
        duration: stepDuration,
        easing: Easing.linear,
      });
    }
    // Return to exact position
    await TweenManager.add({
      target: pos,
      props: { x: startX },
      duration: stepDuration,
      easing: Easing.linear,
    });
  }

  /** Flash white (for hit feedback) */
  async flashWhite(duration = 150): Promise<void> {
    this.sprite.tint = 0xFFFFFF;
    this.sprite.alpha = 0.5;
    await new Promise(resolve => setTimeout(resolve, duration));
    this.sprite.tint = 0xFFFFFF;
    this.sprite.alpha = 1;
  }

  private advanceFrame() {
    const frames = this.getFrames();
    if (!frames || frames.length === 0) return;

    this.currentFrame++;
    if (this.currentFrame >= frames.length) {
      if (this.loop) {
        this.currentFrame = 0;
      } else {
        this.currentFrame = frames.length - 1;
        this.playing = false;
        this.onComplete?.();
        return;
      }
    }
    this.updateTexture();
  }

  private getFrames(): Texture[] | undefined {
    const stateAnims = this.assets.animations[this.currentState];
    if (!stateAnims) return undefined;
    return stateAnims[this.currentDirection];
  }

  private updateTexture() {
    const frames = this.getFrames();
    if (frames && frames.length > 0) {
      const idx = Math.min(this.currentFrame, frames.length - 1);
      this.sprite.texture = frames[idx];
    } else {
      // Fallback to rotation sprite
      const rotation = this.assets.rotations[this.currentDirection];
      if (rotation) {
        this.sprite.texture = rotation;
      }
    }
  }
}
