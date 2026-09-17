export const SHAPES = [
  [[[-1, 0], [0, 0], [1, 0], [2, 0]], [[0, -1], [0, 0], [0, 1], [0, 2]]],
  [[[0, 0], [1, 0], [0, 1], [1, 1]]],
  [[[0, 0], [1, 0], [0, 1], [0, 2]]],
  [[[-1, 0], [0, 0], [1, 0]], [[0, -1], [0, 0], [0, 1]]],
  [[[-1, 0], [0, 0], [0, 1], [0, 2]]],
  [[[0, 0], [1, 0], [0, 1]]],
  [[[-1, 0], [0, 0], [0, 1]]],
  [[[0, 0], [0, 1], [0, 2], [1, 2]]],
  [[[0, 0], [0, 1], [0, 2], [-1, 2]]],
  [[[0, 0], [0, 1], [1, 1]]],
  [[[0, 0], [0, 1], [-1, 1]]],
  [[[-1, 1], [0, 1], [0, 0], [1, 0]]],
  [[[-1, 0], [0, 0], [0, 1], [1, 1]]],
].map((rotations) => rotations.map((cells) => cells.map(([x, y]) => ({ x, y }))));

export class PieceBag {
  constructor(random = Math.random) {
    this.random = random;
    this.queue = [];
  }

  next() {
    if (this.random() < 0.2) return 7 + Math.floor(this.random() * 6);
    if (!this.queue.length) {
      this.queue = [0, 1, 2, 3, 4, 5, 6];
      for (let i = this.queue.length - 1; i > 0; i -= 1) {
        const j = Math.floor(this.random() * (i + 1));
        [this.queue[i], this.queue[j]] = [this.queue[j], this.queue[i]];
      }
    }
    return this.queue.shift();
  }
}

export const survivalDuration = (level) => 90 + (Math.max(1, level) - 1) * 15;
export const targetGoal = (level) => 12 + (Math.max(1, level) - 1) * 4;
export const lockCountdown = (elapsed) => Math.max(3, 5 - Math.floor(Math.max(0, elapsed) / 120));
export const fallSpeed = (mode, level, elapsed) => Math.min(6.9, 5.5 + (mode === 'endless' ? Math.floor(elapsed / 60) : Math.floor((Math.max(1, level) - 1) / 5)) * 0.2);

export function advanceFall({ baseY, targetY, pixelsPerSecond, deltaMs }) {
  const nextY = Math.min(targetY, baseY + pixelsPerSecond * Math.max(0, deltaMs) / 1000);
  return { baseY: nextY, landed: nextY >= targetY };
}

export function constrainBallToBoard(ball, bounds, radius) {
  const minX = bounds.left + radius;
  const maxX = bounds.right - radius;
  const minY = bounds.top + radius;
  const maxY = bounds.bottom - radius;
  const x = Math.min(maxX, Math.max(minX, ball.x));
  const y = Math.min(maxY, Math.max(minY, ball.y));
  return {
    x,
    y,
    velocityX: x === ball.x ? ball.velocityX : 0,
    velocityY: y === ball.y ? ball.velocityY : 0,
  };
}

export function findCrossedSupportTop({ previousY, currentY, x, radius, cells, boardLeft, boardBottom, cellSize }) {
  if (currentY <= previousY) return null;
  const previousBottom = previousY + radius;
  const currentBottom = currentY + radius;
  let firstTop = null;
  for (const cell of cells) {
    const left = boardLeft + cell.x * cellSize;
    const right = left + cellSize;
    if (x + radius <= left || x - radius >= right) continue;
    const top = boardBottom - (cell.y + 1) * cellSize;
    if (previousBottom > top || currentBottom < top) continue;
    if (firstTop === null || top < firstTop) firstTop = top;
  }
  return firstTop;
}
