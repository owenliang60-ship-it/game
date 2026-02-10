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
  }

  getCharacter(name: string): CharacterAssets {
    const assets = this.characters.get(name);
    if (!assets) throw new Error(`Character not loaded: ${name}`);
    return assets;
  }

  private async loadCharacter(name: string): Promise<CharacterAssets> {
    const rotations: Record<string, Texture> = {};
    const animations: Record<string, Record<string, Texture[]>> = {};

    // Load manifest
    let manifest: CharacterManifest;
    try {
      const manifestUrl = `src/assets/characters/${name}/manifest.json`;
      manifest = await (await fetch(manifestUrl)).json();
    } catch (err) {
      console.error(`[AssetLoader] Failed to load manifest for ${name}:`, err);
      return { name, rotations, animations };
    }

    // Load rotation textures
    for (const dir of manifest.rotations.directions) {
      try {
        const url = `src/assets/characters/${name}/rotations/${dir}.png`;
        const texture = await Assets.load(url);
        texture.source.scaleMode = 'nearest';
        rotations[dir] = texture;
      } catch (err) {
        console.error(`[AssetLoader] Failed to load rotation ${dir} for ${name}:`, err);
      }
    }

    // Load animation frames
    for (const [state, animInfo] of Object.entries(manifest.animations)) {
      animations[state] = {};
      for (const [dir, dirInfo] of Object.entries(animInfo.directions)) {
        const frames: Texture[] = [];
        try {
          for (let i = 0; i < dirInfo.frames; i++) {
            const frameNum = String(i).padStart(3, '0');
            const url = `src/assets/characters/${name}/animations/${state}/${dir}/frame_${frameNum}.png`;
            const texture = await Assets.load(url);
            texture.source.scaleMode = 'nearest';
            frames.push(texture);
          }
        } catch (err) {
          console.error(`[AssetLoader] Failed to load animation ${state}/${dir} for ${name}:`, err);
        }
        if (frames.length > 0) {
          animations[state][dir] = frames;
        }
      }
    }

    return { name, rotations, animations };
  }
}
