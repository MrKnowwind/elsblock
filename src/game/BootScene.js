import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() { super('boot'); }

  preload() {
    const asset = (path) => `${import.meta.env.BASE_URL}assets/${path}`;
    this.load.on('progress', (value) => window.gameLoading?.progress(value));
    this.load.on('loaderror', () => {
      this.loadFailed = true;
      window.gameLoading?.error();
    });
    this.load.image('background', asset('reactor-shaft.webp'));
    this.load.image('logo', asset('orbi-logo.webp'));
    this.load.image('ball', asset('orbi-ball.webp'));
    this.load.image('buttonFrame', asset('button-frame.webp'));
    this.load.image('iconFrame', asset('icon-frame.webp'));
    this.load.image('playfieldFrame', asset('playfield-frame.webp'));
    this.load.image('square', asset('square.png'));
    this.load.image('core', asset('circle.png'));
    this.load.audio('click', asset('audio/click.wav'));
  }

  create() {
    if (this.loadFailed) return;
    window.gameLoading?.ready();
    this.scene.start('menu');
  }
}
