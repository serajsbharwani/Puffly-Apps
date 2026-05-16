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
const friendLockOverlay = document.getElementById("friend-lock-overlay");
const restartButton = document.getElementById("restart-btn");
const undoButton = document.getElementById("undo-btn");
const rulesButton = document.getElementById("rules-btn");
const difficultySelect = document.getElementById("difficulty-select");
const audioSelect = document.getElementById("audio-select");
const pufflyControls = document.getElementById("puffly-controls");
const friendControls = document.getElementById("friend-controls");
const createRoomButton = document.getElementById("create-room-btn");
const joinRoomButton = document.getElementById("join-room-btn");
const copyRoomButton = document.getElementById("copy-room-btn");
const leaveRoomButton = document.getElementById("leave-room-btn");
const roomCodeInput = document.getElementById("room-code-input");
const friendStatusLabel = document.getElementById("friend-status");
const historyList = document.getElementById("history-list");
const rulesPanel = document.getElementById("rules-panel");
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
const AUTO_JOIN_ROOM_CODE = getJoinCodeFromUrl();
let pendingPrioritySpeech = "";
let pendingJoinIntroTeam = "";
const speechNeedsInteractionUnlock = detectIOSLikeBrowser();
let speechUnlocked = !speechNeedsInteractionUnlock;
let pendingUnlockSpeech = "";

function key(row, col) {
  return `${row},${col}`;
}

function clone(data) {
  return JSON.parse(JSON.stringify(data));
}

function detectIOSLikeBrowser() {
  if (typeof navigator === "undefined") {
    return false;
  }
  const ua = navigator.userAgent || "";
  const isiOSDevice = /iPad|iPhone|iPod/i.test(ua);
  const iPadDesktopUA = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return isiOSDevice || iPadDesktopUA;
}

function getJoinCodeFromUrl() {
  if (typeof window === "undefined") {
    return "";
  }
  const params = new URLSearchParams(window.location.search);
  const raw = (params.get("join") || "").trim().toUpperCase();
  if (!/^[A-Z0-9]{4,8}$/.test(raw)) {
    return "";
  }
  return raw;
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
  const padTop = Number.parseFloat(computed.paddingTop) || 0;
  const padBottom = Number.parseFloat(computed.paddingBottom) || 0;
  const bodyComputed = window.getComputedStyle(document.body);
  const bodyBottomPadding = Number.parseFloat(bodyComputed.paddingBottom) || 0;
  const iPadFriendInset =
    playMode === "friend" && window.innerWidth >= 768
      ? 96
      : 0;
  const innerContentWidth = Math.max(0, wrap.clientWidth - padLeft - padRight - iPadFriendInset);
  const wrapRect = wrap.getBoundingClientRect();
  const remainingViewportHeight = Math.max(0, window.innerHeight - wrapRect.top - bodyBottomPadding - 8);
  const innerContentHeight = Math.max(0, remainingViewportHeight - padTop - padBottom);
  const usable = Math.floor(Math.min(innerContentWidth, innerContentHeight));
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

function playerDisplayName(color) {
  if (color === "dark") {
    return "Blue";
  }
  if (color === "light") {
    return "Green";
  }
  return "Unknown";
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

function unlockSpeechIfNeeded() {
  if (speechUnlocked) {
    return;
  }
  speechUnlocked = true;
  if (pendingJoinIntroTeam) {
    pendingPrioritySpeech = buildJoinIntroPhrase(pendingJoinIntroTeam);
  }
  const queued = pendingPrioritySpeech || pendingUnlockSpeech;
  pendingUnlockSpeech = "";
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
    window.speechSynthesis.resume();
  }
  if (queued) {
    lastSpokenAt = 0;
    lastSpokenPhrase = "";
    pendingPrioritySpeech = "";
    pendingJoinIntroTeam = "";
    speak(queued);
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
  speechUnlockOverlay?.classList.add("hidden");
}

function speak(text) {
  if (!audioEnabled || typeof window === "undefined" || !window.speechSynthesis) {
    return;
  }
  if (!speechUnlocked) {
    if (!pendingUnlockSpeech || pendingPrioritySpeech === text) {
      pendingUnlockSpeech = text;
    }
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
  utterance.onstart = () => {
    if (pendingPrioritySpeech === text) {
      pendingPrioritySpeech = "";
    }
  };
  utterance.onend = null;
  utterance.onerror = null;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

function flushPendingPrioritySpeech() {
  if (!pendingPrioritySpeech || !speechUnlocked) {
    return;
  }
  const text = pendingPrioritySpeech;
  pendingPrioritySpeech = "";
  lastSpokenAt = 0;
  lastSpokenPhrase = "";
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  speak(text);
}

function speakPhrase(text) {
  if (!text || text === lastSpokenPhrase) {
    return;
  }
  lastSpokenPhrase = text;
  speak(text);
}

function speakPhraseReliable(text) {
  if (!text) {
    return;
  }
  pendingPrioritySpeech = text;
  speakPhrase(text);
}

function buildJoinIntroPhrase(teamName) {
  if (playMode === "friend" && remoteSession?.ready && state?.currentPlayer) {
    const activeTeam = playerDisplayName(state.currentPlayer).toUpperCase();
    return `You are connected. Welcome to the game room. You are the ${teamName} team. It's ${activeTeam}'s turn.`;
  }
  return `You are connected. Welcome to the game room. You are the ${teamName} team.`;
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
    phrase = "Choose one of the highlighted squares.";
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
  if (playMode === "friend") {
    speakPhrase(`${playerDisplayName(state.winner).toUpperCase()} WINS`);
  } else {
    speakPhrase(state.winner === humanPlayer ? "You win." : "Puffly wins.");
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

function setFriendStatus(text) {
  if (friendStatusLabel) {
    friendStatusLabel.textContent = text;
  }
}

function clearJoinCodeFromUrl() {
  if (typeof window === "undefined" || !window.history?.replaceState) {
    return;
  }
  const url = new URL(window.location.href);
  if (!url.searchParams.has("join")) {
    return;
  }
  url.searchParams.delete("join");
  const trimmed = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState({}, "", trimmed);
}

function buildInviteLink(roomCode) {
  if (typeof window === "undefined") {
    return roomCode;
  }
  const url = new URL(window.location.href);
  url.searchParams.set("join", roomCode);
  return url.toString();
}

async function shareInviteLink(roomCode) {
  const inviteUrl = buildInviteLink(roomCode);
  const shareText = `Join my Puffly Checkers room (${roomCode}).`;
  if (navigator.share) {
    try {
      await navigator.share({
        title: "Puffly Checkers Invite",
        text: shareText,
        url: inviteUrl,
      });
      setFriendStatus("Invite sent.");
      return;
    } catch (error) {
      if (error?.name === "AbortError") {
        setFriendStatus("Invite canceled.");
        return;
      }
    }
  }
  try {
    await navigator.clipboard.writeText(inviteUrl);
    setFriendStatus("Invite link copied. Send it to your friend.");
  } catch {
    setFriendStatus(`Share this invite link: ${inviteUrl}`);
  }
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
  const shouldShow = playMode === "friend" && speechNeedsInteractionUnlock && !speechUnlocked;
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
  if (playMode === "friend") {
    ruleLine1.classList.add("hidden");
    const myColor = remoteSession?.color ? playerDisplayName(remoteSession.color).toUpperCase() : "assigned after joining";
    ruleLine2.textContent =
      remoteSession?.color
        ? `You are the ${myColor} team.`
        : `Your team color will be ${myColor}.`;
  } else {
    ruleLine1.classList.remove("hidden");
    ruleLine1.textContent = "Blue Puffly Team is computer controlled.";
    ruleLine2.textContent = "Green Frog Team is your side.";
  }
  ruleLine3.textContent = "Jumps are required when available.";
  ruleLine4.textContent = "Kinging adds a cap or crown accessory.";
}

function getFriendStatusText(session) {
  if (!session) {
    return "Choose Create Room or Join Room.";
  }
  const count = session.playerCount ?? 1;
  const base = `Connected players: ${count}/2 · Room ${session.roomCode}`;
  if (!session.ready) {
    return `${base}. Waiting for opponent...`;
  }
  return `${base}. You are ${playerDisplayName(session.color).toUpperCase()}.`;
}

function stopRoomPolling() {
  if (roomPollTimer) {
    window.clearInterval(roomPollTimer);
    roomPollTimer = null;
  }
}

function resetSessionForModeSwitch() {
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
  if (roomCodeInput) {
    roomCodeInput.value = "";
  }
}

function resetFriendLocalState(message = "Choose Create Room or Join Room.") {
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
  roomChatMessages = [];
  setChatUnreadCount(0);
  state = createInitialState();
  moveHistory = [];
  undoSnapshots = [];
  winnerAnnounced = null;
  hideCelebration();
  if (roomCodeInput) {
    roomCodeInput.value = "";
  }
  setFriendStatus(message);
  updateRulesForMode();
  renderRoomChat(true);
  render("Friend mode: connect to a room.");
}

async function apiPost(path, payload) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }
  return data;
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

async function syncRoomState() {
  if (!remoteSession) {
    return;
  }
  const oldVersion = remoteSession.version;
  const oldReady = remoteSession.ready;
  const oldCount = remoteSession.playerCount;
  const params = new URLSearchParams({ roomCode: remoteSession.roomCode });
  const response = await fetch(`/api/rooms/state?${params.toString()}`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Unable to read room state.");
  }
  if (typeof data.version === "number") {
    remoteSession.version = data.version;
  }
  if (typeof data.playerCount === "number") {
    remoteSession.playerCount = data.playerCount;
    remoteSession.ready = data.playerCount >= 2;
    setFriendStatus(getFriendStatusText(remoteSession));
  }
  if (data.voiceParticipants && voiceJoined) {
    const bothVoiceReady = data.voiceParticipants.dark && data.voiceParticipants.light;
    if (!bothVoiceReady) {
      setVoiceStatus("Waiting for friend voice...");
    }
  }
  syncRoomChatFromPayload(data);
  const didVersionChange = typeof data.version === "number" && data.version !== oldVersion;
  const didReadyChange =
    remoteSession.ready !== oldReady || remoteSession.playerCount !== oldCount;
  if (data.state && (didVersionChange || didReadyChange)) {
    state = data.state;
    const message = remoteSession.ready
      ? didVersionChange
        ? "Room synchronized."
        : "Opponent connected."
      : "Waiting for opponent...";
    render(message);
  }
}

function startRoomPolling() {
  stopRoomPolling();
  roomPollTimer = window.setInterval(() => {
    if (!remoteSession || busy) {
      return;
    }
    syncRoomState().catch(() => {});
  }, 900);
}

function hydrateRoomSession(data) {
  remoteSession = {
    roomCode: data.roomCode,
    playerId: data.playerId,
    color: data.color,
    version: data.version,
    playerCount: data.playerCount ?? 1,
    ready: (data.playerCount ?? 1) >= 2,
  };
  state = data.state;
  moveHistory = [];
  undoSnapshots = [];
  winnerAnnounced = null;
  hideCelebration();
  if (roomCodeInput) {
    roomCodeInput.value = data.roomCode;
  }
  setFriendStatus(getFriendStatusText(remoteSession));
  updateRulesForMode();
  syncRoomChatFromPayload(data, true);
  setChatUnreadCount(0);
  const teamName = playerDisplayName(data.color).toUpperCase();
  pendingJoinIntroTeam = teamName;
  const joinIntroPhrase = buildJoinIntroPhrase(teamName);
  speakPhraseReliable(joinIntroPhrase);
  if (remoteSession.ready && state?.currentPlayer) {
    const openingTurnPhrase = `${playerDisplayName(state.currentPlayer).toUpperCase()}'S TURN`;
    // Prevent immediate duplicate turn announcement on the same render cycle.
    lastTurnSpoken = openingTurnPhrase;
  } else {
    lastTurnSpoken = "Welcome to the game room.";
  }
  startRoomPolling();
  if (speechNeedsInteractionUnlock && !speechUnlocked) {
    setFriendStatus("Tap Start to enable voice on this iPad.");
  }
  render("Remote room connected.");
}

async function joinRoomWithCode(roomCode, options = {}) {
  const normalizedCode = String(roomCode || "").trim().toUpperCase();
  const fromInvite = Boolean(options.fromInvite);
  if (!normalizedCode) {
    setFriendStatus("Enter a room code first.");
    return false;
  }
  if (remoteSession) {
    setFriendStatus(
      `Already connected to room ${remoteSession.roomCode} as ${playerDisplayName(remoteSession.color).toUpperCase()}. Use the second device to join.`,
    );
    return false;
  }
  try {
    const data = await apiPost("/api/rooms/join", { roomCode: normalizedCode });
    hydrateRoomSession(data);
    if (fromInvite) {
      clearJoinCodeFromUrl();
    }
    return true;
  } catch (error) {
    setFriendStatus(
      fromInvite
        ? error?.message || "Invite link could not join this room."
        : error?.message || "Could not join room.",
    );
    return false;
  }
}

function setPlayMode(mode) {
  playMode = mode;
  document.body.classList.toggle("friend-mode", mode === "friend");
  playPufflyButton?.classList.toggle("active", mode === "puffly");
  playFriendButton?.classList.toggle("active", mode === "friend");
  pufflyControls?.classList.toggle("hidden", mode !== "puffly");
  friendControls?.classList.toggle("hidden", mode !== "friend");
  friendChatPanel?.classList.toggle("hidden", mode !== "friend");
  if (mode !== "friend") {
    setVoiceStatus("Voice not connected.");
  } else {
    setVoiceStatus("Voice not connected.");
    if (speechNeedsInteractionUnlock && !speechUnlocked) {
      setFriendStatus("Tap Start to enable voice on this iPad.");
    }
  }
  updateVoiceButtons();
  updateSpeechUnlockOverlay();
  hideRulesPanel();
  resetSessionForModeSwitch();
  state = createInitialState();
  winnerAnnounced = null;
  lastSpokenPhrase = "";
  lastTurnSpoken = "";
  hideCelebration();
  if (mode === "friend") {
    moveHistory = [];
    undoSnapshots = [];
    roomChatMessages = [];
    setChatUnreadCount(0);
    setFriendStatus(
      speechNeedsInteractionUnlock && !speechUnlocked
        ? "Tap Start to enable voice on this iPad."
        : "Choose Create Room or Join Room.",
    );
    updateRulesForMode();
    renderRoomChat(true);
    render("Friend mode: connect to a room.");
    return;
  }
  moveHistory = [];
  undoSnapshots = [];
  roomChatMessages = [];
  setChatUnreadCount(0);
  renderRoomChat(true);
  updateRulesForMode();
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
  undoButton.disabled = busy || undoSnapshots.length === 0 || playMode === "friend";
  rulesButton.disabled = busy;
  difficultySelect.disabled = busy || playMode !== "puffly";
  audioSelect.disabled = busy;
  const shouldShowFriendLock = playMode === "friend" && (!remoteSession || !remoteSession.ready);
  friendLockOverlay?.classList.toggle("hidden", !shouldShowFriendLock);
  if (friendLockText && shouldShowFriendLock) {
    friendLockText.textContent = remoteSession ? "Waiting for your friend to join..." : "Waiting for the players...";
  }

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
  let currentTurnPhrase;
  if (playMode === "friend" && remoteSession) {
    if (!remoteSession.ready) {
      currentTurnPhrase = "Welcome to the game room.";
    } else {
      const activeColor = playerDisplayName(state.currentPlayer).toUpperCase();
      currentTurnPhrase = `${activeColor}'S TURN`;
    }
  } else if (playMode === "friend") {
    currentTurnPhrase = "Welcome to the game room.";
  } else {
    currentTurnPhrase =
      state.currentPlayer === humanPlayer ? "Your turn." : playMode === "puffly" ? "Puffly's turn." : "Friend turn.";
  }
  if (lastTurnSpoken !== currentTurnPhrase) {
    lastTurnSpoken = currentTurnPhrase;
    speakPhrase(currentTurnPhrase);
  }
  if (playMode === "friend") {
    if (!remoteSession) {
      setPufflyState("idle", "🤝 Friend mode");
    } else if (!remoteSession.ready) {
      setPufflyState("thinking", "⏳ Waiting...");
    } else {
      setPufflyState("idle", "🤝 Friend mode");
    }
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

async function submitRemoteMove(nextState) {
  if (!remoteSession) {
    throw new Error("Not connected to a room.");
  }
  const payload = {
    roomCode: remoteSession.roomCode,
    playerId: remoteSession.playerId,
    expectedVersion: remoteSession.version,
    nextState,
  };
  const data = await apiPost("/api/rooms/move", payload);
  remoteSession.version = data.version;
  if (typeof data.playerCount === "number") {
    remoteSession.playerCount = data.playerCount;
    remoteSession.ready = data.playerCount >= 2;
    setFriendStatus(getFriendStatusText(remoteSession));
  }
  syncRoomChatFromPayload(data);
  state = data.state;
}

async function commitMove(move) {
  maybeStoreUndoBeforeMove();
  busy = true;
  await animateHumanMove(move);
  const mover = state.currentPlayer;
  const result = applyMove(state, move);
  recordMove(mover, move);
  playMoveAudio(mover, move);
  if (playMode === "friend") {
    try {
      await submitRemoteMove(result.nextState);
      render("Move synced with friend.");
    } catch (error) {
      await syncRoomState().catch(() => {});
      render(error?.message || "Move sync failed.");
    }
  } else {
    state = result.nextState;
    render(result.status);
  }
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
  if (playMode === "friend") {
    if (!remoteSession) {
      render("Connect to a room first.");
      return;
    }
    if (!remoteSession.ready) {
      render("Waiting for opponent to join.");
      return;
    }
    if (state.currentPlayer !== remoteSession.color) {
      render("Waiting for your friend...");
      return;
    }
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
      state = data.state;
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
      render("Room restarted.");
    } catch (error) {
      render(error?.message || "Unable to restart room.");
    }
    return;
  }
  state = createInitialState();
  moveHistory = [];
  undoSnapshots = [];
  winnerAnnounced = null;
  lastSpokenPhrase = "";
  lastTurnSpoken = "";
  hideCelebration();
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

createRoomButton?.addEventListener("click", async () => {
  if (busy || playMode !== "friend") {
    return;
  }
  if (remoteSession) {
    setFriendStatus(
      `Already connected to room ${remoteSession.roomCode} as ${playerDisplayName(remoteSession.color).toUpperCase()}. Use the second device to join.`,
    );
    return;
  }
  try {
    const data = await apiPost("/api/rooms/create", {});
    hydrateRoomSession(data);
    await shareInviteLink(data.roomCode);
  } catch (error) {
    setFriendStatus(error?.message || "Could not create room.");
  }
});

joinRoomButton?.addEventListener("click", async () => {
  if (busy || playMode !== "friend") {
    return;
  }
  const roomCode = roomCodeInput?.value.trim().toUpperCase();
  await joinRoomWithCode(roomCode);
});

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

speechUnlockButton?.addEventListener("click", () => {
  unlockSpeechIfNeeded();
  setFriendStatus("Voice prompts enabled.");
  speakPhraseReliable("Voice prompts enabled.");
  render(lastStatusMessage);
});

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

celebrationClose.addEventListener("click", () => {
  hideCelebration();
});

if (typeof window !== "undefined") {
  window.addEventListener("resize", () => {
    lockBoardGeometry();
    render(lastStatusMessage);
  });
}

updateChatMuteButton();
updateSpeechUnlockOverlay();
renderRoomChat(true);
if (AUTO_JOIN_ROOM_CODE) {
  setPlayMode("friend");
  if (roomCodeInput) {
    roomCodeInput.value = AUTO_JOIN_ROOM_CODE;
  }
  setFriendStatus(`Joining invite room ${AUTO_JOIN_ROOM_CODE}...`);
  joinRoomWithCode(AUTO_JOIN_ROOM_CODE, { fromInvite: true }).catch(() => {});
} else {
  render("Puffly opens the game.");
  runComputerTurn();
}
