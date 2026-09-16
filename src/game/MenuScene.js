import Phaser from 'phaser';
import { HEIGHT, WIDTH } from './constants.js';
import { boolValue, maxUnlocked, numberValue, save } from './storage.js';
import { cover, fitWidth, makeButton, panelShell, textStyle } from './ui.js';
import { survivalDuration, targetGoal } from './rules.js';

export class MenuScene extends Phaser.Scene {
  constructor() { super('menu'); }

  create() {
    this.registry.set('soundEnabled', boolValue('sound', true));
    cover(this.add.image(WIDTH / 2, HEIGHT / 2, 'background'), WIDTH, HEIGHT);
    this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x01050c, 0.58);
    const logo = fitWidth(this.add.image(540, 460, 'logo'), 700);
    this.tweens.add({ targets: logo, y: 474, duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.makeIconButton(86, 126, '?', () => this.showHowTo());
    this.makeIconButton(994, 126, '⚙', () => this.showSettings());
    this.add.text(540, 835, '锁定落点  •  翻滚求生', textStyle(28, '#bfeeff')).setOrigin(0.5);
    this.add.text(540, 970, `最佳  ${numberValue('bestScore', 0).toString().padStart(6, '0')}   •   ${numberValue('bestTime', 0).toFixed(1)}秒`, textStyle(31)).setOrigin(0.5);

    makeButton(this, 540, 1285, 680, 130, '生存模式', 0xe84f3a, () => this.chooseLevel('survival'));
    makeButton(this, 540, 1523, 680, 130, '黄金目标', 0xe99c0e, () => this.chooseLevel('target'));
    makeButton(this, 540, 1760, 680, 130, '无尽模式', 0x197aaa, () => this.startGame('endless', 1));
  }

  makeIconButton(x, y, glyph, onClick) {
    const frame = this.add.image(x, y, 'iconFrame').setDisplaySize(112, 112).setInteractive({ useHandCursor: true });
    this.add.text(x, y, glyph, textStyle(39)).setOrigin(0.5);
    frame.on('pointerdown', () => {
      frame.setTint(0xb9d8e8);
      this.time.delayedCall(90, () => frame.active && frame.clearTint());
      if (this.registry.get('soundEnabled') !== false && this.cache.audio.exists('click')) this.sound.play('click', { volume: 0.7 });
      onClick();
    });
  }

  chooseLevel(mode) {
    const max = maxUnlocked(mode);
    let selected = Math.min(max, Math.max(1, numberValue('selectedLevel', 1)));
    const modeTitle = mode === 'survival' ? '生存模式' : '黄金目标';
    const { root, top } = panelShell(this, '选择难度', { width: 850, height: 930, headerHeight: 210 });
    const modeText = this.add.text(540, 850, modeTitle, textStyle(28, '#b8ebff')).setOrigin(0.5);
    const level = this.add.text(540, 1010, String(selected), textStyle(112, '#ffd158')).setOrigin(0.5);
    const detail = this.add.text(540, 1150, '', { ...textStyle(28), lineSpacing: 10 }).setOrigin(0.5);
    const refresh = () => {
      level.setText(String(selected));
      detail.setText(mode === 'survival' ? `生存 ${survivalDuration(selected)} 秒\n已解锁  ${max}` : `清除 ${targetGoal(selected)} 个黄金方块\n已解锁  ${max}`);
    };
    modeText.y = top + 250;
    level.y = top + 410;
    detail.y = top + 555;
    root.add([modeText, level, detail]);
    root.add(this.makeArrowButton(350, top + 410, '‹', () => { selected = Math.max(1, selected - 1); refresh(); }));
    root.add(this.makeArrowButton(730, top + 410, '›', () => { selected = Math.min(max, selected + 1); refresh(); }));
    root.add(makeButton(this, 540, top + 720, 470, 92, '开始', 0xe04e36, () => this.startGame(mode, selected), 31));
    root.add(makeButton(this, 540, top + 835, 350, 78, '关闭', 0x153d5c, () => root.destroy(), 25));
    refresh();
  }

  makeArrowButton(x, y, glyph, onClick) {
    const label = this.add.text(0, 0, glyph, textStyle(86, '#dffaff')).setOrigin(0.5);
    const hitArea = this.add.zone(0, 0, 112, 112).setInteractive({ useHandCursor: true });
    const root = this.add.container(x, y, [label, hitArea]);
    hitArea.on('pointerdown', () => {
      label.setColor('#65dff4');
      this.time.delayedCall(90, () => label.active && label.setColor('#dffaff'));
      onClick();
    });
    return root;
  }

  startGame(mode, level) {
    save('selectedLevel', level);
    this.scene.start('game', { mode, level });
  }

  showHowTo() {
    const { root, top } = panelShell(this, '生存指南', { width: 880, height: 1420, headerHeight: 250 });
    const rules = [
      ['↔', '移动', '移动到目标落点下方'],
      ['↑', '二段跳', '可跃上最高 2.5 格的平台'],
      ['»', '冲刺', '在锁定结束前快速逃离'],
      ['□', '消除整行', '填满整行，并保持在红线下方'],
    ];
    rules.forEach(([glyph, heading, body], index) => {
      const y = top + 380 + index * 205;
      const row = this.add.rectangle(540, y, 760, 170, 0x032646, 0.98);
      const accent = this.add.rectangle(166, y, 10, 170, 0x28efff, 1);
      const icon = this.add.image(245, y, 'iconFrame').setDisplaySize(108, 108);
      const glyphText = this.add.text(245, y, glyph, textStyle(43)).setOrigin(0.5);
      const headingText = this.add.text(330, y - 32, heading, textStyle(29, '#34efff')).setOrigin(0, 0.5);
      const bodyText = this.add.text(330, y + 34, body, textStyle(23, '#ffffff')).setOrigin(0, 0.5);
      root.add([row, accent, icon, glyphText, headingText, bodyText]);
    });
    root.add(makeButton(this, 540, top + 1305, 330, 90, '知道了', 0xe04e36, () => root.destroy(), 28));
  }

  showSettings() {
    const soundOn = boolValue('sound', true);
    const hapticsOn = boolValue('haptics', true);
    const { root, top } = panelShell(this, '设置', { width: 880, height: 1080, headerHeight: 250 });
    root.add(this.add.text(540, top + 335, '音效与设备反馈', textStyle(25, '#94c9e5')).setOrigin(0.5));
    root.add(makeButton(this, 540, top + 500, 570, 100, `音效          ${soundOn ? '开' : '关'}`, 0x22dcef, () => {
      save('sound', soundOn ? 0 : 1);
      root.destroy();
      this.scene.restart();
    }, 29));
    root.add(makeButton(this, 540, top + 715, 570, 100, `振动          ${hapticsOn ? '开' : '关'}`, 0x22dcef, () => {
      save('haptics', hapticsOn ? 0 : 1);
      root.destroy();
      this.scene.restart();
    }, 29));
    root.add(makeButton(this, 540, top + 955, 330, 90, '完成', 0xe04e36, () => root.destroy(), 28));
    return root;
  }
}
