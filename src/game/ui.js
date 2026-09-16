export const textStyle = (size = 34, color = '#ffffff') => ({
  fontFamily: 'Microsoft YaHei, PingFang SC, Arial, sans-serif', fontSize: `${size}px`, color,
  align: 'center', stroke: '#00101d', strokeThickness: 2,
});

export function fitWidth(image, width) {
  image.setScale(width / image.width);
  return image;
}

export function cover(image, width, height) {
  image.setScale(Math.max(width / image.width, height / image.height));
  return image;
}

export function makeButton(scene, x, y, width, height, label, color, onClick, fontSize = 38) {
  const frame = scene.add.image(0, 0, 'buttonFrame');
  const frameHeight = width * frame.height / frame.width;
  frame.setDisplaySize(width, frameHeight);
  const labelText = scene.add.text(0, 0, label, textStyle(fontSize)).setOrigin(0.5);
  const hitArea = scene.add.zone(0, 0, width, Math.max(height, frameHeight * 0.75)).setInteractive({ useHandCursor: true });
  const root = scene.add.container(x, y, [frame, labelText, hitArea]);
  hitArea.on('pointerdown', () => {
    frame.setTint(0xb9d8e8);
    scene.time.delayedCall(90, () => frame.active && frame.clearTint());
    if (scene.registry.get('soundEnabled') !== false && scene.cache.audio.exists('click')) scene.sound.play('click', { volume: 0.7 });
    onClick();
  });
  return root;
}

export function panelShell(scene, title, { width = 880, height = 1180, headerHeight = 250, depth = 100 } = {}) {
  const root = scene.add.container(0, 0).setDepth(depth);
  const top = 1080 - height / 2;
  const bottom = 1080 + height / 2;
  const scrim = scene.add.rectangle(540, 1080, 1080, 2160, 0x000713, 0.86).setInteractive();
  const card = scene.add.rectangle(540, 1080, width, height, 0x052b4c, 0.995).setStrokeStyle(8, 0x20e4f4, 1);
  const header = scene.add.rectangle(540, top + headerHeight / 2, width - 14, headerHeight - 14, 0x105b91, 1);
  const topAccent = scene.add.rectangle(540, top + 20, width * 0.58, 10, 0x32f0ff, 1);
  const bottomAccent = scene.add.rectangle(540, bottom - 20, width * 0.34, 10, 0xff5c60, 1);
  const titleText = scene.add.text(540, top + headerHeight / 2 + 8, title, textStyle(48, '#42eeff')).setOrigin(0.5);
  root.add([scrim, card, header, topAccent, bottomAccent, titleText]);
  root.setAlpha(0);
  scene.tweens.add({ targets: root, alpha: 1, duration: 180, ease: 'Cubic.Out' });
  return { root, top, bottom, left: 540 - width / 2, right: 540 + width / 2, headerHeight };
}
