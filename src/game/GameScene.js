import Phaser from 'phaser';
import { Board } from './Board.js';
import {
  BOARD_BOTTOM, BOARD_LEFT, BOARD_TOP, CELL, COLS, COLORS, CONFIG, FRAME_TOP,
  HEIGHT, REDLINE_ROW, REDLINE_Y, ROWS, WIDTH,
} from './constants.js';
import {
  PieceBag, SHAPES, constrainBallToBoard, fallSpeed, findCrossedSupportTop,
  lockCountdown, survivalDuration, targetGoal,
} from './rules.js';
import { boolValue, maxUnlocked, numberValue, save, unlockNext } from './storage.js';
import { cover, fitWidth, makeButton, panelShell, textStyle } from './ui.js';

const MODE_NAMES = { survival: '生存模式', target: '黄金目标', endless: '无尽模式' };

export class GameScene extends Phaser.Scene {
  constructor() { super('game'); }

  preload() {
    const asset = (path) => `${import.meta.env.BASE_URL}assets/${path}`;
    for (const cue of ['ambient', 'clear', 'dash', 'death', 'jump', 'land']) {
      if (!this.cache.audio.exists(cue)) this.load.audio(cue, asset(`audio/${cue}.wav`));
    }
  }

  init(data) {
    this.mode = data.mode ?? 'survival';
    this.level = data.level ?? 1;
  }

  create() {
    this.board = new Board(COLS, ROWS);
    this.bag = new PieceBag();
    this.elapsed = 0;
    this.score = 0;
    this.lines = 0;
    this.combo = 0;
    this.targetCells = 0;
    this.spawnCount = 0;
    this.nextSpawnAt = 600;
    this.playing = true;
    this.paused = false;
    this.roundStarted = false;
    this.currentPiece = null;
    this.redlineDanger = 0;
    this.crushTime = 0;
    this.moveInput = 0;
    this.joystickPointer = null;
    this.jumpQueuedAt = -Infinity;
    this.dashUntil = 0;
    this.dashReadyAt = 0;
    this.coyoteUntil = 0;
    this.jumpsRemaining = CONFIG.maxJumps;
    this.airDash = 1;
    this.revived = false;
    this.soundEnabled = boolValue('sound', true);
    this.registry.set('soundEnabled', this.soundEnabled);
    this.tutorial = false;

    this.createBackdrop();
    this.createBoard();
    this.createHud();
    this.createPlayer();
    this.createControls();
    this.createInput();
    this.physics.pause();
    this.showReady();
    if (this.soundEnabled) {
      this.ambient = this.sound.add('ambient', { loop: true, volume: 0.18 });
      this.ambient.play();
    }
    this.events.once('shutdown', () => this.ambient?.destroy());
  }

  createBackdrop() {
    cover(this.add.image(WIDTH / 2, HEIGHT / 2, 'background'), WIDTH, HEIGHT);
    this.add.rectangle(540, 1080, 1080, 2160, 0x00101d, 0.18);
    this.add.rectangle(540, 1880, 1080, 560, 0x00101d, 0.42);
  }

  createBoard() {
    this.add.rectangle(BOARD_LEFT + COLS * CELL / 2, (FRAME_TOP + BOARD_BOTTOM) / 2, COLS * CELL + 36, BOARD_BOTTOM - FRAME_TOP + 42, 0x00101b, 0.88);
    const grid = this.add.graphics();
    grid.lineStyle(3, 0x1480a9, 0.82);
    for (let x = 0; x <= COLS; x += 1) grid.lineBetween(BOARD_LEFT + x * CELL, FRAME_TOP, BOARD_LEFT + x * CELL, BOARD_BOTTOM);
    for (let y = 0; y <= ROWS; y += 1) grid.lineBetween(BOARD_LEFT, BOARD_BOTTOM - y * CELL, BOARD_LEFT + COLS * CELL, BOARD_BOTTOM - y * CELL);
    fitWidth(this.add.image(540, (FRAME_TOP + BOARD_BOTTOM) / 2, 'playfieldFrame'), 908);

    this.redlineGlow = this.add.rectangle(540, REDLINE_Y, COLS * CELL, 58, 0xf31f31, 0.05).setDepth(5);
    this.redline = this.add.rectangle(540, REDLINE_Y, COLS * CELL, 7, 0xff2d3c, 0.42).setDepth(6);
    this.stableGroup = this.physics.add.staticGroup();
    this.fallingGroup = this.physics.add.group({ allowGravity: false, immovable: true });

    this.ground = this.add.rectangle(540, BOARD_BOTTOM + 24, COLS * CELL, 48, 0x103a55, 0.01);
    this.physics.add.existing(this.ground, true);
    this.leftWall = this.add.rectangle(BOARD_LEFT - 18, (FRAME_TOP + BOARD_BOTTOM) / 2, 36, BOARD_BOTTOM - FRAME_TOP, 0x103a55, 0.01);
    this.rightWall = this.add.rectangle(BOARD_LEFT + COLS * CELL + 18, (FRAME_TOP + BOARD_BOTTOM) / 2, 36, BOARD_BOTTOM - FRAME_TOP, 0x103a55, 0.01);
    this.physics.add.existing(this.leftWall, true);
    this.physics.add.existing(this.rightWall, true);
    this.physics.world.setBounds(BOARD_LEFT, FRAME_TOP, COLS * CELL, BOARD_BOTTOM - FRAME_TOP);
  }

  createHud() {
    this.add.rectangle(540, 92, 1080, 184, 0x00101d, 0.55);
    this.add.rectangle(188, 180, 248, 5, 0x25ddf2, 0.7);
    this.add.rectangle(540, 180, 310, 5, 0x25ddf2, 0.7);
    this.add.rectangle(802, 180, 172, 5, 0x25ddf2, 0.28);
    this.scoreText = this.add.text(42, 72, '分数  000000', { ...textStyle(31), align: 'left' });
    this.timeText = this.add.text(540, 72, '时间  0', textStyle(31)).setOrigin(0.5, 0);
    this.linesText = this.add.text(930, 72, '消行  00', { ...textStyle(31), align: 'right' }).setOrigin(1, 0);
    this.add.rectangle(540, 235, 500, 78, 0x051b2e, 0.9);
    this.add.rectangle(540, 198, 350, 5, 0x2be3f4, 0.8);
    this.objectiveText = this.add.text(540, 235, '', textStyle(28, '#e7fbff')).setOrigin(0.5).setDepth(10);
    const pause = this.add.image(988, 148, 'iconFrame').setDisplaySize(100, 100).setInteractive();
    this.add.text(988, 148, 'Ⅱ', textStyle(39)).setOrigin(0.5);
    pause.on('pointerdown', () => this.showPause());
    this.tutorialText = this.add.text(540, 305, '诱导锁定  •  及时躲避  •  填满整行', textStyle(22, '#ffd06a')).setOrigin(0.5).setVisible(this.tutorial);
  }

  createPlayer() {
    this.player = this.physics.add.sprite(540, BOARD_BOTTOM - 42, 'ball').setDisplaySize(106, 106).setDepth(20);
    const bodyRadius = 34 / this.player.scaleX;
    const bodyOffset = (this.player.width - bodyRadius * 2) / 2;
    this.player.setCircle(bodyRadius, bodyOffset, bodyOffset).setBounce(0.02).setCollideWorldBounds(true).setDragX(0).setMaxVelocity(1400, 1450);
    this.playerBaseScale = { x: this.player.scaleX, y: this.player.scaleY };
    this.physics.add.collider(this.player, [this.ground, this.leftWall, this.rightWall]);
    this.physics.add.collider(this.player, this.stableGroup);
    this.physics.add.collider(this.player, this.fallingGroup);
    this.lastPlayerX = this.player.x;
    this.lastPlayerY = this.player.y;
  }

  createControls() {
    this.joystickBase = this.add.image(220, 1900, 'iconFrame').setDisplaySize(270, 270).setDepth(30);
    this.joystickKnob = this.add.circle(220, 1900, 52, 0x2bd7f0, 0.92).setDepth(31);
    this.joystickZone = this.add.zone(250, 1880, 500, 500).setInteractive().setDepth(32);
    this.dashButton = this.add.image(735, 1900, 'iconFrame').setDisplaySize(195, 195).setInteractive().setDepth(30);
    this.add.text(735, 1900, '»', textStyle(56)).setOrigin(0.5).setDepth(31);
    this.jumpButton = this.add.image(950, 1835, 'iconFrame').setDisplaySize(195, 195).setInteractive().setDepth(30);
    this.add.text(950, 1835, '↑', textStyle(65)).setOrigin(0.5).setDepth(31);
    this.add.text(735, 2035, '冲刺', textStyle(23)).setOrigin(0.5).setDepth(31);
    this.add.text(950, 1970, '跳跃', textStyle(22)).setOrigin(0.5).setDepth(31);
    this.joystickZone.on('pointerdown', (pointer) => { if (this.joystickPointer === null) { this.joystickPointer = pointer.id; this.updateJoystick(pointer); } });
    this.joystickZone.on('pointermove', (pointer) => { if (pointer.id === this.joystickPointer) this.updateJoystick(pointer); });
    this.jumpButton.on('pointerdown', () => {
      if (!this.roundStarted) return;
      this.jumpQueuedAt = this.time.now;
      this.pressButton(this.jumpButton);
    });
    this.dashButton.on('pointerdown', () => { this.tryDash(); this.pressButton(this.dashButton); });
    this.input.on('pointerup', (pointer) => { if (pointer.id === this.joystickPointer) this.resetJoystick(); });
    this.input.on('gameout', () => this.resetJoystick());
  }

  createInput() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('A,D,W,K,SPACE,SHIFT,R,ESC');
    this.input.keyboard.on('keydown-SPACE', () => { if (this.roundStarted) this.jumpQueuedAt = this.time.now; });
    this.input.keyboard.on('keydown-W', () => { if (this.roundStarted) this.jumpQueuedAt = this.time.now; });
    this.input.keyboard.on('keydown-SHIFT', () => this.tryDash());
    this.input.keyboard.on('keydown-K', () => this.tryDash());
    this.input.keyboard.on('keydown-R', () => this.scene.restart({ mode: this.mode, level: this.level }));
    this.input.keyboard.on('keydown-ESC', () => this.showPause());
  }

  showReady() {
    const ready = this.add.text(540, 960, `${MODE_NAMES[this.mode]}\n3`, { ...textStyle(64, '#74ecff'), lineSpacing: 24 }).setOrigin(0.5).setDepth(40);
    let number = 3;
    this.time.addEvent({
      delay: 650, repeat: 2,
      callback: () => {
        number -= 1;
        ready.setText(number > 0 ? `${MODE_NAMES[this.mode]}\n${number}` : '开始');
        ready.setScale(1.25).setAlpha(1);
        this.tweens.add({
          targets: ready,
          scale: 1,
          alpha: number > 0 ? 1 : 0,
          duration: 360,
          onComplete: () => {
            if (number > 0) return;
            ready.destroy();
            this.jumpQueuedAt = -Infinity;
            this.resetJoystick();
            this.roundStarted = true;
            this.nextSpawnAt = this.time.now + 600;
            this.physics.resume();
          },
        });
      },
    });
  }

  update(_time, delta) {
    if (!this.playing || this.paused || !this.roundStarted) return;
    const now = this.time.now;
    this.elapsed += delta / 1000;
    this.updatePlayer(now, delta);
    this.updatePiece(now, delta);
    this.updateRedline(delta);
    this.updateCrush(delta);
    this.updateHud();
    if (!this.currentPiece && now >= this.nextSpawnAt) this.spawnPiece();
    if (this.mode === 'survival' && this.elapsed >= survivalDuration(this.level)) this.finish(true, `第 ${this.level} 关  •  生存了 ${survivalDuration(this.level)} 秒`);
    if (this.mode === 'target' && this.targetCells >= targetGoal(this.level)) this.finish(true, `第 ${this.level} 关  •  清除了 ${targetGoal(this.level)} 个黄金目标`);
  }

  updatePlayer(now, delta) {
    const body = this.player.body;
    const grounded = body.blocked.down || body.touching.down;
    if (grounded) {
      this.coyoteUntil = now + CONFIG.coyoteMs;
      this.jumpsRemaining = CONFIG.maxJumps;
      this.airDash = 1;
    }
    let input = this.moveInput;
    if (this.keys.A.isDown || this.cursors.left.isDown) input -= 1;
    if (this.keys.D.isDown || this.cursors.right.isDown) input += 1;
    input = Phaser.Math.Clamp(input, -1, 1);
    if (now < this.dashUntil) {
      body.setVelocityX(this.dashDirection * CONFIG.dashSpeed);
    } else {
      const speed = grounded ? CONFIG.groundSpeed : CONFIG.airSpeed;
      const acceleration = grounded ? CONFIG.groundAcceleration : CONFIG.airAcceleration;
      body.setVelocityX(Phaser.Math.Linear(body.velocity.x, input * speed, Math.min(1, acceleration * delta / 1000 / Math.max(1, Math.abs(input * speed - body.velocity.x)))));
    }
    if (now - this.jumpQueuedAt <= CONFIG.jumpBufferMs && (now <= this.coyoteUntil || this.jumpsRemaining > 0)) {
      body.setVelocityY(-CONFIG.jumpVelocity);
      this.jumpsRemaining = now <= this.coyoteUntil ? CONFIG.maxJumps - 1 : this.jumpsRemaining - 1;
      this.coyoteUntil = 0;
      this.jumpQueuedAt = -Infinity;
      this.playSound('jump', 0.75);
      this.tweens.add({
        targets: this.player,
        scaleX: this.playerBaseScale.x * 0.88,
        scaleY: this.playerBaseScale.y * 1.14,
        duration: 90,
        yoyo: true,
      });
    }
    const dx = this.player.x - this.lastPlayerX;
    this.player.angle += dx * 0.85;
    this.lastPlayerX = this.player.x;
    this.preventBlockTunneling();
    this.enforcePlayerBounds();
    this.lastPlayerY = this.player.y;
  }

  tryDash() {
    const now = this.time.now;
    const grounded = this.player?.body && (this.player.body.blocked.down || this.player.body.touching.down);
    if (!this.playing || this.paused || !this.roundStarted || now < this.dashReadyAt || (!grounded && this.airDash <= 0)) return;
    let direction = this.moveInput;
    if (this.keys?.A.isDown || this.cursors?.left.isDown) direction = -1;
    if (this.keys?.D.isDown || this.cursors?.right.isDown) direction = 1;
    if (Math.abs(direction) < 0.1) direction = Math.sign(this.player.body.velocity.x) || 1;
    if (!grounded) this.airDash -= 1;
    this.dashDirection = Math.sign(direction);
    this.dashUntil = now + CONFIG.dashMs;
    this.dashReadyAt = now + CONFIG.dashCooldownMs;
    this.player.body.setVelocity(this.dashDirection * CONFIG.dashSpeed, 0);
    this.spawnDashAfterimages();
    this.playSound('dash', 0.8);
    this.cameras.main.shake(90, 0.0025);
  }

  spawnDashAfterimages() {
    this.time.addEvent({
      delay: 35,
      repeat: 4,
      callback: () => {
        if (!this.player?.active) return;
        const ghost = this.add.image(this.player.x, this.player.y, 'ball')
          .setDisplaySize(106, 106)
          .setAngle(this.player.angle)
          .setTint(0x59e6ff)
          .setAlpha(0.52)
          .setDepth(19);
        this.tweens.add({ targets: ghost, alpha: 0, duration: 200, onComplete: () => ghost.destroy() });
      },
    });
  }

  enforcePlayerBounds() {
    const body = this.player.body;
    const safe = constrainBallToBoard({
      x: this.player.x,
      y: this.player.y,
      velocityX: body.velocity.x,
      velocityY: body.velocity.y,
    }, {
      left: BOARD_LEFT,
      right: BOARD_LEFT + COLS * CELL,
      top: FRAME_TOP,
      bottom: BOARD_BOTTOM,
    }, 34);
    if (safe.x === this.player.x && safe.y === this.player.y) return;
    body.reset(safe.x, safe.y);
    body.setVelocity(safe.velocityX, safe.velocityY);
  }

  preventBlockTunneling() {
    const body = this.player.body;
    if (body.velocity.y <= 0) return;
    const supportTop = findCrossedSupportTop({
      previousY: this.lastPlayerY,
      currentY: this.player.y,
      x: this.player.x,
      radius: 34,
      cells: this.board.cells.values(),
      boardLeft: BOARD_LEFT,
      boardBottom: BOARD_BOTTOM,
      cellSize: CELL,
    });
    if (supportTop === null) return;
    const velocityX = body.velocity.x;
    body.reset(this.player.x, supportTop - 34);
    body.setVelocity(velocityX, 0);
  }

  spawnPiece() {
    const shapeIndex = this.chooseShape();
    const rotations = SHAPES[shapeIndex];
    const rotation = Phaser.Math.Between(0, rotations.length - 1);
    const offsets = rotations[rotation];
    const playerColumn = Math.floor((this.player.x - BOARD_LEFT) / CELL);
    const anchor = this.board.clampAnchor(offsets, playerColumn);
    const minY = Math.min(...offsets.map((cell) => cell.y));
    const spawnRow = Math.ceil(REDLINE_ROW) - minY;
    const target = this.mode === 'target' && this.spawnCount++ % 3 === 0;
    const colorIndex = target ? 3 : shapeIndex % 3;
    const piece = {
      offsets, anchor, spawnRow, landingRow: this.board.landingRow(offsets, anchor), target, colorIndex,
      phase: 'tracking', lockLeft: lockCountdown(this.elapsed) * 1000, cells: [], ghost: [], beam: null, countdown: null,
    };
    piece.beam = this.add.rectangle(this.columnX(anchor), (FRAME_TOP + BOARD_BOTTOM) / 2, CELL * 0.7, BOARD_BOTTOM - FRAME_TOP, 0x24eff3, 0.075).setDepth(2);
    for (const offset of offsets) {
      const sprite = this.physics.add.sprite(0, 0, 'square').setTint(COLORS[colorIndex]).setDisplaySize(CELL * 0.94, CELL * 0.94).setDepth(12);
      sprite.body.setAllowGravity(false).setImmovable(true).setSize((CELL * 0.88) / sprite.scaleX, (CELL * 0.88) / sprite.scaleY, true);
      this.fallingGroup.add(sprite);
      if (target) this.addTargetMarker(sprite);
      piece.cells.push(sprite);
      const ghost = this.add.image(0, 0, 'square').setDisplaySize(CELL * 0.9, CELL * 0.9).setAlpha(0.18).setTint(COLORS[colorIndex]).setDepth(3);
      piece.ghost.push(ghost);
    }
    piece.countdown = this.add.text(0, 0, String(Math.ceil(piece.lockLeft / 1000)), textStyle(44, '#ffd15a')).setOrigin(0.5).setDepth(14).setBackgroundColor('#291a09').setPadding(14, 7);
    this.currentPiece = piece;
    this.positionPiece(piece, spawnRow);
  }

  chooseShape() {
    if (this.board.cells.size < 6 || Math.random() > 0.5) return this.bag.next();
    let best = { shape: this.bag.next(), score: -Infinity };
    SHAPES.forEach((rotations, shape) => rotations.forEach((offsets) => {
      const xs = offsets.map((cell) => cell.x);
      for (let anchor = -Math.min(...xs); anchor <= COLS - 1 - Math.max(...xs); anchor += 1) {
        const row = this.board.landingRow(offsets, anchor);
        if (offsets.some((cell) => row + cell.y >= ROWS)) continue;
        const score = -row * 3 + offsets.reduce((sum, cell) => sum + (this.board.has(anchor + cell.x, row + cell.y - 1) ? 12 : 0), 0);
        if (score > best.score) best = { shape, score };
      }
    }));
    return best.shape;
  }

  updatePiece(now, delta) {
    const piece = this.currentPiece;
    if (!piece) return;
    if (piece.phase === 'tracking') {
      const column = Math.floor((this.player.x - BOARD_LEFT) / CELL);
      piece.anchor = this.board.clampAnchor(piece.offsets, column);
      piece.landingRow = this.board.landingRow(piece.offsets, piece.anchor);
      piece.lockLeft -= delta;
      piece.countdown.setText(String(Math.max(1, Math.ceil(piece.lockLeft / 1000))));
      this.positionPiece(piece, piece.spawnRow);
      if (piece.lockLeft <= 0) {
        piece.phase = 'locked';
        piece.lockAt = now + CONFIG.lockConfirmMs;
        piece.countdown.setVisible(false);
        piece.beam.setFillStyle(0xff321f, 0.13);
        this.tweens.add({ targets: [...piece.cells, piece.beam], alpha: { from: 0.45, to: 1 }, duration: 95, yoyo: true, repeat: 1 });
      }
    } else if (piece.phase === 'locked') {
      if (now >= piece.lockAt) {
        piece.phase = 'falling';
        piece.baseY = this.rowY(piece.spawnRow);
        piece.cells.forEach((cell) => cell.body.setVelocityY(fallSpeed(this.mode, this.level, this.elapsed) * CELL));
      }
    } else {
      const targetY = this.rowY(piece.landingRow);
      const baseY = piece.cells[0].y + piece.offsets[0].y * CELL;
      if (baseY >= targetY) {
        piece.cells.forEach((cell) => cell.body.stop());
        this.commitPiece(piece);
      }
    }
  }

  positionPiece(piece, row) {
    const baseX = this.columnX(piece.anchor);
    const baseY = this.rowY(row);
    piece.landingRow = this.board.landingRow(piece.offsets, piece.anchor);
    piece.offsets.forEach((offset, index) => {
      piece.cells[index].body.reset(baseX + offset.x * CELL, baseY - offset.y * CELL);
      piece.ghost[index].setPosition(baseX + offset.x * CELL, this.rowY(piece.landingRow) - offset.y * CELL);
    });
    piece.beam.x = baseX;
    const top = Math.max(...piece.offsets.map((cell) => cell.y));
    piece.countdown.setPosition(baseX, baseY - (top + 0.9) * CELL);
  }

  commitPiece(piece) {
    const absolute = piece.offsets.map((offset) => ({
      x: piece.anchor + offset.x, y: piece.landingRow + offset.y, colorIndex: piece.colorIndex, target: piece.target,
    }));
    const crossed = absolute.some((cell) => cell.y >= REDLINE_ROW);
    const clearingViews = [];
    for (const cell of absolute) {
      if (cell.y >= ROWS) continue;
      const view = this.createStableView(cell);
      this.board.set(cell.x, cell.y, { ...cell, view });
    }
    for (let y = 0; y < ROWS; y += 1) {
      if (Array.from({ length: COLS }, (_, x) => this.board.has(x, y)).every(Boolean)) {
        for (let x = 0; x < COLS; x += 1) clearingViews.push(this.board.get(x, y));
      }
    }
    const result = this.board.commit([]);
    this.destroyPiece(piece);
    this.currentPiece = null;
    if (crossed) { this.finish(false, '堆叠越过红线'); return; }
    if (result.clearedRows > 0) {
      const clearedTargets = clearingViews.filter((cell) => cell.target).length;
      this.targetCells += clearedTargets;
      this.lines += result.clearedRows;
      this.combo += 1;
      const values = [0, 100, 300, 600, 1000];
      this.score += values[Math.min(4, result.clearedRows)] * Math.max(1, this.combo);
      this.playSound('clear', 0.9);
      this.cameras.main.shake(220, 0.006 * result.clearedRows);
      clearingViews.forEach((cell, index) => this.tweens.add({
        targets: cell.view, alpha: 0, scale: 0.05, angle: index % 2 ? 16 : -16, delay: Math.abs(cell.x - 4.5) * 16, duration: 310,
        onComplete: () => cell.view.destroy(),
      }));
      this.time.delayedCall(330, () => this.repositionStableViews());
      if (this.tutorial) {
        save('tutorialComplete', 1);
        this.tutorial = false;
        this.tutorialText.setVisible(false);
        this.showTutorialComplete();
        return;
      }
    } else {
      this.combo = 0;
      this.playSound('land', 0.55);
    }
    this.nextSpawnAt = this.time.now + CONFIG.spawnGapMs;
  }

  createStableView(cell) {
    const sprite = this.stableGroup.create(this.columnX(cell.x), this.rowY(cell.y), 'square').setTint(COLORS[cell.colorIndex]).setDisplaySize(CELL * 0.94, CELL * 0.94).setDepth(8);
    sprite.refreshBody();
    if (cell.target) this.addTargetMarker(sprite);
    return sprite;
  }

  addTargetMarker(sprite) {
    const marker = this.add.image(0, 0, 'core').setDisplaySize(CELL * 0.22, CELL * 0.22).setDepth(sprite.depth + 1);
    sprite.marker = marker;
    const sync = () => marker.setPosition(sprite.x, sprite.y);
    sync();
    sprite.on('destroy', () => marker.destroy());
    this.events.on('postupdate', sync);
    marker.once('destroy', () => this.events.off('postupdate', sync));
  }

  repositionStableViews() {
    for (const cell of this.board.cells.values()) {
      if (!cell.view?.active) continue;
      this.tweens.add({
        targets: cell.view, x: this.columnX(cell.x), y: this.rowY(cell.y), duration: 240, ease: 'Cubic.Out',
        onUpdate: () => cell.view.marker?.setPosition(cell.view.x, cell.view.y),
        onComplete: () => cell.view.refreshBody(),
      });
    }
    this.nextSpawnAt = this.time.now + CONFIG.spawnGapMs;
  }

  destroyPiece(piece) {
    piece.cells.forEach((cell) => cell.destroy());
    piece.ghost.forEach((cell) => cell.destroy());
    piece.beam.destroy();
    piece.countdown.destroy();
  }

  updateRedline(delta) {
    const above = this.player.y - 38 <= REDLINE_Y;
    this.redlineDanger = Phaser.Math.Clamp(this.redlineDanger + (above ? delta : -delta * CONFIG.redlineRecovery), 0, CONFIG.redlineDangerMs);
    const danger = this.redlineDanger / CONFIG.redlineDangerMs;
    this.redline.setAlpha(above ? 0.7 + danger * 0.3 : 0.42);
    this.redlineGlow.setAlpha(above ? 0.1 + danger * 0.27 : 0.04);
    if (this.redlineDanger >= CONFIG.redlineDangerMs) this.finish(false, '红线警报');
  }

  updateCrush(delta) {
    const body = this.player.body;
    const vertical = (body.blocked.down || body.touching.down) && (body.blocked.up || body.touching.up);
    const horizontal = (body.blocked.left || body.touching.left) && (body.blocked.right || body.touching.right);
    this.crushTime = vertical || horizontal ? this.crushTime + delta : 0;
    if (this.crushTime >= CONFIG.crushConfirmMs) this.finish(false, '被方块挤压');
  }

  updateHud() {
    this.scoreText.setText(`分数  ${String(this.score).padStart(6, '0')}`);
    this.timeText.setText(`时间  ${Math.floor(this.elapsed)}`);
    this.linesText.setText(`消行  ${String(this.lines).padStart(2, '0')}`);
    if (this.mode === 'survival') {
      const duration = survivalDuration(this.level);
      this.objectiveText.setText(`第 ${this.level} 关  •  生存  ${Math.max(0, Math.ceil(duration - this.elapsed))}秒`);
    } else if (this.mode === 'target') {
      const goal = targetGoal(this.level);
      this.objectiveText.setText(`第 ${this.level} 关  •  ${this.targetCells}/${goal}`);
    } else {
      this.objectiveText.setText('无尽模式  •  填满整行即可消除');
    }
    const cooldown = Phaser.Math.Clamp((this.dashReadyAt - this.time.now) / CONFIG.dashCooldownMs, 0, 1);
    this.dashButton.setTint(cooldown > 0 ? 0x657681 : 0xffffff).setAlpha(cooldown > 0 ? 0.68 : 1);
  }

  showPause() {
    if (!this.playing || this.paused || !this.roundStarted) return;
    this.paused = true;
    this.physics.pause();
    const { root, top } = panelShell(this, '游戏暂停', { width: 880, height: 1100, headerHeight: 250 });
    root.add(this.add.text(540, top + 355, '系统暂停', textStyle(29)).setOrigin(0.5));
    root.add(this.add.text(540, top + 430, '当前游戏进度已安全暂停。', textStyle(27, '#c2ebff')).setOrigin(0.5));
    root.add(makeButton(this, 540, top + 650, 470, 94, '继续游戏', 0x137ea6, () => { root.destroy(); this.paused = false; this.physics.resume(); }, 30));
    root.add(makeButton(this, 540, top + 810, 470, 94, '重新开始', 0xe05239, () => this.scene.restart({ mode: this.mode, level: this.level }), 30));
    root.add(makeButton(this, 540, top + 970, 470, 94, '返回主页', 0x153d5c, () => this.scene.start('menu'), 30));
  }

  showTutorialComplete() {
    this.playing = false;
    this.physics.pause();
    const { root, top } = panelShell(this, '教学完成', { width: 840, height: 800, headerHeight: 240 });
    root.add(this.add.text(540, top + 390, '你已掌握堆叠与空间回收。', textStyle(30)).setOrigin(0.5));
    root.add(makeButton(this, 540, top + 650, 360, 100, '返回主页', 0x137ea6, () => this.scene.start('menu'), 31));
  }

  finish(victory, reason) {
    if (!this.playing) return;
    this.playing = false;
    this.physics.pause();
    this.resetJoystick();
    if (victory) unlockNext(this.mode, this.level);
    const bestScore = Math.max(this.score, numberValue('bestScore', 0));
    const bestTime = Math.max(this.elapsed, numberValue('bestTime', 0));
    save('bestScore', bestScore);
    save('bestTime', bestTime);
    if (!victory) {
      this.playSound('death', 1);
      this.cameras.main.flash(520, 255, 30, 45, false);
      this.cameras.main.shake(480, 0.014);
      this.tweens.add({
        targets: this.player,
        scaleX: this.playerBaseScale.x * 0.08,
        scaleY: this.playerBaseScale.y * 0.08,
        angle: this.player.angle + 180,
        alpha: 0,
        duration: 420,
      });
    } else {
      this.playSound('clear', 1);
    }
    this.time.delayedCall(victory ? 250 : 780, () => {
      const { root, top } = panelShell(this, victory ? '模式完成' : '本局结束', { width: 880, height: 1200, headerHeight: 250, depth: 120 });
      root.add(this.add.text(540, top + 430, `${reason}\n\n分数  ${this.score}\n时间  ${this.elapsed.toFixed(1)}秒\n最佳  ${bestScore}`, { ...textStyle(30), lineSpacing: 12 }).setOrigin(0.5));
      const hasPrimary = (victory && this.mode !== 'endless') || (!victory && !this.revived);
      if (victory && this.mode !== 'endless') root.add(makeButton(this, 540, top + 720, 500, 94, '下一关', 0x147ea6, () => this.scene.restart({ mode: this.mode, level: Math.min(this.level + 1, maxUnlocked(this.mode)) }), 29));
      if (!victory && !this.revived) root.add(makeButton(this, 540, top + 720, 500, 94, '直接复活', 0x147ea6, () => this.revive(root), 29));
      root.add(makeButton(this, 540, top + (hasPrimary ? 880 : 780), 470, 94, '重新开始', 0xe05239, () => this.scene.restart({ mode: this.mode, level: this.level }), 29));
      root.add(makeButton(this, 540, top + (hasPrimary ? 1040 : 940), 470, 94, '返回主页', 0x153d5c, () => this.scene.start('menu'), 29));
    });
  }

  revive(resultsRoot) {
    this.revived = true;
    resultsRoot.destroy();
    if (this.currentPiece) this.destroyPiece(this.currentPiece);
    this.currentPiece = null;
    const removed = this.board.purgeFromRow(3);
    removed.forEach((cell) => {
      if (!cell.view?.active) return;
      this.tweens.add({ targets: cell.view, alpha: 0, scale: 0.03, duration: 360, onComplete: () => cell.view.destroy() });
    });
    const scan = this.add.rectangle(540, this.rowY(3), COLS * CELL, 12, 0x8cffff, 0.9).setDepth(50);
    this.tweens.add({ targets: scan, y: FRAME_TOP, alpha: 0, duration: 620, onComplete: () => scan.destroy() });
    this.repositionStableViews();
    this.player.setVisible(true).setActive(true).setAlpha(1).setScale(this.playerBaseScale.x, this.playerBaseScale.y).setAngle(0);
    this.player.body.enable = true;
    this.player.body.reset(540, BOARD_BOTTOM - 42);
    this.player.body.setVelocity(0, 0);
    this.redlineDanger = 0;
    this.crushTime = 0;
    this.nextSpawnAt = this.time.now + 800;
    this.playing = true;
    this.paused = false;
    this.physics.resume();
  }

  updateJoystick(pointer) {
    const dx = Phaser.Math.Clamp(pointer.x - 220, -85, 85);
    this.moveInput = dx / 85;
    this.joystickKnob.x = 220 + dx;
  }

  resetJoystick() {
    this.joystickPointer = null;
    this.moveInput = 0;
    if (this.joystickKnob) this.joystickKnob.x = 220;
  }

  pressButton(button) {
    const baseX = button.scaleX;
    const baseY = button.scaleY;
    this.tweens.add({ targets: button, scaleX: baseX * 0.92, scaleY: baseY * 0.92, duration: 70, yoyo: true });
  }

  playSound(key, volume = 1) {
    if (this.soundEnabled && this.cache.audio.exists(key)) this.sound.play(key, { volume });
    if (key === 'death' && boolValue('haptics', true) && navigator.vibrate) navigator.vibrate(110);
  }

  columnX(column) { return BOARD_LEFT + (column + 0.5) * CELL; }
  rowY(row) { return BOARD_BOTTOM - (row + 0.5) * CELL; }
}
