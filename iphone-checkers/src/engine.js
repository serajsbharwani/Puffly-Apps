export const BOARD_SIZE = 8;

let idCounter = 0;
function nextId() {
  idCounter += 1;
  return `piece-${idCounter}`;
}

export function isDarkSquare(row, col) {
  return (row + col) % 2 === 1;
}

function inside(row, col) {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

function cloneBoard(board) {
  return board.map((row) => row.map((piece) => (piece ? { ...piece } : null)));
}

export function createInitialBoard() {
  const board = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => null),
  );

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      if (!isDarkSquare(row, col)) {
        continue;
      }
      if (row <= 2) {
        board[row][col] = { id: nextId(), player: "dark", king: false };
      } else if (row >= 5) {
        board[row][col] = { id: nextId(), player: "light", king: false };
      }
    }
  }
  return board;
}

export function createInitialState() {
  return {
    board: createInitialBoard(),
    currentPlayer: "dark",
    selectedSquare: null,
    forcedPiece: null,
    winner: null,
    lastMove: null,
  };
}

function directions(piece) {
  if (piece.king) {
    return [
      [1, -1],
      [1, 1],
      [-1, -1],
      [-1, 1],
    ];
  }
  return piece.player === "dark"
    ? [
        [1, -1],
        [1, 1],
      ]
    : [
        [-1, -1],
        [-1, 1],
      ];
}

function getPieceMoves(board, row, col) {
  const piece = board[row][col];
  if (!piece) {
    return [];
  }
  const moves = [];
  for (const [dr, dc] of directions(piece)) {
    const toRow = row + dr;
    const toCol = col + dc;
    if (inside(toRow, toCol) && !board[toRow][toCol]) {
      moves.push({
        from: { row, col },
        to: { row: toRow, col: toCol },
        isCapture: false,
      });
    }
  }
  return moves;
}

function getPieceCaptures(board, row, col) {
  const piece = board[row][col];
  if (!piece) {
    return [];
  }
  const captures = [];
  for (const [dr, dc] of directions(piece)) {
    const enemyRow = row + dr;
    const enemyCol = col + dc;
    const landingRow = row + dr * 2;
    const landingCol = col + dc * 2;
    if (!inside(enemyRow, enemyCol) || !inside(landingRow, landingCol)) {
      continue;
    }
    const enemy = board[enemyRow][enemyCol];
    if (enemy && enemy.player !== piece.player && !board[landingRow][landingCol]) {
      captures.push({
        from: { row, col },
        to: { row: landingRow, col: landingCol },
        capture: { row: enemyRow, col: enemyCol },
        isCapture: true,
      });
    }
  }
  return captures;
}

function getPlayerPieces(board, player) {
  const out = [];
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const piece = board[row][col];
      if (piece && piece.player === player) {
        out.push({ row, col, piece });
      }
    }
  }
  return out;
}

function countMaterial(board, player) {
  let score = 0;
  for (const row of board) {
    for (const piece of row) {
      if (!piece || piece.player !== player) {
        continue;
      }
      score += piece.king ? 5 : 3;
    }
  }
  return score;
}

export function getAllLegalMovesForPlayer(state, player = state.currentPlayer) {
  const { board } = state;

  if (state.forcedPiece) {
    const forced = getPieceCaptures(board, state.forcedPiece.row, state.forcedPiece.col);
    return {
      hasMandatoryCapture: forced.length > 0,
      movesByOrigin: { [`${state.forcedPiece.row},${state.forcedPiece.col}`]: forced },
      allMoves: forced,
    };
  }

  const pieces = getPlayerPieces(board, player);
  const capturesByOrigin = {};
  let captureCount = 0;
  for (const pos of pieces) {
    const captures = getPieceCaptures(board, pos.row, pos.col);
    if (captures.length > 0) {
      capturesByOrigin[`${pos.row},${pos.col}`] = captures;
      captureCount += captures.length;
    }
  }
  if (captureCount > 0) {
    return {
      hasMandatoryCapture: true,
      movesByOrigin: capturesByOrigin,
      allMoves: Object.values(capturesByOrigin).flat(),
    };
  }

  const movesByOrigin = {};
  for (const pos of pieces) {
    const moves = getPieceMoves(board, pos.row, pos.col);
    if (moves.length > 0) {
      movesByOrigin[`${pos.row},${pos.col}`] = moves;
    }
  }
  return {
    hasMandatoryCapture: false,
    movesByOrigin,
    allMoves: Object.values(movesByOrigin).flat(),
  };
}

export function getLegalMovesForPiece(state, row, col) {
  const piece = state.board[row][col];
  if (!piece || piece.player !== state.currentPlayer) {
    return [];
  }
  const all = getAllLegalMovesForPlayer(state, state.currentPlayer);
  return all.movesByOrigin[`${row},${col}`] ?? [];
}

function opponent(player) {
  return player === "dark" ? "light" : "dark";
}

function shouldPromote(piece, row) {
  if (piece.king) {
    return false;
  }
  return (piece.player === "dark" && row === 7) || (piece.player === "light" && row === 0);
}

function evaluateWinner(state) {
  const dark = getPlayerPieces(state.board, "dark");
  const light = getPlayerPieces(state.board, "light");
  if (dark.length === 0) {
    return "light";
  }
  if (light.length === 0) {
    return "dark";
  }
  const legal = getAllLegalMovesForPlayer(state, state.currentPlayer);
  if (legal.allMoves.length === 0) {
    return opponent(state.currentPlayer);
  }
  return null;
}

export function applyMove(state, move) {
  if (state.winner) {
    return { nextState: state, status: `Game over: ${state.winner} already won.` };
  }
  const legal = getLegalMovesForPiece(state, move.from.row, move.from.col);
  const selected = legal.find(
    (m) =>
      m.to.row === move.to.row &&
      m.to.col === move.to.col &&
      Boolean(m.isCapture) === Boolean(move.isCapture),
  );
  if (!selected) {
    return { nextState: state, status: "That move is not legal." };
  }

  const board = cloneBoard(state.board);
  const movingPiece = { ...board[selected.from.row][selected.from.col] };
  board[selected.from.row][selected.from.col] = null;
  board[selected.to.row][selected.to.col] = movingPiece;
  if (selected.capture) {
    board[selected.capture.row][selected.capture.col] = null;
  }
  if (shouldPromote(movingPiece, selected.to.row)) {
    movingPiece.king = true;
  }

  let nextPlayer = opponent(state.currentPlayer);
  let forcedPiece = null;
  let status = selected.capture ? "Piece captured." : `${state.currentPlayer} moved.`;

  if (selected.capture) {
    const chainCaptures = getPieceCaptures(board, selected.to.row, selected.to.col);
    if (chainCaptures.length > 0) {
      nextPlayer = state.currentPlayer;
      forcedPiece = { row: selected.to.row, col: selected.to.col };
      status = "Great jump! Continue capturing with the same piece.";
    }
  }

  const nextState = {
    ...state,
    board,
    currentPlayer: nextPlayer,
    selectedSquare: forcedPiece,
    forcedPiece,
    winner: null,
    lastMove: {
      from: selected.from,
      to: selected.to,
      capture: selected.capture ?? null,
    },
  };
  nextState.winner = evaluateWinner(nextState);
  if (nextState.winner) {
    status = `Game over! ${nextState.winner} wins.`;
  }
  return { nextState, status };
}

function scoreMove(state, move) {
  let score = 0;
  if (move.isCapture) {
    score += 12;
  }
  const piece = state.board[move.from.row][move.from.col];
  const promotionRow = piece?.player === "dark" ? 7 : 0;
  if (piece && !piece.king && move.to.row === promotionRow) {
    score += 7;
  }
  const centerDistance = Math.abs(3.5 - move.to.col);
  score += 3 - centerDistance * 0.7;
  return score;
}

function evaluateState(state, computerPlayer) {
  if (state.winner === computerPlayer) {
    return 10000;
  }
  if (state.winner && state.winner !== computerPlayer) {
    return -10000;
  }
  const enemy = opponent(computerPlayer);
  const myMaterial = countMaterial(state.board, computerPlayer);
  const enemyMaterial = countMaterial(state.board, enemy);
  const myMobility = getAllLegalMovesForPlayer(state, computerPlayer).allMoves.length;
  const enemyMobility = getAllLegalMovesForPlayer(state, enemy).allMoves.length;
  return (myMaterial - enemyMaterial) * 2 + (myMobility - enemyMobility) * 0.2;
}

function minimaxScore(state, computerPlayer, depth) {
  if (depth === 0 || state.winner) {
    return evaluateState(state, computerPlayer);
  }
  const legal = getAllLegalMovesForPlayer(state, state.currentPlayer).allMoves;
  if (legal.length === 0) {
    return evaluateState(state, computerPlayer);
  }
  const maximizing = state.currentPlayer === computerPlayer;
  let best = maximizing ? -Infinity : Infinity;
  for (const move of legal) {
    const result = applyMove(state, move);
    const score = minimaxScore(result.nextState, computerPlayer, depth - 1);
    best = maximizing ? Math.max(best, score) : Math.min(best, score);
  }
  return best;
}

function randomChoice(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function deterministicChoice(items) {
  const ranked = [...items].sort((a, b) =>
    `${a.from.row}${a.from.col}${a.to.row}${a.to.col}`.localeCompare(
      `${b.from.row}${b.from.col}${b.to.row}${b.to.col}`,
    ),
  );
  return ranked[0];
}

export function chooseComputerMove(state, computerPlayer = "dark", difficulty = "medium") {
  const legal = getAllLegalMovesForPlayer(state, computerPlayer).allMoves;
  if (legal.length === 0) {
    return null;
  }

  if (difficulty === "easy") {
    return randomChoice(legal);
  }

  if (difficulty === "hard") {
    let bestScore = -Infinity;
    let bestMoves = [];
    for (const move of legal) {
      const result = applyMove(state, move);
      const score = minimaxScore(result.nextState, computerPlayer, 2);
      if (score > bestScore) {
        bestScore = score;
        bestMoves = [move];
      } else if (score === bestScore) {
        bestMoves.push(move);
      }
    }
    return deterministicChoice(bestMoves);
  }

  const scored = legal
    .map((move) => ({ move, score: scoreMove(state, move) }))
    .sort((a, b) => b.score - a.score);
  const topScore = scored[0].score;
  const bestMoves = scored.filter((entry) => entry.score === topScore).map((entry) => entry.move);
  return deterministicChoice(bestMoves);
}
