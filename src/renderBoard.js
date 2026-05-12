import { BOARD_SIZE, isDarkSquare } from "./gameState.js";
import { getAllLegalMovesForPlayer, getLegalMovesForPiece } from "./rulesEngine.js";

function toKey(row, col) {
  return `${row},${col}`;
}

function getKingAccessory(piece) {
  if (!piece.king) {
    return "";
  }
  return piece.player === "dark" ? "🧢" : "👑";
}

export function renderBoard(boardElement, state) {
  const legalForPlayer = getAllLegalMovesForPlayer(state, state.currentPlayer);
  const selectableOrigins = new Set(Object.keys(legalForPlayer.movesByOrigin));
  const selected = state.selectedSquare;
  const selectedMoves = selected
    ? getLegalMovesForPiece(state, selected.row, selected.col)
    : [];
  const moveTargets = new Map(
    selectedMoves.map((move) => [toKey(move.to.row, move.to.col), move]),
  );

  boardElement.innerHTML = "";

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const square = document.createElement("div");
      square.className = `square ${isDarkSquare(row, col) ? "dark" : "light"}`;
      square.dataset.row = String(row);
      square.dataset.col = String(col);

      const key = toKey(row, col);
      if (selectableOrigins.has(key)) {
        square.classList.add("selectable");
      }
      if (
        state.lastMove &&
        state.lastMove.from.row === row &&
        state.lastMove.from.col === col
      ) {
        square.classList.add("last-move-from");
      }
      if (
        state.lastMove &&
        state.lastMove.to.row === row &&
        state.lastMove.to.col === col
      ) {
        square.classList.add("last-move-to");
      }
      if (
        state.lastMove?.capture &&
        state.lastMove.capture.row === row &&
        state.lastMove.capture.col === col
      ) {
        square.classList.add("capture-flash");
      }

      const move = moveTargets.get(key);
      if (move) {
        square.classList.add(move.isCapture ? "capture-target" : "move-target");
      }

      const piece = state.board[row][col];
      if (piece) {
        const pieceEl = document.createElement("button");
        pieceEl.type = "button";
        pieceEl.className = `piece ${piece.player} ${piece.king ? "king" : ""}`;
        pieceEl.dataset.row = String(row);
        pieceEl.dataset.col = String(col);
        pieceEl.setAttribute("aria-label", `${piece.player} ${piece.king ? "king" : "piece"}`);

        if (selected && selected.row === row && selected.col === col) {
          pieceEl.classList.add("selected");
        }

        const character = document.createElement("span");
        character.className = `piece-character ${piece.player}`;
        pieceEl.appendChild(character);

        if (piece.king) {
          const accessory = document.createElement("span");
          accessory.className = `piece-accessory ${piece.player}`;
          accessory.textContent = getKingAccessory(piece);
          pieceEl.appendChild(accessory);
        }

        square.appendChild(pieceEl);
      }

      boardElement.appendChild(square);
    }
  }
}
