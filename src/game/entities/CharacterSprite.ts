import { Container, Sprite, Texture } from 'pixi.js';
import type { CharacterAssets } from '../AssetLoader';

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

  /** Set position (bottom-center anchor) */
  setPosition(x: number, y: number) {
    this.container.position.set(x, y);
  }
}
