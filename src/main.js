import Phaser from 'phaser';
import './style.css';
import { BootScene } from './game/BootScene.js';
import { MenuScene } from './game/MenuScene.js';
import { GameScene } from './game/GameScene.js';
import { HEIGHT, WIDTH } from './game/constants.js';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: WIDTH,
  height: HEIGHT,
  backgroundColor: '#020812',
  scene: [BootScene, MenuScene, GameScene],
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 2100 }, debug: false },
  },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { activePointers: 4 },
  render: {
    antialias: true,
    antialiasGL: false,
    powerPreference: 'high-performance',
    roundPixels: false,
  },
});
