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
  PRACTICE_CHOOSE_FLIP_VOICE_PHRASE,
  FRIEND_TAP_FLIP_VOICE_PHRASE,
  FRIEND_BLUE_FLIPPING_PHRASE,
  FRIEND_GREEN_FLIPPING_PHRASE,
  SPEECH_BUILD,
  VOICE_CLIP_BASE,
  VOICE_CLIP_EXT,
  VOICE_CLIP_IDS,
  getPracticeEndgamePhrase,
  FRIEND_LOBBY_VOICE_PHRASE,
  FRIEND_INVITE_TO_PLAY_PHRASE,
  buildFriendGameSwitchClipSequence,
  buildFriendGuestWelcomeSequence,
  buildFriendJoinClipSequence,
  buildFriendJoinCatchUpSequence,
  buildFriendOpponentJoinedClipSequence,
  filterClipPhrases,
  friendFlipResultClipText,
  mapFriendPhraseToClipText,
  playerColorFromFriendTurnPhrase,
  resolveVoiceClipId,
  voiceClipPhraseFromMascotThought,
} from "./voicePhrases.js?v=305";
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
const friendPuzzleSizeConfirmBar = document.getElementById("friend-puzzle-size-confirm");
const friendPuzzleSizeSwitchBtn = document.getElementById("friend-puzzle-size-switch-btn");
const friendPuzzleSizeKeepBtn = document.getElementById("friend-puzzle-size-keep-btn");
const audioToggleButton = document.getElementById("audio-toggle-btn");
const pufflyControls = document.getElementById("puffly-controls");
const friendControls = document.getElementById("friend-controls");
const createRoomButton = document.getElementById("create-room-btn");
const friendJoinLeaveButton = document.getElementById("friend-join-leave-btn");
const friendInviteShareButton = document.getElementById("friend-invite-share-btn");
const copyRoomButton = document.getElementById("copy-room-btn");
const roomCodeInput = document.getElementById("room-code-input");
const friendStatusLabel = document.getElementById("friend-status");
const friendInviteLink = document.getElementById("friend-invite-link");
const friendVoiceAudioHost = document.getElementById("friend-voice-audio");
const historyList = document.getElementById("history-list");
const rulesPanel = document.getElementById("rules-panel");
const rulesPanelBackdrop = document.getElementById("rules-panel-backdrop");
const rulesPanelClose = document.getElementById("rules-panel-close");
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
const voiceChatTitle = document.querySelector("#voice-join-btn .voice-chat-title");
const voiceConnectionLabel = document.getElementById("voice-connection-label");
const speechUnlockOverlay = document.getElementById("speech-unlock-overlay");
const speechUnlockButton = document.getElementById("speech-unlock-btn");
const friendVoiceStartButton = document.getElementById("friend-voice-start-btn");
const blueAvatar = document.getElementById("blue-avatar");
const greenAvatar = document.getElementById("green-avatar");
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
/** Animate inferred opponent moves in Friend mode (Checkers, Four-in-a-Row, Puzzle). */
const FRIEND_ANIMATE_OPPONENT_MOVES = true;
const FRIEND_ROOM_POLL_MS =
  typeof navigator !== "undefined" && /iPad|iPhone|iPod/i.test(navigator.userAgent) ? 1000 : 250;
const STARTER_FLIP_ANIMATION_MS = 1450;
const FRIEND_FLIP_SYNC_MS = 380;
const PUFFLY_PUZZLE_PLACE_MS = 1250;
const CHECKERS_STARTING_PIECES = 12;
const PUZZLE_JIGSAW_BASE = 100;
const PUZZLE_JIGSAW_TAB = 20;
let celebrationTimers = [];
let pufflyCheerTimer = null;
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
let voiceOfferSent = false;
let voiceRemoteAudioElement = null;
let applyingRemoteSync = false;
const FRIEND_SESSION_STORAGE_KEY = "puffly.friend.session.v1";
const FRIEND_SESSION_SESSION_KEY = "puffly.friend.session.session";
const FRIEND_JOIN_INTENT_KEY = "puffly.friend.joinIntent.v1";
const FRIEND_JOIN_INTENT_LOCAL_KEY = "puffly.friend.joinIntent.local";
const FRIEND_STABLE_SESSION_KEY = "puffly.friend.stable.v1";
const FRIEND_BLOCK_PRACTICE_KEY = "puffly.friend.blockPractice";
const FRIEND_JOIN_INTENT_MAX_AGE_MS = 30 * 60 * 1000;
const FRIEND_LAST_ROOM_CODE_KEY = "puffly.friend.lastRoomCode.v1";
const FRIEND_HOST_ROOMS_KEY = "puffly.friend.hostRooms.v1";
let triedStoredFriendReconnect = false;
let reconnectingStoredFriendSession = false;
let friendInviteShareReady = false;
let friendInviteInFlight = false;
let friendUndoAvailable = false;
let friendPuzzleSizeStatusLine = "";
let friendPuzzleSizeStatusTimer = 0;
let friendPuzzleSizePendingConfirm = null;
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
const MIN_TOUCH_CELL_PX = 44;
/** Friend-mode side trays use 95% of board height (5% shorter than board). */
const FRIEND_MODE_TRAY_HEIGHT_FACTOR = 0.95;
const BOARD_GEOMETRY_RESIZE_DEBOUNCE_MS = 150;
const PRACTICE_TABLE_ORIENTATION_RELAYOUT_DEFER_MS = 300;
const PRACTICE_TABLE_ORIENTATION_RESIZE_COOLDOWN_MS = 500;
const PWA_INSTALL_HINT_STORAGE_KEY = "puffly.pwaHintDismissed";
let boardGeometryResizeTimer = null;
let practiceTableOrientationRelayoutTimer = null;
let practiceTableLayoutPassGeneration = 0;
let lastPracticeTableOrientationChangeAt = 0;
const AUTO_GAME_ID = getGameFromUrl();
const AUTO_PUZZLE_SIZE = getPuzzleSizeFromUrl();

function getAutoJoinRoomCode() {
  return getJoinCodeFromUrl();
}
let pendingPrioritySpeech = "";
let pendingJoinIntroTeam = "";
let friendSpeechPlaying = false;
const friendSpeechQueue = [];
let friendSpeechWatchdog = null;
const speechNeedsInteractionUnlock = detectIOSLikeBrowser();
/** iOS Safari: Web Audio must start within this window of a real tap (async join exceeds it). */
const FRIEND_GESTURE_AUDIO_MS = 3200;
/** After flip / turn handoff sync, play turn clips without waiting for another tap (Green iPad). */
const FRIEND_POST_FLIP_TURN_AUDIO_MS = 12000;

let speechUnlocked = !speechNeedsInteractionUnlock;
let pendingUnlockSpeech = "";
let selectedPuzzlePieceId = "";
let puzzleFlipTurnLocal = "dark";
let puzzleTrayBootstrapAttempted = false;
let puzzlePreFlipGeometryRefreshScheduled = false;
let practiceTableLandscapePuzzleCellPx = 0;
let practiceTableLandscapePuzzleBodyPx = 0;
let practiceTableLandscapePuzzleBoardHeightPx = 0;
let practiceTablePortraitPuzzleCellPx = 0;
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

function isIPadOSLikeDevice() {
  if (typeof navigator === "undefined") {
    return false;
  }
  const ua = navigator.userAgent || "";
  if (/iPad|iPhone|iPod/i.test(ua)) {
    return true;
  }
  // iPadOS 13+ reports Macintosh in UA; touch distinguishes it from desktop Mac.
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

function isDesktopMacBrowser() {
  if (typeof navigator === "undefined") {
    return false;
  }
  if (isIPadOSLikeDevice()) {
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
  return isIPadOSLikeDevice();
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

const INVITE_JOIN_STORAGE_KEY = "puffly.inviteJoin";
const INVITE_JOIN_LOCAL_KEY = "puffly.inviteJoin.local";
const INVITE_PAGE_LOCK_KEY = "puffly.inviteActive";
const INVITE_PAGE_LOCK_CODE_KEY = "puffly.inviteActiveCode";
const INVITE_ORIGIN_STORAGE_KEY = "puffly.inviteOrigin";
const DEFAULT_PUBLIC_INVITE_ORIGIN = "https://dev.playpuffly.org";
/** Bumped with index.html app.js?v= so iPad cache mismatches are visible in friend status. */
const CLIENT_BUILD = 491;
const VOICE_DEBUG_LOG_MAX = 200;
const GUEST_HYDRATE_PAYLOAD_KEY = "puffly.guestHydratePayload";
const GUEST_ATTACHED_FLAG_KEY = "puffly.guestAttached";
/** Guest / invite: decode these before first gameplay clip (avoids iPad garble on first tap). */
const FRIEND_GUEST_VOICE_CLIPS = [
  "connected",
  "friend_lobby_intro",
  "friend_invite_to_play",
  "friend_joined",
  "welcome_room",
  "team_green",
  "your_turn",
  "green_turn",
  "blue_turn",
  "tap_flip_start",
  "blue_is_flipping",
  "green_is_flipping",
  "green_flip",
  "blue_flip",
];
let friendVoiceWarmPromise = null;
let voiceDebugEnabled = false;
let voiceDebugHudEl = null;

function isVoiceDebugEnabled() {
  if (voiceDebugEnabled) {
    return true;
  }
  if (typeof window === "undefined") {
    return false;
  }
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.get("voiceDebug") === "1") {
      return true;
    }
    return window.localStorage?.getItem("puffly.voiceDebug") === "1";
  } catch {
    return false;
  }
}

function voiceDebugFriendState() {
  return {
    joinWelcomeSpoken: friendJoinWelcomeSpoken,
    welcomeAborted: friendWelcomeAbortedForPlay,
    clipSeqPlaying: friendClipSequencePlaying,
    clipQueueLen: friendClipSequenceQueue.length,
    mascotInFlight: friendMascotVoiceInFlight,
    yourTurnAnnounced: friendYourTurnVoiceAnnounced,
    yourTurnClipPlaying: friendYourTurnClipPlaying,
    busQueue: friendVoiceBusQueue.length,
    busPlaying: friendVoiceBusPlaying,
    busDrainPending: friendVoiceBusDrainPending,
    busSpoken: friendVoiceBusSpokenIds.size,
    postFlipWindow: typeof friendPostFlipTurnVoiceActive === "function" ? friendPostFlipTurnVoiceActive() : false,
    preFlipSpoken: friendPreFlipClipSpoken,
    lastSpoken: lastSpokenPhrase,
    turn: state?.currentPlayer,
    localColor: remoteSession?.color,
    starterFlipDone: Boolean(state?.starterFlipDone),
  };
}

function voiceDebugLog(event, detail = {}) {
  if (!isVoiceDebugEnabled()) {
    return;
  }
  const entry = {
    t: Date.now(),
    ms: Math.round(performance.now()),
    event: String(event),
    build: CLIENT_BUILD,
    playMode,
    game: selectedGameId,
    ...detail,
  };
  if (playMode === "friend" && !detail.state) {
    entry.state = voiceDebugFriendState();
  }
  console.info("[puffly:voice]", entry);
  if (typeof window !== "undefined") {
    window.__pufflyVoiceLog = window.__pufflyVoiceLog || [];
    window.__pufflyVoiceLog.push(entry);
    if (window.__pufflyVoiceLog.length > VOICE_DEBUG_LOG_MAX) {
      window.__pufflyVoiceLog.splice(0, window.__pufflyVoiceLog.length - VOICE_DEBUG_LOG_MAX);
    }
    updateVoiceDebugHud(entry);
  }
}

function voiceDebugBlocked(path, reason, extra = {}) {
  voiceDebugLog("blocked", { path, reason, ...extra });
}

function mountVoiceDebugHud() {
  if (!isVoiceDebugEnabled() || typeof document === "undefined" || voiceDebugHudEl) {
    return;
  }
  voiceDebugEnabled = true;
  const hud = document.createElement("div");
  hud.id = "puffly-voice-debug";
  hud.setAttribute("aria-live", "polite");
  hud.style.cssText =
    "position:fixed;left:6px;right:6px;bottom:6px;z-index:99998;max-height:38vh;overflow:auto;padding:8px 10px;border-radius:8px;background:rgba(12,24,8,0.92);color:#e8ffd0;font:11px/1.35 ui-monospace,Menlo,monospace;pointer-events:none;";
  hud.innerHTML =
    '<div style="font-weight:700;margin-bottom:4px">Voice debug · v' +
    CLIENT_BUILD +
    " · ?voiceDebug=1</div><div id=\"puffly-voice-debug-lines\"></div>";
  document.body.appendChild(hud);
  voiceDebugHudEl = hud;
  voiceDebugLog("debug_on", { ios: speechNeedsInteractionUnlock });
}

function updateVoiceDebugHud(entry) {
  if (!voiceDebugHudEl) {
    return;
  }
  const linesEl = voiceDebugHudEl.querySelector("#puffly-voice-debug-lines");
  if (!linesEl) {
    return;
  }
  const log = typeof window !== "undefined" ? window.__pufflyVoiceLog || [] : [];
  const tail = log.slice(-8);
  linesEl.textContent = tail
    .map((row) => {
      const clip = row.clipId || row.clip || "";
      const path = row.path || row.reason || "";
      const ev = row.event || "?";
      return `${row.ms}ms ${ev}${clip ? " " + clip : ""}${path ? " (" + path + ")" : ""}`;
    })
    .join("\n");
}

function pufflyVoiceDebugDump() {
  const log = typeof window !== "undefined" ? window.__pufflyVoiceLog || [] : [];
  console.table(log);
  return { build: CLIENT_BUILD, log, state: voiceDebugFriendState() };
}

function setInvitePageLock(roomCode) {
  const normalized = String(roomCode || "")
    .trim()
    .toUpperCase();
  if (!/^[A-Z0-9]{4,8}$/.test(normalized)) {
    return;
  }
  if (typeof document !== "undefined") {
    document.documentElement.dataset.inviteActive = "1";
    document.documentElement.dataset.inviteCode = normalized;
  }
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.sessionStorage?.setItem(INVITE_PAGE_LOCK_KEY, "1");
    window.sessionStorage?.setItem(INVITE_PAGE_LOCK_CODE_KEY, normalized);
  } catch {
    // Ignore.
  }
}

function clearInvitePageLock() {
  if (typeof document !== "undefined") {
    document.documentElement.removeAttribute("data-invite-active");
    document.documentElement.removeAttribute("data-invite-code");
  }
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.sessionStorage?.removeItem(INVITE_PAGE_LOCK_KEY);
    window.sessionStorage?.removeItem(INVITE_PAGE_LOCK_CODE_KEY);
  } catch {
    // Ignore.
  }
}

function isInvitePageLocked() {
  if (typeof document !== "undefined" && document.documentElement?.dataset?.inviteActive === "1") {
    return true;
  }
  if (typeof window === "undefined") {
    return false;
  }
  try {
    return window.sessionStorage?.getItem(INVITE_PAGE_LOCK_KEY) === "1";
  } catch {
    return false;
  }
}

function getInvitePageLockCode() {
  if (typeof document !== "undefined") {
    const fromDom = String(document.documentElement?.dataset?.inviteCode || "")
      .trim()
      .toUpperCase();
    if (/^[A-Z0-9]{4,8}$/.test(fromDom)) {
      return fromDom;
    }
  }
  if (typeof window === "undefined") {
    return "";
  }
  try {
    const fromStorage = String(window.sessionStorage?.getItem(INVITE_PAGE_LOCK_CODE_KEY) || "")
      .trim()
      .toUpperCase();
    return /^[A-Z0-9]{4,8}$/.test(fromStorage) ? fromStorage : "";
  } catch {
    return "";
  }
}

function inviteJoinStatusText(text) {
  const base = String(text || "");
  if (!isInvitePageLocked() && !isInviteJoinInProgress() && !readInviteParamsFromUrl().join) {
    return base;
  }
  return `${base} · v${CLIENT_BUILD}`;
}

function persistInviteJoinCode(code) {
  if (typeof window === "undefined") {
    return;
  }
  const normalized = String(code || "").trim().toUpperCase();
  if (!/^[A-Z0-9]{4,8}$/.test(normalized)) {
    return;
  }
  try {
    window.sessionStorage?.setItem(INVITE_JOIN_STORAGE_KEY, normalized);
  } catch {
    // Ignore private mode / quota failures.
  }
  try {
    window.localStorage?.setItem(INVITE_JOIN_LOCAL_KEY, normalized);
  } catch {
    // Ignore.
  }
}

function readPersistedInviteJoinCode() {
  if (typeof window === "undefined") {
    return "";
  }
  const readKey = (storage, key) => {
    if (!storage) {
      return "";
    }
    try {
      return String(storage.getItem(key) || "")
        .trim()
        .toUpperCase();
    } catch {
      return "";
    }
  };
  const fromSession = readKey(window.sessionStorage, INVITE_JOIN_STORAGE_KEY);
  if (/^[A-Z0-9]{4,8}$/.test(fromSession)) {
    return fromSession;
  }
  const fromLocal = readKey(window.localStorage, INVITE_JOIN_LOCAL_KEY);
  return /^[A-Z0-9]{4,8}$/.test(fromLocal) ? fromLocal : "";
}

function clearPersistedInviteJoinCode() {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.sessionStorage?.removeItem(INVITE_JOIN_STORAGE_KEY);
  } catch {
    // Ignore.
  }
  try {
    window.localStorage?.removeItem(INVITE_JOIN_LOCAL_KEY);
  } catch {
    // Ignore.
  }
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
  let join = (pick("join") || pick("room")).toUpperCase();
  if (!join) {
    const pathMatch = window.location.pathname.match(/\/join\/([a-z0-9]{4,8})\/?$/i);
    if (pathMatch) {
      join = pathMatch[1].toUpperCase();
    }
  }
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

/** True when the user opened the normal app URL without an invite or ?mode=friend. */
function isPlainPracticeLanding() {
  if (typeof window !== "undefined") {
    const search = new URLSearchParams(window.location.search);
    if (search.get("friendAttached") === "1") {
      return false;
    }
  }
  const invite = readInviteParamsFromUrl();
  return !invite.join && invite.mode !== "friend";
}

function isPracticeTableTestPwaBoot() {
  if (typeof window === "undefined") {
    return false;
  }
  const source = new URLSearchParams(window.location.search).get("source") || "";
  return source === "pwa-test" || source === "pwa-test-preview" || source === "pwa-skeleton";
}

function forceClearInviteStateForPracticeTestPwa() {
  if (!isPracticeTableTestPwaBoot()) {
    return;
  }
  clearInvitePageLock();
  clearPersistedInviteJoinCode();
  clearFriendJoinIntent();
  clearFriendPracticeBlocked();
  clearStoredFriendSession();
  if (typeof window !== "undefined") {
    window.__pufflyForceFriendLanding = false;
    window.__pufflyPendingInviteJoin = "";
    window.__pufflyFriendSessionStable = false;
    window.__pufflyInviteJoinInFlight = false;
    window.__pufflyPendingPlayMode = "";
    window.__pufflyUserChosePufflyMode = true;
  }
  try {
    window.sessionStorage?.removeItem(FRIEND_STABLE_SESSION_KEY);
  } catch {
    // ignore
  }
}

function getJoinCodeFromUrl() {
  const fromUrl = readInviteParamsFromUrl().join;
  if (fromUrl) {
    return fromUrl;
  }
  const intent = readFriendJoinIntent();
  if (intent?.roomCode) {
    return intent.roomCode;
  }
  if (typeof window !== "undefined") {
    const pending = String(window.__pufflyPendingInviteJoin || "").trim().toUpperCase();
    if (/^[A-Z0-9]{4,8}$/.test(pending)) {
      return pending;
    }
  }
  if (isFriendStablePersisted() || isFriendSessionStable()) {
    return readPersistedInviteJoinCode();
  }
  return "";
}

function getInviteJoinCodeForBootstrap() {
  const lockedCode = getInvitePageLockCode();
  if (lockedCode && (isInvitePageLocked() || isActiveInviteBootstrap())) {
    return lockedCode;
  }
  if (!isActiveInviteBootstrap() && !shouldAutoReconnectStoredFriendOnBoot()) {
    return "";
  }
  const fromUrl = getJoinCodeFromUrl();
  if (fromUrl) {
    return fromUrl;
  }
  const intent = readFriendJoinIntent();
  if (intent?.roomCode) {
    return intent.roomCode;
  }
  if (typeof window === "undefined") {
    return "";
  }
  const pending = String(window.__pufflyPendingInviteJoin || "").trim().toUpperCase();
  return /^[A-Z0-9]{4,8}$/.test(pending) ? pending : "";
}

function isFriendInviteLandingLocked() {
  return typeof window !== "undefined" && Boolean(window.__pufflyForceFriendLanding);
}

function lockFriendInviteLanding(roomCode) {
  const normalized = String(roomCode || "").trim().toUpperCase();
  if (!/^[A-Z0-9]{4,8}$/.test(normalized)) {
    return;
  }
  setInvitePageLock(normalized);
  primeInviteLandingFlags();
  if (typeof window !== "undefined") {
    window.__pufflyForceFriendLanding = true;
    window.__pufflyPendingInviteJoin = normalized;
  }
  practiceVoiceStartDismissed = true;
  markFriendJoinIntent(normalized);
}

/** True only when this page load is actually handling an invite join (URL, fresh intent, or in-flight join). */
function isActiveInviteBootstrap() {
  if (isInvitePageLocked()) {
    return true;
  }
  const invite = readInviteParamsFromUrl();
  if (invite.join) {
    return true;
  }
  if (readFriendJoinIntent()?.roomCode) {
    return true;
  }
  if (isInviteJoinInProgress()) {
    return true;
  }
  if (typeof window !== "undefined") {
    const pending = String(window.__pufflyPendingInviteJoin || "").trim().toUpperCase();
    if (/^[A-Z0-9]{4,8}$/.test(pending)) {
      return true;
    }
  }
  return false;
}

function shouldAutoReconnectStoredFriendOnBoot() {
  const stored = readStoredFriendSession();
  if (!stored?.roomCode || !stored?.playerId) {
    return false;
  }
  if (isActiveInviteBootstrap()) {
    return true;
  }
  return isFriendSessionStable() || isFriendStablePersisted();
}

function clearStaleInviteRecoveryStorage() {
  if (isInvitePageLocked() || isInviteJoinInProgress()) {
    return;
  }
  clearInvitePageLock();
  clearPersistedInviteJoinCode();
  clearFriendJoinIntent();
  clearFriendPracticeBlocked();
  clearStoredFriendSession();
  if (typeof window !== "undefined") {
    window.__pufflyForceFriendLanding = false;
    window.__pufflyPendingInviteJoin = "";
    window.__pufflyFriendSessionStable = false;
    window.__pufflyInviteJoinInFlight = false;
  }
  try {
    window.sessionStorage?.removeItem(FRIEND_STABLE_SESSION_KEY);
  } catch {
    // Ignore.
  }
}

function hasInviteLandingIntent() {
  return isActiveInviteBootstrap();
}

function shouldUseFriendLanding() {
  return hasInviteLandingIntent();
}

function isFriendSessionStable() {
  return (
    Boolean(remoteSession?.roomCode && remoteSession?.playerId) ||
    (typeof window !== "undefined" && Boolean(window.__pufflyFriendSessionStable))
  );
}

function isFriendPracticeBlocked() {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    return window.sessionStorage?.getItem(FRIEND_BLOCK_PRACTICE_KEY) === "1";
  } catch {
    return false;
  }
}

function markFriendPracticeBlocked() {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.sessionStorage?.setItem(FRIEND_BLOCK_PRACTICE_KEY, "1");
  } catch {
    // Ignore storage failures.
  }
}

function clearFriendPracticeBlocked() {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.sessionStorage?.removeItem(FRIEND_BLOCK_PRACTICE_KEY);
  } catch {
    // Ignore.
  }
}

function isFriendStablePersisted() {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    return window.sessionStorage?.getItem(FRIEND_STABLE_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

function markFriendJoinIntent(roomCode) {
  if (typeof window === "undefined") {
    return;
  }
  const normalized = String(roomCode || "").trim().toUpperCase();
  if (!/^[A-Z0-9]{4,8}$/.test(normalized)) {
    return;
  }
  const payload = JSON.stringify({ roomCode: normalized, at: Date.now() });
  try {
    window.sessionStorage?.setItem(FRIEND_JOIN_INTENT_KEY, payload);
  } catch {
    // Ignore private mode / quota failures.
  }
  try {
    window.localStorage?.setItem(FRIEND_JOIN_INTENT_LOCAL_KEY, payload);
  } catch {
    // Ignore.
  }
}

function parseFriendJoinIntentRaw(raw) {
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw);
    const roomCode = String(parsed?.roomCode || "")
      .trim()
      .toUpperCase();
    const at = Number(parsed?.at) || 0;
    if (!/^[A-Z0-9]{4,8}$/.test(roomCode)) {
      return null;
    }
    if (at && Date.now() - at > FRIEND_JOIN_INTENT_MAX_AGE_MS) {
      return null;
    }
    return { roomCode, at };
  } catch {
    return null;
  }
}

function readFriendJoinIntent() {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const fromSession = parseFriendJoinIntentRaw(
      window.sessionStorage?.getItem(FRIEND_JOIN_INTENT_KEY),
    );
    if (fromSession) {
      return fromSession;
    }
    return parseFriendJoinIntentRaw(window.localStorage?.getItem(FRIEND_JOIN_INTENT_LOCAL_KEY));
  } catch {
    return null;
  }
}

function clearFriendJoinIntent() {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.sessionStorage?.removeItem(FRIEND_JOIN_INTENT_KEY);
  } catch {
    // Ignore.
  }
  try {
    window.localStorage?.removeItem(FRIEND_JOIN_INTENT_LOCAL_KEY);
  } catch {
    // Ignore.
  }
}

/** True when this load must never cold-boot Practice (invite link, lock, or join in flight). */
function mustNeverColdBootPractice() {
  return (
    isInvitePageLocked() ||
    isActiveInviteBootstrap() ||
    isInviteJoinInProgress() ||
    Boolean(readFriendJoinIntent()?.roomCode) ||
    Boolean(getInvitePageLockCode())
  );
}

/** While an invite join is in flight, never drop back to Practice START. */
function mustStayOnFriendInviteUi() {
  if (remoteSession?.roomCode) {
    return false;
  }
  if (isInvitePageLocked()) {
    return true;
  }
  if (readInviteParamsFromUrl().join) {
    return true;
  }
  if (readFriendJoinIntent()?.roomCode) {
    return true;
  }
  return isInviteJoinInProgress();
}

function stopInviteGuestAttachPoll() {
  if (inviteGuestAttachPollTimer != null) {
    window.clearInterval(inviteGuestAttachPollTimer);
    inviteGuestAttachPollTimer = null;
  }
}

/** Poll attach when POST /join is slow but Mac already shows 2/2. */
function startInviteGuestAttachPoll(roomCode) {
  stopInviteGuestAttachPoll();
  const normalizedCode = String(roomCode || "")
    .trim()
    .toUpperCase();
  if (!/^[A-Z0-9]{4,8}$/.test(normalizedCode)) {
    return;
  }
  const startedAt = Date.now();
  const tick = async () => {
    if (remoteSession?.roomCode === normalizedCode) {
      stopInviteGuestAttachPoll();
      return;
    }
    if (inviteGuestRecoverInFlight) {
      return;
    }
    if (Date.now() - startedAt > 120000) {
      stopInviteGuestAttachPoll();
      setFriendStatus(
        inviteJoinStatusText(
          `Could not finish joining room ${normalizedCode}. Tap JOIN ROOM or open the invite link again.`,
        ),
      );
      return;
    }
    const elapsed = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
    setFriendStatus(inviteJoinStatusText(`Joining room ${normalizedCode}… (${elapsed}s)`));
    inviteGuestRecoverInFlight = true;
    try {
      const ok = await recoverInviteGuestSession(normalizedCode);
      if (ok) {
        stopInviteGuestAttachPoll();
        updateTeamMascot();
        if (!shouldDeferHeavyVoicePreload()) {
          preloadVoiceClips();
        }
      }
    } finally {
      inviteGuestRecoverInFlight = false;
    }
  };
  window.setTimeout(() => {
    void tick();
  }, 800);
  inviteGuestAttachPollTimer = window.setInterval(() => {
    void tick();
  }, 5000);
}

function shouldBlockPracticeColdBoot() {
  return (
    isInvitePageLocked() ||
    isActiveInviteBootstrap() ||
    isInviteJoinInProgress() ||
    Boolean(remoteSession?.roomCode)
  );
}

function markFriendSessionStable() {
  if (typeof window === "undefined" || !remoteSession?.roomCode) {
    return;
  }
  window.__pufflyFriendSessionStable = true;
  window.__pufflyForceFriendLanding = true;
  window.__pufflyUserChosePufflyMode = false;
  persistInviteJoinCode(remoteSession.roomCode);
  clearInvitePageLock();
  clearInviteParamsFromUrl();
  clearFriendJoinIntent();
  try {
    window.sessionStorage?.setItem(FRIEND_STABLE_SESSION_KEY, "1");
  } catch {
    // Ignore storage failures.
  }
}

/** Drop stale invite storage on normal app opens so Practice is not blocked. */
function syncInviteLandingOnBootstrap() {
  if (isPlainPracticeLanding()) {
    clearStaleInviteRecoveryStorage();
    if (typeof window !== "undefined") {
      window.__pufflyPendingPlayMode = "";
      window.__pufflyUserChosePufflyMode = true;
      window.__pufflyPendingInviteJoin = "";
      window.__pufflyForceFriendLanding = false;
    }
    return;
  }
  const invite = readInviteParamsFromUrl();
  if (invite.join) {
    lockFriendInviteLanding(invite.join);
    return;
  }
  const joinIntent = readFriendJoinIntent();
  if (joinIntent?.roomCode) {
    lockFriendInviteLanding(joinIntent.roomCode);
    return;
  }
  if (typeof window !== "undefined") {
    const pending = String(window.__pufflyPendingInviteJoin || "").trim().toUpperCase();
    if (/^[A-Z0-9]{4,8}$/.test(pending)) {
      lockFriendInviteLanding(pending);
      return;
    }
  }
  const stored = readStoredFriendSession();
  if (stored?.roomCode && stored?.playerId && shouldAutoReconnectStoredFriendOnBoot()) {
    lockFriendInviteLanding(stored.roomCode);
    return;
  }
  clearStaleInviteRecoveryStorage();
}

function primeInviteLandingFlags() {
  if (typeof window === "undefined") {
    return;
  }
  window.__pufflyUserChosePufflyMode = false;
  window.__pufflyPendingPlayMode = "friend";
}

let inviteJoinBootstrapPromise = null;
let inviteGuestAttachPollTimer = null;
let inviteGuestRecoverInFlight = false;

function shouldDeferHeavyVoicePreload() {
  return (
    isInvitePageLocked() ||
    isActiveInviteBootstrap() ||
    Boolean(readInviteParamsFromUrl().join) ||
    Boolean(readFriendJoinIntent()?.roomCode)
  );
}

function isInviteJoinInProgress() {
  return Boolean(
    inviteJoinBootstrapPromise ||
      (typeof window !== "undefined" && window.__pufflyInviteJoinInFlight),
  );
}

/** Guest invite join should show Green mascot before the server session is hydrated. */
function isInviteGuestLanding() {
  if (playMode !== "friend") {
    return false;
  }
  const code = getInviteJoinCodeForBootstrap();
  if (!code) {
    return false;
  }
  return !isFriendHostRoom(code);
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

/** Friend lobby / no-room puzzle: rebuild board at current difficulty (pre-flip). */
function rebuildFriendPuzzleLobbyState() {
  state = createStateForGame("puzzle");
  selectedPuzzlePieceId = "";
  moveHistory = [];
  undoSnapshots = [];
  winnerAnnounced = null;
  hideCelebration();
  puzzleTrayBootstrapAttempted = false;
  boardGeometryLockedAt = 0;
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

function isFriendPuzzleSizeHost() {
  if (!remoteSession?.roomCode) {
    return true;
  }
  if (isFriendRoomHostLocal() || remoteSession.color === "dark" || isLocalFriendHost(remoteSession)) {
    return true;
  }
  return false;
}

function isFriendPuzzleRoundComplete() {
  return isPuzzleComplete() || winnerAnnounced === "puzzle-complete";
}

function isFriendPuzzleMidGame() {
  return Boolean(state?.starterFlipDone) && !isFriendPuzzleRoundComplete();
}

function isFriendPuzzleSizeChangeWindow() {
  return (
    isStarterFlipPending() || isFriendPuzzleRoundComplete() || isFriendPuzzleMidGame()
  );
}

function isFriendPuzzleSizeLockedErrorMessage(message) {
  return /puzzle size is locked/i.test(String(message || ""));
}

function friendPuzzleSizeBlockedMessage() {
  if (!isFriendPuzzleSizeHost()) {
    return "Only Blue can change puzzle size.";
  }
  if (isFriendPuzzleRoundComplete()) {
    return "Pick Classic or Mega in Size — then tap FLIP to start.";
  }
  return "Pick a different size in the Size menu.";
}

function friendPuzzleSizeFailureMessage(error, options = {}) {
  const raw = String(error?.message || "Could not update puzzle size.").trim();
  if (isFriendPuzzleSizeLockedErrorMessage(raw)) {
    if (options.wasPuzzleComplete) {
      return "Couldn't switch size. Tap Play Again to start the next round.";
    }
    if (options.wasMidGameReset) {
      return "Couldn't switch size. Tap Play Again, then pick a new size.";
    }
    return "Could not update puzzle size. Try Play Again.";
  }
  return raw;
}

function friendPuzzleSizePendingConfirmMessage() {
  if (!friendPuzzleSizePendingConfirm) {
    return "";
  }
  const { nextLabel, currentLabel } = friendPuzzleSizePendingConfirm;
  return `Switch from ${currentLabel} to ${nextLabel}? Progress will be lost.`;
}

function refreshFriendPuzzleSizeConfirmChrome() {
  const show =
    Boolean(friendPuzzleSizePendingConfirm) &&
    playMode === "friend" &&
    selectedGameId === "puzzle" &&
    isFriendTableUiActive();
  if (friendPuzzleSizeConfirmBar) {
    friendPuzzleSizeConfirmBar.hidden = !show;
  }
  if (show && friendPuzzleSizeSwitchBtn && friendPuzzleSizeKeepBtn) {
    friendPuzzleSizeSwitchBtn.textContent = `Switch to ${friendPuzzleSizePendingConfirm.nextLabel}`;
    friendPuzzleSizeKeepBtn.textContent = `Keep ${friendPuzzleSizePendingConfirm.currentLabel}`;
  }
  if (typeof document !== "undefined") {
    document.body.classList.toggle("friend-puzzle-size-confirm-open", show);
  }
}

function clearFriendPuzzleSizePendingConfirm(options = {}) {
  friendPuzzleSizePendingConfirm = null;
  refreshFriendPuzzleSizeConfirmChrome();
  if (!options.skipRefresh) {
    refreshFriendSeatStatus();
  }
}

function beginFriendPuzzleSizePendingConfirm(nextDifficulty) {
  const nextLabel = getDifficultyLabel(nextDifficulty, "puzzle");
  const currentLabel = getDifficultyLabel(difficulty, "puzzle");
  friendPuzzleSizePendingConfirm = {
    nextDifficulty,
    nextLabel,
    currentLabel,
  };
  friendPuzzleSizeStatusLine = "";
  if (typeof window !== "undefined" && friendPuzzleSizeStatusTimer) {
    window.clearTimeout(friendPuzzleSizeStatusTimer);
    friendPuzzleSizeStatusTimer = 0;
  }
  updateFriendDifficultyButtons();
  refreshFriendPuzzleSizeConfirmChrome();
  refreshFriendSeatStatus();
  if (typeof window !== "undefined" && typeof window.pufflyClosePracticePillClusters === "function") {
    window.pufflyClosePracticePillClusters();
  }
}

function canChangeFriendPuzzleSize() {
  if (playMode !== "friend" || selectedGameId !== "puzzle") {
    return false;
  }
  return isFriendPuzzleSizeHost();
}

function setFriendPuzzleSizeStatus(text, durationMs = 6000) {
  const message = String(text || "").trim();
  clearFriendPuzzleSizePendingConfirm({ skipRefresh: true });
  friendPuzzleSizeStatusLine = message;
  if (typeof window !== "undefined" && friendPuzzleSizeStatusTimer) {
    window.clearTimeout(friendPuzzleSizeStatusTimer);
    friendPuzzleSizeStatusTimer = 0;
  }
  setFriendStatus(message, { skipRoomPrefix: true });
  refreshFriendSeatStatus();
  if (!message || durationMs <= 0 || typeof window === "undefined") {
    return;
  }
  friendPuzzleSizeStatusTimer = window.setTimeout(() => {
    if (friendPuzzleSizeStatusLine === message) {
      friendPuzzleSizeStatusLine = "";
      friendPuzzleSizeStatusTimer = 0;
      refreshFriendSeatStatus();
    }
  }, durationMs);
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
  } else if (playMode === "friend" && remoteSession && !remoteSession.ready) {
    starterFlipButton.textContent = "WAIT";
    starterFlipButton.setAttribute("aria-label", "Waiting for your friend to join");
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
  refreshFriendAvatarBand();
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
  if (practiceTableIsActive() && typeof window.pufflyRefreshPracticePillNavLabels === "function") {
    window.pufflyRefreshPracticePillNavLabels();
  }
}

function parseStoredFriendSessionRaw(raw) {
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw);
    const roomCode = String(parsed?.roomCode || "").trim().toUpperCase();
    const playerId = String(parsed?.playerId || "").trim();
    const gameType = normalizeGameId(String(parsed?.gameType || "").trim().toLowerCase());
    if (!roomCode || !playerId || playerId === "__pending__") {
      return null;
    }
    const color = parsed?.color === "dark" || parsed?.color === "light" ? parsed.color : undefined;
    return {
      roomCode,
      playerId,
      gameType: isKnownGame(gameType) ? gameType : DEFAULT_GAME_ID,
      color,
      hostPlayerId: parsed?.hostPlayerId,
      creatorPlayerId: parsed?.creatorPlayerId,
    };
  } catch {
    return null;
  }
}

function readStoredFriendSession() {
  if (typeof window === "undefined") {
    return null;
  }
  let fromLocal = null;
  try {
    fromLocal = window.localStorage?.getItem(FRIEND_SESSION_STORAGE_KEY) ?? null;
  } catch {
    fromLocal = null;
  }
  const parsedLocal = parseStoredFriendSessionRaw(fromLocal);
  if (parsedLocal) {
    return parsedLocal;
  }
  try {
    const fromSession = window.sessionStorage?.getItem(FRIEND_SESSION_SESSION_KEY) ?? null;
    return parseStoredFriendSessionRaw(fromSession);
  } catch {
    return null;
  }
}

/** Join/reconnect/poll may expose team color under different keys. */
function resolveFriendSessionColor(data) {
  const raw = data?.color ?? data?.yourColor;
  return raw === "dark" || raw === "light" ? raw : null;
}

function isLocalFriendHost(data) {
  const playerId = String(data?.playerId || "");
  const hostId = String(data?.hostPlayerId || data?.creatorPlayerId || "");
  return Boolean(playerId && hostId && playerId === hostId);
}

/** Blue = host / room creator; Green = guest (second joiner). */
function normalizeFriendSessionColor(data) {
  const resolved = resolveFriendSessionColor(data);
  if (resolved) {
    return resolved;
  }
  if (isLocalFriendHost(data)) {
    return "dark";
  }
  if ((data?.playerCount ?? 1) >= 2) {
    return "light";
  }
  return "dark";
}

function applyFriendSessionColor(data) {
  const playerId = String(data?.playerId || "");
  const hostId = String(data?.hostPlayerId || data?.creatorPlayerId || "");
  if (playerId && hostId) {
    if (playerId === hostId) {
      return "dark";
    }
    if ((data?.playerCount ?? 1) >= 2) {
      return "light";
    }
  }
  const resolved = resolveFriendSessionColor(data);
  if (resolved === "dark" && (data?.playerCount ?? 1) >= 2 && playerId && hostId && playerId !== hostId) {
    return "light";
  }
  if (resolved === "light" || resolved === "dark") {
    return resolved;
  }
  return normalizeFriendSessionColor(data);
}

function writeStoredFriendSession(session) {
  if (typeof window === "undefined" || !session?.roomCode || !session?.playerId) {
    return;
  }
  const payload = {
    roomCode: session.roomCode,
    playerId: session.playerId,
    gameType: normalizeGameId(session.gameType || selectedGameId || DEFAULT_GAME_ID),
    version: typeof session.version === "number" ? session.version : undefined,
    color: session.color === "dark" || session.color === "light" ? session.color : undefined,
    hostPlayerId: session.hostPlayerId,
    creatorPlayerId: session.creatorPlayerId,
  };
  const serialized = JSON.stringify(payload);
  try {
    window.localStorage?.setItem(FRIEND_SESSION_STORAGE_KEY, serialized);
  } catch {
    // Ignore storage failures (private mode, quota, etc).
  }
  try {
    window.sessionStorage?.setItem(FRIEND_SESSION_SESSION_KEY, serialized);
  } catch {
    // Ignore.
  }
}

function clearStoredFriendSession(options = {}) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage?.removeItem(FRIEND_SESSION_STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }
  try {
    window.sessionStorage?.removeItem(FRIEND_SESSION_SESSION_KEY);
  } catch {
    // Ignore.
  }
  if (!options.keepRecoveryFlags) {
    try {
      window.sessionStorage?.removeItem(FRIEND_STABLE_SESSION_KEY);
    } catch {
      // Ignore.
    }
    clearFriendJoinIntent();
  }
}

function rememberLastFriendRoomCode(roomCode) {
  const code = String(roomCode || "").trim().toUpperCase();
  if (!code) {
    return;
  }
  if (roomCodeInput) {
    roomCodeInput.value = code;
  }
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }
  try {
    window.localStorage.setItem(FRIEND_LAST_ROOM_CODE_KEY, code);
  } catch {
    // Ignore storage failures.
  }
}

function readLastFriendRoomCode() {
  const fromInput = String(roomCodeInput?.value || "")
    .trim()
    .toUpperCase();
  if (fromInput) {
    return fromInput;
  }
  if (typeof window === "undefined" || !window.localStorage) {
    return "";
  }
  try {
    return String(window.localStorage.getItem(FRIEND_LAST_ROOM_CODE_KEY) || "")
      .trim()
      .toUpperCase();
  } catch {
    return "";
  }
}

function readFriendHostRooms() {
  if (typeof window === "undefined" || !window.localStorage) {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(FRIEND_HOST_ROOMS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .map((code) => String(code || "").trim().toUpperCase())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function markFriendHostRoom(roomCode) {
  const code = String(roomCode || "").trim().toUpperCase();
  if (!code || typeof window === "undefined" || !window.localStorage) {
    return;
  }
  const rooms = new Set(readFriendHostRooms());
  rooms.add(code);
  try {
    window.localStorage.setItem(FRIEND_HOST_ROOMS_KEY, JSON.stringify([...rooms]));
  } catch {
    // Ignore storage failures.
  }
}

function isFriendHostRoom(roomCode) {
  const code = String(roomCode || "").trim().toUpperCase();
  return Boolean(code && readFriendHostRooms().includes(code));
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
  if (isInvitePageLocked() || isInviteJoinInProgress()) {
    triedStoredFriendReconnect = false;
    reconnectingStoredFriendSession = false;
    return;
  }
  if (!shouldBlockPracticeColdBoot()) {
    remoteSession = null;
    friendInviteShareReady = false;
    friendUndoAvailable = false;
    pendingJoinIntroTeam = "";
    clearStoredFriendSession();
    if (roomCodeInput) {
      roomCodeInput.value = "";
    }
  }
  triedStoredFriendReconnect = false;
  reconnectingStoredFriendSession = false;
}

function enterFriendLobbyChrome(options = {}) {
  playMode = "friend";
  practiceVoiceStartDismissed = true;
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
      setPufflyState("idle", "🤝 Tap OPEN GAME ROOM above to start.");
      if (!remoteSession) {
        bootFriendLobbyVoiceIfNeeded({ fromGesture: canAutoplayFriendLobbyOnDesktop() });
      }
    }
  }
  updateTeamMascot();
}

async function runBootstrapInviteJoin(roomCode) {
  const normalizedCode = String(roomCode || "")
    .trim()
    .toUpperCase();
  if (!normalizedCode) {
    return false;
  }
  if (!isFriendHostRoom(normalizedCode)) {
    applyInviteLandingConfig();
    redirectToGuestJoinPage(normalizedCode);
    return true;
  }
  if (
    remoteSession?.roomCode === normalizedCode &&
    resolveFriendSessionColor(remoteSession)
  ) {
    updateTeamMascot();
    return true;
  }
  lockFriendInviteLanding(normalizedCode);
  markFriendJoinIntent(normalizedCode);
  if (typeof window !== "undefined") {
    window.__pufflyInviteJoinInFlight = true;
    window.__pufflyPendingInviteJoin = normalizedCode;
    window.__pufflyUserChosePufflyMode = false;
    window.__pufflyPendingPlayMode = "friend";
    if (typeof window.pufflyApplyPlayModeChrome === "function") {
      window.pufflyApplyPlayModeChrome("friend");
    }
  }
  try {
    enterFriendLobbyChrome({ joiningCode: normalizedCode });
    applyInviteLandingConfig();
    updateGameButtons();
    updateDifficultyButtonLabels();
    updateFriendDifficultyButtons();
    updateAppTitle();
    if (!remoteSession || remoteSession.roomCode !== normalizedCode) {
      resetLocalGameState(selectedGameId);
      const cached = readStoredFriendSession();
      if (cached?.roomCode !== normalizedCode) {
        clearStoredFriendSession();
      }
      stopRoomPolling();
      remoteSession = null;
    }
    if (roomCodeInput) {
      roomCodeInput.value = normalizedCode;
    }
    setFriendStatus(inviteJoinStatusText(`Joining room ${normalizedCode}...`));
    preloadVoiceClips({ minimal: true });
    startInviteGuestAttachPoll(normalizedCode);
    void joinRoomWithCode(normalizedCode, {
      fromInvite: true,
      skipModeSetup: true,
      preferFreshJoin: false,
    })
      .then((joined) => {
        if (joined) {
          stopInviteGuestAttachPoll();
          updateTeamMascot();
        }
      })
      .catch((error) => {
        console.warn("[puffly] invite join POST", CLIENT_BUILD, error);
      });
    return true;
  } finally {
    if (typeof window !== "undefined") {
      window.__pufflyInviteJoinInFlight = false;
    }
    if (remoteSession) {
      stopInviteGuestAttachPoll();
      if (typeof window !== "undefined") {
        window.__pufflyPendingPlayMode = "";
        window.__pufflyPendingJoinRoom = false;
      }
      syncPlayModeChrome();
      updateTeamMascot();
      updateSpeechUnlockOverlay();
    } else {
      playMode = "friend";
      practiceVoiceStartDismissed = true;
      lockFriendInviteLanding(normalizedCode);
      markFriendJoinIntent(normalizedCode);
      syncPlayModeChrome();
      updateSpeechUnlockOverlay();
      if (typeof window !== "undefined") {
        window.__pufflyPendingPlayMode =
          window.__pufflyPendingPlayMode === "puffly" ? "" : window.__pufflyPendingPlayMode;
      }
    }
  }
}

function bootstrapInviteJoin(roomCode) {
  const normalizedCode = String(roomCode || "")
    .trim()
    .toUpperCase();
  if (!normalizedCode) {
    return Promise.resolve(false);
  }
  if (inviteJoinBootstrapPromise) {
    return inviteJoinBootstrapPromise;
  }
  inviteJoinBootstrapPromise = runBootstrapInviteJoin(normalizedCode).finally(() => {
    inviteJoinBootstrapPromise = null;
  });
  return inviteJoinBootstrapPromise;
}

function maybeAutoJoinFromInviteLink() {
  if (remoteSession || isGuestAttachedBoot()) {
    return;
  }
  const join = String(
    getJoinCodeFromUrl() ||
      getInvitePageLockCode() ||
      readFriendJoinIntent()?.roomCode ||
      (typeof window !== "undefined" ? window.__pufflyPendingInviteJoin : "") ||
      "",
  )
    .trim()
    .toUpperCase();
  if (!/^[A-Z0-9]{4,8}$/.test(join) || isFriendHostRoom(join)) {
    return;
  }
  redirectGuestInviteToJoinPage();
}

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

let lastPracticeTableChromeKey = "";
let friendModeTrayLayoutSyncRaf = 0;
/** True after one-shot Friend DOM flatten (avoids tray/DOM work on every render/poll). */
let friendPracticeDomFlattened = false;
let friendPracticeDomFlattenInFlight = false;

function practiceTableUiStoredEnabled() {
  if (typeof window === "undefined" || !window.localStorage) {
    return false;
  }
  try {
    return window.localStorage.getItem("puffly.tableUi") === "1";
  } catch {
    return false;
  }
}

function clearPracticeTableViewportInlineStyles() {
  if (typeof document === "undefined") {
    return;
  }
  document.documentElement.style.width = "";
  document.documentElement.style.height = "";
  document.body.style.width = "";
  document.body.style.height = "";
  practiceTableClearFrameInsetVars();
  document.documentElement.style.removeProperty("--practice-nav-band-top");
  document.documentElement.style.removeProperty("--practice-nav-band-bottom");
}

function clearPracticeTableTrayInlineStyles() {
  if (typeof document === "undefined") {
    return;
  }
  const cluster = document.getElementById("practice-play-cluster");
  cluster?.style.removeProperty("--practice-mini-group-shift-x");
  const captures = document.querySelector("#game-board-matrix .board-and-captures");
  captures?.style.removeProperty("--practice-board-height");
  captures?.style.removeProperty("--practice-mini-group-shift-x");
  captures?.style.removeProperty("left");
  captures?.style.removeProperty("transform");
  document.getElementById("game-board-matrix")?.style.removeProperty("transform");
  clearPracticeTableFootprintVars();
  const trays = document.querySelectorAll("#game-board-matrix .captured-tray");
  for (const tray of trays) {
    tray.style.height = "";
    tray.style.maxHeight = "";
  }
  for (const pileId of ["blue-captured-pile", "green-captured-pile"]) {
    document.getElementById(pileId)?.style.removeProperty("--puzzle-tray-piece-size");
  }
}

function clearPracticeTableBoardInlineGeometry() {
  if (!boardElement) {
    return;
  }
  boardElement.style.removeProperty("width");
  boardElement.style.removeProperty("height");
  boardElement.style.removeProperty("grid-template-columns");
  boardElement.style.removeProperty("grid-template-rows");
  boardElement.style.removeProperty("aspect-ratio");
  boardElement.style.removeProperty("max-width");
  boardElement.style.removeProperty("min-width");
  boardElement.style.removeProperty("min-height");
  boardElement.style.removeProperty("max-height");
  boardElement.style.removeProperty("align-content");
  void boardElement.offsetHeight;
}

/** v451: clear orientation-specific inline layout (no generation bump). */
function clearPracticeTableOrientationLayoutState() {
  if (typeof document === "undefined" || !practiceTableIsActive()) {
    return;
  }
  clearPracticeTableBoardInlineGeometry();
  clearPracticeTablePufflyBoardAnchor();
  clearPracticeTablePuzzleMiniLandscapeGroupCenter();
  clearPracticeTablePuzzleLandscapeVars();
  clearPracticeTableTrayInlineStyles();
}

/** v450/v451: bump generation + clear before orientation relayout. */
function resetPracticeTableOrientationLayoutState() {
  if (typeof document === "undefined") {
    return;
  }
  practiceTableLayoutPassGeneration += 1;
  lastPracticeTableOrientationChangeAt = Date.now();
  clearPracticeTableOrientationLayoutState();
}

function practiceTableOrientationRelayoutPass() {
  if (isRulesPanelBlockingTableRelayout()) {
    return;
  }
  if (typeof document !== "undefined" && practiceTableIsActive()) {
    clearPracticeTableOrientationLayoutState();
    boardGeometryLockedAt = 0;
  }
  if (typeof document === "undefined" || !practiceTableIsActive()) {
    lockBoardGeometry(true);
    return;
  }
  syncPracticeTableLayoutVarsFromDom();
  lockBoardGeometry(true);
  if (playMode !== "friend") {
    render(lastStatusMessage);
  }
}

function schedulePracticeTableOrientationRelayout() {
  if (typeof window === "undefined") {
    return;
  }
  if (boardGeometryResizeTimer) {
    clearTimeout(boardGeometryResizeTimer);
    boardGeometryResizeTimer = null;
  }
  if (practiceTableOrientationRelayoutTimer) {
    clearTimeout(practiceTableOrientationRelayoutTimer);
    practiceTableOrientationRelayoutTimer = null;
  }
  if (typeof document !== "undefined" && document.body.classList.contains("practice-table-layout")) {
    document.documentElement.style.width = "100%";
    document.body.style.width = "100%";
  }
  resetPracticeTableOrientationLayoutState();
  boardGeometryLockedAt = 0;
  const passGeneration = practiceTableLayoutPassGeneration;
  practiceTableOrientationRelayoutPass();
  window.requestAnimationFrame(() => {
    if (passGeneration !== practiceTableLayoutPassGeneration) {
      return;
    }
    practiceTableOrientationRelayoutPass();
    window.requestAnimationFrame(() => {
      if (passGeneration !== practiceTableLayoutPassGeneration) {
        return;
      }
      practiceTableOrientationRelayoutPass();
    });
  });
  practiceTableOrientationRelayoutTimer = setTimeout(() => {
    practiceTableOrientationRelayoutTimer = null;
    if (passGeneration !== practiceTableLayoutPassGeneration) {
      return;
    }
    practiceTableOrientationRelayoutPass();
  }, PRACTICE_TABLE_ORIENTATION_RELAYOUT_DEFER_MS);
}

function isFriendModeUiActive() {
  return (
    playMode === "friend" ||
    (typeof document !== "undefined" && document.body.classList.contains("friend-mode"))
  );
}

function clearPracticeTablePufflyBoardAnchor() {
  const dealerUnit = document.getElementById("puffly-dealer-unit");
  dealerUnit?.style.removeProperty("--practice-puffly-shift-x");
  dealerUnit?.style.removeProperty("--practice-puffly-shift-y");
  dealerUnit?.style.removeProperty("--practice-puffly-arm-offset-y");
}

function practiceTablePuzzleMiniLandscapeGroupCenterActive() {
  return (
    practiceTableIsActive() &&
    selectedGameId === "puzzle" &&
    practiceTableIsLandscapeTablet() &&
    getPuzzleGridSizeFromState().rows === 2
  );
}

function clearPracticeTablePuzzleMiniLandscapeGroupCenter() {
  const cluster = document.getElementById("practice-play-cluster");
  cluster?.style.removeProperty("--practice-mini-group-shift-x");
  const captures = document.querySelector("#game-board-matrix .board-and-captures");
  captures?.style.removeProperty("--practice-mini-group-shift-x");
}

function practiceTableMiniLandscapeGroupShiftPx(captures, scene, board) {
  const sceneRect = scene.getBoundingClientRect();
  const capturesRect = captures.getBoundingClientRect();
  if (sceneRect.width <= 0 || capturesRect.width <= 0) {
    return 0;
  }
  const leftGap = capturesRect.left - sceneRect.left;
  const rightGap = sceneRect.right - capturesRect.right;
  const gapShift = Math.round((rightGap - leftGap) / 2);

  const boardRect = board?.getBoundingClientRect();
  const seatRow = document.getElementById("player-seat-row");
  let seatShift = 0;
  if (boardRect && boardRect.width > 0 && seatRow) {
    const seatRect = seatRow.getBoundingClientRect();
    const seatCenterX = seatRect.left + seatRect.width / 2;
    const boardCenterX = boardRect.left + boardRect.width / 2;
    seatShift = Math.round(seatCenterX - boardCenterX);
  }

  if (Math.abs(rightGap - leftGap) >= 2) {
    return gapShift;
  }
  if (Math.abs(seatShift) >= 1) {
    return seatShift;
  }
  const sceneCenterX = sceneRect.left + sceneRect.width / 2;
  const anchorCenterX =
    boardRect && boardRect.width > 0
      ? boardRect.left + boardRect.width / 2
      : capturesRect.left + capturesRect.width / 2;
  return Math.round(sceneCenterX - anchorCenterX);
}

function syncPracticeTablePuzzleMiniLandscapeGroupCenter() {
  if (!practiceTablePuzzleMiniLandscapeGroupCenterActive()) {
    clearPracticeTablePuzzleMiniLandscapeGroupCenter();
    return;
  }
  const cluster = document.getElementById("practice-play-cluster");
  const captures = document.querySelector("#game-board-matrix .board-and-captures");
  const scene = document.getElementById("practice-table-scene");
  const board = boardElement;
  if (!cluster || !captures || !scene) {
    return;
  }
  cluster.style.setProperty("--practice-mini-group-shift-x", "0px");
  void cluster.offsetHeight;
  const delta = practiceTableMiniLandscapeGroupShiftPx(captures, scene, board);
  if (Math.abs(delta) < 1) {
    cluster.style.removeProperty("--practice-mini-group-shift-x");
    return;
  }
  cluster.style.setProperty("--practice-mini-group-shift-x", `${delta}px`);
}

function syncPracticeTablePuzzleLandscapeCharacterLayout() {
  syncPracticeTablePuzzleMiniLandscapeGroupCenter();
  syncPracticeTablePufflyBoardAnchor();
  syncPracticeTablePufflyBodyLift();
}

function schedulePracticeTablePuzzleLandscapeCharacterLayout() {
  const passGeneration = practiceTableLayoutPassGeneration;
  syncPracticeTablePuzzleLandscapeCharacterLayout();
  window.requestAnimationFrame(() => {
    if (
      passGeneration !== practiceTableLayoutPassGeneration ||
      !practiceTableIsActive()
    ) {
      return;
    }
    syncPracticeTablePuzzleLandscapeCharacterLayout();
    window.requestAnimationFrame(() => {
      if (
        passGeneration !== practiceTableLayoutPassGeneration ||
        !practiceTableIsActive()
      ) {
        return;
      }
      syncPracticeTablePuzzleLandscapeCharacterLayout();
    });
  });
}

const PRACTICE_PUZZLE_LANDSCAPE_ARM_BOARD_GAP_PX = 10;
const PRACTICE_PUZZLE_LANDSCAPE_BODY_LIFT_BASE_PX = -14;
const PRACTICE_PUZZLE_LANDSCAPE_BODY_LIFT_MAX_PX = -22;
const PRACTICE_PUZZLE_MINI_LANDSCAPE_ARM_BOARD_GAP_PX = 12;
const PRACTICE_PUZZLE_MINI_LANDSCAPE_BODY_LIFT_BASE_PX = -18;
const PRACTICE_PUZZLE_MINI_LANDSCAPE_BODY_LIFT_MAX_PX = -38;

function syncPracticeTablePufflyBodyLift() {
  if (
    !practiceTableIsActive() ||
    selectedGameId !== "puzzle" ||
    !practiceTableIsLandscapeTablet()
  ) {
    return;
  }
  const dealerUnit = document.getElementById("puffly-dealer-unit");
  const arm = document.querySelector("#rive-character-host .puffly-skeleton-arm");
  const board = boardElement;
  if (!dealerUnit || !arm || !board?.classList.contains("puzzle-board")) {
    return;
  }
  const isMini = practiceTablePuzzleMiniLandscapeGroupCenterActive();
  const armBoardGapPx = isMini
    ? PRACTICE_PUZZLE_MINI_LANDSCAPE_ARM_BOARD_GAP_PX
    : PRACTICE_PUZZLE_LANDSCAPE_ARM_BOARD_GAP_PX;
  const bodyLiftBasePx = isMini
    ? PRACTICE_PUZZLE_MINI_LANDSCAPE_BODY_LIFT_BASE_PX
    : PRACTICE_PUZZLE_LANDSCAPE_BODY_LIFT_BASE_PX;
  const bodyLiftMaxPx = isMini
    ? PRACTICE_PUZZLE_MINI_LANDSCAPE_BODY_LIFT_MAX_PX
    : PRACTICE_PUZZLE_LANDSCAPE_BODY_LIFT_MAX_PX;
  dealerUnit.style.removeProperty("--practice-puffly-arm-offset-y");
  dealerUnit.style.setProperty("--practice-puffly-shift-y", `${bodyLiftBasePx}px`);
  void arm.offsetHeight;
  const armRect = arm.getBoundingClientRect();
  const boardRect = board.getBoundingClientRect();
  if (armRect.height <= 0 || boardRect.height <= 0) {
    return;
  }
  const currentGap = boardRect.top - armRect.bottom;
  let shiftY = bodyLiftBasePx;
  if (currentGap < armBoardGapPx) {
    shiftY = Math.max(
      bodyLiftMaxPx,
      shiftY + Math.round(currentGap - armBoardGapPx),
    );
  }
  dealerUnit.style.setProperty("--practice-puffly-shift-y", `${shiftY}px`);
}

function syncPracticeTablePufflyBoardAnchor() {
  if (
    !practiceTableIsActive() ||
    selectedGameId !== "puzzle" ||
    !practiceTableIsLandscapeTablet()
  ) {
    clearPracticeTablePufflyBoardAnchor();
    return;
  }
  const dealerUnit = document.getElementById("puffly-dealer-unit");
  const board = boardElement;
  if (!dealerUnit || !board?.classList.contains("puzzle-board")) {
    clearPracticeTablePufflyBoardAnchor();
    return;
  }
  const anchorEl = board;
  const dealerRect = dealerUnit.getBoundingClientRect();
  const anchorRect = anchorEl.getBoundingClientRect();
  if (dealerRect.width <= 0 || anchorRect.width <= 0) {
    return;
  }
  let pufflyCenterX = dealerRect.left + dealerRect.width / 2;
  if (practiceTablePuzzleMiniLandscapeGroupCenterActive()) {
    const torso = document.querySelector("#puffly-torso-layer .puffly-skeleton-torso");
    const torsoRect = torso?.getBoundingClientRect();
    if (torsoRect && torsoRect.width > 0) {
      pufflyCenterX = torsoRect.left + torsoRect.width / 2;
    }
  }
  const anchorCenterX = anchorRect.left + anchorRect.width / 2;
  const delta = Math.round(anchorCenterX - pufflyCenterX);
  if (Math.abs(delta) < 1) {
    clearPracticeTablePufflyBoardAnchor();
    return;
  }
  dealerUnit.style.setProperty("--practice-puffly-shift-x", `${delta}px`);
}

function syncPracticeTableTrayHeights() {
  if (!practiceTableIsActive() || !boardElement) {
    return;
  }
  const boardWrap = boardElement.parentElement;
  if (!boardWrap) {
    return;
  }
  const captures = boardWrap.closest(".board-and-captures");
  let boardHeight;
  if (practiceTableIsLandscapeTablet() && selectedGameId === "puzzle") {
    boardHeight = Math.round(boardElement.getBoundingClientRect().height);
  } else if (
    practiceTableIsLandscapeTablet() &&
    (selectedGameId === "checkers" || selectedGameId === "fourinarow")
  ) {
    boardHeight = Math.round(boardElement.getBoundingClientRect().height);
  } else if (practiceTableIsLandscapeTablet()) {
    boardHeight = Math.round(boardWrap.getBoundingClientRect().height);
  } else {
    boardHeight = Math.round(
      boardElement.getBoundingClientRect().height || boardWrap.getBoundingClientRect().height,
    );
  }
  if (practiceTableFootprintUnificationActive() && captures) {
    const footprintHeight = Number.parseFloat(
      captures.style.getPropertyValue("--practice-footprint-board-height"),
    );
    if (footprintHeight > 0 && selectedGameId !== "fourinarow") {
      boardHeight = Math.round(footprintHeight);
    }
  }
  if (boardHeight <= 0) {
    return;
  }
  if (captures) {
    captures.style.setProperty("--practice-board-height", `${boardHeight}px`);
  }
  const trays = document.querySelectorAll("#game-board-matrix .captured-tray");
  for (const tray of trays) {
    tray.style.height = `${boardHeight}px`;
    tray.style.maxHeight = `${boardHeight}px`;
  }
}

function syncFriendModeTrayHeights() {
  if (!isFriendModeUiActive() || !boardElement) {
    return;
  }
  const boardWrap = boardElement.parentElement;
  if (!boardWrap) {
    return;
  }
  const boardHeight = Math.round(boardWrap.getBoundingClientRect().height);
  if (boardHeight <= 0) {
    return;
  }
  const trayHeight = Math.max(1, Math.round(boardHeight * FRIEND_MODE_TRAY_HEIGHT_FACTOR));
  const trays = document.querySelectorAll("#game-board-matrix .captured-tray");
  for (const tray of trays) {
    tray.style.height = `${trayHeight}px`;
    tray.style.maxHeight = `${trayHeight}px`;
  }
}

function syncFriendModePuzzleTrayPieceSizes() {
  if (!isFriendModeUiActive() || selectedGameId !== "puzzle") {
    return;
  }
  const { rows, cols } = getPuzzleGridSizeFromState();
  const targetVisible = practiceTablePuzzleTrayTargetVisible(rows);
  const fallbackPieceCount = practiceTablePuzzleTrayPieceCount(rows, cols);
  for (const pileId of ["blue-captured-pile", "green-captured-pile"]) {
    const pile = document.getElementById(pileId);
    if (!pile) {
      continue;
    }
    const pileComputed = window.getComputedStyle(pile);
    const padLeft = Number.parseFloat(pileComputed.paddingLeft) || 0;
    const padRight = Number.parseFloat(pileComputed.paddingRight) || 0;
    const innerWidth = Math.max(0, pile.clientWidth - padLeft - padRight);
    const innerHeight = practiceTablePuzzleTrayViewportHeight(pile, pileComputed);
    const pieceCount = pile.querySelectorAll(".puzzle-piece").length || fallbackPieceCount;
    const slotCount = Math.max(1, Math.min(pieceCount, targetVisible));
    const gapPx = Number.parseFloat(pileComputed.gap) || Number.parseFloat(pileComputed.rowGap) || 0;
    const fromHeight = Math.max(
      1,
      Math.floor((innerHeight - gapPx * (slotCount - 1)) / slotCount),
    );
    let pieceSize = Math.min(innerWidth, fromHeight);
    if (fromHeight >= MIN_TOUCH_CELL_PX) {
      pieceSize = Math.max(MIN_TOUCH_CELL_PX, pieceSize);
    } else {
      pieceSize = Math.max(1, pieceSize);
    }
    if (pieceSize > 0) {
      pile.style.setProperty("--puzzle-tray-piece-size", `${pieceSize}px`);
    }
  }
}

function scheduleFriendModeTrayLayoutSync() {
  if (!isFriendModeUiActive() || isFriendTableUiActive()) {
    return;
  }
  if (friendModeTrayLayoutSyncRaf) {
    return;
  }
  friendModeTrayLayoutSyncRaf = window.requestAnimationFrame(() => {
    friendModeTrayLayoutSyncRaf = 0;
    if (!isFriendModeUiActive() || isFriendTableUiActive()) {
      return;
    }
    syncFriendModeTrayHeights();
    syncFriendModePuzzleTrayPieceSizes();
    window.requestAnimationFrame(() => {
      if (!isFriendModeUiActive() || isFriendTableUiActive()) {
        return;
      }
      syncFriendModeTrayHeights();
      syncFriendModePuzzleTrayPieceSizes();
    });
  });
}

/** Cap tray height so portrait Puzzle trays never overlap the bottom seat pill. */
function clampPracticeTableTraysAboveSeatBar() {
  if (!practiceTableIsActive() || !boardElement) {
    return;
  }
  const seat = document.getElementById("player-seat-row");
  if (!seat) {
    return;
  }
  const seatTop = seat.getBoundingClientRect().top;
  const gapPx = 10;
  const trays = document.querySelectorAll("#game-board-matrix .captured-tray");
  for (const tray of trays) {
    const trayTop = tray.getBoundingClientRect().top;
    const maxH = Math.floor(seatTop - trayTop - gapPx);
    if (maxH <= 0) {
      continue;
    }
    const current =
      Number.parseFloat(tray.style.height) || tray.getBoundingClientRect().height;
    if (current > maxH) {
      tray.style.height = `${maxH}px`;
      tray.style.maxHeight = `${maxH}px`;
    }
  }
}

/** Align avatar band columns/width with board+trays so mascots sit over tray centers. */
function syncFriendAvatarBandToTrays() {
  const band = document.getElementById("friend-avatar-band");
  if (!band) {
    return;
  }
  if (!isFriendTableUiActive()) {
    band.style.removeProperty("width");
    band.style.removeProperty("grid-template-columns");
    band.style.removeProperty("column-gap");
    band.style.removeProperty("row-gap");
    band.style.removeProperty("gap");
    return;
  }
  const captures = document.querySelector("#game-board-matrix .board-and-captures");
  if (!captures) {
    return;
  }
  const rect = captures.getBoundingClientRect();
  if (rect.width <= 0) {
    return;
  }
  const cs = window.getComputedStyle(captures);
  band.style.width = `${Math.round(rect.width)}px`;
  band.style.gridTemplateColumns = cs.gridTemplateColumns;
  band.style.columnGap = cs.columnGap || cs.gap || "0.35rem";
}

/** Friend table UI: Practice board-based trays + landscape centering (not legacy wrap height). */
function syncFriendTableTrayLayout() {
  if (!isFriendTableUiActive() || !boardElement) {
    return;
  }
  syncPracticeTableTrayHeights();
  clampPracticeTableTraysAboveSeatBar();
  if (selectedGameId === "puzzle") {
    syncFriendModePuzzleTrayPieceSizes();
  }
  if (practiceTableIsLandscapeTablet()) {
    schedulePracticeTablePuzzleLandscapeCharacterLayout();
  }
  syncFriendAvatarBandToTrays();
}

function finalizeBoardGeometryLock() {
  boardGeometryLockedAt = Date.now();
  if (isFriendTableUiActive()) {
    syncFriendTableTrayLayout();
    window.requestAnimationFrame(() => {
      if (isFriendTableUiActive()) {
        syncFriendTableTrayLayout();
      }
    });
    return;
  }
  if (isFriendModeUiActive()) {
    scheduleFriendModeTrayLayoutSync();
    return;
  }
  if (practiceTableIsActive()) {
    syncPracticeTableTrayHeights();
    schedulePracticeTablePuzzleLandscapeCharacterLayout();
    window.requestAnimationFrame(() => {
      if (practiceTableIsActive()) {
        syncPracticeTableTrayHeights();
        clampPracticeTableTraysAboveSeatBar();
      }
    });
  }
}

function friendTableUiEnabled() {
  return practiceTableUiStoredEnabled();
}

function syncFriendPracticeDomFlattenOnce() {
  if (friendPracticeDomFlattened || friendPracticeDomFlattenInFlight) {
    return;
  }
  friendPracticeDomFlattenInFlight = true;
  friendPracticeDomFlattened = true;
  try {
    if (typeof window.pufflyClosePracticeSetupTray === "function") {
      window.pufflyClosePracticeSetupTray();
    }
    if (typeof window.pufflySyncPracticeTableDom === "function") {
      window.pufflySyncPracticeTableDom({ useTableLayout: false, friendMode: true });
    }
  } finally {
    friendPracticeDomFlattenInFlight = false;
  }
}

/** Keep puzzle/four-in-a-row body hooks in sync outside renderUi (Friend table layout). */
function syncSelectedGameBodyClasses() {
  if (typeof document === "undefined") {
    return;
  }
  document.body.classList.toggle("puzzle-game", selectedGameId === "puzzle");
  document.body.classList.toggle("fourinarow-game", selectedGameId === "fourinarow");
}

/** Stage 1: Friend uses practice-table pill chrome when tableUi is on; else legacy flatten. */
function applyFriendTableLayoutIfEnabled() {
  if (typeof document === "undefined") {
    return;
  }
  document.body.classList.remove("practice-table-initializing", "practice-setup-tray-open");
  syncSelectedGameBodyClasses();
  if (!friendTableUiEnabled()) {
    document.body.classList.remove("practice-table-layout");
    clearPracticeTableViewportInlineStyles();
    clearPracticeTableTrayInlineStyles();
    lastPracticeTableChromeKey = "off";
    if (!friendPracticeDomFlattened) {
      syncFriendPracticeDomFlattenOnce();
    }
    refreshFriendRoomPill();
    refreshFriendVoicePill();
    return;
  }
  friendPracticeDomFlattened = false;
  document.body.classList.add("practice-table-layout");
  if (lastPracticeTableChromeKey === "friend-play") {
    refreshFriendRoomPill();
    refreshFriendVoicePill();
    return;
  }
  lastPracticeTableChromeKey = "friend-play";
  if (typeof window.pufflySyncPracticeTableDom === "function") {
    window.pufflySyncPracticeTableDom({
      useTableLayout: true,
      friendMode: true,
      initializing: false,
    });
  }
  if (typeof window.pufflyRefreshPracticeTableViewport === "function") {
    window.pufflyRefreshPracticeTableViewport();
  }
  refreshFriendRoomPill();
  refreshFriendVoicePill();
  refreshFriendAvatarBand();
  window.requestAnimationFrame(() => {
    if (playMode === "friend" && practiceTableIsActive()) {
      lockBoardGeometry(true);
    }
  });
}

/** @deprecated name kept for call sites — routes to Friend table layout. */
function suspendPracticeTableLayoutForFriendMode() {
  applyFriendTableLayoutIfEnabled();
}

function assertFriendModeLayoutClasses() {
  if (typeof document === "undefined" || !document.body.classList.contains("friend-mode")) {
    return;
  }
  if (friendTableUiEnabled()) {
    if (!document.body.classList.contains("practice-table-layout")) {
      applyFriendTableLayoutIfEnabled();
    }
    return;
  }
  if (document.body.classList.contains("practice-table-layout")) {
    applyFriendTableLayoutIfEnabled();
  }
}

function restorePracticeTableLayoutIfEnabled() {
  if (typeof document === "undefined" || playMode !== "puffly") {
    return;
  }
  friendPracticeDomFlattened = false;
  document.body.classList.remove("friend-pre-flip", "friend-voice-live");
  syncFriendTableSeatChrome();
  const band = document.getElementById("friend-avatar-band");
  if (band) {
    band.hidden = true;
  }
  if (!practiceTableUiStoredEnabled()) {
    document.body.classList.remove("practice-table-layout", "practice-table-initializing", "practice-setup-tray-open");
    clearPracticeTableViewportInlineStyles();
    return;
  }
  document.body.classList.add("practice-table-layout");
  if (typeof window.pufflyRefreshPracticeTableViewport === "function") {
    window.pufflyRefreshPracticeTableViewport();
  }
}

function isRulesPanelBlockingTableRelayout() {
  if (typeof document === "undefined") {
    return false;
  }
  return (
    document.body.classList.contains("rules-panel-open") ||
    document.body.classList.contains("rules-panel-animating")
  );
}

function schedulePracticeTableRelayoutIfNeeded() {
  updatePracticeTableChrome();
  if (
    typeof document === "undefined" ||
    !practiceTableIsActive() ||
    isRulesPanelBlockingTableRelayout()
  ) {
    return;
  }
  window.requestAnimationFrame(() => {
    syncPracticeTableLayoutVarsFromDom();
    lockBoardGeometry(true);
  });
}

function updatePracticeTableChrome() {
  if (playMode === "friend") {
    applyFriendTableLayoutIfEnabled();
    return;
  }
  const useTable =
    typeof document !== "undefined" &&
    document.body.classList.contains("practice-table-layout") &&
    !document.body.classList.contains("friend-mode") &&
    playMode === "puffly";
  if (!useTable) {
    const wasTableChrome = lastPracticeTableChromeKey !== "off";
    if (wasTableChrome) {
      lastPracticeTableChromeKey = "off";
      document.body.classList.remove("practice-table-initializing");
      friendPracticeDomFlattened = false;
    }
    friendPracticeDomFlattened = false;
    if (typeof window.pufflyClosePracticeSetupTray === "function") {
      window.pufflyClosePracticeSetupTray();
    }
    const needsDomFlatten =
      wasTableChrome ||
      (practiceTableUiStoredEnabled() &&
        !document.body.classList.contains("practice-table-layout"));
    if (needsDomFlatten && typeof window.pufflySyncPracticeTableDom === "function") {
      window.pufflySyncPracticeTableDom({
        useTableLayout: false,
        friendMode: false,
      });
    }
    return;
  }
  const initializing = isStarterFlipPending();
  const chromeKey = initializing ? "init" : "play";
  if (initializing && typeof window.pufflyClosePracticeSetupTray === "function") {
    window.pufflyClosePracticeSetupTray();
  }
  if (chromeKey === lastPracticeTableChromeKey) {
    document.body.classList.toggle("practice-table-initializing", initializing);
    syncPracticeTableLayoutVarsFromDom();
    return;
  }
  lastPracticeTableChromeKey = chromeKey;
  document.body.classList.toggle("practice-table-initializing", initializing);
  if (
    chromeKey === "play" &&
    typeof window.pufflyClosePracticeSetupTray === "function"
  ) {
    window.pufflyClosePracticeSetupTray();
  }
  if (typeof window.pufflySyncPracticeTableDom === "function") {
    window.pufflySyncPracticeTableDom({ initializing, useTableLayout: true });
  }
  window.requestAnimationFrame(() => {
    syncPracticeTableLayoutVarsFromDom();
    lockBoardGeometry(true);
    window.requestAnimationFrame(() => {
      syncPracticeTableLayoutVarsFromDom();
      lockBoardGeometry(true);
    });
  });
}

const PRACTICE_ART_CANVAS_PX = 1024;
const PRACTICE_ART_SAFE_PORTRAIT = { top: 0.11, bottom: 0.13, x: 0.05 };
const PRACTICE_ART_SAFE_LANDSCAPE = { top: 0.09, bottom: 0.11, x: 0.06 };

function practiceTableArtSafeInsets() {
  const portrait = Boolean(window.matchMedia?.("(orientation: portrait)")?.matches);
  return portrait ? PRACTICE_ART_SAFE_PORTRAIT : PRACTICE_ART_SAFE_LANDSCAPE;
}

function practiceTableClearFrameInsetVars() {
  if (typeof document === "undefined") {
    return;
  }
  const root = document.documentElement;
  root.style.removeProperty("--practice-stage-inset-top");
  root.style.removeProperty("--practice-stage-inset-right");
  root.style.removeProperty("--practice-stage-inset-bottom");
  root.style.removeProperty("--practice-stage-inset-left");
  document.body.classList.remove("practice-table-frame-synced");
}

function practiceTableClampFrameInset(value, sceneSpan) {
  return Math.max(0, Math.min(sceneSpan, value));
}

/** v401/v402: map stage insets to cover-scaled 1024 art safe zones (single pass, no contain letterbox). */
function practiceTableSyncFrameInsets() {
  if (typeof document === "undefined" || !practiceTableIsActive()) {
    practiceTableClearFrameInsetVars();
    return;
  }
  const scene = document.getElementById("practice-table-scene");
  if (!scene) {
    return;
  }
  const sceneWidth = scene.clientWidth;
  const sceneHeight = scene.clientHeight;
  if (sceneWidth <= 0 || sceneHeight <= 0) {
    return;
  }
  const safe = practiceTableArtSafeInsets();
  const scale = Math.max(sceneWidth / PRACTICE_ART_CANVAS_PX, sceneHeight / PRACTICE_ART_CANVAS_PX);
  const visibleArt = PRACTICE_ART_CANVAS_PX * scale;
  const offsetX = (sceneWidth - visibleArt) / 2;
  const offsetY = (sceneHeight - visibleArt) / 2;
  const insetTop = practiceTableClampFrameInset(offsetY + visibleArt * safe.top, sceneHeight);
  const insetBottom = practiceTableClampFrameInset(offsetY + visibleArt * safe.bottom, sceneHeight);
  const insetLeft = practiceTableClampFrameInset(offsetX + visibleArt * safe.x, sceneWidth);
  const insetRight = practiceTableClampFrameInset(offsetX + visibleArt * safe.x, sceneWidth);
  const root = document.documentElement;
  root.style.setProperty("--practice-stage-inset-top", `${Math.round(insetTop)}px`);
  root.style.setProperty("--practice-stage-inset-bottom", `${Math.round(insetBottom)}px`);
  root.style.setProperty("--practice-stage-inset-left", `${Math.round(insetLeft)}px`);
  root.style.setProperty("--practice-stage-inset-right", `${Math.round(insetRight)}px`);
  document.body.classList.add("practice-table-frame-synced");
}

function syncPracticeTableLayoutVarsFromDom() {
  practiceTableSyncFrameInsets();
  schedulePracticeTablePuzzleLandscapeCharacterLayout();
  if (typeof window.pufflySyncPracticeTableNavVars === "function") {
    window.pufflySyncPracticeTableNavVars();
  }
}

function practiceTableIsDesktopWide() {
  return (
    typeof window !== "undefined" &&
    window.innerWidth >= 900 &&
    practiceTableIsActive()
  );
}

function practiceTableViewportIsLandscapeLayout() {
  return typeof window !== "undefined" && window.innerWidth > window.innerHeight;
}

function practiceTableIsLandscapeTablet() {
  return (
    typeof window !== "undefined" &&
    window.innerWidth >= 768 &&
    practiceTableViewportIsLandscapeLayout() &&
    practiceTableIsActive()
  );
}

function practiceTableIsPortraitTablet() {
  return (
    typeof window !== "undefined" &&
    !practiceTableViewportIsLandscapeLayout() &&
    practiceTableIsActive()
  );
}

function practiceTableIsActive() {
  return (
    typeof document !== "undefined" &&
    document.body.classList.contains("practice-table-layout")
  );
}

function practiceTablePuzzleTrayPieceCount(rows, cols) {
  return Math.ceil((rows * cols) / 2);
}

function practiceTableSeatTopHeightBudget(wrapRect, padTop, padBottom, clearancePx = 12) {
  const playerSeat = document.getElementById("player-seat-row");
  if (!playerSeat) {
    return null;
  }
  return Math.max(
    0,
    playerSeat.getBoundingClientRect().top - wrapRect.top - padTop - padBottom - clearancePx,
  );
}

function practiceTablePlayClusterBoardHeightBudget(clearancePx = 8) {
  const cluster = document.getElementById("practice-play-cluster");
  const wrap = document.querySelector("#game-board-matrix .board-wrap");
  const playerSeat = document.getElementById("player-seat-row");
  if (!cluster || !wrap || cluster.clientHeight <= 0) {
    return null;
  }
  const clusterRect = cluster.getBoundingClientRect();
  const wrapRect = wrap.getBoundingClientRect();
  const seatTop = playerSeat?.getBoundingClientRect().top ?? clusterRect.bottom;
  const capBottom = Math.min(clusterRect.bottom, seatTop);
  return Math.max(0, capBottom - wrapRect.top - clearancePx);
}

const PRACTICE_TABLE_PUZZLE_BOARD_CHROME_PX = (3 + 4) * 2;
const PRACTICE_TABLE_PORTRAIT_TRAY_COLUMN_PX = 56;
const PRACTICE_TABLE_PUZZLE_PORTRAIT_TRAY_COLUMN_PX = 98;

function practiceTablePuzzleTrayTargetVisible(rows) {
  if (rows === 2) {
    return 2;
  }
  if (practiceTableIsLandscapeTablet()) {
    return 3;
  }
  if (rows === 5) {
    return 5;
  }
  return 4;
}

function practiceTableLandscapeCheckersTrayBudgetPx() {
  return 112;
}

function practiceTableLandscapeBoardInnerWidthPx(
  landscapeTrayBudgetPx,
  trayGapPx,
  boardBorderPx,
) {
  const scene = document.getElementById("practice-table-scene");
  if (!scene) {
    return 0;
  }
  const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 0;
  const sceneWidth = scene.clientWidth > 0 ? scene.clientWidth : viewportWidth;
  const groupCap = practiceTableLandscapeBoardMaxWidthPx();
  const layoutWidth = Math.min(
    sceneWidth > 0 ? sceneWidth : viewportWidth,
    viewportWidth > 0 ? viewportWidth : sceneWidth,
    groupCap > 0 ? groupCap : sceneWidth,
  );
  return Math.max(
    0,
    layoutWidth - landscapeTrayBudgetPx - trayGapPx * 2 - boardBorderPx,
  );
}

function applyPracticeTableCheckersLandscapeBoardStyles() {
  if (!boardElement || selectedGameId !== "checkers") {
    return;
  }
  if (!practiceTableIsLandscapeTablet() || !practiceTableIsActive()) {
    boardElement.style.removeProperty("max-width");
    boardElement.style.removeProperty("min-width");
    boardElement.style.removeProperty("max-height");
    return;
  }
  boardElement.style.setProperty("max-width", "none");
  boardElement.style.setProperty("min-width", "0");
  boardElement.style.setProperty("min-height", "0");
  boardElement.style.setProperty("max-height", "none");
}

function applyPracticeTableFourLandscapeBoardStyles() {
  if (!boardElement || selectedGameId !== "fourinarow") {
    return;
  }
  if (!practiceTableIsLandscapeTablet() || !practiceTableIsActive()) {
    boardElement.style.removeProperty("max-width");
    boardElement.style.removeProperty("min-width");
    return;
  }
  boardElement.style.setProperty("max-width", "none");
  boardElement.style.setProperty("min-width", "0");
}

function practiceTablePuzzleLandscapeTrayColumnPx() {
  if (practiceTableLandscapePuzzleCellPx > 0) {
    return practiceTableLandscapePuzzleCellPx;
  }
  return 112;
}

function computePracticeTableLandscapePuzzleCell(
  innerContentWidth,
  innerContentHeight,
  rows,
  cols,
  tableBoardScale,
) {
  const puzzleInnerWidth = Math.max(
    0,
    innerContentWidth - PRACTICE_TABLE_PUZZLE_BOARD_CHROME_PX,
  );
  const puzzleInnerHeight = Math.max(
    0,
    innerContentHeight - PRACTICE_TABLE_PUZZLE_BOARD_CHROME_PX,
  );
  const refCell = computePracticeTableCheckersReferenceCell(
    innerContentWidth,
    innerContentHeight,
    tableBoardScale,
  );
  const cellFromRef = Math.floor((refCell * BOARD_SIZE) / cols);
  const cellFromWidth = Math.floor((puzzleInnerWidth * tableBoardScale) / cols);
  const cellFromHeight = Math.floor((puzzleInnerHeight * tableBoardScale) / rows);
  return Math.max(
    1,
    Math.min(cellFromRef, cellFromWidth, cellFromHeight),
  );
}

function applyPracticeTablePuzzleBoardCellStyles(cell, rows, cols) {
  const boardWidth = cell * cols + PRACTICE_TABLE_PUZZLE_BOARD_CHROME_PX;
  const boardHeight = cell * rows + PRACTICE_TABLE_PUZZLE_BOARD_CHROME_PX;
  boardElement.style.width = `${boardWidth}px`;
  boardElement.style.height = `${boardHeight}px`;
  boardElement.style.gridTemplateColumns = `repeat(${cols}, ${cell}px)`;
  boardElement.style.gridTemplateRows = `repeat(${rows}, ${cell}px)`;
}

function practiceTablePuzzleBoardBottomPx() {
  return boardElement?.getBoundingClientRect().bottom ?? 0;
}

function syncPracticeTablePuzzleTrayHeightsToBoardElement() {
  if (!boardElement) {
    return;
  }
  const boardHeight = Math.round(boardElement.getBoundingClientRect().height);
  if (boardHeight <= 0) {
    return;
  }
  const captures = boardElement.parentElement?.closest(".board-and-captures");
  if (captures) {
    captures.style.setProperty("--practice-board-height", `${boardHeight}px`);
  }
  const trays = document.querySelectorAll("#game-board-matrix .captured-tray");
  for (const tray of trays) {
    tray.style.height = `${boardHeight}px`;
    tray.style.maxHeight = `${boardHeight}px`;
  }
}

function shrinkPracticeTablePuzzleLandscapeCellForSeat(cell, rows, cols, clearancePx) {
  const playerSeat = document.getElementById("player-seat-row");
  if (!playerSeat || !practiceTableIsLandscapeTablet() || cell <= 1) {
    return cell;
  }
  const minCell = Math.max(1, Math.min(cell, MIN_TOUCH_CELL_PX));
  let testCell = cell;
  while (testCell > minCell) {
    applyPracticeTablePuzzleBoardCellStyles(testCell, rows, cols);
    syncPracticeTablePuzzleTrayHeightsToBoardElement();
    void boardElement.offsetHeight;
    const seatTop = playerSeat.getBoundingClientRect().top;
    if (practiceTablePuzzleBoardBottomPx() <= seatTop - clearancePx) {
      break;
    }
    testCell -= 1;
  }
  return testCell;
}

function syncPracticeTablePuzzleGridBodyClasses() {
  if (typeof document === "undefined") {
    return;
  }
  document.body.classList.remove("puzzle-grid-mini", "puzzle-grid-classic", "puzzle-grid-mega");
  if (selectedGameId !== "puzzle") {
    return;
  }
  const { rows } = getPuzzleGridSizeFromState();
  if (rows === 2) {
    document.body.classList.add("puzzle-grid-mini");
  } else if (rows === 5) {
    document.body.classList.add("puzzle-grid-mega");
  } else {
    document.body.classList.add("puzzle-grid-classic");
  }
}

function practiceTablePuzzlePieceBodyPx(cellPx) {
  // Core jigsaw unit maps 1:1 to the grid cell; tabs render outside via SVG overflow.
  return Math.max(1, cellPx);
}

function applyPracticeTableLandscapeTrayEdgeGlow(pieceEl, piece, rows, cols) {
  const shadows = [];
  const cyan = "rgba(54, 232, 255, 0.98)";
  if (piece.correctRow === 0) {
    shadows.push(`inset 0 2px 0 0 ${cyan}`);
  }
  if (piece.correctCol === cols - 1) {
    shadows.push(`inset -2px 0 0 0 ${cyan}`);
  }
  if (piece.correctRow === rows - 1) {
    shadows.push(`inset 0 -2px 0 0 ${cyan}`);
  }
  if (piece.correctCol === 0) {
    shadows.push(`inset 2px 0 0 0 ${cyan}`);
  }
  if (shadows.length > 0) {
    pieceEl.style.setProperty("--puzzle-tray-edge-glow", shadows.join(", "));
  }
}

function practiceTablePuzzleTrayViewportHeight(pile, pileComputed) {
  const padTop = Number.parseFloat(pileComputed.paddingTop) || 0;
  const padBottom = Number.parseFloat(pileComputed.paddingBottom) || 0;
  return Math.max(0, pile.clientHeight - padTop - padBottom);
}

function clearPracticeTablePuzzleLandscapeVars() {
  practiceTableLandscapePuzzleCellPx = 0;
  practiceTableLandscapePuzzleBodyPx = 0;
  practiceTableLandscapePuzzleBoardHeightPx = 0;
  practiceTablePortraitPuzzleCellPx = 0;
  const matrix = document.getElementById("game-board-matrix");
  if (!matrix) {
    return;
  }
  matrix.style.removeProperty("--puzzle-cell-px");
  matrix.style.removeProperty("--puzzle-piece-body-px");
  matrix.style.removeProperty("--puzzle-landscape-scale");
  matrix.style.removeProperty("--practice-puzzle-tray-column-px");
}

function syncPracticeTablePuzzleLandscapeScale(matrix, cell, rows, cols) {
  if (!matrix || !practiceTableIsLandscapeTablet()) {
    return;
  }
  if (practiceTableIsActive()) {
    matrix.style.removeProperty("--puzzle-landscape-scale");
    return;
  }
  const captures = matrix.querySelector(".board-and-captures");
  if (!captures) {
    matrix.style.removeProperty("--puzzle-landscape-scale");
    return;
  }
  const capturesComputed = window.getComputedStyle(captures);
  const gapPx =
    Number.parseFloat(capturesComputed.columnGap) ||
    Number.parseFloat(capturesComputed.gap) ||
    0;
  const trayWidth = practiceTablePuzzleLandscapeTrayColumnPx();
  const boardWidth = cell * cols + PRACTICE_TABLE_PUZZLE_BOARD_CHROME_PX;
  const naturalWidth = trayWidth * 2 + gapPx * 2 + boardWidth;
  const scene = document.getElementById("practice-table-scene");
  const sceneWidth = scene?.clientWidth > 0 ? scene.clientWidth : window.innerWidth;
  const maxWidth = practiceTableLandscapeBoardMaxWidthPx() || Math.floor(sceneWidth * 0.96);
  if (naturalWidth > maxWidth && naturalWidth > 0) {
    matrix.style.setProperty("--puzzle-landscape-scale", String(maxWidth / naturalWidth));
    return;
  }
  matrix.style.removeProperty("--puzzle-landscape-scale");
}

function applyPracticeTablePuzzlePortraitVars(cell, rows, cols, isPracticeTablePuzzle) {
  const matrix = document.getElementById("game-board-matrix");
  if (
    !isPracticeTablePuzzle ||
    !practiceTableFootprintUnificationActive() ||
    !matrix ||
    cell <= 0
  ) {
    practiceTablePortraitPuzzleCellPx = 0;
    return;
  }
  practiceTablePortraitPuzzleCellPx = cell;
  const bodyPx = practiceTablePuzzlePieceBodyPx(cell);
  matrix.style.setProperty("--puzzle-cell-px", `${cell}px`);
  matrix.style.setProperty("--puzzle-piece-body-px", `${bodyPx}px`);
}

function practiceTableActivePuzzleBoardCellPx() {
  if (practiceTableIsLandscapeTablet() && practiceTableLandscapePuzzleCellPx > 0) {
    return practiceTableLandscapePuzzleCellPx;
  }
  if (practiceTablePortraitPuzzleCellPx > 0) {
    return practiceTablePortraitPuzzleCellPx;
  }
  const matrix = document.getElementById("game-board-matrix");
  const fromVar = Number.parseFloat(matrix?.style.getPropertyValue("--puzzle-cell-px"));
  if (fromVar > 0) {
    return fromVar;
  }
  if (boardElement && selectedGameId === "puzzle") {
    const { cols } = getPuzzleGridSizeFromState();
    const boardWidth = boardElement.getBoundingClientRect().width;
    if (boardWidth > 0 && cols > 0) {
      return Math.max(1, Math.floor((boardWidth - PRACTICE_TABLE_PUZZLE_BOARD_CHROME_PX) / cols));
    }
  }
  return 0;
}

function applyPracticeTablePuzzleLandscapeVars(cell, rows, cols, isPracticeTablePuzzle) {
  const matrix = document.getElementById("game-board-matrix");
  if (!isPracticeTablePuzzle || !practiceTableIsLandscapeTablet() || !matrix || cell <= 0) {
    clearPracticeTablePuzzleLandscapeVars();
    return;
  }
  practiceTableLandscapePuzzleCellPx = cell;
  const bodyPx = practiceTablePuzzlePieceBodyPx(cell);
  practiceTableLandscapePuzzleBodyPx = bodyPx;
  practiceTableLandscapePuzzleBoardHeightPx = cell * rows + PRACTICE_TABLE_PUZZLE_BOARD_CHROME_PX;
  matrix.style.setProperty("--puzzle-cell-px", `${cell}px`);
  matrix.style.setProperty("--puzzle-piece-body-px", `${bodyPx}px`);
  matrix.style.setProperty("--practice-puzzle-tray-column-px", `${cell}px`);
  syncPracticeTablePuzzleLandscapeScale(matrix, cell, rows, cols);
}

function syncPracticeTablePuzzleTrayLandscapeTrayCaps() {
  if (!practiceTableIsActive() || selectedGameId !== "puzzle") {
    return;
  }
  if (practiceTableIsLandscapeTablet()) {
    syncPracticeTableTrayHeights();
    return;
  }
  const trays = document.querySelectorAll("#game-board-matrix .captured-tray");
  for (const tray of trays) {
    tray.style.height = "";
    tray.style.maxHeight = "";
  }
}

function schedulePracticeTablePuzzleTrayPieceSizeSync() {
  if (isRulesPanelBlockingTableRelayout()) {
    return;
  }
  window.requestAnimationFrame(() => {
    syncPracticeTablePuzzleTrayLandscapeTrayCaps();
    syncPracticeTablePuzzleTrayPieceSizes();
    if (practiceTableIsLandscapeTablet() || practiceTableFootprintUnificationActive()) {
      window.requestAnimationFrame(() => {
        syncPracticeTablePuzzleTrayLandscapeTrayCaps();
        syncPracticeTablePuzzleTrayPieceSizes();
      });
    }
  });
}

function syncPracticeTablePuzzleTrayPieceSizes() {
  if (!practiceTableIsActive() || selectedGameId !== "puzzle") {
    return;
  }
  const { rows, cols } = getPuzzleGridSizeFromState();
  const targetVisible = practiceTablePuzzleTrayTargetVisible(rows);
  const fallbackPieceCount = practiceTablePuzzleTrayPieceCount(rows, cols);
  const isLandscape = practiceTableIsLandscapeTablet();
  for (const pileId of ["blue-captured-pile", "green-captured-pile"]) {
    const pile = document.getElementById(pileId);
    if (!pile) {
      continue;
    }
    const pileComputed = window.getComputedStyle(pile);
    const padLeft = Number.parseFloat(pileComputed.paddingLeft) || 0;
    const padRight = Number.parseFloat(pileComputed.paddingRight) || 0;
    const padTop = Number.parseFloat(pileComputed.paddingTop) || 0;
    const padBottom = Number.parseFloat(pileComputed.paddingBottom) || 0;
    const innerWidth = Math.max(0, pile.clientWidth - padLeft - padRight);
    const innerHeight = practiceTablePuzzleTrayViewportHeight(pile, pileComputed);
    const pieceCount = pile.querySelectorAll(".puzzle-piece").length || fallbackPieceCount;
    const slotCount = isLandscape ? targetVisible : Math.max(1, Math.min(pieceCount, targetVisible));
    const gapPx = Number.parseFloat(pileComputed.gap) || Number.parseFloat(pileComputed.rowGap) || 0;
    const fromHeight = Math.max(
      1,
      Math.floor((innerHeight - gapPx * (slotCount - 1)) / slotCount),
    );
    let pieceSize = Math.min(innerWidth, fromHeight);
    const boardCellPx = practiceTableActivePuzzleBoardCellPx();
    if (boardCellPx > 0) {
      pieceSize = Math.min(innerWidth, boardCellPx, fromHeight);
    }
    if (isLandscape && practiceTableLandscapePuzzleCellPx > 0) {
      pieceSize = Math.min(innerWidth, practiceTableLandscapePuzzleCellPx);
    } else if (fromHeight >= MIN_TOUCH_CELL_PX) {
      pieceSize = Math.max(MIN_TOUCH_CELL_PX, pieceSize);
    } else {
      pieceSize = Math.max(1, pieceSize);
    }
    if (pieceSize > 0) {
      pile.style.setProperty("--puzzle-tray-piece-size", `${pieceSize}px`);
    }
  }
}

function touchTargetCellSizeFromAxes(cellFromWidth, cellFromHeight) {
  if (cellFromHeight < MIN_TOUCH_CELL_PX) {
    return Math.max(1, cellFromHeight);
  }
  return Math.min(
    Math.max(MIN_TOUCH_CELL_PX, Math.min(cellFromWidth, cellFromHeight)),
    cellFromHeight,
  );
}

function touchTargetCellSize(innerContentWidth, innerContentHeight, tableBoardScale, gridSpan) {
  const cellFromWidth = Math.floor((innerContentWidth * tableBoardScale) / gridSpan);
  const cellFromHeight = Math.floor((innerContentHeight * tableBoardScale) / gridSpan);
  return touchTargetCellSizeFromAxes(cellFromWidth, cellFromHeight);
}

function practiceTablePracticeFrameInsetX() {
  const stage = document.getElementById("practice-stage");
  const scene = document.getElementById("practice-table-scene");
  if (!stage || !scene) {
    return 0;
  }
  const sceneRect = scene.getBoundingClientRect();
  const stageRect = stage.getBoundingClientRect();
  if (sceneRect.width <= 0) {
    return 0;
  }
  if (document.body.classList.contains("practice-table-frame-synced")) {
    return Math.max(0, stageRect.left - sceneRect.left);
  }
  const sideInset = Math.max(0, (sceneRect.width - stageRect.width) / 2);
  const leftGap = Math.max(0, stageRect.left - sceneRect.left);
  return sideInset + leftGap;
}

function practiceTableLandscapeChromeReservePx() {
  if (
    practiceTableIsLandscapeTablet() &&
    selectedGameId === "puzzle" &&
    practiceTableIsActive()
  ) {
    return 340;
  }
  return 320;
}

function practiceTableBoardSeatClearancePx() {
  if (
    practiceTableIsLandscapeTablet() &&
    selectedGameId === "puzzle" &&
    practiceTableIsActive()
  ) {
    return 16;
  }
  return 8;
}

function practiceTableLandscapeBoardMaxWidthPx() {
  if (typeof window === "undefined") {
    return 840;
  }
  const scene = document.getElementById("practice-table-scene");
  const sceneWidth = scene?.clientWidth > 0 ? scene.clientWidth : window.innerWidth;
  const heightBudget = Math.max(
    320,
    window.innerHeight - practiceTableLandscapeChromeReservePx(),
  );
  return Math.min(Math.floor(sceneWidth * 0.96), Math.floor(heightBudget * 0.98));
}

function practiceTableBoardGroupMaxWidthPx() {
  if (typeof window === "undefined") {
    return 640;
  }
  if (practiceTableIsLandscapeTablet()) {
    return practiceTableLandscapeBoardMaxWidthPx();
  }
  return Math.min(Math.floor(window.innerWidth * 0.68), 640);
}

function practiceTableFootprintUnificationActive() {
  return practiceTableIsPortraitTablet() && practiceTableIsActive();
}

function practiceTablePortraitTrayColumnPx() {
  if (practiceTableFootprintUnificationActive()) {
    if (selectedGameId === "puzzle") {
      return PRACTICE_TABLE_PUZZLE_PORTRAIT_TRAY_COLUMN_PX;
    }
    return PRACTICE_TABLE_PORTRAIT_TRAY_COLUMN_PX;
  }
  if (selectedGameId === "puzzle" && practiceTableIsActive()) {
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 860px)").matches) {
      return 98;
    }
    return 128;
  }
  return PRACTICE_TABLE_PORTRAIT_TRAY_COLUMN_PX;
}

function practiceTableCheckersBoardBorderPx(boardComputed) {
  if (!boardComputed || boardComputed.boxSizing !== "border-box") {
    return 0;
  }
  return (
    (Number.parseFloat(boardComputed.borderTopWidth) || 0) +
    (Number.parseFloat(boardComputed.borderBottomWidth) || 0) +
    (Number.parseFloat(boardComputed.borderLeftWidth) || 0) +
    (Number.parseFloat(boardComputed.borderRightWidth) || 0)
  );
}

function practiceTableCheckersBoardPixelsFromCell(cell, boardBorderPx) {
  return cell * BOARD_SIZE + boardBorderPx;
}

function computePracticeTableCheckersReferenceCell(
  innerContentWidth,
  innerContentHeight,
  tableBoardScale,
) {
  const cellFromWidth = Math.floor((innerContentWidth * tableBoardScale) / BOARD_SIZE);
  const cellFromHeight = Math.floor((innerContentHeight * tableBoardScale) / BOARD_SIZE);
  return touchTargetCellSizeFromAxes(cellFromWidth, cellFromHeight);
}

function shrinkPracticeTableReferenceCellForSeat(
  cell,
  boardBorderPx,
  wrapRect,
  padTop,
  padBottom,
) {
  if (!practiceTableFootprintUnificationActive() || cell <= 1) {
    return cell;
  }
  const playerSeat = document.getElementById("player-seat-row");
  if (!playerSeat) {
    return cell;
  }
  const seatTop = playerSeat.getBoundingClientRect().top;
  let testCell = cell;
  while (testCell > 1) {
    const boardPixels = practiceTableCheckersBoardPixelsFromCell(testCell, boardBorderPx);
    const estimatedBottom = wrapRect.top + padTop + boardPixels;
    if (estimatedBottom <= seatTop - 4) {
      break;
    }
    testCell -= 1;
  }
  return testCell;
}

function resolvePracticeTableCheckersFootprint(
  innerContentWidth,
  innerContentHeight,
  tableBoardScale,
  wrapRect,
  padTop,
  padBottom,
  boardComputed,
) {
  const boardBorderPx = practiceTableCheckersBoardBorderPx(boardComputed);
  let cell = computePracticeTableCheckersReferenceCell(
    innerContentWidth,
    innerContentHeight,
    tableBoardScale,
  );
  cell = shrinkPracticeTableReferenceCellForSeat(
    cell,
    boardBorderPx,
    wrapRect,
    padTop,
    padBottom,
  );
  const boardPixels = practiceTableCheckersBoardPixelsFromCell(cell, boardBorderPx);
  return {
    cell,
    boardBorderPx,
    boardPixels,
    centerPx: cell * BOARD_SIZE,
  };
}

function applyPracticeTableFootprintVars(footprint) {
  if (!footprint || !practiceTableFootprintUnificationActive()) {
    return;
  }
  const captures = document.querySelector("#game-board-matrix .board-and-captures");
  if (!captures) {
    return;
  }
  captures.style.setProperty("--practice-reference-cell", `${footprint.cell}px`);
  captures.style.setProperty("--practice-footprint-center", `${footprint.centerPx}px`);
  captures.style.setProperty("--practice-footprint-board-height", `${footprint.boardPixels}px`);
}

function clearPracticeTableFootprintVars() {
  const captures = document.querySelector("#game-board-matrix .board-and-captures");
  captures?.style.removeProperty("--practice-reference-cell");
  captures?.style.removeProperty("--practice-footprint-center");
  captures?.style.removeProperty("--practice-footprint-board-height");
}

function practiceTablePortraitBoardGroupWidthPx() {
  const scene = document.getElementById("practice-table-scene");
  const stage = document.getElementById("practice-stage");
  if (!scene) {
    return 0;
  }
  const layoutWidth = stage && stage.clientWidth > 0 ? stage.clientWidth : scene.clientWidth;
  if (layoutWidth <= 0) {
    return 0;
  }
  return Math.min(layoutWidth, practiceTableBoardGroupMaxWidthPx());
}

function practiceTablePortraitCenterColumnBudgetPx() {
  const groupCap = practiceTablePortraitBoardGroupWidthPx();
  if (groupCap <= 0) {
    return 0;
  }
  const captures = document.querySelector("#game-board-matrix .board-and-captures");
  const capturesStyle = captures ? window.getComputedStyle(captures) : null;
  const trayGapPx = capturesStyle
    ? Number.parseFloat(capturesStyle.columnGap) ||
      Number.parseFloat(capturesStyle.gap) ||
      0
    : 0;
  const trayColumnPx = practiceTablePortraitTrayColumnPx();
  return Math.max(0, groupCap - trayColumnPx * 2 - trayGapPx * 2);
}

function practiceTablePuzzlePortraitCenterBudgetPx(wrap) {
  const centerBudget = practiceTablePortraitCenterColumnBudgetPx();
  if (centerBudget > 0) {
    return centerBudget;
  }
  if (!wrap) {
    return null;
  }
  if (wrap.clientWidth > 0) {
    return wrap.clientWidth;
  }
  const captures = wrap.closest(".board-and-captures");
  if (!captures || captures.clientWidth <= 0) {
    return null;
  }
  const capturesStyle = window.getComputedStyle(captures);
  const trayGapPx =
    Number.parseFloat(capturesStyle.columnGap) ||
    Number.parseFloat(capturesStyle.gap) ||
    0;
  const trayColumnPx = practiceTablePortraitTrayColumnPx();
  return Math.max(0, captures.clientWidth - trayColumnPx * 2 - trayGapPx * 2);
}

function practiceTableFourInARowFootprintCell(practiceFootprint, fourBoardChrome) {
  const cellFromWidth = Math.floor((practiceFootprint.centerPx - fourBoardChrome) / FOUR_COLS);
  const cellFromHeight = Math.floor((practiceFootprint.boardPixels - fourBoardChrome) / FOUR_ROWS);
  return touchTargetCellSizeFromAxes(cellFromWidth, cellFromHeight);
}

function practiceTableBoardMaxContentWidth() {
  const scene = document.getElementById("practice-table-scene");
  const stage = document.getElementById("practice-stage");
  if (!scene) {
    return null;
  }
  const layoutWidth = stage && stage.clientWidth > 0 ? stage.clientWidth : scene.clientWidth;
  if (practiceTableIsPortraitTablet()) {
    const centerBudget = practiceTablePortraitCenterColumnBudgetPx();
    if (centerBudget > 0) {
      return centerBudget;
    }
    const groupCap = Math.min(layoutWidth, practiceTableBoardGroupMaxWidthPx());
    return Math.max(0, groupCap - 112 - 12);
  }
  if (!practiceTableIsDesktopWide() && !practiceTableIsLandscapeTablet()) {
    return null;
  }
  return Math.max(0, scene.clientWidth);
}

function practiceTableBoardScaleFactor() {
  if (typeof document === "undefined" || !practiceTableIsActive()) {
    return 1;
  }
  return 1.0;
}

function practiceTablePuzzleBoardCellSize(
  puzzleInnerWidth,
  puzzleInnerHeight,
  tableBoardScale,
  rows,
  cols,
  capByLandscapeTray = false,
) {
  const cellFromWidth = Math.floor((puzzleInnerWidth * tableBoardScale) / cols);
  const cellFromHeight = Math.floor((puzzleInnerHeight * tableBoardScale) / rows);
  let cell = touchTargetCellSizeFromAxes(cellFromWidth, cellFromHeight);
  if (capByLandscapeTray) {
    cell = Math.min(cell, practiceTablePuzzleLandscapeTrayColumnPx());
  }
  return cell;
}

function scheduleBoardGeometryRelayout() {
  if (
    lastPracticeTableOrientationChangeAt > 0 &&
    Date.now() - lastPracticeTableOrientationChangeAt <
      PRACTICE_TABLE_ORIENTATION_RESIZE_COOLDOWN_MS
  ) {
    return;
  }
  if (boardGeometryResizeTimer) {
    clearTimeout(boardGeometryResizeTimer);
  }
  boardGeometryResizeTimer = setTimeout(() => {
    boardGeometryResizeTimer = null;
    if (
      lastPracticeTableOrientationChangeAt > 0 &&
      Date.now() - lastPracticeTableOrientationChangeAt <
        PRACTICE_TABLE_ORIENTATION_RESIZE_COOLDOWN_MS
    ) {
      return;
    }
    lockBoardGeometry(true);
    render(lastStatusMessage);
  }, BOARD_GEOMETRY_RESIZE_DEBOUNCE_MS);
}

function isStandalonePwaDisplay() {
  if (typeof window === "undefined") {
    return false;
  }
  if (window.matchMedia?.("(display-mode: standalone)")?.matches) {
    return true;
  }
  return Boolean(window.navigator.standalone);
}

function isIosLikeBrowser() {
  if (typeof navigator === "undefined") {
    return false;
  }
  const ua = navigator.userAgent || "";
  if (/iPad|iPhone|iPod/.test(ua)) {
    return true;
  }
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

function initPwaInstallHint() {
  if (typeof document === "undefined" || isStandalonePwaDisplay() || !isIosLikeBrowser()) {
    return;
  }
  try {
    if (window.localStorage?.getItem(PWA_INSTALL_HINT_STORAGE_KEY) === "1") {
      return;
    }
  } catch {
    // ignore
  }
  const hint = document.getElementById("pwa-install-hint");
  const dismiss = document.getElementById("pwa-install-hint-dismiss");
  if (!hint || !dismiss) {
    return;
  }
  hint.classList.remove("hidden");
  dismiss.addEventListener("click", () => {
    hint.classList.add("hidden");
    try {
      window.localStorage?.setItem(PWA_INSTALL_HINT_STORAGE_KEY, "1");
    } catch {
      // ignore
    }
  });
}

function lockBoardGeometry(force = false) {
  if (isRulesPanelBlockingTableRelayout()) {
    return;
  }
  if (!force && Date.now() - boardGeometryLockedAt < BOARD_GEOMETRY_LOCK_TTL_MS) {
    return;
  }
  const wrap = boardElement.parentElement;
  if (!wrap) {
    return;
  }
  if (selectedGameId !== "puzzle" || !practiceTableIsActive()) {
    clearPracticeTablePuzzleLandscapeVars();
  }
  const tableBoardScale = practiceTableBoardScaleFactor();
  const computed = window.getComputedStyle(wrap);
  const padLeft = Number.parseFloat(computed.paddingLeft) || 0;
  const padRight = Number.parseFloat(computed.paddingRight) || 0;
  const padTop = Number.parseFloat(computed.paddingTop) || 0;
  const padBottom = Number.parseFloat(computed.paddingBottom) || 0;
  const bodyComputed = window.getComputedStyle(document.body);
  const bodyBottomPadding = Number.parseFloat(bodyComputed.paddingBottom) || 0;
  let innerContentWidth = Math.max(0, wrap.clientWidth - padLeft - padRight);
  if (practiceTableIsLandscapeTablet()) {
    const scene = document.getElementById("practice-table-scene");
    const captures = wrap.closest(".board-and-captures");
    if (scene && captures) {
      const capturesComputed = window.getComputedStyle(captures);
      const trayGapPx =
        Number.parseFloat(capturesComputed.columnGap) ||
        Number.parseFloat(capturesComputed.gap) ||
        0;
      const boardComputed = window.getComputedStyle(boardElement);
      const boardBorderPx =
        (Number.parseFloat(boardComputed.borderLeftWidth) || 0) +
        (Number.parseFloat(boardComputed.borderRightWidth) || 0);
      const landscapeTrayBudgetPx =
        selectedGameId === "puzzle" && practiceTableIsActive()
          ? practiceTableLandscapeCheckersTrayBudgetPx()
          : selectedGameId === "puzzle"
            ? practiceTablePuzzleLandscapeTrayColumnPx() * 2
            : practiceTableLandscapeCheckersTrayBudgetPx();
      if (selectedGameId === "checkers") {
        innerContentWidth = practiceTableLandscapeBoardInnerWidthPx(
          landscapeTrayBudgetPx,
          trayGapPx,
          boardBorderPx,
        );
      } else {
        innerContentWidth = Math.max(
          0,
          scene.clientWidth - landscapeTrayBudgetPx - trayGapPx * 2 - boardBorderPx,
        );
      }
    }
  }
  const sceneBoardCap = practiceTableBoardMaxContentWidth();
  if (sceneBoardCap != null) {
    innerContentWidth = Math.min(innerContentWidth, sceneBoardCap);
  }
  const wrapRect = wrap.getBoundingClientRect();
  let remainingViewportHeight = Math.max(0, window.innerHeight - wrapRect.top - bodyBottomPadding - 8);
  if (practiceTableIsActive()) {
    const seatClearance = practiceTableBoardSeatClearancePx();
    const seatBudget = practiceTableSeatTopHeightBudget(wrapRect, padTop, padBottom, seatClearance);
    if (seatBudget != null) {
      remainingViewportHeight = Math.min(remainingViewportHeight, seatBudget);
    }
    const clusterBudget = practiceTablePlayClusterBoardHeightBudget(seatClearance);
    if (clusterBudget != null) {
      remainingViewportHeight = Math.min(remainingViewportHeight, clusterBudget);
    }
  }
  const innerContentHeight = Math.max(0, remainingViewportHeight - padTop - padBottom);
  const boardComputed = window.getComputedStyle(boardElement);
  const footprintUnificationActive = practiceTableFootprintUnificationActive();
  let practiceFootprint = null;
  if (footprintUnificationActive) {
    const unifiedWidthCap = practiceTableBoardMaxContentWidth();
    if (unifiedWidthCap != null) {
      innerContentWidth = unifiedWidthCap;
    }
    practiceFootprint = resolvePracticeTableCheckersFootprint(
      innerContentWidth,
      innerContentHeight,
      tableBoardScale,
      wrapRect,
      padTop,
      padBottom,
      boardComputed,
    );
    applyPracticeTableFootprintVars(practiceFootprint);
  } else {
    clearPracticeTableFootprintVars();
  }

  if (selectedGameId === "fourinarow") {
    // Account for board border + inner padding so edge circles never clip.
    const fourBoardChrome = (3 + 4) * 2;
    let cell;
    if (footprintUnificationActive && practiceFootprint) {
      cell = practiceTableFourInARowFootprintCell(practiceFootprint, fourBoardChrome);
    } else {
      const availableWidth = Math.max(0, Math.floor((innerContentWidth - fourBoardChrome) * tableBoardScale));
      const availableHeight = Math.max(0, Math.floor((innerContentHeight - fourBoardChrome) * tableBoardScale));
      const cellFromWidth = Math.floor(availableWidth / FOUR_COLS);
      const cellFromHeight = Math.floor(availableHeight / FOUR_ROWS);
      cell = touchTargetCellSizeFromAxes(cellFromWidth, cellFromHeight);
    }
    boardElement.style.width = `${cell * FOUR_COLS + fourBoardChrome}px`;
    boardElement.style.gridTemplateColumns = `repeat(${FOUR_COLS}, ${cell}px)`;
    boardElement.style.gridTemplateRows = `repeat(${FOUR_ROWS}, ${cell}px)`;
    if (practiceTableIsActive()) {
      boardElement.style.aspectRatio = "auto";
      boardElement.style.minHeight = "0";
      boardElement.style.height = `${cell * FOUR_ROWS + fourBoardChrome}px`;
      boardElement.style.alignContent = "start";
      applyPracticeTableFourLandscapeBoardStyles();
    } else {
      boardElement.style.minHeight = "";
      boardElement.style.alignContent = "";
      boardElement.style.height = `${cell * FOUR_ROWS + fourBoardChrome}px`;
    }
    finalizeBoardGeometryLock();
    return;
  }
  if (selectedGameId === "puzzle") {
    const { rows, cols } = getPuzzleGridSizeFromState();
    const isPracticeTablePuzzle = practiceTableIsActive();
    let puzzleInnerWidth = innerContentWidth;
    let puzzleInnerHeight = innerContentHeight;
    if (isPracticeTablePuzzle) {
      puzzleInnerWidth = Math.max(0, innerContentWidth - PRACTICE_TABLE_PUZZLE_BOARD_CHROME_PX);
      puzzleInnerHeight = Math.max(0, innerContentHeight - PRACTICE_TABLE_PUZZLE_BOARD_CHROME_PX);
    }
    const capByLandscapeTray = false;
    let cell;
    if (
      isPracticeTablePuzzle &&
      practiceTableIsLandscapeTablet() &&
      !footprintUnificationActive
    ) {
      cell = computePracticeTableLandscapePuzzleCell(
        innerContentWidth,
        innerContentHeight,
        rows,
        cols,
        tableBoardScale,
      );
    } else if (footprintUnificationActive && practiceFootprint) {
      const centerBudget =
        practiceTablePuzzlePortraitCenterBudgetPx(wrap) ?? practiceFootprint.centerPx;
      const innerCenter = Math.max(0, centerBudget - PRACTICE_TABLE_PUZZLE_BOARD_CHROME_PX);
      const innerFootprintHeight = Math.max(
        0,
        practiceFootprint.centerPx - PRACTICE_TABLE_PUZZLE_BOARD_CHROME_PX,
      );
      const cellFromWidth = Math.floor(innerCenter / cols);
      const cellFromHeight = Math.floor(innerFootprintHeight / rows);
      cell = Math.max(1, Math.min(cellFromWidth, cellFromHeight));
    } else {
      cell = practiceTablePuzzleBoardCellSize(
        puzzleInnerWidth,
        puzzleInnerHeight,
        tableBoardScale,
        rows,
        cols,
        capByLandscapeTray,
      );
    }
    let boardWidth = cell * cols;
    let boardHeight = cell * rows;
    if (isPracticeTablePuzzle) {
      boardWidth += PRACTICE_TABLE_PUZZLE_BOARD_CHROME_PX;
      boardHeight += PRACTICE_TABLE_PUZZLE_BOARD_CHROME_PX;
    }
    boardElement.style.width = `${boardWidth}px`;
    boardElement.style.height = `${boardHeight}px`;
    boardElement.style.gridTemplateColumns = `repeat(${cols}, ${cell}px)`;
    boardElement.style.gridTemplateRows = `repeat(${rows}, ${cell}px)`;
    if (isPracticeTablePuzzle) {
      if (
        practiceTableIsLandscapeTablet() &&
        !footprintUnificationActive
      ) {
        const seatClearance = practiceTableBoardSeatClearancePx();
        cell = shrinkPracticeTablePuzzleLandscapeCellForSeat(cell, rows, cols, seatClearance);
        applyPracticeTablePuzzleBoardCellStyles(cell, rows, cols);
      } else {
        const playerSeat = document.getElementById("player-seat-row");
        if (
          !footprintUnificationActive &&
          playerSeat &&
          boardElement.getBoundingClientRect().bottom > playerSeat.getBoundingClientRect().top - 2 &&
          cell > 1
        ) {
          cell -= 1;
          boardWidth = cell * cols + PRACTICE_TABLE_PUZZLE_BOARD_CHROME_PX;
          boardHeight = cell * rows + PRACTICE_TABLE_PUZZLE_BOARD_CHROME_PX;
          boardElement.style.width = `${boardWidth}px`;
          boardElement.style.height = `${boardHeight}px`;
          boardElement.style.gridTemplateColumns = `repeat(${cols}, ${cell}px)`;
          boardElement.style.gridTemplateRows = `repeat(${rows}, ${cell}px)`;
        }
      }
      applyPracticeTablePuzzleLandscapeVars(cell, rows, cols, isPracticeTablePuzzle);
      applyPracticeTablePuzzlePortraitVars(cell, rows, cols, isPracticeTablePuzzle);
      schedulePracticeTablePuzzleTrayPieceSizeSync();
    } else {
      clearPracticeTablePuzzleLandscapeVars();
    }
    finalizeBoardGeometryLock();
    return;
  }

  const isPracticeTableCheckers =
    document.body.classList.contains("practice-table-layout") &&
    !document.body.classList.contains("friend-mode");
  let heightForCell = innerContentHeight;
  if (practiceTableIsLandscapeTablet() && isPracticeTableCheckers) {
    const boardBorderY =
      (Number.parseFloat(boardComputed.borderTopWidth) || 0) +
      (Number.parseFloat(boardComputed.borderBottomWidth) || 0);
    heightForCell = Math.max(0, innerContentHeight - boardBorderY);
  }

  let cell;
  if (footprintUnificationActive && practiceFootprint) {
    cell = practiceFootprint.cell;
  } else {
    const cellFromWidth = Math.floor((innerContentWidth * tableBoardScale) / BOARD_SIZE);
    const cellFromHeight = Math.floor((heightForCell * tableBoardScale) / BOARD_SIZE);
    cell = touchTargetCellSizeFromAxes(cellFromWidth, cellFromHeight);
  }
  let boardPixels = cell * BOARD_SIZE;
  const boardBorderPx = practiceTableCheckersBoardBorderPx(boardComputed);
  if (isPracticeTableCheckers && boardBorderPx > 0) {
    boardPixels += boardBorderPx;
  }

  boardElement.style.width = `${boardPixels}px`;
  boardElement.style.height = `${boardPixels}px`;
  boardElement.style.gridTemplateColumns = `repeat(${BOARD_SIZE}, ${cell}px)`;
  boardElement.style.gridTemplateRows = `repeat(${BOARD_SIZE}, ${cell}px)`;

  if (isPracticeTableCheckers) {
    const playerSeat = document.getElementById("player-seat-row");
    if (
      !footprintUnificationActive &&
      playerSeat &&
      boardElement.getBoundingClientRect().bottom > playerSeat.getBoundingClientRect().top - 4 &&
      cell > 1
    ) {
      cell -= 1;
      boardPixels = practiceTableCheckersBoardPixelsFromCell(cell, boardBorderPx);
      boardElement.style.width = `${boardPixels}px`;
      boardElement.style.height = `${boardPixels}px`;
      boardElement.style.gridTemplateColumns = `repeat(${BOARD_SIZE}, ${cell}px)`;
      boardElement.style.gridTemplateRows = `repeat(${BOARD_SIZE}, ${cell}px)`;
    }
    applyPracticeTableCheckersLandscapeBoardStyles();
  }

  finalizeBoardGeometryLock();
}

function scheduleAudioUnlockFromGesture() {
  window.requestAnimationFrame(() => {
    noteUserGesture();
    ensureAudioContext();
    if (playMode === "friend" && remoteSession) {
      if (speechNeedsInteractionUnlock && !friendVoiceStartDismissed) {
        updateSpeechUnlockOverlay();
        return;
      }
      friendGestureAudioTick();
      return;
    }
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
  if (playMode === "friend" && !remoteSession) {
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

function buildFriendGameSwitchVoicePhrase(_gameId = selectedGameId) {
  if (playMode === "friend" && remoteSession?.ready && isStarterFlipPending()) {
    return getFriendFlipTurnPhrase(getFriendFlipperColor());
  }
  return "";
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
/** Guest attach: full welcome+team must finish before flip/turn clips (even if flip already happened). */
let friendGuestWelcomeArmed = false;
/** True after the one-time Friend "Start" tap; never cleared until leaving the room. */
let friendVoiceStartDismissed = false;
let friendFlipTurnSpeechLockUntil = 0;
let friendFlipTurnLastPhrase = "";
let friendOpponentJoinedSpeechLockUntil = 0;
let friendSwitchVoiceLockUntil = 0;
let friendLobbyPromptSpoken = false;
let pendingFriendLobbyVoice = false;
let friendLobbyPlayRequestedAt = 0;
let friendLobbyAutoplayPasses = 0;
let friendLobbyAutoplayGeneration = 0;
const friendLobbyAutoplayTimerIds = [];
let friendInviteToPlaySpoken = false;
let pendingFriendInviteToPlayVoice = false;
let friendClipSequenceQueue = [];
let friendClipSequencePlaying = false;
/** Welcome lines queued only if the first play attempt failed (never replayed mid-game). */
let pendingWelcomeVoiceLines = [];
let lastMascotVoiceThought = "";
let lastPracticeMascotVoiceThought = "";
/** Set when the user taps Create/Join, the board, or Practice Start — unlocks friend WAV playback. */
let pufflyVoiceReady = false;
let friendConnectedChimeAt = 0;
/** True after we spoke "Your turn." for the current continuous turn (incl. multi-jump). */
let friendYourTurnVoiceAnnounced = false;
/** Tracks room turn color so mascot voice can fire again after opponent turns. */
let friendLastVoiceTurnPlayer = null;
/** True while replaying an opponent move — skip turn voice (stale currentPlayer). */
let friendRemoteAnimating = false;
/** applyRemoteRoomState sets this so render does not double-announce turn voice. */
let friendSkipTurnVoiceThisRender = false;
/** Post-flip "Your turn" when sync had no gesture (non-flipper device, e.g. Green iPad). */
let friendPendingYourTurnVoice = false;
/** Opponent turn (e.g. "Blue's turn") deferred while guest welcome has not played yet. */
let friendPendingOpponentTurnVoice = false;
let friendPostFlipDrainRetryTimerIds = [];
/** Prevents overlapping mascot WAV starts before onstart (crackly doubles on first tap). */
let friendMascotVoiceInFlight = false;
/** Bumps when a new "your_turn" play starts so stale async fallbacks cannot double-speak. */
let friendYourTurnClipGeneration = 0;
/** True from your_turn play() until onended/onerror — blocks every duplicate path (incl. force). */
let friendYourTurnClipPlaying = false;
/** Pre-flip mascot line (Tap FLIP / Blue is flipping) queued for next gesture on iOS. */
let friendPendingPreFlipVoice = false;
/** Clip phrase already spoken for the current pre-flip phase (blocks repeat on FLIP tap). */
let friendPreFlipClipSpoken = "";
/** Remote flip/turn sync may play turn WAV without a fresh gesture until this time. */
let friendPostFlipTurnVoiceUntil = 0;
/** Join tap keeps iOS audio unlocked across the room API round-trip. */
let friendJoinGestureUntil = 0;
/** Full welcome lines captured at join (avoid stale flip phrases on late first tap). */
let friendWelcomeLinesSnapshot = [];
/** User started moving while welcome was still queued — do not dump intro on first move. */
let friendWelcomeAbortedForPlay = false;
/** Latest mascot line waiting for an iOS gesture (replaces older pending lines). */
let friendIosPendingMascotThought = "";
let friendClipSequenceWatchdog = null;

/** VOICE-F1: single friend playback queue — all gameplay clips go through here. */
let friendVoiceBusQueue = [];
let friendVoiceBusPlaying = false;
let friendVoiceBusDrainPending = false;
let friendVoiceBusDrainCoalesceOpts = null;
let friendGestureAudioTickChain = null;
let friendVoiceBusLastPlayedAt = 0;
let friendVoiceBusLastPlayedTransitionId = "";
const friendVoiceBusSpokenIds = new Set();
const FRIEND_VOICE_BUS_PRIO = {
  lobby: 5,
  welcome: 10,
  flip: 20,
  your_turn: 30,
  opponent_turn: 30,
  status: 40,
};

function resetFriendVoiceBus() {
  clearFriendPostFlipDrainRetries();
  friendVoiceBusQueue = [];
  friendVoiceBusPlaying = false;
  friendVoiceBusDrainPending = false;
  friendVoiceBusDrainCoalesceOpts = null;
  friendGestureAudioTickChain = null;
  friendVoiceBusLastPlayedAt = 0;
  friendVoiceBusLastPlayedTransitionId = "";
  friendVoiceBusSpokenIds.clear();
  friendYourTurnVoiceAnnounced = false;
  friendYourTurnClipPlaying = false;
}

function friendVoiceBusPreFlipTransitionId() {
  const room = remoteSession?.roomCode || "room";
  const version = typeof remoteSession?.version === "number" ? remoteSession.version : 0;
  return `preflip:${room}:${selectedGameId}:v${version}`;
}

function friendVoiceBusTurnTransitionId(player, _version) {
  return `turn:${player}`;
}

function friendVoiceBusClearTurnSpoken(player) {
  if (player === "dark" || player === "light") {
    friendVoiceBusSpokenIds.delete(friendVoiceBusTurnTransitionId(player));
  }
}

function friendVoiceBusClearPreFlipSpoken() {
  const room = remoteSession?.roomCode || "room";
  const prefix = `preflip:${room}:`;
  for (const id of [...friendVoiceBusSpokenIds]) {
    if (id.startsWith(prefix)) {
      friendVoiceBusSpokenIds.delete(id);
    }
  }
  friendVoiceBusQueue = friendVoiceBusQueue.filter((item) => item.kind !== "flip");
}

/** Flip finished — drop unplayed pre-flip clips (obsolete after flip; do not mark as spoken). */
function friendVoiceBusRetirePreFlipVoice() {
  friendVoiceBusQueue = friendVoiceBusQueue.filter((item) => item.kind !== "flip");
}

function friendVoiceBusDropStaleTurnHead() {
  while (friendVoiceBusQueue.length) {
    const head = friendVoiceBusQueue[0];
    if (head.kind === "your_turn" && friendYourTurnVoiceAnnounced) {
      friendVoiceBusQueue.shift();
      continue;
    }
    if (head.transitionId && friendVoiceBusSpokenIds.has(head.transitionId)) {
      friendVoiceBusQueue.shift();
      continue;
    }
    break;
  }
}

/** iOS: play "your_turn" via Web Audio (HTML needs a fresh tap; START unlocks AudioContext). */
function playFriendYourTurnClipNow(options = {}) {
  if (playMode !== "friend" || !audioEnabled || !remoteSession?.ready || !isFriendYourTurnNow()) {
    return Promise.resolve(false);
  }
  if (!options.force && friendGameplayVoiceGatedByWelcome()) {
    friendPendingYourTurnVoice = true;
    voiceDebugLog("your_turn_deferred", { reason: "welcome_gate" });
    return Promise.resolve(false);
  }
  if (friendYourTurnVoiceAnnounced && !options.force) {
    return Promise.resolve(true);
  }
  if (friendYourTurnClipPlaying) {
    return Promise.resolve(true);
  }
  const version = typeof remoteSession.version === "number" ? remoteSession.version : 0;
  const transitionId = friendVoiceBusTurnTransitionId(state.currentPlayer, version);
  if (friendVoiceBusSpokenIds.has(transitionId) && !options.force) {
    friendYourTurnVoiceAnnounced = true;
    friendPendingYourTurnVoice = false;
    return Promise.resolve(true);
  }
  if (speechNeedsInteractionUnlock && !friendIosCanPlayClip(options)) {
    friendPendingYourTurnVoice = true;
    return Promise.resolve(false);
  }
  resumeFriendAudioContextFromGesture();
  friendVoiceBusQueue = friendVoiceBusQueue.filter((item) => item.kind !== "your_turn");
  stopAllVoiceClips();
  friendVoiceBusPlaying = false;
  friendYourTurnClipPlaying = true;
  voiceDebugLog("your_turn_now", { transitionId });
  return playVoiceClip(
    "your_turn",
    {
      onstart: () => {
        friendVoiceBusSpokenIds.add(transitionId);
        friendYourTurnVoiceAnnounced = true;
        friendPendingYourTurnVoice = false;
        clearFriendPostFlipDrainRetries();
        lastSpokenPhrase = "your_turn";
        lastTurnSpoken = getFriendTurnPhrase(state.currentPlayer);
      },
      onend: () => {
        friendYourTurnClipPlaying = false;
        tryDrainFriendVoiceBus({ fromGesture: Boolean(options.fromGesture) });
      },
      onerror: () => {
        friendYourTurnClipPlaying = false;
        friendVoiceBusDrainPending = true;
        friendPendingYourTurnVoice = true;
      },
    },
    {
      fromGesture: Boolean(options.fromGesture),
      preferHtml: false,
    },
  ).then((ok) => {
    if (!ok) {
      friendYourTurnClipPlaying = false;
      friendVoiceBusDrainPending = true;
      friendPendingYourTurnVoice = true;
      voiceDebugLog("your_turn_now_fail", { transitionId });
    }
    return ok;
  });
}

/** iOS guest: play pre-flip clip immediately on gesture (no warm-up / queue race). */
function playFriendPreflipClipNow(options = {}) {
  if (playMode !== "friend" || !audioEnabled || !remoteSession?.ready || !isStarterFlipPending()) {
    return Promise.resolve(false);
  }
  if (!options.force && friendGameplayVoiceGatedByWelcome()) {
    friendPendingPreFlipVoice = true;
    voiceDebugLog("preflip_deferred", { reason: "welcome_gate" });
    return Promise.resolve(false);
  }
  const transitionId = friendVoiceBusPreFlipTransitionId();
  if (friendVoiceBusSpokenIds.has(transitionId) && !options.force) {
    return Promise.resolve(true);
  }
  if (speechNeedsInteractionUnlock && !friendIosCanPlayClip(options)) {
    return Promise.resolve(false);
  }
  resumeFriendAudioContextFromGesture();
  const flipper = getFriendFlipperColor();
  const local = remoteSession.color;
  const clipId =
    local === flipper ? "tap_flip_start" : flipper === "dark" ? "blue_is_flipping" : "green_is_flipping";
  friendVoiceBusQueue = friendVoiceBusQueue.filter((item) => item.kind !== "flip");
  stopAllVoiceClips();
  friendVoiceBusPlaying = false;
  friendYourTurnClipPlaying = false;
  voiceDebugLog("preflip_now", { clipId, transitionId });
  const preferHtml = speechNeedsInteractionUnlock && Boolean(options.fromGesture);
  return playVoiceClip(
    clipId,
    {
      onstart: () => {
        friendVoiceBusSpokenIds.add(transitionId);
        lastSpokenPhrase = clipId;
        friendPreFlipClipSpoken = clipId;
      },
    },
    {
      fromGesture: Boolean(options.fromGesture),
      preferHtml,
    },
  );
}

function announceFriendPreFlipVoiceNow(options = {}) {
  if (playMode !== "friend" || !audioEnabled || !remoteSession?.ready || !isStarterFlipPending()) {
    return Promise.resolve(false);
  }
  if (!options.force && friendGameplayVoiceGatedByWelcome()) {
    friendPendingPreFlipVoice = true;
    enqueueFriendPreFlipVoice();
    markFriendSyncVoiceWindow();
    return Promise.resolve(false);
  }
  const drainOpts = {
    fromGesture: Boolean(
      options.fromGesture || hadRecentFriendGesture() || friendPostFlipTurnVoiceActive(),
    ),
  };
  enqueueFriendPreFlipVoice();
  markFriendSyncVoiceWindow();
  return warmFriendSessionVoiceClips()
    .then(() => playFriendPreflipClipNow({ ...drainOpts, force: Boolean(options.force) }))
    .then((ok) => {
      if (!ok) {
        tryDrainFriendVoiceBus(drainOpts);
      }
      return ok;
    });
}

function friendVoiceBusAbortWelcome() {
  friendVoiceBusQueue = friendVoiceBusQueue.filter((item) => item.kind !== "welcome");
}

function requestFriendVoice({ kind, clipId, transitionId, priority, replace = false, replaceTurnOnly = false }) {
  if (playMode !== "friend" || !audioEnabled) {
    return false;
  }
  const safeClipId = friendSafeVoiceClipId(clipId);
  if (!safeClipId) {
    return false;
  }
  if (transitionId && friendVoiceBusSpokenIds.has(transitionId)) {
    voiceDebugBlocked("bus", "spoken", { transitionId, clipId: safeClipId });
    return false;
  }
  if (transitionId && friendVoiceBusQueue.some((item) => item.transitionId === transitionId)) {
    voiceDebugBlocked("bus", "queued", { transitionId, clipId: safeClipId });
    return false;
  }
  const item = {
    kind: kind || "status",
    clipId: safeClipId,
    transitionId: transitionId || null,
    priority: typeof priority === "number" ? priority : FRIEND_VOICE_BUS_PRIO[kind] ?? 50,
  };
  if (replaceTurnOnly) {
    if (friendVoiceBusPlaying) {
      const head = friendVoiceBusQueue[0];
      if (head && (head.kind === "your_turn" || head.kind === "opponent_turn")) {
        stopAllVoiceClips();
        friendVoiceBusPlaying = false;
      }
    }
    friendVoiceBusQueue = friendVoiceBusQueue.filter(
      (queued) => queued.kind !== "your_turn" && queued.kind !== "opponent_turn",
    );
    friendVoiceBusQueue.push(item);
    friendVoiceBusQueue.sort((a, b) => a.priority - b.priority);
  } else if (replace) {
    if (friendVoiceBusPlaying) {
      stopAllVoiceClips();
      friendVoiceBusPlaying = false;
    }
    friendVoiceBusQueue = [item];
  } else {
    friendVoiceBusQueue.push(item);
    friendVoiceBusQueue.sort((a, b) => a.priority - b.priority);
  }
  voiceDebugLog("bus_enqueue", {
    clipId: safeClipId,
    transitionId: item.transitionId,
    kind: item.kind,
    queue: friendVoiceBusQueue.length,
  });
  return true;
}

function enqueueFriendWelcomePhrases(phrases) {
  if (playMode !== "friend" || !audioEnabled) {
    return 0;
  }
  const room = remoteSession?.roomCode || "lobby";
  let lines = filterClipPhrases(Array.isArray(phrases) ? phrases : []).filter(
    (line) => !friendClipPhraseBlocked(line),
  );
  if (Date.now() - friendConnectedChimeAt < 8000) {
    lines = lines.filter((line) => line !== "You are connected.");
  }
  lines.forEach((phrase, index) => {
    const clipId = resolveVoiceClipId(phrase);
    if (!clipId) {
      return;
    }
    requestFriendVoice({
      kind: "welcome",
      clipId,
      transitionId: `welcome:${room}:${phrase}`,
      priority: FRIEND_VOICE_BUS_PRIO.welcome + index,
    });
  });
  return lines.length;
}

function enqueueFriendPreFlipVoice() {
  if (!remoteSession?.ready || !isStarterFlipPending()) {
    return false;
  }
  if (friendGameplayVoiceGatedByWelcome()) {
    friendPendingPreFlipVoice = true;
    return false;
  }
  const flipper = getFriendFlipperColor();
  const local = remoteSession.color;
  let clipId = "tap_flip_start";
  if (local !== flipper) {
    clipId = flipper === "dark" ? "blue_is_flipping" : "green_is_flipping";
  }
  return requestFriendVoice({
    kind: "flip",
    clipId,
    transitionId: friendVoiceBusPreFlipTransitionId(),
    priority: FRIEND_VOICE_BUS_PRIO.flip,
  });
}

function enqueueFriendTurnVoice(activePlayer, version, options = {}) {
  if (!remoteSession?.ready || isStarterFlipPending() || state?.winner || state?.draw) {
    return false;
  }
  if (activePlayer !== "dark" && activePlayer !== "light") {
    return false;
  }
  if (friendGameplayVoiceGatedByWelcome()) {
    if (activePlayer === remoteSession.color) {
      friendPendingYourTurnVoice = true;
      friendPendingOpponentTurnVoice = false;
    } else {
      friendPendingOpponentTurnVoice = true;
    }
    return false;
  }
  const local = remoteSession.color;
  const isYours = activePlayer === local;
  const transitionId = friendVoiceBusTurnTransitionId(activePlayer, version);
  if (friendVoiceBusSpokenIds.has(transitionId)) {
    return false;
  }
  if (isYours && friendYourTurnVoiceAnnounced && state?.currentPlayer === activePlayer) {
    return false;
  }
  const clipId = isYours ? "your_turn" : activePlayer === "dark" ? "blue_turn" : "green_turn";
  return requestFriendVoice({
    kind: isYours ? "your_turn" : "opponent_turn",
    clipId,
    transitionId,
    priority: FRIEND_VOICE_BUS_PRIO.your_turn,
    replace: Boolean(options.replace) && !options.replaceTurnOnly,
    replaceTurnOnly: Boolean(options.replaceTurnOnly),
  });
}

function drainFriendVoiceBus(options = {}) {
  if (friendVoiceBusPlaying) {
    return;
  }
  friendVoiceBusDropStaleTurnHead();
  if (!friendVoiceBusQueue.length) {
    friendVoiceBusDrainPending = false;
    return;
  }
  if (speechNeedsInteractionUnlock && !friendIosCanPlayClip(options)) {
    friendVoiceBusDrainPending = true;
    voiceDebugBlocked("bus", "drain_deferred");
    return;
  }
  friendVoiceBusDrainPending = false;
  const item = friendVoiceBusQueue[0];
  if (
    item.transitionId &&
    item.transitionId === friendVoiceBusLastPlayedTransitionId &&
    Date.now() - friendVoiceBusLastPlayedAt < 900
  ) {
    friendVoiceBusQueue.shift();
    scheduleCoalescedDrainFriendVoiceBus(options);
    return;
  }
  stopAllVoiceClips();
  friendVoiceBusPlaying = true;
  voiceDebugLog("bus_play", { clipId: item.clipId, transitionId: item.transitionId, kind: item.kind });
  const handlers = {
    onstart: () => {
      if (item.transitionId) {
        friendVoiceBusSpokenIds.add(item.transitionId);
        friendVoiceBusLastPlayedTransitionId = item.transitionId;
        friendVoiceBusLastPlayedAt = Date.now();
      }
      if (item.kind === "your_turn") {
        friendYourTurnVoiceAnnounced = true;
        friendPendingYourTurnVoice = false;
        clearFriendPostFlipDrainRetries();
      }
      lastSpokenPhrase = item.clipId;
      lastTurnSpoken = getFriendTurnPhrase(state?.currentPlayer);
    },
    onend: () => {
      friendVoiceBusPlaying = false;
      friendYourTurnClipPlaying = false;
      if (friendVoiceBusQueue[0] === item) {
        friendVoiceBusQueue.shift();
      }
      if (item.kind === "welcome" && !friendVoiceBusQueue.some((q) => q.kind === "welcome")) {
        finishFriendGuestWelcomePlayback();
        flushFriendGameplayVoiceAfterWelcome(options);
      }
      drainFriendVoiceBus(options);
    },
    onerror: () => {
      friendVoiceBusPlaying = false;
      friendYourTurnClipPlaying = false;
      friendVoiceBusDrainPending = true;
      voiceDebugLog("bus_error", { clipId: item.clipId, transitionId: item.transitionId });
    },
  };
  if (item.kind === "your_turn") {
    friendYourTurnClipPlaying = true;
  }
  const playClip = () => {
    if (speechNeedsInteractionUnlock) {
      const yourTurnClip = item.clipId === "your_turn";
      return playVoiceClip(item.clipId, handlers, {
        fromGesture: Boolean(options.fromGesture),
        preferHtml: yourTurnClip ? false : true,
      });
    }
    return playVoiceClip(item.clipId, handlers, { fromGesture: Boolean(options.fromGesture) });
  };
  void playClip().then((ok) => {
    if (!ok) {
      friendVoiceBusPlaying = false;
      friendYourTurnClipPlaying = false;
      friendVoiceBusDrainPending = true;
      voiceDebugLog("bus_fail", { clipId: item.clipId, transitionId: item.transitionId });
    }
  });
}

function scheduleCoalescedDrainFriendVoiceBus(options = {}) {
  if (friendVoiceBusDrainCoalesceOpts) {
    friendVoiceBusDrainCoalesceOpts.fromGesture =
      friendVoiceBusDrainCoalesceOpts.fromGesture || Boolean(options.fromGesture);
    return;
  }
  friendVoiceBusDrainCoalesceOpts = { fromGesture: Boolean(options.fromGesture) };
  queueMicrotask(() => {
    const opts = friendVoiceBusDrainCoalesceOpts || { fromGesture: false };
    friendVoiceBusDrainCoalesceOpts = null;
    drainFriendVoiceBus(opts);
  });
}

function tryDrainFriendVoiceBus(options = {}) {
  if (playMode !== "friend" || !audioEnabled) {
    return;
  }
  void warmFriendSessionVoiceClips();
  scheduleCoalescedDrainFriendVoiceBus(options);
}

function syncFriendVoiceBusFromStates(previousState, nextState, meta = {}) {
  if (playMode !== "friend" || !audioEnabled || !remoteSession?.ready || !nextState) {
    return;
  }
  const version = typeof remoteSession.version === "number" ? remoteSession.version : 0;
  const drainOpts = meta.fromGesture ? { fromGesture: true } : {};
  if (meta.gameTypeChanged) {
    friendVoiceBusClearPreFlipSpoken();
  }
  if (meta.skipTurnVoice || friendRemoteAnimating) {
    return;
  }
  const flipJustCompleted =
    Boolean(meta.flipJustCompleted) ||
    Boolean(previousState && !previousState.starterFlipDone && nextState.starterFlipDone);
  if (flipJustCompleted && !nextState.winner && !nextState.draw) {
    markFriendSyncVoiceWindow();
    friendVoiceBusRetirePreFlipVoice();
    friendVoiceBusClearTurnSpoken(nextState.currentPlayer);
    friendYourTurnVoiceAnnounced = false;
    const localTurnAfterFlip = nextState.currentPlayer === remoteSession.color;
    if (localTurnAfterFlip) {
      markFriendPendingYourTurnAfterFlip(nextState.currentPlayer);
    } else {
      friendPendingYourTurnVoice = false;
    }
    enqueueFriendTurnVoice(nextState.currentPlayer, version, { replaceTurnOnly: true });
    const flipDrainOpts = {
      fromGesture: Boolean(
        drainOpts.fromGesture || hadRecentFriendGesture() || localTurnAfterFlip,
      ),
    };
    if (localTurnAfterFlip) {
      if (friendGameplayVoiceGatedByWelcome()) {
        friendPendingYourTurnVoice = true;
        friendPendingOpponentTurnVoice = false;
      } else {
        void warmFriendSessionVoiceClips().then(() => {
          void playFriendYourTurnClipNow(flipDrainOpts);
        });
        scheduleFriendPostFlipTurnVoiceRetries(flipDrainOpts);
      }
    } else if (friendGameplayVoiceGatedByWelcome()) {
      friendPendingOpponentTurnVoice = true;
      friendPendingYourTurnVoice = false;
    } else {
      tryDrainFriendVoiceBus(flipDrainOpts);
    }
    return;
  }
  const turnChanged =
    previousState?.starterFlipDone &&
    nextState.starterFlipDone &&
    previousState.currentPlayer !== nextState.currentPlayer &&
    !nextState.winner &&
    !nextState.draw;
  if (turnChanged) {
    markFriendSyncVoiceWindow();
    friendVoiceBusClearTurnSpoken(nextState.currentPlayer);
    if (nextState.currentPlayer !== remoteSession.color) {
      friendYourTurnVoiceAnnounced = false;
    }
    enqueueFriendTurnVoice(nextState.currentPlayer, version);
    tryDrainFriendVoiceBus(drainOpts);
    return;
  }
  if (!nextState.starterFlipDone && !nextState.winner && !nextState.draw) {
    if (friendGameplayVoiceGatedByWelcome()) {
      enqueueFriendPreFlipVoice();
      friendPendingPreFlipVoice = true;
      markFriendSyncVoiceWindow();
    } else {
      void announceFriendPreFlipVoiceNow(drainOpts);
    }
  }
}

/** Enqueue pre-flip / turn clips from the live room snapshot (guest attach, hydrate, game refresh). */
function syncFriendGameplayVoiceFromRoom(options = {}) {
  if (playMode !== "friend" || !audioEnabled || !remoteSession?.ready || !state) {
    return;
  }
  const meta = { fromGesture: Boolean(options.fromGesture) };
  if (!state.starterFlipDone && !state.winner && !state.draw) {
    syncFriendVoiceBusFromStates(
      {
        starterFlipDone: false,
        currentPlayer: state.currentPlayer,
        winner: null,
        draw: false,
      },
      state,
      meta,
    );
    return;
  }
  syncFriendVoiceBusFromStates(
    {
      starterFlipDone: Boolean(state.starterFlipDone),
      currentPlayer: state.currentPlayer,
      winner: state.winner,
      draw: state.draw,
    },
    state,
    meta,
  );
}

/** Local commit* updates state before submitRemoteMove, so poll apply sees no turn change — notify bus here. */
function notifyFriendVoiceAfterLocalMove(moverPlayer, nextState) {
  if (playMode !== "friend" || !remoteSession?.ready || !nextState || !moverPlayer) {
    return;
  }
  resumeFriendAudioContextFromGesture();
  syncFriendVoiceBusFromStates(
    {
      starterFlipDone: Boolean(nextState.starterFlipDone),
      currentPlayer: moverPlayer,
      winner: nextState.winner,
      draw: nextState.draw,
    },
    nextState,
    { fromGesture: true },
  );
}

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

  stopAllVoiceClips();
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
  if ((mustStayOnFriendInviteUi() || mustNeverColdBootPractice()) && !options.userChosePractice) {
    return;
  }
  if (
    (isInvitePageLocked() ||
      isFriendInviteLandingLocked() ||
      readFriendJoinIntent()?.roomCode ||
      shouldBlockPracticeColdBoot()) &&
    !options.userChosePractice
  ) {
    return;
  }
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
  if (
    typeof document !== "undefined" &&
    document.body.classList.contains("practice-table-layout") &&
    !document.body.classList.contains("friend-mode")
  ) {
    lastPracticeTableChromeKey = "";
  }
  schedulePracticeTableRelayoutIfNeeded();
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

function markFriendPendingYourTurnAfterFlip(activePlayer) {
  const turnPlayer = activePlayer || state?.currentPlayer;
  clearFriendPreFlipVoiceTracking();
  if (playMode !== "friend" || !remoteSession?.ready) {
    return;
  }
  if (turnPlayer !== remoteSession.color || (turnPlayer !== "dark" && turnPlayer !== "light")) {
    friendPendingYourTurnVoice = false;
    return;
  }
  friendPendingYourTurnVoice = true;
  friendYourTurnVoiceAnnounced = false;
  lastMascotVoiceThought = "";
}

/**
 * Single friend-mode path for the "your_turn" WAV.
 * iOS: Web Audio only (shared HTML <audio> restart caused "Your, Your turn" stutter).
 * Without a user gesture, sets friendPendingYourTurnVoice and returns false.
 */
/** Legacy entry — routes through Friend Voice Bus (VOICE-F1). */
function playFriendYourTurnClipOnce(options = {}) {
  if (!audioEnabled || playMode !== "friend" || !remoteSession?.ready || !isFriendYourTurnNow()) {
    return false;
  }
  if (friendYourTurnVoiceAnnounced) {
    return true;
  }
  const version = typeof remoteSession.version === "number" ? remoteSession.version : 0;
  enqueueFriendTurnVoice(state.currentPlayer, version, { replace: Boolean(options.replace) });
  tryDrainFriendVoiceBus({ fromGesture: Boolean(options.fromGesture) });
  return true;
}

function playFriendPendingYourTurnVoice() {
  return playFriendYourTurnClipOnce({ fromGesture: true });
}

function primePufflyVoiceFromGesture(options = {}) {
  resumeFriendAudioContextFromGesture();
  pufflyVoiceReady = true;
  if (playMode === "friend" && options.dismissFriendStart) {
    friendVoiceStartDismissed = true;
  }
  preloadVoiceClips();
  if (playMode === "friend" && remoteSession) {
    void warmFriendSessionVoiceClips();
  }
  updateSpeechUnlockOverlay();
  if (!friendJoinWelcomeSpoken && !hasFriendWelcomeVoicePending()) {
    const lines = pendingWelcomeVoiceLines.length
      ? pendingWelcomeVoiceLines
      : friendWelcomeLinesSnapshot;
    if (lines.length) {
      playFriendWelcomeVoiceNow(lines, { fromGesture: true });
    }
  }
}

function playConnectedFromTap() {
  friendConnectedChimeAt = Date.now();
  void playVoiceClip("connected");
}

/** Stop friend voice machinery so Practice mode is never blocked by friend queues. */
function resetFriendVoiceForPracticeSwitch() {
  pendingWelcomeVoiceLines = [];
  friendWelcomeLinesSnapshot = [];
  friendGuestWelcomeArmed = false;
  friendJoinGestureUntil = 0;
  friendWelcomeAbortedForPlay = false;
  friendIosPendingMascotThought = "";
  friendClipSequenceQueue = [];
  friendClipSequencePlaying = false;
  friendSpeechQueue.length = 0;
  friendSpeechPlaying = false;
  friendPendingYourTurnVoice = false;
  friendPendingOpponentTurnVoice = false;
  friendPendingPreFlipVoice = false;
  friendMascotVoiceInFlight = false;
  friendYourTurnClipPlaying = false;
  if (friendClipSequenceWatchdog) {
    window.clearTimeout(friendClipSequenceWatchdog);
    friendClipSequenceWatchdog = null;
  }
  if (friendSpeechWatchdog) {
    window.clearTimeout(friendSpeechWatchdog);
    friendSpeechWatchdog = null;
  }
  stopAllVoiceClips();
}

function clearFriendVoiceBuffers() {
  resetFriendVoiceForPracticeSwitch();
  lastMascotVoiceThought = "";
}

function flushFriendVoicePending() {
  if (!pendingWelcomeVoiceLines.length || friendJoinWelcomeSpoken) {
    return 0;
  }
  const lines = pendingWelcomeVoiceLines;
  return playFriendWelcomeVoiceNow(lines, { fromGesture: true }) ? lines.length : 0;
}

function speakMascotVoiceFromPanel(options = {}) {
  const thought = pufflyThought?.textContent?.trim();
  if (!thought) {
    return false;
  }
  return speakVoiceForMascotThought(thought, options);
}

function friendMascotClipPhrase(thoughtText) {
  return voiceClipPhraseFromMascotThought(String(thoughtText || "").trim());
}

/** Practice pre-flip mascot only (friend uses isFlipInterruptFriendMascotThought). */
function isPracticePreFlipMascotClipPhrase(thoughtText) {
  const phrase = friendMascotClipPhrase(thoughtText);
  return phrase === PRACTICE_CHOOSE_FLIP_VOICE_PHRASE || phrase === PRACTICE_FLIP_VOICE_PHRASE;
}

/** Flip prompts may use force replay; they also clear queued welcome clips. */
function isFlipInterruptFriendMascotThought(thoughtText) {
  if (playMode !== "friend") {
    return false;
  }
  const phrase = friendMascotClipPhrase(thoughtText);
  return (
    phrase === FRIEND_TAP_FLIP_VOICE_PHRASE ||
    phrase === FRIEND_BLUE_FLIPPING_PHRASE ||
    phrase === FRIEND_GREEN_FLIPPING_PHRASE
  );
}

function isFriendTurnMascotClipPhrase(clipPhrase) {
  return clipPhrase === "Your turn." || clipPhrase === "Blue's turn." || clipPhrase === "Green's turn.";
}

function clearFriendPreFlipVoiceTracking() {
  friendPreFlipClipSpoken = "";
  friendPendingPreFlipVoice = false;
}

function shouldSilentFriendPreFlipVoice() {
  return busy || starterFlipTapInFlight;
}

function queueFriendTurnMascotIfBlocked(thoughtText) {
  const text = String(thoughtText || "").trim();
  if (!text || playMode !== "friend" || !remoteSession?.ready || isStarterFlipPending()) {
    return;
  }
  const clipPhrase = voiceClipPhraseFromMascotThought(text);
  if (!isFriendTurnMascotClipPhrase(clipPhrase)) {
    return;
  }
  if (clipPhrase === "Your turn.") {
    if (isFriendYourTurnNow() && !friendYourTurnVoiceAnnounced) {
      friendPendingYourTurnVoice = true;
    }
    return;
  }
  if (lastSpokenPhrase === clipPhrase) {
    return;
  }
  friendIosPendingMascotThought = text;
}

function playFriendPendingPreFlipVoice() {
  if (!friendPendingPreFlipVoice || playMode !== "friend") {
    return false;
  }
  if (!isStarterFlipPending()) {
    clearFriendPreFlipVoiceTracking();
    return false;
  }
  const thought = pufflyThought?.textContent?.trim();
  if (!thought || !isFlipInterruptFriendMascotThought(thought)) {
    friendPendingPreFlipVoice = false;
    return false;
  }
  const clipPhrase = friendMascotClipPhrase(thought);
  if (clipPhrase && clipPhrase === friendPreFlipClipSpoken) {
    friendPendingPreFlipVoice = false;
    return false;
  }
  friendPendingPreFlipVoice = false;
  return speakVoiceForMascotThought(thought, { force: true, fromGesture: true });
}

/** Live "your turn" must cut through join welcome queues but still dedupe per turn. */
function shouldClearFriendClipQueueForMascot(thoughtText) {
  const phrase = friendMascotClipPhrase(thoughtText);
  if (isFlipInterruptFriendMascotThought(thoughtText)) {
    return true;
  }
  return phrase === "Your turn." && isFriendYourTurnNow();
}

/** Practice-only mascot WAV (isolated from friend queues / pending flags). */
function speakPracticeMascotVoice(thoughtText, options = {}) {
  if (!audioEnabled || playMode !== "puffly") {
    return false;
  }
  const force = Boolean(options.force);
  const fromGesture = Boolean(options.fromGesture);
  if (!practiceVoiceStartDismissed && !fromGesture) {
    return false;
  }
  const text = String(thoughtText || "").trim();
  if (!text || (!force && text === lastPracticeMascotVoiceThought)) {
    return false;
  }
  const clipPhrase = voiceClipPhraseFromMascotThought(text);
  if (!clipPhrase) {
    return false;
  }
  if (!force && Date.now() < practiceFlipResultSpeechLockUntil && clipPhrase !== "Your turn.") {
    return false;
  }
  const clipId = resolveVoiceClipId(clipPhrase);
  if (!clipId) {
    return false;
  }
  const isPracticeFlipClip =
    clipPhrase === PRACTICE_FLIP_VOICE_PHRASE || clipPhrase === PRACTICE_CHOOSE_FLIP_VOICE_PHRASE;
  if (isPracticeFlipClip && practiceFlipUtteranceHeard && !options.allowFlipReplay) {
    return false;
  }
  if (isPracticeFlipClip || text.includes("Your turn")) {
    stopAllVoiceClips();
  }
  if (clipPhrase === PRACTICE_FLIP_VOICE_PHRASE) {
    practiceFlipDelivering = true;
    practiceFlipSpeechLockUntil = Date.now() + 4500;
  }
  const clipFromGesture = Boolean(options.fromGesture ?? force);
  const preferHtml = !speechNeedsInteractionUnlock;
  console.info("[puffly] practice mascot voice", SPEECH_BUILD, text, "→", clipPhrase);
  ensureAudioContext({ skipSpeechUnlock: true });
  const clipHandlers = {
    onstart: () => {
      lastPracticeMascotVoiceThought = text;
      lastSpokenPhrase = clipPhrase;
      if (clipPhrase === "Your turn.") {
        practiceFlipResultSpeechLockUntil = 0;
        lastTurnSpoken = "Your turn.";
      }
      if (isPracticeFlipClip) {
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
      if (!force) {
        lastPracticeMascotVoiceThought = "";
      }
      if (clipPhrase === PRACTICE_FLIP_VOICE_PHRASE) {
        practiceFlipDelivering = false;
        practiceFlipSpeechLockUntil = 0;
      }
    },
  };
  void playVoiceClip(clipId, clipHandlers, { fromGesture: clipFromGesture, preferHtml }).then((ok) => {
    if (!ok && !force) {
      lastPracticeMascotVoiceThought = "";
    }
  });
  return true;
}

/** Friend mascot UI only — gameplay clips use Friend Voice Bus (VOICE-F1). */
function speakFriendMascotVoice(thoughtText, options = {}) {
  void thoughtText;
  void options;
  if (playMode !== "friend") {
    return false;
  }
  voiceDebugLog("mascot_skipped_bus");
  return false;
}

function speakVoiceForMascotThought(thoughtText, options = {}) {
  if (playMode === "friend") {
    return speakFriendMascotVoice(thoughtText, options);
  }
  if (playMode === "puffly") {
    return speakPracticeMascotVoice(thoughtText, options);
  }
  return false;
}

/** Play welcome clips immediately (Create/Join gesture); do not buffer until later moves. */
function playFriendWelcomeVoiceNow(phrases, options = {}) {
  if (!audioEnabled || !syncPlayModeForFriendVoice()) {
    return false;
  }
  if (friendWelcomeAbortedForPlay) {
    return false;
  }
  if (!options.force && hasFriendWelcomeVoicePending()) {
    voiceDebugLog("welcome_skip", { reason: "in_flight" });
    return true;
  }
  prepareFriendWelcomeVoicePlayback();
  const sourceLines =
    friendWelcomeLinesSnapshot.length > 0
      ? friendWelcomeLinesSnapshot
      : Array.isArray(phrases)
        ? phrases
        : [];
  const lines = friendWelcomeLinesForPlayback(sourceLines).filter((line) => !friendClipPhraseBlocked(line));
  if (!lines.length) {
    return false;
  }
  if (speechNeedsInteractionUnlock && !friendIosCanPlayClip(options)) {
    pendingWelcomeVoiceLines = lines;
    friendWelcomeLinesSnapshot = lines;
    console.info("[puffly] welcome voice deferred (iOS gesture)", SPEECH_BUILD, lines.join(" → "));
    return false;
  }
  lastMascotVoiceThought = "";
  resumeFriendAudioContextFromGesture();
  console.info("[puffly] welcome voice now", SPEECH_BUILD, lines.join(" → "));
  const count = enqueueFriendWelcomePhrases(lines);
  pendingWelcomeVoiceLines = [];
  if (count > 0) {
    tryDrainFriendVoiceBus({ fromGesture: Boolean(options.fromGesture) });
    return true;
  }
  pendingWelcomeVoiceLines = lines;
  return false;
}

function installGlobalVoicePrime() {
  if (friendSpeechPrimeInstalled || typeof document === "undefined") {
    return;
  }
  friendSpeechPrimeInstalled = true;
  let lastGlobalFriendVoicePrimeAt = 0;
  const onGesture = (event) => {
    if (!audioEnabled) {
      return;
    }
    if (isFriendVoiceStartTapTarget(event?.target)) {
      return;
    }
    const now = Date.now();
    if (isFriendVoiceUiActive() && speechNeedsInteractionUnlock && !friendVoiceStartDismissed) {
      noteUserGesture();
      markFriendJoinGestureWindow();
      resumeFriendAudioContextFromGesture();
      updateSpeechUnlockOverlay();
      return;
    }
    if (playMode === "friend" && !remoteSession) {
      if (isFriendRoomActionTarget(event?.target)) {
        return;
      }
      if (
        event?.target?.closest?.("#play-friend-btn, [data-play-mode='friend']")
      ) {
        return;
      }
      noteUserGesture();
      primePufflyVoiceFromGesture();
      playFriendLobbyVoiceNow({ fromGesture: true, force: true });
      return;
    }
    if (playMode === "friend" && remoteSession && now - lastGlobalFriendVoicePrimeAt < 350) {
      return;
    }
    if (playMode === "friend" && remoteSession) {
      lastGlobalFriendVoicePrimeAt = now;
      friendGestureAudioTick();
      flushPendingPrioritySpeech();
      drainFriendSpeechQueue();
      return;
    }
    primePufflyVoiceFromGesture();
  };
  document.addEventListener("pointerdown", onGesture, { capture: true });
  document.addEventListener("touchstart", onGesture, { capture: true, passive: true });
  document.addEventListener("keydown", onGesture, { capture: true });
}

function announcePracticeFlipVoice() {
  if (suppressFlipVoiceFromRender || playMode !== "puffly") {
    return;
  }
  if (
    typeof document !== "undefined" &&
    document.body.classList.contains("practice-table-layout") &&
    !document.body.classList.contains("friend-mode")
  ) {
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
  if (playMode === "friend" && remoteSession) {
    const team = resolveFriendSessionColor(remoteSession) ?? remoteSession.color;
    if (team === "dark" || team === "light") {
      return team;
    }
    return null;
  }
  if (playMode === "friend" && isInviteGuestLanding()) {
    return "light";
  }
  if (playMode === "friend" && isInviteJoinInProgress()) {
    return null;
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
  const teamColor = getLocalTeamColor();
  if (teamColor === "light") {
    return greenMascotFace;
  }
  if (teamColor === "dark") {
    return blueMascotFace;
  }
  return blueMascotFace;
}

function updateTeamMascot() {
  const teamColor = getLocalTeamColor();
  const isGreenTeam = teamColor === "light";
  const isBlueTeam = teamColor === "dark";
  const inFriendRoom = playMode === "friend" && Boolean(remoteSession);
  const inPractice = playMode === "puffly";
  const teamKnown = isGreenTeam || isBlueTeam;
  pufflyPanel?.classList.toggle("team-green", isGreenTeam);
  pufflyPanel?.classList.toggle("team-blue", isBlueTeam);
  blueMascotFace?.classList.toggle("hidden", isGreenTeam);
  greenMascotFace?.classList.toggle("hidden", !isGreenTeam);
  document.body.classList.toggle("friend-green-player", inFriendRoom && isGreenTeam);
  document.body.classList.toggle("friend-blue-player", inFriendRoom && isBlueTeam);
  blueCapturedTray?.classList.toggle("your-tray", inFriendRoom && isBlueTeam);
  greenCapturedTray?.classList.toggle("your-tray", (inFriendRoom && isGreenTeam) || inPractice);
  if (teamMascotLabel) {
    if (inFriendRoom && !teamKnown) {
      teamMascotLabel.textContent = "Connecting…";
    } else if (inFriendRoom) {
      teamMascotLabel.textContent = isGreenTeam ? "Green Team (You) 🐸" : "Blue Team (You) 🐻";
    } else {
      teamMascotLabel.textContent = "Puffly";
    }
  }
  const seatIdentity = document.querySelector(".player-seat-identity");
  const seatIcon = seatIdentity?.querySelector(".player-indicator-icon");
  const seatLabel = seatIdentity?.querySelector(".player-indicator-label");
  if (seatIdentity && playMode === "friend") {
    if (isGreenTeam) {
      if (seatIcon) {
        seatIcon.textContent = "🐸";
      }
      if (seatLabel) {
        seatLabel.textContent = "You · Green";
      }
      seatIdentity.setAttribute("aria-label", "Your seat — Green team");
    } else if (isBlueTeam) {
      if (seatIcon) {
        seatIcon.textContent = "🐻";
      }
      if (seatLabel) {
        seatLabel.textContent = "You · Blue";
      }
      seatIdentity.setAttribute("aria-label", "Your seat — Blue team");
    }
  }
  refreshFriendAvatarBand();
}

function friendMascotThoughtForTurn() {
  /* Internal / avatar-band cues (may include flip). Seat bar uses friendSeatStatusLine(). */
  if (!remoteSession?.ready) {
    return "⏳ Waiting…";
  }
  if (isStarterFlipPending()) {
    const flipper = getFriendFlipperColor();
    return remoteSession.color === flipper
      ? "🪙 Tap FLIP"
      : `🪙 ${playerDisplayName(flipper)} flipping…`;
  }
  const isYourTurn = state.currentPlayer === remoteSession.color;
  if (isYourTurn) {
    return "👀 Your turn!";
  }
  return state.currentPlayer === "dark" ? "🐻 Blue's turn" : "🐸 Green's turn";
}

/** Bottom pill gameplay turn markers only (post-flip). */
function friendSeatTurnStatus() {
  if (state?.currentPlayer === remoteSession?.color) {
    return "👀 Your turn!";
  }
  return state?.currentPlayer === "dark" ? "🐻 Blue's turn" : "🐸 Green's turn";
}

/** Bottom pill setup + gameplay status synchronized with top Room pill. */
function friendSeatStatusLine() {
  if (playMode !== "friend") {
    return "";
  }
  if (!remoteSession?.roomCode) {
    return "Tap Room to Open Game Room";
  }
  if (friendInviteInFlight) {
    return "Sending link via Messages…";
  }
  if (!remoteSession.ready) {
    if (isFriendRoomHostLocal()) {
      if (friendInviteShareReady) {
        return "Waiting for Friend to Connect";
      }
      return "Tap Room to Invite a Friend";
    }
    return "⏳ Waiting for host…";
  }
  if (selectedGameId === "puzzle" && friendPuzzleSizePendingConfirm) {
    return friendPuzzleSizePendingConfirmMessage();
  }
  if (selectedGameId === "puzzle" && friendPuzzleSizeStatusLine) {
    return friendPuzzleSizeStatusLine;
  }
  if (isStarterFlipPending()) {
    const flipper = getFriendFlipperColor();
    if (remoteSession.color === flipper) {
      return "🪙 Tap FLIP to Decide Who Starts!";
    }
    return `🪙 ${playerDisplayName(flipper)} is Flipping…`;
  }
  return friendSeatTurnStatus();
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

function hadRecentFriendGesture() {
  return Date.now() - lastUserGestureAt < FRIEND_GESTURE_AUDIO_MS;
}

function markFriendPostFlipTurnVoiceWindow() {
  friendPostFlipTurnVoiceUntil = Date.now() + FRIEND_POST_FLIP_TURN_AUDIO_MS;
}

function clearFriendPostFlipDrainRetries() {
  while (friendPostFlipDrainRetryTimerIds.length) {
    window.clearTimeout(friendPostFlipDrainRetryTimerIds.pop());
  }
}

/** iOS: first local "your turn" after flip may need several drain attempts (no extra board tap). */
function scheduleFriendPostFlipTurnVoiceRetries(options = {}) {
  clearFriendPostFlipDrainRetries();
  if (!speechNeedsInteractionUnlock) {
    return;
  }
  const delays = [0, 200, 500, 1200, 2400, 4000];
  for (const ms of delays) {
    const timerId = window.setTimeout(() => {
      if (!audioEnabled || playMode !== "friend" || !remoteSession?.ready || isStarterFlipPending()) {
        return;
      }
      if (!friendPostFlipTurnVoiceActive() && !hadRecentFriendGesture() && !options.fromGesture) {
        return;
      }
      if (isFriendYourTurnNow() && !friendYourTurnVoiceAnnounced) {
        void playFriendYourTurnClipNow({
          fromGesture: true,
          force: Boolean(options.force),
        });
      } else if (friendVoiceBusDrainPending || friendVoiceBusQueue.length) {
        tryDrainFriendVoiceBus({ fromGesture: true });
      }
      if (friendYourTurnVoiceAnnounced && !friendVoiceBusQueue.length && !friendVoiceBusDrainPending) {
        friendPendingYourTurnVoice = false;
        clearFriendPostFlipDrainRetries();
      }
    }, ms);
    friendPostFlipDrainRetryTimerIds.push(timerId);
  }
}

/** iOS may play friend clips without a fresh tap while poll/sync applies turn or pre-flip voice. */
function markFriendSyncVoiceWindow() {
  markFriendPostFlipTurnVoiceWindow();
}

function friendPostFlipTurnVoiceActive() {
  return Date.now() < friendPostFlipTurnVoiceUntil;
}

function stopFriendVoiceForTurnAnnouncement() {
  stopFriendWelcomeForGameplay();
  friendClipSequenceQueue = [];
  friendClipSequencePlaying = false;
  friendSpeechPlaying = false;
  if (friendClipSequenceWatchdog) {
    window.clearTimeout(friendClipSequenceWatchdog);
    friendClipSequenceWatchdog = null;
  }
  friendMascotVoiceInFlight = false;
  stopAllVoiceClips();
}

function markFriendJoinGestureWindow() {
  friendJoinGestureUntil = Date.now() + 12000;
  noteUserGesture();
}

async function unlockFriendAudioForJoin() {
  if (!audioEnabled) {
    return false;
  }
  markFriendJoinGestureWindow();
  resumeFriendAudioContextFromGesture();
  if (!speechNeedsInteractionUnlock) {
    preloadVoiceClips();
    return true;
  }
  const ctx = ensureAudioContext({ skipSpeechUnlock: true });
  if (!ctx) {
    return false;
  }
  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch {
      // ignore
    }
  }
  preloadVoiceClips();
  return ctx.state === "running";
}

function friendSpeakLinePrefersHtml() {
  return (
    speechNeedsInteractionUnlock &&
    (!friendJoinWelcomeSpoken ||
      friendClipSequencePlaying ||
      friendClipSequenceQueue.length > 0)
  );
}

function friendJoinGestureActive() {
  return Date.now() < friendJoinGestureUntil;
}

/** True when friend WAV/Web Audio may start (desktop always; iOS only during gesture window). */
function friendIosCanPlayClip(options = {}) {
  if (!speechNeedsInteractionUnlock) {
    return true;
  }
  if (playMode === "friend" && remoteSession && !friendVoiceStartDismissed && !options.fromGesture) {
    return false;
  }
  if (Boolean(options.fromGesture)) {
    return true;
  }
  if (friendPostFlipTurnVoiceActive()) {
    return true;
  }
  if (friendJoinGestureActive()) {
    return true;
  }
  return hadRecentFriendGesture();
}

function friendWelcomeLinesForPlayback(lines) {
  const base = filterClipPhrases(Array.isArray(lines) ? lines : []);
  if (friendGuestWelcomeArmed || !speechNeedsInteractionUnlock || !state?.starterFlipDone) {
    return base;
  }
  const team = String(
    pendingJoinIntroTeam || playerDisplayName(remoteSession?.color) || "",
  ).toUpperCase();
  return buildFriendJoinCatchUpSequence(team);
}

function finishFriendGuestWelcomePlayback() {
  friendGuestWelcomeArmed = false;
  friendJoinWelcomeSpoken = true;
  pendingWelcomeVoiceLines = [];
  friendWelcomeLinesSnapshot = [];
}

function stopFriendWelcomeForGameplay() {
  friendVoiceBusAbortWelcome();
  friendClipSequenceQueue = [];
  friendClipSequencePlaying = false;
  friendSpeechPlaying = false;
  friendMascotVoiceInFlight = false;
  if (friendClipSequenceWatchdog) {
    window.clearTimeout(friendClipSequenceWatchdog);
    friendClipSequenceWatchdog = null;
  }
  if (friendVoiceBusPlaying) {
    stopAllVoiceClips();
    friendVoiceBusPlaying = false;
  }
  friendWelcomeAbortedForPlay = true;
  pendingWelcomeVoiceLines = [];
}

/** One iOS gesture handler: welcome → current mascot → your turn (no stale stack). */
let lastFriendGestureAudioTickAt = 0;

function friendGestureAudioTick() {
  if (playMode !== "friend" || !remoteSession || !audioEnabled) {
    return;
  }
  const now = Date.now();
  if (now - lastFriendGestureAudioTickAt < 350) {
    return friendGestureAudioTickChain;
  }
  lastFriendGestureAudioTickAt = now;
  if (friendGestureAudioTickChain) {
    return friendGestureAudioTickChain;
  }
  voiceDebugLog("gesture_tick");
  friendGestureAudioTickChain = warmFriendSessionVoiceClips()
    .then(() => friendGestureAudioTickAfterWarm())
    .finally(() => {
      friendGestureAudioTickChain = null;
    });
  return friendGestureAudioTickChain;
}

function friendGestureAudioTickAfterWarm() {
  if (playMode !== "friend" || !remoteSession || !audioEnabled) {
    return;
  }
  resumeFriendAudioContextFromGesture();
  if (!friendJoinWelcomeSpoken && !friendWelcomeAbortedForPlay && !hasFriendWelcomeVoicePending()) {
    if (pendingWelcomeVoiceLines.length || friendWelcomeLinesSnapshot.length) {
      const lines = pendingWelcomeVoiceLines.length
        ? pendingWelcomeVoiceLines
        : friendWelcomeLinesSnapshot;
      playFriendWelcomeVoiceNow(lines, { fromGesture: true });
    } else if (!friendVoiceBusQueue.length && !friendVoiceBusPlaying) {
      deliverFriendIntroVoiceFromGesture();
    }
  }
  if (friendGameplayVoiceGatedByWelcome()) {
    tryDrainFriendVoiceBus({ fromGesture: true });
    return;
  }
  if (
    friendVoiceBusDrainPending ||
    friendPendingYourTurnVoice ||
    friendPendingOpponentTurnVoice
  ) {
    if (
      friendPendingOpponentTurnVoice ||
      (isFriendYourTurnNow() && !friendYourTurnVoiceAnnounced)
    ) {
      announceFriendDeferredTurnVoiceAfterWelcome({ fromGesture: true, force: true });
    } else {
      tryDrainFriendVoiceBus({ fromGesture: true });
    }
  } else {
    tryDrainFriendVoiceBus({ fromGesture: true });
  }
}

function resumeFriendAudioContextFromGesture() {
  if (!audioEnabled) {
    return;
  }
  noteUserGesture();
  speechUnlocked = true;
  speechGesturePrimed = true;
  ensureAudioContext({ skipSpeechUnlock: true });
  if (audioContext?.state === "suspended") {
    void audioContext.resume();
  }
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
  if (Boolean(options.replace)) {
    stopAllVoiceClips();
    friendYourTurnClipPlaying = false;
    friendYourTurnVoiceAnnounced = false;
  }
  return playFriendYourTurnClipOnce({ fromGesture: Boolean(options.fromGesture) });
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
  if (!thought || thought === lastMascotVoiceThought) {
    return;
  }
  speakVoiceForMascotThought(thought);
}

function armFriendClipSequenceWatchdog() {
  if (friendClipSequenceWatchdog) {
    window.clearTimeout(friendClipSequenceWatchdog);
  }
  friendClipSequenceWatchdog = window.setTimeout(() => {
    friendClipSequenceWatchdog = null;
    if (!friendClipSequencePlaying) {
      return;
    }
    console.warn("[puffly] friend clip sequence watchdog", SPEECH_BUILD);
    friendClipSequencePlaying = false;
    friendSpeechPlaying = false;
    friendMascotVoiceInFlight = false;
    stopAllVoiceClips();
    drainFriendClipSequence();
  }, 12000);
}

function drainFriendClipSequence() {
  if (friendClipSequenceWatchdog) {
    window.clearTimeout(friendClipSequenceWatchdog);
    friendClipSequenceWatchdog = null;
  }
  if (!friendClipSequenceQueue.length) {
    friendClipSequencePlaying = false;
    friendSpeechPlaying = false;
    drainFriendSpeechQueue();
    if (playMode === "friend" && remoteSession?.ready && friendIosCanPlayClip({ fromGesture: true })) {
      friendGestureAudioTick();
    }
    return;
  }
  if (speechNeedsInteractionUnlock && playMode === "friend" && !friendIosCanPlayClip()) {
    friendClipSequencePlaying = false;
    return;
  }
  const clipText = friendClipSequenceQueue[0];
  voiceDebugLog("welcome_clip", { phrase: clipText, queueLeft: friendClipSequenceQueue.length });
  friendClipSequencePlaying = true;
  friendSpeechPlaying = true;
  armFriendClipSequenceWatchdog();
  void friendSpeakLine(clipText, {
    onstart: () => {
      friendClipSequenceQueue.shift();
      lastSpokenAt = Date.now();
      lastSpokenPhrase = clipText;
    },
    onend: () => {
      if (!friendClipSequenceQueue.length) {
        finishFriendGuestWelcomePlayback();
      }
      drainFriendClipSequence();
    },
    onerror: () => {
      friendClipSequenceQueue.shift();
      drainFriendClipSequence();
    },
  }).then((ok) => {
    if (!ok) {
      friendClipSequencePlaying = false;
      friendSpeechPlaying = false;
    }
  });
}

function speakFriendClipSequence(phrases, options = {}) {
  if (!audioEnabled) {
    return false;
  }
  if (playMode === "friend") {
    if (options.replace) {
      friendVoiceBusAbortWelcome();
      friendVoiceBusQueue = friendVoiceBusQueue.filter((item) => item.kind !== "welcome");
    }
    const count = enqueueFriendWelcomePhrases(phrases);
    if (options.trackTurnPhrase) {
      lastTurnSpoken = options.trackTurnPhrase;
      friendTurnSpeechPending = "";
    }
    if (count > 0) {
      tryDrainFriendVoiceBus({ fromGesture: true });
    }
    return count > 0;
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
  let lines = filterClipPhrases(phrases).filter((line) => !friendClipPhraseBlocked(line));
  if (Date.now() - friendConnectedChimeAt < 8000) {
    lines = lines.filter((line) => line !== "You are connected.");
  }
  if (!lines.length) {
    console.warn("[puffly] friend voice: no clips", SPEECH_BUILD, phrases);
    return false;
  }
  resumeFriendAudioContextFromGesture();
  pufflyVoiceReady = true;
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
  if (playMode !== "friend" || !audioEnabled || friendJoinWelcomeSpoken || friendWelcomeAbortedForPlay) {
    return 0;
  }
  if (state?.starterFlipDone) {
    const team = String(
      pendingJoinIntroTeam || playerDisplayName(remoteSession?.color) || "",
    ).toUpperCase();
    const lines = buildFriendJoinCatchUpSequence(team);
    return playFriendWelcomeVoiceNow(lines, { fromGesture: true }) ? lines.length : 0;
  }
  resumeFriendAudioContextFromGesture();
  pufflyVoiceReady = true;
  preloadVoiceClips();
  const pending = flushFriendVoicePending();
  if (pending > 0) {
    return pending;
  }
  const lines = friendWelcomeLinesSnapshot.length
    ? friendWelcomeLinesSnapshot
    : buildPendingFriendJoinIntroSequence();
  if (!lines.length) {
    return 0;
  }
  return playFriendWelcomeVoiceNow(lines, { fromGesture: true }) ? lines.length : 0;
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
  if (playMode === "friend") {
    const version = typeof remoteSession?.version === "number" ? remoteSession.version : 0;
    const turnPlayer = playerColorFromFriendTurnPhrase(phrase);
    if (turnPlayer === "dark" || turnPlayer === "light") {
      enqueueFriendTurnVoice(turnPlayer, version, { replace: forceRepeat });
    } else {
      const clipId = resolveVoiceClipId(clipText);
      if (!clipId) {
        return false;
      }
      requestFriendVoice({
        kind: "status",
        clipId,
        transitionId: `status:${clipText}@v${version}`,
        priority: FRIEND_VOICE_BUS_PRIO.status,
        replace: forceRepeat,
      });
    }
    tryDrainFriendVoiceBus({ fromGesture: true });
    return true;
  }
  return speakFriendClipSequence([clipText], { replace: true, trackTurnPhrase: phrase });
}

const voiceClipPlayers = new Map();
const voiceClipBufferCache = new Map();
let voiceClipActiveSource = null;

function voiceClipUrl(clipId) {
  const file = `${clipId}.${VOICE_CLIP_EXT}`;
  const cacheKey = `v=${CLIENT_BUILD}`;
  const withCache = (href) => {
    try {
      const url = new URL(href);
      url.searchParams.set("v", String(CLIENT_BUILD));
      return url.href;
    } catch {
      return `${href}${href.includes("?") ? "&" : "?"}${cacheKey}`;
    }
  };
  if (typeof document !== "undefined" && document.baseURI) {
    try {
      return withCache(new URL(`assets/voice/${file}`, document.baseURI).href);
    } catch {
      // fall through
    }
  }
  if (typeof window !== "undefined" && window.location?.href) {
    try {
      return withCache(new URL(`assets/voice/${file}`, window.location.href).href);
    } catch {
      // fall through
    }
  }
  return withCache(`${VOICE_CLIP_BASE}${file}`);
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
    if (ctx.state !== "running") {
      throw new Error(`AudioContext not running: ${ctx.state}`);
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
    source.start(0);
    console.info("[puffly] webaudio clip", SPEECH_BUILD, clipId, voiceClipUrl(clipId));
    voiceDebugLog("clip_start", { path: "webaudio", clipId });
    if (handlers.onstart) {
      handlers.onstart();
    }
    return true;
  } catch (err) {
    console.warn("[puffly] webaudio clip failed", SPEECH_BUILD, clipId, err);
    voiceDebugLog("clip_fail", { path: "webaudio", clipId, error: String(err?.message || err) });
    if (handlers.onerror) {
      handlers.onerror(err);
    }
    return false;
  }
}

function preloadVoiceClips(options = {}) {
  if (typeof Audio === "undefined") {
    return;
  }
  const minimal = Boolean(options.minimal);
  const clipIds = Array.isArray(options.clipIds)
    ? options.clipIds
    : minimal
      ? FRIEND_GUEST_VOICE_CLIPS
      : VOICE_CLIP_IDS;
  for (const clipId of clipIds) {
    if (!voiceClipPlayers.has(clipId)) {
      const audio = new Audio(voiceClipUrl(clipId));
      audio.preload = minimal ? "metadata" : "auto";
      voiceClipPlayers.set(clipId, audio);
    }
    if (!minimal) {
      void ensureVoiceClipBuffer(clipId).catch(() => {});
    }
  }
}

/** Decode friend gameplay clips after guest attach (fetch/decode needs no gesture; play still does). */
function warmFriendSessionVoiceClips() {
  if (!audioEnabled || typeof Audio === "undefined") {
    return Promise.resolve();
  }
  if (friendVoiceWarmPromise) {
    return friendVoiceWarmPromise;
  }
  preloadVoiceClips({ minimal: true });
  ensureAudioContext({ skipSpeechUnlock: true });
  voiceDebugLog("warm_start", { clips: FRIEND_GUEST_VOICE_CLIPS.length });
  friendVoiceWarmPromise = (async () => {
    for (const clipId of FRIEND_GUEST_VOICE_CLIPS) {
      try {
        await ensureVoiceClipBuffer(clipId);
      } catch {
        voiceDebugLog("warm_fail", { clipId });
      }
    }
    voiceDebugLog("warm_done");
  })();
  return friendVoiceWarmPromise;
}

function announceFriendGuestWelcome(teamName) {
  syncPlayModeForFriendVoice();
  if (!audioEnabled || !remoteSession) {
    return;
  }
  friendJoinWelcomeSpoken = false;
  friendGuestWelcomeArmed = true;
  friendWelcomeAbortedForPlay = false;
  const label = String(teamName || playerDisplayName(remoteSession.color)).toUpperCase();
  pendingJoinIntroTeam = label;
  const sequence = buildFriendGuestWelcomeSequence(label);
  friendWelcomeLinesSnapshot = filterClipPhrases(sequence);
  pendingWelcomeVoiceLines = friendWelcomeLinesSnapshot.slice();
  if (!speechNeedsInteractionUnlock || friendVoiceStartDismissed) {
    playFriendWelcomeVoiceNow(friendWelcomeLinesSnapshot);
  }
}

function friendLobbyVoiceTransitionId() {
  return `lobby:${FRIEND_LOBBY_VOICE_PHRASE}`;
}

function isFriendRoomActionTarget(target) {
  if (!target || typeof target.closest !== "function") {
    return false;
  }
  return Boolean(
    target.closest(
      '#create-room-btn, #friend-join-leave-btn, [data-friend-action="create"], [data-friend-action="join"]',
    ),
  );
}

function cancelFriendLobbyAutoplayTimers() {
  while (friendLobbyAutoplayTimerIds.length) {
    window.clearTimeout(friendLobbyAutoplayTimerIds.pop());
  }
}

function syncEarlyFriendLobbyPlayback() {
  if (typeof window === "undefined") {
    return;
  }
  if (window.__pufflyFriendLobbyEarlyPlayed) {
    friendLobbyPromptSpoken = true;
    friendVoiceBusSpokenIds.add(friendLobbyVoiceTransitionId());
    if (window.__pufflyFriendLobbyEarlyAudio) {
      const clipId = resolveVoiceClipId(FRIEND_LOBBY_VOICE_PHRASE);
      if (clipId && !voiceClipPlayers.has(clipId)) {
        voiceClipPlayers.set(clipId, window.__pufflyFriendLobbyEarlyAudio);
      }
    }
  }
}

function canAutoplayFriendLobbyOnDesktop() {
  return !speechNeedsInteractionUnlock;
}

function abortFriendLobbyVoice() {
  cancelFriendLobbyAutoplayTimers();
  friendLobbyAutoplayGeneration += 1;
  if (typeof window !== "undefined" && window.__pufflyFriendLobbyEarlyAudio) {
    try {
      window.__pufflyFriendLobbyEarlyAudio.pause();
      window.__pufflyFriendLobbyEarlyAudio.currentTime = 0;
    } catch {
      // ignore
    }
  }
  stopAllVoiceClips();
  friendVoiceBusQueue = friendVoiceBusQueue.filter((item) => item.kind !== "lobby");
  friendVoiceBusPlaying = false;
  friendLobbyPromptSpoken = true;
  pendingFriendLobbyVoice = false;
  friendVoiceBusSpokenIds.add(friendLobbyVoiceTransitionId());
}

function prepareFriendWelcomeVoicePlayback() {
  abortFriendLobbyVoice();
  stopAllVoiceClips();
  friendVoiceBusPlaying = false;
  friendVoiceBusQueue = [];
}

function hasFriendWelcomeVoicePending() {
  return friendVoiceBusQueue.some((item) => item.kind === "welcome");
}

/** Block flip/turn clips until guest welcome finishes (prevents stopAllVoiceClips mid-welcome). */
function friendGameplayVoiceGatedByWelcome() {
  if (friendWelcomeAbortedForPlay || friendJoinWelcomeSpoken) {
    return false;
  }
  if (friendGuestWelcomeArmed) {
    return true;
  }
  if (hasFriendWelcomeVoicePending()) {
    return true;
  }
  if (pendingWelcomeVoiceLines.length > 0) {
    return true;
  }
  if (friendWelcomeLinesSnapshot.length > 0 && speechNeedsInteractionUnlock) {
    return true;
  }
  const head = friendVoiceBusQueue[0];
  return Boolean(friendVoiceBusPlaying && head?.kind === "welcome");
}

function friendTurnVoiceDrainOpts(options = {}) {
  return {
    fromGesture: Boolean(
      options.fromGesture ||
        friendVoiceStartDismissed ||
        hadRecentFriendGesture() ||
        friendPostFlipTurnVoiceActive(),
    ),
  };
}

/** After guest welcome: speak the turn line that was skipped while welcome was gated (incl. opponent turn). */
function announceFriendDeferredTurnVoiceAfterWelcome(options = {}) {
  if (!remoteSession?.ready || !state?.starterFlipDone || isStarterFlipPending()) {
    return false;
  }
  const activePlayer = state.currentPlayer;
  if (activePlayer !== "dark" && activePlayer !== "light") {
    return false;
  }
  const version = typeof remoteSession.version === "number" ? remoteSession.version : 0;
  const transitionId = friendVoiceBusTurnTransitionId(activePlayer, version);
  if (friendVoiceBusSpokenIds.has(transitionId)) {
    friendPendingYourTurnVoice = false;
    friendPendingOpponentTurnVoice = false;
    return true;
  }
  const drainOpts = friendTurnVoiceDrainOpts(options);
  if (activePlayer === remoteSession.color) {
    if (!friendPendingYourTurnVoice && friendYourTurnVoiceAnnounced) {
      return false;
    }
    friendPendingYourTurnVoice = false;
    friendPendingOpponentTurnVoice = false;
    void playFriendYourTurnClipNow(drainOpts);
    return true;
  }
  if (!friendPendingOpponentTurnVoice && !options.force) {
    return false;
  }
  friendPendingOpponentTurnVoice = false;
  friendPendingYourTurnVoice = false;
  if (enqueueFriendTurnVoice(activePlayer, version, { replaceTurnOnly: true })) {
    tryDrainFriendVoiceBus(drainOpts);
    return true;
  }
  return false;
}

function flushFriendGameplayVoiceAfterWelcome(options = {}) {
  if (friendGameplayVoiceGatedByWelcome()) {
    return;
  }
  const drainOpts = friendTurnVoiceDrainOpts(options);
  if (isStarterFlipPending()) {
    void announceFriendPreFlipVoiceNow({ ...drainOpts, force: Boolean(options.force) });
    return;
  }
  if (
    friendPendingYourTurnVoice ||
    friendPendingOpponentTurnVoice ||
    (state?.starterFlipDone && !friendVoiceBusSpokenIds.has(friendVoiceBusTurnTransitionId(state.currentPlayer)))
  ) {
    if (announceFriendDeferredTurnVoiceAfterWelcome({ ...options, force: true })) {
      return;
    }
  }
  if (isFriendYourTurnNow() && !friendYourTurnVoiceAnnounced) {
    void playFriendYourTurnClipNow(drainOpts);
    return;
  }
  if (friendPendingYourTurnVoice) {
    void playFriendYourTurnClipNow({ fromGesture: true });
  }
  if (friendVoiceBusQueue.length || friendVoiceBusDrainPending) {
    tryDrainFriendVoiceBus(drainOpts);
  }
}

function playFriendLobbyVoiceNow(options = {}) {
  if (playMode !== "friend" || !audioEnabled || remoteSession) {
    return false;
  }
  if (friendLobbyPromptSpoken && !options.force) {
    return true;
  }
  const transitionId = friendLobbyVoiceTransitionId();
  if (friendVoiceBusSpokenIds.has(transitionId) && !options.force) {
    friendLobbyPromptSpoken = true;
    return true;
  }
  const fromGesture =
    Boolean(options.fromGesture) || speechGesturePrimed || speechUnlocked || !speechNeedsInteractionUnlock;
  if (speechNeedsInteractionUnlock && !friendIosCanPlayClip({ fromGesture })) {
    pendingFriendLobbyVoice = true;
    return false;
  }
  pendingFriendLobbyVoice = false;
  if (typeof window !== "undefined" && typeof window.pufflyPlayFriendLobbyInline === "function") {
    voiceDebugLog("lobby_play", { path: "inline", fromGesture });
    window.pufflyPlayFriendLobbyInline({
      force: Boolean(options.force),
      fromGesture,
    });
    syncEarlyFriendLobbyPlayback();
    return Boolean(window.__pufflyFriendLobbyEarlyPlayed);
  }
  const now = Date.now();
  if (!options.force && friendLobbyPlayRequestedAt && now - friendLobbyPlayRequestedAt < 320) {
    return false;
  }
  friendLobbyPlayRequestedAt = now;
  const clipId = resolveVoiceClipId(FRIEND_LOBBY_VOICE_PHRASE);
  if (!clipId) {
    return false;
  }
  primePufflyVoiceFromGesture();
  voiceDebugLog("lobby_play", { path: "clip", clipId, fromGesture });
  void playVoiceClip(
    clipId,
    {
      onstart: () => {
        friendVoiceBusSpokenIds.add(transitionId);
        friendLobbyPromptSpoken = true;
      },
      onerror: () => {
        pendingFriendLobbyVoice = true;
      },
    },
    { fromGesture, preferHtml: true },
  );
  return true;
}

function scheduleFriendLobbyAutoplay() {
  if (playMode !== "friend" || remoteSession || getJoinCodeFromUrl()) {
    return;
  }
  if (friendLobbyPromptSpoken) {
    return;
  }
  if (speechNeedsInteractionUnlock) {
    return;
  }
  cancelFriendLobbyAutoplayTimers();
  friendLobbyAutoplayGeneration += 1;
  const generation = friendLobbyAutoplayGeneration;
  const tryPlay = () => {
    if (generation !== friendLobbyAutoplayGeneration) {
      return;
    }
    if (playMode !== "friend" || remoteSession || friendLobbyPromptSpoken) {
      return;
    }
    friendLobbyAutoplayPasses += 1;
    playFriendLobbyVoiceNow({ fromGesture: true, force: true });
  };
  tryPlay();
  queueMicrotask(tryPlay);
  if (document.readyState === "complete") {
    tryPlay();
  } else {
    window.addEventListener("load", tryPlay, { once: true });
  }
  [400, 1000].forEach((delay) => {
    friendLobbyAutoplayTimerIds.push(
      window.setTimeout(() => {
        if (!friendLobbyPromptSpoken) {
          tryPlay();
        }
      }, delay),
    );
  });
}

function shouldSkipFriendLobbyVoice() {
  if (remoteSession?.roomCode) {
    return true;
  }
  if (getJoinCodeFromUrl()) {
    return true;
  }
  if (isInvitePageLocked() || isActiveInviteBootstrap() || isGuestAttachedBoot()) {
    return true;
  }
  if (typeof window !== "undefined") {
    if (
      window.__pufflyInviteJoinInFlight ||
      window.__pufflyPendingInviteJoin ||
      window.__pufflyGuestAttachInProgress
    ) {
      return true;
    }
  }
  return false;
}

function redirectToGuestJoinPage(roomCode, options = {}) {
  if (typeof window === "undefined") {
    return false;
  }
  const normalized = String(roomCode || "")
    .trim()
    .toUpperCase();
  if (!/^[A-Z0-9]{4,8}$/.test(normalized)) {
    return false;
  }
  const dest = new URL("./guest-join.html", window.location.href);
  dest.searchParams.set("room", normalized);
  dest.searchParams.set("join", normalized);
  const invite = readInviteParamsFromUrl();
  const gameId = normalizeGameId(
    String(options.gameType || invite.game || selectedGameId || DEFAULT_GAME_ID),
  );
  if (isKnownGame(gameId)) {
    dest.searchParams.set("game", gameId);
  }
  if (gameId === "puzzle") {
    dest.searchParams.set(
      "puzzleSize",
      String(options.puzzleSize || invite.puzzleSize || difficulty || "medium"),
    );
  }
  dest.searchParams.set("cb", String(CLIENT_BUILD));
  window.location.replace(dest.toString());
  return true;
}

function bootFriendLobbyVoiceIfNeeded(options = {}) {
  if (playMode !== "friend" || shouldSkipFriendLobbyVoice()) {
    return;
  }
  syncEarlyFriendLobbyPlayback();
  if (friendLobbyPromptSpoken) {
    return;
  }
  if (typeof window !== "undefined" && typeof window.pufflyPlayFriendLobbyInline === "function") {
    playFriendLobbyVoiceNow(options);
    if (!friendLobbyPromptSpoken && canAutoplayFriendLobbyOnDesktop()) {
      scheduleFriendLobbyAutoplay();
    }
    return;
  }
  announceFriendLobbyPrompt(options);
  scheduleFriendLobbyAutoplay();
}

function ensureFriendLobbyVoice(options = {}) {
  bootFriendLobbyVoiceIfNeeded(options);
}

function friendClipPhraseBlocked(phrase) {
  return String(phrase || "").includes("Now playing");
}

function stopAllVoiceClips() {
  voiceDebugLog("stop_all");
  stopVoiceClipWebAudio();
  for (const audio of voiceClipPlayers.values()) {
    try {
      audio.pause();
      audio.currentTime = 0;
    } catch {
      // ignore
    }
  }
  if (playMode === "puffly" && typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
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
      voiceDebugLog("clip_start", { path: "html", clipId });
      if (handlers.onstart) {
        handlers.onstart();
      }
      return true;
    })
    .catch((err) => {
      voiceDebugLog("clip_fail", { path: "html", clipId, error: String(err?.message || err) });
      fireError(err);
      return false;
    });
}

/** Play WAV — caller sets preferHtml; Practice desktop defaults to HTML, Friend iOS to Web Audio. */
function playVoiceClip(clipId, handlers = {}, options = {}) {
  if (!audioEnabled) {
    return Promise.resolve(false);
  }
  clipId = friendSafeVoiceClipId(clipId);
  voiceDebugLog("playVoiceClip", {
    clipId,
    preferHtml: options.preferHtml,
    fromGesture: options.fromGesture,
    friendYourTurnOnly: options.friendYourTurnOnly,
  });
  ensureAudioContext({ skipSpeechUnlock: true });
  const preferHtml =
    typeof options.preferHtml === "boolean"
      ? options.preferHtml
      : !speechNeedsInteractionUnlock &&
        (Boolean(options.fromGesture) || playMode === "puffly" || playMode === "friend");
  if (preferHtml) {
    return playVoiceClipHtml(clipId, handlers).then((ok) => {
      if (ok) {
        return ok;
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
    if (speechNeedsInteractionUnlock && isFriend && !friendIosCanPlayClip()) {
      return Promise.resolve(false);
    }
    if (speechNeedsInteractionUnlock && isFriend) {
      ensureAudioContext({ skipSpeechUnlock: true });
      const clipOptions = {
        fromGesture: true,
        preferHtml: friendSpeakLinePrefersHtml(),
      };
      const playIntro = () =>
        friendSpeakLinePrefersHtml()
          ? playVoiceClip(clipId, handlers, clipOptions)
          : playVoiceClipWebAudio(clipId, handlers);
      return playIntro().then((ok) => {
        if (ok) {
          return true;
        }
        return playVoiceClip(clipId, handlers, { fromGesture: true, preferHtml: true }).then((htmlOk) => {
          if (htmlOk) {
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
      });
    }
    return playVoiceClip(clipId, handlers, {
      fromGesture: speechGesturePrimed || speechUnlocked,
    }).then((ok) => {
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

/** Practice Start tap — single canonical flip clip (same path as later game starts). */
function deliverPracticeVoiceOnStartTap() {
  if (!audioEnabled || typeof window === "undefined") {
    console.warn("[puffly] speech build", SPEECH_BUILD, "blocked: audio off");
    return false;
  }
  if (practiceFlipDelivering) {
    return false;
  }
  console.info("[puffly] speech build", SPEECH_BUILD, "practice Start tap");
  speechUnlocked = true;
  speechGesturePrimed = true;
  pendingUnlockSpeech = "";
  pendingPrioritySpeech = "";
  cancelPracticeFlipVoiceTimers();
  busy = false;
  updateStarterFlipButton();
  return speakPracticeFlipPromptOnce({ force: true, inGesture: true });
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
  if (inGesture && !(playMode === "puffly" && resolveVoiceClipId(text))) {
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
  if (playMode === "puffly" && (resolveVoiceClipId(text) || !speechNeedsInteractionUnlock)) {
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
  const utterance = createSpeechUtterance(text, handlers);
  syn.speak(utterance);
}

function unlockSpeechIfNeeded() {
  if (isFriendVoiceUiActive() && speechNeedsInteractionUnlock && !friendVoiceStartDismissed) {
    speechGesturePrimed = true;
    updateSpeechUnlockOverlay();
    return;
  }
  const alreadyPrimed = speechUnlocked && speechGesturePrimed;
  speechUnlocked = true;
  updateSpeechUnlockOverlay();
  if (!(isFriendVoiceUiActive() && speechNeedsInteractionUnlock)) {
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
    if (!practiceVoiceStartDismissed && !practiceFlipDelivering) {
      speakPracticeFlipPromptOnce({ force: true, inGesture: true });
    }
    return;
  }
  if (alreadyPrimed) {
    return;
  }
  primeSpeechSynthesisFromUserGesture();
  if (pendingJoinIntroTeam && playMode === "friend") {
    if (speechNeedsInteractionUnlock && !friendVoiceStartDismissed) {
      return;
    }
    const team = pendingJoinIntroTeam;
    pendingJoinIntroTeam = "";
    if (!friendJoinWelcomeSpoken && !hasFriendWelcomeVoicePending()) {
      if (friendWelcomeLinesSnapshot.length) {
        playFriendWelcomeVoiceNow(friendWelcomeLinesSnapshot);
      } else {
        announceFriendJoinWelcome(team);
      }
    } else if (remoteSession && !remoteSession.ready) {
      announceFriendInviteToPlayVoice({ fromGesture: true });
    }
    return;
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
      return `${base} ${FRIEND_INVITE_TO_PLAY_PHRASE}`;
    }
    if (state?.currentPlayer) {
      if (isStarterFlipPending()) {
        const flipTeam = playerDisplayName(getFriendFlipperColor());
        return `${base} It's ${flipTeam}'s turn to flip.`;
      }
      const activeTeam = playerDisplayName(state.currentPlayer).toUpperCase();
      return `${base} It's ${activeTeam}'s turn.`;
    }
  }
  return base;
}

function friendInviteToPlayTransitionId() {
  const room = remoteSession?.roomCode || "room";
  return `welcome:${room}:${FRIEND_INVITE_TO_PLAY_PHRASE}`;
}

function playFriendInviteToPlayClipNow(options = {}) {
  if (playMode !== "friend" || !audioEnabled || !remoteSession || remoteSession.ready) {
    return Promise.resolve(false);
  }
  const clipId = resolveVoiceClipId(FRIEND_INVITE_TO_PLAY_PHRASE);
  if (!clipId) {
    return Promise.resolve(false);
  }
  const transitionId = friendInviteToPlayTransitionId();
  if (friendVoiceBusSpokenIds.has(transitionId)) {
    friendInviteToPlaySpoken = true;
    return Promise.resolve(true);
  }
  if (speechNeedsInteractionUnlock && !friendIosCanPlayClip(options)) {
    pendingFriendInviteToPlayVoice = true;
    return Promise.resolve(false);
  }
  pendingFriendInviteToPlayVoice = false;
  friendInviteToPlaySpoken = true;
  if (!speechNeedsInteractionUnlock) {
    primePufflyVoiceFromGesture();
  } else {
    resumeFriendAudioContextFromGesture();
  }
  voiceDebugLog("invite_play_now", { clipId, transitionId });
  return playVoiceClip(
    clipId,
    {
      onstart: () => {
        friendVoiceBusSpokenIds.add(transitionId);
        lastSpokenPhrase = clipId;
      },
    },
    { fromGesture: Boolean(options.fromGesture) },
  );
}

function announceFriendInviteToPlayVoice(options = {}) {
  syncPlayModeForFriendVoice();
  if (playMode !== "friend" || !audioEnabled || !remoteSession || remoteSession.ready) {
    return false;
  }
  const phrase = FRIEND_INVITE_TO_PLAY_PHRASE;
  const clipId = resolveVoiceClipId(phrase);
  if (!clipId) {
    return false;
  }
  const transitionId = friendInviteToPlayTransitionId();
  if (friendVoiceBusSpokenIds.has(transitionId)) {
    friendInviteToPlaySpoken = true;
    return true;
  }
  if (friendVoiceBusQueue.some((item) => item.transitionId === transitionId)) {
    return true;
  }
  if (friendInviteToPlaySpoken && !options.force) {
    return false;
  }
  if (speechNeedsInteractionUnlock && !friendIosCanPlayClip(options)) {
    pendingFriendInviteToPlayVoice = true;
    return false;
  }
  pendingFriendInviteToPlayVoice = false;
  friendInviteToPlaySpoken = true;
  if (!speechNeedsInteractionUnlock) {
    primePufflyVoiceFromGesture();
  } else {
    resumeFriendAudioContextFromGesture();
  }
  requestFriendVoice({
    kind: "welcome",
    clipId,
    transitionId,
    priority: FRIEND_VOICE_BUS_PRIO.welcome + 12,
  });
  tryDrainFriendVoiceBus({ fromGesture: Boolean(options.fromGesture) });
  return true;
}

function announceFriendJoinWelcome(teamName) {
  syncPlayModeForFriendVoice();
  if (!audioEnabled || !remoteSession) {
    return;
  }
  if (
    !friendJoinWelcomeSpoken &&
    (friendWelcomeLinesSnapshot.length > 0 || pendingWelcomeVoiceLines.length > 0)
  ) {
    const pending = pendingWelcomeVoiceLines.length
      ? pendingWelcomeVoiceLines
      : friendWelcomeLinesSnapshot;
    playFriendWelcomeVoiceNow(pending, { fromGesture: true });
    return;
  }
  prepareFriendWelcomeVoicePlayback();
  if (friendJoinWelcomeSpoken) {
    if (!remoteSession.ready) {
      announceFriendInviteToPlayVoice();
    }
    return;
  }
  const label = String(teamName || playerDisplayName(remoteSession.color)).toUpperCase();
  pendingJoinIntroTeam = label;
  const waitingForFriend = !remoteSession.ready;
  const flipper = remoteSession.ready && isStarterFlipPending() ? getFriendFlipperColor() : null;
  const sequence = buildFriendJoinClipSequence(label, {
    waitingForFriend,
    gameId: selectedGameId,
    flipperPlayer: flipper,
  });
  friendWelcomeLinesSnapshot = filterClipPhrases(sequence);
  playFriendWelcomeVoiceNow(sequence, { fromGesture: true });
}

function buildFriendOpponentJoinedPhrase(gameId = selectedGameId) {
  const flipPart = buildFriendGameSwitchVoicePhrase(gameId);
  return flipPart ? `Your friend joined. ${flipPart}` : "Your friend joined.";
}

function announceFriendLobbyPrompt(options = {}) {
  if (playMode !== "friend" || !audioEnabled || remoteSession) {
    return;
  }
  if (friendLobbyPromptSpoken && !pendingFriendLobbyVoice) {
    return;
  }
  playFriendLobbyVoiceNow(options);
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

function isFriendRematchTransition(previousState, nextState) {
  if (!previousState || !nextState) {
    return false;
  }
  const wasInPlay = Boolean(previousState.starterFlipDone || previousState.winner || previousState.draw);
  const backToPreFlip = !nextState.starterFlipDone && !nextState.winner && !nextState.draw;
  return wasInPlay && backToPreFlip;
}

function resetFriendSpeechForRematch() {
  friendVoiceBusClearPreFlipSpoken();
  clearFriendPreFlipVoiceTracking();
  friendYourTurnVoiceAnnounced = false;
  friendPendingYourTurnVoice = false;
  friendPendingOpponentTurnVoice = false;
  friendPendingPreFlipVoice = false;
  winnerAnnounced = null;
  lastTurnSpoken = "";
  lastSpokenPhrase = "";
  friendVoiceBusQueue = friendVoiceBusQueue.filter(
    (item) => item.kind !== "your_turn" && item.kind !== "opponent_turn" && item.kind !== "flip",
  );
  markFriendSyncVoiceWindow();
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
  lastPracticeMascotVoiceThought = "";
}

function resetFriendSpeechForGameSwitch() {
  friendVoiceWarmPromise = null;
  resetFriendVoiceBus();
  friendPostFlipTurnVoiceUntil = 0;
  clearFriendPreFlipVoiceTracking();
  friendMascotVoiceInFlight = false;
  friendYourTurnClipGeneration += 1;
  friendYourTurnClipPlaying = false;
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
  friendWelcomeLinesSnapshot = [];
  friendGuestWelcomeArmed = false;
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

function announceFriendGameSwitchVoice(_gameId = selectedGameId) {
  // Game-switch voice removed — mascot pre-flip / turn lines only (no "Now playing…" clip).
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
  if (playMode === "friend" && isTurnLabel && !isFlipPhrase) {
    return;
  }
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

function inferRemotePuzzlePlacementFromStates(previousState, nextState) {
  const opponent = getFriendOpponentColor();
  const last = nextState?.lastMove;
  if (last?.pieceId && last.by === opponent) {
    const prevPiece = getPuzzlePiece(previousState, last.pieceId);
    if (prevPiece && !prevPiece.placed) {
      return { pieceId: last.pieceId, row: last.row, col: last.col };
    }
  }
  if (!Array.isArray(previousState?.pieces) || !Array.isArray(nextState?.pieces)) {
    return null;
  }
  for (const nextPiece of nextState.pieces) {
    if (!nextPiece.placed) {
      continue;
    }
    const prevPiece = previousState.pieces.find((entry) => entry.id === nextPiece.id);
    if (prevPiece && !prevPiece.placed && nextPiece.owner === opponent) {
      return {
        pieceId: nextPiece.id,
        row: nextPiece.placedRow ?? nextPiece.correctRow,
        col: nextPiece.placedCol ?? nextPiece.correctCol,
      };
    }
  }
  return null;
}

function extractOpponentMovesForAnimation(previousState, nextState) {
  if (selectedGameId === "fourinarow") {
    const remoteDrop = inferRemoteDropFromStates(previousState, nextState);
    return remoteDrop ? [{ kind: "drop", drop: remoteDrop }] : [];
  }
  if (selectedGameId === "puzzle") {
    if (previousState.currentPlayer !== getFriendOpponentColor()) {
      return [];
    }
    const placement = inferRemotePuzzlePlacementFromStates(previousState, nextState);
    return placement ? [{ kind: "puzzle", placement }] : [];
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
  if (playMode !== "friend" || !remoteSession?.ready) {
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
    if (step.kind === "puzzle") {
      const { pieceId, row, col } = step.placement;
      await sleep(120);
      await animatePuzzleUserPlacement(pieceId, row, col);
      const puzzleResult = applyPuzzlePlacement(simState, pieceId, row, col);
      if (puzzleResult.ok) {
        playSnapSound();
        simState = finalizePuzzleCompletionState(puzzleResult.nextState);
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
      statusMessage.startsWith("Now playing ") ||
      statusMessage === "Game switched." ||
      statusMessage.startsWith("Game switched") ||
      /to place next\./i.test(statusMessage);
    if (silentFriendStatus) {
      return;
    }
    if (playMode === "friend" && selectedGameId === "puzzle") {
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
    if (playMode === "friend" || playMode === "puffly") {
      return;
    }
    phrase = "Choose one of the highlighted squares.";
  } else if (statusMessage === "Undid your previous turn.") {
    return;
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

function primePuzzleVoiceFromGesture() {
  noteUserGesture();
  primeSpeechSynthesisFromUserGesture();
  ensureAudioContext({ skipSpeechUnlock: true });
}

function speakPuzzleFeedback(phrase, options = {}) {
  playInvalidAudio();
  if (!phrase || !audioEnabled) {
    return;
  }
  lastSpokenPhrase = "";
  lastSpokenAt = 0;
  const clipId = resolveVoiceClipId(phrase);
  if (!clipId) {
    speakPhraseReliable(phrase, { forceRepeat: true });
    return;
  }
  if (options.fromGesture) {
    speechUnlocked = true;
    speechGesturePrimed = true;
    ensureAudioContext({ skipSpeechUnlock: true });
  }
  void playVoiceClip(
    clipId,
    {
      onstart: () => {
        lastSpokenPhrase = phrase;
        lastSpokenAt = Date.now();
      },
    },
    { fromGesture: Boolean(options.fromGesture) },
  );
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

function createPuzzlePieceElement(piece, options = {}) {
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
  if (!(practiceTableIsActive() && options.inTray)) {
    pieceEl.style.zIndex = String(20 + overlapPriority);
  }
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
    if (options.inTray && practiceTableIsActive() && practiceTableIsLandscapeTablet()) {
      applyPracticeTableLandscapeTrayEdgeGlow(pieceEl, piece, rows, cols);
    }
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
    const pieceEl = createPuzzlePieceElement(piece, { inTray: true });
    container.appendChild(pieceEl);
    registerPuzzleTrayPieceElement(piece.id, pieceEl);
    if (piece.id === selectedPuzzlePieceId) {
      pieceEl.classList.add("selected");
      lastTraySelectedPieceId = piece.id;
    }
  }
}

function scheduleFriendCapturedTrayLayoutIfNeeded() {
  if (isFriendTableUiActive()) {
    window.requestAnimationFrame(() => {
      if (isFriendTableUiActive()) {
        syncFriendTableTrayLayout();
      }
    });
    return;
  }
  if (isFriendModeUiActive()) {
    scheduleFriendModeTrayLayoutSync();
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
    if (practiceTableIsActive()) {
      schedulePracticeTablePuzzleTrayPieceSizeSync();
    }
  } else if (selectedGameId === "fourinarow") {
    if (blueCapturedLabel) {
      blueCapturedLabel.textContent = "BLUE Remaining";
    }
    if (greenCapturedLabel) {
      greenCapturedLabel.textContent = "GREEN Remaining";
    }
    renderCapturedPile(blueCapturedPile, Math.max(0, FOUR_STARTING_PIECES - countFourPieces("dark")), "blue");
    renderCapturedPile(greenCapturedPile, Math.max(0, FOUR_STARTING_PIECES - countFourPieces("light")), "green");
  } else {
    if (blueCapturedLabel) {
      blueCapturedLabel.textContent = "BLUE Captured";
    }
    if (greenCapturedLabel) {
      greenCapturedLabel.textContent = "GREEN Captured";
    }
    renderCapturedPile(blueCapturedPile, Math.max(0, CHECKERS_STARTING_PIECES - countCheckersPieces("dark")), "blue");
    renderCapturedPile(greenCapturedPile, Math.max(0, CHECKERS_STARTING_PIECES - countCheckersPieces("light")), "green");
  }
  scheduleFriendCapturedTrayLayoutIfNeeded();
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

async function postFriendPuzzleRestartWithSize(nextDifficulty) {
  return apiPost("/api/rooms/restart", {
    roomCode: remoteSession.roomCode,
    playerId: remoteSession.playerId,
    puzzleDifficulty: nextDifficulty,
  });
}

async function postFriendPuzzleSize(nextDifficulty, options = {}) {
  const payload = {
    roomCode: remoteSession.roomCode,
    playerId: remoteSession.playerId,
    puzzleDifficulty: nextDifficulty,
  };
  try {
    return await apiPost("/api/rooms/puzzle-size", payload);
  } catch (error) {
    const message = String(error?.message || "").toLowerCase();
    const restartOnLocked =
      Boolean(options.restartFallbackOnLocked) &&
      isFriendPuzzleSizeLockedErrorMessage(error?.message);
    if (restartOnLocked) {
      return postFriendPuzzleRestartWithSize(nextDifficulty);
    }
    if (!message.includes("404") && !message.includes("not found")) {
      throw error;
    }
    return postFriendPuzzleRestartWithSize(nextDifficulty);
  }
}

function applyFriendPuzzleSizeRoomPayload(data, options = {}) {
  const wasPuzzleComplete = Boolean(options.wasPuzzleComplete);
  const wasMidGameReset = Boolean(options.wasMidGameReset);
  const resetSession = wasPuzzleComplete || wasMidGameReset;
  remoteSession.version = data.version;
  if (typeof data.playerCount === "number") {
    remoteSession.playerCount = data.playerCount;
    remoteSession.ready = data.playerCount >= 2;
    setFriendStatus(getFriendStatusText(remoteSession));
  }
  syncPuzzleFlipTurnFromPayload(data);
  state = normalizeStateForGame(data.state, "puzzle");
  applyPuzzleFlipTurnFromRemote(state, data);
  syncPuzzleDifficultyFromRemote(state, data.puzzleDifficulty);
  puzzleTrayBootstrapAttempted = false;
  boardGeometryLockedAt = 0;
  selectedPuzzlePieceId = "";
  moveHistory = [];
  undoSnapshots = [];
  if (resetSession) {
    resetPuzzleSessionAfterRestart();
    resetFriendSpeechForRematch();
  } else {
    winnerAnnounced = null;
    hideCelebration();
  }
  syncRoomChatFromPayload(data);
  const sizeLabel = getDifficultyLabel(difficulty, "puzzle");
  const statusPrefix = wasMidGameReset ? "Switched to" : "Size set to";
  setFriendPuzzleSizeStatus(`${statusPrefix} ${sizeLabel}. Tap FLIP to start.`);
  if (resetSession || isStarterFlipPending()) {
    refreshFriendGameUi(puzzleFlipPromptText());
  } else {
    render(`Puzzle size set to ${sizeLabel}.`);
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
  if (practiceTableIsActive() && typeof window.pufflyRefreshPracticePillNavLabels === "function") {
    window.pufflyRefreshPracticePillNavLabels();
  }
}

function getFriendDifficultyButtons() {
  if (!friendPuzzleDifficultyPanel) {
    return friendDifficultyButtons;
  }
  return Array.from(friendPuzzleDifficultyPanel.querySelectorAll(".friend-difficulty-btn"));
}

function updateFriendDifficultyButtons() {
  for (const button of getFriendDifficultyButtons()) {
    const level = button.dataset.difficulty;
    const isSelected = level === difficulty;
    button.classList.toggle("is-on", isSelected);
    button.classList.toggle("is-off", !isSelected);
    const inFriendPuzzle = playMode === "friend" && selectedGameId === "puzzle";
    const canChange = canChangeFriendPuzzleSize();
    button.classList.toggle("is-locked", inFriendPuzzle && !canChange);
    button.disabled = false;
    button.setAttribute("aria-disabled", inFriendPuzzle && !canChange ? "true" : "false");
  }
}

function syncFriendPracticePillDropdownPanels() {
  if (
    typeof window === "undefined" ||
    typeof window.pufflySyncPracticePillDropdownPanels !== "function" ||
    !practiceTableIsActive()
  ) {
    return;
  }
  window.pufflySyncPracticePillDropdownPanels(true, playMode === "friend");
}

function syncFriendPuzzleSizePanelOnOpen() {
  syncFriendPracticePillDropdownPanels();
  updateFriendDifficultyButtons();
}

function updateFriendPuzzleDifficultyPanel() {
  const show = playMode === "friend" && selectedGameId === "puzzle";
  friendPuzzleDifficultyPanel?.classList.toggle("hidden", !show);
  if (show) {
    syncFriendPracticePillDropdownPanels();
    updateFriendDifficultyButtons();
  }
  if (typeof window.pufflyRefreshPracticePillNavLabels === "function") {
    window.pufflyRefreshPracticePillNavLabels();
  }
}

function syncFriendUndoFromServer(data) {
  if (playMode !== "friend" || !remoteSession) {
    return;
  }
  if (typeof data?.canUndo === "boolean") {
    friendUndoAvailable = data.canUndo;
    refreshUndoButton();
  }
}

function markFriendUndoAvailable() {
  if (playMode === "friend" && remoteSession) {
    friendUndoAvailable = true;
    refreshUndoButton();
  }
}

function clearFriendUndoAvailable() {
  friendUndoAvailable = false;
  refreshUndoButton();
}

function refreshUndoButton() {
  if (!undoButton) {
    return;
  }
  const canUndo =
    playMode === "friend" ? friendUndoAvailable && Boolean(remoteSession) : undoSnapshots.length > 0;
  undoButton.disabled = busy || !canUndo;
  undoButton.classList.toggle("is-active", playMode === "friend" && canUndo && !busy);
}

function prefersCompactChrome() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(hover: hover) and (pointer: fine)").matches
  );
}

function getFriendRoomPillState() {
  if (!remoteSession?.roomCode) {
    return "setup";
  }
  if (remoteSession.ready) {
    return "connected";
  }
  return "waiting";
}

function isFriendRoomHostLocal() {
  if (!remoteSession?.roomCode) {
    return true;
  }
  return isFriendHostRoom(remoteSession.roomCode);
}

function refreshFriendRoomPill() {
  const roomCluster = document.getElementById("practice-pill-room-cluster");
  const roomValue = document.getElementById("practice-pill-room-value");
  const roomInfo = document.getElementById("practice-pill-room-info");
  const openBtn = document.getElementById("friend-pill-open-room-btn");
  const inviteBtn = document.getElementById("friend-pill-invite-btn");
  const leaveBtn = document.getElementById("friend-pill-leave-btn");
  const inFriend = playMode === "friend" || isFriendChromeVisible();
  if (roomCluster) {
    roomCluster.hidden = !inFriend;
  }
  if (!inFriend) {
    return;
  }
  const state = getFriendRoomPillState();
  const isHost = isFriendRoomHostLocal();
  if (roomValue) {
    roomValue.classList.toggle("is-connected", state === "connected");
    if (state === "setup") {
      roomValue.textContent = "Setup";
    } else if (state === "waiting") {
      roomValue.textContent = "Open";
    } else {
      roomValue.textContent = "Connected •";
    }
  }
  if (roomInfo) {
    if (state === "setup") {
      roomInfo.textContent = "Open a game room, then invite your friend.";
    } else if (remoteSession?.roomCode) {
      const gameTitle = getGameConfig(remoteSession.gameType || selectedGameId).title;
      roomInfo.textContent =
        state === "connected"
          ? `Room ${remoteSession.roomCode} · ${gameTitle} · both players ready`
          : `Room ${remoteSession.roomCode} · ${gameTitle} · invite your friend`;
    } else {
      roomInfo.textContent = "";
    }
  }
  if (openBtn) {
    openBtn.hidden = state !== "setup" || !isHost;
  }
  if (inviteBtn) {
    inviteBtn.hidden = state !== "waiting" || !isHost;
  }
  if (leaveBtn) {
    leaveBtn.hidden = state === "setup";
  }
  refreshFriendSeatStatus();
}

function isFriendTableUiActive() {
  return (
    playMode === "friend" &&
    typeof document !== "undefined" &&
    document.body.classList.contains("practice-table-layout")
  );
}

function syncFriendFlipMount() {
  const mount = document.getElementById("friend-flip-mount");
  const panel = document.getElementById("puffly-panel");
  const starterFlip =
    mount?.querySelector(".starter-flip") || panel?.querySelector(".starter-flip");
  if (!starterFlip) {
    return;
  }
  if (isFriendTableUiActive() && mount && starterFlip.parentElement !== mount) {
    mount.appendChild(starterFlip);
  } else if (!isFriendTableUiActive() && panel && starterFlip.parentElement !== panel) {
    panel.appendChild(starterFlip);
  }
}

/** Mount turn/status `#puffly-thought` into the bottom seat bar (Practice parity backup). */
function syncFriendThoughtMount() {
  if (!pufflyThought) {
    return;
  }
  const thoughtSlot = document.getElementById("player-seat-thought");
  const panel = document.getElementById("puffly-panel");
  if (isFriendTableUiActive()) {
    if (thoughtSlot && pufflyThought.parentElement !== thoughtSlot) {
      thoughtSlot.appendChild(pufflyThought);
    }
    return;
  }
  if (panel && pufflyThought.parentElement !== panel) {
    const starterFlip = panel.querySelector(".starter-flip");
    if (starterFlip) {
      panel.insertBefore(pufflyThought, starterFlip);
    } else {
      panel.appendChild(pufflyThought);
    }
  }
}

/** Dedicated Friend seat status — setup instructions + post-flip turn markers. */
function refreshFriendSeatStatus(_text) {
  const statusEl = document.getElementById("friend-seat-status");
  const thoughtSlot = document.getElementById("player-seat-thought");
  if (!statusEl) {
    return;
  }
  const tableFriend = isFriendTableUiActive();
  if (!tableFriend) {
    statusEl.hidden = true;
    statusEl.textContent = "";
    if (thoughtSlot) {
      thoughtSlot.hidden = false;
    }
    return;
  }
  if (thoughtSlot) {
    thoughtSlot.hidden = true;
  }
  const line = friendSeatStatusLine();
  statusEl.hidden = !line;
  statusEl.textContent = line;
  statusEl.classList.toggle(
    "is-thinking",
    Boolean(line) &&
      !friendPuzzleSizePendingConfirm &&
      (/Blue's turn|Green's turn|Waiting for host|Waiting for Friend|is Flipping/i.test(line) ||
        (remoteSession?.ready && !isStarterFlipPending() && state?.currentPlayer !== remoteSession?.color)),
  );
  refreshFriendPuzzleSizeConfirmChrome();
  syncFriendSeatBarScroll();
}

/** Keep Undo visible; scroll actions row right only while Voice menu is open. */
function syncFriendSeatBarScroll() {
  if (playMode !== "friend" || !isFriendTableUiActive()) {
    return;
  }
  const main = document.querySelector(".friend-seat-bar-main");
  const wrap = document.getElementById("friend-voice-pill-wrap");
  if (!main || !wrap || wrap.hidden) {
    return;
  }
  requestAnimationFrame(() => {
    if (document.body.classList.contains("friend-voice-pill-open")) {
      main.scrollLeft = Math.max(0, main.scrollWidth - main.clientWidth);
    } else {
      main.scrollLeft = 0;
    }
  });
}

function syncFriendTableSeatChrome() {
  syncFriendFlipMount();
  syncFriendThoughtMount();
  refreshFriendSeatStatus();
}

function refreshFriendAvatarBand() {
  const band = document.getElementById("friend-avatar-band");
  const tableFriend = isFriendTableUiActive();
  if (band) {
    band.hidden = !tableFriend;
  }
  if (typeof document === "undefined") {
    return;
  }
  if (!tableFriend) {
    document.body.classList.remove("friend-pre-flip", "friend-voice-live");
    syncFriendTableSeatChrome();
    syncFriendAvatarBandToTrays();
    return;
  }
  document.body.classList.toggle("friend-pre-flip", isStarterFlipPending());
  document.body.classList.toggle("friend-voice-live", voiceJoined);
  syncFriendTableSeatChrome();
  syncFriendAvatarBandToTrays();
}

function refreshFriendVoicePill() {
  const wrap = document.getElementById("friend-voice-pill-wrap");
  const valueEl = document.getElementById("friend-voice-pill-value");
  const pillBtn = document.getElementById("friend-voice-pill-btn");
  const toggleBtn = document.getElementById("friend-voice-toggle-btn");
  const muteBtn = document.getElementById("friend-voice-mute-btn");
  const showVoice = playMode === "friend" && isFriendTableUiActive();
  const connected = showVoice && Boolean(remoteSession?.ready);
  if (wrap) {
    wrap.hidden = !showVoice;
  }
  if (!showVoice || !connected) {
    document.body.classList.remove("friend-voice-pill-open");
  }
  if (showVoice) {
    if (valueEl) {
      valueEl.textContent = connected && voiceJoined ? "ON" : "OFF";
    }
    if (pillBtn) {
      pillBtn.classList.toggle("is-on", connected && voiceJoined);
    }
    if (toggleBtn) {
      toggleBtn.disabled = !connected;
      toggleBtn.textContent = voiceJoined ? "Turn Voice OFF" : "Turn Voice ON";
    }
    if (muteBtn) {
      muteBtn.disabled = !connected || !voiceJoined;
      muteBtn.textContent = voiceMicMuted ? "Unmute Mic" : "Mute Mic";
    }
  }
  refreshFriendAvatarBand();
  syncFriendSeatBarScroll();
}

function setVoiceMicMuted(muted) {
  voiceMicMuted = Boolean(muted);
  if (voiceLocalStream) {
    for (const track of voiceLocalStream.getAudioTracks()) {
      track.enabled = !voiceMicMuted;
    }
  }
  refreshFriendVoicePill();
}

function updateFriendRoomButtons() {
  const inRoom = Boolean(remoteSession);
  const inFriendUi = isFriendModeUiActive();
  const createActive = inRoom || (inFriendUi && !inRoom);
  if (createRoomButton) {
    createRoomButton.textContent = "OPEN GAME ROOM";
    createRoomButton.classList.toggle("is-on", createActive);
    createRoomButton.classList.toggle("is-off", !createActive);
  }
  if (friendInviteShareButton) {
    friendInviteShareButton.classList.toggle("hidden", !inRoom);
    if (inRoom) {
      friendInviteShareButton.textContent = friendInviteShareReady ? "SHARE" : "INVITE FRIEND";
      friendInviteShareButton.dataset.friendAction = friendInviteShareReady ? "share" : "invite";
      friendInviteShareButton.classList.add("is-on");
      friendInviteShareButton.classList.remove("is-off");
    }
  }
  if (friendJoinLeaveButton) {
    friendJoinLeaveButton.classList.toggle("hidden", !inRoom);
    friendJoinLeaveButton.textContent = "LEAVE ROOM";
    friendJoinLeaveButton.dataset.friendAction = "leave";
    friendJoinLeaveButton.classList.toggle("is-on", inRoom);
    friendJoinLeaveButton.classList.toggle("is-off", !inRoom);
  }
  if (roomCodeInput) {
    roomCodeInput.classList.add("hidden");
  }
  if (typeof document !== "undefined") {
    document.body.classList.toggle("friend-room-active", inRoom);
  }
  refreshFriendRoomPill();
  refreshFriendVoicePill();
  refreshUndoButton();
}

function updateAudioToggle() {
  if (!audioToggleButton) {
    return;
  }
  audioToggleButton.textContent = "AUDIO GUIDE";
  audioToggleButton.setAttribute("aria-label", "Audio guide for game prompts");
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

function syncPuzzleCompletionChrome() {
  if (typeof document === "undefined") {
    return;
  }
  const overlayOpen =
    celebrationOverlay && !celebrationOverlay.classList.contains("hidden");
  const show =
    overlayOpen &&
    playMode === "friend" &&
    selectedGameId === "puzzle" &&
    (isPuzzleComplete() || winnerAnnounced === "puzzle-complete");
  document.body.classList.toggle("puzzle-completion-open", show);
}

function dismissPuzzleCompletionCelebration() {
  hideCelebration();
  if (isPuzzleComplete() || winnerAnnounced === "puzzle-complete") {
    winnerAnnounced = "puzzle-complete";
  }
  releasePuzzleInteractionLocks();
  syncFriendPracticePillDropdownPanels();
  updateFriendDifficultyButtons();
  if (typeof window.pufflyRefreshPracticePillNavLabels === "function") {
    window.pufflyRefreshPracticePillNavLabels();
  }
  if (playMode === "friend" && selectedGameId === "puzzle") {
    if (isFriendPuzzleSizeHost()) {
      setFriendPuzzleSizeStatus("Pick Classic or Mega in Size — then tap FLIP to start.");
    } else {
      setFriendPuzzleSizeStatus("Only Blue can change puzzle size.");
    }
  }
  refreshFriendSeatStatus();
}

function showPuzzleCompletionCelebration() {
  if (!isPuzzleComplete() || winnerAnnounced === "puzzle-complete") {
    return;
  }
  winnerAnnounced = "puzzle-complete";
  celebrationTitle.textContent = "Puzzle Complete!";
  celebrationSubtitle.textContent =
    playMode === "friend" && selectedGameId === "puzzle"
      ? "Pick Classic or Mega in Size above — then tap FLIP to start the next round."
      : "Amazing teamwork, grandpals!";
  celebrationOverlay.classList.remove("hidden");
  syncPuzzleCompletionChrome();
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
  updateFriendDifficultyButtons();
  syncFriendPracticePillDropdownPanels();
  if (playMode === "friend") {
    if (isFriendPuzzleSizeHost()) {
      setFriendPuzzleSizeStatus("Pick Classic or Mega in Size — then tap FLIP to start.");
    } else {
      setFriendPuzzleSizeStatus("Only Blue can change puzzle size.");
    }
  }
  setPufflyState("celebrate", "🧩 Puzzle complete!");
  return true;
}

function isPuzzleRestartTransition(previousState, nextState) {
  return isPuzzleComplete(previousState) && !isPuzzleComplete(nextState);
}

function resetPuzzleSessionAfterRestart() {
  clearFriendPuzzleSizePendingConfirm({ skipRefresh: true });
  winnerAnnounced = null;
  friendPuzzleSizeStatusLine = "";
  if (typeof window !== "undefined" && friendPuzzleSizeStatusTimer) {
    window.clearTimeout(friendPuzzleSizeStatusTimer);
    friendPuzzleSizeStatusTimer = 0;
  }
  puzzleTrayBootstrapAttempted = false;
  deferRoomSyncUntilIdle = false;
  lastSpokenPhrase = "";
  lastTurnSpoken = "";
  hideCelebration();
}

function refreshPuzzleCelebrationFlags() {
  if (isPuzzleComplete()) {
    return;
  }
  if (winnerAnnounced === "puzzle-complete") {
    hideCelebration();
    return;
  }
  winnerAnnounced = null;
  hideCelebration();
}

function hideCelebration() {
  clearWinFx();
  celebrationOverlay.classList.add("hidden");
  syncPuzzleCompletionChrome();
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

function compactFriendSeatThought(text) {
  const t = String(text || "").trim();
  if (!t) {
    return t;
  }
  if (/OPEN GAME ROOM/i.test(t)) {
    return "🪙 Open room";
  }
  if (/Waiting/i.test(t)) {
    return "⏳ Waiting…";
  }
  if (/Your turn/i.test(t)) {
    return "👀 Your turn!";
  }
  if (/Tap FLIP/i.test(t)) {
    return "🪙 Tap FLIP";
  }
  if (/flipping/i.test(t)) {
    if (/Blue/i.test(t)) {
      return "🪙 Blue flipping…";
    }
    if (/Green/i.test(t)) {
      return "🪙 Green flipping…";
    }
    return "🪙 Flipping…";
  }
  if (/Blue's turn/i.test(t)) {
    return "🐻 Blue's turn";
  }
  if (/Green's turn/i.test(t)) {
    return "🐸 Green's turn";
  }
  if (t.length <= 20) {
    return t;
  }
  return `${t.slice(0, 18)}…`;
}

function setPufflyState(mode, text, options = {}) {
  if (!pufflyPanel || !pufflyThought) {
    return;
  }
  if (isFriendTableUiActive()) {
    syncFriendThoughtMount();
  }
  pufflyPanel.classList.remove("idle", "thinking", "celebrate");
  pufflyPanel.classList.add(mode);
  const seatText = isFriendTableUiActive() ? compactFriendSeatThought(text) : text;
  pufflyThought.textContent = seatText;
  refreshFriendSeatStatus(text);
  const thoughtSlot = document.getElementById("player-seat-thought");
  thoughtSlot?.classList.toggle("is-thinking", mode === "thinking");
  thoughtSlot?.classList.toggle("is-celebrate", mode === "celebrate");
  if (playMode === "puffly" && !options.silentVoice) {
    const voiceOpts = { ...options };
    if (isPracticePreFlipMascotClipPhrase(text) || options.forceVoice) {
      voiceOpts.force = true;
    }
    speakVoiceForMascotThought(text, voiceOpts);
  }
}

const RULES_DRAWER_DURATION_MS = 350;
const RULES_DRAWER_EASING = "cubic-bezier(0.16, 1, 0.3, 1)";
const RULES_PANEL_Y_CENTER = "translateY(-50%)";
const RULES_PANEL_CLOSED_TRANSFORM = `${RULES_PANEL_Y_CENTER} translateX(100%)`;
const RULES_PANEL_OPEN_TRANSFORM = `${RULES_PANEL_Y_CENTER} translateX(0)`;

let rulesDrawerGeneration = 0;

function rulesDrawerPanelSlideWidthPx() {
  if (!rulesPanel) {
    return 340;
  }
  const rect = rulesPanel.getBoundingClientRect();
  const width = rect.width || rulesPanel.offsetWidth;
  return Math.max(1, Math.round(width));
}

function rulesDrawerPanelClosedSlideTransform() {
  return `${RULES_PANEL_Y_CENTER} translateX(${rulesDrawerPanelSlideWidthPx()}px)`;
}

function rulesDrawerPanelOpenSlideTransform() {
  return `${RULES_PANEL_Y_CENTER} translateX(0px)`;
}

function mountRulesDrawerToBody() {
  if (typeof document === "undefined") {
    return;
  }
  if (rulesPanelBackdrop && rulesPanelBackdrop.parentElement !== document.body) {
    document.body.appendChild(rulesPanelBackdrop);
  }
  if (!rulesPanel) {
    return;
  }
  if (rulesPanel.parentElement === document.body) {
    return;
  }
  if (rulesPanelBackdrop && rulesPanelBackdrop.parentElement === document.body) {
    document.body.insertBefore(rulesPanel, rulesPanelBackdrop.nextSibling);
    return;
  }
  document.body.appendChild(rulesPanel);
}

function isRulesPanelOpen() {
  return (
    document.body.classList.contains("rules-panel-open") ||
    document.body.classList.contains("rules-panel-animating")
  );
}

function cancelRulesDrawerAnimations() {
  rulesPanel?.getAnimations().forEach((animation) => animation.cancel());
  rulesPanelBackdrop?.getAnimations().forEach((animation) => animation.cancel());
}

function commitRulesDrawerAnimations() {
  for (const animation of rulesPanel?.getAnimations() ?? []) {
    animation.commitStyles?.();
  }
  for (const animation of rulesPanelBackdrop?.getAnimations() ?? []) {
    animation.commitStyles?.();
  }
}

function clearRulesDrawerInlineStyles() {
  if (rulesPanel) {
    rulesPanel.style.transition = "";
    rulesPanel.style.transform = "";
    rulesPanel.style.visibility = "";
    rulesPanel.style.opacity = "";
    rulesPanel.style.willChange = "";
  }
  if (rulesPanelBackdrop) {
    rulesPanelBackdrop.style.transition = "";
    rulesPanelBackdrop.style.opacity = "";
    rulesPanelBackdrop.style.willChange = "";
  }
}

function flushRulesDrawerLayout() {
  if (!rulesPanel) {
    return;
  }
  void rulesPanel.offsetWidth;
  rulesPanel.getBoundingClientRect();
}

function nextRulesDrawerAnimationFrame() {
  return new Promise((resolve) => {
    window.requestAnimationFrame(resolve);
  });
}

async function waitRulesDrawerOpenFrame() {
  await nextRulesDrawerAnimationFrame();
  if (selectedGameId !== "puzzle") {
    return;
  }
  await nextRulesDrawerAnimationFrame();
  await nextRulesDrawerAnimationFrame();
}

function setRulesDrawerClosedVisual() {
  if (rulesPanel) {
    rulesPanel.style.transition = "none";
    rulesPanel.style.transform = rulesDrawerPanelClosedSlideTransform();
    // v425+: visible off-screen so WAAPI can paint on heavy Puzzle layout
    rulesPanel.style.visibility = "visible";
  }
  if (rulesPanelBackdrop) {
    rulesPanelBackdrop.style.transition = "none";
    rulesPanelBackdrop.style.opacity = "0";
  }
}

function setRulesDrawerOpenVisual() {
  if (rulesPanel) {
    rulesPanel.style.transition = "none";
    rulesPanel.style.transform = rulesDrawerPanelOpenSlideTransform();
    rulesPanel.style.visibility = "visible";
  }
  if (rulesPanelBackdrop) {
    rulesPanelBackdrop.style.transition = "none";
    rulesPanelBackdrop.style.opacity = "1";
  }
}

function rulesDrawerPanelTransformKeyframe() {
  if (!rulesPanel) {
    return RULES_PANEL_CLOSED_TRANSFORM;
  }
  const transform = getComputedStyle(rulesPanel).transform;
  return transform && transform !== "none" ? transform : RULES_PANEL_CLOSED_TRANSFORM;
}

function rulesDrawerBackdropOpacityKeyframe() {
  if (!rulesPanelBackdrop) {
    return 0;
  }
  const opacity = Number.parseFloat(getComputedStyle(rulesPanelBackdrop).opacity);
  return Number.isFinite(opacity) ? opacity : 0;
}

function runRulesDrawerAnimation(panelKeyframes, backdropKeyframes) {
  if (rulesPanel) {
    rulesPanel.style.willChange = "transform";
  }
  if (rulesPanelBackdrop) {
    rulesPanelBackdrop.style.willChange = "opacity";
  }
  const animations = [];
  if (rulesPanel && typeof rulesPanel.animate === "function") {
    animations.push(
      rulesPanel.animate(panelKeyframes, {
        duration: RULES_DRAWER_DURATION_MS,
        easing: RULES_DRAWER_EASING,
        fill: "forwards",
      }),
    );
  }
  if (rulesPanelBackdrop && typeof rulesPanelBackdrop.animate === "function") {
    animations.push(
      rulesPanelBackdrop.animate(backdropKeyframes, {
        duration: RULES_DRAWER_DURATION_MS,
        easing: "ease",
        fill: "forwards",
      }),
    );
  }
  if (animations.length === 0) {
    return Promise.resolve();
  }
  return Promise.all(animations.map((animation) => animation.finished)).catch(() => {});
}

function applyRulesDrawerOpenState() {
  document.body.classList.remove("rules-panel-animating");
  document.body.classList.add("rules-panel-open");
  clearRulesDrawerInlineStyles();
  rulesPanel?.classList.remove("hidden");
  rulesPanel?.setAttribute("aria-hidden", "false");
  if (rulesPanelBackdrop) {
    rulesPanelBackdrop.hidden = false;
    rulesPanelBackdrop.setAttribute("aria-hidden", "false");
  }
  rulesButton?.setAttribute("aria-expanded", "true");
}

function applyRulesDrawerClosedState() {
  document.body.classList.remove("rules-panel-open", "rules-panel-animating");
  clearRulesDrawerInlineStyles();
  rulesPanel?.classList.add("hidden");
  rulesPanel?.setAttribute("aria-hidden", "true");
  if (rulesPanelBackdrop) {
    rulesPanelBackdrop.hidden = true;
    rulesPanelBackdrop.setAttribute("aria-hidden", "true");
  }
  rulesButton?.setAttribute("aria-expanded", "false");
}

async function showRulesPanel() {
  if (
    document.body.classList.contains("practice-setup-tray-open") &&
    typeof window.pufflyClosePracticeSetupTray === "function"
  ) {
    window.pufflyClosePracticeSetupTray();
  }
  if (typeof window.pufflyClosePracticePillClusters === "function") {
    window.pufflyClosePracticePillClusters();
  }

  const generation = (rulesDrawerGeneration += 1);
  commitRulesDrawerAnimations();
  cancelRulesDrawerAnimations();
  mountRulesDrawerToBody();
  document.body.classList.remove("rules-panel-open", "rules-panel-animating");
  clearRulesDrawerInlineStyles();

  rulesPanel?.classList.remove("hidden");
  rulesPanel?.setAttribute("aria-hidden", "false");
  if (rulesPanelBackdrop) {
    rulesPanelBackdrop.hidden = false;
    rulesPanelBackdrop.setAttribute("aria-hidden", "false");
  }
  rulesButton?.setAttribute("aria-expanded", "true");

  setRulesDrawerClosedVisual();
  flushRulesDrawerLayout();
  await waitRulesDrawerOpenFrame();
  if (generation !== rulesDrawerGeneration) {
    return;
  }
  document.body.classList.add("rules-panel-animating");
  if (selectedGameId === "puzzle") {
    await nextRulesDrawerAnimationFrame();
    await nextRulesDrawerAnimationFrame();
  }
  if (generation !== rulesDrawerGeneration) {
    return;
  }

  const panelClosedTransform = rulesDrawerPanelClosedSlideTransform();
  const panelOpenTransform = rulesDrawerPanelOpenSlideTransform();
  if (rulesPanel) {
    rulesPanel.style.transition = "none";
    rulesPanel.style.transform = panelClosedTransform;
    rulesPanel.style.visibility = "visible";
  }
  flushRulesDrawerLayout();

  await runRulesDrawerAnimation(
    [
      { transform: panelClosedTransform },
      { transform: panelOpenTransform },
    ],
    [{ opacity: 0 }, { opacity: 1 }],
  );

  if (generation !== rulesDrawerGeneration) {
    return;
  }

  commitRulesDrawerAnimations();
  cancelRulesDrawerAnimations();
  applyRulesDrawerOpenState();
}

async function hideRulesPanel() {
  const wasOpen = document.body.classList.contains("rules-panel-open");
  const wasAnimating = document.body.classList.contains("rules-panel-animating");
  const generation = (rulesDrawerGeneration += 1);

  mountRulesDrawerToBody();
  commitRulesDrawerAnimations();
  cancelRulesDrawerAnimations();
  document.body.classList.remove("rules-panel-open", "rules-panel-animating");
  clearRulesDrawerInlineStyles();

  if (!wasOpen && !wasAnimating && rulesPanel?.classList.contains("hidden")) {
    applyRulesDrawerClosedState();
    return;
  }

  rulesButton?.setAttribute("aria-expanded", "false");
  rulesPanel?.setAttribute("aria-hidden", "true");
  if (rulesPanelBackdrop) {
    rulesPanelBackdrop.setAttribute("aria-hidden", "true");
  }

  if (!rulesPanel) {
    applyRulesDrawerClosedState();
    return;
  }

  if (!wasOpen && !wasAnimating) {
    applyRulesDrawerClosedState();
    return;
  }

  if (rulesPanelBackdrop) {
    rulesPanelBackdrop.hidden = false;
  }
  rulesPanel.classList.remove("hidden");

  const panelFromTransform =
    wasOpen || !wasAnimating ? rulesDrawerPanelOpenSlideTransform() : rulesDrawerPanelTransformKeyframe();
  const panelClosedTransform = rulesDrawerPanelClosedSlideTransform();
  const backdropFromOpacity = wasOpen || !wasAnimating ? 1 : rulesDrawerBackdropOpacityKeyframe();

  setRulesDrawerOpenVisual();
  if (!wasOpen && wasAnimating) {
    if (rulesPanel) {
      rulesPanel.style.transform = panelFromTransform;
    }
    if (rulesPanelBackdrop) {
      rulesPanelBackdrop.style.opacity = String(backdropFromOpacity);
    }
  }
  flushRulesDrawerLayout();
  document.body.classList.add("rules-panel-animating");

  await runRulesDrawerAnimation(
    [
      { transform: panelFromTransform },
      { transform: panelClosedTransform },
    ],
    [{ opacity: backdropFromOpacity }, { opacity: 0 }],
  );

  if (generation !== rulesDrawerGeneration) {
    return;
  }

  commitRulesDrawerAnimations();
  cancelRulesDrawerAnimations();
  applyRulesDrawerClosedState();
}

window.pufflyHideRulesPanel = hideRulesPanel;

function isFriendStatusAlert(text) {
  return /could not|unable|timed out|denied|invalid|error|failed|slow down|not found|unavailable|switch to friend|tap play/i.test(
    String(text || ""),
  );
}

function setFriendStatus(text, options = {}) {
  const displayText =
    options.skipRoomPrefix || !remoteSession?.roomCode
      ? String(text || "")
      : friendStatusWithRoom(text);
  const label = friendStatusLabel || document.getElementById("friend-status");
  if (label) {
    label.textContent = displayText;
    label.classList.toggle("friend-status-alert", isFriendStatusAlert(displayText));
  }
  if (typeof window !== "undefined" && typeof window.pufflySetFriendStatus === "function") {
    window.pufflySetFriendStatus(displayText);
  }
}

function clearInviteParamsFromUrl() {
  if (typeof window === "undefined" || !window.history?.replaceState) {
    return;
  }
  const url = new URL(window.location.href);
  const hadInvite =
    url.searchParams.has("join") ||
    url.searchParams.has("room") ||
    url.searchParams.has("game") ||
    url.searchParams.has("mode") ||
    url.searchParams.has("puzzleSize") ||
    Boolean(url.hash);
  if (!hadInvite) {
    return;
  }
  url.searchParams.delete("join");
  url.searchParams.delete("room");
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

function normalizeInviteLinkOrigin(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return "";
  }
  try {
    const parsed = new URL(raw.includes("://") ? raw : `https://${raw}`);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return "";
    }
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return "";
  }
}

function readStoredInviteLinkOrigin() {
  if (typeof window === "undefined") {
    return "";
  }
  try {
    return normalizeInviteLinkOrigin(window.localStorage?.getItem(INVITE_ORIGIN_STORAGE_KEY));
  } catch {
    return "";
  }
}

function persistInviteLinkOrigin(value) {
  const normalized = normalizeInviteLinkOrigin(value);
  if (!normalized || typeof window === "undefined") {
    return false;
  }
  try {
    window.localStorage.setItem(INVITE_ORIGIN_STORAGE_KEY, normalized);
    return true;
  } catch {
    return false;
  }
}

function isLocalInviteHost(hostname) {
  const host = String(hostname || "").trim().toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
}

function getInviteLinkOrigin() {
  if (typeof window === "undefined") {
    return DEFAULT_PUBLIC_INVITE_ORIGIN;
  }
  const stored = readStoredInviteLinkOrigin();
  if (stored) {
    return stored;
  }
  const { hostname, origin } = window.location;
  if (isLocalInviteHost(hostname)) {
    return DEFAULT_PUBLIC_INVITE_ORIGIN;
  }
  return origin;
}

function bootstrapInviteLinkOriginFromUrl() {
  if (typeof window === "undefined") {
    return;
  }
  try {
    const search = new URLSearchParams(window.location.search || "");
    const fromQuery = search.get("inviteOrigin") || search.get("publicOrigin");
    if (fromQuery) {
      persistInviteLinkOrigin(fromQuery);
    }
  } catch {
    // ignore
  }
}

function buildInviteLink(roomCode) {
  if (typeof window === "undefined") {
    return roomCode;
  }
  const normalizedCode = String(roomCode || "").trim().toUpperCase();
  const gameId = getInviteGameIdForLink();
  const url = new URL(`/join/${encodeURIComponent(normalizedCode)}`, getInviteLinkOrigin());
  url.searchParams.set("join", normalizedCode);
  url.searchParams.set("room", normalizedCode);
  url.searchParams.set("game", gameId);
  url.searchParams.set("mode", "friend");
  if (gameId === "puzzle") {
    url.searchParams.set("puzzleSize", difficulty);
  }
  const hashParams = new URLSearchParams();
  hashParams.set("join", normalizedCode);
  hashParams.set("room", normalizedCode);
  hashParams.set("game", gameId);
  hashParams.set("mode", "friend");
  if (gameId === "puzzle") {
    hashParams.set("puzzleSize", difficulty);
  }
  url.hash = hashParams.toString();
  return url.toString();
}

function updateInvitePanel(roomCode) {
  const normalizedCode = String(roomCode || "").trim().toUpperCase();
  if (!normalizedCode) {
    if (friendInviteLink) {
      friendInviteLink.textContent = "";
      friendInviteLink.removeAttribute("href");
    }
    return;
  }
  const inviteUrl = buildInviteLink(normalizedCode);
  if (friendInviteLink) {
    friendInviteLink.href = inviteUrl;
    friendInviteLink.textContent = inviteUrl;
  }
  if (remoteSession?.roomCode === normalizedCode && friendStatusLabel) {
    const current = friendStatusLabel.textContent || "";
    if (!current.startsWith(`Room: ${normalizedCode}`)) {
      setFriendStatus(getFriendStatusText(remoteSession));
    }
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

function prefersDesktopShareTextFirst() {
  return Boolean(window.matchMedia?.("(hover: hover) and (pointer: fine)")?.matches);
}

function tryOpenSmsInvite(shareText) {
  if (typeof window === "undefined") {
    return false;
  }
  const ua = navigator.userAgent || "";
  if (!/Macintosh|iPhone|iPad|iPod/.test(ua)) {
    return false;
  }
  try {
    window.location.href = `sms:&body=${encodeURIComponent(shareText)}`;
    return true;
  } catch {
    return false;
  }
}

async function shareInviteLink(roomCode, options = {}) {
  friendInviteInFlight = true;
  refreshFriendSeatStatus();
  refreshFriendRoomPill();
  try {
    const inviteUrl = buildInviteLink(roomCode);
    const gameTitle = getGameConfig(getInviteGameIdForLink()).title;
    const shareText = `Join my Puffly ${gameTitle} room (${roomCode}): ${inviteUrl}`;

    updateInvitePanel(roomCode);

    if (navigator.share) {
    const sharePayloads = prefersDesktopShareTextFirst()
      ? [
          { text: shareText },
          { title: `Puffly ${gameTitle} Invite`, text: shareText, url: inviteUrl },
          { url: inviteUrl },
          { title: `Puffly ${gameTitle} Invite`, url: inviteUrl },
        ]
      : [
          { text: shareText },
          { title: `Puffly ${gameTitle} Invite`, text: shareText, url: inviteUrl },
          { url: inviteUrl },
          { title: `Puffly ${gameTitle} Invite`, url: inviteUrl },
        ];
    for (const sharePayload of sharePayloads) {
      try {
        if (navigator.canShare && !navigator.canShare(sharePayload)) {
          continue;
        }
        await navigator.share(sharePayload);
        friendInviteShareReady = true;
        updateFriendRoomButtons();
        setFriendStatus(`Room ${roomCode} ready. Invite shared.`);
        return true;
      } catch (error) {
        if (error?.name === "AbortError") {
          if (!options.silentCancel) {
            setFriendStatus(`Room ${roomCode} ready. Tap SHARE to open Messages.`);
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
    if (copied) {
      friendInviteShareReady = true;
      updateFriendRoomButtons();
    }
    if (!copied && tryOpenSmsInvite(shareText)) {
      friendInviteShareReady = true;
      updateFriendRoomButtons();
      if (!options.silentFallback) {
        setFriendStatus(`Room ${roomCode} ready. Messages opened with invite link.`);
      }
      return true;
    }
    if (!options.silentFallback) {
      setFriendStatus(
        copied
          ? `Room ${roomCode} ready. Link copied — tap SHARE if you need it again.`
          : "Tap INVITE FRIEND or SHARE to send the link.",
      );
    }
    return copied;
  } finally {
    friendInviteInFlight = false;
    refreshFriendSeatStatus();
    refreshFriendRoomPill();
  }
}

function setVoiceStatus(_text) {
  updateVoiceConnectionLabel();
}

function updateVoiceConnectionLabel() {
  if (voiceConnectionLabel) {
    voiceConnectionLabel.textContent = voiceJoined ? "Connected" : "Not Connected";
  }
  if (voiceChatTitle) {
    voiceChatTitle.textContent = voiceJoined ? "Leave Voice" : "Voice Chat";
  }
  if (voiceJoinButton) {
    voiceJoinButton.classList.toggle("is-connected", voiceJoined);
    voiceJoinButton.setAttribute(
      "aria-label",
      voiceJoined ? "Leave voice chat (connected)" : "Voice chat (not connected)",
    );
  }
}

function updateVoiceButtons() {
  updateVoiceConnectionLabel();
  if (voiceRemoteAudioElement) {
    voiceRemoteAudioElement.muted = false;
  }
  refreshFriendVoicePill();
}

function isFriendVoiceUiActive() {
  return playMode === "friend" || isFriendChromeVisible() || Boolean(remoteSession?.roomCode);
}

function isFriendVoiceStartTapTarget(target) {
  if (!target || typeof target.closest !== "function") {
    return false;
  }
  return Boolean(target.closest("#speech-unlock-btn, #friend-voice-start-btn"));
}

function updateSpeechUnlockOverlay() {
  if (!speechUnlockOverlay) {
    return;
  }
  const title = speechUnlockOverlay.querySelector("h2");
  const blurb = speechUnlockOverlay.querySelector("p");
  const showFriendVoiceStart =
    isFriendVoiceUiActive() &&
    speechNeedsInteractionUnlock &&
    !friendVoiceStartDismissed &&
    Boolean(remoteSession?.roomCode);
  friendVoiceStartButton?.classList.toggle("hidden", !showFriendVoiceStart);
  if (showFriendVoiceStart) {
    if (title) {
      title.textContent = "Tap Start for Audio Guide";
    }
    if (blurb) {
      blurb.textContent = remoteSession?.roomCode
        ? "Tap Start to hear flip and turn updates from your friend."
        : "Tap Start to turn on voice before you play with your friend.";
    }
    speechUnlockOverlay.classList.remove("hidden");
    return;
  }
  if (
    playMode === "friend" ||
    isInvitePageLocked() ||
    hasInviteLandingIntent() ||
    isInviteJoinInProgress() ||
    isFriendInviteLandingLocked() ||
    isFriendSessionStable() ||
    shouldBlockPracticeColdBoot() ||
    remoteSession?.roomCode
  ) {
    friendVoiceStartButton?.classList.add("hidden");
    speechUnlockOverlay.classList.add("hidden");
    practiceVoiceStartDismissed = true;
    return;
  }
  friendVoiceStartButton?.classList.add("hidden");
  if (title) {
    title.textContent = "Tap Start for Audio Guide";
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
    ruleLine2.classList.remove("hidden");
    const team = remoteSession ? resolveFriendSessionColor(remoteSession) ?? remoteSession.color : null;
    const myColor = team ? playerDisplayName(team).toUpperCase() : null;
    ruleLine2.textContent = myColor
      ? `You are the ${myColor} team.`
      : "Your team color is assigned when you join the room.";
  } else {
    ruleLine1.classList.remove("hidden");
    if (isPuzzle) {
      ruleLine1.textContent = "Blue Puffly Team and Green Team solve together.";
      ruleLine2.classList.add("hidden");
    } else if (isFour) {
      ruleLine1.textContent = "Blue Puffly Team is computer controlled.";
      ruleLine2.classList.remove("hidden");
      ruleLine2.textContent = "Green team is your side.";
    } else {
      ruleLine1.textContent = "Blue Puffly Team is computer controlled.";
      ruleLine2.classList.remove("hidden");
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

function getFriendLobbyStatus() {
  return FRIEND_LOBBY_VOICE_PHRASE;
}

function getFriendCreateRoomHint() {
  return getFriendLobbyStatus();
}

function formatFriendRoomStatusLine(sessionLike, detail = "") {
  const roomCode = String(sessionLike?.roomCode || "").trim().toUpperCase();
  if (!roomCode) {
    return String(detail || "").trim() || getFriendLobbyStatus();
  }
  const playerCount = Math.min(Math.max(Number(sessionLike?.playerCount ?? 1), 1), 2);
  const teamColor = sessionLike?.color === "dark" || sessionLike?.color === "light" ? sessionLike.color : null;
  const teamSuffix = teamColor ? `. You are ${playerDisplayName(teamColor).toUpperCase()}` : "";
  let line = `Room: ${roomCode}. Welcome to the game room. Players: ${playerCount}/2${teamSuffix}`;
  const extra = String(detail || "").trim();
  if (extra) {
    line += `. ${extra}`;
  }
  return line;
}

function friendStatusDetailFromMessage(message, roomCode = "") {
  const text = String(message || "").trim();
  if (!text) {
    return "";
  }
  const code = String(roomCode || "").trim().toUpperCase();
  if (code && text.toUpperCase().includes(code) && /^Room:\s*[A-Z0-9]+/i.test(text)) {
    const playersMatch = text.match(/Players:\s*\d\/2\.?\s*(.*)$/i);
    return playersMatch?.[1]?.trim() || "";
  }
  if (/^Room\s*[-:]|Connected players:|Welcome to the game room|Players:\s*\d\/2|Playing\s/i.test(text)) {
    return "";
  }
  return text;
}

function getFriendStatusText(session) {
  if (!session) {
    return getFriendCreateRoomHint();
  }
  if (!session.ready) {
    return formatFriendRoomStatusLine(session, "Invite a friend to play.");
  }
  return formatFriendRoomStatusLine(session);
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
  friendInviteShareReady = false;
  friendUndoAvailable = false;
  if (roomCodeInput) {
    roomCodeInput.value = "";
  }
  updateFriendRoomButtons();
}

/** Keep the multiplayer room alive while the user plays solo practice. */
function pauseFriendRoomForPractice() {
  resetFriendVoiceForPracticeSwitch();
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
  friendInviteShareReady = true;
  if (roomCodeInput) {
    roomCodeInput.value = pausedSession.roomCode;
  }
  remoteSession = null;
  updateFriendRoomButtons();
}

function announceFriendHostWaitingVoice() {
  if (!remoteSession || remoteSession.ready) {
    return;
  }
  if (!friendJoinWelcomeSpoken) {
    announceFriendJoinWelcome(playerDisplayName(remoteSession.color).toUpperCase());
    return;
  }
  announceFriendInviteToPlayVoice();
}

async function resumeFriendRoomIfPaused() {
  if (remoteSession) {
    updateInvitePanel(remoteSession.roomCode);
    updateFriendRoomButtons();
    updateFriendLockOverlay();
    setFriendStatus(getFriendStatusText(remoteSession));
    announceFriendHostWaitingVoice();
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
    announceFriendHostWaitingVoice();
    render("Reconnected to your friend room.");
    return true;
  }
  return false;
}

function resetFriendLocalState(message = "Tap OPEN GAME ROOM or JOIN ROOM to start.", options = {}) {
  clearPuzzleDrag();
  stopRoomPolling();
  const preserveRoomCode = options.preserveRoomCode
    ? String(options.preserveRoomCode === true ? readLastFriendRoomCode() : options.preserveRoomCode)
        .trim()
        .toUpperCase()
    : "";
  if (remoteSession && voiceJoined) {
    apiPost("/api/rooms/voice/leave", {
      roomCode: remoteSession.roomCode,
      playerId: remoteSession.playerId,
    }).catch(() => {});
  }
  closeVoiceConnection();
  remoteSession = null;
  clearStoredFriendSession();
  if (!options.preserveRoomCode) {
    clearPersistedInviteJoinCode();
    clearFriendPracticeBlocked();
  }
  if (typeof window !== "undefined") {
    window.__pufflyFriendSessionStable = false;
    if (!options.preserveRoomCode) {
      window.__pufflyForceFriendLanding = false;
      window.__pufflyPendingInviteJoin = "";
    }
  }
  speechGesturePrimed = !speechNeedsInteractionUnlock;
  speechUnlocked = !speechNeedsInteractionUnlock;
  friendVoiceStartDismissed = false;
  friendJoinWelcomeSpoken = false;
  friendVoiceWarmPromise = null;
  resetFriendVoiceBus();
  lastMascotVoiceThought = "";
  friendPostFlipTurnVoiceUntil = 0;
  friendFlipTurnLastPhrase = "";
  friendFlipTurnSpeechLockUntil = 0;
  friendOpponentJoinedSpeechLockUntil = 0;
  friendSwitchVoiceLockUntil = 0;
  friendLobbyPromptSpoken = false;
  pendingFriendLobbyVoice = false;
  friendLobbyAutoplayPasses = 0;
  friendVoiceBusSpokenIds.delete(friendLobbyVoiceTransitionId());
  friendInviteToPlaySpoken = false;
  pendingFriendInviteToPlayVoice = false;
  friendYourTurnVoiceAnnounced = false;
  pendingJoinIntroTeam = "";
  friendInviteShareReady = false;
  friendInviteInFlight = false;
  friendUndoAvailable = false;
  roomChatMessages = [];
  setChatUnreadCount(0);
  state = createStateForGame(selectedGameId);
  moveHistory = [];
  undoSnapshots = [];
  winnerAnnounced = null;
  hideCelebration();
  if (preserveRoomCode) {
    rememberLastFriendRoomCode(preserveRoomCode);
  } else if (roomCodeInput) {
    roomCodeInput.value = "";
  }
  setFriendStatus(message, { skipRoomPrefix: Boolean(options.skipRoomPrefix) });
  updateInvitePanel(null);
  updateFriendRoomButtons();
  updateFriendPuzzleDifficultyPanel();
  updateFriendLockOverlay();
  updateRulesForMode();
  renderRoomChat(true);
  render("Friend mode: connect to a room.");
}

async function apiPost(path, payload, options = {}) {
  const noAbort = Boolean(options.noAbort);
  const timeoutMs = options.timeoutMs ?? 15000;
  const controller =
    !noAbort && typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer =
    controller && typeof window !== "undefined" && timeoutMs > 0
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
    return false;
  }
  if (
    playMode !== "friend" ||
    remoteSession ||
    ((!force && triedStoredFriendReconnect) || reconnectingStoredFriendSession)
  ) {
    return Boolean(remoteSession);
  }
  const cached = readStoredFriendSession();
  if (!cached) {
    triedStoredFriendReconnect = true;
    return false;
  }
  if (isFriendHostRoom(cached.roomCode)) {
    clearStoredFriendSession();
    triedStoredFriendReconnect = true;
    return false;
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
    return true;
  } catch {
    clearStoredFriendSession();
    setFriendStatus("Tap OPEN GAME ROOM to start a room.");
    return false;
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
  const fallbackCode = String(roomCodeInput?.value || getAutoJoinRoomCode() || "").trim().toUpperCase();
  if (fallbackCode) {
    await joinRoomWithCode(fallbackCode, { preferFreshJoin: true });
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
    voiceRemoteAudioElement.muted = false;
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

function syncRemoteSessionColorFromServer(data) {
  if (!remoteSession) {
    return false;
  }
  const serverColor = applyFriendSessionColor({
    ...data,
    playerId: remoteSession.playerId,
    hostPlayerId: data.hostPlayerId ?? remoteSession.hostPlayerId,
    creatorPlayerId: data.creatorPlayerId ?? remoteSession.creatorPlayerId,
    playerCount: data.playerCount ?? remoteSession.playerCount,
  });
  if (!serverColor) {
    return false;
  }
  if (remoteSession.color === serverColor) {
    return false;
  }
  remoteSession.color = serverColor;
  if (data.hostPlayerId) {
    remoteSession.hostPlayerId = data.hostPlayerId;
  }
  if (data.creatorPlayerId) {
    remoteSession.creatorPlayerId = data.creatorPlayerId;
  }
  writeStoredFriendSession(remoteSession);
  updateTeamMascot();
  updateRulesForMode();
  return true;
}

async function fetchFriendRoomState() {
  if (!remoteSession) {
    return { response: null, data: {} };
  }
  const params = new URLSearchParams({
    roomCode: remoteSession.roomCode,
    playerId: remoteSession.playerId,
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
  const didColorChange = syncRemoteSessionColorFromServer(data);
  syncFriendUndoFromServer(data);
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
    if (data.state && !options.skipPuzzleDifficultySync) {
      syncPuzzleDifficultyFromRemote(data.state, data.puzzleDifficulty);
    }
  }
  const didVersionChange = typeof data.version === "number" && data.version !== oldVersion;
  const didReadyChange =
    remoteSession.ready !== oldReady || remoteSession.playerCount !== oldCount;
  if (didColorChange) {
    updateRulesForMode();
    updateFriendLockOverlay();
    updateFriendPuzzleDifficultyPanel();
  }
  if (data.state) {
    const normalizedRemote = normalizeStateForGame(data.state, selectedGameId);
    const boardChanged = roomStateDiffersFromSync(previousState, normalizedRemote);
    const shouldApplyRemoteState =
      boardChanged ||
      didVersionChange ||
      didReadyChange ||
      didRoomGameTypeChange ||
      didLocalGameTypeChange ||
      didColorChange;
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
      const opponentLeft = oldCount >= 2 && remoteSession.playerCount < 2;
      if (opponentLeft) {
        friendYourTurnVoiceAnnounced = false;
        lastTurnSpoken = "";
        lastSpokenPhrase = "";
        friendUndoAvailable = false;
        friendInviteToPlaySpoken = false;
        friendVoiceBusSpokenIds.delete(friendInviteToPlayTransitionId());
        announceFriendInviteToPlayVoice();
      }
      if (didReadyChange && remoteSession.ready && !oldReady) {
        if (friendJoinWelcomeSpoken) {
          announceFriendOpponentJoined();
        } else if (
          !friendWelcomeLinesSnapshot.length &&
          !pendingWelcomeVoiceLines.length
        ) {
          announceFriendJoinWelcome(playerDisplayName(remoteSession.color).toUpperCase());
        }
      }
      const message = isPuzzleComplete(normalizedRemote)
        ? "Puzzle complete!"
        : didRoomGameTypeChange || didLocalGameTypeChange
          ? "Game switched."
          : remoteSession.ready
            ? flipJustCompleted
              ? `${starterLabel(normalizedRemote.starterPlayer || normalizedRemote.currentPlayer)} wins the flip and goes first.`
              : didVersionChange
                ? "Room synchronized."
                : "Opponent connected."
            : opponentLeft
              ? "Your friend left. Waiting for a new player to join..."
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
        syncFriendUndoFromServer(data);
      } else if (
        playMode === "friend" &&
        boardChanged &&
        normalizedRemote.currentPlayer === remoteSession.color &&
        previousState.currentPlayer !== remoteSession.color
      ) {
        syncFriendUndoFromServer(data);
      }
      const becameLocalTurn =
        normalizedRemote.starterFlipDone &&
        !normalizedRemote.winner &&
        !normalizedRemote.draw &&
        normalizedRemote.currentPlayer === remoteSession.color &&
        previousState?.currentPlayer !== remoteSession.color;
      applyRemoteRoomState(data, {
        statusMessage: message,
        flipJustCompleted,
        becameLocalTurn,
        previousState,
        gameTypeChanged: didRoomGameTypeChange || didLocalGameTypeChange,
        readyJustBecame: didReadyChange && remoteSession.ready && !oldReady,
        skipTurnVoice: Boolean(options.quietVoice) || friendRemoteAnimating,
      });
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
    if (playMode === "friend") {
      refreshFriendSeatStatus();
      refreshFriendRoomPill();
    }
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
  if (
    playMode === "friend" &&
    remoteSession?.ready &&
    isStarterFlipPending() &&
    (!speechNeedsInteractionUnlock || friendVoiceStartDismissed)
  ) {
    void announceFriendPreFlipVoiceNow({
      fromGesture: friendVoiceStartDismissed || hadRecentFriendGesture(),
      force: true,
    });
    updateSpeechUnlockOverlay();
  }
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
  const sessionColor = applyFriendSessionColor(data);
  if (!sessionColor) {
    console.warn("[puffly] room session missing color", SPEECH_BUILD, data);
  }
  remoteSession = {
    roomCode: data.roomCode,
    gameType: normalizeGameId(data.gameType || selectedGameId),
    playerId: data.playerId,
    color: sessionColor,
    hostPlayerId: data.hostPlayerId,
    creatorPlayerId: data.creatorPlayerId,
    version: typeof data.version === "number" ? data.version : 0,
    playerCount: data.playerCount ?? 1,
    ready: (data.playerCount ?? 1) >= 2,
    puzzleFlipTurn:
      data.puzzleFlipTurn === "light" || data.puzzleFlipTurn === "dark" ? data.puzzleFlipTurn : undefined,
  };
  if (speechNeedsInteractionUnlock) {
    friendVoiceStartDismissed = false;
  }
  writeStoredFriendSession(remoteSession);
  syncFriendUndoFromServer(data);
  syncLocalGameTypeFromRoom(remoteSession.gameType);
  state = normalizeStateForGame(data.state, selectedGameId);
  applyPuzzleFlipTurnFromRemote(state, data);
  syncPuzzleDifficultyFromRemote(state, data.puzzleDifficulty);
  selectedPuzzlePieceId = "";
  moveHistory = [];
  undoSnapshots = [];
  friendUndoAvailable = false;
  friendInviteShareReady = false;
  winnerAnnounced = null;
  hideCelebration();
  rememberLastFriendRoomCode(data.roomCode);
  if (
    isLocalFriendHost(data) ||
    (sessionColor === "dark" && (data.playerCount ?? 1) <= 1)
  ) {
    markFriendHostRoom(data.roomCode);
  }
  setFriendStatus(getFriendStatusText(remoteSession));
  updateInvitePanel(data.roomCode);
  updateFriendRoomButtons();
  updateFriendLockOverlay();
  updateFriendPuzzleDifficultyPanel();
  updateRulesForMode();
  syncRoomChatFromPayload(data, true);
  setChatUnreadCount(0);
  const teamName = playerDisplayName(sessionColor || data.color).toUpperCase();
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
  markFriendSessionStable();
  if (options.deferVoicePreload) {
    preloadVoiceClips({ minimal: true });
  } else {
    preloadVoiceClips();
  }
  updateTeamMascot();
  if (options.deferRender) {
    return true;
  }
  try {
    render(options.statusMessage || "Remote room connected.");
  } catch (error) {
    console.error("[hydrateRoomSession] render failed", error);
    setFriendStatus(getFriendStatusText(remoteSession));
  }
  if (
    remoteSession?.ready &&
    (!speechNeedsInteractionUnlock || friendVoiceStartDismissed) &&
    !options.deferGameplayVoice
  ) {
    syncFriendGameplayVoiceFromRoom();
    updateSpeechUnlockOverlay();
  }
  return true;
}

function applyCreateRoomResponse(data) {
  const roomCode = String(data?.roomCode || "").trim().toUpperCase();
  if (!roomCode) {
    throw new Error("Server did not return a room code.");
  }
  ensureFriendPlayModeSynced();
  abortFriendLobbyVoice();
  ensureAudioContext();
  primeSpeechEngine();
  friendInviteShareReady = false;
  friendUndoAvailable = false;
  const roomLabel =
    selectedGameId === "puzzle"
      ? getDifficultyLabel(difficulty, "puzzle")
      : getGameConfig(selectedGameId).title;
  rememberLastFriendRoomCode(roomCode);
  markFriendHostRoom(roomCode);
  updateInvitePanel(roomCode);
  updateFriendRoomButtons();
  setFriendStatus(
    formatFriendRoomStatusLine(
      { roomCode, playerCount: 1, gameType: selectedGameId },
      "Invite a friend to play.",
    ),
  );
  try {
    hydrateRoomSession(data, { announceJoinVoice: true });
  } catch (error) {
    console.error("[applyCreateRoomResponse] hydrate failed", error);
    const fallbackColor = applyFriendSessionColor(data);
    remoteSession = {
      roomCode,
      gameType: normalizeGameId(data.gameType || selectedGameId),
      playerId: data.playerId,
      color: fallbackColor,
      hostPlayerId: data.hostPlayerId,
      creatorPlayerId: data.creatorPlayerId,
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

function isInviteJoinRecoverableError(message = "") {
  const text = String(message || "").toLowerCase();
  return (
    text.includes("timed out") ||
    text.includes("timeout") ||
    text.includes("aborted") ||
    text.includes("failed to fetch") ||
    text.includes("network") ||
    text.includes("load failed")
  );
}

function writeStoredFriendSessionFromJoinPayload(data, roomCode) {
  if (!data?.roomCode || !data?.playerId) {
    return;
  }
  writeStoredFriendSession({
    roomCode: data.roomCode || roomCode,
    playerId: data.playerId,
    gameType: data.gameType || selectedGameId,
    color: applyFriendSessionColor(data) ?? undefined,
    hostPlayerId: data.hostPlayerId,
    creatorPlayerId: data.creatorPlayerId,
  });
}

async function attachInviteGuestFromServerPayload(data, roomCode, options = {}) {
  writeStoredFriendSessionFromJoinPayload(data, roomCode);
  const normalizedCode = String(roomCode || "")
    .trim()
    .toUpperCase();
  const asGuestAttach =
    options.guestAttach !== false && !isFriendHostRoom(normalizedCode);
  if (
    !hydrateRoomSession(data, {
      announceJoinVoice: !asGuestAttach,
      deferGameplayVoice: asGuestAttach,
      deferVoicePreload: asGuestAttach,
      statusMessage: asGuestAttach ? "Friend room connected." : undefined,
    })
  ) {
    return false;
  }
  if (asGuestAttach) {
    announceFriendGuestWelcome(playerDisplayName(remoteSession.color).toUpperCase());
    if (speechNeedsInteractionUnlock) {
      friendVoiceStartDismissed = false;
    }
    void warmFriendSessionVoiceClips();
    updateSpeechUnlockOverlay();
  }
  markFriendSessionStable();
  setFriendStatus(getFriendStatusText(remoteSession));
  return true;
}

/** After a slow join, the server may already have this iPad as Green while the client timed out. */
async function recoverInviteGuestSession(roomCode) {
  const normalizedCode = String(roomCode || "")
    .trim()
    .toUpperCase();
  if (!/^[A-Z0-9]{4,8}$/.test(normalizedCode)) {
    return false;
  }
  playMode = "friend";
  practiceVoiceStartDismissed = true;
  lockFriendInviteLanding(normalizedCode);
  markFriendJoinIntent(normalizedCode);
  syncPlayModeChrome();
  updateSpeechUnlockOverlay();
  try {
    const reclaimed = await apiPost(
      "/api/rooms/reclaim-guest",
      { roomCode: normalizedCode },
      { noAbort: true, timeoutMs: 0 },
    );
    if (await attachInviteGuestFromServerPayload(reclaimed, normalizedCode)) {
      return true;
    }
  } catch {
    // Guest slot may not exist yet.
  }
  const cached = readStoredFriendSession();
  if (cached?.roomCode === normalizedCode && cached?.playerId) {
    try {
      const data = await apiPost(
        "/api/rooms/reconnect",
        { roomCode: normalizedCode, playerId: cached.playerId },
        { noAbort: true, timeoutMs: 0 },
      );
      if (await attachInviteGuestFromServerPayload(data, normalizedCode)) {
        return true;
      }
    } catch {
      // Try join next.
    }
  }
  try {
    const data = await apiPost(
      "/api/rooms/join",
      { roomCode: normalizedCode },
      { noAbort: true, timeoutMs: 0 },
    );
    if (await attachInviteGuestFromServerPayload(data, normalizedCode)) {
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

async function joinRoomWithCode(roomCode, options = {}) {
  const normalizedCode = String(roomCode || "").trim().toUpperCase();
  const fromInvite = Boolean(options.fromInvite);
  const preferFreshJoin = Boolean(options.preferFreshJoin);
  if (!normalizedCode) {
    setFriendStatus("Enter a room code first.");
    return false;
  }
  if (fromInvite && isFriendHostRoom(normalizedCode)) {
    if (remoteSession?.roomCode === normalizedCode) {
      updateTeamMascot();
      setFriendStatus(getFriendStatusText(remoteSession));
      return true;
    }
    setFriendStatus(
      "You are already the Blue host for this room. Open the invite link on your friend's iPad or iPhone.",
    );
    return false;
  }
  if (fromInvite) {
    markFriendJoinIntent(normalizedCode);
  }
  if (preferFreshJoin) {
    const cached = readStoredFriendSession();
    if (cached?.roomCode !== normalizedCode) {
      clearStoredFriendSession();
    }
  }
  ensureFriendPlayModeSynced();
  if (remoteSession?.roomCode === normalizedCode) {
    updateTeamMascot();
    return true;
  }
  if (remoteSession) {
    setFriendStatus(
      `Already connected to room ${remoteSession.roomCode} as ${playerDisplayName(remoteSession.color).toUpperCase()}. Use the second device to join.`,
    );
    return false;
  }
  if (fromInvite) {
    applyInviteLandingConfig();
    if (!options.skipModeSetup && playMode !== "friend") {
      enterFriendLobbyChrome({ joiningCode: normalizedCode });
    }
  }
  const hostReclaim = isFriendHostRoom(normalizedCode);
  if (hostReclaim) {
    clearStoredFriendSession();
  }
  const cached = readStoredFriendSession();
  if (
    !preferFreshJoin &&
    !fromInvite &&
    !hostReclaim &&
    cached?.roomCode === normalizedCode &&
    cached?.playerId
  ) {
    try {
      const data = await apiPost("/api/rooms/reconnect", {
        roomCode: normalizedCode,
        playerId: cached.playerId,
      });
      hydrateRoomSession(data);
      return true;
    } catch {
      clearStoredFriendSession();
    }
  }
  try {
    const joinPayload = { roomCode: normalizedCode };
    if (!fromInvite) {
      joinPayload.gameType = selectedGameId;
    }
    if (hostReclaim) {
      joinPayload.reclaimHost = true;
    }
    const data = await apiPost("/api/rooms/join", joinPayload, {
      noAbort: fromInvite,
      timeoutMs: fromInvite ? 0 : 15000,
    });
    writeStoredFriendSessionFromJoinPayload(data, normalizedCode);
    if (!hydrateRoomSession(data)) {
      setFriendStatus("Joined the room but could not load the game. Tap Join Room again.");
      return false;
    }
    const joinedColor = applyFriendSessionColor(data);
    if (remoteSession && joinedColor && remoteSession.color !== joinedColor) {
      remoteSession.color = joinedColor;
      writeStoredFriendSession(remoteSession);
      updateTeamMascot();
      updateRulesForMode();
    }
    if (hostReclaim && joinedColor !== "dark") {
      console.warn("[puffly] host reclaim expected dark, got", joinedColor, SPEECH_BUILD);
    }
    if (!hostReclaim && joinedColor !== "light" && (data.playerCount ?? 1) >= 2) {
      console.warn("[puffly] guest join expected light when room full, got", joinedColor, SPEECH_BUILD);
    }
    return true;
  } catch (error) {
    const message = String(error?.message || "");
    if (fromInvite && isInviteJoinRecoverableError(message)) {
      setFriendStatus(
        inviteJoinStatusText("Connection was slow. Reclaiming your seat in the room..."),
      );
      if (await recoverInviteGuestSession(normalizedCode)) {
        return true;
      }
    }
    if (message.toLowerCase().includes("room already has two players")) {
      if (hostReclaim) {
        clearStoredFriendSession();
        try {
          const retryPayload = { roomCode: normalizedCode, reclaimHost: true };
          if (!fromInvite) {
            retryPayload.gameType = selectedGameId;
          }
          const data = await apiPost("/api/rooms/join", retryPayload, {
            noAbort: fromInvite,
            timeoutMs: fromInvite ? 0 : 15000,
          });
          hydrateRoomSession(data);
          return true;
        } catch (retryError) {
          setFriendStatus(retryError?.message || message);
          return false;
        }
      }
      triedStoredFriendReconnect = false;
      if (await recoverInviteGuestSession(normalizedCode)) {
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

function syncAudioTogglePlacement() {
  if (!audioToggleButton) {
    return;
  }
  const practiceHost = pufflyControls;
  const friendHost = friendVoiceAudioHost;
  if (playMode === "friend" && friendHost) {
    friendHost.appendChild(audioToggleButton);
    updateAudioToggle();
    return;
  }
  if (practiceHost) {
    practiceHost.appendChild(audioToggleButton);
    updateAudioToggle();
  }
}

function friendStatusWithRoom(message, roomCode = remoteSession?.roomCode || "") {
  const code = String(roomCode || "").trim().toUpperCase();
  const text = String(message || "").trim();
  if (!code) {
    return text || getFriendLobbyStatus();
  }
  if (/^(Joining|Creating|Reconnecting|Timed out|Tap Play)/i.test(text)) {
    return text;
  }
  if (text && text.toUpperCase().includes(code) && /^Room:\s*[A-Z0-9]+/i.test(text)) {
    return text;
  }
  if (remoteSession?.roomCode === code) {
    const detail = friendStatusDetailFromMessage(text, code);
    if (detail) {
      return formatFriendRoomStatusLine(remoteSession, detail);
    }
    return getFriendStatusText(remoteSession);
  }
  const partial = {
    roomCode: code,
    playerCount: remoteSession?.playerCount ?? 1,
    gameType: remoteSession?.gameType || selectedGameId,
  };
  if (!text) {
    return formatFriendRoomStatusLine(partial);
  }
  const detail = friendStatusDetailFromMessage(text, code);
  return formatFriendRoomStatusLine(partial, detail || text);
}

function syncPlayModeChrome() {
  if (
    playMode === "puffly" &&
    shouldBlockPracticeColdBoot() &&
    !(typeof window !== "undefined" && window.__pufflyUserChosePufflyMode)
  ) {
    playMode = "friend";
    practiceVoiceStartDismissed = true;
  }
  if (playMode === "friend") {
    suspendPracticeTableLayoutForFriendMode();
  } else if (playMode === "puffly") {
    restorePracticeTableLayoutIfEnabled();
  }
  if (typeof window !== "undefined" && typeof window.pufflyApplyPlayModeChrome === "function") {
    window.pufflyApplyPlayModeChrome(playMode, {
      skipDomSync: playMode === "friend",
      skipTableChromeUpdate: true,
    });
  }
  document.body.classList.toggle("friend-mode", playMode === "friend");
  syncSelectedGameBodyClasses();
  syncFriendPracticePillDropdownPanels();
  syncAudioTogglePlacement();
  updateSpeechUnlockOverlay();
  const pufflyPanel = document.getElementById("puffly-controls");
  const friendPanel = document.getElementById("friend-controls");
  const pufflyBtn = document.getElementById("play-puffly-btn");
  const friendBtn = document.getElementById("play-friend-btn");
  const chatPanel = document.getElementById("friend-chat-panel");
  pufflyPanel?.classList.toggle("hidden", playMode === "friend");
  friendPanel?.classList.toggle("hidden", playMode !== "friend");
  pufflyBtn?.classList.toggle("active", playMode === "puffly");
  friendBtn?.classList.toggle("active", playMode === "friend");
  chatPanel?.classList.toggle("hidden", playMode !== "friend");
  if (playMode === "friend") {
    assertFriendModeLayoutClasses();
  }
  updatePracticeTableChrome();
}

function setPlayMode(mode, options = {}) {
  if (
    mode === "puffly" &&
    shouldBlockPracticeColdBoot() &&
    !options.userChosePractice &&
    !(typeof window !== "undefined" && window.__pufflyUserChosePufflyMode)
  ) {
    mode = "friend";
  }
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
    resetFriendVoiceForPracticeSwitch();
  } else if (!remoteSession && !isFriendInviteLandingLocked()) {
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
    if (!remoteSession) {
      state = createStateForGame(selectedGameId);
      lastSpokenPhrase = "";
      lastTurnSpoken = "";
      moveHistory = [];
      undoSnapshots = [];
      friendUndoAvailable = false;
      friendInviteShareReady = false;
      roomChatMessages = [];
      setChatUnreadCount(0);
      triedStoredFriendReconnect = false;
      const lastCode = readLastFriendRoomCode();
      if (lastCode) {
        rememberLastFriendRoomCode(lastCode);
      }
    }
    updateFriendRoomButtons();
    updateFriendPuzzleDifficultyPanel();
    updateFriendLockOverlay();
    updateRulesForMode();
    updateTeamMascot();
    renderRoomChat(true);
    if (!remoteSession && !readStoredFriendSession() && !getJoinCodeFromUrl()) {
      ensureFriendLobbyVoice({
        fromGesture: Boolean(options.fromUserGesture) || speechGesturePrimed,
      });
    }
    if (!options.skipReconnect) {
      void resumeFriendRoomIfPaused().then((reconnected) => {
        if (!reconnected && !options.keepFriendStatus && !remoteSession) {
          setFriendStatus(getFriendCreateRoomHint());
          setPufflyState("idle", "🤝 Tap OPEN GAME ROOM above to start.");
          updateInvitePanel(null);
          render("Friend mode: connect to a room.");
          ensureFriendLobbyVoice({
            fromGesture: Boolean(options.fromUserGesture) || speechGesturePrimed,
          });
        }
        if (!remoteSession && !isInviteJoinInProgress()) {
          maybeAutoJoinFromInviteLink();
        }
      });
    } else if (!options.keepFriendStatus && !remoteSession) {
      setFriendStatus(getFriendCreateRoomHint());
      setPufflyState("idle", "🤝 Tap OPEN GAME ROOM above to start.");
      updateInvitePanel(null);
      render("Friend mode: connect to a room.");
      ensureFriendLobbyVoice({
        fromGesture: Boolean(options.fromUserGesture) || speechGesturePrimed,
      });
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
    try {
      await runComputerTurn();
    } catch (error) {
      console.error("[flipStarter] computer turn failed", error);
      busy = false;
      render(lastStatusMessage || "Make your move.", { suppressStatusVoice: true });
    }
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
  if (!practiceTableIsActive()) {
    boardElement.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
    boardElement.style.gridTemplateRows = `repeat(${rows}, minmax(0, 1fr))`;
  }
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
    speakPuzzleFeedback("Not your piece.", { fromGesture: Boolean(options.fromGesture) });
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
    speakPuzzleFeedback("Not your piece.", { fromGesture: Boolean(options.fromGesture) });
    render(`Place a ${playerDisplayName(expectedOwner).toUpperCase()} tray piece.`, { suppressStatusVoice: true });
    return;
  }
  if (row !== piece.correctRow || col !== piece.correctCol) {
    speakPuzzleFeedback("Doesn't fit.", { fromGesture: Boolean(options.fromGesture) });
    render("Doesn't fit there.", { suppressStatusVoice: true });
    return;
  }

  if (busy && !options.fromComputer) {
    return;
  }
  if (playMode === "friend") {
    if (speechNeedsInteractionUnlock) {
      stopFriendWelcomeForGameplay();
    }
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
    const mover = state.currentPlayer;
    try {
      state = nextState;
      notifyFriendVoiceAfterLocalMove(mover, state);
      commitPuzzlePlacementDom(pieceId, row, col);
      const targetCell = boardElement.querySelector(`.puzzle-cell[data-row="${row}"][data-col="${col}"]`);
      await animateDestinationBounce(targetCell);
      await submitRemoteMove(nextState, {
        puzzlePlacement: { pieceId, row, col },
        skipVoiceSync: true,
        statusMessage: result.message,
      });
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
    updatePracticeTableChrome();
    renderUi(statusMessage, options);
    if (playMode === "friend") {
      refreshFriendSeatStatus();
      refreshFriendVoicePill();
    }
  } catch (error) {
    console.error("[render] recover after error", error);
    state = createStateForGame(selectedGameId);
    releasePuzzleInteractionLocks();
    busy = false;
    try {
      updatePracticeTableChrome();
      renderUi(statusMessage, options);
      if (playMode === "friend") {
        refreshFriendSeatStatus();
        refreshFriendVoicePill();
      }
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
  undoButton?.classList.toggle("hidden", isPuzzleGame && playMode !== "friend");
  controlsPanel?.classList.toggle("puzzle-no-undo", isPuzzleGame && playMode !== "friend");
  syncSelectedGameBodyClasses();
  if (playMode === "friend") {
    syncFriendPracticePillDropdownPanels();
  }
  syncPracticeTablePuzzleGridBodyClasses();
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
    refreshUndoButton();
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
      if (playMode === "friend") {
        setPufflyState("thinking", friendMascotThoughtForTurn(), {
          silentVoice: shouldSilentFriendPreFlipVoice(),
        });
      } else {
        setPufflyState("thinking", "🪙 Flip to choose who starts.");
        announcePracticeFlipVoice();
      }
      return;
    }
    if (playMode === "friend") {
      setPufflyState(
        remoteSession && state.currentPlayer === remoteSession.color ? "idle" : "thinking",
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
    refreshUndoButton();
    rulesButton.disabled = busy;
    updateDifficultyButtons();
    updateAudioToggle();
    updateStarterFlipButton();
    friendLockOverlay?.classList.add("hidden");
    if (state.winner) {
      const isHumanWin =
        playMode === "friend" && remoteSession
          ? state.winner === remoteSession.color
          : state.winner === humanPlayer;
      if (isHumanWin) {
        setPufflyState("celebrate", playMode === "friend" ? "🎉 You win!" : "😮 You got me!");
      } else {
        setPufflyState(playMode === "friend" ? "idle" : "celebrate", playMode === "friend" ? `${playerDisplayName(state.winner).toUpperCase()} wins!` : "🎉 I win!");
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
      if (playMode === "friend") {
        setPufflyState("thinking", friendMascotThoughtForTurn(), {
          silentVoice: shouldSilentFriendPreFlipVoice(),
        });
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
      setPufflyState(
        remoteSession && state.currentPlayer === remoteSession.color ? "idle" : "thinking",
        friendMascotThoughtForTurn(),
      );
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
    if (playMode === "friend") {
      setPufflyState("thinking", friendMascotThoughtForTurn(), {
        silentVoice: shouldSilentFriendPreFlipVoice(),
      });
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
    refreshUndoButton();
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
  refreshUndoButton();
  rulesButton.disabled = busy;
  updateDifficultyButtons();
  updateFriendDifficultyButtons();
  updateFriendPuzzleDifficultyPanel();
  updateFriendRoomButtons();
  updateAudioToggle();
  updateStarterFlipButton();
  friendLockOverlay?.classList.add("hidden");

  if (state.winner) {
    if (playMode === "friend" && remoteSession) {
      const localWon = state.winner === remoteSession.color;
      setPufflyState(
        localWon ? "celebrate" : "idle",
        localWon ? "🎉 You win!" : `${playerDisplayName(state.winner).toUpperCase()} wins!`,
      );
    } else if (state.winner === humanPlayer) {
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
      setPufflyState("idle", isInviteGuestLanding() ? "🐸 Joining as GREEN…" : "🤝 Friend mode");
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

function fourInARowGhostSizeForSquare(square) {
  const rect = square.getBoundingClientRect();
  return Math.min(rect.width, rect.height) * 0.82;
}

function fourInARowGhostOriginForSquare(square, size) {
  const rect = square.getBoundingClientRect();
  return {
    left: rect.left + rect.width / 2 - size / 2,
    top: rect.top + rect.height / 2 - size / 2,
  };
}

async function animateFourDrop(player, row, col, durationMs = HUMAN_MOVE_ANIMATION_MS) {
  const toSquare = findSquareElement(row, col);
  const fromSquare = findSquareElement(0, col);
  if (!toSquare || !fromSquare) {
    return;
  }
  const size = fourInARowGhostSizeForSquare(fromSquare);
  const start = fourInARowGhostOriginForSquare(fromSquare, size);
  const end = fourInARowGhostOriginForSquare(toSquare, size);

  const ghost = document.createElement("span");
  ghost.className = `ai-piece-ghost piece four-piece ${player}`;
  ghost.style.width = `${size}px`;
  ghost.style.height = `${size}px`;
  ghost.style.left = `${start.left}px`;
  ghost.style.top = `${start.top}px`;
  ghost.style.transitionDuration = `${durationMs}ms`;
  document.body.appendChild(ghost);

  await new Promise((resolve) => window.requestAnimationFrame(resolve));
  ghost.style.transform = `translate(${end.left - start.left}px, ${end.top - start.top}px)`;
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
  const size = fourInARowGhostSizeForSquare(fromSquare);
  const start = fourInARowGhostOriginForSquare(fromSquare, size);
  const end = fourInARowGhostOriginForSquare(toSquare, size);

  const ghost = document.createElement("span");
  ghost.className = `ai-piece-ghost piece four-piece ${player}`;
  ghost.style.width = `${size}px`;
  ghost.style.height = `${size}px`;
  ghost.style.left = `${start.left}px`;
  ghost.style.top = `${start.top}px`;
  ghost.style.transitionDuration = `${durationMs}ms`;
  document.body.appendChild(ghost);

  await new Promise((resolve) => window.requestAnimationFrame(resolve));
  ghost.style.transform = `translate(${end.left - start.left}px, ${end.top - start.top}px)`;
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
  applyRemoteRoomState(data, {
    statusMessage: `${flipLabel} wins the flip and goes first.`,
    flipJustCompleted: true,
  });
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
  await syncRoomState({ force: true, quietVoice: true });
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
    applyRemoteRoomState(data, {
      skipTurnVoice: Boolean(options.skipVoiceSync),
      statusMessage: options.statusMessage || lastStatusMessage,
    });
    syncFriendUndoFromServer(data);
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
  const previousState = options.previousState
    ? normalizeStateForGame(options.previousState, selectedGameId)
    : {
        starterFlipDone: state?.starterFlipDone,
        currentPlayer: state?.currentPlayer,
        winner: state?.winner,
        draw: state?.draw,
      };
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
  }
  const voiceNextState =
    selectedGameId === "puzzle" ? normalizePuzzleTurn({ ...state }) || state : state;
  const rematch = isFriendRematchTransition(previousState, voiceNextState);
  if (rematch) {
    resetFriendSpeechForRematch();
  }
  syncFriendVoiceBusFromStates(previousState, voiceNextState, {
    flipJustCompleted: Boolean(options.flipJustCompleted),
    becameLocalTurn: Boolean(options.becameLocalTurn),
    gameTypeChanged: Boolean(options.gameTypeChanged),
    readyJustBecame: Boolean(options.readyJustBecame),
    skipTurnVoice: Boolean(options.skipTurnVoice) || friendRemoteAnimating,
  });
  friendSkipTurnVoiceThisRender = true;
  try {
    render(options.statusMessage || lastStatusMessage || "Make your move.");
  } finally {
    friendSkipTurnVoiceThisRender = false;
  }
  if (selectedGameId === "puzzle" && playMode === "friend" && isPuzzleComplete(state)) {
    maybeShowPuzzleCompletion("Puzzle complete!");
  }
  if (friendJoinWelcomeSpoken) {
    pendingWelcomeVoiceLines = [];
  }
  if (
    !options.skipTurnVoice &&
    Boolean(options.flipJustCompleted) &&
    isFriendYourTurnNow() &&
    !friendYourTurnVoiceAnnounced &&
    !friendGameplayVoiceGatedByWelcome()
  ) {
    void warmFriendSessionVoiceClips().then(() => {
      void playFriendYourTurnClipNow({
        fromGesture: hadRecentFriendGesture() || friendPostFlipTurnVoiceActive(),
      });
    });
  }
}

async function commitMove(move) {
  maybeStoreUndoBeforeMove();
  if (playMode === "friend") {
    if (speechNeedsInteractionUnlock) {
      stopFriendWelcomeForGameplay();
    }
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
      notifyFriendVoiceAfterLocalMove(mover, state);
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
    notifyFriendVoiceAfterLocalMove(mover, state);
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
  if (selectedGameId === "puzzle") {
    primePuzzleVoiceFromGesture();
  } else if (playMode === "friend" && remoteSession) {
    scheduleAudioUnlockFromGesture();
  }
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
    selectPuzzlePiece(pieceId, { fromPointerDown: true, fromGesture: true });
  });
}

function handlePuzzleBoardTap(event) {
  releasePuzzleInteractionLocks();
  if (selectedGameId === "puzzle") {
    primePuzzleVoiceFromGesture();
  } else if (playMode === "friend" && remoteSession) {
    scheduleAudioUnlockFromGesture();
  }
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
    void handlePuzzleBoardPlace(cell, placeMetrics, { fromGesture: true });
  });
}

async function handlePuzzleBoardPlace(square, placeMetrics = null, options = {}) {
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
    await submitPuzzlePlacement(selectedPuzzlePieceId, row, col, {
      placeMetrics,
      fromGesture: Boolean(options.fromGesture),
    });
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
  if (playMode === "friend" && remoteSession) {
    friendGestureAudioTick();
  } else {
    resumeFriendAudioContextFromGesture();
  }
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
  noteUserGesture();
  resumeFriendAudioContextFromGesture();
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
      winnerAnnounced = null;
      hideCelebration();
      resetPuzzleSessionAfterRestart();
      resetFriendSpeechForRematch();
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
      if (!isFriendPuzzleSizeHost()) {
        setFriendPuzzleSizeStatus("Only Blue can change puzzle size.");
        return;
      }
      const previousDifficulty = difficulty;
      const targetDifficulty = nextDifficulty;
      const wasPuzzleComplete = isFriendPuzzleRoundComplete();
      const wasMidGameReset = isFriendPuzzleMidGame();
      difficulty = targetDifficulty;
      updateDifficultyButtons();
      updateFriendDifficultyButtons();
      busy = true;
      try {
        if (wasPuzzleComplete || wasMidGameReset) {
          await syncRoomState({
            force: true,
            quietVoice: true,
            skipPuzzleDifficultySync: true,
          }).catch(() => {});
        }
        const data = await postFriendPuzzleSize(targetDifficulty, {
          restartFallbackOnLocked: wasPuzzleComplete || wasMidGameReset,
        });
        difficulty = targetDifficulty;
        applyFriendPuzzleSizeRoomPayload(data, { wasPuzzleComplete, wasMidGameReset });
      } catch (error) {
        difficulty = previousDifficulty;
        updateDifficultyButtons();
        updateFriendDifficultyButtons();
        const message = friendPuzzleSizeFailureMessage(error, {
          wasPuzzleComplete,
          wasMidGameReset,
        });
        setFriendPuzzleSizeStatus(message);
        render(message);
      } finally {
        busy = false;
        render(lastStatusMessage);
      }
      return;
    }
    difficulty = nextDifficulty;
    updateDifficultyButtons();
    updateFriendDifficultyButtons();
    rebuildFriendPuzzleLobbyState();
    const lobbyStatus = puzzleFlipPromptText();
    if (isFriendTableUiActive()) {
      refreshFriendGameUi(lobbyStatus);
    } else {
      render(lobbyStatus);
    }
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

function handleFriendPuzzleSizeButtonClick(button) {
  if (playMode !== "friend" || selectedGameId !== "puzzle" || !button) {
    return;
  }
  const nextDifficulty = button.dataset.difficulty;
  if (!nextDifficulty) {
    return;
  }
  updateFriendDifficultyButtons();
  if (busy) {
    setFriendPuzzleSizeStatus("Updating puzzle size…", 2500);
    return;
  }
  if (!canChangeFriendPuzzleSize()) {
    setFriendPuzzleSizeStatus(friendPuzzleSizeBlockedMessage());
    return;
  }
  if (nextDifficulty === difficulty) {
    setFriendPuzzleSizeStatus(
      `Already ${getDifficultyLabel(difficulty, "puzzle")}. Pick Classic or Mega.`,
      4000,
    );
    return;
  }
  if (isFriendPuzzleMidGame()) {
    beginFriendPuzzleSizePendingConfirm(nextDifficulty);
    return;
  }
  for (const sizeButton of getFriendDifficultyButtons()) {
    const level = sizeButton.dataset.difficulty;
    sizeButton.classList.toggle("is-on", level === nextDifficulty);
    sizeButton.classList.toggle("is-off", level !== nextDifficulty);
  }
  applyDifficultyChange(nextDifficulty, { fromFriendPanel: true }).catch(() => {});
}

friendPuzzleSizeSwitchBtn?.addEventListener("click", () => {
  if (!friendPuzzleSizePendingConfirm || busy) {
    return;
  }
  const nextDifficulty = friendPuzzleSizePendingConfirm.nextDifficulty;
  clearFriendPuzzleSizePendingConfirm({ skipRefresh: true });
  for (const sizeButton of getFriendDifficultyButtons()) {
    const level = sizeButton.dataset.difficulty;
    sizeButton.classList.toggle("is-on", level === nextDifficulty);
    sizeButton.classList.toggle("is-off", level !== nextDifficulty);
  }
  applyDifficultyChange(nextDifficulty, { fromFriendPanel: true }).catch(() => {});
});

friendPuzzleSizeKeepBtn?.addEventListener("click", () => {
  clearFriendPuzzleSizePendingConfirm();
});

if (friendPuzzleDifficultyPanel && friendPuzzleDifficultyPanel.dataset.sizeClickBound !== "1") {
  friendPuzzleDifficultyPanel.dataset.sizeClickBound = "1";
  friendPuzzleDifficultyPanel.addEventListener("click", (event) => {
    const button = event.target.closest(".friend-difficulty-btn");
    if (!button || !friendPuzzleDifficultyPanel.contains(button)) {
      return;
    }
    handleFriendPuzzleSizeButtonClick(button);
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
  noteUserGesture();
  ensureAudioContext();
  primeSpeechSynthesisFromUserGesture();
  void flipStarter().finally(() => {
    starterFlipTapInFlight = false;
    if (playMode === "friend" && remoteSession?.ready && !isStarterFlipPending()) {
      markFriendPostFlipTurnVoiceWindow();
      if (isFriendYourTurnNow() && !friendYourTurnVoiceAnnounced) {
        void playFriendYourTurnClipNow({ fromGesture: true });
      } else {
        tryDrainFriendVoiceBus({ fromGesture: true });
      }
      friendGestureAudioTick();
    }
  });
}

starterFlipButton?.addEventListener("pointerdown", handleStarterFlipTap, { passive: false });
starterFlipButton?.addEventListener("click", handleStarterFlipTap);

undoButton?.addEventListener("click", async () => {
  ensureAudioContext();
  if (playMode === "friend") {
    if (busy || !friendUndoAvailable || !remoteSession) {
      if (!remoteSession) {
        setFriendStatus("Connect to a room first.");
      }
      return;
    }
    const historyBeforeUndo = [...moveHistory];
    const currentStateBeforeUndo = clone(state);
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
      moveHistory = historyBeforeUndo.slice(0, -1);
      winnerAnnounced = null;
      lastSpokenPhrase = "";
      lastTurnSpoken = "";
      hideCelebration();
      syncFriendUndoFromServer(data);
      syncRoomChatFromPayload(data);
      render("Undid your previous turn.");
    } catch (error) {
      render(error?.message || "Undo not available right now.");
    } finally {
      busy = false;
      refreshUndoButton();
      render(lastStatusMessage);
    }
    return;
  }
  if (busy || undoSnapshots.length === 0) {
    return;
  }
  const snapshot = undoSnapshots.pop();
  if (!snapshot) {
    return;
  }
  const currentStateBeforeUndo = clone(state);
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

rulesButton?.addEventListener("click", (event) => {
  event.stopPropagation();
  if (isRulesPanelOpen()) {
    hideRulesPanel();
    rulesButton.focus();
  } else {
    showRulesPanel();
  }
});

rulesPanelBackdrop?.addEventListener("click", () => {
  hideRulesPanel();
  rulesButton?.focus();
});

rulesPanelClose?.addEventListener("click", () => {
  hideRulesPanel();
  rulesButton?.focus();
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || !isRulesPanelOpen()) {
    return;
  }
  hideRulesPanel();
  rulesButton?.focus();
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
    puzzleTrayBootstrapAttempted = false;
    boardGeometryLockedAt = 0;
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
      /* Live room only — stale stored session must not block lobby game switch. */
      if (remoteSession) {
        switchFriendRoomGame(nextGameId).catch((error) => {
          setFriendStatus(error?.message || "Could not change the room game.");
        });
        return;
      }
      switchGame(nextGameId);
      return;
    }
    switchGame(nextGameId);
  });
}

function activatePufflyMode() {
  if (isInviteJoinInProgress()) {
    return;
  }
  const userChosePractice =
    typeof window !== "undefined" && Boolean(window.__pufflyUserChosePufflyMode);
  if (
    !userChosePractice &&
    (shouldBlockPracticeColdBoot() || mustStayOnFriendInviteUi() || mustNeverColdBootPractice())
  ) {
    return;
  }
  stopInviteGuestAttachPoll();
  initDesktopSpeechDefaults();
  if (typeof window !== "undefined") {
    window.__pufflyForceFriendLanding = false;
    window.__pufflyFriendSessionStable = false;
    window.__pufflyPendingInviteJoin = "";
    window.__pufflyUserChosePufflyMode = true;
    window.__pufflyInviteJoinInFlight = false;
    window.__pufflyPendingPlayMode = "puffly";
  }
  clearInvitePageLock();
  clearInviteParamsFromUrl();
  clearPersistedInviteJoinCode();
  clearFriendJoinIntent();
  clearFriendPracticeBlocked();
  try {
    window.sessionStorage?.removeItem(FRIEND_STABLE_SESSION_KEY);
  } catch {
    // Ignore.
  }
  if (typeof window !== "undefined" && typeof window.pufflyApplyPlayModeChrome === "function") {
    window.pufflyApplyPlayModeChrome("puffly");
  }
  abortPracticeInteractionForModeSwitch();
  pauseFriendRoomForPractice();
  if (playMode === "puffly" && !remoteSession) {
    syncPlayModeChrome();
    beginPracticeFlipRound({ force: true, userChosePractice: true });
    ensureAudioContext({ skipSpeechUnlock: true });
    updateSpeechUnlockOverlay();
    return;
  }
  setPlayMode("puffly");
  ensureAudioContext({ skipSpeechUnlock: true });
  updateSpeechUnlockOverlay();
}

function activateFriendMode() {
  if (typeof window !== "undefined") {
    window.__pufflyUserChosePufflyMode = false;
    window.__pufflyPendingPlayMode = "friend";
  }
  const alreadyFriend =
    playMode === "friend" &&
    typeof document !== "undefined" &&
    document.body.classList.contains("friend-mode") &&
    (friendTableUiEnabled()
      ? document.body.classList.contains("practice-table-layout")
      : friendPracticeDomFlattened);
  if (alreadyFriend) {
    markFriendJoinGestureWindow();
    primeSpeechSynthesisFromUserGesture();
    ensureAudioContext({ skipSpeechUnlock: true });
    if (!remoteSession && !readStoredFriendSession() && !getJoinCodeFromUrl()) {
      ensureFriendLobbyVoice({ fromGesture: true });
    }
    refreshFriendRoomPill();
    return;
  }
  markFriendJoinGestureWindow();
  primeSpeechSynthesisFromUserGesture();
  ensureAudioContext({ skipSpeechUnlock: true });
  setPlayMode("friend", { fromUserGesture: true });
}

function installPlayModeTapRouting() {
  const chrome = document.querySelector(".app-chrome");
  if (!chrome || chrome.dataset.playModeRouting === "1") {
    return;
  }
  // Mode buttons use inline onclick → pufflyOnFriendModeTap / pufflyOnPufflyModeTap (Phase 0.2).
  chrome.dataset.playModeRouting = "1";
}

friendControls?.addEventListener(
  "pointerdown",
  () => {
    if (speechNeedsInteractionUnlock && !friendVoiceStartDismissed) {
      updateSpeechUnlockOverlay();
      return;
    }
    friendGestureAudioTick();
  },
  { capture: true },
);

function clearFriendRoomForNewCreate() {
  cancelFriendLobbyAutoplayTimers();
  friendLobbyAutoplayGeneration += 1;
  stopRoomPolling();
  const leaving = remoteSession;
  remoteSession = null;
  speechGesturePrimed = false;
  friendJoinWelcomeSpoken = false;
  friendInviteToPlaySpoken = false;
  pendingFriendInviteToPlayVoice = false;
  friendLobbyPromptSpoken = false;
  pendingFriendLobbyVoice = false;
  friendWelcomeLinesSnapshot = [];
  pendingWelcomeVoiceLines = [];
  friendWelcomeAbortedForPlay = false;
  resetFriendVoiceBus();
  friendInviteShareReady = false;
  friendUndoAvailable = false;
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
  friendInviteShareReady = false;
  friendUndoAvailable = false;
  setFriendStatus("Creating room… contacting server");
  releaseStaleBusyForFriendAction();
  busy = false;
  await unlockFriendAudioForJoin();
  primePufflyVoiceFromGesture({ dismissFriendStart: speechNeedsInteractionUnlock });
  abortFriendLobbyVoice();
  primeSpeechSynthesisFromUserGesture();

  try {
    if (!ensureFriendPlayModeSynced()) {
      setFriendStatus("Tap Play with a Friend above, then try OPEN GAME ROOM again.");
      return;
    }

    if (remoteSession?.roomCode) {
      updateInvitePanel(remoteSession.roomCode);
      setFriendStatus(getFriendStatusText(remoteSession));
      updateFriendRoomButtons();
      announceFriendHostWaitingVoice();
      return;
    }

    clearFriendRoomForNewCreate();

    const createPayload = { gameType: selectedGameId };
    if (selectedGameId === "puzzle") {
      createPayload.puzzleDifficulty = difficulty;
    }
    const data = await apiPost("/api/rooms/create", createPayload, { timeoutMs: 15000 });
    setFriendStatus("Creating room… applying room");
    markFriendJoinGestureWindow();
    await unlockFriendAudioForJoin();
    applyCreateRoomResponse(data);
    if (selectedGameId === "puzzle") {
      syncPuzzleDifficultyFromRemote(state, data.puzzleDifficulty);
    }
    friendInviteShareReady = false;
    updateFriendRoomButtons();
    if (remoteSession) {
      setFriendStatus(getFriendStatusText(remoteSession));
    }
    friendGestureAudioTick();
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

async function leaveFriendRoom() {
  if (busy || playMode !== "friend") {
    return;
  }
  if (!remoteSession) {
    setFriendStatus("No active room to leave.");
    return;
  }
  const roomCode = remoteSession.roomCode;
  const leavingColor = resolveFriendSessionColor(remoteSession) ?? remoteSession.color;
  if (leavingColor === "dark") {
    markFriendHostRoom(roomCode);
  }
  try {
    await apiPost("/api/rooms/leave", {
      roomCode,
      playerId: remoteSession.playerId,
    });
    resetFriendLocalState(
      formatFriendRoomStatusLine(
        { roomCode, playerCount: 1, gameType: remoteSession?.gameType || selectedGameId },
        "Tap JOIN ROOM to come back.",
      ),
      {
        preserveRoomCode: roomCode,
        skipRoomPrefix: true,
      },
    );
  } catch (error) {
    setFriendStatus(error?.message || "Could not leave room.");
  }
}

async function shareFriendInviteFromButton() {
  if (!remoteSession?.roomCode) {
    setFriendStatus("Open a game room first.");
    return;
  }
  noteUserGesture();
  primePufflyVoiceFromGesture();
  await shareInviteLink(remoteSession.roomCode);
}

function closeFriendVoicePillMenu() {
  document.body.classList.remove("friend-voice-pill-open");
  document.getElementById("friend-voice-pill-btn")?.setAttribute("aria-expanded", "false");
  syncFriendSeatBarScroll();
}

function installFriendPillUi() {
  const openBtn = document.getElementById("friend-pill-open-room-btn");
  const inviteBtn = document.getElementById("friend-pill-invite-btn");
  const leaveBtn = document.getElementById("friend-pill-leave-btn");
  const voicePillBtn = document.getElementById("friend-voice-pill-btn");
  const voiceToggleBtn = document.getElementById("friend-voice-toggle-btn");
  const voiceMuteBtn = document.getElementById("friend-voice-mute-btn");

  const wireOnce = (button, handler) => {
    if (!button || button.dataset.friendPillWired === "1") {
      return;
    }
    button.dataset.friendPillWired = "1";
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      noteUserGesture();
      void handler(event);
    });
  };

  wireOnce(openBtn, async () => {
    if (typeof window.pufflyClosePracticePillClusters === "function") {
      window.pufflyClosePracticePillClusters();
    }
    await unlockFriendAudioForJoin();
    primePufflyVoiceFromGesture({ dismissFriendStart: speechNeedsInteractionUnlock });
    await createFriendRoom();
    refreshFriendRoomPill();
  });

  wireOnce(inviteBtn, async () => {
    if (typeof window.pufflyClosePracticePillClusters === "function") {
      window.pufflyClosePracticePillClusters();
    }
    await shareFriendInviteFromButton();
  });

  wireOnce(leaveBtn, async () => {
    if (typeof window.pufflyClosePracticePillClusters === "function") {
      window.pufflyClosePracticePillClusters();
    }
    await leaveFriendRoom();
    refreshFriendRoomPill();
    refreshFriendVoicePill();
  });

  wireOnce(voicePillBtn, () => {
    const open = document.body.classList.toggle("friend-voice-pill-open");
    voicePillBtn?.setAttribute("aria-expanded", open ? "true" : "false");
    syncFriendSeatBarScroll();
  });

  wireOnce(voiceToggleBtn, async () => {
    if (voiceJoined) {
      await leaveVoiceConnection();
    } else {
      await startVoiceConnection();
    }
    closeFriendVoicePillMenu();
    refreshFriendVoicePill();
  });

  wireOnce(voiceMuteBtn, () => {
    if (!voiceJoined) {
      return;
    }
    setVoiceMicMuted(!voiceMicMuted);
  });

  if (!document.documentElement.dataset.friendVoicePillDismissWired) {
    document.documentElement.dataset.friendVoicePillDismissWired = "1";
    document.addEventListener("click", (event) => {
      if (!document.body.classList.contains("friend-voice-pill-open")) {
        return;
      }
      if (event.target?.closest?.("#friend-voice-pill-wrap")) {
        return;
      }
      closeFriendVoicePillMenu();
    });
  }
}

function installFriendActionButtonHandlers() {
  const wire = (button, handler, options = {}) => {
    if (!button || button.dataset.friendActionWired === "1") {
      return;
    }
    button.dataset.friendActionWired = "1";
    const run = (event) => {
      event.preventDefault();
      event.stopPropagation();
      noteUserGesture();
      if (options.shareBeforeAudioUnlock) {
        void handler();
        void unlockFriendAudioForJoin().then(() => {
          primePufflyVoiceFromGesture({ dismissFriendStart: speechNeedsInteractionUnlock });
        });
        return;
      }
      void unlockFriendAudioForJoin().then(() => {
        primePufflyVoiceFromGesture({ dismissFriendStart: speechNeedsInteractionUnlock });
        void handler();
      });
    };
    button.addEventListener("click", run, { capture: true });
  };
  wire(createRoomButton, createFriendRoom);
  wire(friendJoinLeaveButton, async () => {
    if (remoteSession) {
      await leaveFriendRoom();
    } else {
      await joinFriendRoom();
    }
  });
  wire(friendInviteShareButton, shareFriendInviteFromButton, { shareBeforeAudioUnlock: true });
}

installFriendActionButtonHandlers();
installFriendPillUi();

async function joinFriendRoom() {
  const now = Date.now();
  if (now - lastJoinRoomTapAt < 700) {
    return;
  }
  lastJoinRoomTapAt = now;
  const roomCode = (roomCodeInput?.value || "").trim().toUpperCase();
  if (!roomCode) {
    setFriendStatus("Your friend should tap the invite link in Messages — no code needed.");
    return;
  }
  if (isFriendHostRoom(roomCode)) {
    await unlockFriendAudioForJoin();
    primePufflyVoiceFromGesture({ dismissFriendStart: speechNeedsInteractionUnlock });
    if (typeof window !== "undefined" && typeof window.pufflyApplyPlayModeChrome === "function") {
      window.pufflyApplyPlayModeChrome("friend");
    }
    releaseStaleBusyForFriendAction();
    if (!ensureFriendPlayModeSynced()) {
      setFriendStatus("Tap Play with a Friend above, then try again.");
      return;
    }
    setFriendStatus(`Reconnecting to room ${roomCode}...`);
    const joined = await joinRoomWithCode(roomCode, { preferFreshJoin: false });
    if (!joined) {
      render(lastStatusMessage);
    }
    return;
  }
  noteUserGesture();
  redirectToGuestJoinPage(roomCode);
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

function wireFriendVoiceStartTap(button) {
  if (!button || button.dataset.pufflySpeechWired === "1") {
    return;
  }
  button.dataset.pufflySpeechWired = "1";
  const runStart = (event) => {
    event.preventDefault();
    event.stopPropagation();
    noteUserGesture();
    handleSpeechUnlockFromUserGesture();
  };
  button.addEventListener("click", runStart, { capture: true });
}

function installSpeechStartButton() {
  wireFriendVoiceStartTap(document.getElementById("speech-unlock-btn"));
}

function installFriendVoiceStartButton() {
  wireFriendVoiceStartTap(friendVoiceStartButton);
}

function handleSpeechUnlockFromUserGesture(options = {}) {
  const now = Date.now();
  if (now - speechUnlockGestureHandledAt < 500) {
    return;
  }
  speechUnlockGestureHandledAt = now;
  if (playMode === "friend" || isFriendVoiceUiActive()) {
    syncPlayModeForFriendVoice();
    noteUserGesture();
    primePufflyVoiceFromGesture({ dismissFriendStart: true });
    markFriendJoinGestureWindow();
    dismissFriendVoiceStartOverlay();
    if (!remoteSession) {
      if (pendingFriendLobbyVoice || !friendLobbyPromptSpoken) {
        if (playFriendLobbyVoiceNow({ fromGesture: true })) {
          friendLobbyPromptSpoken = true;
        }
      }
      friendGestureAudioTick();
      return;
    }
    if (pendingFriendInviteToPlayVoice) {
      announceFriendInviteToPlayVoice({ fromGesture: true, force: true });
    }
    if (friendGameplayVoiceGatedByWelcome()) {
      tryDrainFriendVoiceBus({ fromGesture: true });
      friendGestureAudioTick();
      return;
    }
    if (isStarterFlipPending()) {
      void announceFriendPreFlipVoiceNow({ fromGesture: true, force: true });
    } else if (friendJoinWelcomeSpoken) {
      syncFriendGameplayVoiceFromRoom({ fromGesture: true });
      tryDrainFriendVoiceBus({ fromGesture: true });
    } else {
      tryDrainFriendVoiceBus({ fromGesture: true });
    }
    friendGestureAudioTick();
    return;
  }
  noteUserGesture();
  speechUnlocked = true;
  speechGesturePrimed = true;
  dismissPracticeVoiceStartOverlay();
  primePufflyVoiceFromGesture();
  deliverPracticeVoiceOnStartTap();
}

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
  window.addEventListener("resize", scheduleBoardGeometryRelayout);
  window.addEventListener("orientationchange", schedulePracticeTableOrientationRelayout);
  window.addEventListener("resize", syncFriendSeatBarScroll);
  window.addEventListener("orientationchange", syncFriendSeatBarScroll);
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", scheduleBoardGeometryRelayout);
  }
  window.addEventListener("pageshow", (event) => {
    lockBoardGeometry(true);
    if (remoteSession?.roomCode) {
      return;
    }
    if (hasReconnectableGuestSession()) {
      playMode = "friend";
      practiceVoiceStartDismissed = true;
      syncPlayModeChrome();
      updateSpeechUnlockOverlay();
      if (!reconnectingStoredFriendSession && !isInviteJoinInProgress()) {
        const stored = readStoredFriendSession();
        void reconnectGuestSessionQuiet(stored.roomCode).then((ok) => {
          if (ok) {
            render(getFriendStatusText(remoteSession));
          }
        });
      }
      return;
    }
    const inviteCode =
      readInviteParamsFromUrl().join ||
      getInvitePageLockCode() ||
      readFriendJoinIntent()?.roomCode ||
      "";
    if (inviteCode && !isFriendHostRoom(inviteCode) && event.persisted) {
      const dest = new URL("./guest-join.html", window.location.href);
      dest.searchParams.set("room", inviteCode);
      window.location.replace(dest.toString());
      return;
    }
    if (
      !event.persisted ||
      shouldUseFriendLanding() ||
      shouldBlockPracticeColdBoot() ||
      readStoredFriendSession() ||
      readFriendJoinIntent()?.roomCode
    ) {
      return;
    }
    prepareFreshAppLoad();
    if (playMode === "friend" && remoteSession) {
      resetFriendLocalState("Fresh game loaded. Tap OPEN GAME ROOM to start a room.");
      render(lastStatusMessage);
    } else if (playMode === "puffly" && !isFriendInviteLandingLocked()) {
      resetLocalGameState(selectedGameId);
      render("Flip to see who goes first.");
    }
  });
}

function releaseBootstrapLocks() {
  busy = false;
  deferRoomSyncUntilIdle = false;
  applyingRemoteSync = false;
}

function bootstrapInitialRender(statusMessage) {
  releaseBootstrapLocks();
  try {
    render(statusMessage);
  } catch (error) {
    console.error("[bootstrap] initial render failed", error);
    if (pufflyThought) {
      pufflyThought.textContent = "⚠️ Reload the page to continue.";
    }
  }
}

function isGuestAttachedBoot() {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    if (new URLSearchParams(window.location.search).get("friendAttached") === "1") {
      return true;
    }
    return window.sessionStorage?.getItem(GUEST_ATTACHED_FLAG_KEY) === "1";
  } catch {
    return false;
  }
}

function readGuestHydratePayload() {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.sessionStorage?.getItem(GUEST_HYDRATE_PAYLOAD_KEY);
    if (!raw) {
      return null;
    }
    window.sessionStorage.removeItem(GUEST_HYDRATE_PAYLOAD_KEY);
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function clearGuestAttachedBootFlags() {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.sessionStorage?.removeItem(GUEST_ATTACHED_FLAG_KEY);
  } catch {
    // Ignore.
  }
  clearInvitePageLock();
  clearFriendJoinIntent();
  clearPersistedInviteJoinCode();
  window.__pufflyPendingInviteJoin = "";
  window.__pufflyForceFriendLanding = false;
  window.__pufflyInviteJoinInFlight = false;
}

function clearGuestAttachedUrlParams() {
  if (typeof window === "undefined" || !window.history?.replaceState) {
    return;
  }
  const url = new URL(window.location.href);
  if (!url.searchParams.has("friendAttached")) {
    return;
  }
  url.searchParams.delete("friendAttached");
  window.history.replaceState({}, "", `${url.pathname}${url.search}`);
}

function hasReconnectableGuestSession() {
  const stored = readStoredFriendSession();
  return Boolean(
    stored?.roomCode &&
      stored?.playerId &&
      !isFriendHostRoom(stored.roomCode),
  );
}

function redirectGuestInviteToJoinPage() {
  if (typeof window === "undefined" || isGuestAttachedBoot()) {
    return false;
  }
  if (remoteSession?.roomCode || hasReconnectableGuestSession()) {
    return false;
  }
  const join =
    readInviteParamsFromUrl().join ||
    getInvitePageLockCode() ||
    readFriendJoinIntent()?.roomCode ||
    "";
  if (!/^[A-Z0-9]{4,8}$/.test(join) || isFriendHostRoom(join)) {
    return false;
  }
  const dest = new URL("./guest-join.html", window.location.href);
  dest.searchParams.set("room", join);
  const invite = readInviteParamsFromUrl();
  if (invite.game) {
    dest.searchParams.set("game", invite.game);
  }
  if (invite.puzzleSize) {
    dest.searchParams.set("puzzleSize", invite.puzzleSize);
  }
  window.location.replace(dest.toString());
  return true;
}

async function reconnectGuestSessionQuiet(roomCode) {
  const normalizedCode = String(roomCode || "")
    .trim()
    .toUpperCase();
  if (!/^[A-Z0-9]{4,8}$/.test(normalizedCode)) {
    return false;
  }
  const stored = readStoredFriendSession();
  if (stored?.roomCode === normalizedCode && stored?.playerId) {
    try {
      const data = await apiPost(
        "/api/rooms/reconnect",
        { roomCode: normalizedCode, playerId: stored.playerId },
        { noAbort: true, timeoutMs: 0 },
      );
      if (await attachInviteGuestFromServerPayload(data, normalizedCode)) {
        return true;
      }
    } catch {
      // Try reclaim next.
    }
  }
  try {
    const data = await apiPost(
      "/api/rooms/reclaim-guest",
      { roomCode: normalizedCode },
      { noAbort: true, timeoutMs: 0 },
    );
    return attachInviteGuestFromServerPayload(data, normalizedCode);
  } catch {
    return false;
  }
}

function installEssentialBootstrap() {
  installSpeechStartButton();
  installFriendVoiceStartButton();
  initDesktopSpeechDefaults();
  installPlayModeTapRouting();
  installFriendActionButtonHandlers();
  installGlobalVoicePrime();
  updateChatMuteButton();
  mountVoiceDebugHud();
}

async function bootstrapGuestAttachedSession() {
  const payload = readGuestHydratePayload();
  clearGuestAttachedBootFlags();
  clearGuestAttachedUrlParams();
  stopInviteGuestAttachPoll();
  if (typeof window !== "undefined") {
    window.__pufflyGuestAttachInProgress = true;
  }
  installEssentialBootstrap();
  playMode = "friend";
  practiceVoiceStartDismissed = true;
  window.__pufflyUserChosePufflyMode = false;
  window.__pufflyPendingPlayMode = "friend";
  syncPlayModeChrome();
  setFriendStatus(`Opening your game… · v${CLIENT_BUILD}`);
  try {
    if (payload?.roomCode && payload?.playerId) {
      writeStoredFriendSessionFromJoinPayload(payload, payload.roomCode);
      if (
        hydrateRoomSession(payload, {
          announceJoinVoice: false,
          deferVoicePreload: true,
          deferGameplayVoice: true,
          statusMessage: "Friend room connected.",
        })
      ) {
        announceFriendGuestWelcome(playerDisplayName(remoteSession.color).toUpperCase());
        if (speechNeedsInteractionUnlock) {
          friendVoiceStartDismissed = false;
        }
        void warmFriendSessionVoiceClips();
        bootstrapInitialRender(getFriendStatusText(remoteSession));
        updateSpeechUnlockOverlay();
        return true;
      }
    }
    const stored = readStoredFriendSession();
    if (stored?.roomCode && stored?.playerId) {
      setFriendStatus(`Connecting to room ${stored.roomCode}… · v${CLIENT_BUILD}`);
      if (await reconnectGuestSessionQuiet(stored.roomCode)) {
        announceFriendGuestWelcome(playerDisplayName(remoteSession.color).toUpperCase());
        if (speechNeedsInteractionUnlock) {
          friendVoiceStartDismissed = false;
        }
        void warmFriendSessionVoiceClips();
        bootstrapInitialRender(getFriendStatusText(remoteSession));
        updateSpeechUnlockOverlay();
        return true;
      }
    }
    setFriendStatus("Could not open your friend game. Tap JOIN ROOM or ask for a new invite.");
    bootstrapInitialRender("Friend mode: connect to a room.");
    return false;
  } finally {
    if (typeof window !== "undefined") {
      window.__pufflyGuestAttachInProgress = false;
    }
  }
}

function bootstrapApp() {
  releaseBootstrapLocks();
  bootstrapInviteLinkOriginFromUrl();
  forceClearInviteStateForPracticeTestPwa();
  initPwaInstallHint();
  const plainPracticeLanding = isPlainPracticeLanding();
  if (plainPracticeLanding) {
    syncInviteLandingOnBootstrap();
    playMode = "puffly";
    if (typeof window !== "undefined") {
      window.__pufflyPendingPlayMode = "";
      window.__pufflyUserChosePufflyMode = true;
      window.__pufflyPendingInviteJoin = "";
      window.__pufflyForceFriendLanding = false;
    }
  } else if (
    typeof window !== "undefined" &&
    (window.__pufflyPendingPlayMode === "friend" || isInvitePageLocked())
  ) {
    playMode = "friend";
  }
  syncEarlyFriendLobbyPlayback();
  if (redirectGuestInviteToJoinPage()) {
    return;
  }
  if (isGuestAttachedBoot()) {
    updateSpeechUnlockOverlay();
    void bootstrapGuestAttachedSession();
    return;
  }
  const storedGuestEarly = readStoredFriendSession();
  if (
    !plainPracticeLanding &&
    storedGuestEarly?.roomCode &&
    storedGuestEarly?.playerId &&
    !remoteSession &&
    !isFriendHostRoom(storedGuestEarly.roomCode)
  ) {
    installEssentialBootstrap();
    playMode = "friend";
    practiceVoiceStartDismissed = true;
    syncPlayModeChrome();
    updateSpeechUnlockOverlay();
    bootstrapInitialRender(`Reconnecting to room ${storedGuestEarly.roomCode}… · v${CLIENT_BUILD}`);
    void reconnectGuestSessionQuiet(storedGuestEarly.roomCode).then((ok) => {
      if (ok) {
        bootstrapInitialRender(getFriendStatusText(remoteSession));
      }
    });
    return;
  }
  if (!plainPracticeLanding && isInvitePageLocked()) {
    playMode = "friend";
    practiceVoiceStartDismissed = true;
    const lockedCode = getInvitePageLockCode();
    if (lockedCode) {
      lockFriendInviteLanding(lockedCode);
    }
  }
  if (!plainPracticeLanding) {
    syncInviteLandingOnBootstrap();
  }
  installSpeechStartButton();
  installFriendVoiceStartButton();
  initDesktopSpeechDefaults();
  if (typeof window !== "undefined" && window.__pufflyInlineSpeechPrimed) {
    primePufflyVoiceFromGesture({ dismissFriendStart: false });
  }
  if (typeof window !== "undefined" && window.__pufflyPracticeVoiceStartDismissed) {
    practiceVoiceStartDismissed = true;
  }
  if (shouldDeferHeavyVoicePreload()) {
    preloadVoiceClips({ minimal: true });
  } else {
    preloadVoiceClips();
  }
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
  mountVoiceDebugHud();
  renderRoomChat(true);
  if (playMode === "friend" && !shouldSkipFriendLobbyVoice()) {
    const clipId = resolveVoiceClipId(FRIEND_LOBBY_VOICE_PHRASE);
    if (clipId) {
      preloadVoiceClips({ clipIds: [clipId] });
    }
    syncEarlyFriendLobbyPlayback();
    bootFriendLobbyVoiceIfNeeded();
  }
  const storedFriend = readStoredFriendSession();
  if (
    !plainPracticeLanding &&
    storedFriend?.roomCode &&
    storedFriend?.playerId &&
    !remoteSession &&
    shouldAutoReconnectStoredFriendOnBoot()
  ) {
    playMode = "friend";
    practiceVoiceStartDismissed = true;
    lockFriendInviteLanding(storedFriend.roomCode);
    syncPlayModeChrome();
    bootstrapInitialRender(`Reconnecting to room ${storedFriend.roomCode}...`);
    void tryReconnectStoredFriendSession({ force: true }).then((ok) => {
      if (!ok && storedFriend.roomCode && !isFriendHostRoom(storedFriend.roomCode)) {
        void reconnectGuestSessionQuiet(storedFriend.roomCode);
      }
    });
    return;
  }
  const staleGuestInviteCode =
    readFriendJoinIntent()?.roomCode ||
    getInvitePageLockCode() ||
    getInviteJoinCodeForBootstrap();
  if (
    !plainPracticeLanding &&
    staleGuestInviteCode &&
    !remoteSession &&
    !hasReconnectableGuestSession() &&
    !isFriendHostRoom(staleGuestInviteCode)
  ) {
    redirectGuestInviteToJoinPage();
    return;
  }
  if (!plainPracticeLanding && isActiveInviteBootstrap()) {
    primeInviteLandingFlags();
    applyInviteLandingConfig();
    updateGameButtons();
    updateDifficultyButtonLabels();
    updateFriendDifficultyButtons();
    updateAppTitle();
    enterFriendLobbyChrome();
    bootstrapInitialRender("Friend mode: connect to a room.");
    ensureFriendLobbyVoice();
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
    !plainPracticeLanding &&
    typeof window !== "undefined" &&
    window.__pufflyPendingPlayMode === "friend" &&
    (!window.__pufflyUserChosePufflyMode || hasInviteLandingIntent());
  if (pendingFriend) {
    setPlayMode("friend");
    bootstrapInitialRender("Friend mode: connect to a room.");
    ensureFriendLobbyVoice();
    flushPendingPlayModeTap();
    return;
  }
  if (!plainPracticeLanding && (mustStayOnFriendInviteUi() || mustNeverColdBootPractice())) {
    if (redirectGuestInviteToJoinPage()) {
      return;
    }
    playMode = "friend";
    practiceVoiceStartDismissed = true;
    syncPlayModeChrome();
    enterFriendLobbyChrome();
    bootstrapInitialRender("Friend mode: connect to a room.");
    ensureFriendLobbyVoice();
    return;
  }
  playMode = "puffly";
  syncPlayModeChrome();
  installPrimePracticeSpeechOnFirstGesture();
  updateSpeechUnlockOverlay();
  beginPracticeFlipRound({
    coldBoot: true,
    userChosePractice: isPracticeTableTestPwaBoot(),
  });
  if (isPracticeTableTestPwaBoot() && isStarterFlipPending() && boardElement && boardElement.children.length === 0) {
    bootstrapInitialRender("Flip to see who goes first.");
  }
  flushPendingPlayModeTap();
  schedulePracticeTableRelayoutIfNeeded();
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
    if (!remoteSession && playMode !== "friend") {
      activateFriendMode();
    } else if (!remoteSession) {
      updateTeamMascot();
      updateSpeechUnlockOverlay();
    } else {
      syncPlayModeChrome();
      updateTeamMascot();
      updateSpeechUnlockOverlay();
    }
  } else if (pendingMode === "puffly") {
    if (shouldBlockPracticeColdBoot() || isInviteJoinInProgress() || mustNeverColdBootPractice()) {
      return;
    }
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
    hydrateRoomSession(payload);
    updateSpeechUnlockOverlay();
  }
}

if (typeof window !== "undefined") {
  window.pufflyActivateFriendMode = activateFriendMode;
  window.pufflyActivatePufflyMode = activatePufflyMode;
  window.pufflyRefreshFriendRoomPill = refreshFriendRoomPill;
  window.pufflySyncFriendPuzzleSizePanel = syncFriendPuzzleSizePanelOnOpen;
  window.pufflyUpdateFriendDifficultyButtons = updateFriendDifficultyButtons;
  window.pufflyRefreshFriendVoicePill = refreshFriendVoicePill;
  window.pufflyRefreshFriendAvatarBand = refreshFriendAvatarBand;
  window.pufflyCreateFriendRoom = createFriendRoom;
  window.pufflyCreateRoomNow = createFriendRoom;
  window.pufflyJoinFriendRoom = joinFriendRoom;
  window.pufflyLeaveFriendRoom = leaveFriendRoom;
  window.pufflyShareFriendInvite = shareFriendInviteFromButton;
  window.pufflyHydrateFriendRoom = (data) => hydrateRoomSession(data);
  window.pufflyEnsureFriendMode = ensureFriendPlayModeSynced;
  window.pufflyTryInviteJoinFromUrl = maybeAutoJoinFromInviteLink;
  window.pufflySpeechStartTap = handleSpeechUnlockFromUserGesture;
  window.pufflyRefreshSpeechUnlockOverlay = updateSpeechUnlockOverlay;
  window.pufflyUpdatePracticeTableChrome = updatePracticeTableChrome;
  window.pufflyRelayoutTableBoard = () => {
    schedulePracticeTableRelayoutIfNeeded();
  };
  window.pufflySchedulePracticeTableOrientationRelayout = schedulePracticeTableOrientationRelayout;
  window.pufflyResetPracticeTableOrientationLayoutState = resetPracticeTableOrientationLayoutState;
  window.pufflyClearPracticeTableOrientationLayoutState = clearPracticeTableOrientationLayoutState;
  window.pufflySyncPracticeTableFrameInsets = practiceTableSyncFrameInsets;
  window.pufflySyncPracticeTableLayoutVars = syncPracticeTableLayoutVarsFromDom;
  window.pufflyPrimeVoice = primePufflyVoiceFromGesture;
  window.pufflyPrimeVoiceForRoomAction = () =>
    primePufflyVoiceFromGesture({ dismissFriendStart: speechNeedsInteractionUnlock });
  window.pufflyAnnounceFriendLobby = () => ensureFriendLobbyVoice({ fromGesture: true });
  window.pufflyBootFriendLobbyVoice = () => bootFriendLobbyVoiceIfNeeded({ fromGesture: true });
  window.pufflyPlayConnectedChime = playFriendConnectedChime;
  window.pufflyPlayVoiceClip = (clipId) => playVoiceClip(clipId);
  window.pufflyPlayConnectedFromTap = playConnectedFromTap;
  window.pufflySpeechBuild = SPEECH_BUILD;
  window.pufflyClientBuild = CLIENT_BUILD;
  window.pufflyDebugMiniLandscapeCenter = () => {
    const cap = document.querySelector("#game-board-matrix .board-and-captures");
    const board = boardElement;
    const scene = document.getElementById("practice-table-scene");
    const cluster = document.getElementById("practice-play-cluster");
    const seatRow = document.getElementById("player-seat-row");
    const torso = document.querySelector("#puffly-torso-layer .puffly-skeleton-torso");
    const cx = (el) => {
      const rect = el?.getBoundingClientRect();
      return rect ? rect.left + rect.width / 2 : null;
    };
    const capRect = cap?.getBoundingClientRect();
    const sceneRect = scene?.getBoundingClientRect();
    return {
      active: practiceTablePuzzleMiniLandscapeGroupCenterActive(),
      shiftVar: cluster?.style.getPropertyValue("--practice-mini-group-shift-x") || "",
      computedShift: cluster
        ? getComputedStyle(cluster).getPropertyValue("--practice-mini-group-shift-x").trim()
        : "",
      gapShift: cap && scene ? practiceTableMiniLandscapeGroupShiftPx(cap, scene, board) : 0,
      leftGap:
        capRect && sceneRect ? Math.round(capRect.left - sceneRect.left) : null,
      rightGap:
        capRect && sceneRect ? Math.round(sceneRect.right - capRect.right) : null,
      deltaSceneVsBoard:
        scene && board ? Math.round(cx(scene) - cx(board)) : null,
      deltaSeatVsBoard:
        seatRow && board ? Math.round(cx(seatRow) - cx(board)) : null,
      pufflyShiftX: getComputedStyle(document.getElementById("puffly-dealer-unit") || document.body)
        .getPropertyValue("--practice-puffly-shift-x")
        .trim(),
      torsoCenterX: cx(torso),
      boardCenterX: cx(board),
    };
  };
  window.pufflyGetInviteLinkOrigin = getInviteLinkOrigin;
  window.pufflyFriendYourTurn = () => isFriendYourTurnNow();
  window.pufflyVoiceDebugDump = pufflyVoiceDebugDump;
  window.pufflyVoiceDebugEnabled = isVoiceDebugEnabled;
  window.pufflyVoiceSnapshot = voiceDebugFriendState;
  window.pufflyVoiceDebugOn = () => {
    try {
      window.localStorage?.setItem("puffly.voiceDebug", "1");
    } catch {
      // ignore
    }
    voiceDebugEnabled = true;
    mountVoiceDebugHud();
    voiceDebugLog("debug_on_manual");
  };
  window.pufflyVoiceDebugOff = () => {
    try {
      window.localStorage?.removeItem("puffly.voiceDebug");
    } catch {
      // ignore
    }
    voiceDebugEnabled = false;
    voiceDebugHudEl?.remove();
    voiceDebugHudEl = null;
  };
}

function showBootstrapFailure(error) {
  console.error("[puffly] bootstrap failed", error);
  const message = error?.message || String(error);
  const banner = document.createElement("div");
  banner.setAttribute("role", "alert");
  banner.style.cssText =
    "position:fixed;inset:12px auto auto 12px;right:12px;z-index:99999;padding:12px 14px;border-radius:10px;background:#3b1010;color:#fff;font:14px/1.4 system-ui,sans-serif;";
  banner.textContent = `Puffly could not start (${message}). Hard-refresh with ?cb=${CLIENT_BUILD} or clear cache.`;
  document.body.appendChild(banner);
}

try {
  bootstrapApp();
} catch (error) {
  showBootstrapFailure(error);
}
