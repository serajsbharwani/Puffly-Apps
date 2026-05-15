import { createInitialState } from "../../shared/src/gameState.js?v=20260513x";
import { chooseComputerMove } from "../../shared/src/aiPlayer.js?v=20260513x";
import { applyMove } from "../../shared/src/rulesEngine.js?v=20260513x";
import { attachInputController } from "./inputController.js?v=20260513x";
import { animatePufflyHandMove } from "./critterAnimation.js?v=20260513x";
import { animateMove, attachPieceToDriver } from "./moveAnimation.js?v=20260513x";
import { renderBoard } from "./renderBoard.js?v=20260513x";
import { updateStatusPanel } from "./uiStatus.js?v=20260513x";

const boardElement = document.getElementById("board");
const turnLabel = document.getElementById("turn-label");
const statusLabel = document.getElementById("status-label");
const restartButton = document.getElementById("restart-btn");
const difficultySelect = document.getElementById("difficulty-select");
const themeSelect = document.getElementById("theme-select");
const themePackSelect = document.getElementById("theme-pack-select");
const boardSizeSelect = document.getElementById("board-size-select");
const audioFeedbackSelect = document.getElementById("audio-feedback-select");
const mobileFocusToggle = document.getElementById("mobile-focus-toggle");
const mobileStatusPill = document.getElementById("mobile-status-pill");
const mobileTurnLabel = document.getElementById("mobile-turn-label");
const mobileStatusLabel = document.getElementById("mobile-status-label");
const critterOpponentElement = document.getElementById("critter-opponent");
const celebrationOverlay = document.getElementById("celebration-overlay");
const celebrationTitle = document.getElementById("celebration-title");
const celebrationSubtitle = document.getElementById("celebration-subtitle");
const celebrationCloseButton = document.getElementById("celebration-close");
const confettiLayer = document.getElementById("confetti-layer");

let gameState = createInitialState();
const humanPlayer = "light";
const computerPlayer = "dark";
let difficulty = difficultySelect?.value ?? "medium";
let themePreference = themeSelect?.value ?? "auto";
let themePackPreference = themePackSelect?.value ?? "birthday";
let boardSizePreference = boardSizeSelect?.value ?? "compact";
let audioFeedbackEnabled = (audioFeedbackSelect?.value ?? "on") === "on";
let sceneTheme = "day";
let mobileGameOnly = false;
let computerTurnTimer = null;
let autoThemeTimer = null;
let announcedWinner = null;
let lastEndgameAnnouncement = "";
const pufflyWinMessage = "Puffly won! Better luck in the next game";

function refresh(statusMessage) {
  renderBoard(boardElement, gameState);
  updateStatusPanel(gameState, turnLabel, statusLabel, statusMessage, {
    humanPlayer,
    computerPlayer,
  });
  if (mobileTurnLabel && turnLabel) {
    mobileTurnLabel.textContent = turnLabel.textContent;
  }
  if (mobileStatusLabel && statusLabel) {
    mobileStatusLabel.textContent = statusLabel.textContent;
  }
  if (gameState.winner && announcedWinner !== gameState.winner) {
    announcedWinner = gameState.winner;
    showCelebration(gameState.winner);
  }
}

function winnerLabel(winner) {
  return winner === computerPlayer ? "Puffly" : "You";
}

function getCelebrationSubtitle(winner, level) {
  if (winner === computerPlayer) {
    return "";
  }

  return "Congratulations! You beat Puffly. You won.";
}

function playEndgameChime(winner) {
  if (typeof window === "undefined") {
    return;
  }
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextCtor) {
    return;
  }

  const ctx = new AudioContextCtor();
  const now = ctx.currentTime;
  const isUserWin = winner === humanPlayer;
  const notesByPack = {
    birthday: isUserWin
      ? [523.25, 659.25, 783.99, 1046.5]
      : [392.0, 349.23, 329.63],
    school: isUserWin
      ? [493.88, 587.33, 659.25, 783.99]
      : [369.99, 329.63, 293.66],
    beach: isUserWin
      ? [440.0, 554.37, 659.25, 880.0]
      : [329.63, 293.66, 261.63],
  };
  const notes = notesByPack[themePackPreference] ?? notesByPack.birthday;
  notes.forEach((frequency, index) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    if (themePackPreference === "school") {
      osc.type = isUserWin ? "square" : "triangle";
    } else if (themePackPreference === "beach") {
      osc.type = isUserWin ? "sine" : "triangle";
    } else {
      osc.type = isUserWin ? "triangle" : "sine";
    }
    osc.frequency.value = frequency;
    gain.gain.value = 0.0001;
    osc.connect(gain);
    gain.connect(ctx.destination);
    const start = now + index * 0.11;
    const end = start + (isUserWin ? 0.17 : 0.15);
    gain.gain.exponentialRampToValueAtTime(0.04, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    osc.start(start);
    osc.stop(end);
  });
  window.setTimeout(() => ctx.close(), 650);
}

function playEndgameAudio(message, winner) {
  if (!audioFeedbackEnabled || typeof window === "undefined") {
    return;
  }

  const normalized = message.trim();
  if (!normalized || normalized === lastEndgameAnnouncement) {
    return;
  }
  lastEndgameAnnouncement = normalized;
  playEndgameChime(winner);

  if ("speechSynthesis" in window && "SpeechSynthesisUtterance" in window) {
    window.speechSynthesis.cancel();
    window.speechSynthesis.resume();
    const utterance = new SpeechSynthesisUtterance(normalized);
    utterance.rate = 0.95;
    utterance.pitch = 1.03;
    utterance.volume = 1;
    window.setTimeout(() => {
      window.speechSynthesis.speak(utterance);
    }, 80);
  }
}

function showCelebration(winner) {
  if (!celebrationOverlay || !celebrationTitle || !celebrationSubtitle || !confettiLayer) {
    return;
  }

  celebrationTitle.textContent = winner === computerPlayer ? pufflyWinMessage : "You win!";
  celebrationSubtitle.textContent = getCelebrationSubtitle(winner, difficulty);
  const endgameAnnouncement =
    winner === computerPlayer
      ? pufflyWinMessage
      : `${celebrationTitle.textContent} ${celebrationSubtitle.textContent}`.trim();
  playEndgameAudio(endgameAnnouncement, winner);

  celebrationOverlay.classList.remove("hidden");
  confettiLayer.innerHTML = "";

  for (let i = 0; i < 72; i += 1) {
    const bit = document.createElement("span");
    bit.className = "confetti-bit";
    bit.style.left = `${Math.random() * 100}%`;
    bit.style.background = `hsl(${Math.floor(Math.random() * 360)} 85% 60%)`;
    bit.style.animationDelay = `${Math.random() * 0.7}s`;
    bit.style.animationDuration = `${1.4 + Math.random() * 1.2}s`;
    bit.style.transform = `translateY(-10px) rotate(${Math.random() * 360}deg)`;
    confettiLayer.appendChild(bit);
  }
}

function hideCelebration() {
  if (!celebrationOverlay || !confettiLayer) {
    return;
  }
  celebrationOverlay.classList.add("hidden");
  confettiLayer.innerHTML = "";
}

function applySceneTheme(theme) {
  sceneTheme = theme;
  document.body.dataset.theme = sceneTheme;
}

function applyThemePackPreference(packChoice) {
  themePackPreference = packChoice;
  document.body.dataset.scenePack = themePackPreference;
}

function applyBoardSizePreference(sizeChoice) {
  boardSizePreference = sizeChoice;
  document.body.dataset.boardSize = boardSizePreference;
}

function setMobileGameOnly(enabled) {
  mobileGameOnly = enabled;
  document.body.classList.toggle("mobile-game-only", mobileGameOnly);
  mobileStatusPill?.classList.toggle("active", mobileGameOnly);
  if (mobileFocusToggle) {
    mobileFocusToggle.textContent = mobileGameOnly ? "Show Controls" : "Game Only Mode";
    mobileFocusToggle.setAttribute("aria-pressed", String(mobileGameOnly));
  }
}

function getThemeForLocalTime() {
  const hour = new Date().getHours();
  return hour >= 18 || hour < 6 ? "night" : "day";
}

function stopAutoThemeUpdates() {
  if (autoThemeTimer) {
    clearInterval(autoThemeTimer);
    autoThemeTimer = null;
  }
}

function startAutoThemeUpdates() {
  stopAutoThemeUpdates();
  autoThemeTimer = setInterval(() => {
    if (themePreference !== "auto") {
      return;
    }
    applySceneTheme(getThemeForLocalTime());
  }, 60000);
}

function applyThemePreference(themeChoice) {
  themePreference = themeChoice;
  if (themePreference === "auto") {
    applySceneTheme(getThemeForLocalTime());
    startAutoThemeUpdates();
    return sceneTheme;
  }
  stopAutoThemeUpdates();
  applySceneTheme(themePreference);
  return sceneTheme;
}

async function runComputerTurnAnimated() {
  critterOpponentElement?.classList.remove("thinking");
  while (!gameState.winner && gameState.currentPlayer === computerPlayer) {
    const move = chooseComputerMove(gameState, computerPlayer, difficulty);
    if (!move) {
      critterOpponentElement?.classList.remove("thinking");
      refresh("Computer has no legal moves.");
      return;
    }

    await animatePufflyHandMove(
      boardElement,
      move,
      critterOpponentElement,
      (() => {
        let detachCarriedPiece = null;
        return (driverNode, motion) => {
          if (motion?.phase === "grab") {
            detachCarriedPiece = attachPieceToDriver(boardElement, gameState, move, driverNode);
            return Promise.resolve();
          }
          if (motion?.phase === "drop") {
            detachCarriedPiece?.();
            detachCarriedPiece = null;
            return Promise.resolve();
          }
          return Promise.resolve();
        };
      })(),
    );
    const result = applyMove(gameState, move);
    gameState = result.nextState;
    if (move.isCapture) {
      critterOpponentElement?.classList.add("excited");
      window.setTimeout(() => critterOpponentElement?.classList.remove("excited"), 420);
    }
    refresh(result.status);
    await new Promise((resolve) => window.setTimeout(resolve, 120));
    if (!gameState.winner && gameState.currentPlayer === computerPlayer) {
      critterOpponentElement?.classList.add("thinking");
    }
  }
  critterOpponentElement?.classList.remove("thinking");
}

function maybeRunComputerTurn() {
  if (computerTurnTimer) {
    clearTimeout(computerTurnTimer);
    computerTurnTimer = null;
  }

  if (gameState.winner || gameState.currentPlayer !== computerPlayer) {
    return;
  }

  computerTurnTimer = setTimeout(() => {
    critterOpponentElement?.classList.add("thinking");
    refresh(`Computer (${difficulty}) is thinking...`);
    runComputerTurnAnimated();
  }, 450);
}

attachInputController({
  getState: () => gameState,
  setState: (nextState, statusMessage) => {
    gameState = nextState;
    refresh(statusMessage);
    maybeRunComputerTurn();
  },
  boardElement,
  humanPlayer,
  isAudioFeedbackEnabled: () => audioFeedbackEnabled,
});

restartButton.addEventListener("click", () => {
  if (computerTurnTimer) {
    clearTimeout(computerTurnTimer);
    computerTurnTimer = null;
  }
  critterOpponentElement?.classList.remove(
    "thinking",
    "acting",
    "left-acting",
    "right-acting",
    "reaching",
    "grabbing",
    "excited",
  );
  gameState = createInitialState();
  announcedWinner = null;
  lastEndgameAnnouncement = "";
  hideCelebration();
  refresh(`New game started (${difficulty} mode). Puffly opens from the far side.`);
  maybeRunComputerTurn();
});

if (difficultySelect) {
  difficultySelect.addEventListener("change", (event) => {
    difficulty = event.target.value;
    refresh(`Computer difficulty set to ${difficulty}.`);
    maybeRunComputerTurn();
  });
}

if (themeSelect) {
  themeSelect.addEventListener("change", (event) => {
    const activeTheme = applyThemePreference(event.target.value);
    if (themePreference === "auto") {
      refresh(`Theme auto-switch is on (${activeTheme} right now).`);
      return;
    }
    refresh(`Theme switched to ${activeTheme}.`);
  });
}

if (themePackSelect) {
  themePackSelect.addEventListener("change", (event) => {
    applyThemePackPreference(event.target.value);
    refresh(`Theme pack set to ${themePackPreference}.`);
  });
}

if (boardSizeSelect) {
  boardSizeSelect.addEventListener("change", (event) => {
    applyBoardSizePreference(event.target.value);
    refresh(`Board size set to ${boardSizePreference}.`);
  });
}

if (audioFeedbackSelect) {
  audioFeedbackSelect.addEventListener("change", (event) => {
    audioFeedbackEnabled = event.target.value === "on";
    refresh(`Audio feedback ${audioFeedbackEnabled ? "enabled" : "disabled"}.`);
  });
}

if (mobileFocusToggle) {
  mobileFocusToggle.addEventListener("click", () => {
    setMobileGameOnly(!mobileGameOnly);
  });
}

if (celebrationCloseButton) {
  celebrationCloseButton.addEventListener("click", () => {
    hideCelebration();
  });
}

applyThemePreference(themePreference);
applyThemePackPreference(themePackPreference);
applyBoardSizePreference(boardSizePreference);
setMobileGameOnly(false);
if (typeof window !== "undefined") {
  window.addEventListener("resize", () => {
    if (window.innerWidth > 700 && mobileGameOnly) {
      setMobileGameOnly(false);
    }
  });
}
refresh("Puffly opens the game. Get ready to move the frog team.");
maybeRunComputerTurn();
