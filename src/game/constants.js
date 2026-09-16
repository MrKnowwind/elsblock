export const WIDTH = 1080;
export const HEIGHT = 2160;
export const COLS = 10;
export const ROWS = 15;
export const HIDDEN_ROWS = 3;
export const CELL = 82;
export const BOARD_LEFT = 130;
export const BOARD_BOTTOM = 1590;
export const BOARD_TOP = BOARD_BOTTOM - ROWS * CELL;
export const FRAME_TOP = BOARD_TOP;
export const REDLINE_ROW = 12;
export const REDLINE_Y = BOARD_BOTTOM - REDLINE_ROW * CELL;

export const COLORS = [0x42c9ad, 0x4f79d4, 0xf06e39, 0xffb21b];

export const CONFIG = {
  groundSpeed: 430,
  airSpeed: 395,
  groundAcceleration: 3500,
  airAcceleration: 2300,
  jumpVelocity: 1000,
  maxJumps: 2,
  coyoteMs: 100,
  jumpBufferMs: 120,
  dashSpeed: 1110,
  dashMs: 160,
  dashCooldownMs: 1050,
  lockConfirmMs: 240,
  spawnGapMs: 850,
  redlineDangerMs: 3000,
  redlineRecovery: 1.75,
  crushConfirmMs: 60,
};
