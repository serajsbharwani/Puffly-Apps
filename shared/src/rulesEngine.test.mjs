import assert from "node:assert/strict";
import { BOARD_SIZE, createInitialState, isDarkSquare } from "./gameState.js";
import {
  applyMove,
  getAllLegalMovesForPlayer,
  getLegalMovesForPiece,
  getWinnerForState,
} from "./rulesEngine.js";

function emptyBoard() {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => null),
  );
}

function baseState(board, currentPlayer = "dark") {
  return {
    board,
    currentPlayer,
    selectedSquare: null,
    forcedPiece: null,
    winner: null,
    lastMove: null,
  };
}

{
  const state = createInitialState();
  const darkCount = state.board.flat().filter((p) => p?.player === "dark").length;
  const lightCount = state.board.flat().filter((p) => p?.player === "light").length;
  assert.equal(darkCount, 12, "dark should begin with 12 pieces");
  assert.equal(lightCount, 12, "light should begin with 12 pieces");
  assert.equal(state.currentPlayer, "dark", "dark should start first");
  assert.equal(isDarkSquare(7, 7), false, "bottom-right square should be light");
}

{
  const board = emptyBoard();
  board[2][1] = { id: "d1", player: "dark", king: false };
  board[3][2] = { id: "l1", player: "light", king: false };
  board[5][4] = { id: "l2", player: "light", king: false };
  const state = baseState(board, "dark");

  const allMoves = getAllLegalMovesForPlayer(state, "dark");
  assert.equal(allMoves.hasMandatoryCapture, true, "capture should be mandatory");
  assert.equal(allMoves.allMoves.length, 1, "only the jump should be available");
  const move = allMoves.allMoves[0];
  assert.deepEqual(move.to, { row: 4, col: 3 }, "jump destination should be correct");
}

{
  const board = emptyBoard();
  board[2][1] = { id: "d1", player: "dark", king: false };
  board[3][2] = { id: "l1", player: "light", king: false };
  board[5][4] = { id: "l2", player: "light", king: false };
  board[7][6] = { id: "l3", player: "light", king: false };
  let state = baseState(board, "dark");

  let moves = getLegalMovesForPiece(state, 2, 1);
  let result = applyMove(state, moves[0]);
  state = result.nextState;
  assert.equal(state.currentPlayer, "dark", "turn should stay with dark after first jump");
  assert.deepEqual(state.forcedPiece, { row: 4, col: 3 }, "same piece should be forced");
  assert.equal(state.board[3][2], null, "first captured piece removed");

  moves = getLegalMovesForPiece(state, 4, 3);
  result = applyMove(state, moves[0]);
  state = result.nextState;
  assert.equal(state.currentPlayer, "light", "turn should pass after chain completes");
  assert.equal(state.board[5][4], null, "second captured piece removed");
}

{
  const board = emptyBoard();
  board[6][1] = { id: "d1", player: "dark", king: false };
  board[0][7] = { id: "l1", player: "light", king: false };
  let state = baseState(board, "dark");
  const moves = getLegalMovesForPiece(state, 6, 1);
  const promotionMove = moves.find((m) => m.to.row === 7 && m.to.col === 0);
  const result = applyMove(state, promotionMove);
  state = result.nextState;

  assert.equal(state.board[7][0].king, true, "piece should be promoted to king");
}

{
  const board = emptyBoard();
  board[7][0] = { id: "d1", player: "dark", king: true };
  board[0][7] = { id: "l1", player: "light", king: false };
  const state = baseState(board, "dark");
  const kingMoves = getLegalMovesForPiece(state, 7, 0);
  assert.equal(
    kingMoves.some((m) => m.to.row === 6 && m.to.col === 1),
    true,
    "kings should move backward diagonally",
  );
}

{
  const board = emptyBoard();
  board[2][1] = { id: "d1", player: "dark", king: false };
  board[3][2] = { id: "l1", player: "light", king: false };
  let state = baseState(board, "dark");
  const move = getLegalMovesForPiece(state, 2, 1).find((candidate) => candidate.isCapture);
  const result = applyMove(state, move);
  state = result.nextState;
  assert.equal(state.winner, "dark", "capturing final opponent piece should win");
}

{
  const board = emptyBoard();
  board[5][0] = { id: "darkGuardA", player: "dark", king: false };
  board[5][2] = { id: "darkGuardB", player: "dark", king: false };
  board[5][4] = { id: "darkGuardC", player: "dark", king: false };
  board[6][1] = { id: "darkBlockerA", player: "dark", king: false };
  board[6][3] = { id: "darkBlockerB", player: "dark", king: false };
  board[7][0] = { id: "lightStuckA", player: "light", king: false };
  board[7][2] = { id: "lightStuckB", player: "light", king: false };
  const blockedState = baseState(board, "light");
  assert.equal(
    getWinnerForState(blockedState),
    "dark",
    "player wins when opponent has no legal moves",
  );
}

{
  const board = emptyBoard();
  board[6][6] = { id: "lightForcedStale", player: "light", king: false };
  board[5][2] = { id: "lightCanMove", player: "light", king: false };
  board[1][1] = { id: "darkPiece", player: "dark", king: false };
  const staleForcedState = {
    ...baseState(board, "light"),
    forcedPiece: { row: 6, col: 6 },
    selectedSquare: { row: 6, col: 6 },
  };

  const legal = getAllLegalMovesForPlayer(staleForcedState, "light");
  assert.equal(
    legal.allMoves.length > 0,
    true,
    "stale forced piece should not block all legal moves",
  );
  assert.equal(
    (legal.movesByOrigin["5,2"] ?? []).length > 0,
    true,
    "other movable pieces should remain selectable when forced state is stale",
  );
}

{
  const board = emptyBoard();
  board[5][2] = { id: "lightCanMove", player: "light", king: false };
  board[1][1] = { id: "darkPiece", player: "dark", king: false };
  const invalidForcedSquareState = {
    ...baseState(board, "light"),
    forcedPiece: { row: 6, col: 6 },
    selectedSquare: { row: 6, col: 6 },
  };

  const legal = getAllLegalMovesForPlayer(invalidForcedSquareState, "light");
  assert.equal(
    (legal.movesByOrigin["6,6"] ?? []).length,
    0,
    "forced piece on a light square must not be treated as valid",
  );
  assert.equal(
    (legal.movesByOrigin["5,2"] ?? []).length > 0,
    true,
    "engine should continue with valid dark-square origins",
  );
}

console.log("All rules engine tests passed.");
