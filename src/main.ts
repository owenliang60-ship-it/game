import { Application } from 'pixi.js';
import { AssetLoader } from './game/AssetLoader';
import { BattleScene } from './game/scenes/BattleScene';
import { TitleScene } from './game/scenes/TitleScene';
import { PlayerCountScene } from './game/scenes/PlayerCountScene';
import { CharSelectScene } from './game/scenes/CharSelectScene';
import { ResultScene } from './game/scenes/ResultScene';
import { SceneManager } from './game/SceneManager';
import { TweenManager } from './game/animation/TweenManager';

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

  // Initialize animation system
  TweenManager.init(app.ticker);

  // Load character assets
  const assetLoader = new AssetLoader();
  await assetLoader.loadAll();

  // Initialize scene manager
  const sceneManager = new SceneManager(app);

  // Register all scenes
  sceneManager.register('title', new TitleScene(app, sceneManager));
  sceneManager.register('playerCount', new PlayerCountScene(app, sceneManager));
  sceneManager.register('charSelect', new CharSelectScene(app, sceneManager));
  sceneManager.register('battle', new BattleScene(app, assetLoader, sceneManager));
  sceneManager.register('result', new ResultScene(app, sceneManager));

  // Update scenes each frame
  app.ticker.add((tick) => {
    sceneManager.update(tick.deltaMS);
  });

  // Start from title screen
  await sceneManager.goTo('title');
}

main().catch(console.error);
