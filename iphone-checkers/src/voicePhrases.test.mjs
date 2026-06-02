import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  VOICE_CLIP_IDS,
  VOICE_CLIP_EXT,
  VOICE_PHRASE_TO_CLIP,
  getPracticeEndgamePhrase,
  resolveVoiceClipId,
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

console.log(`voicePhrases: ${VOICE_CLIP_IDS.length} clips, ${Object.keys(VOICE_PHRASE_TO_CLIP).length} phrases OK`);
