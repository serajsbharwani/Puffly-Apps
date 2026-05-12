import { applyMove, getLegalMovesForPiece } from "./rulesEngine.js";
import { animateMove } from "./moveAnimation.js";

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

export function attachInputController({
  getState,
  setState,
  boardElement,
  humanPlayer = "dark",
  isAudioFeedbackEnabled = () => true,
}) {
  let suppressClickOnce = false;
  let lastWrongMoveAudioAt = 0;

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
    const pieceTarget = event.target.closest(".piece");
    if (!pieceTarget) {
      return;
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
      dragGhost.style.left = `${moveEvent.clientX}px`;
      dragGhost.style.top = `${moveEvent.clientY}px`;
    };

    const onUp = async (upEvent) => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      dragGhost.remove();
      sourcePiece.classList.remove("drag-source-hidden");

      const targetElement = document.elementFromPoint(upEvent.clientX, upEvent.clientY);
      const targetSquare = parseSquareFromTarget(targetElement);
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

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
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
