export class Board {
  constructor(columns = 10, rows = 15) {
    this.columns = columns;
    this.rows = rows;
    this.cells = new Map();
  }

  key(x, y) { return `${x},${y}`; }
  has(x, y) { return this.cells.has(this.key(x, y)); }
  get(x, y) { return this.cells.get(this.key(x, y)); }
  set(x, y, value) { this.cells.set(this.key(x, y), { ...value, x, y }); }

  canPlace(offsets, anchor, row) {
    return offsets.every(({ x, y }) => {
      const cellX = anchor + x;
      const cellY = row + y;
      return cellX >= 0 && cellX < this.columns && cellY >= 0 && !this.has(cellX, cellY);
    });
  }

  clampAnchor(offsets, anchor) {
    const xs = offsets.map(({ x }) => x);
    return Math.max(-Math.min(...xs), Math.min(this.columns - 1 - Math.max(...xs), anchor));
  }

  landingRow(offsets, anchor) {
    let row = this.rows + 3;
    while (this.canPlace(offsets, anchor, row - 1)) row -= 1;
    return row;
  }

  purgeFromRow(firstRow) {
    const removed = [...this.cells.values()].filter((cell) => cell.y >= firstRow);
    const survivors = [...this.cells.values()].filter((cell) => cell.y < firstRow);
    this.cells.clear();
    for (let x = 0; x < this.columns; x += 1) {
      survivors
        .filter((cell) => cell.x === x)
        .sort((a, b) => a.y - b.y)
        .forEach((cell, y) => this.set(x, y, { ...cell, y }));
    }
    return removed;
  }

  commit(cells) {
    for (const cell of cells) {
      if (cell.y < this.rows) this.set(cell.x, cell.y, cell);
    }
    const fullRows = [];
    for (let y = 0; y < this.rows; y += 1) {
      if (Array.from({ length: this.columns }, (_, x) => this.has(x, y)).every(Boolean)) fullRows.push(y);
    }
    if (fullRows.length) {
      const next = new Map();
      for (const value of this.cells.values()) {
        if (fullRows.includes(value.y)) continue;
        const drop = fullRows.filter((row) => row < value.y).length;
        const moved = { ...value, y: value.y - drop };
        next.set(this.key(moved.x, moved.y), moved);
      }
      this.cells = next;
    }
    return { clearedRows: fullRows.length, rows: fullRows };
  }
}
