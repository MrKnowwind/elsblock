import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() { super('boot'); }

  preload() {
    const asset = (path) => `${import.meta.env.BASE_URL}assets/${path}`;
    this.load.image('background', asset('reactor-shaft.png'));
    this.load.image('logo', asset('orbi-logo.png'));
    this.load.image('ball', asset('orbi-ball.png'));
    this.load.image('buttonFrame', asset('button-frame.png'));
    this.load.image('iconFrame', asset('icon-frame.png'));
    this.load.image('playfieldFrame', asset('playfield-frame.png'));
    this.load.image('square', asset('square.png'));
    this.load.image('core', asset('circle.png'));
    for (const cue of ['ambient', 'clear', 'click', 'dash', 'death', 'jump', 'land']) {
      this.load.audio(cue, asset(`audio/${cue}.wav`));
    }
  }

  create() {
    this.scene.start('menu');
  }
}
