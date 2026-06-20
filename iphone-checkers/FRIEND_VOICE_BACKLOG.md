# Friend & multiplayer voice backlog

**Status:** **Core loop complete (v357)** — Mac Blue + iPad Green friend voice verified (welcome, pre-flip, post-flip turn, Play Again, late-join after Blue flip). **UI/voice polish v369–v381** tracked in `TEST_BUILD.md`.  
**Build:** `CLIENT_BUILD` / `GUEST_BUILD` **381** (`app.js?v=381`).  
**Strategy:** Friend Voice Bus only (`requestFriendVoice` → `drainFriendVoiceBus`); guest welcome gated until START, then deferred gameplay catch-up.

Use this file as the source of truth for voice backlog items. Check boxes here as items close.

**GitHub issues:** run from repo root (after `gh auth login`):

```bash
./scripts/create-friend-voice-issues.sh
```

---

## v369–v381 — Shipped (UI + voice polish; see TEST_BUILD.md)

| Build | Fix |
|-------|-----|
| **369–372** | Unified PWA test path, practice table layout, friend sidebar chrome |
| **373** | Voice Chat button title + Connected/Not Connected subtitle |
| **374–376** | Friend tray height factor (0.6 → 0.95) for readable puzzle pieces |
| **377** | `FRIEND_ANIMATE_OPPONENT_MOVES` — checkers + four-in-a-row opponent animation |
| **378** | Puzzle opponent placement animation via `inferRemotePuzzlePlacementFromStates` |
| **379** | Host welcome on OPEN GAME ROOM (`fromGesture: true`), not deferred to INVITE |
| **380–381** | Practice AUDIO GUIDE label; team tray borders/tints (Practice + Friend) |

---

## v350–v357 — Shipped fixes (tested)

| Build | Fix |
|-------|-----|
| **350** | Plain URL opens Practice (not stale Friend session) |
| **351** | Green guest: no duplicate welcome clips competing on START |
| **352–353** | Green “Your turn” after flip via Web Audio + post-flip retries |
| **354** | Play Again: versioned pre-flip transition + `announceFriendPreFlipVoiceNow` |
| **355** | `friendGameplayVoiceGatedByWelcome` — block flip/turn during welcome |
| **356** | `friendGuestWelcomeArmed` — full welcome+team after late join (Blue flipped before START) |
| **357** | `friendPendingOpponentTurnVoice` — “Blue's turn” / “Green's turn” after welcome when flip happened pre-START |

**Verified matrix (user, v357):**

- Green taps START before Blue flips → welcome → pre-flip → flip → turn
- Green taps START after Blue flips → welcome → correct turn line (incl. opponent turn when Blue wins flip)
- Blue cannot flip until Green has joined (2/2)
- Play Again pre-flip voice both sides
- Practice cold boot on plain URL unchanged

---

## Do not regress (run before any future voice PR)

- [x] **Mac host:** Practice → Tap Start → flip voice plays once
- [x] **Mac host:** Friend → OPEN GAME ROOM → INVITE → 2/2 → flip → one move
- [x] **iPad guest:** Invite link → guest-join → connected 2/2 → stays in room
- [x] **iPad guest:** START VOICE before flip — full welcome, no garble
- [x] **iPad guest:** Blue flips before START — welcome completes, then turn (incl. Blue's turn)
- [x] **All three games:** Host + guest each complete at least one turn after flip
- [x] Bump `CLIENT_BUILD` + `app.js?v=` + `guest-join.html` `GUEST_BUILD`

---

## Phase 0 — Done (connectivity)

| ID | Title | Status |
|----|--------|--------|
| P0-1 | Two-page guest join (`guest-join.html` → hydrate) | ✅ Done |
| P0-2 | Block redirect loop when stored session exists | ✅ Done |
| P0-3 | Minimal voice preload on guest attach (no iPad crash) | ✅ Done |

---

## Phase A — Observability

### VOICE-A1 — Voice debug mode

**Priority:** P0  
**Status:** ✅ Done (v330)

**Enable**

- URL: `?voiceDebug=1` on Mac or iPad (hard-refresh with `?cb=357`)
- Or in console: `pufflyVoiceDebugOn()` / off: `pufflyVoiceDebugOff()`
- Or: `localStorage.puffly.voiceDebug = "1"` then reload

**On screen (iPad-friendly)**

- Green HUD at bottom shows last ~8 voice events (no Web Inspector required)

**In console**

- Filter: `[puffly:voice]`
- Dump full log: `pufflyVoiceDebugDump()` → table + `{ log, state }`
- Live flags: `pufflyVoiceSnapshot()`

**Acceptance**

- [x] Mac: flip + one turn → readable sequence in HUD or console
- [x] iPad Green: same scenario with HUD visible
- [x] Flag off → no HUD, no extra logs

---

### VOICE-A2 — Standard test script (formal regression doc)

**Status:** 🟡 Script defined; manual v357 pass complete — attach dumps when re-running after changes.

Fill **once per device** after each test. Attach `pufflyVoiceDebugDump().log` from both Mac and iPad.

```text
Date:
Build (v357):
Mac role: Blue host | Green guest
iPad role: Green guest | Blue host
Game order: (e.g. Puzzle → Four-in-a-Row → Checkers)

Scenario A — cold guest first session
  1. Guest opens invite (guest-join → game)
  2. 2/2 connected
  3. Blue flips
  4. First move by turn holder (note who)
  Symptom Mac: on-time | late | garbled | missing
  Symptom iPad:

Scenario B — game switch
  1. While in room, host switches Puzzle → Four-in-a-Row
  2. Flip + one move each
  Symptom Mac:
  Symptom iPad:

Scenario C — second flip round (same session)
  1. New game / switch game again
  2. Flip + one move
  Symptom Mac:
  Symptom iPad:

Scenario D — Blue flips BEFORE Green START VOICE (2/2)
  1. Blue flips while Green connected but has not tapped START
  2. Green taps START
  Expect: full welcome + team, then Blue's turn OR Your turn (no skip, no overlap)
  Symptom iPad:

Notes (what HUD showed on iPad):
```

**Pass criteria for cleanup PR:** Same scenario produces **one** `bus_play` per intended line, no `stop_all` within 200ms of `clip_start`, no duplicate `your_turn` within 2s.

---

## Phase F — Friend Voice Bus (architectural cleanup)

**Priority:** P0  
**Status:** ✅ Done (v331 + v350–357 hardening)

### VOICE-F1 — Single friend playback queue

**Status:** ✅ Done

**API:** `requestFriendVoice`, `enqueueFriendTurnVoice`, `enqueueFriendPreFlipVoice`, `syncFriendVoiceBusFromStates`, `drainFriendVoiceBus`, `flushFriendGameplayVoiceAfterWelcome`, `announceFriendDeferredTurnVoiceAfterWelcome`

**Rules (implemented)**

1. Gameplay clips enqueue on **state transitions** in `applyRemoteRoomState` → `syncFriendVoiceBusFromStates`.
2. `setPufflyState` / `speakFriendMascotVoice` — **UI only** for friend (no gameplay audio).
3. Gestures call `tryDrainFriendVoiceBus({ fromGesture: true })` only.
4. `transitionId` dedupe: `preflip:ROOM:game:vN`, `turn:player`, `welcome:ROOM:phrase`.
5. One clip at a time via `friendVoiceBusQueue`.
6. Guest welcome: `friendGuestWelcomeArmed` + `friendGameplayVoiceGatedByWelcome()` block flip/turn until welcome completes.
7. Deferred turn: `friendPendingYourTurnVoice` / `friendPendingOpponentTurnVoice` when sync fires before START.

**Acceptance**

- [x] Scenario A/B/C/D: intended clip order on Mac + iPad
- [x] Practice mode unchanged

---

## Phase B — Overlap (mostly subsumed by F1)

| ID | Title | Status |
|----|--------|--------|
| VOICE-B1 | Single clip at a time | ✅ via F1 |
| VOICE-B2 | No poll voice during playback | ✅ via welcome gate + bus |
| VOICE-B3 | One backend per platform (iOS Web Audio for `your_turn`) | 🟡 `your_turn` uses Web Audio on iOS; opponent turn via bus HTML — reopen only if A2 shows issues |

---

## Phase C — Delay / preload

| ID | Title | Status |
|----|--------|--------|
| VOICE-C1 | Session clip warm on attach | ✅ `warmFriendSessionVoiceClips` on guest attach |
| VOICE-C2 | Gesture window | ✅ START + `friendJoinGestureUntil` |

---

## Phase D — Assets

| ID | Title | Status |
|----|--------|--------|
| VOICE-D1 | `npm run test:voice` | 🟡 Run in CI locally; phrase tests updated |
| VOICE-D2 | Normalize WAV levels | ⬜ Open (optional polish) |

---

## Phase E — Infra

| ID | Title | Status |
|----|--------|--------|
| VOICE-E1 | Long-cache voice WAV on server | ⬜ Open (optional) |

---

## Phase G — Friend join welcome

**Status:** ✅ **Core complete (v356–357)** — remaining items are polish only.

### Current behavior (v357)

| Piece | Where | What happens |
|-------|--------|----------------|
| **Guest welcome script** | `buildFriendGuestWelcomeSequence()` | `welcome_room` → `team_green` / `team_blue` |
| **Guest attach** | `bootstrapGuestAttachedSession()` → `announceFriendGuestWelcome()` | Sets `friendGuestWelcomeArmed`; plays on START (iOS) or immediately (desktop) |
| **Late join / flip before START** | `friendGuestWelcomeArmed`, `friendWelcomeLinesForPlayback()` | Full welcome+team always on first START; never shortened to catch-up while armed |
| **After welcome** | `flushFriendGameplayVoiceAfterWelcome()` | Pre-flip if pending; else `announceFriendDeferredTurnVoiceAfterWelcome()` (your turn + opponent turn) |
| **Host join** | `hydrateRoomSession({ announceJoinVoice: true })` | Full `buildFriendJoinClipSequence()` on Mac |
| **Second player** | `announceFriendOpponentJoined()` when `friendJoinWelcomeSpoken` | `Your friend joined.` + flip cue |
| **Status text** | `formatFriendRoomStatusLine()` | Room code, player count, game, team |
| **Mascot** | `setPufflyState()` in friend mode | Text only — no gameplay speech from render |

**Clips:** `welcome_room`, `team_*`, `tap_flip_start`, `blue_is_flipping`, `green_is_flipping`, `your_turn`, `blue_turn`, `green_turn`, `friend_lobby`, `friend_invite_to_play`, game-switch `now_*`, etc.

### Gaps (optional polish — not blocking v357)

| ID | Title | Notes |
|----|--------|--------|
| VOICE-G1 | **Single welcome script** | Unify status + voice builders (reduce drift) |
| VOICE-G3 | **Status line phases** | Finer lobby → waiting → connected copy |
| VOICE-G4 | **Mascot during intro** | Mirror welcome text in `#puffly-thought` |
| VOICE-G5 | **“Now playing {game}”** | In status but not voice — decide in/out |
| VOICE-G6 | **Mac vs iPad parity** | ✅ Same order when START before flip; late-join catch-up after welcome |

### Key files

- `src/voicePhrases.js` — sequences + clip registry
- `src/app.js` — `announceFriendGuestWelcome`, `friendGameplayVoiceGatedByWelcome`, `announceFriendDeferredTurnVoiceAfterWelcome`, `handleSpeechUnlockFromUserGesture`
- `guest-join.html` — guest attach → hydrate
- `assets/voice/*.wav`

---

## Implementation order (revised)

1. ✅ **VOICE-A1** — debug HUD + logs (v330)
2. ✅ **VOICE-F1** — friend voice bus (v331)
3. ✅ **Gameplay voice** — Start overlay, turn/flip/game-switch (v341)
4. ✅ **Guest welcome + late join** — v350–357
5. **VOICE-A2** — formal regression dumps on file (optional maintenance)
6. **VOICE-G1/G3–G5** — polish only
7. **VOICE-D2 / E1** — optional infra

---

## Out of scope (unchanged)

- Changing `guest-join.html` handshake unless multiplayer breaks
- Merging Practice + Friend mascot functions
- Full `VOICE_CLIP_IDS` preload on guest cold boot
- More dedupe flags without bus + debug proof

---

*Last updated: v381 — core voice loop v357; v369–381 polish in TEST_BUILD.md; optional Phase G polish + A2 formal dumps remain.*
