import {
  applyMove,
  getAllLegalMovesForPlayer,
  getLegalMovesForPiece,
} from "../../shared/src/rulesEngine.js?v=20260513x";
import { animateMove } from "./moveAnimation.js?v=20260513x";

function parseSquareFromTarget(target) {
  const square = target.closest(".square");
  if (!square) {
    return null;
  }
  return {
    row: Number(square.dataset.row),
    col: Number(square.dataset.col),
  };
}

function parseSquareFromPoint(x, y) {
  if (typeof document.elementsFromPoint !== "function") {
    return parseSquareFromTarget(document.elementFromPoint(x, y));
  }
  const stack = document.elementsFromPoint(x, y);
  const square = stack.find((node) => node.classList?.contains("square"));
  if (!square) {
    return null;
  }
  return {
    row: Number(square.dataset.row),
    col: Number(square.dataset.col),
  };
}

export function attachInputController({
  getState,
  setState,
  boardElement,
  humanPlayer = "dark",
  isAudioFeedbackEnabled = () => true,
}) {
  let suppressClickOnce = false;
  let lastWrongMoveAudioAt = 0;
  const coarsePointer =
    typeof window !== "undefined" && (window.matchMedia?.("(pointer: coarse)")?.matches ?? false);

  function playWrongMoveAudio() {
    if (!isAudioFeedbackEnabled()) {
      return;
    }
    const now = Date.now();
    if (now - lastWrongMoveAudioAt < 650) {
      return;
    }
    lastWrongMoveAudioAt = now;

    if (typeof window === "undefined") {
      return;
    }

    if ("speechSynthesis" in window && "SpeechSynthesisUtterance" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance("Oops! Wrong Move");
      utterance.rate = 0.96;
      utterance.pitch = 1.06;
      utterance.volume = 1;
      window.speechSynthesis.speak(utterance);
      return;
    }

    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) {
      return;
    }

    const audioContext = new AudioContextCtor();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = "triangle";
    oscillator.frequency.value = 520;
    gain.gain.value = 0.035;
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.15);
    oscillator.onended = () => {
      audioContext.close();
    };
  }

  async function commitMove(state, move) {
    await animateMove(boardElement, state, move);
    const { nextState, status } = applyMove(state, move);
    setState(nextState, status);
  }

  boardElement.addEventListener("pointerdown", (event) => {
    if (coarsePointer) {
      return;
    }
    const pieceTarget = event.target.closest(".piece");
    if (!pieceTarget) {
      return;
    }
    if (event.cancelable) {
      event.preventDefault();
    }

    const startRow = Number(pieceTarget.dataset.row);
    const startCol = Number(pieceTarget.dataset.col);
    const state = getState();

    if (state.winner || state.currentPlayer !== humanPlayer) {
      return;
    }

    const piece = state.board[startRow][startCol];
    if (!piece || piece.player !== state.currentPlayer) {
      return;
    }

    if (
      state.forcedPiece &&
      (state.forcedPiece.row !== startRow || state.forcedPiece.col !== startCol)
    ) {
      setState(state, "You must continue jumping with the highlighted piece.");
      playWrongMoveAudio();
      return;
    }

    const legalMoves = getLegalMovesForPiece(state, startRow, startCol);
    if (legalMoves.length === 0) {
      setState(state, "That piece cannot move right now.");
      playWrongMoveAudio();
      return;
    }

    suppressClickOnce = true;
    const selectedState = { ...state, selectedSquare: { row: startRow, col: startCol } };
    setState(selectedState, "Drag the piece to a highlighted square.");

    const latestState = getState();
    const sourcePiece = boardElement.querySelector(
      `.piece[data-row="${startRow}"][data-col="${startCol}"]`,
    );
    if (!sourcePiece) {
      return;
    }

    const sourceRect = sourcePiece.getBoundingClientRect();
    const dragGhost = sourcePiece.cloneNode(true);
    dragGhost.classList.add("move-anim-piece", "dragging");
    dragGhost.classList.remove("selected");
    dragGhost.style.width = `${sourceRect.width}px`;
    dragGhost.style.height = `${sourceRect.height}px`;
    dragGhost.style.left = `${event.clientX}px`;
    dragGhost.style.top = `${event.clientY}px`;
    document.body.appendChild(dragGhost);
    sourcePiece.classList.add("drag-source-hidden");

    const onMove = (moveEvent) => {
      if (moveEvent.cancelable) {
        moveEvent.preventDefault();
      }
      dragGhost.style.left = `${moveEvent.clientX}px`;
      dragGhost.style.top = `${moveEvent.clientY}px`;
    };

    let dragging = true;
    const cleanupDragListeners = () => {
      if (!dragging) {
        return;
      }
      dragging = false;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      dragGhost.remove();
      sourcePiece.classList.remove("drag-source-hidden");
    };

    const onUp = async (upEvent) => {
      if (upEvent.cancelable) {
        upEvent.preventDefault();
      }
      cleanupDragListeners();

      const targetSquare = parseSquareFromPoint(upEvent.clientX, upEvent.clientY);
      if (!targetSquare) {
        setState(latestState, "Move cancelled.");
        return;
      }

      const move = legalMoves.find(
        (candidate) =>
          candidate.to.row === targetSquare.row && candidate.to.col === targetSquare.col,
      );
      if (!move) {
        setState(latestState, "That destination is not a legal move.");
        playWrongMoveAudio();
        return;
      }

      await commitMove(latestState, move);
    };

    const onCancel = () => {
      cleanupDragListeners();
      setState(latestState, "Move cancelled.");
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
  });

  boardElement.addEventListener("click", async (event) => {
    if (suppressClickOnce) {
      suppressClickOnce = false;
      return;
    }

    const clicked = parseSquareFromTarget(event.target);
    if (!clicked) {
      return;
    }

    const state = getState();
    if (state.currentPlayer !== humanPlayer) {
      setState(state, "Computer is making a move...");
      return;
    }
    if (state.winner) {
      setState(state, `Game over! ${state.winner} won. Start a new game to play again.`);
      return;
    }

    const piece = state.board[clicked.row][clicked.col];
    const currentSelection = state.selectedSquare;
    const legalForPlayer = getAllLegalMovesForPlayer(state, state.currentPlayer);

    if (legalForPlayer.hasMandatoryCapture) {
      const originKey = `${clicked.row},${clicked.col}`;
      const captureFromOrigin = legalForPlayer.movesByOrigin[originKey] ?? [];
      if (captureFromOrigin.length > 0) {
        const nextState = { ...state, selectedSquare: { row: clicked.row, col: clicked.col } };
        setState(nextState, "Capture required. Choose a highlighted capture square.");
        return;
      }

      if (currentSelection) {
        const selectedCaptures = getLegalMovesForPiece(
          state,
          currentSelection.row,
          currentSelection.col,
        ).filter((candidate) => candidate.isCapture);
        const targetCapture = selectedCaptures.find(
          (candidate) => candidate.to.row === clicked.row && candidate.to.col === clicked.col,
        );
        if (targetCapture) {
          await commitMove(state, targetCapture);
          return;
        }
      }

      setState(state, "Capture required. Select a highlighted capture piece or destination.");
      return;
    }

    if (piece && piece.player === state.currentPlayer) {
      if (
        state.forcedPiece &&
        (state.forcedPiece.row !== clicked.row || state.forcedPiece.col !== clicked.col)
      ) {
        setState(state, "You must continue jumping with the highlighted piece.");
        playWrongMoveAudio();
        return;
      }

      const legalMoves = getLegalMovesForPiece(state, clicked.row, clicked.col);
      if (legalMoves.length === 0) {
        setState(state, "That piece cannot move right now.");
        playWrongMoveAudio();
        return;
      }

      const nextState = { ...state, selectedSquare: { row: clicked.row, col: clicked.col } };
      setState(nextState, "Choose a highlighted square.");
      return;
    }

    if (!currentSelection) {
      setState(state, `Select a ${state.currentPlayer} piece first.`);
      playWrongMoveAudio();
      return;
    }

    const legalMoves = getLegalMovesForPiece(state, currentSelection.row, currentSelection.col);
    const move = legalMoves.find(
      (candidate) => candidate.to.row === clicked.row && candidate.to.col === clicked.col,
    );

    if (!move) {
      setState(state, "That destination is not a legal move.");
      playWrongMoveAudio();
      return;
    }

    await commitMove(state, move);
  });
}
