import {
  BOARD_SIZE,
  applyMove,
  chooseComputerMove,
  createInitialState,
  getAllLegalMovesForPlayer,
  getLegalMovesForPiece,
  isDarkSquare,
} from "./engine.js?v=10";
import {
  PRACTICE_FLIP_VOICE_PHRASE,
  SPEECH_BUILD,
  VOICE_CLIP_BASE,
  VOICE_CLIP_EXT,
  VOICE_CLIP_IDS,
  getPracticeEndgamePhrase,
  FRIEND_LOBBY_VOICE_PHRASE,
  buildFriendGameSwitchClipSequence,
  buildFriendJoinClipSequence,
  buildFriendOpponentJoinedClipSequence,
  filterClipPhrases,
  friendFlipResultClipText,
  mapFriendPhraseToClipText,
  playerColorFromFriendTurnPhrase,
  resolveVoiceClipId,
  voiceClipPhraseFromMascotThought,
} from "./voicePhrases.js?v=283";
import { DEFAULT_GAME_ID, GAME_REGISTRY, getGameConfig, isKnownGame, normalizeGameId } from "./games/registry.js";
import {
  FOUR_COLS,
  FOUR_ROWS,
  FOUR_STARTING_PIECES,
  applyFourInARowDrop,
  chooseFourInARowComputerColumn,
  createFourInARowInitialState,
  getDroppableColumns,
  getLandingRow,
} from "./games/fourinarow.js";
import {
  PUZZLE_ALLOWED_GRID_SIZES,
  PUZZLE_COLS,
  PUZZLE_IMAGE_URL,
  PUZZLE_ROWS,
  applyPuzzlePlacement,
  choosePuzzleComputerPlacement,
  createPuzzleInitialState,
  getPuzzlePieceCountForGrid,
  getPuzzlePiece,
  getPuzzleRemainingByOwner,
  normalizePuzzleTurn,
} from "./games/puzzle.js";

const boardElement = document.getElementById("board");
const gameButtons = Array.from(document.querySelectorAll(".game-btn"));
const appTitle = document.getElementById("app-title");
const friendLockOverlay = document.getElementById("friend-lock-overlay");
const restartButton = document.getElementById("restart-btn");
const undoButton = document.getElementById("undo-btn");
const rulesButton = document.getElementById("rules-btn");
const controlsPanel = document.querySelector(".controls");
const difficultyButtons = Array.from(document.querySelectorAll("#puffly-controls .difficulty-btn"));
const friendDifficultyButtons = Array.from(document.querySelectorAll(".friend-difficulty-btn"));
const friendPuzzleDifficultyPanel = document.getElementById("friend-puzzle-difficulty");
const audioToggleButton = document.getElementById("audio-toggle-btn");
const pufflyControls = document.getElementById("puffly-controls");
const friendControls = document.getElementById("friend-controls");
const createRoomButton = document.getElementById("create-room-btn");
const joinRoomButton = document.getElementById("join-room-btn");
const copyRoomButton = document.getElementById("copy-room-btn");
const leaveRoomButton = document.getElementById("leave-room-btn");
const roomCodeInput = document.getElementById("room-code-input");
const friendStatusLabel = document.getElementById("friend-status");
const friendInvitePanel = document.getElementById("friend-invite-panel");
const friendRoomCodeLabel = document.getElementById("friend-room-code");
const friendInviteLink = document.getElementById("friend-invite-link");
const copyInviteButton = document.getElementById("copy-invite-btn");
const historyList = document.getElementById("history-list");
const rulesPanel = document.getElementById("rules-panel");
const puzzleDebugStrip = document.getElementById("puzzle-debug-strip");
const ruleLine1 = document.getElementById("rule-line-1");
const ruleLine2 = document.getElementById("rule-line-2");
const ruleLine3 = document.getElementById("rule-line-3");
const ruleLine4 = document.getElementById("rule-line-4");
const playPufflyButton = document.getElementById("play-puffly-btn");
const playFriendButton = document.getElementById("play-friend-btn");
const friendLockText = document.getElementById("friend-lock-text");
const friendChatPanel = document.getElementById("friend-chat-panel");
const chatMessagesElement = document.getElementById("chat-messages");
const chatInput = document.getElementById("chat-input");
const chatSendButton = document.getElementById("chat-send-btn");
const chatMuteButton = document.getElementById("chat-mute-btn");
const chatUnreadBadge = document.getElementById("chat-unread-badge");
const voiceJoinButton = document.getElementById("voice-join-btn");
const voiceMuteMicButton = document.getElementById("voice-mic-btn");
const voiceSpeakerButton = document.getElementById("voice-speaker-btn");
const speechUnlockOverlay = document.getElementById("speech-unlock-overlay");
const speechUnlockButton = document.getElementById("speech-unlock-btn");
const blueAvatar = document.getElementById("blue-avatar");
const greenAvatar = document.getElementById("green-avatar");
const voiceStatusLabel = document.getElementById("voice-status");
const blueCapturedPile = document.getElementById("blue-captured-pile");
const greenCapturedPile = document.getElementById("green-captured-pile");
const blueCapturedTray = document.querySelector(".captured-tray.blue");
const greenCapturedTray = document.querySelector(".captured-tray.green");
const blueCapturedLabel = document.querySelector(".captured-tray.blue p");
const greenCapturedLabel = document.querySelector(".captured-tray.green p");
const celebrationOverlay = document.getElementById("celebration-overlay");
const celebrationFx = document.getElementById("celebration-fx");
const celebrationTitle = document.getElementById("celebration-title");
const celebrationSubtitle = document.getElementById("celebration-subtitle");
const celebrationClose = document.getElementById("celebration-close");
const pufflyPanel = document.getElementById("puffly-panel");
const pufflyThought = document.getElementById("puffly-thought");
const teamMascotLabel = document.getElementById("team-mascot-label");
const blueMascotFace = document.querySelector("#puffly-panel .blue-face");
const greenMascotFace = document.querySelector("#puffly-panel .green-face");
const starterFlipButton = document.getElementById("starter-flip-btn");
const starterCoin = document.getElementById("starter-coin");
const PUZZLE_DEBUG_ENABLED =
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).get("puzzleDebug") === "1";

const humanPlayer = "light";
const computerPlayer = "dark";
const PRACTICE_DIFFICULTY_LABELS = {
  checkers: { easy: "Silly", medium: "Playful", hard: "Clever" },
  fourinarow: { easy: "Silly", medium: "Playful", hard: "Clever" },
  puzzle: { easy: "Mini", medium: "Classic", hard: "Mega" },
};
let difficulty = "medium";
let state = createStateForGame(DEFAULT_GAME_ID);
let busy = false;
let deferRoomSyncUntilIdle = false;
let lastStatusMessage = "Make your move.";
let selectedGameId = DEFAULT_GAME_ID;
let playMode = "puffly";
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
const FRIEND_MOVE_DELAY_MS = 420;
/** Opponent move animation disabled — strict server snapshots keep both boards identical. */
const FRIEND_ANIMATE_OPPONENT_MOVES = false;
const FRIEND_ROOM_POLL_MS = 250;
const STARTER_FLIP_ANIMATION_MS = 1450;
const FRIEND_FLIP_SYNC_MS = 380;
const PUFFLY_PUZZLE_PLACE_MS = 1250;
const CHECKERS_STARTING_PIECES = 12;
const PUZZLE_JIGSAW_BASE = 100;
const PUZZLE_JIGSAW_TAB = 20;
let celebrationTimers = [];
let pufflyCheerTimer = null;
let rulesAutoHideTimer = null;
let remoteSession = null;
let roomPollTimer = null;
let roomChatMessages = [];
let chatNotificationsMuted = false;
let chatUnreadCount = 0;
let voicePeer = null;
let voiceLocalStream = null;
let voiceRemoteStream = null;
let voiceSignalPollTimer = null;
let voiceAudioContext = null;
let voiceLocalLevelTimer = null;
let voiceRemoteLevelTimer = null;
let voiceJoined = false;
let voiceMicMuted = false;
let voiceSpeakerMuted = false;
let voiceOfferSent = false;
let voiceRemoteAudioElement = null;
let applyingRemoteSync = false;
const FRIEND_SESSION_STORAGE_KEY = "puffly.friend.session.v1";
let triedStoredFriendReconnect = false;
let reconnectingStoredFriendSession = false;
let pendingInviteShareRoomCode = "";
let lastCreateRoomTapAt = 0;
let lastJoinRoomTapAt = 0;
let lastPuzzleBoardActivateAt = 0;
let lastTrayTapAt = 0;
let lastBoardTapAt = 0;
let puzzlePlaceInFlight = false;
let lastTraySelectedPieceId = "";
const puzzleTrayPieceById = new Map();
let boardGeometryLockedAt = 0;
const BOARD_GEOMETRY_LOCK_TTL_MS = 400;
const AUTO_JOIN_ROOM_CODE = getJoinCodeFromUrl();
const AUTO_GAME_ID = getGameFromUrl();
const AUTO_PUZZLE_SIZE = getPuzzleSizeFromUrl();
let pendingPrioritySpeech = "";
let pendingJoinIntroTeam = "";
let friendSpeechPlaying = false;
const friendSpeechQueue = [];
let friendSpeechWatchdog = null;
const speechNeedsInteractionUnlock = detectIOSLikeBrowser();

let speechUnlocked = !speechNeedsInteractionUnlock;
let pendingUnlockSpeech = "";
let selectedPuzzlePieceId = "";
let puzzleFlipTurnLocal = "dark";
let puzzleTrayBootstrapAttempted = false;
let puzzlePreFlipGeometryRefreshScheduled = false;
const SVG_NS = "http://www.w3.org/2000/svg";
const puzzleEdgeCache = new Map();

function key(row, col) {
  return `${row},${col}`;
}

function clone(data) {
  return JSON.parse(JSON.stringify(data));
}

function puzzleEdgeSeed(row, col) {
  const raw = Math.sin((row + 1) * 137.19 + (col + 1) * 91.73) * 10000;
  return raw - Math.floor(raw) >= 0.5 ? 1 : -1;
}

function inferPuzzleGridSizeFromState(targetState = state) {
  const pieces = targetState?.pieces;
  const sizeByCount = { 4: 2, 16: 4, 25: 5 };
  if (Array.isArray(pieces) && pieces.length > 0 && sizeByCount[pieces.length]) {
    const countSize = sizeByCount[pieces.length];
    const rawRows = Number(targetState?.rows);
    const rawCols = Number(targetState?.cols ?? targetState?.rows);
    const declaredGridPieces =
      PUZZLE_ALLOWED_GRID_SIZES.includes(rawRows) && PUZZLE_ALLOWED_GRID_SIZES.includes(rawCols)
        ? rawRows * rawCols
        : 0;
    if (declaredGridPieces !== pieces.length) {
      return { rows: countSize, cols: countSize };
    }
  }
  const rawRows = Number(targetState?.rows);
  const rawCols = Number(targetState?.cols ?? targetState?.rows);
  if (PUZZLE_ALLOWED_GRID_SIZES.includes(rawRows) && PUZZLE_ALLOWED_GRID_SIZES.includes(rawCols)) {
    return { rows: rawRows, cols: rawCols };
  }
  if (Array.isArray(pieces) && pieces.length > 0) {
    if (sizeByCount[pieces.length]) {
      const size = sizeByCount[pieces.length];
      return { rows: size, cols: size };
    }
    let maxRow = 0;
    let maxCol = 0;
    for (const piece of pieces) {
      if (Number.isInteger(piece.correctRow)) {
        maxRow = Math.max(maxRow, piece.correctRow);
      }
      if (Number.isInteger(piece.correctCol)) {
        maxCol = Math.max(maxCol, piece.correctCol);
      }
    }
    const inferred = Math.max(maxRow, maxCol) + 1;
    if (PUZZLE_ALLOWED_GRID_SIZES.includes(inferred)) {
      return { rows: inferred, cols: inferred };
    }
  }
  return { rows: PUZZLE_ROWS, cols: PUZZLE_COLS };
}

function getPuzzleGridSizeFromState(targetState = state) {
  return inferPuzzleGridSizeFromState(targetState);
}

function puzzleDifficultyFromGridSize(rows) {
  if (rows === 2) {
    return "easy";
  }
  if (rows === 5) {
    return "hard";
  }
  return "medium";
}

function createPuzzleHorizontalEdges(rows, cols) {
  return Array.from({ length: rows - 1 }, (_, row) =>
    Array.from({ length: cols }, (_, col) => puzzleEdgeSeed(row, col + 19)),
  );
}

function createPuzzleVerticalEdges(rows, cols) {
  return Array.from({ length: rows }, (_, row) =>
    Array.from({ length: cols - 1 }, (_, col) => puzzleEdgeSeed(row + 23, col)),
  );
}

function getPuzzleEdgeProfiles(row, col, rows, cols) {
  const cacheKey = `${rows}x${cols}`;
  if (!puzzleEdgeCache.has(cacheKey)) {
    puzzleEdgeCache.set(cacheKey, {
      horizontal: createPuzzleHorizontalEdges(rows, cols),
      vertical: createPuzzleVerticalEdges(rows, cols),
    });
  }
  const cached = puzzleEdgeCache.get(cacheKey);
  const horizontal = cached.horizontal;
  const vertical = cached.vertical;
  return {
    top: row === 0 ? 0 : -horizontal[row - 1][col],
    right: col === cols - 1 ? 0 : vertical[row][col],
    bottom: row === rows - 1 ? 0 : horizontal[row][col],
    left: col === 0 ? 0 : -vertical[row][col - 1],
  };
}

function buildPuzzlePiecePath(piece) {
  const left = 0;
  const top = 0;
  const right = PUZZLE_JIGSAW_BASE;
  const bottom = PUZZLE_JIGSAW_BASE;
  const { rows, cols } = getPuzzleGridSizeFromState();
  const edges = getPuzzleEdgeProfiles(piece.correctRow, piece.correctCol, rows, cols);
  const topOffset = -edges.top * PUZZLE_JIGSAW_TAB;
  const rightOffset = edges.right * PUZZLE_JIGSAW_TAB;
  const bottomOffset = edges.bottom * PUZZLE_JIGSAW_TAB;
  const leftOffset = -edges.left * PUZZLE_JIGSAW_TAB;

  const topA = left + PUZZLE_JIGSAW_BASE * 0.35;
  const topC = left + PUZZLE_JIGSAW_BASE * 0.65;
  const rightA = top + PUZZLE_JIGSAW_BASE * 0.35;
  const rightC = top + PUZZLE_JIGSAW_BASE * 0.65;
  const bottomA = right - PUZZLE_JIGSAW_BASE * 0.35;
  const bottomC = right - PUZZLE_JIGSAW_BASE * 0.65;
  const leftA = bottom - PUZZLE_JIGSAW_BASE * 0.35;
  const leftC = bottom - PUZZLE_JIGSAW_BASE * 0.65;

  return [
    `M ${left} ${top}`,
    `L ${topA} ${top}`,
    `C ${left + PUZZLE_JIGSAW_BASE * 0.41} ${top} ${left + PUZZLE_JIGSAW_BASE * 0.43} ${top + topOffset} ${left + PUZZLE_JIGSAW_BASE * 0.5} ${top + topOffset}`,
    `C ${left + PUZZLE_JIGSAW_BASE * 0.57} ${top + topOffset} ${left + PUZZLE_JIGSAW_BASE * 0.59} ${top} ${topC} ${top}`,
    `L ${right} ${top}`,
    `L ${right} ${rightA}`,
    `C ${right} ${top + PUZZLE_JIGSAW_BASE * 0.41} ${right + rightOffset} ${top + PUZZLE_JIGSAW_BASE * 0.43} ${right + rightOffset} ${top + PUZZLE_JIGSAW_BASE * 0.5}`,
    `C ${right + rightOffset} ${top + PUZZLE_JIGSAW_BASE * 0.57} ${right} ${top + PUZZLE_JIGSAW_BASE * 0.59} ${right} ${rightC}`,
    `L ${right} ${bottom}`,
    `L ${bottomA} ${bottom}`,
    `C ${right - PUZZLE_JIGSAW_BASE * 0.41} ${bottom} ${right - PUZZLE_JIGSAW_BASE * 0.43} ${bottom + bottomOffset} ${right - PUZZLE_JIGSAW_BASE * 0.5} ${bottom + bottomOffset}`,
    `C ${right - PUZZLE_JIGSAW_BASE * 0.57} ${bottom + bottomOffset} ${right - PUZZLE_JIGSAW_BASE * 0.59} ${bottom} ${bottomC} ${bottom}`,
    `L ${left} ${bottom}`,
    `L ${left} ${leftA}`,
    `C ${left} ${bottom - PUZZLE_JIGSAW_BASE * 0.41} ${left + leftOffset} ${bottom - PUZZLE_JIGSAW_BASE * 0.43} ${left + leftOffset} ${bottom - PUZZLE_JIGSAW_BASE * 0.5}`,
    `C ${left + leftOffset} ${bottom - PUZZLE_JIGSAW_BASE * 0.57} ${left} ${bottom - PUZZLE_JIGSAW_BASE * 0.59} ${left} ${leftC}`,
    "Z",
  ].join(" ");
}

function buildPuzzleOuterEdgePath(piece, rows, cols) {
  const commands = [];
  const inset = 1.25;
  const left = inset;
  const top = inset;
  const right = PUZZLE_JIGSAW_BASE - inset;
  const bottom = PUZZLE_JIGSAW_BASE - inset;
  if (piece.correctRow === 0) {
    commands.push(`M ${left} ${top} L ${right} ${top}`);
  }
  if (piece.correctCol === cols - 1) {
    commands.push(`M ${right} ${top} L ${right} ${bottom}`);
  }
  if (piece.correctRow === rows - 1) {
    commands.push(`M ${left} ${bottom} L ${right} ${bottom}`);
  }
  if (piece.correctCol === 0) {
    commands.push(`M ${left} ${top} L ${left} ${bottom}`);
  }
  return commands.join(" ");
}

function isDesktopMacBrowser() {
  if (typeof navigator === "undefined") {
    return false;
  }
  const ua = navigator.userAgent || "";
  return (
    /Macintosh/i.test(ua) &&
    (/Chrome\//i.test(ua) ||
      /Edg\//i.test(ua) ||
      /Firefox\//i.test(ua) ||
      (/Safari\//i.test(ua) && !/Mobile|CriOS|FxiOS|EdgiOS/i.test(ua)))
  );
}

function detectIOSLikeBrowser() {
  if (typeof navigator === "undefined") {
    return false;
  }
  if (isDesktopMacBrowser()) {
    return false;
  }
  const ua = navigator.userAgent || "";
  if (/iPad|iPhone|iPod/i.test(ua)) {
    return true;
  }
  // iPadOS 13+ desktop UA: MacIntel + touch (not a desktop Mac browser).
  if (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) {
    return true;
  }
  return false;
}

/** Desktop: unlock speech helpers; friend voice uses the same WAV path as Practice. */
function initDesktopSpeechDefaults() {
  if (speechNeedsInteractionUnlock) {
    return;
  }
  speechUnlocked = true;
  speechGesturePrimed = true;
  pufflyVoiceReady = true;
  updateSpeechUnlockOverlay();
}

function isChromiumBrowser() {
  if (typeof navigator === "undefined") {
    return false;
  }
  const ua = navigator.userAgent || "";
  return /Chrome\//i.test(ua) && !/Edg\//i.test(ua);
}

function shouldQueueFriendSpeech() {
  return speechNeedsInteractionUnlock;
}

function canSpeakNow(options = {}) {
  if (!audioEnabled || typeof window === "undefined" || !window.speechSynthesis) {
    return false;
  }
  if (options.inGesture) {
    return true;
  }
  if (!speechNeedsInteractionUnlock) {
    return true;
  }
  return speechGesturePrimed && speechUnlocked;
}

function prepareSpeechSynthesisForUtterance(options = {}) {
  const syn = typeof window !== "undefined" ? window.speechSynthesis : null;
  if (!syn) {
    return null;
  }
  syn.resume();
  const skipCancel = Boolean(options.skipCancel);
  if (isChromiumBrowser() && !skipCancel) {
    syn.cancel();
    syn.resume();
  }
  return syn;
}

function readInviteParamsFromUrl() {
  if (typeof window === "undefined") {
    return { join: "", game: "", puzzleSize: "", mode: "" };
  }
  const search = new URLSearchParams(window.location.search);
  let hashRaw = window.location.hash.replace(/^#/, "");
  if (hashRaw.startsWith("?")) {
    hashRaw = hashRaw.slice(1);
  }
  const hash = new URLSearchParams(hashRaw.includes("=") ? hashRaw : "");
  const pick = (key) => (search.get(key) || hash.get(key) || "").trim();
  let join = pick("join").toUpperCase();
  if (!join && hashRaw && /^[A-Z0-9]{4,8}$/i.test(hashRaw)) {
    join = hashRaw.toUpperCase();
  }
  const game = normalizeGameId(pick("game").toLowerCase());
  const mode = pick("mode").toLowerCase();
  let puzzleSize = pick("puzzleSize").toLowerCase() || pick("puzzleDifficulty").toLowerCase();
  if (puzzleSize === "mini") {
    puzzleSize = "easy";
  } else if (puzzleSize === "classic") {
    puzzleSize = "medium";
  } else if (puzzleSize === "mega") {
    puzzleSize = "hard";
  }
  return {
    join: /^[A-Z0-9]{4,8}$/.test(join) ? join : "",
    game: isKnownGame(game) ? game : "",
    puzzleSize: puzzleSize === "easy" || puzzleSize === "medium" || puzzleSize === "hard" ? puzzleSize : "",
    mode: mode === "friend" ? "friend" : "",
  };
}

function getJoinCodeFromUrl() {
  return readInviteParamsFromUrl().join;
}

function getGameFromUrl() {
  const inviteGame = readInviteParamsFromUrl().game;
  return inviteGame || DEFAULT_GAME_ID;
}

function getPuzzleSizeFromUrl() {
  return readInviteParamsFromUrl().puzzleSize;
}

function applyInviteLandingConfig() {
  const invite = readInviteParamsFromUrl();
  if (invite.game) {
    selectedGameId = invite.game;
  }
  if (invite.puzzleSize) {
    difficulty = invite.puzzleSize;
  }
  updateGameButtons();
  updateAppTitle();
  updateDifficultyButtonLabels();
  updateFriendDifficultyButtons();
  updateFriendPuzzleDifficultyPanel();
  updateRulesForMode();
}

function isValidCheckersBoard(board) {
  if (!Array.isArray(board) || board.length !== BOARD_SIZE) {
    return false;
  }
  return board.every((row) => Array.isArray(row) && row.length === BOARD_SIZE);
}

function isValidFourInARowGrid(grid) {
  if (!Array.isArray(grid) || grid.length !== FOUR_ROWS) {
    return false;
  }
  return grid.every((row) => Array.isArray(row) && row.length === FOUR_COLS);
}

function createStateForGame(gameId) {
  const normalized = normalizeGameId(gameId);
  let baseState;
  if (normalized === "fourinarow") {
    baseState = createFourInARowInitialState();
  } else if (normalized === "puzzle") {
    baseState = createPuzzleInitialState({ difficulty });
  } else {
    baseState = createInitialState();
  }
  if (normalized === "puzzle") {
    const flip =
      playMode === "friend" && remoteSession ? getPuzzleFlipTurnForRebuild() : puzzleFlipTurnLocal;
    return {
      ...baseState,
      currentPlayer: flip,
      puzzleFlipTurn: flip,
      starterFlipDone: false,
      starterPlayer: null,
      preFlipSetupReady: false,
    };
  }
  return {
    ...baseState,
    starterFlipDone: false,
    starterPlayer: null,
    preFlipSetupReady: false,
  };
}

function isValidPuzzlePiece(piece, puzzleState = state) {
  const { rows, cols } = getPuzzleGridSizeFromState(puzzleState);
  return (
    piece &&
    typeof piece.id === "string" &&
    (piece.owner === "dark" || piece.owner === "light") &&
    Number.isInteger(piece.correctRow) &&
    Number.isInteger(piece.correctCol) &&
    piece.correctRow >= 0 &&
    piece.correctRow < rows &&
    piece.correctCol >= 0 &&
    piece.correctCol < cols
  );
}

function isPuzzleComplete(stateLike = state) {
  const pieces = stateLike?.pieces;
  return Array.isArray(pieces) && pieces.length > 0 && pieces.every((piece) => piece.placed);
}

function repairPuzzleStateGrid(stateLike) {
  if (!stateLike || !Array.isArray(stateLike.pieces) || stateLike.pieces.length === 0) {
    return stateLike;
  }
  const { rows, cols } = inferPuzzleGridSizeFromState(stateLike);
  if (stateLike.rows === rows && stateLike.cols === cols) {
    return stateLike;
  }
  return { ...stateLike, rows, cols };
}

function flushDeferredRoomSync() {
  if (!deferRoomSyncUntilIdle || !remoteSession) {
    return;
  }
  deferRoomSyncUntilIdle = false;
  syncRoomState().catch(() => {});
}

function finalizePuzzleCompletionState(stateLike) {
  if (!isPuzzleComplete(stateLike)) {
    return stateLike;
  }
  return {
    ...stateLike,
    draw: true,
    winner: null,
  };
}

function mergePuzzleFriendState(stateLike) {
  const repaired = repairPuzzleStateGrid(stateLike);
  const { rows, cols } = inferPuzzleGridSizeFromState(repaired);
  return finalizePuzzleCompletionState({
    ...repaired,
    rows,
    cols,
    starterFlipDone: Boolean(stateLike.starterFlipDone),
    starterPlayer: stateLike.starterPlayer === "dark" || stateLike.starterPlayer === "light" ? stateLike.starterPlayer : null,
    preFlipSetupReady: Boolean(stateLike.preFlipSetupReady),
    puzzleFlipTurn:
      stateLike.puzzleFlipTurn === "light" || stateLike.puzzleFlipTurn === "dark"
        ? stateLike.puzzleFlipTurn
        : remoteSession?.puzzleFlipTurn === "light" || remoteSession?.puzzleFlipTurn === "dark"
          ? remoteSession.puzzleFlipTurn
          : null,
  });
}

function applyPuzzleFlipTurnFromRemote(stateLike, apiPayload) {
  const flip =
    apiPayload?.puzzleFlipTurn ??
    stateLike?.puzzleFlipTurn ??
    (!stateLike?.starterFlipDone && (stateLike?.currentPlayer === "light" || stateLike?.currentPlayer === "dark")
      ? stateLike.currentPlayer
      : null);
  if (flip !== "dark" && flip !== "light") {
    return;
  }
  syncPuzzleFlipTurnFromPayload({ puzzleFlipTurn: flip });
}

function rebuildPuzzleStateKeepingFlipTurn() {
  const flip = getPuzzleFlipTurnForRebuild();
  puzzleFlipTurnLocal = flip;
  if (remoteSession) {
    remoteSession.puzzleFlipTurn = flip;
  }
  if (playMode === "friend" && remoteSession) {
    if (state && !state.starterFlipDone) {
      state.puzzleFlipTurn = flip;
      state.currentPlayer = flip;
    }
    selectedPuzzlePieceId = "";
    return;
  }
  state = createStateForGame("puzzle");
  state.currentPlayer = flip;
  state.puzzleFlipTurn = flip;
  selectedPuzzlePieceId = "";
}

function normalizeStateForGame(stateLike, gameId = selectedGameId) {
  if (!stateLike || typeof stateLike !== "object") {
    return createStateForGame(gameId);
  }
  const normalizedGame = normalizeGameId(gameId);
  if (normalizedGame === "puzzle") {
    const { rows, cols } = getPuzzleGridSizeFromState(stateLike);
    const expectedCount = getPuzzlePieceCountForGrid(rows);
    const piecesValid =
      Array.isArray(stateLike.pieces) &&
      stateLike.pieces.length === expectedCount &&
      stateLike.pieces.every((piece) => isValidPuzzlePiece(piece, stateLike));
    if (!piecesValid) {
      if (playMode === "friend" && remoteSession && Array.isArray(stateLike.pieces) && stateLike.pieces.length > 0) {
        return mergePuzzleFriendState(stateLike);
      }
      const fallbackDifficulty =
        rows === 2 ? "easy" : rows === 5 ? "hard" : rows === 4 ? "medium" : difficulty;
      const baseState = createPuzzleInitialState({ difficulty: fallbackDifficulty, size: rows });
      return {
        ...baseState,
        currentPlayer:
          stateLike.puzzleFlipTurn === "light" || stateLike.puzzleFlipTurn === "dark"
            ? stateLike.puzzleFlipTurn
            : !stateLike.starterFlipDone && (stateLike.currentPlayer === "light" || stateLike.currentPlayer === "dark")
              ? stateLike.currentPlayer
              : baseState.currentPlayer,
        puzzleFlipTurn:
          stateLike.puzzleFlipTurn === "light" || stateLike.puzzleFlipTurn === "dark" ? stateLike.puzzleFlipTurn : null,
        starterFlipDone: Boolean(stateLike.starterFlipDone),
        starterPlayer:
          stateLike.starterPlayer === "dark" || stateLike.starterPlayer === "light" ? stateLike.starterPlayer : null,
        preFlipSetupReady: Boolean(stateLike.preFlipSetupReady),
      };
    }
    return mergePuzzleFriendState(stateLike);
  }
  if (normalizedGame === "fourinarow") {
    if (!isValidFourInARowGrid(stateLike.grid)) {
      return createStateForGame("fourinarow");
    }
    return {
      ...stateLike,
      starterFlipDone: Boolean(stateLike.starterFlipDone),
      starterPlayer: stateLike.starterPlayer === "dark" || stateLike.starterPlayer === "light" ? stateLike.starterPlayer : null,
      preFlipSetupReady: Boolean(stateLike.preFlipSetupReady),
    };
  }
  if (!isValidCheckersBoard(stateLike.board)) {
    return createStateForGame("checkers");
  }
  return {
    ...stateLike,
    starterFlipDone: Boolean(stateLike.starterFlipDone),
    starterPlayer: stateLike.starterPlayer === "dark" || stateLike.starterPlayer === "light" ? stateLike.starterPlayer : null,
    preFlipSetupReady: Boolean(stateLike.preFlipSetupReady),
  };
}

function ensureRenderableGameState() {
  if (selectedGameId === "puzzle") {
    return ensurePuzzleStateReady();
  }
  if (selectedGameId === "fourinarow") {
    if (isValidFourInARowGrid(state?.grid)) {
      return false;
    }
    state = createStateForGame("fourinarow");
    return true;
  }
  if (isValidCheckersBoard(state?.board)) {
    return false;
  }
  state = createStateForGame("checkers");
  return true;
}

function ensurePuzzleStateReady() {
  if (selectedGameId !== "puzzle") {
    return false;
  }
  if (state && Array.isArray(state.pieces) && state.pieces.length > 0) {
    state = repairPuzzleStateGrid(state);
  }
  const pieces = state?.pieces;
  const { rows } = getPuzzleGridSizeFromState();
  const expectedCount = getPuzzlePieceCountForGrid(rows);
  if (!Array.isArray(pieces) || pieces.length !== expectedCount || !pieces.every((piece) => isValidPuzzlePiece(piece, state))) {
    if (playMode === "friend" && remoteSession) {
      if (Array.isArray(pieces) && pieces.length > 0) {
        state = mergePuzzleFriendState(state);
        const repairedCount = getPuzzlePieceCountForGrid(state.rows);
        if (
          state.pieces.length === repairedCount &&
          state.pieces.every((piece) => isValidPuzzlePiece(piece, state))
        ) {
          applyPuzzleFlipTurnFromRemote(state, { puzzleFlipTurn: remoteSession.puzzleFlipTurn });
          return false;
        }
      }
      return false;
    }
    rebuildPuzzleStateKeepingFlipTurn();
    return true;
  }
  const normalizedTurn = normalizePuzzleTurn(state);
  if (normalizedTurn !== state) {
    state = normalizedTurn;
    return true;
  }
  return false;
}

function isStarterFlipPending() {
  return !Boolean(state?.starterFlipDone);
}

function starterLabel(player) {
  if (playMode === "puffly") {
    return player === computerPlayer ? "Puffly (Blue)" : "You (Green)";
  }
  return `${playerDisplayName(player).toUpperCase()} Team`;
}

function starterFirstMoveText(player) {
  if (playMode === "puffly") {
    return player === computerPlayer ? "Puffly (Blue) goes first" : "You (Green) go first";
  }
  return `${playerDisplayName(player).toUpperCase()} goes first`;
}

function setStarterCoinFace(player) {
  if (!starterCoin) {
    return;
  }
  starterCoin.classList.remove("pending", "dark", "light");
  if (isStarterFlipPending()) {
    starterCoin.classList.add("pending");
    starterCoin.textContent = "🪙";
    return;
  }
  starterCoin.classList.add(player === "dark" ? "dark" : "light");
  starterCoin.textContent = player === "dark" ? "🐻" : "🐸";
}

function updateStarterFlipButton() {
  if (!starterFlipButton) {
    return;
  }
  const pending = isStarterFlipPending();
  const waitingForRoom = playMode === "friend" && (!remoteSession || !remoteSession.ready);
  const flipperColor = getFriendFlipperColor();
  const canFlipAsPlayer = playMode !== "friend" || remoteSession?.color === flipperColor;
  if (playMode === "puffly" && pending) {
    starterFlipButton.disabled = Boolean(busy);
  } else {
    starterFlipButton.disabled = busy || !pending || waitingForRoom || !canFlipAsPlayer;
  }
  if (!pending) {
    const starter = state.starterPlayer || state.currentPlayer;
    starterFlipButton.textContent = starterFirstMoveText(starter);
    starterFlipButton.removeAttribute("aria-label");
  } else if (playMode === "friend" && remoteSession?.ready && !canFlipAsPlayer) {
    starterFlipButton.textContent = "WAIT";
    starterFlipButton.setAttribute(
      "aria-label",
      `${playerDisplayName(flipperColor)} flips first`,
    );
  } else {
    starterFlipButton.textContent = "FLIP";
    starterFlipButton.setAttribute("aria-label", PRACTICE_FLIP_VOICE_PHRASE);
  }
  setStarterCoinFace(state?.starterPlayer || state?.currentPlayer);
}

function schedulePuzzlePreFlipGeometryRefresh() {
  if (selectedGameId !== "puzzle" || !isStarterFlipPending() || puzzlePreFlipGeometryRefreshScheduled) {
    return;
  }
  puzzlePreFlipGeometryRefreshScheduled = true;
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      if (selectedGameId !== "puzzle" || !isStarterFlipPending()) {
        puzzlePreFlipGeometryRefreshScheduled = false;
        return;
      }
      lockBoardGeometry();
      renderPuzzleBoard();
      puzzlePreFlipGeometryRefreshScheduled = false;
    });
  });
}

function updateAppTitle() {
  if (!appTitle) {
    return;
  }
  if (selectedGameId === "fourinarow") {
    appTitle.textContent = "Puffly Four-in-a-Row";
    return;
  }
  if (selectedGameId === "puzzle") {
    appTitle.textContent = "Puffly Puzzle";
    return;
  }
  appTitle.textContent = "Puffly Checkers";
}

function updateGameButtons() {
  for (const button of gameButtons) {
    const gameId = normalizeGameId(button.dataset.game || DEFAULT_GAME_ID);
    button.classList.toggle("active", gameId === selectedGameId);
  }
}

function readStoredFriendSession() {
  if (typeof window === "undefined" || !window.localStorage) {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(FRIEND_SESSION_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    const roomCode = String(parsed?.roomCode || "").trim().toUpperCase();
    const playerId = String(parsed?.playerId || "").trim();
    const gameType = normalizeGameId(String(parsed?.gameType || "").trim().toLowerCase());
    if (!roomCode || !playerId) {
      return null;
    }
    return { roomCode, playerId, gameType: isKnownGame(gameType) ? gameType : DEFAULT_GAME_ID };
  } catch {
    return null;
  }
}

function writeStoredFriendSession(session) {
  if (typeof window === "undefined" || !window.localStorage || !session) {
    return;
  }
  const payload = {
    roomCode: session.roomCode,
    playerId: session.playerId,
    gameType: normalizeGameId(session.gameType || selectedGameId || DEFAULT_GAME_ID),
    version: typeof session.version === "number" ? session.version : undefined,
    color: session.color === "dark" || session.color === "light" ? session.color : undefined,
  };
  try {
    window.localStorage.setItem(FRIEND_SESSION_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage failures (private mode, quota, etc).
  }
}

function clearStoredFriendSession() {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }
  try {
    window.localStorage.removeItem(FRIEND_SESSION_STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }
}

function resetLocalGameState(gameId = selectedGameId) {
  const normalized = normalizeGameId(gameId);
  selectedGameId = normalized;
  state = createStateForGame(normalized);
  selectedPuzzlePieceId = "";
  moveHistory = [];
  undoSnapshots = [];
  winnerAnnounced = null;
  puzzleTrayBootstrapAttempted = false;
  lastSpokenPhrase = "";
  lastTurnSpoken = "";
  resetPracticeFlipVoiceTracking();
  hideCelebration();
}

function prepareFreshAppLoad() {
  stopRoomPolling();
  remoteSession = null;
  pendingInviteShareRoomCode = "";
  pendingJoinIntroTeam = "";
  triedStoredFriendReconnect = true;
  reconnectingStoredFriendSession = false;
  if (!getJoinCodeFromUrl()) {
    clearStoredFriendSession();
    if (roomCodeInput) {
      roomCodeInput.value = "";
    }
  }
}

function enterFriendLobbyChrome(options = {}) {
  playMode = "friend";
  syncPlayModeChrome();
  if (!speechNeedsInteractionUnlock) {
    speechUnlocked = true;
    speechGesturePrimed = true;
  } else {
    speechUnlocked = false;
    speechGesturePrimed = false;
  }
  if (!remoteSession) {
    friendVoiceStartDismissed = false;
    friendJoinWelcomeSpoken = false;
  }
  updateSpeechUnlockOverlay();
  updateFriendPuzzleDifficultyPanel();
  updateRulesForMode();
  updateFriendRoomButtons();
  updateFriendLockOverlay();
  friendChatPanel?.classList.toggle("hidden", false);
  if (!options.keepStatus) {
    const joiningCode = options.joiningCode || getJoinCodeFromUrl();
    if (joiningCode) {
      setFriendStatus(`Joining room ${joiningCode}...`);
    } else {
      setFriendStatus(getFriendCreateRoomHint());
      setPufflyState("idle", "🤝 Tap Create & Invite above to start.");
      if (!remoteSession) {
        announceFriendLobbyPrompt();
      }
    }
  }
}

async function bootstrapInviteJoin(roomCode) {
  const normalizedCode = String(roomCode || "")
    .trim()
    .toUpperCase();
  if (!normalizedCode) {
    return false;
  }
  if (typeof window !== "undefined" && window.__pufflyUserChosePufflyMode) {
    return false;
  }
  if (typeof window !== "undefined") {
    window.__pufflyInviteJoinInFlight = true;
    window.__pufflyPendingInviteJoin = normalizedCode;
  }
  applyInviteLandingConfig();
  updateGameButtons();
  updateDifficultyButtonLabels();
  updateFriendDifficultyButtons();
  updateAppTitle();
  resetLocalGameState(selectedGameId);
  clearStoredFriendSession();
  stopRoomPolling();
  remoteSession = null;
  enterFriendLobbyChrome({ joiningCode: normalizedCode });
  if (roomCodeInput) {
    roomCodeInput.value = normalizedCode;
  }
  setFriendStatus(`Joining room ${normalizedCode}...`);
  try {
    const joined = await joinRoomWithCode(normalizedCode, {
      fromInvite: true,
      skipModeSetup: true,
    });
    if (typeof window !== "undefined" && window.__pufflyUserChosePufflyMode) {
      return false;
    }
    if (!joined) {
      setFriendStatus("Could not join that invite. Check the link or tap Join Room.");
      render("Friend mode: connect to a room.");
      return false;
    }
    return true;
  } catch (error) {
    setFriendStatus(error?.message || "Could not join that invite.");
    render("Friend mode: connect to a room.");
    return false;
  } finally {
    if (typeof window !== "undefined") {
      window.__pufflyInviteJoinInFlight = false;
    }
    flushPendingPlayModeTap();
  }
}

function maybeAutoJoinFromInviteLink() {
  if (typeof window !== "undefined" && window.__pufflyUserChosePufflyMode) {
    return;
  }
  const code = getJoinCodeFromUrl();
  if (!code || remoteSession) {
    return;
  }
  if (typeof window !== "undefined" && window.__pufflyInviteJoinInFlight) {
    return;
  }
  void bootstrapInviteJoin(code);
}

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lockBoardGeometry(force = false) {
  if (!force && Date.now() - boardGeometryLockedAt < BOARD_GEOMETRY_LOCK_TTL_MS) {
    return;
  }
  const wrap = boardElement.parentElement;
  if (!wrap) {
    return;
  }
  const computed = window.getComputedStyle(wrap);
  const padLeft = Number.parseFloat(computed.paddingLeft) || 0;
  const padRight = Number.parseFloat(computed.paddingRight) || 0;
  const padTop = Number.parseFloat(computed.paddingTop) || 0;
  const padBottom = Number.parseFloat(computed.paddingBottom) || 0;
  const bodyComputed = window.getComputedStyle(document.body);
  const bodyBottomPadding = Number.parseFloat(bodyComputed.paddingBottom) || 0;
  const innerContentWidth = Math.max(0, wrap.clientWidth - padLeft - padRight);
  const wrapRect = wrap.getBoundingClientRect();
  const remainingViewportHeight = Math.max(0, window.innerHeight - wrapRect.top - bodyBottomPadding - 8);
  const innerContentHeight = Math.max(0, remainingViewportHeight - padTop - padBottom);
  if (selectedGameId === "fourinarow") {
    // Account for board border + inner padding so edge circles never clip.
    const fourBoardChrome = (3 + 4) * 2;
    const availableWidth = Math.max(0, innerContentWidth - fourBoardChrome);
    const availableHeight = Math.max(0, innerContentHeight - fourBoardChrome);
    const cellFromWidth = Math.floor(availableWidth / FOUR_COLS);
    const cellFromHeight = Math.floor(availableHeight / FOUR_ROWS);
    const cell = Math.max(1, Math.floor(Math.min(cellFromWidth, cellFromHeight)));
    boardElement.style.width = `${cell * FOUR_COLS + fourBoardChrome}px`;
    boardElement.style.height = `${cell * FOUR_ROWS + fourBoardChrome}px`;
    boardElement.style.gridTemplateColumns = `repeat(${FOUR_COLS}, ${cell}px)`;
    boardElement.style.gridTemplateRows = `repeat(${FOUR_ROWS}, ${cell}px)`;
    boardGeometryLockedAt = Date.now();
    return;
  }
  if (selectedGameId === "puzzle") {
    const { rows, cols } = getPuzzleGridSizeFromState();
    const usable = Math.floor(Math.min(innerContentWidth, innerContentHeight));
    const cell = Math.max(1, Math.floor(usable / Math.max(rows, cols)));
    const boardWidth = cell * cols;
    const boardHeight = cell * rows;
    boardElement.style.width = `${boardWidth}px`;
    boardElement.style.height = `${boardHeight}px`;
    boardElement.style.gridTemplateColumns = `repeat(${cols}, ${cell}px)`;
    boardElement.style.gridTemplateRows = `repeat(${rows}, ${cell}px)`;
    boardGeometryLockedAt = Date.now();
    return;
  }

  const usable = Math.floor(Math.min(innerContentWidth, innerContentHeight));
  const cell = Math.max(1, Math.floor(usable / BOARD_SIZE));
  const boardPixels = cell * BOARD_SIZE;

  boardElement.style.width = `${boardPixels}px`;
  boardElement.style.height = `${boardPixels}px`;
  boardElement.style.gridTemplateColumns = `repeat(${BOARD_SIZE}, ${cell}px)`;
  boardElement.style.gridTemplateRows = `repeat(${BOARD_SIZE}, ${cell}px)`;
  boardGeometryLockedAt = Date.now();
}

function scheduleAudioUnlockFromGesture() {
  window.requestAnimationFrame(() => {
    ensureAudioContext();
    flushPendingPrioritySpeech();
  });
}

function abortPracticeInteractionForModeSwitch() {
  cancelPracticeFlipVoiceTimers();
  practiceFlipSpeakGeneration += 1;
  resetPracticeFlipVoiceTracking();
  releasePuzzleInteractionLocks();
  busy = false;
  deferRoomSyncUntilIdle = false;
  practiceFlipDelivering = false;
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

function isFriendChromeVisible() {
  return (
    typeof document !== "undefined" && document.body.classList.contains("friend-mode")
  );
}

function isFriendModeUiActive() {
  return playMode === "friend";
}

function ensureFriendPlayModeSynced() {
  const domShowsFriend = isFriendChromeVisible();
  if (playMode !== "friend") {
    if (!domShowsFriend) {
      return false;
    }
    if (typeof window !== "undefined") {
      window.__pufflyUserChosePufflyMode = false;
      window.__pufflyPendingPlayMode = "friend";
    }
    abortPracticeInteractionForModeSwitch();
    playMode = "friend";
    syncPlayModeChrome();
    updateFriendPuzzleDifficultyPanel();
    updateRulesForMode();
    updateFriendRoomButtons();
    updateSpeechUnlockOverlay();
  }
  return playMode === "friend";
}

function releaseStaleBusyForFriendAction() {
  if (!busy) {
    return;
  }
  if (playMode === "friend" && !remoteSession && !pendingInviteShareRoomCode) {
    busy = false;
  }
}

function getFriendLockMessage() {
  if (!isFriendModeUiActive()) {
    return "";
  }
  // Before a room exists, keep the board visible — prompt via status line only.
  if (!remoteSession) {
    return "";
  }
  if (!remoteSession.ready) {
    return "Waiting for your friend to join...";
  }
  return "";
}

function updateFriendLockOverlay() {
  if (!friendLockOverlay) {
    return;
  }
  const message = getFriendLockMessage();
  const show = Boolean(message);
  friendLockOverlay.classList.toggle("hidden", !show);
  if (friendLockText && message) {
    friendLockText.textContent = message;
  }
}

function squareText(square) {
  return `(${square.row},${square.col})`;
}

function playerDisplayName(color) {
  if (color === "dark") {
    return "Blue";
  }
  if (color === "light") {
    return "Green";
  }
  return "Unknown";
}

function syncPuzzleFlipTurnFromPayload(apiPayload) {
  const flip =
    apiPayload?.puzzleFlipTurn === "light" || apiPayload?.puzzleFlipTurn === "dark"
      ? apiPayload.puzzleFlipTurn
      : apiPayload?.state?.puzzleFlipTurn === "light" || apiPayload?.state?.puzzleFlipTurn === "dark"
        ? apiPayload.state.puzzleFlipTurn
        : null;
  if (flip !== "dark" && flip !== "light") {
    return;
  }
  puzzleFlipTurnLocal = flip;
  if (remoteSession) {
    remoteSession.puzzleFlipTurn = flip;
  }
  if (state && !state.starterFlipDone) {
    state.puzzleFlipTurn = flip;
    state.currentPlayer = flip;
  }
}

function getPuzzleFlipTurnForRebuild() {
  if (playMode === "friend" && remoteSession) {
    if (remoteSession.puzzleFlipTurn === "light" || remoteSession.puzzleFlipTurn === "dark") {
      return remoteSession.puzzleFlipTurn;
    }
  }
  if (state?.puzzleFlipTurn === "light" || state?.puzzleFlipTurn === "dark") {
    return state.puzzleFlipTurn;
  }
  return puzzleFlipTurnLocal === "light" ? "light" : "dark";
}

function getPuzzleFlipTurn() {
  if (selectedGameId !== "puzzle" || !isStarterFlipPending()) {
    return state?.starterPlayer || state?.currentPlayer || "dark";
  }
  return getPuzzleFlipTurnForRebuild();
}

function getFriendFlipperColor() {
  if (selectedGameId === "puzzle" && isStarterFlipPending()) {
    return getPuzzleFlipTurn();
  }
  return "dark";
}

function recoverBrokenPuzzleStateIfNeeded() {
  if (selectedGameId !== "puzzle") {
    return false;
  }
  if (playMode === "friend" && remoteSession) {
    return false;
  }
  const pieces = state?.pieces;
  const totalRemaining = Array.isArray(pieces) ? pieces.filter((piece) => !piece.placed).length : 0;
  if (totalRemaining > 0 || isPuzzleComplete()) {
    return false;
  }
  rebuildPuzzleStateKeepingFlipTurn();
  puzzleTrayBootstrapAttempted = false;
  return true;
}

function releasePuzzleInteractionLocks() {
  puzzlePlaceInFlight = false;
  if (selectedGameId !== "puzzle") {
    return;
  }
  busy = false;
  deferRoomSyncUntilIdle = false;
  flushDeferredRoomSync();
}

function forcePuzzleUiRecoverable() {
  if (selectedGameId !== "puzzle") {
    return;
  }
  releasePuzzleInteractionLocks();
  hideCelebration();
  if (!isPuzzleComplete()) {
    winnerAnnounced = null;
  }
  puzzleTrayBootstrapAttempted = false;
  recoverBrokenPuzzleStateIfNeeded();
}

function togglePuzzleFlipTurnForNextGame() {
  puzzleFlipTurnLocal = puzzleFlipTurnLocal === "dark" ? "light" : "dark";
}

function puzzleFlipPromptText() {
  return `${playerDisplayName(getPuzzleFlipTurn())} flips to see who goes first.`;
}

function getFriendTurnPhrase(player = state?.currentPlayer) {
  return `${playerDisplayName(player)}'s Turn`;
}

function getFriendFlipTurnPhrase(player = getFriendFlipperColor()) {
  return `It's ${playerDisplayName(player)}'s turn to flip.`;
}

function buildFriendGameSwitchVoicePhrase(gameId = selectedGameId) {
  const gameTitle = getGameConfig(normalizeGameId(gameId)).title;
  let phrase = `Now playing ${gameTitle} with your friend.`;
  if (playMode === "friend" && remoteSession?.ready && isStarterFlipPending()) {
    phrase += ` ${getFriendFlipTurnPhrase(getFriendFlipperColor())}`;
  }
  return phrase;
}

function getFriendVoiceTurnPhrase() {
  if (playMode === "friend" && remoteSession?.ready && isStarterFlipPending()) {
    return getFriendFlipTurnPhrase(getFriendFlipperColor());
  }
  return getFriendTurnPhrase(state?.currentPlayer);
}

function shouldSpeakPuzzleFlipVoice() {
  if (playMode === "puffly") {
    return true;
  }
  return playMode === "friend" && Boolean(remoteSession?.ready);
}

function announceFriendFlipTurnVoice() {
  if (playMode === "friend") {
    return;
  }
  if (!shouldSpeakPuzzleFlipVoice() || !isStarterFlipPending()) {
    return;
  }
  if (playMode === "friend" && Date.now() < friendSwitchVoiceLockUntil) {
    return;
  }
  const phrase =
    playMode === "friend" ? getFriendFlipTurnPhrase(getFriendFlipperColor()) : "Flip to see who goes first.";
  const now = Date.now();
  if (phrase === friendFlipTurnLastPhrase && now < friendFlipTurnSpeechLockUntil) {
    return;
  }
  if (lastTurnSpoken === phrase && now < friendFlipTurnSpeechLockUntil) {
    return;
  }
  friendFlipTurnLastPhrase = phrase;
  friendFlipTurnSpeechLockUntil = now + 2200;
  lastTurnSpoken = phrase;
  speakFriendTurnPhrase(phrase);
}

let practiceFlipPromptDebounceTimer = null;
let practiceFlipFallbackTimer = null;
let practiceSpeechPrimeInstalled = false;
let practiceFlipUtteranceHeard = false;
let practiceFlipVoicesHooked = false;
let practiceFlipSpeakGeneration = 0;
let practiceFlipDelivering = false;
let practiceFlipErrorRetried = false;
let practiceFlipColdBootActive = false;
let practiceFlipVoicesHandled = false;
let suppressFlipVoiceFromRender = false;
let friendSpeechPrimeInstalled = false;
let friendTurnSpeechPending = "";
let speechGesturePrimed = !speechNeedsInteractionUnlock;
let practiceVoiceStartDismissed = false;
let practiceFlipSpeechLockUntil = 0;
let practiceFlipResultSpeechLockUntil = 0;
let practiceFlipResultLastPhrase = "";
let friendJoinWelcomeSpoken = false;
/** True after the one-time Friend "Start" tap; never cleared until leaving the room. */
let friendVoiceStartDismissed = false;
let friendFlipTurnSpeechLockUntil = 0;
let friendFlipTurnLastPhrase = "";
let friendOpponentJoinedSpeechLockUntil = 0;
let friendSwitchVoiceLockUntil = 0;
let friendLobbyPromptSpoken = false;
let friendClipSequenceQueue = [];
let friendClipSequencePlaying = false;
/** Welcome lines queued only if the first play attempt failed (never replayed mid-game). */
let pendingWelcomeVoiceLines = [];
let lastMascotVoiceThought = "";
/** Set when the user taps Create/Join, the board, or Practice Start — unlocks friend WAV playback. */
let pufflyVoiceReady = false;
let friendConnectedChimeAt = 0;
/** True after we spoke "Your turn." for the current continuous turn (incl. multi-jump). */
let friendYourTurnVoiceAnnounced = false;
/** True while replaying an opponent move — skip turn voice (stale currentPlayer). */
let friendRemoteAnimating = false;
/** applyRemoteRoomState sets this so render does not double-announce turn voice. */
let friendSkipTurnVoiceThisRender = false;

function syncPlayModeForFriendVoice() {
  if (playMode === "friend") {
    return true;
  }
  if (remoteSession || isFriendChromeVisible()) {
    playMode = "friend";
    return true;
  }
  return false;
}

function playFriendConnectedChime() {
  if (!audioEnabled) {
    return;
  }
  friendConnectedChimeAt = Date.now();
  primePufflyVoiceFromGesture();
  void playVoiceClip("connected", {
    onerror: (err) => {
      console.warn("[puffly] connected chime failed", SPEECH_BUILD, err);
    },
  });
}

function resetPracticeFlipVoiceTracking() {
  practiceFlipUtteranceHeard = false;
  practiceFlipDelivering = false;
  practiceFlipErrorRetried = false;
  practiceFlipResultLastPhrase = "";
  practiceFlipResultSpeechLockUntil = 0;
}

/** Block mascot "Your turn" / "My move" until post-flip "goes first" has been spoken. */
function primePracticePostFlipVoiceLock(starterPlayer) {
  if (playMode !== "puffly" || !starterPlayer) {
    return;
  }
  const now = Date.now();
  practiceFlipResultSpeechLockUntil = now + 4500;
  lastTurnSpoken = starterPlayer === humanPlayer ? "Your turn." : "Puffly's turn.";
  lastMascotVoiceThought =
    starterPlayer === humanPlayer ? "👀 Your turn!" : "💭 My move...";
}

function cancelPracticeFlipVoiceTimers() {
  if (practiceFlipPromptDebounceTimer) {
    window.clearTimeout(practiceFlipPromptDebounceTimer);
    practiceFlipPromptDebounceTimer = null;
  }
  if (practiceFlipFallbackTimer) {
    window.clearTimeout(practiceFlipFallbackTimer);
    practiceFlipFallbackTimer = null;
  }
}

function resetPracticeFlipSpeechLocks() {
  practiceFlipDelivering = false;
  practiceFlipSpeechLockUntil = 0;
}

/** Single entry for practice flip voice — prevents duplicate/overlapping speaks. */
function speakPracticeFlipPromptOnce(options = {}) {
  const force = Boolean(options.force);
  const inGesture = Boolean(options.inGesture);
  if (playMode !== "puffly" || !isStarterFlipPending() || state?.winner || state?.draw) {
    return false;
  }
  if (!practiceVoiceStartDismissed && !inGesture) {
    pendingPrioritySpeech = PRACTICE_FLIP_VOICE_PHRASE;
    pendingUnlockSpeech = PRACTICE_FLIP_VOICE_PHRASE;
    updateSpeechUnlockOverlay();
    return false;
  }
  const now = Date.now();
  if (!force && (practiceFlipDelivering || now < practiceFlipSpeechLockUntil)) {
    return false;
  }
  if (!force && practiceFlipUtteranceHeard) {
    return false;
  }
  if (speechNeedsInteractionUnlock && !speechGesturePrimed && !inGesture) {
    pendingPrioritySpeech = PRACTICE_FLIP_VOICE_PHRASE;
    pendingUnlockSpeech = PRACTICE_FLIP_VOICE_PHRASE;
    updateSpeechUnlockOverlay();
    return false;
  }

  cancelPracticeFlipVoiceTimers();
  pendingPrioritySpeech = "";
  pendingUnlockSpeech = "";
  if (force) {
    resetPracticeFlipSpeechLocks();
    practiceFlipUtteranceHeard = false;
  }
  practiceFlipDelivering = true;
  practiceFlipSpeechLockUntil = now + 2200;
  lastSpokenAt = 0;
  lastSpokenPhrase = "";
  speechUnlocked = true;
  speechGesturePrimed = true;

  speakImmediate(PRACTICE_FLIP_VOICE_PHRASE, { inGesture });
  window.setTimeout(() => {
    if (practiceFlipDelivering && lastSpokenPhrase !== PRACTICE_FLIP_VOICE_PHRASE) {
      practiceFlipDelivering = false;
      practiceFlipSpeechLockUntil = 0;
    }
  }, 2500);
  return true;
}

/** Single entry for post-flip "X goes first" — prevents duplicate speaks from re-renders. */
function speakPracticeFlipResultOnce(player, options = {}) {
  if (playMode !== "puffly" || !player) {
    return false;
  }
  const phrase = starterFirstMoveText(player);
  if (!phrase || !audioEnabled) {
    return false;
  }
  const force = Boolean(options.force);
  const now = Date.now();
  if (!force && phrase === practiceFlipResultLastPhrase && now < practiceFlipResultSpeechLockUntil) {
    return false;
  }
  practiceFlipResultLastPhrase = phrase;
  practiceFlipResultSpeechLockUntil = now + 4500;
  const turnPhrase = player === humanPlayer ? "Your turn." : "Puffly's turn.";
  lastTurnSpoken = turnPhrase;
  lastMascotVoiceThought = player === humanPlayer ? "👀 Your turn!" : "💭 My move...";
  void pufflySpeak(phrase, {
    onstart: () => {
      lastSpokenPhrase = phrase;
      lastTurnSpoken = turnPhrase;
    },
  });
  return true;
}

function speakFriendFlipResultOnce(player, options = {}) {
  if (playMode !== "friend" || !player || !remoteSession?.color) {
    return false;
  }
  // Flip / first-move voice is spoken from mascot thought after render.
  return true;
}

function deliverPracticeFlipPromptInGesture(force = false) {
  return speakPracticeFlipPromptOnce({ force, inGesture: true });
}

function deliverPracticeFlipPrompt(force = false) {
  speakPracticeFlipPromptOnce({ force, inGesture: false });
}

function requestPracticeFlipVoice(options = {}) {
  if (!isStarterFlipPending() || state?.winner || state?.draw) {
    return;
  }
  if (playMode === "friend") {
    if (shouldSpeakPuzzleFlipVoice()) {
      announceFriendFlipTurnVoice();
    }
    return;
  }
  if (playMode !== "puffly") {
    return;
  }
  speakPracticeFlipPromptOnce({ force: Boolean(options.force), inGesture: false });
}

/** Reset practice state to pre-flip and announce the standard flip voiceover once. */
function beginPracticeFlipRound(options = {}) {
  if (playMode !== "puffly" && !options.force) {
    return;
  }
  if (playMode !== "puffly") {
    playMode = "puffly";
    syncPlayModeChrome();
  }
  practiceFlipSpeakGeneration += 1;
  cancelPracticeFlipVoiceTimers();
  if (options.togglePuzzleFlip && selectedGameId === "puzzle") {
    togglePuzzleFlipTurnForNextGame();
  }
  if (selectedGameId === "puzzle") {
    rebuildPuzzleStateKeepingFlipTurn();
  } else {
    state = createStateForGame(selectedGameId);
  }
  selectedPuzzlePieceId = "";
  moveHistory = [];
  undoSnapshots = [];
  winnerAnnounced = null;
  lastSpokenPhrase = "";
  lastTurnSpoken = "";
  resetPracticeFlipVoiceTracking();
  resetPracticeMascotVoiceTracking();
  practiceFlipSpeechLockUntil = 0;
  hideCelebration();
  puzzleTrayBootstrapAttempted = false;
  suppressFlipVoiceFromRender = true;
  render("Flip to see who goes first.");
  suppressFlipVoiceFromRender = false;
  busy = false;
  updateStarterFlipButton();
  if (!practiceVoiceStartDismissed) {
    updateSpeechUnlockOverlay();
    return;
  }
}

function installPrimePracticeSpeechOnFirstGesture() {
  if (practiceSpeechPrimeInstalled || typeof document === "undefined") {
    return;
  }
  practiceSpeechPrimeInstalled = true;
  const prime = () => {
    if (!practiceVoiceStartDismissed) {
      return;
    }
    ensureAudioContext({ skipSpeechUnlock: true });
    primeSpeechSynthesisFromUserGesture();
  };
  document.addEventListener("pointerdown", prime, { once: true, capture: true });
  document.addEventListener("keydown", prime, { once: true, capture: true });
}

function primePufflyVoiceFromGesture() {
  pufflyVoiceReady = true;
  speechUnlocked = true;
  speechGesturePrimed = true;
  friendVoiceStartDismissed = true;
  ensureAudioContext({ skipSpeechUnlock: true });
  preloadVoiceClips();
  updateSpeechUnlockOverlay();
  if (pendingWelcomeVoiceLines.length && !friendJoinWelcomeSpoken) {
    playFriendWelcomeVoiceNow(pendingWelcomeVoiceLines);
  }
}

function playConnectedFromTap() {
  friendConnectedChimeAt = Date.now();
  void playVoiceClip("connected");
}

function clearFriendVoiceBuffers() {
  pendingWelcomeVoiceLines = [];
  friendClipSequenceQueue = [];
  friendClipSequencePlaying = false;
  friendSpeechQueue.length = 0;
  friendSpeechPlaying = false;
  stopAllVoiceClips();
}

function flushFriendVoicePending() {
  if (!pendingWelcomeVoiceLines.length || friendJoinWelcomeSpoken) {
    return 0;
  }
  const lines = pendingWelcomeVoiceLines;
  return playFriendWelcomeVoiceNow(lines) ? lines.length : 0;
}

function speakMascotVoiceFromPanel(options = {}) {
  const thought = pufflyThought?.textContent?.trim();
  if (!thought) {
    return false;
  }
  return speakVoiceForMascotThought(thought, options);
}

function speakVoiceForMascotThought(thoughtText, options = {}) {
  if (!audioEnabled) {
    return false;
  }
  const force = Boolean(options.force);
  if (playMode === "friend") {
    if (!remoteSession) {
      return false;
    }
    if (friendClipSequencePlaying || friendClipSequenceQueue.length) {
      return false;
    }
  } else if (playMode !== "puffly") {
    return false;
  }
  if (!practiceVoiceStartDismissed && !force) {
    return false;
  }
  if (friendClipSequencePlaying || friendClipSequenceQueue.length) {
    return false;
  }
  const text = String(thoughtText || "").trim();
  if (!text || (!force && text === lastMascotVoiceThought)) {
    return false;
  }
  const clipPhrase = voiceClipPhraseFromMascotThought(text);
  if (!clipPhrase) {
    return false;
  }
  // Post-flip lock suppresses duplicate "Puffly's turn" during "goes first", not the first "Your turn."
  if (!force && Date.now() < practiceFlipResultSpeechLockUntil && clipPhrase !== "Your turn.") {
    return false;
  }
  const clipId = resolveVoiceClipId(clipPhrase);
  if (!clipId) {
    return false;
  }
  if (
    clipPhrase === PRACTICE_FLIP_VOICE_PHRASE &&
    practiceFlipUtteranceHeard &&
    !options.allowFlipReplay
  ) {
    return false;
  }
  if (text.includes("Your turn") || clipPhrase === PRACTICE_FLIP_VOICE_PHRASE) {
    stopAllVoiceClips();
  }
  if (clipPhrase === PRACTICE_FLIP_VOICE_PHRASE) {
    practiceFlipDelivering = true;
    practiceFlipSpeechLockUntil = Date.now() + 4500;
  }
  console.info("[puffly] mascot voice", SPEECH_BUILD, playMode, text, "→", clipPhrase);
  ensureAudioContext({ skipSpeechUnlock: true });
  const clipHandlers = {
    onstart: () => {
      lastMascotVoiceThought = text;
      lastSpokenPhrase = clipPhrase;
      if (clipPhrase === "Your turn." && playMode === "puffly") {
        practiceFlipResultSpeechLockUntil = 0;
        lastTurnSpoken = "Your turn.";
      }
      if (clipPhrase === PRACTICE_FLIP_VOICE_PHRASE) {
        practiceFlipUtteranceHeard = true;
        practiceFlipDelivering = false;
        cancelPracticeFlipVoiceTimers();
      }
    },
    onend: () => {
      if (clipPhrase === PRACTICE_FLIP_VOICE_PHRASE) {
        practiceFlipDelivering = false;
      }
    },
    onerror: () => {
      if (!force && lastMascotVoiceThought === text) {
        lastMascotVoiceThought = "";
      }
      if (clipPhrase === PRACTICE_FLIP_VOICE_PHRASE) {
        practiceFlipDelivering = false;
        practiceFlipSpeechLockUntil = 0;
      }
    },
  };
  void playVoiceClip(clipId, clipHandlers, { fromGesture: Boolean(options.fromGesture ?? force) });
  return true;
}

/** Play welcome clips immediately (Create/Join gesture); do not buffer until later moves. */
function playFriendWelcomeVoiceNow(phrases) {
  if (!audioEnabled || !syncPlayModeForFriendVoice()) {
    return false;
  }
  let lines = filterClipPhrases(Array.isArray(phrases) ? phrases : []);
  if (Date.now() - friendConnectedChimeAt < 8000) {
    lines = lines.filter((line) => line !== "You are connected.");
  }
  if (!lines.length) {
    return false;
  }
  clearFriendVoiceBuffers();
  lastMascotVoiceThought = "";
  primePufflyVoiceFromGesture();
  console.info("[puffly] welcome voice now", SPEECH_BUILD, lines.join(" → "));
  const started = speakFriendClipSequence(lines, { replace: true });
  if (started) {
    friendJoinWelcomeSpoken = true;
    pendingWelcomeVoiceLines = [];
  } else {
    pendingWelcomeVoiceLines = lines;
    for (const delayMs of [200, 600, 1500]) {
      window.setTimeout(() => {
        if (friendJoinWelcomeSpoken || !pendingWelcomeVoiceLines.length) {
          return;
        }
        playFriendWelcomeVoiceNow(pendingWelcomeVoiceLines);
      }, delayMs);
    }
  }
  return started;
}

function installGlobalVoicePrime() {
  if (friendSpeechPrimeInstalled || typeof document === "undefined") {
    return;
  }
  friendSpeechPrimeInstalled = true;
  const onGesture = () => {
    if (!audioEnabled) {
      return;
    }
    noteUserGesture();
    primePufflyVoiceFromGesture();
    if (playMode === "friend" && remoteSession) {
      flushPendingPrioritySpeech();
      drainFriendSpeechQueue();
    }
  };
  document.addEventListener("pointerdown", onGesture, { capture: true });
  document.addEventListener("keydown", onGesture, { capture: true });
}

function announcePracticeFlipVoice() {
  if (suppressFlipVoiceFromRender || playMode !== "puffly") {
    return;
  }
  if (practiceVoiceStartDismissed) {
    return;
  }
  requestPracticeFlipVoice();
}

function announceFriendTurnVoice() {
  if (playMode !== "friend" || !remoteSession?.ready || isStarterFlipPending() || state?.winner || state?.draw) {
    return;
  }
  const phrase = getFriendTurnPhrase(state.currentPlayer);
  if (lastTurnSpoken !== phrase) {
    speakFriendTurnPhrase(phrase);
  }
}

/** "Your turn." / "Puffly's turn." in practice; friend turn phrase in friend mode. */
function announceGameplayTurnVoice(statusMessage = "") {
  if (playMode === "friend" && (friendRemoteAnimating || friendSkipTurnVoiceThisRender)) {
    return;
  }
  if (isStarterFlipPending() || state?.winner || state?.draw) {
    return;
  }
  if (playMode === "puffly") {
    return;
  }
  if (statusMessage === "Undoing move...") {
    return;
  }
  let currentTurnPhrase;
  if (playMode === "friend" && remoteSession) {
    if (!remoteSession.ready) {
      currentTurnPhrase = "Welcome to the game room.";
    } else {
      currentTurnPhrase = getFriendVoiceTurnPhrase();
    }
  } else if (playMode === "friend") {
    currentTurnPhrase = "Welcome to the game room.";
  } else if (playMode === "puffly") {
    currentTurnPhrase = state.currentPlayer === humanPlayer ? "Your turn." : "Puffly's turn.";
  } else {
    return;
  }
  if (playMode === "friend") {
    return;
  }
  if (lastTurnSpoken === currentTurnPhrase) {
    return;
  }
  if (playMode === "friend") {
    speakFriendTurnPhrase(currentTurnPhrase);
  } else {
    void pufflySpeak(currentTurnPhrase, {
      onstart: () => {
        lastTurnSpoken = currentTurnPhrase;
        lastSpokenPhrase = currentTurnPhrase;
      },
    });
  }
}

function getLocalTeamColor() {
  if (playMode === "friend" && remoteSession?.color) {
    return remoteSession.color;
  }
  // Practice mode always shows Puffly (blue bear) as the mascot opponent.
  return "dark";
}

/** True when this device may move in friend mode (authoritative for turn voice). */
function isFriendYourTurnNow() {
  if (playMode !== "friend" || !remoteSession?.ready) {
    return false;
  }
  const local = remoteSession.color;
  const current = state?.currentPlayer;
  if (local !== "dark" && local !== "light") {
    return false;
  }
  if (current !== "dark" && current !== "light") {
    return false;
  }
  if (isStarterFlipPending() || state?.winner || state?.draw) {
    return false;
  }
  return current === local;
}

/** Never play opponent turn clips when local state says it is our turn. */
function friendSafeVoiceClipId(clipId) {
  if (
    (clipId === "blue_turn" || clipId === "green_turn") &&
    isFriendYourTurnNow()
  ) {
    return "your_turn";
  }
  return clipId;
}

function getActiveMascotFace() {
  return getLocalTeamColor() === "light" ? greenMascotFace : blueMascotFace;
}

function updateTeamMascot() {
  const teamColor = getLocalTeamColor();
  const isGreenTeam = teamColor === "light";
  const inFriendRoom = playMode === "friend" && Boolean(remoteSession);
  pufflyPanel?.classList.toggle("team-green", isGreenTeam);
  pufflyPanel?.classList.toggle("team-blue", !isGreenTeam);
  blueMascotFace?.classList.toggle("hidden", isGreenTeam);
  greenMascotFace?.classList.toggle("hidden", !isGreenTeam);
  document.body.classList.toggle("friend-green-player", inFriendRoom && isGreenTeam);
  document.body.classList.toggle("friend-blue-player", inFriendRoom && !isGreenTeam);
  blueCapturedTray?.classList.toggle("your-tray", inFriendRoom && !isGreenTeam);
  greenCapturedTray?.classList.toggle("your-tray", inFriendRoom && isGreenTeam);
  if (teamMascotLabel) {
    if (inFriendRoom) {
      teamMascotLabel.textContent = isGreenTeam ? "Green Team (You) 🐸" : "Blue Team (You) 🐻";
    } else {
      teamMascotLabel.textContent = "Puffly";
    }
  }
}

function friendMascotThoughtForTurn() {
  if (!remoteSession?.ready) {
    return "⏳ Waiting for your friend...";
  }
  if (isStarterFlipPending()) {
    const flipper = getFriendFlipperColor();
    return remoteSession.color === flipper
      ? "🪙 Tap FLIP to start"
      : `🪙 ${playerDisplayName(flipper)} is flipping...`;
  }
  const isYourTurn = state.currentPlayer === remoteSession.color;
  if (remoteSession.color === "light") {
    return isYourTurn ? "🐸 Your turn — GREEN tray" : "🐻 Blue friend's turn";
  }
  return isYourTurn ? "🐻 Your turn — BLUE tray" : "🐸 Green friend's turn";
}

function ensureAudioContext(options = {}) {
  if (!audioEnabled || typeof window === "undefined") {
    return null;
  }
  // iPad Safari may block speech until a direct user gesture occurs.
  // ensureAudioContext is invoked from click/tap handlers, so unlock here.
  const skipSpeechUnlock = Boolean(options.skipSpeechUnlock);
  if (!skipSpeechUnlock && speechNeedsInteractionUnlock && !speechUnlocked) {
    unlockSpeechIfNeeded();
    updateSpeechUnlockOverlay();
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

function primeSpeechEngine() {
  if (typeof window === "undefined" || !window.speechSynthesis || !audioEnabled) {
    return;
  }
  window.speechSynthesis.resume();
}

/** Prime audio engine from a tap without opening the friend voice gate on iOS. */
function primeFriendGestureOnly() {
  if (!audioEnabled || typeof window === "undefined" || !window.speechSynthesis) {
    return;
  }
  speechGesturePrimed = true;
  window.speechSynthesis.getVoices();
  window.speechSynthesis.resume();
}

/** Unlock speech from a user gesture without playing a hidden utterance (avoids overlap/garble). */
function primeSpeechSynthesisFromUserGesture() {
  if (!audioEnabled || typeof window === "undefined" || !window.speechSynthesis) {
    return;
  }
  speechUnlocked = true;
  speechGesturePrimed = true;
  window.speechSynthesis.getVoices();
  window.speechSynthesis.resume();
  drainFriendSpeechQueue();
  flushPendingPrioritySpeech();
}

function drainFriendSpeechQueue() {
  if (friendSpeechPlaying || !friendSpeechQueue.length) {
    return;
  }
  if (
    !speechGesturePrimed ||
    !speechUnlocked ||
    typeof window === "undefined" ||
    !window.speechSynthesis ||
    !audioEnabled
  ) {
    return;
  }
  const text = friendSpeechQueue.shift();
  speakImmediate(text);
}

function armFriendSpeechWatchdog() {
  if (friendSpeechWatchdog) {
    window.clearTimeout(friendSpeechWatchdog);
  }
  friendSpeechWatchdog = window.setTimeout(() => {
    friendSpeechWatchdog = null;
    if (!friendSpeechPlaying) {
      return;
    }
    friendSpeechPlaying = false;
    if (typeof window !== "undefined" && window.speechSynthesis?.speaking) {
      window.speechSynthesis.cancel();
    }
    drainFriendSpeechQueue();
  }, 8000);
}

function enqueueFriendSpeech(text) {
  if (!text || !audioEnabled) {
    return;
  }
  const trimmed = text.trim();
  if (!trimmed) {
    return;
  }
  if (friendSpeechQueue[friendSpeechQueue.length - 1] === trimmed) {
    return;
  }
  if (friendSpeechPlaying && lastSpokenPhrase === trimmed) {
    return;
  }
  if (/'s Turn$/i.test(trimmed)) {
    for (let i = friendSpeechQueue.length - 1; i >= 0; i -= 1) {
      if (/'s Turn$/i.test(friendSpeechQueue[i])) {
        friendSpeechQueue.splice(i, 1);
      }
    }
  }
  friendSpeechQueue.push(trimmed);
  drainFriendSpeechQueue();
}

let speechUnlockGestureHandledAt = 0;
let lastUserGestureAt = 0;
let speechResumePumpTimer = null;

function noteUserGesture() {
  lastUserGestureAt = Date.now();
}

function buildPendingFriendJoinIntroSequence() {
  if (!remoteSession) {
    return [];
  }
  const label = String(pendingJoinIntroTeam || playerDisplayName(remoteSession.color)).toUpperCase();
  return filterClipPhrases(
    buildFriendJoinClipSequence(label, {
      waitingForFriend: !remoteSession.ready,
      gameId: selectedGameId,
      flipperPlayer:
        remoteSession.ready && isStarterFlipPending() ? getFriendFlipperColor() : null,
    }),
  );
}

function needsChromeSpeechDelay() {
  return isDesktopMacBrowser() && isChromiumBrowser();
}

/** Desktop Mac browsers: Web Speech is unreliable for friend mode. */
function friendVoicePrefersClips() {
  return isDesktopMacBrowser();
}

function friendClipTextForPhrase(phrase) {
  if (playerColorFromFriendTurnPhrase(phrase) && isFriendYourTurnNow()) {
    return "Your turn.";
  }
  const localColor = remoteSession?.color;
  if (localColor === "dark" || localColor === "light") {
    const activePlayer = state?.currentPlayer;
    if (
      (activePlayer === "dark" || activePlayer === "light") &&
      playerColorFromFriendTurnPhrase(phrase)
    ) {
      const stateClip = friendTurnClipText(activePlayer, localColor);
      if (stateClip && resolveVoiceClipId(stateClip)) {
        return stateClip;
      }
    }
  }
  const mapped = mapFriendPhraseToClipText(phrase, localColor);
  const candidate = mapped || phrase;
  return resolveVoiceClipId(candidate) ? candidate : null;
}

/** Friend turn WAV: only "Your turn." once per turn (not every render / tap / poll). */
function speakFriendTurnFromState(options = {}) {
  if (!audioEnabled) {
    return false;
  }
  if (!isFriendYourTurnNow()) {
    friendYourTurnVoiceAnnounced = false;
    return false;
  }
  if (friendYourTurnVoiceAnnounced) {
    return false;
  }
  const localColor = remoteSession.color;
  const activePlayer = state.currentPlayer;
  const clipText = "Your turn.";
  const phraseKey = getFriendTurnPhrase(activePlayer);
  if (phraseKey === lastTurnSpoken || phraseKey === friendTurnSpeechPending) {
    friendYourTurnVoiceAnnounced = true;
    return false;
  }
  if (friendSpeechPlaying && lastSpokenPhrase === clipText) {
    friendYourTurnVoiceAnnounced = true;
    return false;
  }
  console.info(
    "[puffly] turn voice",
    SPEECH_BUILD,
    "your",
    "local=",
    localColor,
    "current=",
    activePlayer,
    "→",
    clipText,
  );
  syncPlayModeForFriendVoice();
  friendTurnSpeechPending = phraseKey;
  lastTurnSpoken = phraseKey;
  ensureAudioContext({ skipSpeechUnlock: true });
  const started = speakFriendClipSequence([clipText], {
    replace: Boolean(options.replace ?? true),
    trackTurnPhrase: phraseKey,
  });
  if (started) {
    friendYourTurnVoiceAnnounced = true;
  }
  return started;
}

function announceFriendYourTurnVoiceOnce() {
  if (!isFriendYourTurnNow()) {
    friendYourTurnVoiceAnnounced = false;
    return false;
  }
  return speakFriendTurnFromState({ replace: true });
}

function announceFriendTurnVoiceAfterSync() {
  // Turn voice is driven by #puffly-thought text in setPufflyState after render.
}

function respeakFriendMascotThoughtVoice() {
  const thought = pufflyThought?.textContent?.trim();
  if (!thought) {
    return;
  }
  lastMascotVoiceThought = "";
  speakVoiceForMascotThought(thought);
}

function drainFriendClipSequence() {
  if (!friendClipSequenceQueue.length) {
    friendClipSequencePlaying = false;
    friendSpeechPlaying = false;
    drainFriendSpeechQueue();
    if (playMode === "friend" && remoteSession?.ready) {
      respeakFriendMascotThoughtVoice();
    }
    return;
  }
  const clipText = friendClipSequenceQueue.shift();
  friendClipSequencePlaying = true;
  friendSpeechPlaying = true;
  void friendSpeakLine(clipText, {
    onstart: () => {
      lastSpokenAt = Date.now();
      lastSpokenPhrase = clipText;
    },
    onend: () => {
      drainFriendClipSequence();
    },
    onerror: () => {
      drainFriendClipSequence();
    },
  });
}

function speakFriendClipSequence(phrases, options = {}) {
  if (!audioEnabled) {
    return false;
  }
  const sequence = filterClipPhrases(phrases);
  if (!sequence.length) {
    return false;
  }
  if (options.replace) {
    friendClipSequenceQueue = [];
    stopAllVoiceClips();
  }
  friendClipSequenceQueue.push(...sequence);
  if (!friendClipSequencePlaying) {
    ensureAudioContext({ skipSpeechUnlock: true });
    drainFriendClipSequence();
  }
  if (options.trackTurnPhrase) {
    lastTurnSpoken = options.trackTurnPhrase;
    friendTurnSpeechPending = "";
  }
  return true;
}

/**
 * Friend voice: same WAV pipeline as Practice (pufflySpeak). No separate Start overlay.
 * Create/Join taps call primePufflyVoiceFromGesture() so clips can play after the room API returns.
 */
function requestFriendVoiceLines(phrases, options = {}) {
  if (!audioEnabled) {
    return false;
  }
  if (!syncPlayModeForFriendVoice()) {
    console.warn("[puffly] friend voice skipped: playMode=", playMode, SPEECH_BUILD);
    return false;
  }
  let lines = filterClipPhrases(phrases);
  if (Date.now() - friendConnectedChimeAt < 8000) {
    lines = lines.filter((line) => line !== "You are connected.");
  }
  if (!lines.length) {
    console.warn("[puffly] friend voice: no clips", SPEECH_BUILD, phrases);
    return false;
  }
  primePufflyVoiceFromGesture();
  pendingPrioritySpeech = "";
  pendingUnlockSpeech = "";
  console.info("[puffly] friend voice", SPEECH_BUILD, lines.join(" → "));
  return speakFriendClipSequence(lines, {
    replace: Boolean(options.replace ?? true),
    trackTurnPhrase: options.trackTurnPhrase,
  });
}

function playFriendIntroClips(sequence, options = {}) {
  return requestFriendVoiceLines(sequence, options);
}

function trySpeakFriendIntroSequence(sequence, options = {}) {
  return requestFriendVoiceLines(sequence, options);
}

function deliverFriendIntroVoiceFromGesture() {
  if (playMode !== "friend" || !audioEnabled) {
    return 0;
  }
  primePufflyVoiceFromGesture();
  if (friendJoinWelcomeSpoken) {
    return 0;
  }
  const pending = flushFriendVoicePending();
  if (pending > 0) {
    return pending;
  }
  const lines = buildPendingFriendJoinIntroSequence();
  if (!lines.length) {
    return 0;
  }
  return playFriendWelcomeVoiceNow(lines) ? lines.length : 0;
}

function speakFriendVoice(phrase, options = {}) {
  if (!phrase || !audioEnabled) {
    return false;
  }
  const clipText = friendClipTextForPhrase(phrase);
  if (!clipText) {
    return false;
  }
  const forceRepeat = Boolean(options.force);
  if (!forceRepeat && (phrase === lastTurnSpoken || phrase === friendTurnSpeechPending)) {
    return false;
  }
  friendTurnSpeechPending = phrase;
  lastTurnSpoken = phrase;
  return speakFriendClipSequence([clipText], { replace: true, trackTurnPhrase: phrase });
}

const voiceClipPlayers = new Map();
const voiceClipBufferCache = new Map();
let voiceClipActiveSource = null;

function voiceClipUrl(clipId) {
  const file = `${clipId}.${VOICE_CLIP_EXT}`;
  if (typeof document !== "undefined" && document.baseURI) {
    try {
      return new URL(`assets/voice/${file}`, document.baseURI).href;
    } catch {
      // fall through
    }
  }
  if (typeof window !== "undefined" && window.location?.href) {
    try {
      return new URL(`assets/voice/${file}`, window.location.href).href;
    } catch {
      // fall through
    }
  }
  return `${VOICE_CLIP_BASE}${file}`;
}

function stopVoiceClipWebAudio() {
  if (!voiceClipActiveSource) {
    return;
  }
  try {
    voiceClipActiveSource.stop();
  } catch {
    // ignore
  }
  voiceClipActiveSource = null;
}

async function ensureVoiceClipBuffer(clipId) {
  if (voiceClipBufferCache.has(clipId)) {
    return voiceClipBufferCache.get(clipId);
  }
  const ctx = ensureAudioContext({ skipSpeechUnlock: true });
  if (!ctx) {
    throw new Error("AudioContext unavailable");
  }
  if (ctx.state === "suspended") {
    await ctx.resume();
  }
  const url = voiceClipUrl(clipId);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
  const buffer = await ctx.decodeAudioData(await response.arrayBuffer());
  voiceClipBufferCache.set(clipId, buffer);
  return buffer;
}

async function playVoiceClipWebAudio(clipId, handlers = {}) {
  try {
    const buffer = await ensureVoiceClipBuffer(clipId);
    const ctx = ensureAudioContext({ skipSpeechUnlock: true });
    if (!ctx || !buffer) {
      return false;
    }
    if (ctx.state === "suspended") {
      await ctx.resume();
    }
    stopVoiceClipWebAudio();
    stopAllVoiceClips();
    const gain = ctx.createGain();
    gain.gain.value = 1;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(gain);
    gain.connect(ctx.destination);
    voiceClipActiveSource = source;
    let ended = false;
    const finish = () => {
      if (ended) {
        return;
      }
      ended = true;
      if (voiceClipActiveSource === source) {
        voiceClipActiveSource = null;
      }
      if (handlers.onend) {
        handlers.onend();
      }
    };
    source.onended = finish;
    const fallbackMs = Math.ceil((buffer.duration || 0.5) * 1000) + 400;
    window.setTimeout(finish, fallbackMs);
    source.start(0);
    console.info("[puffly] webaudio clip", SPEECH_BUILD, clipId, voiceClipUrl(clipId));
    if (handlers.onstart) {
      handlers.onstart();
    }
    return true;
  } catch (err) {
    console.warn("[puffly] webaudio clip failed", SPEECH_BUILD, clipId, err);
    if (handlers.onerror) {
      handlers.onerror(err);
    }
    return false;
  }
}

function preloadVoiceClips() {
  if (typeof Audio === "undefined") {
    return;
  }
  for (const clipId of VOICE_CLIP_IDS) {
    if (!voiceClipPlayers.has(clipId)) {
      const audio = new Audio(voiceClipUrl(clipId));
      audio.preload = "auto";
      voiceClipPlayers.set(clipId, audio);
    }
    void ensureVoiceClipBuffer(clipId).catch(() => {});
  }
}

function stopAllVoiceClips() {
  stopVoiceClipWebAudio();
  for (const audio of voiceClipPlayers.values()) {
    try {
      audio.pause();
      audio.currentTime = 0;
    } catch {
      // ignore
    }
  }
}

function playVoiceClipHtml(clipId, handlers = {}) {
  if (typeof Audio === "undefined") {
    return Promise.resolve(false);
  }
  let audio = voiceClipPlayers.get(clipId);
  if (!audio) {
    audio = new Audio(voiceClipUrl(clipId));
    audio.preload = "auto";
    voiceClipPlayers.set(clipId, audio);
  }
  try {
    audio.pause();
    audio.currentTime = 0;
  } catch {
    // ignore
  }
  const fireEnd = () => {
    if (handlers.onend) {
      handlers.onend();
    }
  };
  const fireError = (err) => {
    console.warn("[puffly] html audio clip failed", SPEECH_BUILD, clipId, err);
    if (handlers.onerror) {
      handlers.onerror(err);
    }
  };
  audio.onended = fireEnd;
  audio.onerror = () => fireError(new Error(`clip error: ${clipId}`));
  return audio
    .play()
    .then(() => {
      console.info("[puffly] html clip playing", SPEECH_BUILD, clipId);
      if (handlers.onstart) {
        handlers.onstart();
      }
      return true;
    })
    .catch((err) => {
      fireError(err);
      return false;
    });
}

/** Play WAV — HTML Audio first on user gesture (reliable on Mac Chrome); Web Audio as fallback. */
function playVoiceClip(clipId, handlers = {}, options = {}) {
  if (!audioEnabled) {
    return Promise.resolve(false);
  }
  clipId = friendSafeVoiceClipId(clipId);
  ensureAudioContext({ skipSpeechUnlock: true });
  const preferHtml = Boolean(options.fromGesture) || playMode === "puffly";
  if (preferHtml) {
    return playVoiceClipHtml(clipId, handlers).then((ok) => {
      if (ok) {
        return true;
      }
      return playVoiceClipWebAudio(clipId, handlers);
    });
  }
  return playVoiceClipWebAudio(clipId, handlers).then((ok) => {
    if (ok) {
      return true;
    }
    return playVoiceClipHtml(clipId, handlers);
  });
}

function friendSpeakLine(text, handlers = {}) {
  if (!text || !audioEnabled) {
    return Promise.resolve(false);
  }
  const isFriend = playMode === "friend" || Boolean(remoteSession);
  const clipId = resolveVoiceClipId(text);
  if (clipId) {
    return playVoiceClip(clipId, handlers).then((ok) => {
      if (ok) {
        return true;
      }
      if (speakInUserGesture(text, { friendMode: isFriend })) {
        if (handlers.onend) {
          window.setTimeout(handlers.onend, Math.max(1800, text.length * 55));
        }
        return true;
      }
      return false;
    });
  }
  if (speakInUserGesture(text, { friendMode: isFriend })) {
    if (handlers.onend) {
      window.setTimeout(handlers.onend, Math.max(1800, text.length * 55));
    }
    return Promise.resolve(true);
  }
  return Promise.resolve(false);
}

function stopSpeechResumePump() {
  if (speechResumePumpTimer) {
    window.clearInterval(speechResumePumpTimer);
    speechResumePumpTimer = null;
  }
}

function startSpeechResumePump() {
  if (speechResumePumpTimer) {
    return;
  }
  speechResumePumpTimer = window.setInterval(() => {
    const syn = typeof window !== "undefined" ? window.speechSynthesis : null;
    if (!syn) {
      stopSpeechResumePump();
      return;
    }
    syn.resume();
    if (!syn.speaking && !syn.pending) {
      stopSpeechResumePump();
    }
  }, 100);
}

function refreshSpeechVoiceCache() {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return [];
  }
  return window.speechSynthesis.getVoices();
}

function pickEnglishVoice(voices) {
  if (!voices.length) {
    return null;
  }
  return (
    voices.find((voice) => voice.lang && voice.lang.startsWith("en") && voice.localService) ||
    voices.find((voice) => voice.lang && voice.lang.startsWith("en")) ||
    voices[0]
  );
}

function createSpeechUtterance(text, handlers = {}) {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = handlers.rate ?? 0.95;
  utterance.pitch = 1;
  utterance.volume = 1;
  const voices = refreshSpeechVoiceCache();
  const voice = pickEnglishVoice(voices);
  if (voice) {
    utterance.voice = voice;
  }
  if (handlers.onstart) {
    utterance.onstart = handlers.onstart;
  }
  if (handlers.onend) {
    utterance.onend = handlers.onend;
  }
  if (handlers.onerror) {
    utterance.onerror = handlers.onerror;
  }
  return utterance;
}

/**
 * Speak a line — use bundled WAV clips when mapped; otherwise Web Speech API.
 */
function pufflySpeak(text, handlers = {}, options = {}) {
  if (!text || !audioEnabled) {
    return Promise.resolve(false);
  }
  const clipId = resolveVoiceClipId(text);
  if (clipId) {
    return playVoiceClip(clipId, handlers);
  }
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return Promise.resolve(false);
  }
  const syn = window.speechSynthesis;
  syn.resume();
  refreshSpeechVoiceCache();
  const allowCancel = Boolean(options.allowCancel) && playMode !== "puffly";
  if (allowCancel && isChromiumBrowser()) {
    syn.cancel();
    syn.resume();
  }
  const speakOnce = () => {
    const utterance = createSpeechUtterance(text, handlers);
    syn.resume();
    syn.speak(utterance);
  };
  startSpeechResumePump();
  if (needsChromeSpeechDelay() && !options.immediate) {
    window.setTimeout(speakOnce, 80);
    return Promise.resolve(true);
  }
  speakOnce();
  return Promise.resolve(true);
}

/** Practice Start tap — speak whatever #puffly-thought already shows (e.g. flip prompt). */
function deliverPracticeVoiceOnStartTap() {
  if (!audioEnabled || typeof window === "undefined") {
    console.warn("[puffly] speech build", SPEECH_BUILD, "blocked: audio off");
    return false;
  }
  console.info("[puffly] speech build", SPEECH_BUILD, "practice Start tap");
  speechUnlocked = true;
  speechGesturePrimed = true;
  pendingUnlockSpeech = "";
  pendingPrioritySpeech = "";
  cancelPracticeFlipVoiceTimers();
  lastMascotVoiceThought = "";
  busy = false;
  updateStarterFlipButton();
  return speakMascotVoiceFromPanel({ force: true, fromGesture: true });
}

/** iOS friend Start / explicit gesture speaks — no cancel() (that silences Mac Chrome). */
function speakInUserGesture(text, options = {}) {
  if (!text || !audioEnabled || typeof window === "undefined" || !window.speechSynthesis) {
    return false;
  }
  const isFriendMode = Boolean(options.friendMode);
  const syn = window.speechSynthesis;
  speechUnlocked = true;
  speechGesturePrimed = true;
  syn.resume();
  syn.getVoices();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = 1;
  utterance.pitch = 1;
  utterance.volume = 1;
  const voices = syn.getVoices();
  if (voices.length > 0) {
    utterance.voice =
      voices.find((voice) => voice.lang && voice.lang.startsWith("en")) || voices[0];
  }
  utterance.onstart = () => {
    lastSpokenAt = Date.now();
    lastSpokenPhrase = text;
    if (isFriendMode) {
      lastTurnSpoken = text;
      friendTurnSpeechPending = "";
    }
  };
  utterance.onend = () => {
    if (isFriendMode) {
      friendSpeechPlaying = false;
      drainFriendSpeechQueue();
    }
  };
  utterance.onerror = () => {
    if (isFriendMode) {
      friendSpeechPlaying = false;
      drainFriendSpeechQueue();
    }
  };
  if (isFriendMode) {
    friendSpeechPlaying = true;
    armFriendSpeechWatchdog();
  }
  syn.speak(utterance);
  return true;
}

function speakImmediate(text, options = {}) {
  const isPracticeFlipPhrase = text === PRACTICE_FLIP_VOICE_PHRASE;
  const isFriendMode = playMode === "friend";
  const inGesture = Boolean(options.inGesture);
  if (!text) {
    if (isPracticeFlipPhrase) {
      practiceFlipDelivering = false;
    }
    return;
  }
  if (!canSpeakNow({ inGesture })) {
    if (!pendingUnlockSpeech || pendingPrioritySpeech === text) {
      pendingUnlockSpeech = text;
    }
    if (isPracticeFlipPhrase) {
      practiceFlipDelivering = false;
    }
    updateSpeechUnlockOverlay();
    return;
  }
  // Practice uses bundled WAVs — Web Speech from speakInUserGesture is silent on Mac Chrome.
  if (playMode === "puffly" && resolveVoiceClipId(text)) {
    if (inGesture) {
      speechUnlocked = true;
      speechGesturePrimed = true;
      ensureAudioContext({ skipSpeechUnlock: true });
    }
    void pufflySpeak(text, handlers, { immediate: inGesture }).then((ok) => {
      if (!ok && inGesture && typeof window !== "undefined" && window.speechSynthesis) {
        speakInUserGesture(text, { friendMode: false });
      }
    });
    return;
  }
  if (inGesture) {
    if (speakInUserGesture(text, { friendMode: isFriendMode })) {
      return;
    }
  }
  if (inGesture) {
    speechUnlocked = true;
    speechGesturePrimed = true;
  }
  const syn = prepareSpeechSynthesisForUtterance({
    skipCancel: inGesture || playMode === "puffly",
  });
  if (!syn) {
    if (isPracticeFlipPhrase) {
      practiceFlipDelivering = false;
    }
    return;
  }
  if (isFriendMode) {
    friendSpeechPlaying = true;
    armFriendSpeechWatchdog();
  }
  let utteranceStarted = false;
  const clearUtteranceStallTimer = () => {
    if (utteranceStallTimer) {
      window.clearTimeout(utteranceStallTimer);
      utteranceStallTimer = null;
    }
  };
  let utteranceStallTimer = null;
  if (isFriendMode) {
    const stallMs = shouldQueueFriendSpeech() ? 3500 : 4500;
    utteranceStallTimer = window.setTimeout(() => {
      utteranceStallTimer = null;
      if (utteranceStarted || !friendSpeechPlaying) {
        return;
      }
      const stalledSyn = typeof window !== "undefined" ? window.speechSynthesis : null;
      if (stalledSyn && (stalledSyn.speaking || stalledSyn.pending)) {
        return;
      }
      friendSpeechPlaying = false;
      drainFriendSpeechQueue();
    }, stallMs);
  }
  const finishSpeech = () => {
    clearUtteranceStallTimer();
    if (isFriendMode) {
      friendSpeechPlaying = false;
    }
    if (friendSpeechWatchdog) {
      window.clearTimeout(friendSpeechWatchdog);
      friendSpeechWatchdog = null;
    }
    if (pendingPrioritySpeech === text) {
      pendingPrioritySpeech = "";
    }
    if (text === PRACTICE_FLIP_VOICE_PHRASE) {
      practiceFlipUtteranceHeard = true;
      practiceFlipColdBootActive = false;
      lastSpokenPhrase = PRACTICE_FLIP_VOICE_PHRASE;
      practiceFlipDelivering = false;
    }
    if (isFriendMode) {
      drainFriendSpeechQueue();
    }
  };
  const handlers = {
    onstart: () => {
      utteranceStarted = true;
      lastSpokenAt = Date.now();
      clearUtteranceStallTimer();
      if (friendSpeechWatchdog) {
        window.clearTimeout(friendSpeechWatchdog);
        friendSpeechWatchdog = null;
      }
      if (pendingPrioritySpeech === text) {
        pendingPrioritySpeech = "";
      }
      lastSpokenPhrase = text;
      if (isFriendMode) {
        lastTurnSpoken = text;
        friendTurnSpeechPending = "";
      }
      if (text === PRACTICE_FLIP_VOICE_PHRASE) {
        practiceFlipUtteranceHeard = true;
        practiceFlipColdBootActive = false;
        lastSpokenPhrase = PRACTICE_FLIP_VOICE_PHRASE;
        cancelPracticeFlipVoiceTimers();
      }
    },
    onend: finishSpeech,
    onerror: () => {
      if (text === PRACTICE_FLIP_VOICE_PHRASE) {
        practiceFlipDelivering = false;
        practiceFlipSpeechLockUntil = 0;
      }
      finishSpeech();
    },
  };
  if (playMode === "puffly" && !speechNeedsInteractionUnlock) {
    void pufflySpeak(text, handlers);
    return;
  }
  const utterance = createSpeechUtterance(text, handlers);
  syn.speak(utterance);
}

function unlockSpeechIfNeeded() {
  if (playMode === "friend" && speechNeedsInteractionUnlock && !friendVoiceStartDismissed) {
    speechGesturePrimed = true;
    updateSpeechUnlockOverlay();
    return;
  }
  const alreadyPrimed = speechUnlocked && speechGesturePrimed;
  speechUnlocked = true;
  updateSpeechUnlockOverlay();
  if (!(playMode === "friend" && speechNeedsInteractionUnlock)) {
    speechUnlockOverlay?.classList.add("hidden");
  }
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.resume();
  }
  if (playMode === "puffly" && isStarterFlipPending()) {
    pendingJoinIntroTeam = "";
    pendingPrioritySpeech = "";
    pendingUnlockSpeech = "";
    practiceFlipColdBootActive = false;
    speakPracticeFlipPromptOnce({ force: true, inGesture: true });
    return;
  }
  if (alreadyPrimed) {
    return;
  }
  primeSpeechSynthesisFromUserGesture();
  if (pendingJoinIntroTeam && playMode === "friend") {
    pendingPrioritySpeech = buildJoinIntroPhrase(pendingJoinIntroTeam);
  }
  const queued = pendingPrioritySpeech || pendingUnlockSpeech;
  pendingUnlockSpeech = "";
  if (!queued) {
    return;
  }
  if (playMode !== "friend" && playMode !== "puffly" && typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  lastSpokenAt = 0;
  if (playMode !== "friend") {
    lastSpokenPhrase = "";
  }
  pendingPrioritySpeech = "";
  pendingJoinIntroTeam = "";
  speak(queued);
  if (playMode === "friend") {
    // iPad Safari can drop the very first utterance after unlock.
    window.setTimeout(() => {
      if (typeof window === "undefined" || !window.speechSynthesis) {
        return;
      }
      if (!window.speechSynthesis.speaking) {
        lastSpokenAt = 0;
        speak(queued);
      }
    }, 520);
  }
}

function speak(text) {
  const isPracticeFlipPhrase = text === PRACTICE_FLIP_VOICE_PHRASE;
  if (!audioEnabled || typeof window === "undefined" || !window.speechSynthesis) {
    if (isPracticeFlipPhrase) {
      practiceFlipDelivering = false;
    }
    return;
  }
  if (!canSpeakNow()) {
    if (!pendingUnlockSpeech || pendingPrioritySpeech === text) {
      pendingUnlockSpeech = text;
    }
    if (isPracticeFlipPhrase) {
      practiceFlipDelivering = false;
    }
    updateSpeechUnlockOverlay();
    return;
  }
  if (playMode === "friend" && !isPracticeFlipPhrase) {
    if (shouldQueueFriendSpeech()) {
      enqueueFriendSpeech(text);
      return;
    }
    speakImmediate(text);
    return;
  }
  speakImmediate(text);
}

function flushPendingPrioritySpeech() {
  if (!pendingPrioritySpeech) {
    return;
  }
  if (!canSpeakNow()) {
    return;
  }
  const text = pendingPrioritySpeech;
  pendingPrioritySpeech = "";
  lastSpokenAt = 0;
  lastSpokenPhrase = "";
  if (playMode !== "friend" && playMode !== "puffly" && typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  speak(text);
}

function speakPhrase(text) {
  if (!text || !audioEnabled) {
    return;
  }
  if (text === lastSpokenPhrase) {
    return;
  }
  speak(text);
}

function speakPhraseReliable(text, options = {}) {
  if (!text) {
    return;
  }
  const forceRepeat = Boolean(options.forceRepeat);
  if (forceRepeat) {
    // Allow the same phrase to be spoken back-to-back for repeat mistakes.
    lastSpokenPhrase = "";
    lastSpokenAt = 0;
  }
  pendingPrioritySpeech = text;
  if (forceRepeat) {
    speak(text);
    return;
  }
  speakPhrase(text);
}

function buildJoinIntroPhrase(teamName) {
  const base = `You are connected. Welcome to the game room. You are the ${teamName} team.`;
  if (playMode === "friend" && remoteSession) {
    if (!remoteSession.ready) {
      return `${base} Waiting for your friend to join.`;
    }
    if (state?.currentPlayer) {
      if (isStarterFlipPending()) {
        const gameTitle = getGameConfig(selectedGameId).title;
        const flipTeam = playerDisplayName(getFriendFlipperColor());
        return `${base} Now playing ${gameTitle} with your friend. It's ${flipTeam}'s turn to flip.`;
      }
      const activeTeam = playerDisplayName(state.currentPlayer).toUpperCase();
      return `${base} It's ${activeTeam}'s turn.`;
    }
  }
  return base;
}

function announceFriendJoinWelcome(teamName) {
  syncPlayModeForFriendVoice();
  if (!audioEnabled || !remoteSession || friendJoinWelcomeSpoken) {
    return;
  }
  const label = String(teamName || playerDisplayName(remoteSession.color)).toUpperCase();
  pendingJoinIntroTeam = label;
  const flipper = remoteSession.ready && isStarterFlipPending() ? getFriendFlipperColor() : null;
  const sequence = buildFriendJoinClipSequence(label, {
    waitingForFriend: !remoteSession.ready,
    gameId: selectedGameId,
    flipperPlayer: flipper,
  });
  playFriendWelcomeVoiceNow(sequence);
}

function buildFriendOpponentJoinedPhrase(gameId = selectedGameId) {
  return `Your friend joined. ${buildFriendGameSwitchVoicePhrase(gameId)}`;
}

function announceFriendLobbyPrompt() {
  if (playMode !== "friend" || !audioEnabled || remoteSession) {
    return;
  }
  if (friendLobbyPromptSpoken) {
    return;
  }
  friendLobbyPromptSpoken = true;
  // Lobby line plays after Create/Join (avoids extra Start overlays before a room exists).
}

function announceFriendOpponentJoined() {
  if (playMode !== "friend" || !audioEnabled || !remoteSession?.ready) {
    return;
  }
  primePufflyVoiceFromGesture();
  const now = Date.now();
  if (now < friendOpponentJoinedSpeechLockUntil) {
    return;
  }
  friendOpponentJoinedSpeechLockUntil = now + 5000;
  const phrase = buildFriendOpponentJoinedPhrase();
  friendSwitchVoiceLockUntil = now + 5000;
  if (remoteSession?.ready && isStarterFlipPending()) {
    const flipPhrase = getFriendFlipTurnPhrase(getFriendFlipperColor());
    friendFlipTurnLastPhrase = flipPhrase;
    friendFlipTurnSpeechLockUntil = now + 5000;
    lastTurnSpoken = flipPhrase;
  }
  lastSpokenPhrase = "";
  const flipper = isStarterFlipPending() ? getFriendFlipperColor() : null;
  const flipPhrase = flipper ? getFriendFlipTurnPhrase(flipper) : "";
  const sequence = buildFriendOpponentJoinedClipSequence(selectedGameId, flipper);
  if (!friendJoinWelcomeSpoken) {
    playFriendWelcomeVoiceNow(sequence);
  }
}

function dismissFriendVoiceStartOverlay() {
  friendVoiceStartDismissed = true;
  speechUnlockOverlay?.classList.add("hidden");
  updateSpeechUnlockOverlay();
}

function dismissPracticeVoiceStartOverlay() {
  practiceVoiceStartDismissed = true;
  speechUnlockOverlay?.classList.add("hidden");
  updateSpeechUnlockOverlay();
  resetPracticeMascotVoiceTracking();
}

function squaresEqual(a, b) {
  if (!a && !b) {
    return true;
  }
  if (!a || !b) {
    return false;
  }
  return a.row === b.row && a.col === b.col;
}

function boardsEqual(boardA, boardB) {
  if (!Array.isArray(boardA) || !Array.isArray(boardB)) {
    return false;
  }
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const a = boardA[row][col];
      const b = boardB[row][col];
      if (!a && !b) {
        continue;
      }
      if (!a || !b) {
        return false;
      }
      if (a.player !== b.player || Boolean(a.king) !== Boolean(b.king)) {
        return false;
      }
    }
  }
  return true;
}

function statesEquivalentForSync(a, b) {
  return (
    boardsEqual(a.board, b.board) &&
    a.currentPlayer === b.currentPlayer &&
    (a.winner || null) === (b.winner || null) &&
    squaresEqual(a.forcedPiece, b.forcedPiece)
  );
}

function isStarterFlipTransition(previousState, nextState) {
  return Boolean(previousState && nextState && !previousState.starterFlipDone && nextState.starterFlipDone);
}

function puzzleRoomStateDigest(stateLike) {
  if (!stateLike || !Array.isArray(stateLike.pieces)) {
    return "";
  }
  const placedCount = stateLike.pieces.filter((piece) => piece.placed).length;
  const { rows, cols } = inferPuzzleGridSizeFromState(stateLike);
  return [
    rows,
    cols,
    stateLike.starterFlipDone ? "1" : "0",
    stateLike.starterPlayer || "-",
    stateLike.puzzleFlipTurn || stateLike.currentPlayer || "-",
    stateLike.pieces.length,
    placedCount,
    stateLike.draw ? "1" : "0",
    stateLike.winner || "-",
  ].join("|");
}

function inferGameStateShape(stateLike) {
  if (!stateLike || typeof stateLike !== "object") {
    return null;
  }
  if (Array.isArray(stateLike.pieces) && stateLike.pieces.length > 0) {
    return "puzzle";
  }
  if (Array.isArray(stateLike.grid) && stateLike.grid.length === FOUR_ROWS) {
    return "fourinarow";
  }
  if (Array.isArray(stateLike.board) && stateLike.board.length === BOARD_SIZE) {
    return "checkers";
  }
  return null;
}

function resetPracticeMascotVoiceTracking() {
  lastMascotVoiceThought = "";
}

function resetFriendSpeechForGameSwitch() {
  friendYourTurnVoiceAnnounced = false;
  lastTurnSpoken = "";
  lastSpokenPhrase = "";
  lastSpokenAt = 0;
  pendingPrioritySpeech = "";
  friendTurnSpeechPending = "";
  friendFlipTurnLastPhrase = "";
  friendFlipTurnSpeechLockUntil = 0;
  friendOpponentJoinedSpeechLockUntil = 0;
  friendSwitchVoiceLockUntil = 0;
  friendSpeechQueue.length = 0;
  friendClipSequenceQueue = [];
  friendClipSequencePlaying = false;
  pendingWelcomeVoiceLines = [];
  lastMascotVoiceThought = "";
  friendSpeechPlaying = false;
  stopAllVoiceClips();
  if (friendSpeechWatchdog) {
    window.clearTimeout(friendSpeechWatchdog);
    friendSpeechWatchdog = null;
  }
}

function announceFriendGameplayVoice() {
  // Friend gameplay voice follows mascot thought text in setPufflyState.
}

function announceFriendGameSwitchVoice(gameId = selectedGameId) {
  if (playMode !== "friend" || !audioEnabled) {
    return;
  }
  const phrase = buildFriendGameSwitchVoicePhrase(gameId);
  if (!phrase) {
    return;
  }
  const now = Date.now();
  friendSwitchVoiceLockUntil = now + 5000;
  if (remoteSession?.ready && isStarterFlipPending()) {
    const flipPhrase = getFriendFlipTurnPhrase(getFriendFlipperColor());
    friendFlipTurnLastPhrase = flipPhrase;
    friendFlipTurnSpeechLockUntil = now + 5000;
    lastTurnSpoken = flipPhrase;
  }
  lastSpokenPhrase = "";
  const flipper = remoteSession?.ready && isStarterFlipPending() ? getFriendFlipperColor() : null;
  const flipPhrase = flipper ? getFriendFlipTurnPhrase(flipper) : "";
  const sequence = buildFriendGameSwitchClipSequence(gameId, flipper);
  if (playFriendIntroClips(sequence, { trackTurnPhrase: flipPhrase })) {
    return;
  }
  speakFriendTurnPhrase(phrase, { force: true });
}

function speakFriendSwitchMessage(message) {
  if (!message || !audioEnabled) {
    return;
  }
  if (speechNeedsInteractionUnlock && !speechUnlocked) {
    pendingPrioritySpeech = message;
    pendingUnlockSpeech = message;
    return;
  }
  speakPhraseReliable(message, { forceRepeat: true });
}

function speakFriendTurnPhrase(phrase, options = {}) {
  if (!phrase || !audioEnabled) {
    return;
  }
  const isFlipPhrase = /turn to flip/i.test(String(phrase));
  const isTurnLabel = Boolean(playerColorFromFriendTurnPhrase(phrase));
  if (!isFlipPhrase && isTurnLabel) {
    if (speakFriendTurnFromState(options)) {
      return;
    }
  }
  const forceRepeat = Boolean(options.force);
  if (!forceRepeat) {
    if (phrase === lastTurnSpoken || phrase === friendTurnSpeechPending) {
      return;
    }
    if (friendSpeechPlaying && phrase === lastSpokenPhrase) {
      return;
    }
  }
  syncPlayModeForFriendVoice();
  if (speakFriendVoice(phrase, { force: forceRepeat })) {
    return;
  }
  friendTurnSpeechPending = phrase;
  lastTurnSpoken = phrase;
  ensureAudioContext({ skipSpeechUnlock: true });
  if (!speechNeedsInteractionUnlock) {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.resume();
    }
    speakPhraseReliable(phrase, { forceRepeat });
    return;
  }
  if (speechNeedsInteractionUnlock && !speechUnlocked) {
    pendingPrioritySpeech = phrase;
    pendingUnlockSpeech = phrase;
    return;
  }
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.resume();
  }
  speakPhraseReliable(phrase, { forceRepeat });
}

function roomStateDiffersFromSync(previousState, remoteState) {
  if (!remoteState) {
    return false;
  }
  const previousShape = inferGameStateShape(previousState);
  const remoteShape = inferGameStateShape(remoteState);
  if (previousShape && remoteShape && previousShape !== remoteShape) {
    return true;
  }
  if (selectedGameId === "puzzle") {
    return puzzleRoomStateDigest(previousState) !== puzzleRoomStateDigest(remoteState);
  }
  if (selectedGameId === "fourinarow") {
    return JSON.stringify(previousState?.grid || []) !== JSON.stringify(remoteState?.grid || [])
      || previousState?.currentPlayer !== remoteState?.currentPlayer
      || previousState?.starterFlipDone !== remoteState?.starterFlipDone;
  }
  return !statesEquivalentForSync(previousState, remoteState)
    || previousState?.starterFlipDone !== remoteState?.starterFlipDone;
}

function getFriendOpponentColor() {
  return remoteSession?.color === "dark" ? "light" : "dark";
}

function inferRemoteMoveFromStates(previousState, nextState) {
  if (!previousState?.board || !nextState?.board) {
    return null;
  }
  const mover = previousState.currentPlayer;
  if (!mover) {
    return null;
  }
  const legal = getAllLegalMovesForPlayer(previousState, mover);
  for (const move of legal.allMoves) {
    const result = applyMove(previousState, move);
    if (statesEquivalentForSync(result.nextState, nextState)) {
      return move;
    }
  }
  return null;
}

function inferRemoteMoveChain(previousState, nextState, maxDepth = 8) {
  if (!previousState?.board || !nextState?.board) {
    return null;
  }
  const visited = new Set();
  function dfs(sim, depth) {
    if (statesEquivalentForSync(sim, nextState)) {
      return [];
    }
    if (depth >= maxDepth) {
      return null;
    }
    const key = checkersUndoStateKey(sim);
    if (visited.has(key)) {
      return null;
    }
    visited.add(key);
    const mover = sim.currentPlayer;
    if (!mover) {
      return null;
    }
    for (const move of getAllLegalMovesForPlayer(sim, mover).allMoves) {
      const result = applyMove(sim, move);
      const tail = dfs(result.nextState, depth + 1);
      if (tail !== null) {
        return [move, ...tail];
      }
    }
    return null;
  }
  return dfs(previousState, 0);
}

function normalizeCheckersMoveFromLast(lastMove) {
  if (!lastMove?.from || !lastMove?.to) {
    return null;
  }
  return {
    from: { row: lastMove.from.row, col: lastMove.from.col },
    to: { row: lastMove.to.row, col: lastMove.to.col },
    capture: lastMove.capture ? { row: lastMove.capture.row, col: lastMove.capture.col } : null,
    isCapture: Boolean(lastMove.capture),
  };
}

function extractOpponentMovesForAnimation(previousState, nextState) {
  if (selectedGameId === "fourinarow") {
    const remoteDrop = inferRemoteDropFromStates(previousState, nextState);
    return remoteDrop ? [{ kind: "drop", drop: remoteDrop }] : [];
  }
  if (previousState.currentPlayer !== getFriendOpponentColor()) {
    return [];
  }
  const chain = inferRemoteMoveChain(previousState, nextState);
  if (chain?.length) {
    return chain.map((move) => ({ kind: "checkers", move }));
  }
  const fromLast = normalizeCheckersMoveFromLast(nextState.lastMove);
  if (fromLast) {
    return [{ kind: "checkers", move: fromLast }];
  }
  const single = inferRemoteMoveFromStates(previousState, nextState);
  return single ? [{ kind: "checkers", move: single }] : [];
}

function shouldAnimateFriendOpponentMove(previousState, nextState, didVersionChange) {
  if (!FRIEND_ANIMATE_OPPONENT_MOVES) {
    return false;
  }
  if (playMode !== "friend" || !remoteSession?.ready || selectedGameId === "puzzle") {
    return false;
  }
  if (!previousState || !nextState) {
    return false;
  }
  if (statesEquivalentForSync(previousState, nextState)) {
    return false;
  }
  if (!didVersionChange) {
    return false;
  }
  return previousState.currentPlayer === getFriendOpponentColor();
}

async function waitForBoardPaint() {
  await new Promise((resolve) => window.requestAnimationFrame(resolve));
  await new Promise((resolve) => window.requestAnimationFrame(resolve));
}

async function playFriendOpponentMoveAnimation(previousState, nextState, message) {
  const steps = extractOpponentMovesForAnimation(previousState, nextState);
  if (!steps.length) {
    return false;
  }
  friendRemoteAnimating = true;
  let simState = clone(previousState);
  try {
  for (const step of steps) {
    state = clone(simState);
    render(message);
    await waitForBoardPaint();
    if (step.kind === "drop") {
      await sleep(140);
      await animateFourDrop(step.drop.player, step.drop.row, step.drop.col, AI_MOVE_ANIMATION_MS);
      playMoveAudio(step.drop.player, { isCapture: false });
      const dropResult = applyFourInARowDrop(simState, step.drop.col);
      if (dropResult.ok) {
        simState = dropResult.nextState;
      }
      continue;
    }
    await sleep(120);
    const mover = simState.currentPlayer;
    await animateHumanMove(step.move);
    const result = applyMove(simState, step.move);
    playMoveAudio(mover, step.move);
    simState = result.nextState;
  }
  return true;
  } finally {
    friendRemoteAnimating = false;
  }
}

function inferRemoteDropFromStates(previousState, nextState) {
  const latest = nextState?.lastMove;
  if (!latest) {
    return null;
  }
  if (previousState?.grid?.[latest.row]?.[latest.col]) {
    return null;
  }
  if (nextState?.grid?.[latest.row]?.[latest.col] !== latest.player) {
    return null;
  }
  return latest;
}

function checkersUndoStateKey(state) {
  if (!state?.board) {
    return "";
  }
  const boardKey = state.board
    .map((row) =>
      row
        .map((piece) => {
          if (!piece) {
            return ".";
          }
          return `${piece.player === "dark" ? "d" : "l"}${piece.king ? "k" : "m"}`;
        })
        .join(""),
    )
    .join("|");
  const forced = state.forcedPiece ? `${state.forcedPiece.row},${state.forcedPiece.col}` : "-";
  return `${boardKey}::${state.currentPlayer || "-"}::${forced}`;
}

function inferUndoCheckersSequence(currentState, targetState, maxDepth = 8) {
  if (!currentState || !targetState || !currentState.board || !targetState.board) {
    return [];
  }
  const visited = new Set();

  function dfs(stateLike, depth) {
    if (statesEquivalentForSync(stateLike, currentState)) {
      return [];
    }
    if (depth <= 0) {
      return null;
    }
    const key = checkersUndoStateKey(stateLike);
    if (visited.has(key)) {
      return null;
    }
    visited.add(key);
    const legal = getAllLegalMovesForPlayer(stateLike, stateLike.currentPlayer).allMoves;
    for (const move of legal) {
      const result = applyMove(stateLike, move);
      const tail = dfs(result.nextState, depth - 1);
      if (tail) {
        return [move, ...tail];
      }
    }
    return null;
  }

  const found = dfs(targetState, maxDepth);
  if (found && found.length > 0) {
    const forwardStates = [clone(targetState)];
    const forwardMeta = [];
    let simState = clone(targetState);
    for (const move of found) {
      const mover = simState.currentPlayer || null;
      forwardMeta.push({ move, mover });
      simState = applyMove(simState, move).nextState;
      forwardStates.push(clone(simState));
    }
    const reverseMoves = [];
    for (let idx = found.length - 1; idx >= 0; idx -= 1) {
      const { move, mover } = forwardMeta[idx];
      reverseMoves.push({
        from: { ...move.to },
        to: { ...move.from },
        capture: move.capture ? { ...move.capture } : null,
        isCapture: Boolean(move.capture),
        mover,
        restoreState: clone(forwardStates[idx]),
      });
    }
    return reverseMoves;
  }

  const fallbackForward = inferRemoteMoveFromStates(targetState, currentState);
  if (!fallbackForward) {
    return [];
  }
  return [
    {
      ...fallbackForward,
      from: { ...fallbackForward.to },
      to: { ...fallbackForward.from },
      isCapture: Boolean(fallbackForward.capture),
      mover:
        currentState?.board?.[fallbackForward.to.row]?.[fallbackForward.to.col]?.player ||
        targetState?.currentPlayer ||
        null,
      restoreState: clone(targetState),
    },
  ];
}

function inferUndoFourDrop(currentState, targetState) {
  if (!currentState?.grid || !targetState?.grid) {
    return null;
  }
  for (let row = FOUR_ROWS - 1; row >= 0; row -= 1) {
    for (let col = 0; col < FOUR_COLS; col += 1) {
      const currentCell = currentState.grid[row]?.[col] || null;
      const targetCell = targetState.grid[row]?.[col] || null;
      if (currentCell && !targetCell) {
        return { player: currentCell, row, col };
      }
    }
  }
  return null;
}

function fourStateEquivalent(a, b) {
  if (!a?.grid || !b?.grid) {
    return false;
  }
  for (let row = 0; row < FOUR_ROWS; row += 1) {
    for (let col = 0; col < FOUR_COLS; col += 1) {
      if ((a.grid[row]?.[col] || null) !== (b.grid[row]?.[col] || null)) {
        return false;
      }
    }
  }
  return (
    (a.currentPlayer || null) === (b.currentPlayer || null) &&
    (a.winner || null) === (b.winner || null) &&
    Boolean(a.draw) === Boolean(b.draw)
  );
}

function inferUndoFourSequence(currentState, targetState, maxDepth = 4) {
  if (!currentState || !targetState || !currentState.grid || !targetState.grid) {
    return [];
  }
  const visited = new Set();

  function stateKey(stateLike) {
    const gridKey = stateLike.grid.map((row) => row.map((cell) => cell || ".").join("")).join("|");
    return `${gridKey}::${stateLike.currentPlayer || "-"}::${stateLike.winner || "-"}::${stateLike.draw ? "1" : "0"}`;
  }

  function dfs(stateLike, depth) {
    if (fourStateEquivalent(stateLike, currentState)) {
      return [];
    }
    if (depth <= 0) {
      return null;
    }
    const key = stateKey(stateLike);
    if (visited.has(key)) {
      return null;
    }
    visited.add(key);
    const droppable = getDroppableColumns(stateLike.grid);
    for (const col of droppable) {
      const result = applyFourInARowDrop(stateLike, col);
      if (!result.ok) {
        continue;
      }
      const tail = dfs(result.nextState, depth - 1);
      if (tail) {
        return [{ col, row: result.row, player: stateLike.currentPlayer, nextState: result.nextState }, ...tail];
      }
    }
    return null;
  }

  const forward = dfs(targetState, maxDepth);
  if (!forward || forward.length === 0) {
    const one = inferUndoFourDrop(currentState, targetState);
    if (!one) {
      return [];
    }
    return [{ ...one, restoreState: clone(targetState) }];
  }

  const reverse = [];
  let restore = clone(currentState);
  for (let i = forward.length - 1; i >= 0; i -= 1) {
    const step = forward[i];
    reverse.push({
      player: step.player,
      row: step.row,
      col: step.col,
      restoreState: clone(i === 0 ? targetState : forward[i - 1].nextState),
    });
    restore = i === 0 ? clone(targetState) : clone(forward[i - 1].nextState);
  }
  void restore;
  return reverse;
}

function inferUndoPuzzlePlacement(currentState, targetState) {
  const currentPieces = Array.isArray(currentState?.pieces) ? currentState.pieces : [];
  const targetMap = new Map((Array.isArray(targetState?.pieces) ? targetState.pieces : []).map((piece) => [piece.id, piece]));
  for (const piece of currentPieces) {
    if (!piece?.placed) {
      continue;
    }
    const targetPiece = targetMap.get(piece.id);
    if (!targetPiece || targetPiece.placed) {
      continue;
    }
    return {
      pieceId: piece.id,
      owner: piece.owner,
      row: piece.placedRow,
      col: piece.placedCol,
    };
  }
  return null;
}

function speakFromStatus(statusMessage) {
  if (playMode === "puffly") {
    if (
      practiceFlipUtteranceHeard &&
      (statusMessage === "Flip to see who goes first." || statusMessage.includes("Flipping to see"))
    ) {
      return;
    }
    if (statusMessage.includes("wins the flip and goes first")) {
      const starter = state?.starterPlayer || state?.currentPlayer;
      if (starter) {
        speakPracticeFlipResultOnce(starter);
      }
      return;
    }
  }
  if (playMode === "friend") {
    const silentFriendStatus =
      !statusMessage ||
      statusMessage === "Make your move." ||
      statusMessage === "Room synchronized." ||
      statusMessage === "Opponent connected." ||
      statusMessage === "Remote room connected." ||
      statusMessage.startsWith("Waiting for opponent") ||
      statusMessage.startsWith("Waiting for your friend") ||
      statusMessage.startsWith("Friend mode:") ||
      statusMessage.startsWith("Now playing ");
    if (silentFriendStatus) {
      return;
    }
  }
  let phrase = "";
  if (statusMessage === "Puffly is thinking...") {
    if (playMode === "puffly") {
      return;
    }
    phrase = "Puffly is thinking.";
  } else if (
    statusMessage === "That piece cannot move." ||
    statusMessage === "That destination is not legal." ||
    statusMessage === "Select one of the highlighted pieces." ||
    statusMessage === "That move is not legal."
  ) {
    phrase = "Wrong move.";
  } else if (statusMessage === "Choose a highlighted destination.") {
    phrase = "Choose one of the highlighted squares.";
  } else if (statusMessage === "Undid your previous turn.") {
    if (playMode === "puffly") {
      return;
    }
    phrase = "Last turn undone.";
  } else if (statusMessage === "No legal moves to hint.") {
    phrase = "No hint available.";
  } else if (statusMessage.startsWith("Hint:")) {
    phrase = "Hint ready.";
  } else if (statusMessage.startsWith("Difficulty set to") || statusMessage.startsWith("Puzzle size set to")) {
    phrase =
      playMode === "puffly" && isStarterFlipPending()
        ? PRACTICE_FLIP_VOICE_PHRASE
        : `${getDifficultyLabel(difficulty, selectedGameId)}.`;
  } else if (statusMessage.includes("Continue capturing with the same piece")) {
    phrase = "Capture required. Keep jumping with the same piece.";
  } else if (statusMessage === "New game started. Puffly opens.") {
    phrase = "New game. Puffly moves first.";
  } else if (statusMessage === "Puffly opens the game.") {
    phrase = "Puffly starts the game.";
  } else if (statusMessage === "Flip to see who goes first.") {
    if (playMode === "puffly") {
      return;
    }
    phrase = "Flip to see who goes first.";
  } else if (statusMessage.includes("wins the flip and goes first")) {
    const starter = state?.starterPlayer || state?.currentPlayer;
    if (playMode === "friend" && starter) {
      speakFriendFlipResultOnce(starter);
      return;
    }
    if (playMode === "puffly") {
      return;
    }
    phrase = statusMessage.replace("wins the flip and goes first", "goes first");
  } else if (statusMessage === "Move closer to the matching slot to snap.") {
    phrase = "Move closer to the matching slot.";
  } else if (statusMessage === "Doesn't fit there.") {
    phrase = "Doesn't fit.";
  } else if (statusMessage === "Puzzle complete!") {
    phrase = "Puzzle complete.";
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

function countCheckersPieces(player) {
  let total = 0;
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      if (state.board[row][col]?.player === player) {
        total += 1;
      }
    }
  }
  return total;
}

function countFourPieces(player) {
  let total = 0;
  for (let row = 0; row < FOUR_ROWS; row += 1) {
    for (let col = 0; col < FOUR_COLS; col += 1) {
      if (state.grid?.[row]?.[col] === player) {
        total += 1;
      }
    }
  }
  return total;
}

function renderCapturedPile(container, count, tokenClass) {
  if (!container) {
    return;
  }
  container.innerHTML = "";
  if (count === 0) {
    const empty = document.createElement("span");
    empty.className = "captured-empty";
    empty.textContent = "—";
    container.appendChild(empty);
    return;
  }
  for (let i = 0; i < count; i += 1) {
    const token = document.createElement("span");
    token.className = `captured-token ${tokenClass}`;
    token.style.left = `${6 + (i % 2) * 10}px`;
    token.style.top = `${4 + i * 7}px`;
    container.appendChild(token);
  }
}

function createPuzzlePieceElement(piece) {
  const pieceEl = document.createElement("button");
  pieceEl.type = "button";
  pieceEl.className = `puzzle-piece ${piece.owner}`;
  const { rows, cols } = getPuzzleGridSizeFromState();
  const edges = getPuzzleEdgeProfiles(piece.correctRow, piece.correctCol, rows, cols);
  const overlapPriority =
    (edges.right === 1 ? 4 : 0) +
    (edges.bottom === 1 ? 3 : 0) +
    (edges.left === 1 ? 2 : 0) +
    (edges.top === 1 ? 1 : 0);
  pieceEl.style.zIndex = String(20 + overlapPriority);
  if (piece.id === selectedPuzzlePieceId) {
    pieceEl.classList.add("selected");
  }
  pieceEl.dataset.pieceId = piece.id;
  pieceEl.draggable = false;
  const clipId = `pz-clip-${piece.id}`;
  const piecePath = buildPuzzlePiecePath(piece);
  const outerEdgePath = buildPuzzleOuterEdgePath(piece, rows, cols);
  const puzzleSvg = document.createElementNS(SVG_NS, "svg");
  puzzleSvg.setAttribute("class", "puzzle-piece-svg");
  puzzleSvg.setAttribute("viewBox", `0 0 ${PUZZLE_JIGSAW_BASE} ${PUZZLE_JIGSAW_BASE}`);
  puzzleSvg.setAttribute("aria-hidden", "true");

  const defs = document.createElementNS(SVG_NS, "defs");
  const clipPath = document.createElementNS(SVG_NS, "clipPath");
  clipPath.setAttribute("id", clipId);
  const clipShape = document.createElementNS(SVG_NS, "path");
  clipShape.setAttribute("d", piecePath);
  clipPath.appendChild(clipShape);
  defs.appendChild(clipPath);
  puzzleSvg.appendChild(defs);

  const image = document.createElementNS(SVG_NS, "image");
  image.setAttribute("href", PUZZLE_IMAGE_URL);
  image.setAttribute("x", String(-piece.correctCol * PUZZLE_JIGSAW_BASE));
  image.setAttribute("y", String(-piece.correctRow * PUZZLE_JIGSAW_BASE));
  image.setAttribute("width", String(PUZZLE_JIGSAW_BASE * cols));
  image.setAttribute("height", String(PUZZLE_JIGSAW_BASE * rows));
  image.setAttribute("clip-path", `url(#${clipId})`);
  image.setAttribute("preserveAspectRatio", "none");
  puzzleSvg.appendChild(image);

  const seam = document.createElementNS(SVG_NS, "path");
  seam.setAttribute("class", "puzzle-piece-seam");
  seam.setAttribute("d", piecePath);
  puzzleSvg.appendChild(seam);

  if (outerEdgePath) {
    const edgeGlow = document.createElementNS(SVG_NS, "path");
    edgeGlow.setAttribute("class", "puzzle-piece-edge-glow");
    edgeGlow.setAttribute("d", outerEdgePath);
    puzzleSvg.appendChild(edgeGlow);
  }

  const outline = document.createElementNS(SVG_NS, "path");
  outline.setAttribute("class", "puzzle-piece-outline");
  outline.setAttribute("d", piecePath);
  puzzleSvg.appendChild(outline);
  pieceEl.appendChild(puzzleSvg);

  if (piece.correctRow === 0 || piece.correctCol === 0 || piece.correctRow === rows - 1 || piece.correctCol === cols - 1) {
    pieceEl.classList.add("edge-piece");
  }
  return pieceEl;
}

function purgePuzzleTrayIndexForContainer(container) {
  if (!container) {
    return;
  }
  for (const [pieceId, pieceEl] of puzzleTrayPieceById.entries()) {
    if (pieceEl.parentElement === container) {
      puzzleTrayPieceById.delete(pieceId);
    }
  }
}

function shouldHandleTrayTap() {
  const now = Date.now();
  if (now - lastTrayTapAt < 24) {
    return false;
  }
  lastTrayTapAt = now;
  return true;
}

function shouldHandleBoardTap() {
  const now = Date.now();
  if (now - lastBoardTapAt < 24) {
    return false;
  }
  lastBoardTapAt = now;
  return true;
}

function commitPuzzleTapFlashPaint(el) {
  if (!(el instanceof HTMLElement)) {
    return;
  }
  void el.offsetWidth;
}

function armPuzzleTapFlash(el) {
  if (!(el instanceof HTMLElement)) {
    return;
  }
  el.classList.add("puzzle-tap-flash");
  commitPuzzleTapFlashPaint(el);
  const clear = () => {
    el.classList.remove("puzzle-tap-flash");
  };
  el.addEventListener("pointerup", clear, { once: true });
  el.addEventListener("pointercancel", clear, { once: true });
  window.setTimeout(clear, speechNeedsInteractionUnlock ? 180 : 320);
}

function runAfterPuzzleTapPaint(fn) {
  if (speechNeedsInteractionUnlock) {
    requestAnimationFrame(() => fn());
    return;
  }
  fn();
}

function handlePuzzleTouchFlash(event) {
  const trayPiece = event.target.closest(".puzzle-tray .puzzle-piece");
  if (trayPiece instanceof HTMLElement) {
    armPuzzleTapFlash(trayPiece);
    return;
  }
  if (!selectedPuzzlePieceId) {
    return;
  }
  const cell = event.target.closest(".puzzle-cell");
  if (cell instanceof HTMLElement) {
    armPuzzleTapFlash(cell);
  }
}

function registerPuzzleTrayPieceElement(pieceId, pieceEl) {
  if (pieceId && pieceEl) {
    puzzleTrayPieceById.set(pieceId, pieceEl);
  }
}

function applyPuzzleTraySelection(pieceId) {
  if (!pieceId) {
    return;
  }
  if (lastTraySelectedPieceId && lastTraySelectedPieceId !== pieceId) {
    puzzleTrayPieceById.get(lastTraySelectedPieceId)?.classList.remove("selected");
  }
  puzzleTrayPieceById.get(pieceId)?.classList.add("selected");
  lastTraySelectedPieceId = pieceId;
  selectedPuzzlePieceId = pieceId;
}

function clearPuzzleTraySelection() {
  if (lastTraySelectedPieceId) {
    puzzleTrayPieceById.get(lastTraySelectedPieceId)?.classList.remove("selected");
  }
  lastTraySelectedPieceId = "";
  selectedPuzzlePieceId = "";
}

function renderPuzzleTray(container, owner) {
  if (!container) {
    return;
  }
  const pending = getPuzzleRemainingByOwner(state, owner);
  purgePuzzleTrayIndexForContainer(container);
  container.innerHTML = "";
  if (pending.length === 0) {
    const done = document.createElement("span");
    done.className = "captured-empty";
    done.textContent = "All placed";
    container.appendChild(done);
    return;
  }
  container.classList.add("puzzle-tray");
  for (const piece of pending) {
    const pieceEl = createPuzzlePieceElement(piece);
    container.appendChild(pieceEl);
    registerPuzzleTrayPieceElement(piece.id, pieceEl);
    if (piece.id === selectedPuzzlePieceId) {
      pieceEl.classList.add("selected");
      lastTraySelectedPieceId = piece.id;
    }
  }
}

function renderCapturedPiles() {
  blueCapturedPile?.classList.remove("puzzle-tray");
  greenCapturedPile?.classList.remove("puzzle-tray");
  if (selectedGameId === "puzzle") {
    const myTrayColor = playMode === "friend" && remoteSession ? remoteSession.color : null;
    if (blueCapturedLabel) {
      blueCapturedLabel.textContent = myTrayColor === "dark" ? "BLUE (You)" : "BLUE Tray";
    }
    if (greenCapturedLabel) {
      greenCapturedLabel.textContent = myTrayColor === "light" ? "GREEN (You)" : "GREEN Tray";
    }
    renderPuzzleTray(blueCapturedPile, "dark");
    renderPuzzleTray(greenCapturedPile, "light");
    return;
  }
  if (selectedGameId === "fourinarow") {
    if (blueCapturedLabel) {
      blueCapturedLabel.textContent = "BLUE Remaining";
    }
    if (greenCapturedLabel) {
      greenCapturedLabel.textContent = "GREEN Remaining";
    }
    renderCapturedPile(blueCapturedPile, Math.max(0, FOUR_STARTING_PIECES - countFourPieces("dark")), "blue");
    renderCapturedPile(greenCapturedPile, Math.max(0, FOUR_STARTING_PIECES - countFourPieces("light")), "green");
    return;
  }
  if (blueCapturedLabel) {
    blueCapturedLabel.textContent = "BLUE Captured";
  }
  if (greenCapturedLabel) {
    greenCapturedLabel.textContent = "GREEN Captured";
  }
  renderCapturedPile(blueCapturedPile, Math.max(0, CHECKERS_STARTING_PIECES - countCheckersPieces("dark")), "blue");
  renderCapturedPile(greenCapturedPile, Math.max(0, CHECKERS_STARTING_PIECES - countCheckersPieces("light")), "green");
}

function getDifficultyLabelsForGame(gameId = selectedGameId) {
  return gameId === "puzzle" ? PRACTICE_DIFFICULTY_LABELS.puzzle : PRACTICE_DIFFICULTY_LABELS.checkers;
}

function getDifficultyLabel(level = difficulty, gameId = selectedGameId) {
  return getDifficultyLabelsForGame(gameId)[level] || level;
}

function syncPuzzleDifficultyFromRemote(stateLike, puzzleDifficulty) {
  if (selectedGameId !== "puzzle") {
    return;
  }
  let next = null;
  const normalized = String(puzzleDifficulty || "").trim().toLowerCase();
  if (normalized === "easy" || normalized === "medium" || normalized === "hard") {
    next = normalized;
  } else if (stateLike) {
    next = puzzleDifficultyFromGridSize(inferPuzzleGridSizeFromState(stateLike).rows);
  }
  if (!next || next === difficulty) {
    return;
  }
  difficulty = next;
  updateDifficultyButtons();
  updateFriendDifficultyButtons();
}

async function postFriendPuzzleSize(nextDifficulty) {
  const payload = {
    roomCode: remoteSession.roomCode,
    playerId: remoteSession.playerId,
    puzzleDifficulty: nextDifficulty,
  };
  try {
    return await apiPost("/api/rooms/puzzle-size", payload);
  } catch (error) {
    const message = String(error?.message || "").toLowerCase();
    if (!message.includes("404") && !message.includes("not found")) {
      throw error;
    }
    return apiPost("/api/rooms/restart", payload);
  }
}

function updateDifficultyButtonLabels() {
  const labels = getDifficultyLabelsForGame(selectedGameId);
  for (const button of difficultyButtons) {
    const level = button.dataset.difficulty;
    if (level && labels[level]) {
      button.textContent = labels[level];
    }
  }
}

function updateDifficultyButtons() {
  updateDifficultyButtonLabels();
  for (const button of difficultyButtons) {
    const level = button.dataset.difficulty;
    button.classList.toggle("active", level === difficulty);
    button.disabled = busy || playMode !== "puffly";
  }
}

function updateFriendDifficultyButtons() {
  for (const button of friendDifficultyButtons) {
    const level = button.dataset.difficulty;
    const isSelected = level === difficulty;
    button.classList.toggle("is-on", isSelected);
    button.classList.toggle("is-off", !isSelected);
    const inFriendPuzzle = playMode === "friend" && selectedGameId === "puzzle";
    const isHost = !remoteSession || remoteSession.color === "dark";
    const canChange = inFriendPuzzle && isHost && isStarterFlipPending();
    button.classList.toggle("is-locked", inFriendPuzzle && !canChange);
    button.disabled = busy;
    button.setAttribute("aria-disabled", inFriendPuzzle && !canChange ? "true" : "false");
  }
}

function updateFriendPuzzleDifficultyPanel() {
  const show = playMode === "friend" && selectedGameId === "puzzle";
  friendPuzzleDifficultyPanel?.classList.toggle("hidden", !show);
  if (show) {
    updateFriendDifficultyButtons();
  }
}

function updateCreateInviteButtonLabel() {
  if (!createRoomButton) {
    return;
  }
  if (pendingInviteShareRoomCode && remoteSession) {
    createRoomButton.textContent = "Share Invite";
    return;
  }
  createRoomButton.textContent = remoteSession ? "Share Invite" : "Create & Invite";
}

function prefersCompactChrome() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(hover: hover) and (pointer: fine)").matches
  );
}

function updateFriendRoomButtons() {
  const inRoom = Boolean(remoteSession);
  const inFriendUi = isFriendModeUiActive();
  const createActive = inRoom || (inFriendUi && !inRoom);
  createRoomButton?.classList.toggle("is-on", createActive);
  createRoomButton?.classList.toggle("is-off", !createActive);
  joinRoomButton?.classList.toggle("is-on", inFriendUi);
  joinRoomButton?.classList.toggle("is-off", !inFriendUi);
  leaveRoomButton?.classList.toggle("is-on", inRoom);
  leaveRoomButton?.classList.toggle("is-off", !inRoom);
  if (typeof document !== "undefined") {
    document.body.classList.toggle("friend-room-active", inRoom);
  }
  updateCreateInviteButtonLabel();
}

function updateAudioToggle() {
  if (!audioToggleButton) {
    return;
  }
  audioToggleButton.classList.toggle("is-on", audioEnabled);
  audioToggleButton.classList.toggle("is-off", !audioEnabled);
  audioToggleButton.setAttribute("aria-pressed", audioEnabled ? "true" : "false");
  audioToggleButton.disabled = busy;
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

function recordPuzzlePlacement(player, piece, row, col) {
  const mover = playMode === "friend" ? playerDisplayName(player).toUpperCase() : player === humanPlayer ? "You" : "Puffly";
  moveHistory.push(`${mover}: ${piece.id} -> (${row + 1},${col + 1})`);
}

function showCelebration() {
  if (!state.winner || winnerAnnounced === state.winner) {
    return;
  }
  winnerAnnounced = state.winner;
  if (playMode === "friend") {
    const winnerLabel = playerDisplayName(state.winner).toUpperCase();
    celebrationTitle.textContent = `${winnerLabel} wins!`;
    celebrationSubtitle.textContent = "Try another round and outsmart your friend.";
  } else {
    celebrationTitle.textContent = state.winner === humanPlayer ? "You win!" : "Puffly wins!";
    celebrationSubtitle.textContent =
      state.winner === humanPlayer ? "Great strategy and captures." : "Try another round and outsmart Puffly.";
  }
  celebrationOverlay.classList.remove("hidden");
  playWinFx(state.winner === humanPlayer);
  playCelebrationAudio();
  const humanWon = state.winner === humanPlayer;
  const endgamePhrase =
    playMode === "friend"
      ? `${playerDisplayName(state.winner).toUpperCase()} wins!`
      : getPracticeEndgamePhrase(humanWon);
  void pufflySpeak(endgamePhrase, {
    onstart: () => {
      lastSpokenPhrase = endgamePhrase;
      lastTurnSpoken = "";
    },
  });
}

function dismissPuzzleCompletionCelebration() {
  hideCelebration();
  if (isPuzzleComplete()) {
    winnerAnnounced = "puzzle-complete";
  }
  releasePuzzleInteractionLocks();
}

function showPuzzleCompletionCelebration() {
  if (!isPuzzleComplete() || winnerAnnounced === "puzzle-complete") {
    return;
  }
  winnerAnnounced = "puzzle-complete";
  celebrationTitle.textContent = "Puzzle Complete!";
  celebrationSubtitle.textContent = "Amazing teamwork, grandpals!";
  celebrationOverlay.classList.remove("hidden");
  playWinFx(true);
  playCelebrationAudio();
  void pufflySpeak("Puzzle complete! Great job!", {
    onstart: () => {
      lastSpokenPhrase = "Puzzle complete! Great job!";
      lastTurnSpoken = "";
    },
  });
}

function maybeShowPuzzleCompletion(statusMessage = "Puzzle complete!") {
  if (!isPuzzleComplete()) {
    return false;
  }
  if (winnerAnnounced === "puzzle-complete") {
    return false;
  }
  lastStatusMessage = statusMessage;
  showPuzzleCompletionCelebration();
  setPufflyState("celebrate", "🧩 Puzzle complete!");
  return true;
}

function isPuzzleRestartTransition(previousState, nextState) {
  return isPuzzleComplete(previousState) && !isPuzzleComplete(nextState);
}

function resetPuzzleSessionAfterRestart() {
  winnerAnnounced = null;
  puzzleTrayBootstrapAttempted = false;
  deferRoomSyncUntilIdle = false;
  lastSpokenPhrase = "";
  lastTurnSpoken = "";
  hideCelebration();
}

function refreshPuzzleCelebrationFlags() {
  if (!isPuzzleComplete()) {
    if (winnerAnnounced === "puzzle-complete") {
      winnerAnnounced = null;
    }
    hideCelebration();
  }
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

function setPufflyState(mode, text, options = {}) {
  if (!pufflyPanel || !pufflyThought) {
    return;
  }
  pufflyPanel.classList.remove("idle", "thinking", "celebrate");
  pufflyPanel.classList.add(mode);
  pufflyThought.textContent = text;
  if ((playMode === "friend" || playMode === "puffly") && !options.silentVoice) {
    speakVoiceForMascotThought(text);
  }
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

function isFriendStatusAlert(text) {
  return /could not|unable|timed out|denied|invalid|error|failed|slow down|not found|unavailable|switch to friend|tap play/i.test(
    String(text || ""),
  );
}

function setFriendStatus(text) {
  const label = friendStatusLabel || document.getElementById("friend-status");
  if (label) {
    label.textContent = text;
    label.classList.toggle("friend-status-alert", isFriendStatusAlert(text));
  }
  if (typeof window !== "undefined" && typeof window.pufflySetFriendStatus === "function") {
    window.pufflySetFriendStatus(text);
  }
}

function clearInviteParamsFromUrl() {
  if (typeof window === "undefined" || !window.history?.replaceState) {
    return;
  }
  const url = new URL(window.location.href);
  const hadInvite =
    url.searchParams.has("join") ||
    url.searchParams.has("game") ||
    url.searchParams.has("mode") ||
    url.searchParams.has("puzzleSize") ||
    Boolean(url.hash);
  if (!hadInvite) {
    return;
  }
  url.searchParams.delete("join");
  url.searchParams.delete("game");
  url.searchParams.delete("mode");
  url.searchParams.delete("puzzleSize");
  url.searchParams.delete("puzzleDifficulty");
  url.hash = "";
  const trimmed = `${url.pathname}${url.search}`;
  window.history.replaceState({}, "", trimmed);
}

function getInviteGameIdForLink() {
  if (remoteSession?.gameType && isKnownGame(remoteSession.gameType)) {
    return normalizeGameId(remoteSession.gameType);
  }
  return selectedGameId;
}

function buildInviteLink(roomCode) {
  if (typeof window === "undefined") {
    return roomCode;
  }
  const gameId = getInviteGameIdForLink();
  const url = new URL(window.location.href);
  url.searchParams.set("join", roomCode);
  url.searchParams.set("game", gameId);
  url.searchParams.set("mode", "friend");
  if (gameId === "puzzle") {
    url.searchParams.set("puzzleSize", difficulty);
  } else {
    url.searchParams.delete("puzzleSize");
    url.searchParams.delete("puzzleDifficulty");
  }
  const hashParams = new URLSearchParams();
  hashParams.set("join", roomCode);
  hashParams.set("game", gameId);
  hashParams.set("mode", "friend");
  if (gameId === "puzzle") {
    hashParams.set("puzzleSize", difficulty);
  }
  url.hash = hashParams.toString();
  return url.toString();
}

function updateInvitePanel(roomCode) {
  if (!roomCode) {
    friendInvitePanel?.classList.add("hidden");
    if (friendRoomCodeLabel) {
      friendRoomCodeLabel.textContent = "";
    }
    if (friendInviteLink) {
      friendInviteLink.textContent = "";
      friendInviteLink.removeAttribute("href");
    }
    return;
  }
  const inviteUrl = buildInviteLink(roomCode);
  friendInvitePanel?.classList.remove("hidden");
  if (friendRoomCodeLabel) {
    friendRoomCodeLabel.textContent = roomCode;
  }
  if (friendInviteLink) {
    friendInviteLink.href = inviteUrl;
    friendInviteLink.textContent = inviteUrl;
  }
}

async function copyInviteLinkToClipboard(roomCode) {
  const inviteUrl = buildInviteLink(roomCode);
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      return true;
    } catch {
      // Fall through to manual selection fallback.
    }
  }
  if (friendInviteLink) {
    friendInviteLink.focus?.();
    const selection = window.getSelection?.();
    const range = document.createRange?.();
    if (selection && range) {
      range.selectNodeContents(friendInviteLink);
      selection.removeAllRanges();
      selection.addRange(range);
      try {
        if (document.execCommand("copy")) {
          selection.removeAllRanges();
          return true;
        }
      } catch {
        // Ignore and let the visible link be the fallback.
      }
      selection.removeAllRanges();
    }
  }
  return false;
}

function revealInviteFallback(roomCode, statusMessage) {
  updateInvitePanel(roomCode);
  setFriendStatus(statusMessage);
}

async function shareInviteLink(roomCode, options = {}) {
  const inviteUrl = buildInviteLink(roomCode);
  const gameTitle = getGameConfig(getInviteGameIdForLink()).title;
  const shareText = `Join my Puffly ${gameTitle} room (${roomCode}): ${inviteUrl}`;

  updateInvitePanel(roomCode);
  pendingInviteShareRoomCode = "";
  updateCreateInviteButtonLabel();

  if (navigator.share) {
    const sharePayloads = [
      { url: inviteUrl },
      { title: `Puffly ${gameTitle} Invite`, url: inviteUrl },
      { text: shareText },
      { title: `Puffly ${gameTitle} Invite`, text: shareText, url: inviteUrl },
    ];
    for (const sharePayload of sharePayloads) {
      try {
        if (navigator.canShare && !navigator.canShare(sharePayload)) {
          continue;
        }
        await navigator.share(sharePayload);
        setFriendStatus(`Room ${roomCode} ready. Invite shared.`);
        return true;
      } catch (error) {
        if (error?.name === "AbortError") {
          if (!options.silentCancel) {
            setFriendStatus(`Room ${roomCode} ready. Tap Share Invite to open Messages.`);
          }
          return false;
        }
        if (error?.name === "NotAllowedError") {
          break;
        }
      }
    }
  }

  const copied = await copyInviteLinkToClipboard(roomCode);
  if (!options.silentFallback) {
    setFriendStatus(
      copied
        ? `Room ${roomCode} ready. Link copied — tap Share Invite to open Messages.`
        : `Room ${roomCode} ready. Tap Share Invite or Copy Invite Link below.`,
    );
  }
  return false;
}

function setVoiceStatus(text) {
  if (voiceStatusLabel) {
    voiceStatusLabel.textContent = text;
  }
}

function updateVoiceButtons() {
  if (voiceJoinButton) {
    voiceJoinButton.textContent = voiceJoined ? "Leave Voice" : "Join Voice";
  }
  if (voiceMuteMicButton) {
    voiceMuteMicButton.disabled = !voiceJoined;
    voiceMuteMicButton.textContent = voiceMicMuted ? "Unmute Mic" : "Mute Mic";
  }
  if (voiceSpeakerButton) {
    voiceSpeakerButton.disabled = !voiceJoined;
    voiceSpeakerButton.textContent = voiceSpeakerMuted ? "Speaker Off" : "Speaker On";
  }
  if (voiceRemoteAudioElement) {
    voiceRemoteAudioElement.muted = voiceSpeakerMuted;
  }
}

function updateSpeechUnlockOverlay() {
  if (!speechUnlockOverlay) {
    return;
  }
  const title = speechUnlockOverlay.querySelector("h2");
  const blurb = speechUnlockOverlay.querySelector("p");
  if (playMode === "friend") {
    speechUnlockOverlay.classList.add("hidden");
    return;
  }
  if (title) {
    title.textContent = "Tap Start for Voice";
  }
  if (blurb) {
    blurb.textContent = "Tap Start to turn on voice prompts and hear the flip cue before you play.";
  }
  const shouldShow = playMode === "puffly" && !practiceVoiceStartDismissed;
  speechUnlockOverlay.classList.toggle("hidden", !shouldShow);
}

function setAvatarSpeaking(color, speaking) {
  if (color === "dark") {
    blueAvatar?.classList.toggle("speaking", speaking);
  } else if (color === "light") {
    greenAvatar?.classList.toggle("speaking", speaking);
  }
}

function clearVoiceSpeakingIndicators() {
  blueAvatar?.classList.remove("speaking");
  greenAvatar?.classList.remove("speaking");
}

function ensureVoiceAudioContext() {
  if (!voiceAudioContext && typeof window !== "undefined") {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (Ctor) {
      voiceAudioContext = new Ctor();
    }
  }
  if (voiceAudioContext?.state === "suspended") {
    voiceAudioContext.resume().catch(() => {});
  }
  return voiceAudioContext;
}

function stopVoiceMeters() {
  if (voiceLocalLevelTimer) {
    window.clearInterval(voiceLocalLevelTimer);
    voiceLocalLevelTimer = null;
  }
  if (voiceRemoteLevelTimer) {
    window.clearInterval(voiceRemoteLevelTimer);
    voiceRemoteLevelTimer = null;
  }
  clearVoiceSpeakingIndicators();
}

function startStreamLevelMeter(stream, color, timerSetter) {
  const ctx = ensureVoiceAudioContext();
  if (!ctx || !stream) {
    return;
  }
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 512;
  const source = ctx.createMediaStreamSource(stream);
  source.connect(analyser);
  const data = new Uint8Array(analyser.fftSize);
  const timer = window.setInterval(() => {
    analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i += 1) {
      const v = (data[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / data.length);
    setAvatarSpeaking(color, rms > 0.045);
  }, 120);
  timerSetter(timer);
}

function closeVoiceConnection() {
  if (voiceSignalPollTimer) {
    window.clearInterval(voiceSignalPollTimer);
    voiceSignalPollTimer = null;
  }
  stopVoiceMeters();
  if (voicePeer) {
    voicePeer.close();
    voicePeer = null;
  }
  if (voiceLocalStream) {
    for (const track of voiceLocalStream.getTracks()) {
      track.stop();
    }
    voiceLocalStream = null;
  }
  if (voiceRemoteStream) {
    for (const track of voiceRemoteStream.getTracks()) {
      track.stop();
    }
    voiceRemoteStream = null;
  }
  if (voiceRemoteAudioElement) {
    voiceRemoteAudioElement.pause();
    voiceRemoteAudioElement.srcObject = null;
    voiceRemoteAudioElement.remove();
    voiceRemoteAudioElement = null;
  }
  voiceJoined = false;
  voiceOfferSent = false;
  voiceMicMuted = false;
  voiceSpeakerMuted = false;
  setVoiceStatus("Voice not connected.");
  updateVoiceButtons();
}

function updateChatMuteButton() {
  if (!chatMuteButton) {
    return;
  }
  chatMuteButton.textContent = chatNotificationsMuted ? "Unmute Chat" : "Mute Chat";
}

function setChatUnreadCount(count) {
  chatUnreadCount = Math.max(0, count);
  if (!chatUnreadBadge) {
    return;
  }
  if (chatUnreadCount === 0) {
    chatUnreadBadge.classList.add("hidden");
    chatUnreadBadge.textContent = "0";
    return;
  }
  chatUnreadBadge.classList.remove("hidden");
  chatUnreadBadge.textContent = String(Math.min(chatUnreadCount, 99));
}

function isChatActivelyViewed() {
  if (playMode !== "friend" || !friendChatPanel || friendChatPanel.classList.contains("hidden")) {
    return false;
  }
  if (typeof document !== "undefined" && document.hidden) {
    return false;
  }
  if (!chatMessagesElement) {
    return false;
  }
  return chatMessagesElement.scrollTop + chatMessagesElement.clientHeight >= chatMessagesElement.scrollHeight - 24;
}

function playChatNotificationAudio() {
  if (chatNotificationsMuted) {
    return;
  }
  beep(700, 0.05, "triangle", 0.045);
}

function renderRoomChat(forceScroll = false) {
  if (!chatMessagesElement) {
    return;
  }
  const wasNearBottom =
    chatMessagesElement.scrollTop + chatMessagesElement.clientHeight >= chatMessagesElement.scrollHeight - 24;
  chatMessagesElement.innerHTML = "";
  if (roomChatMessages.length === 0) {
    const empty = document.createElement("p");
    empty.className = "chat-row";
    empty.textContent = "No messages yet.";
    chatMessagesElement.appendChild(empty);
  } else {
    for (const message of roomChatMessages) {
      const row = document.createElement("p");
      row.className = "chat-row";
      const label = document.createElement("span");
      const colorName = playerDisplayName(message.color).toUpperCase();
      label.className = `chat-label ${message.color === "dark" ? "blue" : "green"}`;
      label.textContent = `${colorName}: `;
      row.appendChild(label);
      row.append(document.createTextNode(message.text));
      chatMessagesElement.appendChild(row);
    }
  }
  if (forceScroll || wasNearBottom) {
    chatMessagesElement.scrollTop = chatMessagesElement.scrollHeight;
  }
}

function syncRoomChatFromPayload(data, forceScroll = false) {
  if (!Array.isArray(data?.messages)) {
    return;
  }
  const previousLastId = roomChatMessages.length > 0 ? Number(roomChatMessages[roomChatMessages.length - 1].id || 0) : 0;
  roomChatMessages = data.messages;
  const addedMessages = roomChatMessages.filter((entry) => Number(entry?.id || 0) > previousLastId);
  const incomingFromFriend = addedMessages.filter(
    (entry) => remoteSession && entry?.color && entry.color !== remoteSession.color,
  );
  if (incomingFromFriend.length > 0) {
    playChatNotificationAudio();
    if (!forceScroll && !isChatActivelyViewed()) {
      setChatUnreadCount(chatUnreadCount + incomingFromFriend.length);
    }
  }
  renderRoomChat(forceScroll || addedMessages.length > 0);
  if (forceScroll || isChatActivelyViewed()) {
    setChatUnreadCount(0);
  }
}

function updateRulesForMode() {
  if (!ruleLine1 || !ruleLine2 || !ruleLine3 || !ruleLine4) {
    return;
  }
  const isFour = selectedGameId === "fourinarow";
  const isPuzzle = selectedGameId === "puzzle";
  if (playMode === "friend") {
    ruleLine1.classList.add("hidden");
    const myColor = remoteSession?.color ? playerDisplayName(remoteSession.color).toUpperCase() : "assigned after joining";
    ruleLine2.textContent =
      remoteSession?.color
        ? `You are the ${myColor} team.`
        : `Your team color will be ${myColor}.`;
  } else {
    ruleLine1.classList.remove("hidden");
    if (isPuzzle) {
      ruleLine1.textContent = "Blue Puffly Team and Green Team solve together.";
      ruleLine2.textContent = "Flip to decide who places the first piece.";
    } else if (isFour) {
      ruleLine1.textContent = "Blue Puffly Team drops first and is computer controlled.";
      ruleLine2.textContent = "Green team is your side.";
    } else {
      ruleLine1.textContent = "Blue Puffly Team is computer controlled.";
      ruleLine2.textContent = "Green Frog Team is your side.";
    }
  }
  if (isPuzzle) {
    ruleLine3.textContent = "Drag a tray piece near its matching slot to snap.";
    ruleLine4.textContent = "Outer-edge pieces glow cyan for easier starts.";
  } else if (isFour) {
    ruleLine3.textContent = "Tap one of the highlighted slots to drop your piece.";
    ruleLine4.textContent = "Connect 4 in any direction to win.";
  } else {
    ruleLine3.textContent = "Jumps are required when available.";
    ruleLine4.textContent = "Kinging adds a cap or crown accessory.";
  }
}

function getFriendCreateRoomHint() {
  const gameTitle = getGameConfig(selectedGameId).title;
  if (prefersCompactChrome()) {
    if (selectedGameId === "puzzle") {
      return `Pick size, then Create & Invite (${gameTitle}).`;
    }
    return `Create or join a ${gameTitle} room.`;
  }
  if (selectedGameId === "puzzle") {
    return `Choose Mini, Classic, or Mega, then tap Create & Invite for a ${gameTitle} room.`;
  }
  return `Tap Create & Invite to start a ${gameTitle} friend room.`;
}

function getFriendStatusText(session) {
  if (!session) {
    return getFriendCreateRoomHint();
  }
  const roomGame = normalizeGameId(session.gameType || selectedGameId);
  const gameTitle = getGameConfig(roomGame).title;
  const count = session.playerCount ?? 1;
  if (prefersCompactChrome()) {
    const base = `${count}/2 · ${session.roomCode} · ${gameTitle}`;
    if (!session.ready) {
      return `${base} — waiting`;
    }
    if (isStarterFlipPending()) {
      return roomGame === "puzzle" ? `${base} — flip` : `${base} — flip to start`;
    }
    return `${base} · ${playerDisplayName(session.color)}`;
  }
  const base = `Connected players: ${count}/2 · Room ${session.roomCode} · ${gameTitle}`;
  if (!session.ready) {
    return `${base}. Waiting for opponent...`;
  }
  if (isStarterFlipPending()) {
    const flipMsg =
      roomGame === "puzzle"
        ? puzzleFlipPromptText()
        : `${playerDisplayName(getFriendFlipperColor())} flips to see who goes first.`;
    return `${base}. ${flipMsg}`;
  }
  if (roomGame === "puzzle") {
    if (session.color === "light") {
      return `${base}. You are GREEN 🐸 — pieces from the GREEN tray (right).`;
    }
    return `${base}. You are BLUE 🐻 — pieces from the BLUE tray (left).`;
  }
  return `${base}. You are ${playerDisplayName(session.color).toUpperCase()} Team.`;
}

function updatePuzzleDebugStrip(statusMessage) {
  if (!puzzleDebugStrip) {
    return;
  }
  if (!PUZZLE_DEBUG_ENABLED) {
    puzzleDebugStrip.classList.add("hidden");
    return;
  }
  if (selectedGameId !== "puzzle") {
    puzzleDebugStrip.classList.add("hidden");
    return;
  }
  const stateBlue = getPuzzleRemainingByOwner(state, "dark").length;
  const stateGreen = getPuzzleRemainingByOwner(state, "light").length;
  const domBlue = blueCapturedPile?.querySelectorAll(".puzzle-piece").length || 0;
  const domGreen = greenCapturedPile?.querySelectorAll(".puzzle-piece").length || 0;
  const total = (state?.pieces || []).length;
  const flip = isStarterFlipPending() ? `pending:${getPuzzleFlipTurn()}` : "done";
  puzzleDebugStrip.textContent =
    `DBG puzzle | mode:${playMode} | flip:${flip} | state(B:${stateBlue},G:${stateGreen},total:${total}) | dom(B:${domBlue},G:${domGreen}) | sel:${selectedPuzzlePieceId || "-"} | msg:${statusMessage}`;
  puzzleDebugStrip.classList.remove("hidden");
}

function stopRoomPolling() {
  if (roomPollTimer) {
    window.clearInterval(roomPollTimer);
    roomPollTimer = null;
  }
}

function resetSessionForModeSwitch() {
  clearPuzzleDrag();
  stopRoomPolling();
  if (remoteSession && voiceJoined) {
    apiPost("/api/rooms/voice/leave", {
      roomCode: remoteSession.roomCode,
      playerId: remoteSession.playerId,
    }).catch(() => {});
  }
  closeVoiceConnection();
  remoteSession = null;
  pendingJoinIntroTeam = "";
  pendingInviteShareRoomCode = "";
  if (roomCodeInput) {
    roomCodeInput.value = "";
  }
  updateCreateInviteButtonLabel();
}

/** Keep the multiplayer room alive while the user plays solo practice. */
function pauseFriendRoomForPractice() {
  if (!remoteSession) {
    stopRoomPolling();
    closeVoiceConnection();
    return;
  }
  const pausedSession = {
    roomCode: remoteSession.roomCode,
    playerId: remoteSession.playerId,
    gameType: remoteSession.gameType,
    color: remoteSession.color,
    version: remoteSession.version,
    playerCount: remoteSession.playerCount,
    ready: remoteSession.ready,
    puzzleFlipTurn: remoteSession.puzzleFlipTurn,
  };
  writeStoredFriendSession(pausedSession);
  stopRoomPolling();
  if (voiceJoined) {
    apiPost("/api/rooms/voice/leave", {
      roomCode: pausedSession.roomCode,
      playerId: pausedSession.playerId,
    }).catch(() => {});
  }
  closeVoiceConnection();
  pendingJoinIntroTeam = "";
  pendingInviteShareRoomCode = pausedSession.roomCode;
  if (roomCodeInput) {
    roomCodeInput.value = pausedSession.roomCode;
  }
  remoteSession = null;
  updateCreateInviteButtonLabel();
  updateFriendRoomButtons();
}

async function resumeFriendRoomIfPaused() {
  if (remoteSession) {
    updateInvitePanel(remoteSession.roomCode);
    updateFriendRoomButtons();
    updateFriendLockOverlay();
    setFriendStatus(getFriendStatusText(remoteSession));
    return true;
  }
  if (!readStoredFriendSession()) {
    return false;
  }
  triedStoredFriendReconnect = false;
  setFriendStatus("Reconnecting to your friend room...");
  await tryReconnectStoredFriendSession({ force: true });
  if (remoteSession) {
    updateInvitePanel(remoteSession.roomCode);
    updateFriendRoomButtons();
    updateFriendLockOverlay();
    setFriendStatus(getFriendStatusText(remoteSession));
    render("Reconnected to your friend room.");
    return true;
  }
  return false;
}

function resetFriendLocalState(message = "Tap Create & Invite to start a room.") {
  clearPuzzleDrag();
  stopRoomPolling();
  if (remoteSession && voiceJoined) {
    apiPost("/api/rooms/voice/leave", {
      roomCode: remoteSession.roomCode,
      playerId: remoteSession.playerId,
    }).catch(() => {});
  }
  closeVoiceConnection();
  remoteSession = null;
  clearStoredFriendSession();
  speechGesturePrimed = !speechNeedsInteractionUnlock;
  speechUnlocked = !speechNeedsInteractionUnlock;
  friendVoiceStartDismissed = false;
  friendJoinWelcomeSpoken = false;
  lastMascotVoiceThought = "";
  friendFlipTurnLastPhrase = "";
  friendFlipTurnSpeechLockUntil = 0;
  friendOpponentJoinedSpeechLockUntil = 0;
  friendSwitchVoiceLockUntil = 0;
  friendLobbyPromptSpoken = false;
  friendYourTurnVoiceAnnounced = false;
  pendingJoinIntroTeam = "";
  pendingInviteShareRoomCode = "";
  roomChatMessages = [];
  setChatUnreadCount(0);
  state = createStateForGame(selectedGameId);
  moveHistory = [];
  undoSnapshots = [];
  winnerAnnounced = null;
  hideCelebration();
  if (roomCodeInput) {
    roomCodeInput.value = "";
  }
  setFriendStatus(message);
  updateInvitePanel(null);
  updateFriendRoomButtons();
  updateFriendPuzzleDifficultyPanel();
  updateFriendLockOverlay();
  updateRulesForMode();
  renderRoomChat(true);
  render("Friend mode: connect to a room.");
}

async function apiPost(path, payload, options = {}) {
  const timeoutMs = options.timeoutMs ?? 15000;
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer =
    controller && typeof window !== "undefined"
      ? window.setTimeout(() => controller.abort(), timeoutMs)
      : null;
  let response;
  try {
    response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller?.signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(
        "Friend server timed out. Run: python3 multiplayer_server.py 8002 and check the Cloudflare tunnel.",
      );
    }
    throw error;
  } finally {
    if (timer) {
      window.clearTimeout(timer);
    }
  }
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    if (response.status === 401 || response.status === 403 || response.status === 302) {
      throw new Error("Sign in at dev.playpuffly.org, then reload and try Friend mode again.");
    }
    throw new Error(
      `Friend server unavailable (HTTP ${response.status}). Run: python3 multiplayer_server.py 8002`,
    );
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }
  return data;
}

async function tryReconnectStoredFriendSession(options = {}) {
  const force = Boolean(options.force);
  if (!force) {
    return;
  }
  if (
    playMode !== "friend" ||
    remoteSession ||
    ((!force && triedStoredFriendReconnect) || reconnectingStoredFriendSession)
  ) {
    return;
  }
  const cached = readStoredFriendSession();
  if (!cached) {
    triedStoredFriendReconnect = true;
    return;
  }
  triedStoredFriendReconnect = true;
  reconnectingStoredFriendSession = true;
  if (cached.gameType && isKnownGame(cached.gameType) && selectedGameId !== cached.gameType) {
    selectedGameId = cached.gameType;
    updateGameButtons();
    updateAppTitle();
    updateRulesForMode();
  }
  try {
    const data = await apiPost("/api/rooms/reconnect", {
      roomCode: cached.roomCode,
      playerId: cached.playerId,
    });
    hydrateRoomSession(data);
    setFriendStatus(`Reconnected to room ${data.roomCode}.`);
    render("Room synchronized.");
  } catch {
    clearStoredFriendSession();
    setFriendStatus("Tap Create & Invite to start a room.");
  } finally {
    reconnectingStoredFriendSession = false;
  }
}

async function ensureFriendSessionBeforeMove() {
  if (remoteSession) {
    return true;
  }
  triedStoredFriendReconnect = false;
  await tryReconnectStoredFriendSession({ force: true });
  if (remoteSession) {
    return true;
  }
  const fallbackCode = String(roomCodeInput?.value || AUTO_JOIN_ROOM_CODE || "").trim().toUpperCase();
  if (fallbackCode) {
    await joinRoomWithCode(fallbackCode);
  }
  return Boolean(remoteSession);
}

async function sendVoiceSignal(signalType, payload, targetColor) {
  if (!remoteSession) {
    return;
  }
  await apiPost("/api/rooms/voice/signal", {
    roomCode: remoteSession.roomCode,
    playerId: remoteSession.playerId,
    signalType,
    payload,
    targetColor,
  });
}

async function handleVoiceSignal(signal) {
  if (!voicePeer || !signal) {
    return;
  }
  if (signal.type === "offer") {
    await voicePeer.setRemoteDescription(signal.payload);
    const answer = await voicePeer.createAnswer();
    await voicePeer.setLocalDescription(answer);
    await sendVoiceSignal("answer", voicePeer.localDescription, signal.fromColor);
    setVoiceStatus("Voice connected.");
    return;
  }
  if (signal.type === "answer") {
    await voicePeer.setRemoteDescription(signal.payload);
    setVoiceStatus("Voice connected.");
    return;
  }
  if (signal.type === "ice" && signal.payload) {
    try {
      await voicePeer.addIceCandidate(signal.payload);
    } catch {
      // Ignore transient ICE errors during negotiation.
    }
  }
}

async function pollVoiceSignals() {
  if (!voiceJoined || !remoteSession) {
    return;
  }
  const params = new URLSearchParams({
    roomCode: remoteSession.roomCode,
    playerId: remoteSession.playerId,
  });
  const response = await fetch(`/api/rooms/voice/poll?${params.toString()}`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return;
  }
  if (data.voiceParticipants) {
    const bothReady = data.voiceParticipants.dark && data.voiceParticipants.light;
    if (bothReady && remoteSession.color === "dark" && !voiceOfferSent && voicePeer) {
      const offer = await voicePeer.createOffer();
      await voicePeer.setLocalDescription(offer);
      await sendVoiceSignal("offer", voicePeer.localDescription, "light");
      voiceOfferSent = true;
      setVoiceStatus("Voice connected.");
    } else if (!bothReady) {
      setVoiceStatus("Waiting for friend voice...");
    }
  }
  const signals = Array.isArray(data.signals) ? data.signals : [];
  for (const signal of signals) {
    await handleVoiceSignal(signal);
  }
}

async function startVoiceConnection() {
  if (!remoteSession) {
    setVoiceStatus("Connect to room first.");
    return;
  }
  if (!remoteSession.ready) {
    setVoiceStatus("Waiting for friend to join room.");
    return;
  }
  try {
    voiceLocalStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
      },
      video: false,
    });
  } catch {
    setVoiceStatus("Microphone permission denied.");
    return;
  }
  voicePeer = new RTCPeerConnection({
    iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }],
  });
  voiceRemoteStream = new MediaStream();
  for (const track of voiceLocalStream.getTracks()) {
    voicePeer.addTrack(track, voiceLocalStream);
  }
  voicePeer.ontrack = (event) => {
    const [stream] = event.streams;
    if (!stream) {
      return;
    }
    voiceRemoteStream = stream;
    if (!voiceRemoteAudioElement) {
      voiceRemoteAudioElement = document.createElement("audio");
      voiceRemoteAudioElement.autoplay = true;
      voiceRemoteAudioElement.playsInline = true;
      voiceRemoteAudioElement.style.display = "none";
      document.body.appendChild(voiceRemoteAudioElement);
    }
    voiceRemoteAudioElement.srcObject = stream;
    voiceRemoteAudioElement.muted = voiceSpeakerMuted;
    voiceRemoteAudioElement.play().catch(() => {});
    setVoiceStatus("Voice connected.");
    startStreamLevelMeter(voiceRemoteStream, remoteSession.color === "dark" ? "light" : "dark", (timer) => {
      if (voiceRemoteLevelTimer) {
        window.clearInterval(voiceRemoteLevelTimer);
      }
      voiceRemoteLevelTimer = timer;
    });
  };
  voicePeer.onicecandidate = (event) => {
    if (event.candidate) {
      sendVoiceSignal("ice", event.candidate, remoteSession.color === "dark" ? "light" : "dark").catch(() => {});
    }
  };
  startStreamLevelMeter(voiceLocalStream, remoteSession.color, (timer) => {
    if (voiceLocalLevelTimer) {
      window.clearInterval(voiceLocalLevelTimer);
    }
    voiceLocalLevelTimer = timer;
  });
  await apiPost("/api/rooms/voice/join", {
    roomCode: remoteSession.roomCode,
    playerId: remoteSession.playerId,
  });
  voiceJoined = true;
  voiceOfferSent = false;
  setVoiceStatus("Joining voice...");
  updateVoiceButtons();
  if (voiceSignalPollTimer) {
    window.clearInterval(voiceSignalPollTimer);
  }
  voiceSignalPollTimer = window.setInterval(() => {
    pollVoiceSignals().catch(() => {});
  }, 500);
  await pollVoiceSignals();
}

async function leaveVoiceConnection() {
  if (remoteSession && voiceJoined) {
    await apiPost("/api/rooms/voice/leave", {
      roomCode: remoteSession.roomCode,
      playerId: remoteSession.playerId,
    }).catch(() => {});
  }
  closeVoiceConnection();
}

async function fetchFriendRoomState() {
  if (!remoteSession) {
    return { response: null, data: {} };
  }
  const params = new URLSearchParams({
    roomCode: remoteSession.roomCode,
    _: String(Date.now()),
  });
  const response = await fetch(`/api/rooms/state?${params.toString()}`, { cache: "no-store" });
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

async function syncRoomState(options = {}) {
  if (!remoteSession || applyingRemoteSync) {
    return;
  }
  const force = Boolean(options.force);
  const ourTurn = state?.currentPlayer === remoteSession.color;
  if (
    !force &&
    busy &&
    ourTurn &&
    !(selectedGameId === "puzzle" && isStarterFlipPending())
  ) {
    deferRoomSyncUntilIdle = true;
    return;
  }
  if (selectedGameId === "puzzle" && isStarterFlipPending()) {
    busy = false;
    puzzlePlaceInFlight = false;
  }
  applyingRemoteSync = true;
  try {
  const oldVersion = remoteSession.version;
  const oldReady = remoteSession.ready;
  const oldCount = remoteSession.playerCount;
  const previousState = clone(state);
  const { response, data } = await fetchFriendRoomState();
  if (!response?.ok) {
    throw new Error(data.error || "Unable to read room state.");
  }
  const snapshotVersion = typeof data.version === "number" ? data.version : null;
  const isStaleSnapshot = snapshotVersion !== null && snapshotVersion < oldVersion;
  if (typeof data.playerCount === "number") {
    remoteSession.playerCount = data.playerCount;
    remoteSession.ready = data.playerCount >= 2;
    setFriendStatus(getFriendStatusText(remoteSession));
  }
  if (isStaleSnapshot) {
    syncRoomChatFromPayload(data);
    return;
  }
  if (snapshotVersion !== null) {
    remoteSession.version = snapshotVersion;
  }
  const remoteGameType =
    typeof data.gameType === "string" && isKnownGame(data.gameType)
      ? normalizeGameId(data.gameType)
      : remoteSession.gameType;
  const didRoomGameTypeChange =
    isKnownGame(remoteSession.gameType) && remoteGameType !== normalizeGameId(remoteSession.gameType);
  remoteSession.gameType = remoteGameType;
  const didLocalGameTypeChange = syncLocalGameTypeFromRoom(remoteGameType);
  if (didLocalGameTypeChange) {
    writeStoredFriendSession(remoteSession);
  }
  if (data.voiceParticipants && voiceJoined) {
    const bothVoiceReady = data.voiceParticipants.dark && data.voiceParticipants.light;
    if (!bothVoiceReady) {
      setVoiceStatus("Waiting for friend voice...");
    }
  }
  syncRoomChatFromPayload(data);
  if (selectedGameId === "puzzle") {
    syncPuzzleFlipTurnFromPayload(data);
    if (data.state) {
      syncPuzzleDifficultyFromRemote(data.state, data.puzzleDifficulty);
    }
  }
  const didVersionChange = typeof data.version === "number" && data.version !== oldVersion;
  const didReadyChange =
    remoteSession.ready !== oldReady || remoteSession.playerCount !== oldCount;
  if (data.state) {
    const normalizedRemote = normalizeStateForGame(data.state, selectedGameId);
    const boardChanged = roomStateDiffersFromSync(previousState, normalizedRemote);
    const shouldApplyRemoteState =
      boardChanged ||
      didVersionChange ||
      didReadyChange ||
      didRoomGameTypeChange ||
      didLocalGameTypeChange;
    if (shouldApplyRemoteState) {
      const flipJustCompleted = isStarterFlipTransition(previousState, normalizedRemote);
      const puzzleJustCompleted =
        selectedGameId === "puzzle" && isPuzzleComplete(normalizedRemote) && !isPuzzleComplete(previousState);
      const puzzleJustRestarted =
        selectedGameId === "puzzle" && isPuzzleRestartTransition(previousState, normalizedRemote);
      if (didRoomGameTypeChange || didLocalGameTypeChange) {
        lastTurnSpoken = "";
        lastSpokenPhrase = "";
      }
      if (didReadyChange && remoteSession.ready && !oldReady) {
        if (!friendJoinWelcomeSpoken) {
          announceFriendJoinWelcome(playerDisplayName(remoteSession.color).toUpperCase());
        } else {
          announceFriendOpponentJoined();
        }
      }
      const message = isPuzzleComplete(normalizedRemote)
        ? "Puzzle complete!"
        : didRoomGameTypeChange || didLocalGameTypeChange
          ? `Now playing ${getGameConfig(selectedGameId).title} with your friend.`
          : remoteSession.ready
            ? flipJustCompleted
              ? `${starterLabel(normalizedRemote.starterPlayer || normalizedRemote.currentPlayer)} wins the flip and goes first.`
              : didVersionChange
                ? "Room synchronized."
                : "Opponent connected."
            : "Waiting for opponent...";
      const willAnimateOpponent = shouldAnimateFriendOpponentMove(
        previousState,
        normalizedRemote,
        didVersionChange,
      );
      if (willAnimateOpponent) {
        try {
          await playFriendOpponentMoveAnimation(previousState, normalizedRemote, message);
        } catch (error) {
          console.warn("[FriendSync] Remote animation skipped:", error);
        }
      }
      applyRemoteRoomState(data, { statusMessage: message });
      if (didRoomGameTypeChange || didLocalGameTypeChange) {
        updateStarterFlipButton();
        announceFriendGameSwitchVoice();
        refreshFriendGameUi(message);
      } else {
        if (puzzleJustRestarted) {
          resetPuzzleSessionAfterRestart();
          puzzleTrayBootstrapAttempted = false;
        } else if (selectedGameId === "puzzle") {
          refreshPuzzleCelebrationFlags();
        }
        if (puzzleJustCompleted) {
          maybeShowPuzzleCompletion("Puzzle complete!");
        }
      }
    }
  }
  } finally {
    applyingRemoteSync = false;
  }
}

function startRoomPolling() {
  stopRoomPolling();
  roomPollTimer = window.setInterval(() => {
    if (!remoteSession || applyingRemoteSync || busy) {
      return;
    }
    syncRoomState().catch((error) => {
      console.warn("[FriendSync] Poll failed:", error);
    });
  }, remoteSession ? FRIEND_ROOM_POLL_MS : 900);
}

function syncLocalGameTypeFromRoom(gameType) {
  const normalized = normalizeGameId(gameType);
  if (!isKnownGame(normalized)) {
    return false;
  }
  const changed = selectedGameId !== normalized;
  if (!changed) {
    return false;
  }
  const previousGame = selectedGameId;
  selectedGameId = normalized;
  updateGameButtons();
  updateAppTitle();
  updateRulesForMode();
  updateFriendPuzzleDifficultyPanel();
  if (previousGame === "puzzle" && normalized !== "puzzle") {
    clearPuzzleDrag();
    releasePuzzleInteractionLocks();
    selectedPuzzlePieceId = "";
    puzzleTrayBootstrapAttempted = false;
  }
  winnerAnnounced = null;
  hideCelebration();
  resetFriendSpeechForGameSwitch();
  return true;
}

function refreshFriendGameUi(statusMessage = lastStatusMessage) {
  updateFriendRoomButtons();
  updateFriendLockOverlay();
  updateFriendPuzzleDifficultyPanel();
  updateRulesForMode();
  updateStarterFlipButton();
  render(statusMessage);
}

function hydrateRoomSession(data, options = {}) {
  if (!data?.roomCode) {
    setFriendStatus("Server response missing room code.");
    return false;
  }
  playMode = "friend";
  if (typeof window !== "undefined") {
    window.__pufflyUserChosePufflyMode = false;
    window.__pufflyPendingPlayMode = "friend";
    if (typeof window.pufflyApplyPlayModeChrome === "function") {
      window.pufflyApplyPlayModeChrome("friend");
    }
  }
  syncPlayModeChrome();
  const announceJoinVoice = options.announceJoinVoice !== false;
  const sessionColor = data.color === "dark" || data.color === "light" ? data.color : null;
  if (!sessionColor) {
    console.warn("[puffly] room session missing color", SPEECH_BUILD, data);
  }
  remoteSession = {
    roomCode: data.roomCode,
    gameType: normalizeGameId(data.gameType || selectedGameId),
    playerId: data.playerId,
    color: sessionColor,
    version: typeof data.version === "number" ? data.version : 0,
    playerCount: data.playerCount ?? 1,
    ready: (data.playerCount ?? 1) >= 2,
    puzzleFlipTurn:
      data.puzzleFlipTurn === "light" || data.puzzleFlipTurn === "dark" ? data.puzzleFlipTurn : undefined,
  };
  writeStoredFriendSession(remoteSession);
  syncLocalGameTypeFromRoom(remoteSession.gameType);
  state = normalizeStateForGame(data.state, selectedGameId);
  applyPuzzleFlipTurnFromRemote(state, data);
  syncPuzzleDifficultyFromRemote(state, data.puzzleDifficulty);
  selectedPuzzlePieceId = "";
  moveHistory = [];
  undoSnapshots = [];
  winnerAnnounced = null;
  hideCelebration();
  if (roomCodeInput) {
    roomCodeInput.value = data.roomCode;
  }
  setFriendStatus(getFriendStatusText(remoteSession));
  updateInvitePanel(data.roomCode);
  updateFriendRoomButtons();
  updateFriendLockOverlay();
  updateFriendPuzzleDifficultyPanel();
  updateRulesForMode();
  syncRoomChatFromPayload(data, true);
  setChatUnreadCount(0);
  const teamName = playerDisplayName(data.color).toUpperCase();
  if (announceJoinVoice) {
    friendJoinWelcomeSpoken = false;
    friendYourTurnVoiceAnnounced = false;
    announceFriendJoinWelcome(teamName);
  } else {
    pendingJoinIntroTeam = "";
    lastTurnSpoken = "";
    lastSpokenPhrase = "";
    friendYourTurnVoiceAnnounced = false;
  }
  startRoomPolling();
  if (options.deferRender) {
    return true;
  }
  try {
    render(options.statusMessage || "Remote room connected.");
  } catch (error) {
    console.error("[hydrateRoomSession] render failed", error);
    setFriendStatus(getFriendStatusText(remoteSession));
  }
  return true;
}

function applyCreateRoomResponse(data) {
  const roomCode = String(data?.roomCode || "").trim().toUpperCase();
  if (!roomCode) {
    throw new Error("Server did not return a room code.");
  }
  ensureFriendPlayModeSynced();
  ensureAudioContext();
  primeSpeechEngine();
  pendingInviteShareRoomCode = "";
  const roomLabel =
    selectedGameId === "puzzle"
      ? getDifficultyLabel(difficulty, "puzzle")
      : getGameConfig(selectedGameId).title;
  if (roomCodeInput) {
    roomCodeInput.value = roomCode;
  }
  updateInvitePanel(roomCode);
  updateFriendRoomButtons();
  setFriendStatus(`Room ${roomCode} created (${roomLabel}). Waiting for your friend (1/2).`);
  try {
    hydrateRoomSession(data, { announceJoinVoice: true });
  } catch (error) {
    console.error("[applyCreateRoomResponse] hydrate failed", error);
    remoteSession = {
      roomCode,
      gameType: normalizeGameId(data.gameType || selectedGameId),
      playerId: data.playerId,
      color: data.color,
      version: data.version ?? 0,
      playerCount: data.playerCount ?? 1,
      ready: (data.playerCount ?? 1) >= 2,
    };
    writeStoredFriendSession(remoteSession);
    startRoomPolling();
    try {
      render("Friend room ready.");
    } catch {
      // Status line already shows the room code.
    }
  }
}

async function joinRoomWithCode(roomCode, options = {}) {
  const normalizedCode = String(roomCode || "").trim().toUpperCase();
  const fromInvite = Boolean(options.fromInvite);
  if (!normalizedCode) {
    setFriendStatus("Enter a room code first.");
    return false;
  }
  ensureFriendPlayModeSynced();
  if (remoteSession) {
    setFriendStatus(
      `Already connected to room ${remoteSession.roomCode} as ${playerDisplayName(remoteSession.color).toUpperCase()}. Use the second device to join.`,
    );
    return false;
  }
  if (fromInvite) {
    applyInviteLandingConfig();
    if (!options.skipModeSetup) {
      if (playMode !== "friend") {
        enterFriendLobbyChrome({ joiningCode: normalizedCode });
      }
      clearStoredFriendSession();
    } else {
      clearStoredFriendSession();
    }
  }
  try {
    const joinPayload = { roomCode: normalizedCode };
    if (!fromInvite) {
      joinPayload.gameType = selectedGameId;
    }
    const data = await apiPost("/api/rooms/join", joinPayload);
    hydrateRoomSession(data);
    if (fromInvite) {
      clearInviteParamsFromUrl();
    }
    return true;
  } catch (error) {
    const message = String(error?.message || "");
    if (message.toLowerCase().includes("room already has two players")) {
      // If this device is a previously connected player reopening the invite,
      // fallback to reconnect instead of leaving the board locked.
      triedStoredFriendReconnect = false;
      await tryReconnectStoredFriendSession({ force: true });
      if (remoteSession) {
        if (fromInvite) {
          clearInviteParamsFromUrl();
        }
        return true;
      }
    }
    setFriendStatus(
      fromInvite
        ? message || "Invite link could not join this room."
        : message || "Could not join room.",
    );
    return false;
  }
}

function syncPlayModeChrome() {
  if (typeof window !== "undefined" && typeof window.pufflyApplyPlayModeChrome === "function") {
    window.pufflyApplyPlayModeChrome(playMode);
  }
  document.body.classList.toggle("friend-mode", playMode === "friend");
  updateSpeechUnlockOverlay();
  const pufflyPanel = document.getElementById("puffly-controls");
  const friendPanel = document.getElementById("friend-controls");
  const pufflyBtn = document.getElementById("play-puffly-btn");
  const friendBtn = document.getElementById("play-friend-btn");
  const chatPanel = document.getElementById("friend-chat-panel");
  pufflyPanel?.classList.toggle("hidden", playMode !== "puffly" && playMode !== "friend");
  friendPanel?.classList.toggle("hidden", playMode !== "friend");
  pufflyBtn?.classList.toggle("active", playMode === "puffly");
  friendBtn?.classList.toggle("active", playMode === "friend");
  chatPanel?.classList.toggle("hidden", playMode !== "friend");
}

function setPlayMode(mode, options = {}) {
  playMode = mode;
  if (mode === "puffly" && typeof window !== "undefined") {
    window.__pufflyUserChosePufflyMode = true;
  } else if (mode === "friend" && typeof window !== "undefined") {
    window.__pufflyUserChosePufflyMode = false;
  }
  syncPlayModeChrome();
  if (mode !== "friend") {
    setVoiceStatus("Voice not connected.");
  } else {
    setVoiceStatus("Voice not connected.");
  }
  updateVoiceButtons();
  updateSpeechUnlockOverlay();
  updateFriendPuzzleDifficultyPanel();
  hideRulesPanel();
  if (mode === "puffly") {
    pauseFriendRoomForPractice();
  } else {
    resetSessionForModeSwitch();
  }
  puzzleTrayBootstrapAttempted = false;
  selectedPuzzlePieceId = "";
  winnerAnnounced = null;
  hideCelebration();
  if (mode === "friend") {
    abortPracticeInteractionForModeSwitch();
    practiceVoiceStartDismissed = true;
    initDesktopSpeechDefaults();
    if (!speechNeedsInteractionUnlock) {
      speechUnlocked = true;
      speechGesturePrimed = true;
    } else {
      speechUnlocked = false;
      speechGesturePrimed = false;
    }
    if (!remoteSession) {
      friendVoiceStartDismissed = false;
      friendJoinWelcomeSpoken = false;
    }
    updateSpeechUnlockOverlay();
    state = createStateForGame(selectedGameId);
    lastSpokenPhrase = "";
    lastTurnSpoken = "";
    moveHistory = [];
    undoSnapshots = [];
    roomChatMessages = [];
    setChatUnreadCount(0);
    updateFriendRoomButtons();
    updateFriendPuzzleDifficultyPanel();
    updateFriendLockOverlay();
    updateRulesForMode();
    renderRoomChat(true);
    triedStoredFriendReconnect = false;
    if (!options.skipReconnect) {
      void resumeFriendRoomIfPaused().then((reconnected) => {
        if (!reconnected && !options.keepFriendStatus) {
          setFriendStatus(getFriendCreateRoomHint());
          setPufflyState("idle", "🤝 Tap Create & Invite above to start.");
          updateInvitePanel(null);
          render("Friend mode: connect to a room.");
          if (!remoteSession) {
            announceFriendLobbyPrompt();
          }
        }
      });
    } else if (!options.keepFriendStatus) {
      setFriendStatus(getFriendCreateRoomHint());
      setPufflyState("idle", "🤝 Tap Create & Invite above to start.");
      updateInvitePanel(null);
      render("Friend mode: connect to a room.");
      if (!remoteSession) {
        announceFriendLobbyPrompt();
      }
    }
    return;
  }
  moveHistory = [];
  undoSnapshots = [];
  roomChatMessages = [];
  setChatUnreadCount(0);
  renderRoomChat(true);
  updateRulesForMode();
  beginPracticeFlipRound();
}

function setPufflyLookAtPoint(clientX, clientY) {
  const mascotFace = getActiveMascotFace();
  if (!mascotFace) {
    return;
  }
  const rect = mascotFace.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const dx = clamp((clientX - centerX) / 18, -3.6, 3.6);
  const dy = clamp((clientY - centerY) / 22, -2.6, 2.6);
  mascotFace.style.setProperty("--pupil-x", `${dx.toFixed(2)}px`);
  mascotFace.style.setProperty("--pupil-y", `${dy.toFixed(2)}px`);
}

function setPufflyEyeOffset(offsetX, offsetY = 0) {
  const mascotFace = getActiveMascotFace();
  if (!mascotFace) {
    return;
  }
  mascotFace.style.setProperty("--pupil-x", `${offsetX.toFixed(2)}px`);
  mascotFace.style.setProperty("--pupil-y", `${offsetY.toFixed(2)}px`);
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
  if (!getActiveMascotFace()) {
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

async function flipStarter() {
  forcePuzzleUiRecoverable();
  if (busy) {
    return;
  }
  if (!(playMode === "friend" && remoteSession?.ready)) {
    ensurePuzzleStateReady();
  }
  if (!isStarterFlipPending()) {
    return;
  }
  if (playMode === "friend") {
    if (!remoteSession) {
      render("Connect to a room first.");
      return;
    }
    if (!remoteSession.ready) {
      render("Waiting for opponent to join.");
      return;
    }
    if (remoteSession.color !== getFriendFlipperColor()) {
      render(
        selectedGameId === "puzzle" ? puzzleFlipPromptText() : `${playerDisplayName(getFriendFlipperColor())} flips to start.`,
      );
      return;
    }
  }

  ensureAudioContext();
  busy = true;
  updateStarterFlipButton();
  const winner = Math.random() < 0.5 ? "dark" : "light";
  const statusText = `${starterLabel(winner)} wins the flip and goes first.`;
  render("Flipping to see who goes first...");
  try {
    if (playMode === "friend") {
      await submitFriendStarterFlip(winner);
      starterCoin?.classList.add("flipping");
      await sleep(STARTER_FLIP_ANIMATION_MS);
      starterCoin?.classList.remove("flipping");
      render(statusText);
    } else {
      starterCoin?.classList.add("flipping");
      await sleep(STARTER_FLIP_ANIMATION_MS);
      const nextState = normalizeStateForGame(
        {
          ...state,
          currentPlayer: winner,
          starterFlipDone: true,
          starterPlayer: winner,
          preFlipSetupReady: false,
          selectedSquare: null,
          forcedPiece: null,
          lastMove: null,
        },
        selectedGameId,
      );
      if (selectedGameId === "fourinarow") {
        nextState.winner = null;
        nextState.draw = false;
        nextState.winningLine = [];
      }
      state = nextState;
      render(statusText);
    }
  } catch (error) {
    await syncRoomState({ force: true }).catch(() => {});
    render(error?.message || "Flip sync failed.");
  } finally {
    busy = false;
    starterCoin?.classList.remove("flipping");
    updateStarterFlipButton();
    if (playMode !== "friend" || !isStarterFlipPending()) {
      render(lastStatusMessage, { suppressStatusVoice: true });
    }
  }
  if (playMode === "puffly" && state.currentPlayer === computerPlayer) {
    await runComputerTurn();
  }
}

function createFourPieceElement(player) {
  const pieceEl = document.createElement("button");
  pieceEl.type = "button";
  pieceEl.className = `piece four-piece ${player}`;
  pieceEl.textContent = player === "dark" ? "🐻" : "🐸";
  return pieceEl;
}

function renderFourInARowBoard() {
  const droppableColumns = getDroppableColumns(state.grid);
  const winningCells = new Set((state.winningLine || []).map(({ row, col }) => key(row, col)));

  boardElement.innerHTML = "";
  for (let row = 0; row < FOUR_ROWS; row += 1) {
    for (let col = 0; col < FOUR_COLS; col += 1) {
      const square = document.createElement("div");
      square.className = "square four-slot";
      square.dataset.row = String(row);
      square.dataset.col = String(col);
      if (!state.winner && !state.draw && getLandingRow(state.grid, col) === row) {
        square.classList.add("four-drop-target");
      }
      if (winningCells.has(key(row, col))) {
        square.classList.add("four-winning");
      }

      const cellPlayer = state.grid[row][col];
      if (cellPlayer) {
        const pieceEl = createFourPieceElement(cellPlayer);
        square.appendChild(pieceEl);
      } else if (row === 0 && droppableColumns.includes(col)) {
        const preview = document.createElement("span");
        preview.className = "four-preview";
        square.appendChild(preview);
      }

      boardElement.appendChild(square);
    }
  }
}

function renderPuzzleBoard() {
  const { rows, cols } = getPuzzleGridSizeFromState();
  boardElement.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
  boardElement.style.gridTemplateRows = `repeat(${rows}, minmax(0, 1fr))`;
  const occupied = new Map();
  for (const piece of state.pieces || []) {
    if (piece.placed && piece.placedRow !== null && piece.placedCol !== null) {
      occupied.set(key(piece.placedRow, piece.placedCol), piece);
    }
  }
  boardElement.innerHTML = "";
  boardElement.classList.add("puzzle-board");
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const cell = document.createElement("div");
      cell.className = "square puzzle-cell";
      cell.dataset.row = String(row);
      cell.dataset.col = String(col);
      const piece = occupied.get(key(row, col));
      if (piece) {
        cell.classList.add("locked");
        cell.appendChild(createPuzzlePieceElement(piece));
      }
      boardElement.appendChild(cell);
    }
  }
}

function playSnapSound() {
  // Softer tactile "fit" sound: one body thunk + short wood click.
  beep(170, 0.085, "sine", 0.07);
  window.setTimeout(() => beep(310, 0.03, "triangle", 0.04), 52);
}

function updatePuzzleSelectionUi(statusMessage = lastStatusMessage, options = {}) {
  lastStatusMessage = statusMessage;
  if (!options.skipTrayHighlight && selectedPuzzlePieceId) {
    applyPuzzleTraySelection(selectedPuzzlePieceId);
  }
  if (options.visualOnly) {
    return;
  }
  const refreshMascot = () => {
    if (playMode === "friend" && remoteSession) {
      setPufflyState(
        state.currentPlayer === remoteSession.color ? "idle" : "thinking",
        friendMascotThoughtForTurn(),
      );
    } else if (state.currentPlayer === humanPlayer) {
      if (selectedPuzzlePieceId) {
        setPufflyState("idle", "🧩 Tap the matching slot.", { silentVoice: playMode === "puffly" });
      } else if (playMode === "puffly") {
        setPufflyState("idle", "👀 Your turn!");
      }
    }
  };
  if (options.deferMascot) {
    window.requestAnimationFrame(refreshMascot);
  } else {
    refreshMascot();
  }
}

function renderPuzzleAfterLocalMove(statusMessage = lastStatusMessage) {
  lastStatusMessage = statusMessage;
  renderCapturedPiles();
  renderPuzzleBoard();
  updatePuzzleSelectionUi(statusMessage);
  updateTeamMascot();
  if (maybeShowPuzzleCompletion(statusMessage)) {
    return;
  }
  if (playMode === "friend" && remoteSession) {
    setPufflyState(
      state.currentPlayer === remoteSession.color ? "idle" : "thinking",
      friendMascotThoughtForTurn(),
    );
    announceGameplayTurnVoice(statusMessage);
  }
}

function getPuzzleTrayPileSelector(owner) {
  return owner === "dark" ? "#blue-captured-pile" : "#green-captured-pile";
}

function findPuzzleTrayPieceElement(pieceId, owner) {
  return document.querySelector(`${getPuzzleTrayPileSelector(owner)} .puzzle-piece[data-piece-id="${pieceId}"]`);
}

function commitPuzzlePlacementDom(pieceId, row, col) {
  const piece = getPuzzlePiece(state, pieceId);
  if (!piece) {
    return;
  }
  findPuzzleTrayPieceElement(pieceId, piece.owner)?.remove();
  const cell = boardElement.querySelector(`.puzzle-cell[data-row="${row}"][data-col="${col}"]`);
  if (cell) {
    cell.classList.add("locked");
    cell.replaceChildren(createPuzzlePieceElement(piece));
  }
  clearPuzzleTraySelection();
}

function selectPuzzlePiece(pieceId, options = {}) {
  if (busy || selectedGameId !== "puzzle" || isStarterFlipPending()) {
    if (!options.fromPointerDown) {
      clearPuzzleTraySelection();
    }
    return;
  }
  const piece = getPuzzlePiece(state, pieceId);
  if (!piece || piece.placed) {
    clearPuzzleTraySelection();
    return;
  }
  if (playMode === "friend" && (!remoteSession || state.currentPlayer !== remoteSession.color)) {
    clearPuzzleTraySelection();
    lastStatusMessage = "Waiting for your friend...";
    updatePuzzleSelectionUi(lastStatusMessage, { visualOnly: true, skipTrayHighlight: true });
    return;
  }
  if (piece.owner !== state.currentPlayer) {
    clearPuzzleTraySelection();
    window.setTimeout(() => {
      playInvalidAudio();
      speakPhraseReliable("Not your piece.", { forceRepeat: true });
    }, 0);
    lastStatusMessage = `Select a ${playerDisplayName(state.currentPlayer)} tray piece.`;
    updatePuzzleSelectionUi(lastStatusMessage, { deferMascot: true, skipTrayHighlight: true });
    return;
  }
  applyPuzzleTraySelection(piece.id);
  updatePuzzleSelectionUi("Piece selected. Tap its matching slot.", { deferMascot: true, skipTrayHighlight: true });
}

function puzzleCellCenter(row, col) {
  const boardRect = boardElement.getBoundingClientRect();
  const { cols } = getPuzzleGridSizeFromState();
  const cellSize = boardRect.width / cols;
  return {
    x: boardRect.left + (col + 0.5) * cellSize,
    y: boardRect.top + (row + 0.5) * cellSize,
    cellSize,
  };
}

async function submitPuzzlePlacement(pieceId, row, col, options = {}) {
  const piece = getPuzzlePiece(state, pieceId);
  if (!piece || piece.placed) {
    render("That piece is already placed.");
    return;
  }
  const canAct = playMode !== "friend" || (remoteSession && state.currentPlayer === remoteSession.color);
  if (!canAct) {
    render("Waiting for your friend...");
    return;
  }
  const expectedOwner = state.currentPlayer;
  if (piece.owner !== expectedOwner) {
    playInvalidAudio();
    speakPhraseReliable("Not your piece.", { forceRepeat: true });
    render(`Place a ${playerDisplayName(expectedOwner).toUpperCase()} tray piece.`);
    return;
  }
  if (row !== piece.correctRow || col !== piece.correctCol) {
    playInvalidAudio();
    speakPhraseReliable("Doesn't fit.", { forceRepeat: true });
    render("Doesn't fit there.");
    return;
  }

  if (busy && !options.fromComputer) {
    return;
  }
  if (playMode === "friend") {
    const canPlace = await ensureFriendTurnSyncedBeforeMove();
    if (!canPlace) {
      render("Waiting for your friend...");
      return;
    }
  }
  busy = true;
  if (!options.skipAnimation) {
    await animatePuzzleUserPlacement(pieceId, row, col, options.placeMetrics || null);
  }
  lockBoardGeometry();
  const result = applyPuzzlePlacement(state, pieceId, row, col);
  if (!result.ok) {
    busy = false;
    render(result.message || "That puzzle move is not valid.");
    return;
  }
  const nextState = finalizePuzzleCompletionState(result.nextState);
  recordPuzzlePlacement(piece.owner, piece, row, col);
  playSnapSound();
  if (playMode === "friend") {
    try {
      await submitRemoteMove(nextState, { puzzlePlacement: { pieceId, row, col } });
      state = nextState;
      commitPuzzlePlacementDom(pieceId, row, col);
      const targetCell = boardElement.querySelector(`.puzzle-cell[data-row="${row}"][data-col="${col}"]`);
      await animateDestinationBounce(targetCell);
      renderPuzzleAfterLocalMove(result.message);
    } catch (error) {
      await syncRoomState({ force: true }).catch(() => {});
      render(error?.message || "Move sync failed.");
    } finally {
      busy = false;
      flushDeferredRoomSync();
    }
    return;
  }
  state = nextState;
  commitPuzzlePlacementDom(pieceId, row, col);
  const targetCell = boardElement.querySelector(`.puzzle-cell[data-row="${row}"][data-col="${col}"]`);
  await animateDestinationBounce(targetCell);
  busy = false;
  if (maybeShowPuzzleCompletion(result.message)) {
    return;
  }
  render(result.message);
  if (playMode === "puffly") {
    await runComputerTurn();
  }
}

function clearPuzzleDrag() {
  // Legacy no-op: drag-ghost interaction removed for puzzle stability.
}

async function animatePuzzleAutoPlacement(pieceId, row, col) {
  const piece = getPuzzlePiece(state, pieceId);
  if (!piece) {
    await sleep(Math.max(520, Math.floor(PUFFLY_PUZZLE_PLACE_MS * 0.6)));
    return;
  }
  // Right after flip, iPad/Safari can report stale tray layout for one frame.
  // Wait for paint so the first Puffly move animates reliably too.
  await new Promise((resolve) => window.requestAnimationFrame(resolve));
  await new Promise((resolve) => window.requestAnimationFrame(resolve));
  const center = puzzleCellCenter(row, col);
  const getStartRect = () => (piece.owner === "dark" ? blueCapturedTray?.getBoundingClientRect() : greenCapturedTray?.getBoundingClientRect());
  let startRect = getStartRect();
  if (!startRect || startRect.width < 8 || startRect.height < 8) {
    await sleep(120);
    startRect = getStartRect();
  }
  if (!startRect) {
    await sleep(Math.max(520, Math.floor(PUFFLY_PUZZLE_PLACE_MS * 0.6)));
    return;
  }
  const sourcePiece = document.querySelector(
    `${piece.owner === "dark" ? "#blue-captured-pile" : "#green-captured-pile"} .puzzle-piece[data-piece-id="${pieceId}"]`,
  );
  const ghost = sourcePiece instanceof HTMLElement ? sourcePiece.cloneNode(true) : createPuzzlePieceElement(piece);
  ghost.classList.add("drag-ghost");
  ghost.classList.add("puffly-auto");
  const ghostSize = Math.max(64, Math.min(startRect.width, startRect.height || startRect.width));
  ghost.style.width = `${ghostSize}px`;
  ghost.style.height = `${ghostSize}px`;
  const startLeft = startRect.left + startRect.width / 2 - ghostSize / 2;
  const startTop = startRect.top + startRect.height / 2 - ghostSize / 2;
  ghost.style.left = `${startLeft}px`;
  ghost.style.top = `${startTop}px`;
  ghost.style.transition = `transform ${PUFFLY_PUZZLE_PLACE_MS}ms ease-in-out`;
  document.body.appendChild(ghost);
  if (sourcePiece instanceof HTMLElement) {
    sourcePiece.style.opacity = "0.25";
  }
  await new Promise((resolve) => window.requestAnimationFrame(resolve));
  const dx = center.x - startLeft - ghostSize / 2;
  const dy = center.y - startTop - ghostSize / 2;
  ghost.style.transform = `translate(${dx}px, ${dy}px)`;
  await sleep(PUFFLY_PUZZLE_PLACE_MS);
  if (sourcePiece instanceof HTMLElement) {
    sourcePiece.style.opacity = "";
  }
  ghost.remove();
}

function getPuzzleUserPlaceDurationMs() {
  return speechNeedsInteractionUnlock ? 920 : Math.max(460, Math.floor(PUFFLY_PUZZLE_PLACE_MS * 0.65));
}

async function runPuzzleFlyAnimation(flyEl, fromRect, toCenter, durationMs) {
  const width = Math.max(56, fromRect.width);
  const height = Math.max(56, fromRect.height || fromRect.width);
  const startLeft = fromRect.left + fromRect.width / 2 - width / 2;
  const startTop = fromRect.top + fromRect.height / 2 - height / 2;
  const endLeft = toCenter.x - width / 2;
  const endTop = toCenter.y - height / 2;
  const deltaX = endLeft - startLeft;
  const deltaY = endTop - startTop;

  flyEl.classList.add("puzzle-fly-piece");
  flyEl.classList.remove("selected");
  flyEl.style.width = `${width}px`;
  flyEl.style.height = `${height}px`;
  flyEl.style.left = `${startLeft}px`;
  flyEl.style.top = `${startTop}px`;
  flyEl.style.right = "auto";
  flyEl.style.bottom = "auto";
  flyEl.style.margin = "0";
  flyEl.style.transform = "translate3d(0, 0, 0)";
  flyEl.style.transition = "none";
  if (flyEl.parentElement !== document.body) {
    document.body.appendChild(flyEl);
  }

  await new Promise((resolve) => window.requestAnimationFrame(resolve));

  const timing = {
    duration: durationMs,
    easing: "cubic-bezier(0.2, 0.9, 0.25, 1)",
    fill: "forwards",
  };

  try {
    const animation = flyEl.animate(
      [
        { transform: "translate3d(0px, 0px, 0)", left: `${startLeft}px`, top: `${startTop}px` },
        { transform: `translate3d(${deltaX}px, ${deltaY}px, 0)`, left: `${startLeft}px`, top: `${startTop}px` },
      ],
      timing,
    );
    await animation.finished;
  } catch {
    flyEl.style.transition = `transform ${durationMs}ms ease-out`;
    flyEl.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0)`;
    await sleep(durationMs + 60);
  }

  if (flyEl.parentElement === document.body) {
    flyEl.remove();
  }
}

function capturePuzzlePlaceMetrics(cell, pieceId = selectedPuzzlePieceId) {
  if (!cell || !pieceId) {
    return null;
  }
  const row = Number(cell.dataset.row);
  const col = Number(cell.dataset.col);
  if (!Number.isFinite(row) || !Number.isFinite(col)) {
    return null;
  }
  const sourcePiece = puzzleTrayPieceById.get(pieceId) || findPuzzleTrayPieceElement(pieceId, getPuzzlePiece(state, pieceId)?.owner);
  if (!(sourcePiece instanceof HTMLElement)) {
    return null;
  }
  const sourceRect = sourcePiece.getBoundingClientRect();
  if (sourceRect.width < 4 || sourceRect.height < 4) {
    return null;
  }
  const boardRect = boardElement.getBoundingClientRect();
  const cols = Number(state?.cols) || getPuzzleGridSizeFromState().cols;
  const cellSize = boardRect.width / cols;
  return {
    row,
    col,
    sourcePiece,
    sourceRect,
    center: {
      x: boardRect.left + (col + 0.5) * cellSize,
      y: boardRect.top + (row + 0.5) * cellSize,
      cellSize,
    },
  };
}

async function animatePuzzleUserPlacement(pieceId, row, col, placeMetrics = null) {
  const piece = getPuzzlePiece(state, pieceId);
  if (!piece) {
    return false;
  }

  const sourcePiece =
    placeMetrics?.sourcePiece || puzzleTrayPieceById.get(pieceId) || findPuzzleTrayPieceElement(pieceId, piece.owner);
  if (!(sourcePiece instanceof HTMLElement)) {
    return false;
  }

  let sourceRect = placeMetrics?.sourceRect;
  let center = placeMetrics?.center;
  if (!sourceRect || !center) {
    lockBoardGeometry();
    sourceRect = sourcePiece.getBoundingClientRect();
    center = puzzleCellCenter(row, col);
  }
  if (sourceRect.width < 4 || sourceRect.height < 4) {
    return false;
  }

  const durationMs = getPuzzleUserPlaceDurationMs();
  const trayParent = sourcePiece.parentElement;
  const placeholder = document.createElement("span");
  placeholder.className = "puzzle-fly-placeholder";
  placeholder.style.width = `${sourceRect.width}px`;
  placeholder.style.height = `${sourceRect.height}px`;
  if (trayParent) {
    trayParent.insertBefore(placeholder, sourcePiece);
  }

  const flyPiece =
    sourcePiece instanceof HTMLElement ? sourcePiece.cloneNode(true) : createPuzzlePieceElement(piece);
  sourcePiece.style.opacity = "0.15";
  try {
    await runPuzzleFlyAnimation(flyPiece, sourceRect, center, durationMs);
    return true;
  } catch (error) {
    console.warn("[PuzzleFly] animation failed:", error);
    return false;
  } finally {
    sourcePiece.style.opacity = "";
    placeholder.remove();
  }
}

function beginPuzzleDrag(pieceId, source, event) {
  void source;
  void event;
  selectPuzzlePiece(pieceId);
}

function render(statusMessage = "Make your move.", options = {}) {
  try {
    updateFriendLockOverlay();
    renderUi(statusMessage, options);
  } catch (error) {
    console.error("[render] recover after error", error);
    state = createStateForGame(selectedGameId);
    releasePuzzleInteractionLocks();
    busy = false;
    try {
      renderUi(statusMessage, options);
    } catch (retryError) {
      console.error("[render] fatal", retryError);
      if (pufflyThought) {
        pufflyThought.textContent = "⚠️ Reload the page to continue.";
      }
    }
  }
}

function renderUi(statusMessage = "Make your move.", options = {}) {
  const suppressStatusVoice = Boolean(options.suppressStatusVoice);
  if (
    playMode === "puffly" &&
    !suppressStatusVoice &&
    statusMessage.includes("wins the flip and goes first")
  ) {
    primePracticePostFlipVoiceLock(state?.starterPlayer || state?.currentPlayer);
  }
  updateTeamMascot();
  lastStatusMessage = statusMessage;
  updatePuzzleDebugStrip(statusMessage);
  const isPuzzleGame = selectedGameId === "puzzle";
  undoButton?.classList.toggle("hidden", isPuzzleGame);
  controlsPanel?.classList.toggle("puzzle-no-undo", isPuzzleGame);
  document.body.classList.toggle("puzzle-game", selectedGameId === "puzzle");
  ensureRenderableGameState();
  if (!boardElement) {
    return;
  }
  lockBoardGeometry();
  boardElement.classList.toggle("fourinarow", selectedGameId === "fourinarow");
  boardElement.classList.toggle("puzzle-board", selectedGameId === "puzzle");
  boardElement.setAttribute(
    "aria-label",
    selectedGameId === "fourinarow" ? "Four-in-a-Row board" : selectedGameId === "puzzle" ? "Puzzle board" : "Checkers board",
  );
  if (selectedGameId === "puzzle") {
    releasePuzzleInteractionLocks();
    const isPreFlip = isStarterFlipPending();
    if (isPreFlip) {
      hideCelebration();
      winnerAnnounced = null;
    }
    recoverBrokenPuzzleStateIfNeeded();
    refreshPuzzleCelebrationFlags();
    if (!isPreFlip) {
      puzzlePreFlipGeometryRefreshScheduled = false;
    }
    if (isPreFlip) {
      const darkRemaining = getPuzzleRemainingByOwner(state, "dark").length;
      const lightRemaining = getPuzzleRemainingByOwner(state, "light").length;
      const { rows } = getPuzzleGridSizeFromState();
      const pieceCount = getPuzzlePieceCountForGrid(rows);
      const expectedDark = Math.floor(pieceCount / 2);
      const expectedLight = pieceCount - expectedDark;
      if (
        (darkRemaining !== expectedDark || lightRemaining !== expectedLight) &&
        !(playMode === "friend" && remoteSession)
      ) {
        rebuildPuzzleStateKeepingFlipTurn();
      }
    }
    renderPuzzleBoard();
    schedulePuzzlePreFlipGeometryRefresh();
    renderCapturedPiles();
    updatePuzzleSelectionUi(statusMessage);
    updatePuzzleDebugStrip(statusMessage);
    if (isPreFlip) {
      let domBlueCount = blueCapturedPile?.querySelectorAll(".puzzle-piece").length || 0;
      let domGreenCount = greenCapturedPile?.querySelectorAll(".puzzle-piece").length || 0;
      const stateBlueRemaining = getPuzzleRemainingByOwner(state, "dark").length;
      const stateGreenRemaining = getPuzzleRemainingByOwner(state, "light").length;
      if (
        (domBlueCount !== stateBlueRemaining || domGreenCount !== stateGreenRemaining) &&
        !puzzleTrayBootstrapAttempted &&
        !(playMode === "friend" && remoteSession)
      ) {
        puzzleTrayBootstrapAttempted = true;
        rebuildPuzzleStateKeepingFlipTurn();
        renderPuzzleBoard();
        renderCapturedPiles();
        updatePuzzleDebugStrip(statusMessage);
        domBlueCount = blueCapturedPile?.querySelectorAll(".puzzle-piece").length || 0;
        domGreenCount = greenCapturedPile?.querySelectorAll(".puzzle-piece").length || 0;
        console.warn(
          "[PuzzleBootstrap] pre-flip tray mismatch; forced hard bootstrap",
          { domBlueCount, domGreenCount, stateBlueRemaining, stateGreenRemaining, playMode },
        );
      }
    } else {
      puzzleTrayBootstrapAttempted = false;
    }
    const totalRemaining = (state.pieces || []).filter((piece) => !piece.placed).length;
    if (totalRemaining === 0 && !isPuzzleComplete()) {
      recoverBrokenPuzzleStateIfNeeded();
    }
    if (totalRemaining > 0) {
      puzzleTrayBootstrapAttempted = false;
    }
    undoButton.disabled = busy || undoSnapshots.length === 0;
    rulesButton.disabled = busy;
    updateDifficultyButtons();
    updateFriendDifficultyButtons();
    updateFriendPuzzleDifficultyPanel();
    updateAudioToggle();
    updateStarterFlipButton();
    friendLockOverlay?.classList.add("hidden");
    if (maybeShowPuzzleCompletion("Puzzle complete!")) {
      return;
    }
    if (isStarterFlipPending()) {
      if (playMode === "friend" && remoteSession) {
        setPufflyState("thinking", friendMascotThoughtForTurn());
      } else {
        setPufflyState("thinking", "🪙 Flip to choose who starts.");
        announcePracticeFlipVoice();
      }
      return;
    }
    if (playMode === "friend" && remoteSession) {
      setPufflyState(
        state.currentPlayer === remoteSession.color ? "idle" : "thinking",
        friendMascotThoughtForTurn(),
      );
    } else if (playMode === "puffly" && state.currentPlayer === computerPlayer) {
      setPufflyState("thinking", "💭 My move...");
    } else if (playMode === "puffly" && state.currentPlayer === humanPlayer) {
      setPufflyState("idle", "👀 Your turn!");
    } else {
      setPufflyState("idle", "🧩 Place a matching piece.");
    }
    setPufflyLookToBoard();
    announceGameplayTurnVoice(statusMessage);
    if (!suppressStatusVoice) {
      speakFromStatus(statusMessage);
    }
    return;
  }
  if (selectedGameId === "fourinarow") {
    renderFourInARowBoard();
    renderHistory();
    renderCapturedPiles();
    undoButton.disabled = busy || undoSnapshots.length === 0;
    rulesButton.disabled = busy;
    updateDifficultyButtons();
    updateAudioToggle();
    updateStarterFlipButton();
    friendLockOverlay?.classList.add("hidden");
    if (state.winner) {
      const isHumanWin = state.winner === humanPlayer;
      if (isHumanWin) {
        setPufflyState("idle", "😮 You got me!");
      } else {
        setPufflyState("celebrate", "🎉 I win!");
      }
      lastTurnSpoken = "";
      showCelebration();
      return;
    }
    if (state.draw) {
      hideCelebration();
      setPufflyState("idle", "🤝 Draw game.");
      if (lastTurnSpoken !== "Draw game.") {
        lastTurnSpoken = "Draw game.";
        speakPhrase("Draw game.");
      }
      return;
    }
    if (isStarterFlipPending()) {
      hideCelebration();
      lastTurnSpoken = "";
      if (playMode === "friend" && remoteSession) {
        setPufflyState("thinking", friendMascotThoughtForTurn());
      } else {
        setPufflyState("thinking", "🪙 Flip to choose who starts.");
        announcePracticeFlipVoice();
      }
      setPufflyLookToBoard();
      return;
    }
    hideCelebration();
    announceGameplayTurnVoice(statusMessage);
    if (playMode === "friend") {
      if (!remoteSession) {
        setPufflyState("idle", "🤝 Friend mode");
      } else if (!remoteSession.ready) {
        setPufflyState("thinking", friendMascotThoughtForTurn());
      } else {
        setPufflyState(
          state.currentPlayer === remoteSession.color ? "idle" : "thinking",
          friendMascotThoughtForTurn(),
        );
      }
    } else if (state.currentPlayer === computerPlayer) {
      setPufflyState("thinking", "💭 My move...");
    } else {
      setPufflyState("idle", "👀 Your turn!");
    }
    setPufflyLookToBoard();
    if (!suppressStatusVoice) {
      speakFromStatus(statusMessage);
    }
    return;
  }
  if (isStarterFlipPending()) {
    hideCelebration();
    lastTurnSpoken = "";
    if (playMode === "friend" && remoteSession) {
      setPufflyState("thinking", friendMascotThoughtForTurn());
    } else {
      setPufflyState("thinking", "🪙 Flip to choose who starts.");
    }
    updateStarterFlipButton();
    friendLockOverlay?.classList.add("hidden");
    boardElement.innerHTML = "";
    for (let row = 0; row < BOARD_SIZE; row += 1) {
      for (let col = 0; col < BOARD_SIZE; col += 1) {
        const square = document.createElement("div");
        square.className = `square ${isDarkSquare(row, col) ? "dark" : "light"}`;
        square.dataset.row = String(row);
        square.dataset.col = String(col);
        const piece = state.board[row][col];
        if (piece) {
          const pieceEl = document.createElement("button");
          pieceEl.type = "button";
          pieceEl.className = `piece ${piece.player}`;
          pieceEl.dataset.row = String(row);
          pieceEl.dataset.col = String(col);
          pieceEl.textContent = piece.player === "dark" ? (piece.king ? "🧢" : "🐻") : piece.king ? "👑" : "🐸";
          square.appendChild(pieceEl);
        }
        boardElement.appendChild(square);
      }
    }
    renderHistory();
    renderCapturedPiles();
    undoButton.disabled = busy || undoSnapshots.length === 0;
    rulesButton.disabled = busy;
    updateDifficultyButtons();
    updateFriendDifficultyButtons();
    updateFriendPuzzleDifficultyPanel();
    updateFriendRoomButtons();
    updateAudioToggle();
    setPufflyLookToBoard();
    if (playMode !== "friend") {
      announcePracticeFlipVoice();
    }
    return;
  }
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
  renderCapturedPiles();
  undoButton.disabled = busy || undoSnapshots.length === 0;
  rulesButton.disabled = busy;
  updateDifficultyButtons();
  updateFriendDifficultyButtons();
  updateFriendPuzzleDifficultyPanel();
  updateFriendRoomButtons();
  updateAudioToggle();
  updateStarterFlipButton();
  friendLockOverlay?.classList.add("hidden");

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
  announceGameplayTurnVoice(statusMessage);
  if (playMode === "friend") {
    if (!remoteSession) {
      setPufflyState("idle", "🤝 Friend mode");
    } else if (!remoteSession.ready) {
      setPufflyState("thinking", friendMascotThoughtForTurn());
    } else {
      setPufflyState(
        state.currentPlayer === remoteSession.color ? "idle" : "thinking",
        friendMascotThoughtForTurn(),
      );
    }
  } else if (state.currentPlayer === computerPlayer) {
    setPufflyState("thinking", "💭 My move...");
  } else {
    setPufflyState("idle", "👀 Your turn!");
  }
  setPufflyLookToBoard();
  if (!suppressStatusVoice) {
    speakFromStatus(statusMessage);
  }
  updatePuzzleDebugStrip(statusMessage);
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
  if (playMode === "puffly") {
    await animatePufflyEyeCue(getMoveDirection(move));
  }
  const fromSquare = findSquareElement(move.from.row, move.from.col);
  const toSquare = findSquareElement(move.to.row, move.to.col);
  const captureSquare = move.capture ? findSquareElement(move.capture.row, move.capture.col) : null;
  if (!fromSquare || !toSquare) {
    return;
  }
  const fromPiece = fromSquare.querySelector(".piece");
  if (!fromPiece) {
    fromSquare.classList.add("human-move-from");
    toSquare.classList.add("human-move-to");
    captureSquare?.classList.add("human-move-capture");
    await sleep(HUMAN_MOVE_ANIMATION_MS);
    await animateDestinationBounce(toSquare);
    fromSquare.classList.remove("human-move-from");
    toSquare.classList.remove("human-move-to");
    captureSquare?.classList.remove("human-move-capture");
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

async function animateComputerMove(move, durationMs = AI_MOVE_ANIMATION_MS) {
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
    await sleep(durationMs);
    await animateDestinationBounce(toSquare);
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
  await sleep(durationMs);
  await animateDestinationBounce(toSquare);

  fromPiece.classList.remove("ai-piece-hidden");
  ghost.remove();
  fromSquare?.classList.remove("ai-move-from");
  toSquare?.classList.remove("ai-move-to");
  captureSquare?.classList.remove("ai-move-capture");
}

async function animateFourDrop(player, row, col, durationMs = HUMAN_MOVE_ANIMATION_MS) {
  const toSquare = findSquareElement(row, col);
  const fromSquare = findSquareElement(0, col);
  if (!toSquare || !fromSquare) {
    return;
  }
  const fromRect = fromSquare.getBoundingClientRect();
  const toRect = toSquare.getBoundingClientRect();
  const size = Math.min(fromRect.width, fromRect.height) * 0.82;

  const ghost = document.createElement("span");
  ghost.className = `ai-piece-ghost piece four-piece ${player}`;
  ghost.style.width = `${size}px`;
  ghost.style.height = `${size}px`;
  ghost.style.left = `${fromRect.left + fromRect.width / 2}px`;
  ghost.style.top = `${fromRect.top + fromRect.height / 2}px`;
  ghost.style.transitionDuration = `${durationMs}ms`;
  document.body.appendChild(ghost);

  await new Promise((resolve) => window.requestAnimationFrame(resolve));
  ghost.style.transform = `translate(${toRect.left - fromRect.left}px, ${toRect.top - fromRect.top}px)`;
  await sleep(durationMs);
  ghost.remove();
  await animateDestinationBounce(toSquare);
}

async function animateUndoFourLift(player, row, col, durationMs = HUMAN_MOVE_ANIMATION_MS) {
  const fromSquare = findSquareElement(row, col);
  const toSquare = findSquareElement(0, col);
  if (!fromSquare || !toSquare) {
    return;
  }
  const fromRect = fromSquare.getBoundingClientRect();
  const toRect = toSquare.getBoundingClientRect();
  const size = Math.min(fromRect.width, fromRect.height) * 0.82;

  const ghost = document.createElement("span");
  ghost.className = `ai-piece-ghost piece four-piece ${player}`;
  ghost.style.width = `${size}px`;
  ghost.style.height = `${size}px`;
  ghost.style.left = `${fromRect.left + fromRect.width / 2}px`;
  ghost.style.top = `${fromRect.top + fromRect.height / 2}px`;
  ghost.style.transitionDuration = `${durationMs}ms`;
  document.body.appendChild(ghost);

  await new Promise((resolve) => window.requestAnimationFrame(resolve));
  ghost.style.transform = `translate(${toRect.left - fromRect.left}px, ${toRect.top - fromRect.top}px)`;
  await sleep(durationMs);
  ghost.remove();
}

async function animateUndoPuzzlePlacement(placement, durationMs) {
  if (!placement || placement.row === null || placement.col === null) {
    return;
  }
  const sourcePiece = document.querySelector(
    `.puzzle-cell[data-row="${placement.row}"][data-col="${placement.col}"] .puzzle-piece[data-piece-id="${placement.pieceId}"]`,
  );
  const sourceCell = findSquareElement(placement.row, placement.col);
  const sourceRect = sourcePiece instanceof HTMLElement
    ? sourcePiece.getBoundingClientRect()
    : sourceCell?.getBoundingClientRect();
  const targetRect = placement.owner === "dark" ? blueCapturedTray?.getBoundingClientRect() : greenCapturedTray?.getBoundingClientRect();
  if (!sourceRect || !targetRect) {
    return;
  }
  const pieceState = getPuzzlePiece(state, placement.pieceId);
  const ghost =
    sourcePiece instanceof HTMLElement
      ? sourcePiece.cloneNode(true)
      : pieceState
        ? createPuzzlePieceElement(pieceState)
        : document.createElement("span");
  ghost.classList.add("drag-ghost");
  const ghostSize = Math.max(64, Math.min(sourceRect.width, sourceRect.height || sourceRect.width));
  const startLeft = sourceRect.left + sourceRect.width / 2 - ghostSize / 2;
  const startTop = sourceRect.top + sourceRect.height / 2 - ghostSize / 2;
  ghost.style.width = `${ghostSize}px`;
  ghost.style.height = `${ghostSize}px`;
  ghost.style.left = `${startLeft}px`;
  ghost.style.top = `${startTop}px`;
  const moveDuration = Math.max(460, Math.floor(durationMs || PUFFLY_PUZZLE_PLACE_MS * 0.65));
  ghost.style.transition = `transform ${moveDuration}ms ease-in-out`;
  document.body.appendChild(ghost);
  if (sourcePiece instanceof HTMLElement) {
    sourcePiece.style.opacity = "0.2";
  }
  await new Promise((resolve) => window.requestAnimationFrame(resolve));
  const endLeft = targetRect.left + targetRect.width / 2 - ghostSize / 2;
  const endTop = targetRect.top + targetRect.height / 2 - ghostSize / 2;
  ghost.style.transform = `translate(${endLeft - startLeft}px, ${endTop - startTop}px)`;
  await sleep(moveDuration);
  if (sourcePiece instanceof HTMLElement) {
    sourcePiece.style.opacity = "";
  }
  ghost.remove();
}

async function animateUndoTransition(currentState, targetState) {
  if (!currentState || !targetState) {
    return;
  }
  if (selectedGameId === "puzzle") {
    const undoPlacement = inferUndoPuzzlePlacement(currentState, targetState);
    if (undoPlacement) {
      const undoDuration =
        playMode === "puffly" && undoPlacement.owner === computerPlayer
          ? PUFFLY_PUZZLE_PLACE_MS
          : Math.max(460, Math.floor(PUFFLY_PUZZLE_PLACE_MS * 0.65));
      await animateUndoPuzzlePlacement(undoPlacement, undoDuration);
    }
    return;
  }
  if (selectedGameId === "fourinarow") {
    const undoDrops = inferUndoFourSequence(currentState, targetState);
    for (const undoDrop of undoDrops) {
      const undoDuration =
        playMode === "puffly" && undoDrop.player === computerPlayer ? AI_MOVE_ANIMATION_MS : HUMAN_MOVE_ANIMATION_MS;
      await animateUndoFourLift(undoDrop.player, undoDrop.row, undoDrop.col, undoDuration);
      if (undoDrop.restoreState) {
        state = normalizeStateForGame(undoDrop.restoreState, selectedGameId);
        selectedPuzzlePieceId = "";
        render("Undoing move...");
      }
    }
    return;
  }
  const undoMoves = inferUndoCheckersSequence(currentState, targetState);
  for (const undoMove of undoMoves) {
    if (undoMove.mover === humanPlayer) {
      await animateHumanMove(undoMove);
    } else {
      await animateComputerMove(undoMove, AI_MOVE_ANIMATION_MS);
    }
    if (undoMove.restoreState) {
      state = normalizeStateForGame(undoMove.restoreState, selectedGameId);
      selectedPuzzlePieceId = "";
      render("Undoing move...");
    }
  }
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

function recordFourDrop(player, col) {
  const mover = playMode === "friend" ? playerDisplayName(player) : player === humanPlayer ? "You" : "Puffly";
  moveHistory.push(`${mover.toUpperCase()}: drop in column ${col + 1}`);
}

function fourInARowStatus(result) {
  if (result.nextState.winner) {
    return `${playerDisplayName(result.nextState.winner).toUpperCase()} connected four!`;
  }
  if (result.nextState.draw) {
    return "Board is full. Draw.";
  }
  return `${playerDisplayName(result.nextState.currentPlayer).toUpperCase()}'S turn.`;
}

async function submitFriendStarterFlip(winner) {
  if (!remoteSession) {
    throw new Error("Not connected to a room.");
  }
  const data = await apiPost("/api/rooms/flip", {
    roomCode: remoteSession.roomCode,
    playerId: remoteSession.playerId,
    winner,
  });
  remoteSession.version = data.version;
  if (typeof data.playerCount === "number") {
    remoteSession.playerCount = data.playerCount;
    remoteSession.ready = data.playerCount >= 2;
    setFriendStatus(getFriendStatusText(remoteSession));
  }
  syncRoomChatFromPayload(data);
  const flipLabel = starterLabel(winner);
  applyRemoteRoomState(data, { statusMessage: `${flipLabel} wins the flip and goes first.` });
}

async function fetchRemoteRoomSnapshot() {
  if (!remoteSession) {
    return null;
  }
  const { response, data } = await fetchFriendRoomState();
  if (!response?.ok) {
    throw new Error(data.error || "Unable to read room state.");
  }
  if (typeof data.version === "number") {
    remoteSession.version = data.version;
  }
  if (typeof data.playerCount === "number") {
    remoteSession.playerCount = data.playerCount;
    remoteSession.ready = data.playerCount >= 2;
  }
  if (typeof data.gameType === "string" && isKnownGame(data.gameType)) {
    remoteSession.gameType = normalizeGameId(data.gameType);
  }
  return data;
}

async function ensureFriendTurnSyncedBeforeMove() {
  if (!remoteSession || playMode !== "friend") {
    return false;
  }
  await syncRoomState({ force: true });
  return state.currentPlayer === remoteSession.color && !isStarterFlipPending();
}

async function submitRemoteMove(nextState, options = {}) {
  if (!remoteSession) {
    throw new Error("Not connected to a room.");
  }
  if (typeof remoteSession.version !== "number") {
    await syncRoomState({ force: true });
  }
  if (typeof remoteSession.version !== "number") {
    remoteSession.version = 0;
  }
  // Local commit* flows apply the move first, so state.currentPlayer is already the opponent.
  // The server validates turn against the room snapshot before applying nextState.
  const payload = {
    roomCode: remoteSession.roomCode,
    playerId: remoteSession.playerId,
    expectedVersion: remoteSession.version,
    nextState: clone(nextState),
  };
  try {
    const data = await apiPost("/api/rooms/move", payload);
    remoteSession.version = data.version;
    if (typeof data.playerCount === "number") {
      remoteSession.playerCount = data.playerCount;
      remoteSession.ready = data.playerCount >= 2;
      setFriendStatus(getFriendStatusText(remoteSession));
    }
    syncRoomChatFromPayload(data);
    applyRemoteRoomState(data);
    return data;
  } catch (error) {
    const message = error?.message || "";
    if (!options.retried && /version|resync|not your turn/i.test(message)) {
      await syncRoomState({ force: true });
      if (state.currentPlayer !== remoteSession.color) {
        throw new Error("It's not your turn yet.");
      }
      if (typeof options.fourCol === "number") {
        const retryDrop = applyFourInARowDrop(state, options.fourCol);
        if (!retryDrop.ok) {
          throw error;
        }
        return submitRemoteMove(retryDrop.nextState, { retried: true, fourCol: options.fourCol });
      }
      if (options.move) {
        const retryResult = applyMove(state, options.move);
        if (retryResult.nextState === state) {
          throw error;
        }
        return submitRemoteMove(retryResult.nextState, { retried: true, move: options.move });
      }
      if (options.puzzlePlacement) {
        const { pieceId, row, col } = options.puzzlePlacement;
        const retryResult = applyPuzzlePlacement(state, pieceId, row, col);
        if (!retryResult.ok) {
          throw error;
        }
        const retryState = finalizePuzzleCompletionState(retryResult.nextState);
        return submitRemoteMove(retryState, {
          retried: true,
          puzzlePlacement: options.puzzlePlacement,
        });
      }
    }
    throw error;
  }
}

function applyRemoteRoomState(data, options = {}) {
  if (!data?.state) {
    return;
  }
  if (typeof data.version === "number" && remoteSession) {
    remoteSession.version = data.version;
    writeStoredFriendSession(remoteSession);
  }
  const normalizedRemote = normalizeStateForGame(data.state, selectedGameId);
  state = normalizedRemote;
  syncPuzzleDifficultyFromRemote(normalizedRemote, data.puzzleDifficulty);
  applyPuzzleFlipTurnFromRemote(state, data);
  selectedPuzzlePieceId = "";
  if (selectedGameId === "puzzle") {
    state = finalizePuzzleCompletionState(state);
    if (playMode === "friend" && isPuzzleComplete(state)) {
      maybeShowPuzzleCompletion("Puzzle complete!");
    }
  }
  friendSkipTurnVoiceThisRender = true;
  try {
    render(options.statusMessage || lastStatusMessage || "Make your move.");
  } finally {
    friendSkipTurnVoiceThisRender = false;
  }
  if (friendJoinWelcomeSpoken) {
    pendingWelcomeVoiceLines = [];
  }
}

async function commitMove(move) {
  maybeStoreUndoBeforeMove();
  if (playMode === "friend") {
    const canMove = await ensureFriendTurnSyncedBeforeMove();
    if (!canMove) {
      render(isStarterFlipPending() ? "Flip to see who goes first." : "Waiting for your friend...");
      return;
    }
    if (state.currentPlayer !== remoteSession.color) {
      render("Waiting for your friend...");
      return;
    }
  }
  busy = true;
  try {
    if (playMode === "friend") {
      await sleep(FRIEND_MOVE_DELAY_MS);
    }
    await animateHumanMove(move);
    const mover = state.currentPlayer;
    const result = applyMove(state, move);
    if (result.nextState === state) {
      render(result.status || "That move is not legal.");
      return;
    }
    recordMove(mover, move);
    playMoveAudio(mover, move);
    if (playMode === "friend") {
      state = result.nextState;
      render(result.status);
      try {
        await submitRemoteMove(result.nextState, { move });
      } catch (error) {
        await syncRoomState().catch(() => {});
        render(error?.message || "Move sync failed.");
      }
      return;
    }
    state = result.nextState;
    render(result.status);
    if (playMode === "puffly") {
      await runComputerTurn();
    }
  } finally {
    busy = false;
    if (playMode === "friend") {
      flushDeferredRoomSync();
    }
  }
}

async function commitFourDrop(col) {
  const landingRow = getLandingRow(state.grid, col);
  if (landingRow < 0) {
    playInvalidAudio();
    render("That column is full.");
    return;
  }
  maybeStoreUndoBeforeMove();
  if (playMode === "friend") {
    const canMove = await ensureFriendTurnSyncedBeforeMove();
    if (!canMove) {
      render("Waiting for your friend...");
      return;
    }
  }
  busy = true;
  if (playMode === "friend") {
    await sleep(FRIEND_MOVE_DELAY_MS);
  }
  const mover = state.currentPlayer;
  await animateFourDrop(mover, landingRow, col);
  const result = applyFourInARowDrop(state, col);
  if (!result.ok) {
    busy = false;
    render(result.message || "That move is not legal.");
    return;
  }
  recordFourDrop(mover, col);
  playMoveAudio(mover, { isCapture: false });
  const status = fourInARowStatus(result);
  if (playMode === "friend") {
    state = result.nextState;
    render(status);
    try {
      await submitRemoteMove(result.nextState, { fourCol: col });
    } catch (error) {
      await syncRoomState().catch(() => {});
      render(error?.message || "Move sync failed.");
    }
    busy = false;
    flushDeferredRoomSync();
    return;
  }
  state = result.nextState;
  render(status);
  busy = false;
  if (playMode === "puffly") {
    await runComputerTurn();
  }
}

async function runComputerTurn() {
  if (playMode !== "puffly" || isStarterFlipPending() || state.winner || state.draw || state.currentPlayer !== computerPlayer) {
    return;
  }
  if (selectedGameId === "puzzle") {
    if (busy) {
      return;
    }
    busy = true;
    try {
      render("Puffly is placing a piece...", { suppressStatusVoice: true });
      setPufflyState("thinking", "🧩 My turn.", { silentVoice: true });
      await sleep(900);
      const placement = choosePuzzleComputerPlacement(state, computerPlayer);
      if (!placement) {
        render("Puffly has no puzzle pieces left to place.");
        return;
      }
      await animatePuzzleAutoPlacement(placement.pieceId, placement.row, placement.col);
      await submitPuzzlePlacement(placement.pieceId, placement.row, placement.col, {
        skipAnimation: true,
        fromComputer: true,
      });
    } finally {
      busy = false;
    }
    return;
  }
  if (selectedGameId === "fourinarow") {
    busy = true;
    render("Puffly is thinking...", { suppressStatusVoice: true });
    setPufflyState("thinking", "🧠 My turn.");
    await sleep(moveHistory.length === 0 ? 1200 : 900);
    const column = chooseFourInARowComputerColumn(state, computerPlayer, difficulty);
    const result = applyFourInARowDrop(state, column);
    if (result.ok) {
      await animateFourDrop(computerPlayer, result.row, result.col, AI_MOVE_ANIMATION_MS);
      recordFourDrop(computerPlayer, result.col);
      playMoveAudio(computerPlayer, { isCapture: false });
      state = result.nextState;
      render(fourInARowStatus(result));
    }
    busy = false;
    render(lastStatusMessage);
    return;
  }
  busy = true;
  render("Puffly is thinking...", { suppressStatusVoice: true });
  let isFirstComputerMoveThisTurn = true;
  while (playMode === "puffly" && !state.winner && state.currentPlayer === computerPlayer) {
    if (isFirstComputerMoveThisTurn) {
      setPufflyState("thinking", "🧠 My turn.", { silentVoice: true });
      await sleep(360);
      setPufflyState("thinking", "🤔 I'm thinking...", { silentVoice: true });
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

function handlePuzzleTrayTap(event) {
  releasePuzzleInteractionLocks();
  const pieceEl = event.target.closest(".puzzle-piece");
  if (pieceEl instanceof HTMLElement) {
    armPuzzleTapFlash(pieceEl);
  }
  if (!shouldHandleTrayTap()) {
    return;
  }
  const pieceId = pieceEl?.dataset?.pieceId;
  if (!pieceId || busy || selectedGameId !== "puzzle" || isStarterFlipPending()) {
    return;
  }
  event.preventDefault();
  const piece = getPuzzlePiece(state, pieceId);
  const canSelect =
    piece &&
    !piece.placed &&
    piece.owner === state.currentPlayer &&
    (playMode !== "friend" || !remoteSession || state.currentPlayer === remoteSession.color);
  if (canSelect) {
    registerPuzzleTrayPieceElement(pieceId, pieceEl);
    if (lastTraySelectedPieceId && lastTraySelectedPieceId !== pieceId) {
      puzzleTrayPieceById.get(lastTraySelectedPieceId)?.classList.remove("selected");
    }
    pieceEl.classList.add("selected");
    lastTraySelectedPieceId = pieceId;
    selectedPuzzlePieceId = pieceId;
  }
  runAfterPuzzleTapPaint(() => {
    selectPuzzlePiece(pieceId, { fromPointerDown: true });
    scheduleAudioUnlockFromGesture();
  });
}

function handlePuzzleBoardTap(event) {
  releasePuzzleInteractionLocks();
  if (!shouldHandleBoardTap()) {
    return;
  }
  if (selectedGameId !== "puzzle" || !selectedPuzzlePieceId) {
    return;
  }
  const cell = event.target.closest(".puzzle-cell");
  if (!cell) {
    return;
  }
  event.preventDefault();
  armPuzzleTapFlash(cell);
  runAfterPuzzleTapPaint(() => {
    const placeMetrics = capturePuzzlePlaceMetrics(cell, selectedPuzzlePieceId);
    cell.classList.add("puzzle-slot-placing");
    void handlePuzzleBoardPlace(cell, placeMetrics);
  });
}

async function handlePuzzleBoardPlace(square, placeMetrics = null) {
  if (!square || busy || puzzlePlaceInFlight) {
    return;
  }
  puzzlePlaceInFlight = true;
  const targetCell =
    square ||
    boardElement.querySelector(
      `.puzzle-cell[data-row="${placeMetrics?.row ?? square.dataset.row}"][data-col="${placeMetrics?.col ?? square.dataset.col}"]`,
    );
  try {
    if (selectedGameId !== "puzzle" || isStarterFlipPending() || state.winner || state.draw) {
      return;
    }
    const row = Number(placeMetrics?.row ?? square.dataset.row);
    const col = Number(placeMetrics?.col ?? square.dataset.col);
    if (!Number.isFinite(row) || !Number.isFinite(col)) {
      return;
    }
    if (playMode === "puffly" && state.currentPlayer !== humanPlayer) {
      render("Puffly is thinking...", { suppressStatusVoice: true });
      return;
    }
    if (playMode === "friend" && !remoteSession) {
      const hasSession = await ensureFriendSessionBeforeMove();
      if (!hasSession || !remoteSession) {
        render("Connect to a room first.");
        return;
      }
    }
    if (playMode === "friend" && remoteSession && state.currentPlayer !== remoteSession.color) {
      lastStatusMessage = "Waiting for your friend...";
      updatePuzzleSelectionUi(lastStatusMessage, { visualOnly: true });
      return;
    }
    if (!selectedPuzzlePieceId) {
      return;
    }
    await submitPuzzlePlacement(selectedPuzzlePieceId, row, col, { placeMetrics });
  } finally {
    targetCell?.classList.remove("puzzle-slot-placing");
    puzzlePlaceInFlight = false;
  }
}

async function handlePuzzleBoardActivate(event) {
  const square = event.target.closest(".puzzle-cell");
  if (!square) {
    return;
  }
  event.preventDefault();
  scheduleAudioUnlockFromGesture();
  if (busy || selectedGameId !== "puzzle" || isStarterFlipPending() || state.winner || state.draw) {
    return;
  }
  if (selectedPuzzlePieceId) {
    return;
  }
  const row = Number(square.dataset.row);
  const col = Number(square.dataset.col);
  if (playMode === "puffly" && state.currentPlayer !== humanPlayer) {
    render("Puffly is thinking...", { suppressStatusVoice: true });
    return;
  }
  if (playMode === "friend" && !remoteSession) {
    const hasSession = await ensureFriendSessionBeforeMove();
    if (!hasSession || !remoteSession) {
      render("Connect to a room first.");
      return;
    }
  }
  if (playMode === "friend" && remoteSession && state.currentPlayer !== remoteSession.color) {
    lastStatusMessage = "Waiting for your friend...";
    updatePuzzleSelectionUi(lastStatusMessage);
    return;
  }
  if (!selectedPuzzlePieceId) {
    lastStatusMessage = "Tap a tray piece, then tap its matching slot.";
    updatePuzzleSelectionUi(lastStatusMessage);
    return;
  }
  await submitPuzzlePlacement(selectedPuzzlePieceId, row, col);
}

function primePuzzleTrayInput(target) {
  target?.addEventListener("pointerdown", handlePuzzleTrayTap, { passive: false, capture: true });
  if (speechNeedsInteractionUnlock) {
    target?.addEventListener("touchstart", handlePuzzleTouchFlash, { passive: true, capture: true });
  }
}

primePuzzleTrayInput(blueCapturedPile);
primePuzzleTrayInput(greenCapturedPile);

if (!boardElement) {
  console.error("[puffly] #board missing — UI wiring skipped");
} else {
  boardElement.addEventListener("pointerdown", handlePuzzleBoardTap, { passive: false, capture: true });
  if (speechNeedsInteractionUnlock) {
    boardElement.addEventListener("touchstart", handlePuzzleTouchFlash, { passive: true, capture: true });
  }
}

function handlePuzzleBoardPointerActivate(event) {
  if (selectedGameId !== "puzzle" || selectedPuzzlePieceId) {
    return;
  }
  const now = Date.now();
  if (now - lastPuzzleBoardActivateAt < 50) {
    return;
  }
  lastPuzzleBoardActivateAt = now;
  void handlePuzzleBoardActivate(event);
}

if (boardElement) {
  boardElement.addEventListener("pointerup", handlePuzzleBoardPointerActivate);

  boardElement.addEventListener("click", async (event) => {
  if (selectedGameId === "puzzle") {
    return;
  }
  ensureAudioContext();
  if (playMode === "puffly" && isStarterFlipPending() && practiceVoiceStartDismissed) {
    speakPracticeFlipPromptOnce({ inGesture: true });
  } else {
    primeSpeechSynthesisFromUserGesture();
  }
  if (busy) {
    return;
  }
  const square = event.target.closest(".square");
  if (!square) {
    return;
  }
  const row = Number(square.dataset.row);
  const col = Number(square.dataset.col);

  if (state.winner || state.draw) {
    return;
  }
  if (isStarterFlipPending()) {
    render("Flip to see who goes first.");
    return;
  }
  if (playMode === "puffly" && state.currentPlayer !== humanPlayer) {
    render("Puffly is thinking...", { suppressStatusVoice: true });
    return;
  }
  if (playMode === "friend") {
    if (!remoteSession) {
      const hasSession = await ensureFriendSessionBeforeMove();
      if (!hasSession || !remoteSession) {
        render("Connect to a room first.");
        return;
      }
    }
    if (state.currentPlayer !== remoteSession.color) {
      render("Waiting for your friend...");
      return;
    }
  }

  if (selectedGameId === "fourinarow") {
    const canDrop = getLandingRow(state.grid, col) >= 0;
    if (!canDrop) {
      playInvalidAudio();
      render("That column is full.");
      return;
    }
    await commitFourDrop(col);
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
}

restartButton?.addEventListener("click", async () => {
  forcePuzzleUiRecoverable();
  ensureAudioContext();
  if (playMode === "friend") {
    if (!remoteSession) {
      render("Connect to a room first.");
      return;
    }
    try {
      const data = await apiPost("/api/rooms/restart", {
        roomCode: remoteSession.roomCode,
        playerId: remoteSession.playerId,
      });
      syncPuzzleFlipTurnFromPayload(data);
      state = normalizeStateForGame(data.state, selectedGameId);
      applyPuzzleFlipTurnFromRemote(state, data);
      selectedPuzzlePieceId = "";
      remoteSession.version = data.version;
      if (typeof data.playerCount === "number") {
        remoteSession.playerCount = data.playerCount;
        remoteSession.ready = data.playerCount >= 2;
        setFriendStatus(getFriendStatusText(remoteSession));
      }
      syncRoomChatFromPayload(data);
      moveHistory = [];
      undoSnapshots = [];
      resetPuzzleSessionAfterRestart();
      refreshFriendGameUi(
        selectedGameId === "puzzle" ? puzzleFlipPromptText() : "Room restarted.",
      );
    } catch (error) {
      render(error?.message || "Unable to restart room.");
    }
    return;
  }
  beginPracticeFlipRound({ togglePuzzleFlip: selectedGameId === "puzzle" });
});

async function applyDifficultyChange(nextDifficulty, options = {}) {
  if (!nextDifficulty || nextDifficulty === difficulty) {
    return;
  }

  if (playMode === "friend" && selectedGameId === "puzzle") {
    if (remoteSession) {
      if (!options.fromFriendPanel) {
        return;
      }
      if (remoteSession.color !== "dark") {
        setFriendStatus("Only Blue can change puzzle size.");
        return;
      }
      if (!isStarterFlipPending()) {
        setFriendStatus("Puzzle size is locked after the flip.");
        return;
      }
      const previousDifficulty = difficulty;
      difficulty = nextDifficulty;
      updateDifficultyButtons();
      updateFriendDifficultyButtons();
      busy = true;
      try {
        const data = await postFriendPuzzleSize(difficulty);
        remoteSession.version = data.version;
        if (typeof data.playerCount === "number") {
          remoteSession.playerCount = data.playerCount;
          remoteSession.ready = data.playerCount >= 2;
          setFriendStatus(getFriendStatusText(remoteSession));
        }
        state = normalizeStateForGame(data.state, "puzzle");
        syncPuzzleDifficultyFromRemote(state, data.puzzleDifficulty);
        selectedPuzzlePieceId = "";
        moveHistory = [];
        undoSnapshots = [];
        winnerAnnounced = null;
        hideCelebration();
        syncRoomChatFromPayload(data);
        render(`Puzzle size set to ${getDifficultyLabel(difficulty, "puzzle")}.`);
      } catch (error) {
        difficulty = previousDifficulty;
        updateDifficultyButtons();
        updateFriendDifficultyButtons();
        render(error?.message || "Could not update puzzle size.");
      } finally {
        busy = false;
        render(lastStatusMessage);
      }
      return;
    }
    difficulty = nextDifficulty;
    updateDifficultyButtons();
    updateFriendDifficultyButtons();
    beginPracticeFlipRound();
    return;
  }

  difficulty = nextDifficulty;
  updateDifficultyButtons();
  updateFriendDifficultyButtons();
  beginPracticeFlipRound();
}

for (const button of difficultyButtons) {
  button.addEventListener("click", () => {
    if (busy || playMode !== "puffly") {
      return;
    }
    ensureAudioContext();
    applyDifficultyChange(button.dataset.difficulty).catch(() => {});
  });
}

for (const button of friendDifficultyButtons) {
  button.addEventListener("click", () => {
    if (busy || playMode !== "friend" || selectedGameId !== "puzzle") {
      return;
    }
    applyDifficultyChange(button.dataset.difficulty, { fromFriendPanel: true }).catch(() => {});
  });
}

audioToggleButton?.addEventListener("click", () => {
  if (busy) {
    return;
  }
  audioEnabled = !audioEnabled;
  updateAudioToggle();
  if (audioEnabled) {
    ensureAudioContext();
    lastSpokenPhrase = "";
    void pufflySpeak("Audio on.", {
      onstart: () => {
        lastSpokenPhrase = "Audio on.";
      },
    });
  } else if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
    lastSpokenPhrase = "";
  }
  render(audioEnabled ? "Audio feedback enabled." : "Audio feedback muted.");
});

let starterFlipTapInFlight = false;

function handleStarterFlipTap(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  if (starterFlipTapInFlight || starterFlipButton?.disabled || busy) {
    if (playMode === "friend" && isStarterFlipPending() && remoteSession?.ready) {
      const flipper = getFriendFlipperColor();
      if (remoteSession.color !== flipper) {
        render(`${playerDisplayName(flipper)} flips to start.`);
      }
    }
    return;
  }
  starterFlipTapInFlight = true;
  ensureAudioContext();
  primeSpeechSynthesisFromUserGesture();
  void flipStarter().finally(() => {
    starterFlipTapInFlight = false;
  });
}

starterFlipButton?.addEventListener("pointerdown", handleStarterFlipTap, { passive: false });
starterFlipButton?.addEventListener("click", handleStarterFlipTap);

undoButton?.addEventListener("click", async () => {
  if (busy || undoSnapshots.length === 0) {
    return;
  }
  ensureAudioContext();
  const snapshot = undoSnapshots.pop();
  if (!snapshot) {
    return;
  }
  const currentStateBeforeUndo = clone(state);
  if (playMode === "friend") {
    if (!remoteSession) {
      setFriendStatus("Connect to a room first.");
      return;
    }
    busy = true;
    try {
      const data = await apiPost("/api/rooms/undo", {
        roomCode: remoteSession.roomCode,
        playerId: remoteSession.playerId,
      });
      remoteSession.version = data.version;
      if (typeof data.playerCount === "number") {
        remoteSession.playerCount = data.playerCount;
        remoteSession.ready = data.playerCount >= 2;
        setFriendStatus(getFriendStatusText(remoteSession));
      }
      const targetState = normalizeStateForGame(data.state, selectedGameId);
      await animateUndoTransition(currentStateBeforeUndo, targetState);
      state = targetState;
      selectedPuzzlePieceId = "";
      moveHistory = snapshot.history;
      winnerAnnounced = null;
      lastSpokenPhrase = "";
      lastTurnSpoken = "";
      hideCelebration();
      syncRoomChatFromPayload(data);
      render("Undid your previous turn.");
    } catch (error) {
      undoSnapshots.push(snapshot);
      render(error?.message || "Undo not available right now.");
    } finally {
      busy = false;
      render(lastStatusMessage);
    }
    return;
  }
  busy = true;
  try {
    const targetState = normalizeStateForGame(snapshot.state, selectedGameId);
    await animateUndoTransition(currentStateBeforeUndo, targetState);
    state = targetState;
    selectedPuzzlePieceId = "";
    moveHistory = snapshot.history;
    winnerAnnounced = null;
    lastSpokenPhrase = "";
    lastTurnSpoken = "";
    hideCelebration();
    render("Undid your previous turn.");
  } catch {
    undoSnapshots.push(snapshot);
    render("Undo animation could not complete.");
  } finally {
    busy = false;
  }
});

rulesButton?.addEventListener("click", () => {
  if (rulesPanel?.classList.contains("hidden")) {
    showRulesPanel();
  } else {
    hideRulesPanel();
  }
});

function switchGame(nextGameId) {
  if (!isKnownGame(nextGameId) || nextGameId === selectedGameId) {
    return;
  }
  if (remoteSession) {
    void switchFriendRoomGame(nextGameId);
    return;
  }
  selectedGameId = nextGameId;
  updateGameButtons();
  updateAppTitle();
  if (playMode !== "friend") {
    resetSessionForModeSwitch();
  }
  puzzleTrayBootstrapAttempted = false;
  selectedPuzzlePieceId = "";
  moveHistory = [];
  undoSnapshots = [];
  winnerAnnounced = null;
  hideCelebration();
  updateRulesForMode();
  updateDifficultyButtons();
  updateFriendPuzzleDifficultyPanel();
  if (playMode === "friend") {
    state = createStateForGame(selectedGameId);
    lastSpokenPhrase = "";
    lastTurnSpoken = "";
    setFriendStatus(getFriendCreateRoomHint());
    render("Friend mode: connect to a room.");
    return;
  }
  beginPracticeFlipRound();
}

async function switchFriendRoomGame(nextGameId) {
  const normalized = normalizeGameId(nextGameId);
  if (!isKnownGame(normalized)) {
    return;
  }
  ensureFriendPlayModeSynced();
  if (!remoteSession) {
    await tryReconnectStoredFriendSession({ force: true });
  }
  if (!remoteSession) {
    switchGame(normalized);
    return;
  }
  const roomGame = normalizeGameId(remoteSession.gameType || selectedGameId);
  if (normalized === roomGame && normalized === selectedGameId) {
    return;
  }
  busy = true;
  let switchStatusMessage = "";
  try {
    const payload = {
      roomCode: remoteSession.roomCode,
      playerId: remoteSession.playerId,
      gameType: normalized,
    };
    if (normalized === "puzzle") {
      payload.puzzleDifficulty = difficulty;
    }
    const data = await apiPost("/api/rooms/change-game", payload);
    hydrateRoomSession(data, { announceJoinVoice: false, deferRender: true });
    updateInvitePanel(remoteSession.roomCode);
    const gameTitle = getGameConfig(normalized).title;
    const switcherLabel = playerDisplayName(remoteSession.color);
    switchStatusMessage =
      normalized === "puzzle" ? puzzleFlipPromptText() : "Flip to see who goes first.";
    setFriendStatus(`${switcherLabel} switched the room to ${gameTitle}. Waiting for FLIP.`);
  } catch (error) {
    updateGameButtons();
    setFriendStatus(error?.message || "Could not change the room game.");
    switchStatusMessage = lastStatusMessage;
  } finally {
    busy = false;
    flushDeferredRoomSync();
    if (remoteSession && !roomPollTimer) {
      startRoomPolling();
    }
    if (remoteSession) {
      announceFriendGameSwitchVoice(normalized);
      refreshFriendGameUi(switchStatusMessage || lastStatusMessage);
    }
  }
}

for (const button of gameButtons) {
  button.addEventListener("click", () => {
    if (busy && !isFriendModeUiActive() && !isFriendChromeVisible()) {
      return;
    }
    if (busy && (isFriendModeUiActive() || isFriendChromeVisible())) {
      busy = false;
    }
    ensureAudioContext();
    scheduleAudioUnlockFromGesture();
    const nextGameId = normalizeGameId(button.dataset.game || DEFAULT_GAME_ID);
    const friendUiActive = isFriendModeUiActive() || isFriendChromeVisible();
    if (friendUiActive) {
      ensureFriendPlayModeSynced();
      if (remoteSession || readStoredFriendSession()) {
        switchFriendRoomGame(nextGameId).catch((error) => {
          setFriendStatus(error?.message || "Could not change the room game.");
        });
        return;
      }
      selectedGameId = nextGameId;
      updateGameButtons();
      updateAppTitle();
      switchGame(nextGameId);
      return;
    }
    switchGame(nextGameId);
  });
}

function activatePufflyMode() {
  initDesktopSpeechDefaults();
  if (typeof window !== "undefined") {
    window.__pufflyUserChosePufflyMode = true;
    window.__pufflyPendingInviteJoin = "";
    window.__pufflyInviteJoinInFlight = false;
    window.__pufflyPendingPlayMode = "puffly";
  }
  clearInviteParamsFromUrl();
  if (typeof window !== "undefined" && typeof window.pufflyApplyPlayModeChrome === "function") {
    window.pufflyApplyPlayModeChrome("puffly");
  }
  abortPracticeInteractionForModeSwitch();
  pauseFriendRoomForPractice();
  if (playMode === "puffly" && !remoteSession) {
    syncPlayModeChrome();
    beginPracticeFlipRound({ force: true });
    ensureAudioContext({ skipSpeechUnlock: true });
    updateSpeechUnlockOverlay();
    return;
  }
  setPlayMode("puffly");
  ensureAudioContext({ skipSpeechUnlock: true });
  updateSpeechUnlockOverlay();
}

function activateFriendMode() {
  playMode = "friend";
  initDesktopSpeechDefaults();
  if (typeof window !== "undefined") {
    window.__pufflyUserChosePufflyMode = false;
    window.__pufflyPendingPlayMode = "friend";
  }
  if (!speechNeedsInteractionUnlock) {
    speechUnlocked = true;
    speechGesturePrimed = true;
  } else {
    speechUnlocked = false;
    speechGesturePrimed = false;
  }
  if (!remoteSession) {
    friendVoiceStartDismissed = false;
    friendJoinWelcomeSpoken = false;
  }
  updateSpeechUnlockOverlay();
  primeSpeechSynthesisFromUserGesture();
  if (typeof window !== "undefined" && typeof window.pufflyApplyPlayModeChrome === "function") {
    window.pufflyApplyPlayModeChrome("friend");
  }
  if (playMode === "friend") {
    syncPlayModeChrome();
    updateFriendLockOverlay();
    void resumeFriendRoomIfPaused().then((reconnected) => {
      if (!reconnected && !getJoinCodeFromUrl()) {
        setFriendStatus(getFriendCreateRoomHint());
        render("Friend mode: connect to a room.");
        if (!remoteSession) {
          announceFriendLobbyPrompt();
        }
      }
      if (getJoinCodeFromUrl() && !remoteSession) {
        maybeAutoJoinFromInviteLink();
      }
    });
    return;
  }
  abortPracticeInteractionForModeSwitch();
  setPlayMode("friend");
  ensureAudioContext({ skipSpeechUnlock: true });
  void resumeFriendRoomIfPaused().then((reconnected) => {
    if (!reconnected && getJoinCodeFromUrl() && !remoteSession) {
      maybeAutoJoinFromInviteLink();
    }
  });
}

function installPlayModeTapRouting() {
  const chrome = document.querySelector(".app-chrome");
  if (!chrome || chrome.dataset.playModeRouting === "1") {
    return;
  }
  chrome.dataset.playModeRouting = "1";
  const route = (event) => {
    const modeButton = event.target.closest("[data-play-mode]");
    if (!modeButton) {
      return;
    }
    event.preventDefault();
    const mode = modeButton.getAttribute("data-play-mode");
    if (mode === "friend") {
      activateFriendMode();
      return;
    }
    if (mode === "puffly") {
      activatePufflyMode();
    }
  };
  chrome.addEventListener("click", route);
}

friendControls?.addEventListener(
  "pointerdown",
  () => {
    ensureAudioContext();
  },
  { capture: true },
);

function isCreateInviteNewRoomTap() {
  const label = (createRoomButton?.textContent || "").trim().toLowerCase();
  return !label.includes("share");
}

function clearFriendRoomForNewCreate() {
  stopRoomPolling();
  const leaving = remoteSession;
  remoteSession = null;
  speechGesturePrimed = false;
  pendingInviteShareRoomCode = "";
  clearStoredFriendSession();
  if (leaving) {
    apiPost("/api/rooms/leave", {
      roomCode: leaving.roomCode,
      playerId: leaving.playerId,
    }).catch(() => {});
  }
  updateFriendRoomButtons();
  updateInvitePanel(null);
}

async function createFriendRoom() {
  if (typeof window !== "undefined" && window.__pufflyCreateInFlight) {
    return;
  }
  const now = Date.now();
  if (now - lastCreateRoomTapAt < 700) {
    return;
  }
  lastCreateRoomTapAt = now;
  if (typeof window !== "undefined") {
    window.__pufflyCreateInFlight = true;
    window.__pufflyUserChosePufflyMode = false;
    window.__pufflyPendingPlayMode = "friend";
    window.__pufflyRoomActionInFlight = true;
    if (typeof window.pufflyApplyPlayModeChrome === "function") {
      window.pufflyApplyPlayModeChrome("friend");
    }
  }
  pendingInviteShareRoomCode = "";
  setFriendStatus("Creating room… contacting server");
  releaseStaleBusyForFriendAction();
  busy = false;
  noteUserGesture();
  primePufflyVoiceFromGesture();
  playConnectedFromTap();
  ensureAudioContext();
  primeSpeechSynthesisFromUserGesture();

  try {
    if (!ensureFriendPlayModeSynced()) {
      setFriendStatus("Tap Play with a Friend above, then try Create & Invite again.");
      return;
    }

    const wantsNewRoom = isCreateInviteNewRoomTap();
    if (wantsNewRoom) {
      clearFriendRoomForNewCreate();
    } else if (remoteSession?.roomCode) {
      const roomCode = remoteSession.roomCode;
      setFriendStatus(`Room ${roomCode} ready. Tap again to share the invite link.`);
      updateInvitePanel(roomCode);
      void shareInviteLink(roomCode, { silentCancel: true, silentFallback: true });
      return;
    }

    const createPayload = { gameType: selectedGameId };
    if (selectedGameId === "puzzle") {
      createPayload.puzzleDifficulty = difficulty;
    }
    const data = await apiPost("/api/rooms/create", createPayload, { timeoutMs: 15000 });
    setFriendStatus("Creating room… applying room");
    applyCreateRoomResponse(data);
    if (selectedGameId === "puzzle") {
      syncPuzzleDifficultyFromRemote(state, data.puzzleDifficulty);
    }
    void copyInviteLinkToClipboard(data.roomCode);
    void shareInviteLink(data.roomCode, { silentCancel: true, silentFallback: true });
  } catch (error) {
    setFriendStatus(error?.message || "Could not create room.");
  } finally {
    if (typeof window !== "undefined") {
      window.__pufflyCreateInFlight = false;
      window.__pufflyRoomActionInFlight = false;
    }
    busy = false;
  }
}

function installFriendActionButtonHandlers() {
  const wire = (button, handler) => {
    if (!button || button.dataset.friendActionWired === "1") {
      return;
    }
    button.dataset.friendActionWired = "1";
    const run = (event) => {
      event.preventDefault();
      event.stopPropagation();
      noteUserGesture();
      primePufflyVoiceFromGesture();
      void handler();
    };
    button.addEventListener("click", run, { capture: true });
  };
  wire(document.getElementById("create-room-btn"), createFriendRoom);
  wire(document.getElementById("join-room-btn"), joinFriendRoom);
  const testVoiceBtn = document.getElementById("friend-test-voice-btn");
  if (testVoiceBtn && testVoiceBtn.dataset.friendActionWired !== "1") {
    testVoiceBtn.dataset.friendActionWired = "1";
    testVoiceBtn.addEventListener("click", (event) => {
      event.preventDefault();
      noteUserGesture();
      primePufflyVoiceFromGesture();
      playConnectedFromTap();
      setFriendStatus("Voice test: you should hear “connected”.");
    });
  }
}

installFriendActionButtonHandlers();

copyInviteButton?.addEventListener("click", async () => {
  if (!remoteSession?.roomCode) {
    setFriendStatus("Create a room first to copy an invite link.");
    return;
  }
  updateInvitePanel(remoteSession.roomCode);
  const copied = await copyInviteLinkToClipboard(remoteSession.roomCode);
  setFriendStatus(
    copied
      ? `Invite link copied for room ${remoteSession.roomCode}.`
      : `Select the invite link below, then copy it manually.`,
  );
});

async function joinFriendRoom() {
  const now = Date.now();
  if (now - lastJoinRoomTapAt < 700) {
    return;
  }
  lastJoinRoomTapAt = now;
  noteUserGesture();
  primePufflyVoiceFromGesture();
  playConnectedFromTap();
  if (typeof window !== "undefined") {
    window.__pufflyUserChosePufflyMode = false;
    if (typeof window.pufflyApplyPlayModeChrome === "function") {
      window.pufflyApplyPlayModeChrome("friend");
    }
  }
  releaseStaleBusyForFriendAction();
  if (!ensureFriendPlayModeSynced()) {
    setFriendStatus("Tap Play with a Friend above, then try Join Room again.");
    return;
  }
  ensureAudioContext({ skipSpeechUnlock: true });
  if (speechNeedsInteractionUnlock) {
    primeFriendGestureOnly();
  } else {
    primeSpeechSynthesisFromUserGesture();
  }
  const roomCode = (roomCodeInput?.value || "").trim().toUpperCase();
  if (!roomCode) {
    setFriendStatus("Enter a room code, then tap Join Room.");
    return;
  }
  setFriendStatus(`Joining room ${roomCode}...`);
  const joined = await joinRoomWithCode(roomCode);
  if (!joined) {
    render(lastStatusMessage);
    return;
  }
}

copyRoomButton?.addEventListener("click", async () => {
  const roomCode = remoteSession?.roomCode || roomCodeInput?.value.trim().toUpperCase();
  if (!roomCode) {
    setFriendStatus("Create a room first to share an invite.");
    return;
  }
  await shareInviteLink(roomCode);
});

async function sendRoomChatMessage() {
  if (busy || playMode !== "friend" || !remoteSession) {
    return;
  }
  const text = chatInput?.value.trim();
  if (!text) {
    return;
  }
  try {
    const data = await apiPost("/api/rooms/chat", {
      roomCode: remoteSession.roomCode,
      playerId: remoteSession.playerId,
      text,
    });
    if (chatInput) {
      chatInput.value = "";
    }
    syncRoomChatFromPayload(data, true);
  } catch (error) {
    setFriendStatus(error?.message || "Chat send failed.");
  }
}

chatSendButton?.addEventListener("click", () => {
  sendRoomChatMessage();
});

chatMuteButton?.addEventListener("click", () => {
  chatNotificationsMuted = !chatNotificationsMuted;
  updateChatMuteButton();
  setFriendStatus(chatNotificationsMuted ? "Chat notifications muted." : "Chat notifications enabled.");
});

chatInput?.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") {
    return;
  }
  event.preventDefault();
  sendRoomChatMessage();
});

chatInput?.addEventListener("focus", () => {
  setChatUnreadCount(0);
});

chatMessagesElement?.addEventListener("scroll", () => {
  if (isChatActivelyViewed()) {
    setChatUnreadCount(0);
  }
});

voiceJoinButton?.addEventListener("click", async () => {
  if (playMode !== "friend") {
    return;
  }
  if (voiceJoined) {
    await leaveVoiceConnection();
    return;
  }
  await startVoiceConnection();
});

voiceMuteMicButton?.addEventListener("click", () => {
  if (!voiceLocalStream) {
    return;
  }
  voiceMicMuted = !voiceMicMuted;
  for (const track of voiceLocalStream.getAudioTracks()) {
    track.enabled = !voiceMicMuted;
  }
  updateVoiceButtons();
});

voiceSpeakerButton?.addEventListener("click", () => {
  voiceSpeakerMuted = !voiceSpeakerMuted;
  updateVoiceButtons();
});

function installSpeechStartButton() {
  const btn = document.getElementById("speech-unlock-btn");
  if (!btn || btn.dataset.pufflySpeechWired === "1") {
    return;
  }
  btn.dataset.pufflySpeechWired = "1";
  btn.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    noteUserGesture();
    handleSpeechUnlockFromUserGesture();
  });
}

function handleSpeechUnlockFromUserGesture() {
  const now = Date.now();
  if (now - speechUnlockGestureHandledAt < 300) {
    return;
  }
  speechUnlockGestureHandledAt = now;
  noteUserGesture();
  if (playMode === "friend") {
    ensureAudioContext({ skipSpeechUnlock: true });
    deliverFriendIntroVoiceFromGesture();
    return;
  }
  dismissPracticeVoiceStartOverlay();
  primePufflyVoiceFromGesture();
  deliverPracticeVoiceOnStartTap();
}

leaveRoomButton?.addEventListener("click", async () => {
  if (busy || playMode !== "friend") {
    return;
  }
  if (!remoteSession) {
    setFriendStatus("No active room to leave.");
    return;
  }
  try {
    await apiPost("/api/rooms/leave", {
      roomCode: remoteSession.roomCode,
      playerId: remoteSession.playerId,
    });
    resetFriendLocalState("You left the room.");
  } catch (error) {
    setFriendStatus(error?.message || "Could not leave room.");
  }
});

celebrationClose?.addEventListener("click", () => {
  if (selectedGameId === "puzzle" && isPuzzleComplete()) {
    dismissPuzzleCompletionCelebration();
  } else {
    hideCelebration();
    forcePuzzleUiRecoverable();
  }
  render(lastStatusMessage);
});

if (typeof window !== "undefined") {
  window.addEventListener("resize", () => {
    lockBoardGeometry();
    render(lastStatusMessage);
  });
  window.addEventListener("pageshow", (event) => {
    if (!event.persisted || readInviteParamsFromUrl().join) {
      return;
    }
    prepareFreshAppLoad();
    if (playMode === "friend" && remoteSession) {
      resetFriendLocalState("Fresh game loaded. Tap Create & Invite to start a room.");
      render(lastStatusMessage);
    } else if (playMode === "puffly") {
      resetLocalGameState(selectedGameId);
      render("Flip to see who goes first.");
    }
  });
}

function bootstrapApp() {
  installSpeechStartButton();
  initDesktopSpeechDefaults();
  if (typeof window !== "undefined" && window.__pufflyInlineSpeechPrimed) {
    primePufflyVoiceFromGesture();
    speechUnlockOverlay?.classList.add("hidden");
  }
  if (typeof window !== "undefined" && window.__pufflyPracticeVoiceStartDismissed) {
    practiceVoiceStartDismissed = true;
  }
  preloadVoiceClips();
  if (typeof window !== "undefined" && window.speechSynthesis) {
    refreshSpeechVoiceCache();
    window.speechSynthesis.addEventListener("voiceschanged", () => {
      refreshSpeechVoiceCache();
      primeSpeechEngine();
    });
    primeSpeechEngine();
  }
  installPlayModeTapRouting();
  installFriendActionButtonHandlers();
  installGlobalVoicePrime();
  prepareFreshAppLoad();
  updateChatMuteButton();
  updateSpeechUnlockOverlay();
  renderRoomChat(true);
  const inviteJoinCode =
    getJoinCodeFromUrl() ||
    (typeof window !== "undefined" ? String(window.__pufflyPendingInviteJoin || "").trim().toUpperCase() : "");
  if (inviteJoinCode) {
    void bootstrapInviteJoin(inviteJoinCode);
    return;
  }
  const invite = readInviteParamsFromUrl();
  if (invite.mode === "friend") {
    applyInviteLandingConfig();
    updateGameButtons();
    updateDifficultyButtonLabels();
    updateFriendDifficultyButtons();
    updateAppTitle();
    enterFriendLobbyChrome();
    flushPendingPlayModeTap();
    return;
  }
  selectedGameId = AUTO_GAME_ID;
  if (AUTO_PUZZLE_SIZE && selectedGameId === "puzzle") {
    difficulty = AUTO_PUZZLE_SIZE;
  }
  updateGameButtons();
  updateDifficultyButtonLabels();
  updateFriendDifficultyButtons();
  updateAppTitle();
  resetLocalGameState(selectedGameId);
  updateRulesForMode();
  const pendingFriend =
    typeof window !== "undefined" &&
    window.__pufflyPendingPlayMode === "friend" &&
    !window.__pufflyUserChosePufflyMode;
  if (pendingFriend) {
    setPlayMode("friend");
    flushPendingPlayModeTap();
    return;
  }
  playMode = "puffly";
  syncPlayModeChrome();
  installPrimePracticeSpeechOnFirstGesture();
  updateSpeechUnlockOverlay();
  beginPracticeFlipRound({ coldBoot: true });
  flushPendingPlayModeTap();
}

function flushPendingPlayModeTap() {
  if (typeof window === "undefined") {
    return;
  }
  if (window.__pufflyInviteJoinInFlight) {
    window.__pufflyPendingPlayMode = "";
    window.__pufflyPendingJoinRoom = false;
    return;
  }
  const pendingMode = window.__pufflyPendingPlayMode;
  window.__pufflyPendingPlayMode = "";
  if (pendingMode === "friend") {
    activateFriendMode();
  } else if (pendingMode === "puffly") {
    activatePufflyMode();
  }
  if (window.__pufflyPendingCreateRoom) {
    window.__pufflyPendingCreateRoom = false;
    void createFriendRoom();
  }
  if (window.__pufflyPendingJoinRoom) {
    window.__pufflyPendingJoinRoom = false;
    void joinFriendRoom();
  }
  if (window.__pufflyPendingRoomHydrate) {
    const payload = window.__pufflyPendingRoomHydrate;
    window.__pufflyPendingRoomHydrate = null;
    primePufflyVoiceFromGesture();
    hydrateRoomSession(payload);
  }
}

if (typeof window !== "undefined") {
  window.pufflyActivateFriendMode = activateFriendMode;
  window.pufflyActivatePufflyMode = activatePufflyMode;
  window.pufflyCreateFriendRoom = createFriendRoom;
  window.pufflyCreateRoomNow = createFriendRoom;
  window.pufflyJoinFriendRoom = joinFriendRoom;
  window.pufflyHydrateFriendRoom = (data) => hydrateRoomSession(data);
  window.pufflyEnsureFriendMode = ensureFriendPlayModeSynced;
  window.pufflyTryInviteJoinFromUrl = maybeAutoJoinFromInviteLink;
  window.pufflySpeechStartTap = handleSpeechUnlockFromUserGesture;
  window.pufflyPrimeVoice = primePufflyVoiceFromGesture;
  window.pufflyPlayConnectedChime = playFriendConnectedChime;
  window.pufflyPlayVoiceClip = (clipId) => playVoiceClip(clipId);
  window.pufflyPlayConnectedFromTap = playConnectedFromTap;
  window.pufflySpeechBuild = SPEECH_BUILD;
  window.pufflyFriendYourTurn = () => isFriendYourTurnNow();
}

function showBootstrapFailure(error) {
  console.error("[puffly] bootstrap failed", error);
  const message = error?.message || String(error);
  const banner = document.createElement("div");
  banner.setAttribute("role", "alert");
  banner.style.cssText =
    "position:fixed;inset:12px auto auto 12px;right:12px;z-index:99999;padding:12px 14px;border-radius:10px;background:#3b1010;color:#fff;font:14px/1.4 system-ui,sans-serif;";
  banner.textContent = `Puffly could not start (${message}). Hard-refresh with ?cb=274 or clear cache.`;
  document.body.appendChild(banner);
}

try {
  bootstrapApp();
} catch (error) {
  showBootstrapFailure(error);
}
