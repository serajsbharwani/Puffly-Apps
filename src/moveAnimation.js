function getSquareElement(boardElement, row, col) {
  return boardElement.querySelector(`.square[data-row="${row}"][data-col="${col}"]`);
}

function createAnimatedPiece(piece) {
  const el = document.createElement("div");
  el.className = `piece move-anim-piece ${piece.player} ${piece.king ? "king" : ""}`;

  const character = document.createElement("span");
  character.className = `piece-character ${piece.player}`;
  el.appendChild(character);

  if (piece.king) {
    const accessory = document.createElement("span");
    accessory.className = `piece-accessory ${piece.player}`;
    accessory.textContent = piece.player === "dark" ? "🧢" : "👑";
    el.appendChild(accessory);
  }

  return el;
}

export function attachPieceToDriver(boardElement, state, move, driverNode) {
  const movingPiece = state.board[move.from.row][move.from.col];
  if (!movingPiece || !driverNode) {
    return () => {};
  }

  const fromSquare = getSquareElement(boardElement, move.from.row, move.from.col);
  if (!fromSquare) {
    return () => {};
  }

  const fromRect = fromSquare.getBoundingClientRect();
  const pieceEl = createAnimatedPiece(movingPiece);
  pieceEl.classList.add("carried-piece");
  pieceEl.style.width = `${fromRect.width * 0.74}px`;
  pieceEl.style.height = `${fromRect.height * 0.74}px`;
  pieceEl.style.left = "0px";
  pieceEl.style.top = "0px";
  driverNode.appendChild(pieceEl);

  return () => {
    pieceEl.remove();
  };
}

function createFloatingPiece(boardElement, state, move) {
  const movingPiece = state.board[move.from.row][move.from.col];
  if (!movingPiece) {
    return null;
  }

  const fromSquare = getSquareElement(boardElement, move.from.row, move.from.col);
  const toSquare = getSquareElement(boardElement, move.to.row, move.to.col);
  if (!fromSquare || !toSquare) {
    return null;
  }

  const fromRect = fromSquare.getBoundingClientRect();
  const pieceEl = createAnimatedPiece(movingPiece);
  pieceEl.style.left = `${fromRect.left + fromRect.width / 2}px`;
  pieceEl.style.top = `${fromRect.top + fromRect.height / 2}px`;
  pieceEl.style.width = `${fromRect.width * 0.74}px`;
  pieceEl.style.height = `${fromRect.height * 0.74}px`;
  document.body.appendChild(pieceEl);
  return { pieceEl, fromSquare, toSquare };
}

export function animateMove(boardElement, state, move, durationMs = 260) {
  const floating = createFloatingPiece(boardElement, state, move);
  if (!floating) {
    return Promise.resolve();
  }
  const { pieceEl, toSquare } = floating;
  const toRect = toSquare.getBoundingClientRect();
  pieceEl.style.transitionDuration = `${durationMs}ms`;

  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      pieceEl.classList.add("animating");
      pieceEl.style.left = `${toRect.left + toRect.width / 2}px`;
      pieceEl.style.top = `${toRect.top + toRect.height / 2}px`;
    });

    window.setTimeout(() => {
      pieceEl.remove();
      resolve();
    }, durationMs + 40);
  });
}

export function animateMoveFollowingNode(
  boardElement,
  state,
  move,
  followNode,
  durationMs = 360,
) {
  const floating = createFloatingPiece(boardElement, state, move);
  if (!floating || !followNode) {
    return Promise.resolve();
  }
  const { pieceEl } = floating;

  let running = true;
  function syncToDriver() {
    if (!running) {
      return;
    }
    const rect = followNode.getBoundingClientRect();
    pieceEl.style.left = `${rect.left + rect.width / 2}px`;
    pieceEl.style.top = `${rect.top + rect.height / 2}px`;
    requestAnimationFrame(syncToDriver);
  }
  syncToDriver();

  return new Promise((resolve) => {
    window.setTimeout(() => {
      running = false;
      pieceEl.remove();
      resolve();
    }, durationMs + 45);
  });
}
