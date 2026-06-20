# Voice architecture (Practice vs Friend)

## Problem we're solving

Practice and Friend share one browser audio stack (WAV clips + optional Web Speech). When both modes use one giant `speakVoiceForMascotThought()` with shared flags and queues, **Friend fixes break Practice** and vice versa.

## Rules (do not break)

### Practice (`playMode === "puffly"`)

- Entry: `speakPracticeMascotVoice()` only — never Friend pending flags or clip queues.
- Pre-flip mascot: `🪙 Flip to choose who starts.` → clip `flip.wav` (`PRACTICE_FLIP_VOICE_PHRASE`).
- Gated by `practiceVoiceStartDismissed` until the user taps Practice Start.
- Uses `lastPracticeMascotVoiceThought` for dedupe (separate from Friend).
- Desktop: HTML Audio first. iOS: Web Audio when HTML is unreliable.

### Friend (`playMode === "friend"`)

- Entry: **Friend Voice Bus** — `requestFriendVoice` → `drainFriendVoiceBus` (one clip at a time).
- Pre-flip: `tap_flip_start`, `blue_is_flipping`, `green_is_flipping` (not mascot TTS).
- Guest welcome: `announceFriendGuestWelcome()` → `enqueueFriendWelcomePhrases()` (`kind: welcome`).
- Post-flip your turn: `playFriendYourTurnClipNow()` on iOS (Web Audio for `your_turn`).
- Post-flip opponent turn: `blue_turn` / `green_turn` via bus; deferred with `friendPendingOpponentTurnVoice` when welcome is gated.
- `setPufflyState` / mascot: **text only** in friend mode — no gameplay speech from render.

### Shared (low level only)

- `playVoiceClip(clipId, handlers, { preferHtml, fromGesture })` — no Friend queue logic inside.
- `voicePhrases.js` — phrase → clip id registry; run `npm run test:voice` after any new line.
- Every WAV under `assets/voice/` must be **> 8KB** (empty 4KB placeholders break all playback).
- **Do not commit `.aiff`** — browsers use `.wav` only; source recordings stay local (see root `.gitignore`).

## Mode switch

Calling `setPlayMode("puffly")` or `pauseFriendRoomForPractice()` must run `resetFriendVoiceForPracticeSwitch()` so Friend queues cannot block Practice.

## Adding a new spoken line

1. Add phrase + clip id in `voicePhrases.js`.
2. Add `assets/voice/{id}.wav` (real audio, not a stub).
3. Run `npm run test:voice`.
4. Bump `CLIENT_BUILD`, `index.html` `app.js?v=`, and `guest-join.html` `GUEST_BUILD`.
5. Wire **only** the mode that needs it (Practice mapper OR Friend bus).
6. Manually smoke-test **both** Practice and Friend on Mac + one iOS device.

## What we will not do

- Stack multiple turn/flip clips on the same render without a single "speak once" guard.
- Reuse Friend welcome queue logic for Practice.
- Map new Friend mascot copy onto Practice clip ids (and vice versa) without an explicit decision.
- Add more one-off friend voice guards without logging (use `?voiceDebug=1` first).

## Debugging friend voice (v330+)

- Enable: `?voiceDebug=1` or `pufflyVoiceDebugOn()` in console.
- iPad: green HUD at bottom shows last voice events without Web Inspector.
- Export: `pufflyVoiceDebugDump()` on **both** Mac and iPad after a repro.
- Standard scenarios: see `FRIEND_VOICE_BACKLOG.md` → VOICE-A2.

## Friend Voice Bus (VOICE-F1, v331+; hardened v357)

- **Enqueue:** `syncFriendVoiceBusFromStates` on room apply (flip done, turn change, pre-flip).
- **Play:** `drainFriendVoiceBus` — one clip at a time; gestures call `tryDrainFriendVoiceBus`.
- **Welcome gate:** `friendGameplayVoiceGatedByWelcome()` + `friendGuestWelcomeArmed` block flip/turn until guest welcome finishes.
- **After welcome:** `flushFriendGameplayVoiceAfterWelcome()` → pre-flip or `announceFriendDeferredTurnVoiceAfterWelcome()` (your turn + opponent turn).
- **Host welcome (v379):** `playFriendWelcomeVoiceNow(..., { fromGesture: true })` on **OPEN GAME ROOM** — not deferred until INVITE; uses `friendIosCanPlayClip` / `friendGestureAudioTick` after create.
- **UI:** `#puffly-thought` updates in `setPufflyState`; friend mode does **not** speak from render.
- **Debug:** `?voiceDebug=1` — watch `bus_enqueue` / `bus_play` / `blocked` / `your_turn_deferred`.

## Guest attach flow (v357+)

1. `guest-join.html` → `bootstrapGuestAttachedSession()` → `hydrateRoomSession({ deferGameplayVoice: true })`.
2. `announceFriendGuestWelcome()` sets `friendGuestWelcomeArmed` and queues welcome+team.
3. iPad: user taps **START VOICE** → welcome plays → deferred flip/turn catch-up.
4. If Blue flipped before START: full welcome still plays; opponent turn (`blue_turn`) deferred via `friendPendingOpponentTurnVoice`.

---

*Last updated: v381 — core bus unchanged since v357; host welcome timing v379. Regression: TEST_BUILD.md.*
