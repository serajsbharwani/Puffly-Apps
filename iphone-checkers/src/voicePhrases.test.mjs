import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  VOICE_CLIP_IDS,
  VOICE_CLIP_EXT,
  VOICE_PHRASE_TO_CLIP,
  FRIEND_INVITE_TO_PLAY_PHRASE,
  FRIEND_LOBBY_VOICE_PHRASE,
  buildFriendGuestWelcomeSequence,
  buildFriendJoinClipSequence,
  buildFriendJoinCatchUpSequence,
  buildFriendOpponentJoinedClipSequence,
  PRACTICE_FLIP_VOICE_PHRASE,
  PRACTICE_CHOOSE_FLIP_VOICE_PHRASE,
  FRIEND_TAP_FLIP_VOICE_PHRASE,
  FRIEND_BLUE_FLIPPING_PHRASE,
  FRIEND_GREEN_FLIPPING_PHRASE,
  friendFlipResultClipText,
  getPracticeEndgamePhrase,
  friendTurnClipText,
  mapFriendPhraseToClipText,
  playerColorFromFriendTurnPhrase,
  resolveVoiceClipId,
  voiceClipPhraseFromMascotThought,
} from "./voicePhrases.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const voiceDir = path.join(__dirname, "../assets/voice");

for (const [phrase, clipId] of Object.entries(VOICE_PHRASE_TO_CLIP)) {
  assert.equal(resolveVoiceClipId(phrase), clipId, `resolveVoiceClipId("${phrase}")`);
  assert.ok(VOICE_CLIP_IDS.includes(clipId), `clip id missing from VOICE_CLIP_IDS: ${clipId}`);
}

for (const clipId of VOICE_CLIP_IDS) {
  const wavPath = path.join(voiceDir, `${clipId}.${VOICE_CLIP_EXT}`);
  assert.ok(fs.existsSync(wavPath), `missing voice asset: ${wavPath}`);
  const stat = fs.statSync(wavPath);
  assert.ok(stat.size > 8000, `voice asset too small (likely empty): ${wavPath} (${stat.size} bytes)`);
}

assert.equal(getPracticeEndgamePhrase(true), "You win!");
assert.equal(getPracticeEndgamePhrase(false), "Try again.");

assert.equal(mapFriendPhraseToClipText("Blue's Turn", "dark"), "Your turn.");
assert.equal(mapFriendPhraseToClipText("Blue's Turn", "light"), "Blue's turn.");
assert.equal(mapFriendPhraseToClipText("Green's Turn", "light"), "Your turn.");
assert.equal(playerColorFromFriendTurnPhrase("GREEN'S turn."), "light");
assert.equal(mapFriendPhraseToClipText("GREEN'S turn.", "light"), "Your turn.");
assert.equal(friendTurnClipText("light", "light"), "Your turn.");
assert.equal(friendTurnClipText("dark", "light"), "Blue's turn.");
assert.equal(voiceClipPhraseFromMascotThought("🐸 Your turn — GREEN tray"), "Your turn.");
assert.equal(voiceClipPhraseFromMascotThought("🐸 Your turn — GREEN"), "Your turn.");
assert.equal(voiceClipPhraseFromMascotThought("🐻 Your turn — BLUE"), "Your turn.");
assert.equal(voiceClipPhraseFromMascotThought("🐻 Blue friend's turn"), "Blue's turn.");
assert.equal(voiceClipPhraseFromMascotThought("🪙 Tap FLIP to start"), FRIEND_TAP_FLIP_VOICE_PHRASE);
assert.equal(voiceClipPhraseFromMascotThought("🪙 Flip to choose who starts."), PRACTICE_CHOOSE_FLIP_VOICE_PHRASE);
assert.equal(resolveVoiceClipId(PRACTICE_CHOOSE_FLIP_VOICE_PHRASE), "flip");
assert.equal(voiceClipPhraseFromMascotThought("🪙 Blue is flipping..."), FRIEND_BLUE_FLIPPING_PHRASE);
assert.equal(voiceClipPhraseFromMascotThought("🪙 Green is flipping..."), FRIEND_GREEN_FLIPPING_PHRASE);
assert.equal(voiceClipPhraseFromMascotThought("👀 Your turn!"), "Your turn.");
assert.equal(voiceClipPhraseFromMascotThought("💭 My move..."), "Puffly's turn.");
assert.equal(voiceClipPhraseFromMascotThought("🤔 I'm thinking..."), null);
assert.equal(voiceClipPhraseFromMascotThought("🧩 Place a matching piece."), null);
assert.equal(voiceClipPhraseFromMascotThought("🧩 Tap the matching slot."), null);
assert.equal(friendFlipResultClipText("dark", "dark"), "Your turn.");
assert.equal(friendFlipResultClipText("light", "dark"), "Green's turn.");

const waitingSeq = buildFriendJoinClipSequence("BLUE", { waitingForFriend: true });
assert.ok(waitingSeq.includes(FRIEND_INVITE_TO_PLAY_PHRASE));
assert.equal(resolveVoiceClipId(FRIEND_LOBBY_VOICE_PHRASE), "friend_lobby_intro");
assert.equal(resolveVoiceClipId(FRIEND_INVITE_TO_PLAY_PHRASE), "friend_invite_to_play");
const guestWelcome = buildFriendGuestWelcomeSequence("GREEN");
assert.deepEqual(guestWelcome, ["Welcome to the game room.", "You are the Green team."]);
const catchUp = buildFriendJoinCatchUpSequence("GREEN");
assert.equal(catchUp.length, 1);
assert.ok(catchUp[0].includes("GREEN") || catchUp[0].includes("Green"));

const readySeq = buildFriendOpponentJoinedClipSequence("checkers", "dark");
assert.ok(readySeq.includes("Your friend joined."));
assert.ok(readySeq.includes("It's Blue's turn to flip."));
assert.ok(!readySeq.some((line) => line.includes("Now playing")));

const joinReadySeq = buildFriendJoinClipSequence("GREEN", { gameId: "puzzle", flipperPlayer: "dark" });
assert.ok(!joinReadySeq.some((line) => line.includes("Now playing")));

console.log(`voicePhrases: ${VOICE_CLIP_IDS.length} clips, ${Object.keys(VOICE_PHRASE_TO_CLIP).length} phrases OK`);
