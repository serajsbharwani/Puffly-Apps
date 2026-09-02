export const FOUR_ROWS = 6;
export const FOUR_COLS = 7;
export const FOUR_STARTING_PIECES = 21;

function emptyGrid() {
  return Array.from({ length: FOUR_ROWS }, () => Array.from({ length: FOUR_COLS }, () => null));
}

export function createFourInARowInitialState() {
  return {
    grid: emptyGrid(),
    currentPlayer: "dark",
    winner: null,
    draw: false,
    selectedSquare: null,
    forcedPiece: null,
    lastMove: null,
    winningLine: [],
  };
}

export function getLandingRow(grid, col) {
  if (col < 0 || col >= FOUR_COLS) {
    return -1;
  }
  for (let row = FOUR_ROWS - 1; row >= 0; row -= 1) {
    if (!grid[row][col]) {
      return row;
    }
  }
  return -1;
}

export function getDroppableColumns(grid) {
  const columns = [];
  for (let col = 0; col < FOUR_COLS; col += 1) {
    if (getLandingRow(grid, col) >= 0) {
      columns.push(col);
    }
  }
  return columns;
}

function inBounds(row, col) {
  return row >= 0 && row < FOUR_ROWS && col >= 0 && col < FOUR_COLS;
}

function winnerLineFrom(grid, row, col, player) {
  const directions = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];
  for (const [dr, dc] of directions) {
    const line = [{ row, col }];
    for (let step = 1; step < 4; step += 1) {
      const nr = row + dr * step;
      const nc = col + dc * step;
      if (!inBounds(nr, nc) || grid[nr][nc] !== player) {
        break;
      }
      line.push({ row: nr, col: nc });
    }
    for (let step = 1; step < 4; step += 1) {
      const nr = row - dr * step;
      const nc = col - dc * step;
      if (!inBounds(nr, nc) || grid[nr][nc] !== player) {
        break;
      }
      line.push({ row: nr, col: nc });
    }
    if (line.length >= 4) {
      return line.slice(0, 4);
    }
  }
  return null;
}

function cloneGrid(grid) {
  return grid.map((row) => row.slice());
}

export function applyFourInARowDrop(state, col) {
  if (state.winner || state.draw) {
    return { ok: false, message: "Game over." };
  }
  const row = getLandingRow(state.grid, col);
  if (row < 0) {
    return { ok: false, message: "That column is full." };
  }
  const player = state.currentPlayer;
  const nextGrid = cloneGrid(state.grid);
  nextGrid[row][col] = player;
  const line = winnerLineFrom(nextGrid, row, col, player);
  const nextState = {
    ...state,
    grid: nextGrid,
    lastMove: { row, col, player },
    winningLine: line || [],
    winner: line ? player : null,
    draw: false,
    currentPlayer: player === "dark" ? "light" : "dark",
  };
  if (!line && getDroppableColumns(nextGrid).length === 0) {
    nextState.draw = true;
    nextState.currentPlayer = player;
  }
  return { ok: true, nextState, row, col };
}

function scoreWindow(window, player) {
  const opponent = player === "dark" ? "light" : "dark";
  let playerCount = 0;
  let opponentCount = 0;
  let emptyCount = 0;
  for (const cell of window) {
    if (cell === player) {
      playerCount += 1;
    } else if (cell === opponent) {
      opponentCount += 1;
    } else {
      emptyCount += 1;
    }
  }
  let score = 0;
  if (playerCount === 4) {
    score += 1000;
  } else if (playerCount === 3 && emptyCount === 1) {
    score += 14;
  } else if (playerCount === 2 && emptyCount === 2) {
    score += 4;
  }
  if (opponentCount === 3 && emptyCount === 1) {
    score -= 16;
  } else if (opponentCount === 2 && emptyCount === 2) {
    score -= 3;
  }
  return score;
}

function evaluateGrid(state, player) {
  if (state.winner === player) {
    return 2000;
  }
  if (state.winner) {
    return -2000;
  }
  let score = 0;
  const centerCol = Math.floor(FOUR_COLS / 2);
  for (let row = 0; row < FOUR_ROWS; row += 1) {
    if (state.grid[row][centerCol] === player) {
      score += 2;
    }
  }
  for (let row = 0; row < FOUR_ROWS; row += 1) {
    for (let col = 0; col < FOUR_COLS - 3; col += 1) {
      score += scoreWindow(
        [state.grid[row][col], state.grid[row][col + 1], state.grid[row][col + 2], state.grid[row][col + 3]],
        player,
      );
    }
  }
  for (let col = 0; col < FOUR_COLS; col += 1) {
    for (let row = 0; row < FOUR_ROWS - 3; row += 1) {
      score += scoreWindow(
        [state.grid[row][col], state.grid[row + 1][col], state.grid[row + 2][col], state.grid[row + 3][col]],
        player,
      );
    }
  }
  for (let row = 0; row < FOUR_ROWS - 3; row += 1) {
    for (let col = 0; col < FOUR_COLS - 3; col += 1) {
      score += scoreWindow(
        [state.grid[row][col], state.grid[row + 1][col + 1], state.grid[row + 2][col + 2], state.grid[row + 3][col + 3]],
        player,
      );
    }
  }
  for (let row = 3; row < FOUR_ROWS; row += 1) {
    for (let col = 0; col < FOUR_COLS - 3; col += 1) {
      score += scoreWindow(
        [state.grid[row][col], state.grid[row - 1][col + 1], state.grid[row - 2][col + 2], state.grid[row - 3][col + 3]],
        player,
      );
    }
  }
  return score;
}

function minimax(state, depth, maximizing, player, alpha, beta) {
  if (depth === 0 || state.winner || state.draw) {
    return evaluateGrid(state, player);
  }
  const columns = getDroppableColumns(state.grid);
  if (columns.length === 0) {
    return 0;
  }
  if (maximizing) {
    let best = -Infinity;
    for (const col of columns) {
      const result = applyFourInARowDrop(state, col);
      if (!result.ok) {
        continue;
      }
      const value = minimax(result.nextState, depth - 1, false, player, alpha, beta);
      best = Math.max(best, value);
      alpha = Math.max(alpha, best);
      if (beta <= alpha) {
        break;
      }
    }
    return best;
  }
  let best = Infinity;
  for (const col of columns) {
    const result = applyFourInARowDrop(state, col);
    if (!result.ok) {
      continue;
    }
    const value = minimax(result.nextState, depth - 1, true, player, alpha, beta);
    best = Math.min(best, value);
    beta = Math.min(beta, best);
    if (beta <= alpha) {
      break;
    }
  }
  return best;
}

function chooseWinningOrBlocking(state, player) {
  const columns = getDroppableColumns(state.grid);
  for (const col of columns) {
    const result = applyFourInARowDrop(state, col);
    if (result.ok && result.nextState.winner === player) {
      return col;
    }
  }
  const opponent = player === "dark" ? "light" : "dark";
  const opponentState = { ...state, currentPlayer: opponent };
  for (const col of columns) {
    const result = applyFourInARowDrop(opponentState, col);
    if (result.ok && result.nextState.winner === opponent) {
      return col;
    }
  }
  return null;
}

/** Columns where `player` would win immediately if it were their turn to drop. */
export function getImmediateWinningColumns(state, player) {
  const columns = getDroppableColumns(state.grid);
  const turnState = { ...state, currentPlayer: player };
  const wins = [];
  for (const col of columns) {
    const result = applyFourInARowDrop(turnState, col);
    if (result.ok && result.nextState.winner === player) {
      wins.push(col);
    }
  }
  return wins;
}

/** True when `col` is an immediate winning threat for `threatenedPlayer`. */
export function didBlockImmediateWin(stateBefore, col, threatenedPlayer) {
  return getImmediateWinningColumns(stateBefore, threatenedPlayer).includes(col);
}

/**
 * True when after `player`'s drop, every legal opponent reply still leaves
 * `player` with an immediate win (classic fork / unavoidable next-move win).
 */
export function isFourInARowUnavoidableWinTrap(stateAfter, player) {
  if (!stateAfter || stateAfter.winner || stateAfter.draw) {
    return false;
  }
  const opponent = player === "dark" ? "light" : "dark";
  const immediateThreats = getImmediateWinningColumns(stateAfter, player);
  if (immediateThreats.length >= 2) {
    return true;
  }
  const opponentColumns = getDroppableColumns(stateAfter.grid);
  if (opponentColumns.length === 0) {
    return false;
  }
  const opponentTurn = { ...stateAfter, currentPlayer: opponent };
  return opponentColumns.every((ocol) => {
    const oppPlay = applyFourInARowDrop(opponentTurn, ocol);
    if (!oppPlay.ok) {
      return true;
    }
    if (oppPlay.nextState.winner === opponent) {
      return false;
    }
    return getImmediateWinningColumns(oppPlay.nextState, player).length >= 1;
  });
}

/**
 * Classify Puffly's chosen drop for reaction triggers.
 * Block = played in a column where the opponent would have won next.
 * Trap = after the drop, Puffly wins no matter which legal column the opponent plays next
 *        (≥2 immediate threats, or every opponent reply still leaves a Puffly win).
 */
export function classifyFourInARowComputerMove(stateBefore, col, player) {
  const opponent = player === "dark" ? "light" : "dark";
  const isBlock = getImmediateWinningColumns(stateBefore, opponent).includes(col);
  const result = applyFourInARowDrop(stateBefore, col);
  if (!result.ok) {
    return { isBlock: false, isTrap: false, shouldPuff: false };
  }
  // Immediate win is not a "trap" reaction — leave Chest_Puff for blocks / forks.
  if (result.nextState.winner === player) {
    return { isBlock, isTrap: false, shouldPuff: isBlock };
  }
  const isTrap = isFourInARowUnavoidableWinTrap(result.nextState, player);
  return { isBlock, isTrap, shouldPuff: isBlock || isTrap };
}

export function chooseFourInARowComputerColumn(state, player, difficulty = "medium") {
  const columns = getDroppableColumns(state.grid);
  if (columns.length === 0) {
    return -1;
  }
  if (difficulty === "easy") {
    return columns[Math.floor(Math.random() * columns.length)];
  }
  const tactical = chooseWinningOrBlocking(state, player);
  if (tactical !== null) {
    return tactical;
  }
  if (difficulty === "medium") {
    const center = Math.floor(FOUR_COLS / 2);
    return [...columns].sort((a, b) => Math.abs(a - center) - Math.abs(b - center))[0];
  }
  let bestCol = columns[0];
  let bestScore = -Infinity;
  for (const col of columns) {
    const result = applyFourInARowDrop(state, col);
    if (!result.ok) {
      continue;
    }
    const score = minimax(result.nextState, 4, false, player, -Infinity, Infinity);
    if (score > bestScore) {
      bestScore = score;
      bestCol = col;
    }
  }
  return bestCol;
}
