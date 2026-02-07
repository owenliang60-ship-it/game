import { Assets, Spritesheet, Texture, SCALE_MODES } from 'pixi.js';

export interface CharacterManifest {
  character: string;
  rotations: {
    directions: string[];
    path: string;
  };
  animations: Record<string, {
    source: string;
    directions: Record<string, {
      source: string;
      frames: number;
      path: string;
    }>;
  }>;
}

export interface CharacterAssets {
  name: string;
  rotations: Record<string, Texture>;
  animations: Record<string, Record<string, Texture[]>>;
}

const CHARACTER_NAMES = ['armored-warrior', 'archer', 'knight'] as const;
export type CharacterName = typeof CHARACTER_NAMES[number];

/**
 * Loads and manages all character sprite assets.
 * Each character has rotations (static) and animations (frame sequences).
 */
export class AssetLoader {
  private characters = new Map<string, CharacterAssets>();

  async loadAll(): Promise<void> {
    for (const name of CHARACTER_NAMES) {
      const assets = await this.loadCharacter(name);
      this.characters.set(name, assets);
    }
    console.log(`Loaded ${this.characters.size} characters`);
  }

  getCharacter(name: string): CharacterAssets {
    const assets = this.characters.get(name);
    if (!assets) throw new Error(`Character not loaded: ${name}`);
    return assets;
  }

  private async loadCharacter(name: string): Promise<CharacterAssets> {
    // Load manifest
    const manifestUrl = `src/assets/characters/${name}/manifest.json`;
    const manifest: CharacterManifest = await (await fetch(manifestUrl)).json();

    const rotations: Record<string, Texture> = {};
    const animations: Record<string, Record<string, Texture[]>> = {};

    // Load rotation textures
    for (const dir of manifest.rotations.directions) {
      const url = `src/assets/characters/${name}/rotations/${dir}.png`;
      const texture = await Assets.load(url);
      texture.source.scaleMode = 'nearest';
      rotations[dir] = texture;
    }

    // Load animation frames
    for (const [state, animInfo] of Object.entries(manifest.animations)) {
      animations[state] = {};
      for (const [dir, dirInfo] of Object.entries(animInfo.directions)) {
        const frames: Texture[] = [];
        for (let i = 0; i < dirInfo.frames; i++) {
          const frameNum = String(i).padStart(3, '0');
          const url = `src/assets/characters/${name}/animations/${state}/${dir}/frame_${frameNum}.png`;
          const texture = await Assets.load(url);
          texture.source.scaleMode = 'nearest';
          frames.push(texture);
        }
        animations[state][dir] = frames;
      }
    }

    return { name, rotations, animations };
  }
}
