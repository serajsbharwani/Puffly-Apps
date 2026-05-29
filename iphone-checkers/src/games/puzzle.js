export const PUZZLE_ROWS = 4;
export const PUZZLE_COLS = 4;
export const PUZZLE_PIECE_COUNT = PUZZLE_ROWS * PUZZLE_COLS;
export const PUZZLE_IMAGE_URL = "/Puffly%20Puzzle/Puffly%20Puzzle%20V2.svg";
export const PUZZLE_DIFFICULTY_GRID = {
  easy: 2,
  medium: 4,
  hard: 5,
};
export const PUZZLE_ALLOWED_GRID_SIZES = [2, 4, 5];

function shuffled(values) {
  const out = values.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function getPuzzleGridSizeForDifficulty(difficulty = "medium") {
  return PUZZLE_DIFFICULTY_GRID[difficulty] || PUZZLE_DIFFICULTY_GRID.medium;
}

export function getPuzzlePieceCountForGrid(size) {
  return size * size;
}

export function createPuzzleInitialState(options = {}) {
  const requestedSize = Number(options?.size || getPuzzleGridSizeForDifficulty(options?.difficulty));
  const gridSize = PUZZLE_ALLOWED_GRID_SIZES.includes(requestedSize) ? requestedSize : PUZZLE_DIFFICULTY_GRID.medium;
  const rows = gridSize;
  const cols = gridSize;
  const pieceCount = getPuzzlePieceCountForGrid(gridSize);
  const darkCount = Math.floor(pieceCount / 2);
  const indices = shuffled(Array.from({ length: pieceCount }, (_, i) => i));
  const pieces = indices.map((index, order) => {
    const correctRow = Math.floor(index / cols);
    const correctCol = index % cols;
    return {
      id: `pz-${index + 1}`,
      correctRow,
      correctCol,
      owner: order < darkCount ? "dark" : "light",
      placed: false,
      placedRow: null,
      placedCol: null,
      locked: false,
    };
  });
  return {
    rows,
    cols,
    pieces,
    currentPlayer: "dark",
    selectedSquare: null,
    forcedPiece: null,
    winner: null,
    draw: false,
    lastMove: null,
  };
}

function nextPlayer(player) {
  return player === "dark" ? "light" : "dark";
}

function remainingByOwnerFromPieces(pieces) {
  let dark = 0;
  let light = 0;
  for (const piece of pieces || []) {
    if (piece?.placed) {
      continue;
    }
    if (piece?.owner === "dark") {
      dark += 1;
    } else if (piece?.owner === "light") {
      light += 1;
    }
  }
  return { dark, light };
}

export function getPuzzlePiece(state, pieceId) {
  return (state.pieces || []).find((piece) => piece.id === pieceId) || null;
}

export function getPuzzleRemainingByOwner(state, owner) {
  return (state.pieces || []).filter((piece) => piece.owner === owner && !piece.placed);
}

export function normalizePuzzleTurn(state) {
  if (!state || !Array.isArray(state.pieces)) {
    return state;
  }
  if (state.winner || state.draw) {
    return state;
  }
  const remaining = remainingByOwnerFromPieces(state.pieces);
  if (remaining.dark > 0 && remaining.light > 0) {
    return state;
  }
  if (remaining.dark === 0 && remaining.light === 0) {
    return state;
  }
  const expected = remaining.dark > 0 ? "dark" : "light";
  if (state.currentPlayer === expected) {
    return state;
  }
  return {
    ...state,
    currentPlayer: expected,
  };
}

export function applyPuzzlePlacement(state, pieceId, row, col) {
  if (!state || !Array.isArray(state.pieces)) {
    return { ok: false, message: "Puzzle state unavailable." };
  }
  const index = state.pieces.findIndex((piece) => piece.id === pieceId);
  if (index < 0) {
    return { ok: false, message: "Piece not found." };
  }
  const piece = state.pieces[index];
  if (piece.placed) {
    return { ok: false, message: "That piece is already placed." };
  }
  if (piece.owner !== state.currentPlayer) {
    return { ok: false, message: "It's not your turn to place that piece." };
  }
  if (piece.correctRow !== row || piece.correctCol !== col) {
    return { ok: false, message: "Doesn't fit there." };
  }

  const pieces = state.pieces.map((entry, idx) =>
    idx === index
      ? {
          ...entry,
          placed: true,
          placedRow: row,
          placedCol: col,
          locked: true,
        }
      : entry,
  );
  const allPlaced = pieces.every((entry) => entry.placed);
  const remaining = remainingByOwnerFromPieces(pieces);
  let nextTurn = nextPlayer(state.currentPlayer);
  if (!allPlaced && remaining[nextTurn] === 0 && remaining[state.currentPlayer] > 0) {
    nextTurn = state.currentPlayer;
  }
  const nextState = {
    ...state,
    pieces,
    currentPlayer: allPlaced ? state.currentPlayer : nextTurn,
    lastMove: {
      pieceId,
      row,
      col,
      by: state.currentPlayer,
    },
    winner: allPlaced ? state.currentPlayer : null,
    draw: allPlaced,
  };
  return {
    ok: true,
    nextState,
    message: allPlaced ? "Puzzle complete!" : `${nextTurn === "dark" ? "BLUE" : "GREEN"} to place next.`,
  };
}

export function choosePuzzleComputerPlacement(state, player = "dark") {
  const candidates = getPuzzleRemainingByOwner(state, player);
  if (candidates.length === 0) {
    return null;
  }
  const piece = candidates[Math.floor(Math.random() * candidates.length)];
  return {
    pieceId: piece.id,
    row: piece.correctRow,
    col: piece.correctCol,
  };
}
