import { Application } from 'pixi.js';
import { AssetLoader } from './game/AssetLoader';
import { BattleScene } from './game/scenes/BattleScene';

/** Game canvas dimensions (16:9 aspect ratio) */
const GAME_WIDTH = 960;
const GAME_HEIGHT = 540;

async function main() {
  const app = new Application();

  await app.init({
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: 0x2a1a4a,
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

  // Start with battle scene (demo: show all 3 characters)
  const battleScene = new BattleScene(app, assetLoader);
  app.stage.addChild(battleScene.container);
  battleScene.start();
}

main().catch(console.error);
