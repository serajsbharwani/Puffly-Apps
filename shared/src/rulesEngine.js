import { BOARD_SIZE, cloneBoard, isDarkSquare, isInsideBoard } from "./gameState.js";

const MANDATORY_CAPTURE_ENABLED = true;

function movementDirections(piece) {
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
  for (const [dr, dc] of movementDirections(piece)) {
    const toRow = row + dr;
    const toCol = col + dc;
    if (!isInsideBoard(toRow, toCol)) {
      continue;
    }
    if (!board[toRow][toCol]) {
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
  for (const [dr, dc] of movementDirections(piece)) {
    const enemyRow = row + dr;
    const enemyCol = col + dc;
    const landingRow = row + dr * 2;
    const landingCol = col + dc * 2;

    if (!isInsideBoard(enemyRow, enemyCol) || !isInsideBoard(landingRow, landingCol)) {
      continue;
    }

    const enemyPiece = board[enemyRow][enemyCol];
    const landingPiece = board[landingRow][landingCol];
    if (
      enemyPiece &&
      enemyPiece.player !== piece.player &&
      !landingPiece
    ) {
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

function shouldPromote(piece, row) {
  if (piece.king) {
    return false;
  }
  return (piece.player === "dark" && row === BOARD_SIZE - 1) || (piece.player === "light" && row === 0);
}

export function getPlayerPieces(board, player) {
  const positions = [];
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const piece = board[row][col];
      if (piece && piece.player === player) {
        positions.push({ row, col, piece });
      }
    }
  }
  return positions;
}

export function getAllLegalMovesForPlayer(state, player = state.currentPlayer) {
  const { board } = state;

  if (state.forcedPiece) {
    const { row, col } = state.forcedPiece;
    if (!isDarkSquare(row, col)) {
      // Forced captures can only originate from playable dark squares.
      // Ignore corrupted/stale forced positions so the turn cannot hard-lock.
    } else {
    const forcedPiece = isInsideBoard(row, col) ? board[row][col] : null;
    if (forcedPiece && forcedPiece.player === player) {
      const forcedCaptures = getPieceCaptures(board, row, col);
      if (forcedCaptures.length > 0) {
        return {
          hasMandatoryCapture: true,
          movesByOrigin: {
            [`${row},${col}`]: forcedCaptures,
          },
          allMoves: forcedCaptures,
        };
      }
    }
    }
  }

  const pieces = getPlayerPieces(board, player);
  const capturesByPiece = {};
  let captureCount = 0;

  for (const pos of pieces) {
    const captures = getPieceCaptures(board, pos.row, pos.col);
    if (captures.length > 0) {
      capturesByPiece[`${pos.row},${pos.col}`] = captures;
      captureCount += captures.length;
    }
  }

  if (captureCount > 0 && MANDATORY_CAPTURE_ENABLED) {
    return {
      hasMandatoryCapture: true,
      movesByOrigin: capturesByPiece,
      allMoves: Object.values(capturesByPiece).flat(),
    };
  }

  const movesByPiece = {};
  for (const pos of pieces) {
    const moves = getPieceMoves(board, pos.row, pos.col);
    if (moves.length > 0) {
      movesByPiece[`${pos.row},${pos.col}`] = moves;
    }
  }

  if (captureCount > 0 && !MANDATORY_CAPTURE_ENABLED) {
    for (const [origin, captures] of Object.entries(capturesByPiece)) {
      movesByPiece[origin] = [...(movesByPiece[origin] ?? []), ...captures];
    }
  }

  return {
    hasMandatoryCapture: false,
    movesByOrigin: movesByPiece,
    allMoves: Object.values(movesByPiece).flat(),
  };
}

export function getLegalMovesForPiece(state, row, col) {
  const piece = state.board[row][col];
  if (!piece || piece.player !== state.currentPlayer) {
    return [];
  }

  const legal = getAllLegalMovesForPlayer(state, state.currentPlayer);
  return legal.movesByOrigin[`${row},${col}`] ?? [];
}

function opponent(player) {
  return player === "dark" ? "light" : "dark";
}

function evaluateWinner(nextState) {
  const darkPieces = getPlayerPieces(nextState.board, "dark");
  const lightPieces = getPlayerPieces(nextState.board, "light");
  if (darkPieces.length === 0) {
    return "light";
  }
  if (lightPieces.length === 0) {
    return "dark";
  }

  const activePlayerMoves = getAllLegalMovesForPlayer(nextState, nextState.currentPlayer);
  if (activePlayerMoves.allMoves.length === 0) {
    return opponent(nextState.currentPlayer);
  }

  return null;
}

export function getWinnerForState(state) {
  return evaluateWinner(state);
}

export function applyMove(state, move) {
  if (state.winner) {
    return { nextState: state, status: `Game over: ${state.winner} already won.` };
  }

  const legalMoves = getLegalMovesForPiece(state, move.from.row, move.from.col);
  const selectedMove = legalMoves.find(
    (candidate) =>
      candidate.to.row === move.to.row &&
      candidate.to.col === move.to.col &&
      Boolean(candidate.isCapture) === Boolean(move.isCapture),
  );

  if (!selectedMove) {
    return { nextState: state, status: "That move is not legal." };
  }

  const board = cloneBoard(state.board);
  const movingPiece = { ...board[selectedMove.from.row][selectedMove.from.col] };
  board[selectedMove.from.row][selectedMove.from.col] = null;
  board[selectedMove.to.row][selectedMove.to.col] = movingPiece;

  if (selectedMove.capture) {
    board[selectedMove.capture.row][selectedMove.capture.col] = null;
  }

  if (shouldPromote(movingPiece, selectedMove.to.row)) {
    movingPiece.king = true;
  }

  let nextPlayer = opponent(state.currentPlayer);
  let forcedPiece = null;
  let status = selectedMove.capture
    ? "Piece captured."
    : `${state.currentPlayer} moved.`;

  if (selectedMove.capture && MANDATORY_CAPTURE_ENABLED) {
    const followUpCaptures = getPieceCaptures(board, selectedMove.to.row, selectedMove.to.col);
    if (followUpCaptures.length > 0) {
      nextPlayer = state.currentPlayer;
      forcedPiece = { row: selectedMove.to.row, col: selectedMove.to.col };
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
      from: selectedMove.from,
      to: selectedMove.to,
      capture: selectedMove.capture ?? null,
    },
  };

  const winner = evaluateWinner(nextState);
  nextState.winner = winner;
  if (winner) {
    status = `Game over! ${winner} wins.`;
  }

  return { nextState, status };
}
