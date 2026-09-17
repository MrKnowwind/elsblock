import test from 'node:test';
import assert from 'node:assert/strict';
import { Board } from '../src/game/Board.js';
import {
  PieceBag, advanceFall, constrainBallToBoard, fallSpeed, findCrossedSupportTop, pieceOccupiesBall,
} from '../src/game/rules.js';

test('a committed full layer clears and everything above collapses', () => {
  const board = new Board(10, 15);
  for (let x = 0; x < 9; x += 1) board.set(x, 0, { color: 0x22d9ef });
  board.set(9, 1, { color: 0xff9d19 });

  const result = board.commit([{ x: 9, y: 0 }]);

  assert.equal(result.clearedRows, 1);
  assert.equal(board.has(9, 0), true);
  assert.equal(board.has(9, 1), false);
});

test('landing row stops a tetromino on the highest occupied cell', () => {
  const board = new Board(10, 15);
  board.set(4, 0, { color: 0xffffff });
  board.set(4, 1, { color: 0xffffff });

  const row = board.landingRow([{ x: 0, y: 0 }, { x: 0, y: 1 }], 4);

  assert.equal(row, 2);
});

test('the common-piece bag yields all seven pieces before repeating', () => {
  const bag = new PieceBag(() => 0.5);
  const pieces = Array.from({ length: 7 }, () => bag.next());
  assert.equal(new Set(pieces).size, 7);
});

test('a revive reward purges dangerous rows and compacts each column', () => {
  const board = new Board(10, 15);
  board.set(2, 1, { id: 'low' });
  board.set(2, 4, { id: 'danger' });
  board.set(5, 2, { id: 'safe' });

  const removed = board.purgeFromRow(3);

  assert.deepEqual(removed.map((cell) => cell.id), ['danger']);
  assert.equal(board.get(2, 0).id, 'low');
  assert.equal(board.get(5, 0).id, 'safe');
  assert.equal(board.cells.size, 2);
});

test('jump and dash cannot move the ball center outside the playfield', () => {
  const bounds = { left: 130, right: 950, top: 360, bottom: 1590 };

  assert.deepEqual(
    constrainBallToBoard({ x: 1000, y: 1640, velocityX: 1110, velocityY: 900 }, bounds, 34),
    { x: 916, y: 1556, velocityX: 0, velocityY: 0 },
  );
  assert.deepEqual(
    constrainBallToBoard({ x: 80, y: 300, velocityX: -1110, velocityY: -1000 }, bounds, 34),
    { x: 164, y: 394, velocityX: 0, velocityY: 0 },
  );
});

test('a fast falling ball lands on the first block top crossed between frames', () => {
  const cells = [{ x: 4, y: 0 }, { x: 4, y: 2 }, { x: 8, y: 1 }];

  assert.equal(findCrossedSupportTop({
    previousY: 1280,
    currentY: 1500,
    x: 499,
    radius: 34,
    cells,
    boardLeft: 130,
    boardBottom: 1590,
    cellSize: 82,
  }), 1344);
  assert.equal(findCrossedSupportTop({
    previousY: 1280,
    currentY: 1500,
    x: 700,
    radius: 34,
    cells,
    boardLeft: 130,
    boardBottom: 1590,
    cellSize: 82,
  }), null);
});

test('falling pieces reach their landing row in every mode even when a child body is obstructed', () => {
  for (const mode of ['survival', 'target', 'endless']) {
    const result = advanceFall({
      baseY: 400,
      targetY: 1400,
      pixelsPerSecond: fallSpeed(mode, 1, 33) * 82,
      deltaMs: 3000,
    });

    assert.deepEqual(result, { baseY: 1400, landed: true }, mode);
  }
});

test('a piece cannot lock into the ball, while resting contact remains safe', () => {
  const placement = {
    cells: [{ x: 2, y: 0 }],
    boardLeft: 130,
    boardBottom: 1590,
    cellSize: 82,
    ballRadius: 34,
  };
  const cellCenterX = 130 + 2.5 * 82;
  const cellCenterY = 1590 - 0.5 * 82;
  const blockTop = cellCenterY - 82 * 0.44;

  assert.equal(pieceOccupiesBall({ ...placement, ballX: cellCenterX, ballY: cellCenterY }), true);
  assert.equal(pieceOccupiesBall({ ...placement, ballX: cellCenterX, ballY: blockTop - 34 }), false);
});
