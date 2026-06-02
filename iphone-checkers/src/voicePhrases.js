/**
 * Practice voice phrase registry — single source of truth.
 *
 * Rules (do not break):
 * 1. Mapped practice lines use WAV clips via pufflySpeak() — never .aiff (Chrome cannot play them).
 * 2. New spoken line = add phrase here + run `npm run test:voice` + add assets/voice/{id}.wav
 * 3. Do not call speechSynthesis directly for practice; use pufflySpeak().
 * 4. After flip, do not stack "goes first" + "Your/Puffly's turn" (see practiceFlipResultSpeechLockUntil).
 */

export const SPEECH_BUILD = 255;

export const PRACTICE_FLIP_VOICE_PHRASE = "Flip to see who goes first.";

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
};

export function resolveVoiceClipId(text) {
  const trimmed = String(text || "").trim();
  if (!trimmed) {
    return null;
  }
  return VOICE_PHRASE_TO_CLIP[trimmed] || null;
}

export function getPracticeEndgamePhrase(humanWon) {
  return humanWon ? "You win!" : "Try again.";
}
