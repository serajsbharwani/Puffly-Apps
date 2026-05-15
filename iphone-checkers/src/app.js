import {
  BOARD_SIZE,
  applyMove,
  chooseComputerMove,
  createInitialState,
  getAllLegalMovesForPlayer,
  getLegalMovesForPiece,
  isDarkSquare,
} from "./engine.js?v=10";

const boardElement = document.getElementById("board");
const restartButton = document.getElementById("restart-btn");
const undoButton = document.getElementById("undo-btn");
const rulesButton = document.getElementById("rules-btn");
const difficultySelect = document.getElementById("difficulty-select");
const audioSelect = document.getElementById("audio-select");
const historyList = document.getElementById("history-list");
const rulesPanel = document.getElementById("rules-panel");
const playPufflyButton = document.getElementById("play-puffly-btn");
const playFriendButton = document.getElementById("play-friend-btn");
const celebrationOverlay = document.getElementById("celebration-overlay");
const celebrationFx = document.getElementById("celebration-fx");
const celebrationTitle = document.getElementById("celebration-title");
const celebrationSubtitle = document.getElementById("celebration-subtitle");
const celebrationClose = document.getElementById("celebration-close");
const pufflyPanel = document.getElementById("puffly-panel");
const pufflyThought = document.getElementById("puffly-thought");
const pufflyFace = pufflyPanel?.querySelector(".puffly-face");

const humanPlayer = "light";
const computerPlayer = "dark";
let state = createInitialState();
let busy = false;
let lastStatusMessage = "Make your move.";
let playMode = "puffly";
let difficulty = "medium";
let audioEnabled = true;
let moveHistory = [];
let undoSnapshots = [];
let winnerAnnounced = null;
let audioContext = null;
let lastSpokenAt = 0;
let lastSpokenPhrase = "";
let lastTurnSpoken = "";
const AI_MOVE_ANIMATION_MS = 1300;
const HUMAN_MOVE_ANIMATION_MS = 450;
let celebrationTimers = [];
let pufflyCheerTimer = null;
let rulesAutoHideTimer = null;

function key(row, col) {
  return `${row},${col}`;
}

function clone(data) {
  return JSON.parse(JSON.stringify(data));
}

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lockBoardGeometry() {
  const wrap = boardElement.parentElement;
  if (!wrap) {
    return;
  }
  const computed = window.getComputedStyle(wrap);
  const padLeft = Number.parseFloat(computed.paddingLeft) || 0;
  const padRight = Number.parseFloat(computed.paddingRight) || 0;
  const innerContentWidth = Math.max(0, wrap.clientWidth - padLeft - padRight);
  const usable = Math.floor(innerContentWidth);
  const cell = Math.max(1, Math.floor(usable / BOARD_SIZE));
  const boardPixels = cell * BOARD_SIZE;

  boardElement.style.width = `${boardPixels}px`;
  boardElement.style.height = `${boardPixels}px`;
  boardElement.style.gridTemplateColumns = `repeat(${BOARD_SIZE}, ${cell}px)`;
  boardElement.style.gridTemplateRows = `repeat(${BOARD_SIZE}, ${cell}px)`;
}

function squareText(square) {
  return `(${square.row},${square.col})`;
}

function ensureAudioContext() {
  if (!audioEnabled || typeof window === "undefined") {
    return null;
  }
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextCtor) {
    return null;
  }
  if (!audioContext) {
    audioContext = new AudioContextCtor();
  }
  if (audioContext.state === "suspended") {
    audioContext.resume().catch(() => {});
  }
  return audioContext;
}

function beep(frequency, duration, type = "sine", gainValue = 0.05) {
  if (!audioEnabled) {
    return;
  }
  const ctx = ensureAudioContext();
  if (!ctx) {
    return;
  }
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.value = gainValue;
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  const now = ctx.currentTime;
  oscillator.start(now);
  oscillator.stop(now + duration);
}

function speak(text) {
  if (!audioEnabled || typeof window === "undefined" || !window.speechSynthesis) {
    return;
  }
  const now = Date.now();
  if (now - lastSpokenAt < 700) {
    return;
  }
  lastSpokenAt = now;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.95;
  utterance.pitch = 1;
  utterance.volume = 0.95;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

function speakPhrase(text) {
  if (!text || text === lastSpokenPhrase) {
    return;
  }
  lastSpokenPhrase = text;
  speak(text);
}

function speakFromStatus(statusMessage) {
  let phrase = "";
  if (statusMessage === "Puffly is thinking...") {
    phrase = "Puffly is thinking.";
  } else if (
    statusMessage === "That piece cannot move." ||
    statusMessage === "That destination is not legal." ||
    statusMessage === "Select one of the highlighted pieces." ||
    statusMessage === "That move is not legal."
  ) {
    phrase = "Wrong move.";
  } else if (statusMessage === "Choose a highlighted destination.") {
    phrase = "Choose a highlighted square.";
  } else if (statusMessage === "Undid your previous turn.") {
    phrase = "Last turn undone.";
  } else if (statusMessage === "No legal moves to hint.") {
    phrase = "No hint available.";
  } else if (statusMessage.startsWith("Hint:")) {
    phrase = "Hint ready.";
  } else if (statusMessage.startsWith("Difficulty set to")) {
    phrase = `Difficulty ${difficulty}.`;
  } else if (statusMessage.includes("Continue capturing with the same piece")) {
    phrase = "Capture required. Keep jumping with the same piece.";
  } else if (statusMessage === "New game started. Puffly opens.") {
    phrase = "New game. Puffly moves first.";
  } else if (statusMessage === "Puffly opens the game.") {
    phrase = "Puffly starts the game.";
  }
  speakPhrase(phrase);
}

function playMoveAudio(player, move) {
  const captureBonus = move.isCapture ? 80 : 0;
  const base = player === computerPlayer ? 240 : 340;
  beep(base + captureBonus, 0.08, "triangle", 0.05);
}

function playLandingTic() {
  beep(920, 0.03, "square", 0.03);
}

function playInvalidAudio() {
  beep(180, 0.06, "square", 0.04);
}

function playCelebrationAudio() {
  beep(530, 0.08, "triangle", 0.06);
  window.setTimeout(() => beep(660, 0.1, "triangle", 0.06), 90);
  window.setTimeout(() => beep(790, 0.14, "triangle", 0.06), 180);
}

function renderHistory() {
  if (!historyList) {
    return;
  }
  historyList.innerHTML = "";
  const recent = moveHistory.slice(-20);
  for (const text of recent) {
    const item = document.createElement("li");
    item.textContent = text;
    historyList.appendChild(item);
  }
}

function pushUndoSnapshot() {
  undoSnapshots.push({
    state: clone(state),
    history: [...moveHistory],
  });
  if (undoSnapshots.length > 40) {
    undoSnapshots = undoSnapshots.slice(-40);
  }
}

function recordMove(player, move) {
  const mover = player === humanPlayer ? "You" : "Puffly";
  const captureTag = move.isCapture ? " x" : "";
  moveHistory.push(`${mover}: ${squareText(move.from)} -> ${squareText(move.to)}${captureTag}`);
}

function showCelebration() {
  if (!state.winner || winnerAnnounced === state.winner) {
    return;
  }
  winnerAnnounced = state.winner;
  celebrationTitle.textContent = state.winner === humanPlayer ? "You win!" : "Puffly wins!";
  celebrationSubtitle.textContent =
    state.winner === humanPlayer ? "Great strategy and captures." : "Try another round and outsmart Puffly.";
  celebrationOverlay.classList.remove("hidden");
  playWinFx(state.winner === humanPlayer);
  playCelebrationAudio();
  speakPhrase(state.winner === humanPlayer ? "You win." : "Puffly wins.");
}

function hideCelebration() {
  clearWinFx();
  celebrationOverlay.classList.add("hidden");
}

function clearWinFx() {
  for (const timer of celebrationTimers) {
    window.clearTimeout(timer);
  }
  celebrationTimers = [];
  if (celebrationFx) {
    celebrationFx.innerHTML = "";
  }
}

function createConfettiPiece() {
  const piece = document.createElement("span");
  piece.className = "confetti-piece";
  piece.style.left = `${Math.random() * 100}%`;
  piece.style.setProperty("--drift", `${(Math.random() - 0.5) * 140}px`);
  piece.style.setProperty("--rot", `${Math.random() * 720}deg`);
  piece.style.setProperty("--dur", `${1200 + Math.random() * 800}ms`);
  piece.style.setProperty("--delay", `${Math.random() * 140}ms`);
  piece.style.background = `hsl(${Math.floor(Math.random() * 360)}, 90%, 60%)`;
  return piece;
}

function createFirework(xPercent, yPercent) {
  const burst = document.createElement("span");
  burst.className = "firework-pop";
  burst.style.left = `${xPercent}%`;
  burst.style.top = `${yPercent}%`;
  burst.style.borderColor = `hsl(${Math.floor(Math.random() * 360)}, 96%, 66%)`;
  return burst;
}

function playWinFx(isHumanWinner) {
  clearWinFx();
  if (!celebrationFx || !isHumanWinner) {
    return;
  }
  for (let i = 0; i < 36; i += 1) {
    celebrationFx.appendChild(createConfettiPiece());
  }
  celebrationFx.appendChild(createFirework(24, 26));
  const t1 = window.setTimeout(() => {
    for (let i = 0; i < 28; i += 1) {
      celebrationFx.appendChild(createConfettiPiece());
    }
    celebrationFx.appendChild(createFirework(76, 24));
  }, 260);
  const t2 = window.setTimeout(() => {
    celebrationFx.appendChild(createFirework(50, 18));
  }, 540);
  const t3 = window.setTimeout(() => {
    if (celebrationFx.childElementCount > 140) {
      celebrationFx.innerHTML = "";
    }
  }, 2300);
  celebrationTimers.push(t1, t2, t3);
}

function setPufflyState(mode, text) {
  if (!pufflyPanel || !pufflyThought) {
    return;
  }
  pufflyPanel.classList.remove("idle", "thinking", "celebrate");
  pufflyPanel.classList.add(mode);
  pufflyThought.textContent = text;
}

function hideRulesPanel() {
  if (rulesAutoHideTimer) {
    window.clearTimeout(rulesAutoHideTimer);
    rulesAutoHideTimer = null;
  }
  rulesPanel?.classList.add("hidden");
}

function showRulesPanel() {
  rulesPanel?.classList.remove("hidden");
  if (rulesAutoHideTimer) {
    window.clearTimeout(rulesAutoHideTimer);
  }
  rulesAutoHideTimer = window.setTimeout(() => {
    rulesPanel?.classList.add("hidden");
    rulesAutoHideTimer = null;
  }, 30000);
}

function setPlayMode(mode) {
  playMode = mode;
  playPufflyButton?.classList.toggle("active", mode === "puffly");
  playFriendButton?.classList.toggle("active", mode === "friend");
  hideRulesPanel();
  state = createInitialState();
  winnerAnnounced = null;
  lastSpokenPhrase = "";
  lastTurnSpoken = "";
  hideCelebration();
  if (mode === "friend") {
    state = { ...state, currentPlayer: "light" };
    moveHistory = [];
    undoSnapshots = [];
    render("Friend mode ready.");
    return;
  }
  moveHistory = [];
  undoSnapshots = [];
  render("New game started. Puffly opens.");
  runComputerTurn();
}

function setPufflyLookAtPoint(clientX, clientY) {
  if (!pufflyFace) {
    return;
  }
  const rect = pufflyFace.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const dx = clamp((clientX - centerX) / 18, -3.6, 3.6);
  const dy = clamp((clientY - centerY) / 22, -2.6, 2.6);
  pufflyFace.style.setProperty("--pupil-x", `${dx.toFixed(2)}px`);
  pufflyFace.style.setProperty("--pupil-y", `${dy.toFixed(2)}px`);
}

function setPufflyEyeOffset(offsetX, offsetY = 0) {
  if (!pufflyFace) {
    return;
  }
  pufflyFace.style.setProperty("--pupil-x", `${offsetX.toFixed(2)}px`);
  pufflyFace.style.setProperty("--pupil-y", `${offsetY.toFixed(2)}px`);
}

function setPufflyLookToBoard() {
  if (!boardElement) {
    return;
  }
  const rect = boardElement.getBoundingClientRect();
  const targetX = rect.left + rect.width / 2;
  const targetY = rect.top + rect.height * 0.82;
  setPufflyLookAtPoint(targetX, targetY);
}

function getMoveDirection(move) {
  const delta = move.to.col - move.from.col;
  if (delta <= -1) {
    return "left";
  }
  if (delta >= 1) {
    return "right";
  }
  return "center";
}

async function animatePufflyEyeCue(direction) {
  if (!pufflyFace) {
    return;
  }
  if (direction === "left") {
    setPufflyEyeOffset(-3.2, -0.2);
  } else if (direction === "right") {
    setPufflyEyeOffset(3.2, -0.2);
  } else {
    setPufflyEyeOffset(0, 0.2);
  }
  await sleep(210);
  setPufflyLookToBoard();
  await sleep(110);
}

function triggerPufflyCaptureCheer() {
  if (!pufflyPanel || !pufflyThought) {
    return;
  }
  pufflyPanel.classList.add("capture-cheer");
  pufflyThought.textContent = "🎯 Got one!";
  if (pufflyCheerTimer) {
    window.clearTimeout(pufflyCheerTimer);
  }
  pufflyCheerTimer = window.setTimeout(() => {
    pufflyPanel.classList.remove("capture-cheer");
    pufflyCheerTimer = null;
  }, 460);
}

function render(statusMessage = "Make your move.") {
  lastStatusMessage = statusMessage;
  lockBoardGeometry();
  const legalForCurrent = getAllLegalMovesForPlayer(state, state.currentPlayer);
  const selected = state.selectedSquare;
  const selectedMoves = selected ? getLegalMovesForPiece(state, selected.row, selected.col) : [];
  const moveTargets = new Map(selectedMoves.map((move) => [key(move.to.row, move.to.col), move]));

  boardElement.innerHTML = "";
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const square = document.createElement("div");
      square.className = `square ${isDarkSquare(row, col) ? "dark" : "light"}`;
      square.dataset.row = String(row);
      square.dataset.col = String(col);

      if (legalForCurrent.movesByOrigin[key(row, col)]) {
        square.classList.add("selectable");
      }
      const targetMove = moveTargets.get(key(row, col));
      if (targetMove) {
        square.classList.add(targetMove.isCapture ? "capture-target" : "move-target");
      }

      const piece = state.board[row][col];
      if (piece) {
        const pieceEl = document.createElement("button");
        pieceEl.type = "button";
        pieceEl.className = `piece ${piece.player}`;
        pieceEl.dataset.row = String(row);
        pieceEl.dataset.col = String(col);
        pieceEl.textContent = piece.player === "dark" ? (piece.king ? "🧢" : "🐻") : piece.king ? "👑" : "🐸";
        if (selected && selected.row === row && selected.col === col) {
          pieceEl.classList.add("selected");
        }
        square.appendChild(pieceEl);
      }
      boardElement.appendChild(square);
    }
  }

  renderHistory();
  undoButton.disabled = busy || undoSnapshots.length === 0;
  rulesButton.disabled = busy;
  difficultySelect.disabled = busy || playMode !== "puffly";
  audioSelect.disabled = busy;

  if (state.winner) {
    if (state.winner === humanPlayer) {
      setPufflyState("idle", "😮 You got me!");
    } else {
      setPufflyState("celebrate", "🎉 I win!");
    }
    lastTurnSpoken = "";
    showCelebration();
    return;
  }
  hideCelebration();
  const currentTurnPhrase =
    state.currentPlayer === humanPlayer ? "Your turn." : playMode === "puffly" ? "Puffly's turn." : "Friend turn.";
  if (lastTurnSpoken !== currentTurnPhrase) {
    lastTurnSpoken = currentTurnPhrase;
    speakPhrase(currentTurnPhrase);
  }
  if (playMode === "friend") {
    setPufflyState("idle", "🤝 Friend mode");
  } else if (state.currentPlayer === computerPlayer) {
    setPufflyState("thinking", "💭 My move...");
  } else {
    setPufflyState("idle", "👀 Your turn!");
  }
  setPufflyLookToBoard();
  speakFromStatus(statusMessage);
}

function findSquareElement(row, col) {
  return boardElement.querySelector(`.square[data-row="${row}"][data-col="${col}"]`);
}

async function animateDestinationBounce(square) {
  if (!square) {
    return;
  }
  square.classList.add("destination-bounce");
  playLandingTic();
  await sleep(220);
  square.classList.remove("destination-bounce");
}

async function animateHumanMove(move) {
  await animatePufflyEyeCue(getMoveDirection(move));
  const fromSquare = findSquareElement(move.from.row, move.from.col);
  const toSquare = findSquareElement(move.to.row, move.to.col);
  const captureSquare = move.capture ? findSquareElement(move.capture.row, move.capture.col) : null;
  if (!fromSquare || !toSquare) {
    return;
  }
  const fromPiece = fromSquare.querySelector(".piece");
  if (!fromPiece) {
    return;
  }
  const fromRect = fromSquare.getBoundingClientRect();
  const toRect = toSquare.getBoundingClientRect();
  const pieceRect = fromPiece.getBoundingClientRect();

  const ghost = fromPiece.cloneNode(true);
  ghost.classList.add("ai-piece-ghost");
  ghost.style.transitionDuration = `${HUMAN_MOVE_ANIMATION_MS}ms`;
  ghost.style.width = `${pieceRect.width}px`;
  ghost.style.height = `${pieceRect.height}px`;
  ghost.style.left = `${pieceRect.left + pieceRect.width / 2}px`;
  ghost.style.top = `${pieceRect.top + pieceRect.height / 2}px`;
  document.body.appendChild(ghost);

  fromPiece.classList.add("ai-piece-hidden");
  fromSquare.classList.add("human-move-from");
  toSquare.classList.add("human-move-to");
  captureSquare?.classList.add("human-move-capture");

  await new Promise((resolve) => window.requestAnimationFrame(resolve));
  ghost.style.transform = `translate(${toRect.left - fromRect.left}px, ${toRect.top - fromRect.top}px)`;
  await sleep(HUMAN_MOVE_ANIMATION_MS);
  await animateDestinationBounce(toSquare);

  fromPiece.classList.remove("ai-piece-hidden");
  ghost.remove();
  fromSquare.classList.remove("human-move-from");
  toSquare.classList.remove("human-move-to");
  captureSquare?.classList.remove("human-move-capture");
}

async function animateComputerMove(move) {
  const fromSquare = findSquareElement(move.from.row, move.from.col);
  const toSquare = findSquareElement(move.to.row, move.to.col);
  const captureSquare = move.capture ? findSquareElement(move.capture.row, move.capture.col) : null;
  if (!fromSquare || !toSquare) {
    return;
  }
  const fromPiece = fromSquare.querySelector(".piece");

  if (!fromPiece) {
    fromSquare.classList.add("ai-move-from");
    toSquare.classList.add("ai-move-to");
    captureSquare?.classList.add("ai-move-capture");
    await sleep(Math.max(220, Math.floor(AI_MOVE_ANIMATION_MS * 0.55)));
    fromSquare.classList.remove("ai-move-from");
    toSquare.classList.remove("ai-move-to");
    captureSquare?.classList.remove("ai-move-capture");
    return;
  }

  const fromRect = fromSquare.getBoundingClientRect();
  const toRect = toSquare.getBoundingClientRect();
  const pieceRect = fromPiece.getBoundingClientRect();

  const ghost = fromPiece.cloneNode(true);
  ghost.classList.add("ai-piece-ghost");
  ghost.style.width = `${pieceRect.width}px`;
  ghost.style.height = `${pieceRect.height}px`;
  ghost.style.left = `${pieceRect.left + pieceRect.width / 2}px`;
  ghost.style.top = `${pieceRect.top + pieceRect.height / 2}px`;
  document.body.appendChild(ghost);

  fromPiece.classList.add("ai-piece-hidden");
  fromSquare?.classList.add("ai-move-from");
  toSquare?.classList.add("ai-move-to");
  captureSquare?.classList.add("ai-move-capture");

  await new Promise((resolve) => window.requestAnimationFrame(resolve));
  ghost.style.transform = `translate(${toRect.left - fromRect.left}px, ${toRect.top - fromRect.top}px)`;
  await sleep(AI_MOVE_ANIMATION_MS);
  await animateDestinationBounce(toSquare);

  fromPiece.classList.remove("ai-piece-hidden");
  ghost.remove();
  fromSquare?.classList.remove("ai-move-from");
  toSquare?.classList.remove("ai-move-to");
  captureSquare?.classList.remove("ai-move-capture");
}

function maybeStoreUndoBeforeMove() {
  if (state.forcedPiece) {
    return;
  }
  if (playMode === "puffly" && state.currentPlayer !== humanPlayer) {
    return;
  }
  pushUndoSnapshot();
}

async function commitMove(move) {
  maybeStoreUndoBeforeMove();
  busy = true;
  await animateHumanMove(move);
  const mover = state.currentPlayer;
  const result = applyMove(state, move);
  recordMove(mover, move);
  playMoveAudio(mover, move);
  state = result.nextState;
  render(result.status);
  busy = false;
  if (playMode === "puffly") {
    await runComputerTurn();
  }
}

async function runComputerTurn() {
  if (playMode !== "puffly" || state.winner || state.currentPlayer !== computerPlayer) {
    return;
  }
  busy = true;
  render("Puffly is thinking...");
  let isFirstComputerMoveThisTurn = true;
  while (!state.winner && state.currentPlayer === computerPlayer) {
    if (isFirstComputerMoveThisTurn) {
      setPufflyState("thinking", "🧠 My turn.");
      await sleep(360);
      setPufflyState("thinking", "🤔 I'm thinking...");
      const thinkingDelayMs = moveHistory.length === 0 ? 1400 : 1200;
      await sleep(thinkingDelayMs);
      isFirstComputerMoveThisTurn = false;
    }
    const move = chooseComputerMove(state, computerPlayer, difficulty);
    if (!move) {
      break;
    }
    await animatePufflyEyeCue(getMoveDirection(move));
    await animateComputerMove(move);
    const result = applyMove(state, move);
    recordMove(computerPlayer, move);
    playMoveAudio(computerPlayer, move);
    state = result.nextState;
    render(result.status);
    if (move.isCapture && !state.winner) {
      triggerPufflyCaptureCheer();
      await sleep(220);
    }
    await sleep(260);
  }
  busy = false;
  render(lastStatusMessage);
}

boardElement.addEventListener("click", async (event) => {
  ensureAudioContext();
  if (busy) {
    return;
  }
  const square = event.target.closest(".square");
  if (!square) {
    return;
  }
  const row = Number(square.dataset.row);
  const col = Number(square.dataset.col);

  if (state.winner) {
    return;
  }
  if (playMode === "puffly" && state.currentPlayer !== humanPlayer) {
    render("Puffly is thinking...");
    return;
  }

  const piece = state.board[row][col];
  const selected = state.selectedSquare;

  if (piece && piece.player === state.currentPlayer) {
    const legal = getLegalMovesForPiece(state, row, col);
    if (legal.length === 0) {
      playInvalidAudio();
      render("That piece cannot move.");
      return;
    }
    state = { ...state, selectedSquare: { row, col } };
    render("Choose a highlighted destination.");
    return;
  }

  if (!selected) {
    playInvalidAudio();
    render("Select one of the highlighted pieces.");
    return;
  }

  const legal = getLegalMovesForPiece(state, selected.row, selected.col);
  const move = legal.find((candidate) => candidate.to.row === row && candidate.to.col === col);
  if (!move) {
    playInvalidAudio();
    render("That destination is not legal.");
    return;
  }

  await commitMove(move);
});

restartButton.addEventListener("click", async () => {
  if (busy) {
    return;
  }
  ensureAudioContext();
  state = createInitialState();
  moveHistory = [];
  undoSnapshots = [];
  winnerAnnounced = null;
  lastSpokenPhrase = "";
  lastTurnSpoken = "";
  hideCelebration();
  if (playMode === "friend") {
    state = { ...state, currentPlayer: "light" };
    render("Friend mode ready.");
    return;
  }
  render("New game started. Puffly opens.");
  await runComputerTurn();
});

difficultySelect.addEventListener("change", () => {
  difficulty = difficultySelect.value;
  render(`Difficulty set to ${difficulty}.`);
});

audioSelect.addEventListener("change", () => {
  audioEnabled = audioSelect.value === "on";
  if (audioEnabled) {
    ensureAudioContext();
    lastSpokenPhrase = "";
    speakPhrase("Audio on.");
  } else if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
    lastSpokenPhrase = "";
  }
  render(audioEnabled ? "Audio feedback enabled." : "Audio feedback muted.");
});

undoButton.addEventListener("click", () => {
  if (busy || undoSnapshots.length === 0) {
    return;
  }
  ensureAudioContext();
  const snapshot = undoSnapshots.pop();
  if (!snapshot) {
    return;
  }
  state = snapshot.state;
  moveHistory = snapshot.history;
  winnerAnnounced = null;
  lastSpokenPhrase = "";
  lastTurnSpoken = "";
  hideCelebration();
  render("Undid your previous turn.");
});

rulesButton.addEventListener("click", () => {
  if (rulesPanel?.classList.contains("hidden")) {
    showRulesPanel();
  } else {
    hideRulesPanel();
  }
});

playPufflyButton?.addEventListener("click", () => {
  if (busy || playMode === "puffly") {
    return;
  }
  setPlayMode("puffly");
});

playFriendButton?.addEventListener("click", () => {
  if (busy || playMode === "friend") {
    return;
  }
  setPlayMode("friend");
});

celebrationClose.addEventListener("click", () => {
  hideCelebration();
});

if (typeof window !== "undefined") {
  window.addEventListener("resize", () => {
    lockBoardGeometry();
    render(lastStatusMessage);
  });
}

render("Puffly opens the game.");
runComputerTurn();
