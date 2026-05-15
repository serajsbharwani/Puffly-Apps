import assert from "node:assert/strict";
import {
  BOARD_SIZE,
  applyMove,
  chooseComputerMove,
  createInitialState,
  getAllLegalMovesForPlayer,
  getLegalMovesForPiece,
} from "./engine.js";

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
  assert.equal(darkCount, 12);
  assert.equal(lightCount, 12);
  assert.equal(state.currentPlayer, "dark");
}

{
  const board = emptyBoard();
  board[2][1] = { id: "d1", player: "dark", king: false };
  board[3][2] = { id: "l1", player: "light", king: false };
  board[5][4] = { id: "l2", player: "light", king: false };
  const state = baseState(board, "dark");
  const legal = getAllLegalMovesForPlayer(state, "dark");
  assert.equal(legal.hasMandatoryCapture, true);
  assert.equal(legal.allMoves.length, 1);
}

{
  const board = emptyBoard();
  board[2][1] = { id: "d1", player: "dark", king: false };
  board[3][2] = { id: "l1", player: "light", king: false };
  board[5][4] = { id: "l2", player: "light", king: false };
  board[7][6] = { id: "l3", player: "light", king: false };
  let state = baseState(board, "dark");

  let move = getLegalMovesForPiece(state, 2, 1)[0];
  let result = applyMove(state, move);
  state = result.nextState;
  assert.equal(state.currentPlayer, "dark");
  assert.deepEqual(state.forcedPiece, { row: 4, col: 3 });

  move = getLegalMovesForPiece(state, 4, 3)[0];
  result = applyMove(state, move);
  state = result.nextState;
  assert.equal(state.currentPlayer, "light");
  assert.equal(state.board[3][2], null);
  assert.equal(state.board[5][4], null);
}

{
  const board = emptyBoard();
  board[6][1] = { id: "d1", player: "dark", king: false };
  board[0][7] = { id: "l1", player: "light", king: false };
  const state = baseState(board, "dark");
  const promotionMove = getLegalMovesForPiece(state, 6, 1).find((m) => m.to.row === 7);
  const result = applyMove(state, promotionMove);
  assert.equal(result.nextState.board[7][0].king, true);
}

{
  const board = emptyBoard();
  board[2][1] = { id: "d1", player: "dark", king: false };
  board[3][2] = { id: "l1", player: "light", king: false };
  const state = baseState(board, "dark");
  const aiMove = chooseComputerMove(state, "dark");
  assert.equal(aiMove.isCapture, true);
}

console.log("All iPhone engine tests passed.");
