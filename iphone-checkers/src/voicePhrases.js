/**
 * Practice + Friend voice phrase registry — single source of truth.
 *
 * Rules (do not break):
 * 1. Mapped lines use WAV clips via pufflySpeak() — never .aiff (Chrome cannot play them).
 * 2. New spoken line = add phrase here + run `npm run test:voice` + add assets/voice/{id}.wav
 * 3. Do not call speechSynthesis for practice; use pufflySpeak().
 * 4. After flip, do not stack "goes first" + turn line (practiceFlipResultSpeechLockUntil).
 * 5. Friend voice: same pufflySpeak WAV path as Practice; prime on Create/Join tap (no Friend Start overlay).
 * 6. Bump SPEECH_BUILD and app.js import ?v= here together (stale voicePhrases.js breaks the app).
 */

export const SPEECH_BUILD = 283;

export const PRACTICE_FLIP_VOICE_PHRASE = "Flip to see who goes first.";

export const FRIEND_LOBBY_VOICE_PHRASE = "Create a game room and invite a friend to play.";

export const VOICE_CLIP_BASE = "./assets/voice/";
export const VOICE_CLIP_EXT = "wav";

/** Every id must have a matching assets/voice/{id}.wav file. */
export const VOICE_CLIP_IDS = [
  "flip",
  "your_turn",
  "puffly_turn",
  "green_first",
  "blue_first",
  "audio_on",
  "wrong_move",
  "you_win",
  "try_again",
  "puffly_wins",
  "puzzle_complete",
  "blue_turn",
  "green_turn",
  "connected",
  "welcome_room",
  "team_blue",
  "team_green",
  "friend_waiting",
  "friend_joined",
  "now_checkers",
  "now_four",
  "now_puzzle",
  "blue_flip",
  "green_flip",
  "friend_lobby",
];

/** phrase text -> clip id (tests enforce bijection for listed phrases). */
export const VOICE_PHRASE_TO_CLIP = {
  [PRACTICE_FLIP_VOICE_PHRASE]: "flip",
  "Your turn.": "your_turn",
  "Puffly's turn.": "puffly_turn",
  "You (Green) go first": "green_first",
  "Puffly (Blue) goes first": "blue_first",
  "Audio on.": "audio_on",
  "Wrong move.": "wrong_move",
  "You win.": "you_win",
  "You win!": "you_win",
  "Try again.": "try_again",
  "Try again!": "try_again",
  "Puffly wins.": "puffly_wins",
  "Puffly wins!": "puffly_wins",
  "Puzzle complete! Great job!": "puzzle_complete",
  "Puzzle complete.": "puzzle_complete",
  "Blue's turn.": "blue_turn",
  "Green's turn.": "green_turn",
  "You are connected.": "connected",
  "Welcome to the game room.": "welcome_room",
  "You are the Blue team.": "team_blue",
  "You are the Green team.": "team_green",
  "Waiting for your friend to join.": "friend_waiting",
  "Your friend joined.": "friend_joined",
  "Now playing Checkers with your friend.": "now_checkers",
  "Now playing Four-in-a-Row with your friend.": "now_four",
  "Now playing Puzzle with your friend.": "now_puzzle",
  "It's Blue's turn to flip.": "blue_flip",
  "It's Green's turn to flip.": "green_flip",
  [FRIEND_LOBBY_VOICE_PHRASE]: "friend_lobby",
};

const NOW_PLAYING_BY_GAME = {
  checkers: "Now playing Checkers with your friend.",
  fourinarow: "Now playing Four-in-a-Row with your friend.",
  puzzle: "Now playing Puzzle with your friend.",
};

export function nowPlayingFriendClipPhrase(gameId) {
  return NOW_PLAYING_BY_GAME[String(gameId || "").toLowerCase()] || NOW_PLAYING_BY_GAME.checkers;
}

export function friendTeamClipPhrase(teamUpper) {
  const team = String(teamUpper || "").trim().toUpperCase();
  if (team === "BLUE") {
    return "You are the Blue team.";
  }
  if (team === "GREEN") {
    return "You are the Green team.";
  }
  return null;
}

export function flipTurnClipPhrase(playerColor) {
  if (playerColor === "dark") {
    return "It's Blue's turn to flip.";
  }
  if (playerColor === "light") {
    return "It's Green's turn to flip.";
  }
  return null;
}

/** Clip phrases for friend join / welcome (Mac Chrome sequences). */
export function buildFriendJoinClipSequence(teamUpper, options = {}) {
  const { waitingForFriend = false, gameId = "checkers", flipperPlayer = null } = options;
  const sequence = ["You are connected.", "Welcome to the game room."];
  const teamPhrase = friendTeamClipPhrase(teamUpper);
  if (teamPhrase) {
    sequence.push(teamPhrase);
  }
  if (waitingForFriend) {
    sequence.push("Waiting for your friend to join.");
    return sequence;
  }
  sequence.push(nowPlayingFriendClipPhrase(gameId));
  const flipPhrase = flipperPlayer ? flipTurnClipPhrase(flipperPlayer) : null;
  if (flipPhrase) {
    sequence.push(flipPhrase);
  }
  return sequence;
}

export function buildFriendOpponentJoinedClipSequence(gameId = "checkers", flipperPlayer = null) {
  const sequence = ["Your friend joined.", nowPlayingFriendClipPhrase(gameId)];
  const flipPhrase = flipperPlayer ? flipTurnClipPhrase(flipperPlayer) : null;
  if (flipPhrase) {
    sequence.push(flipPhrase);
  }
  return sequence;
}

export function buildFriendGameSwitchClipSequence(gameId = "checkers", flipperPlayer = null) {
  const sequence = [nowPlayingFriendClipPhrase(gameId)];
  const flipPhrase = flipperPlayer ? flipTurnClipPhrase(flipperPlayer) : null;
  if (flipPhrase) {
    sequence.push(flipPhrase);
  }
  return sequence;
}

/** UI labels like "Blue's Turn", "GREEN'S turn." → "dark" | "light". */
export function playerColorFromFriendTurnPhrase(phrase) {
  const trimmed = String(phrase || "").trim();
  if (!trimmed) {
    return null;
  }
  const normalized = trimmed.replace(/\s+/g, " ").toLowerCase();
  if (/^blue'?s?\s*turn\.?$/.test(normalized)) {
    return "dark";
  }
  if (/^green'?s?\s*turn\.?$/.test(normalized)) {
    return "light";
  }
  return null;
}

/** Clip line for whose turn it is, from game state + this device's team color. */
export function friendTurnClipText(activePlayer, localColor) {
  if (activePlayer !== "dark" && activePlayer !== "light") {
    return null;
  }
  if (localColor !== "dark" && localColor !== "light") {
    return null;
  }
  if (activePlayer === localColor) {
    return "Your turn.";
  }
  return activePlayer === "dark" ? "Blue's turn." : "Green's turn.";
}

/**
 * Map friend-mode phrases (UI copy) to clip phrases. localColor: "dark" | "light".
 */
export function mapFriendPhraseToClipText(phrase, localColor) {
  const trimmed = String(phrase || "").trim();
  if (!trimmed || (localColor !== "dark" && localColor !== "light")) {
    return null;
  }
  const turnPlayer = playerColorFromFriendTurnPhrase(trimmed);
  if (turnPlayer) {
    return friendTurnClipText(turnPlayer, localColor);
  }
  if (resolveVoiceClipId(trimmed)) {
    return trimmed;
  }
  return null;
}

export function friendFlipResultClipText(starterPlayer, localColor) {
  if (starterPlayer !== "dark" && starterPlayer !== "light") {
    return null;
  }
  if (starterPlayer === localColor) {
    return "Your turn.";
  }
  return starterPlayer === "dark" ? "Blue's turn." : "Green's turn.";
}

/**
 * Map mascot thought bubble text (#puffly-thought) to a WAV clip phrase.
 * This is the same copy shown under the bear/frog images.
 */
export function voiceClipPhraseFromMascotThought(thought) {
  const raw = String(thought || "").trim();
  if (!raw) {
    return null;
  }
  const lower = raw.replace(/\s+/g, " ").toLowerCase();
  if (lower.includes("your turn")) {
    return "Your turn.";
  }
  if (lower.includes("blue friend's turn") || lower.includes("blue friend")) {
    return "Blue's turn.";
  }
  if (lower.includes("green friend's turn") || lower.includes("green friend")) {
    return "Green's turn.";
  }
  if (lower.includes("waiting for your friend")) {
    return "Waiting for your friend to join.";
  }
  if (
    lower.includes("flip to choose") ||
    lower.includes("choose who starts") ||
    lower.includes("tap flip") ||
    lower === "🪙 tap flip to start"
  ) {
    return PRACTICE_FLIP_VOICE_PHRASE;
  }
  if (lower.includes("my move")) {
    return "Puffly's turn.";
  }
  if (lower.includes("is flipping")) {
    if (lower.includes("green")) {
      return "It's Green's turn to flip.";
    }
    if (lower.includes("blue")) {
      return "It's Blue's turn to flip.";
    }
  }
  return null;
}

export function resolveVoiceClipId(text) {
  const trimmed = String(text || "").trim();
  if (!trimmed) {
    return null;
  }
  return VOICE_PHRASE_TO_CLIP[trimmed] || null;
}

export function filterClipPhrases(phrases) {
  return (Array.isArray(phrases) ? phrases : []).filter((phrase) => resolveVoiceClipId(phrase));
}

export function getPracticeEndgamePhrase(humanWon) {
  return humanWon ? "You win!" : "Try again.";
}
