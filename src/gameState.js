export const BOARD_SIZE = 8;

let pieceIdCounter = 0;

function nextPieceId() {
  pieceIdCounter += 1;
  return `piece-${pieceIdCounter}`;
}

export function isInsideBoard(row, col) {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

export function isDarkSquare(row, col) {
  return (row + col) % 2 === 1;
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
        board[row][col] = {
          id: nextPieceId(),
          player: "dark",
          king: false,
        };
      } else if (row >= 5) {
        board[row][col] = {
          id: nextPieceId(),
          player: "light",
          king: false,
        };
      }
    }
  }

  return board;
}

export function cloneBoard(board) {
  return board.map((row) =>
    row.map((piece) => (piece ? { ...piece } : null)),
  );
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
