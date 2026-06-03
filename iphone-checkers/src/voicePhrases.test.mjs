import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  VOICE_CLIP_IDS,
  VOICE_CLIP_EXT,
  VOICE_PHRASE_TO_CLIP,
  buildFriendJoinClipSequence,
  buildFriendOpponentJoinedClipSequence,
  PRACTICE_FLIP_VOICE_PHRASE,
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
assert.equal(voiceClipPhraseFromMascotThought("🐻 Blue friend's turn"), "Blue's turn.");
assert.equal(voiceClipPhraseFromMascotThought("🪙 Tap FLIP to start"), PRACTICE_FLIP_VOICE_PHRASE);
assert.equal(voiceClipPhraseFromMascotThought("🪙 Flip to choose who starts."), PRACTICE_FLIP_VOICE_PHRASE);
assert.equal(voiceClipPhraseFromMascotThought("👀 Your turn!"), "Your turn.");
assert.equal(voiceClipPhraseFromMascotThought("💭 My move..."), "Puffly's turn.");
assert.equal(voiceClipPhraseFromMascotThought("🤔 I'm thinking..."), null);
assert.equal(voiceClipPhraseFromMascotThought("🧩 Place a matching piece."), null);
assert.equal(voiceClipPhraseFromMascotThought("🧩 Tap the matching slot."), null);
assert.equal(friendFlipResultClipText("dark", "dark"), "Your turn.");
assert.equal(friendFlipResultClipText("light", "dark"), "Green's turn.");

const waitingSeq = buildFriendJoinClipSequence("BLUE", { waitingForFriend: true });
assert.ok(waitingSeq.includes("Waiting for your friend to join."));
const readySeq = buildFriendOpponentJoinedClipSequence("checkers", "dark");
assert.ok(readySeq.includes("Your friend joined."));
assert.ok(readySeq.includes("It's Blue's turn to flip."));

console.log(`voicePhrases: ${VOICE_CLIP_IDS.length} clips, ${Object.keys(VOICE_PHRASE_TO_CLIP).length} phrases OK`);
