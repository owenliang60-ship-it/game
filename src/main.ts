import { Application } from 'pixi.js';
import { AssetLoader } from './game/AssetLoader';
import { BattleScene } from './game/scenes/BattleScene';
import { BattleManager } from './core/BattleManager';

/** Game canvas dimensions (16:9 aspect ratio) */
const GAME_WIDTH = 960;
const GAME_HEIGHT = 540;

async function main() {
  const app = new Application();

  await app.init({
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: 0x1a0e2e,
    antialias: false,
    roundPixels: true,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
  });

  const container = document.getElementById('game-container');
  if (!container) throw new Error('Game container not found');
  container.appendChild(app.canvas);

  // Scale canvas to fit window while maintaining aspect ratio
  function resize() {
    const scale = Math.min(
      window.innerWidth / GAME_WIDTH,
      window.innerHeight / GAME_HEIGHT,
    );
    app.canvas.style.width = `${GAME_WIDTH * scale}px`;
    app.canvas.style.height = `${GAME_HEIGHT * scale}px`;
  }
  window.addEventListener('resize', resize);
  resize();

  // Load character assets
  const assetLoader = new AssetLoader();
  await assetLoader.loadAll();

  // Create battle with 3 fighters (M2: all AI-controlled)
  const battle = new BattleManager({
    fighters: [
      { characterClass: 'knight', isPlayer: true, displayName: '骑士 (你)' },
      { characterClass: 'armored-warrior', isPlayer: false, displayName: '装甲战士' },
      { characterClass: 'archer', isPlayer: false, displayName: '弓箭手' },
    ],
    aiDifficulty: 'normal',
  });

  // Start battle scene
  const battleScene = new BattleScene(app, assetLoader, battle);
  app.stage.addChild(battleScene.container);
  battleScene.start();
}

main().catch(console.error);
