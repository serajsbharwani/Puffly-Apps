# Puffly App Map

Concise reference for global state, shell architecture, UI/voice constraints, and how new games plug in.  
**Client build:** see `CLIENT_BUILD` in `iphone-checkers/src/app.js` and `?cb=` on URLs (**v357** — friend voice complete).

Related docs (in `iphone-checkers/`): `VOICE.md`, `FRIEND_VOICE_BACKLOG.md`, `PLAN.md`.

---

## 1. What this is

A single **iPhone-first web shell** (`iphone-checkers/index.html` + `iphone-checkers/src/app.js`) that hosts multiple games under one UI:

- **Practice with Puffly** — local play vs AI (`playMode === "puffly"`)
- **Play with a Friend** — room-based multiplayer via `multiplayer_server.py` (`playMode === "friend"`)

**Teams (internal vs UI):**

| Engine color | UI label | Practice default | Friend role |
|--------------|----------|------------------|-------------|
| `dark`       | Blue     | Puffly (AI)      | Room host / creator |
| `light`      | Green    | Human player     | Guest (second joiner) |

Game logic lives in **pure modules** (`iphone-checkers/src/engine.js`, `iphone-checkers/src/games/*.js`). The shell owns mode, room sync, render, input, voice, and chrome.

---

## 2. Repository layout

```
checkers/                         # repo root (this file)
  multiplayer_server.py           # Room API (memory rooms, versioned state)
  iphone-checkers/
    index.html                    # Shell DOM + inline bootstrap (friend chrome, invite redirect)
    guest-join.html               # Minimal guest attach page → hydrate index with session
    styles.css                    # Layout, friend/practice chrome, overlays
    src/
      app.js                      # Shell: state, UI, multiplayer, voice bus, input routing
      engine.js                   # Checkers rules + AI
      voicePhrases.js             # Phrase ↔ WAV clip registry
      games/
        registry.js               # Game ids + titles
        puzzle.js
        fourinarow.js
    assets/voice/                 # WAV clips (must be real audio, not stubs)
```

**Run:** `python3 multiplayer_server.py 8002` → `http://localhost:8002/iphone-checkers/`

---

## 3. Global state (client)

| Variable / object | Role |
|-------------------|------|
| `selectedGameId` | Active game: `checkers` \| `fourinarow` \| `puzzle` (`games/registry.js`) |
| `playMode` | `"puffly"` (practice) or `"friend"` |
| `state` | Current game snapshot (shape varies by game; always includes flip metadata when used) |
| `remoteSession` | Friend room handle: `roomCode`, `playerId`, `color`, `version`, `ready`, `gameType`, … |
| `difficulty` | Practice AI + puzzle grid size (`easy` / `medium` / `hard`) |
| `busy` | Blocks input during animations / network |
| `audioEnabled` | Master toggle for WAV / UI sounds |

**Shared flip metadata** (all games in friend + practice):

- `starterFlipDone`, `starterPlayer`, `currentPlayer` (`dark` \| `light`)
- Pre-flip: coin + **FLIP** button; flipper determined per game (puzzle also uses `puzzleFlipTurn`)

**Friend-only flags:** `friendVoiceStartDismissed`, `friendJoinWelcomeSpoken`, `friendGuestWelcomeArmed`, `friendPendingYourTurnVoice`, `friendPendingOpponentTurnVoice`, voice bus queue, chat `roomChatMessages`, etc.

**Persistence:** `sessionStorage` / `localStorage` for friend session, invite codes, guest hydrate payload.

---

## 4. Application architecture

```
┌─────────────────────────────────────────────────────────────┐
│  app-chrome (z-index 1300)                                   │
│  game selector · mode tabs · practice/friend controls        │
│  friend-status · START VOICE (iOS)                           │
├─────────────────────────────────────────────────────────────┤
│  app-shell                                                   │
│  board-stage (#board) · captured trays · puffly-panel      │
│  friend-lock-overlay · friend-chat-panel (voice + text)      │
├─────────────────────────────────────────────────────────────┤
│  Overlays (z-index 1400+)                                    │
│  speech-unlock · celebration                                 │
└─────────────────────────────────────────────────────────────┘
         │                              │
         ▼                              ▼
   render() → renderUi()          multiplayer_server.py
   game-specific board DOM        POST /api/rooms/*
```

**Bootstrap paths**

- **Mac host:** `index.html` → Friend tab → OPEN GAME ROOM → invite
- **iPad guest:** invite URL → `guest-join.html` (auto join) → `index.html?friendAttached=1` → `hydrateRoomSession()`
- Invite links with `?join=` on index redirect to `guest-join.html`

**Room sync loop:** `startRoomPolling()` → `syncRoomState()` → `applyRemoteRoomState()` → `syncFriendVoiceBusFromStates()` → `render()`.

**Local moves (friend):** apply move locally → `notifyFriendVoiceAfterLocalMove()` → `submitRemoteMove()` with `skipVoiceSync` where needed → server applies `nextState` with `expectedVersion`.

---

## 5. UI constraints

### Tap-only (no drag)

All games use **tap** interaction for reliability on iOS. Checkers established the pattern; puzzle uses a **two-step** variant.

### Checkers — two-tap move

1. **Tap piece** (own color, legal moves exist) → `state.selectedSquare` set, highlights shown.
2. **Tap destination** → `commitMove()` → practice: AI turn; friend: `notifyFriendVoiceAfterLocalMove` + `submitRemoteMove`.

Illegal taps play invalid audio + short status via `render()`.

### Four-in-a-Row — one-tap column

Tap column → `commitFourDrop()` (same friend local-notify + submit pattern).

### Puzzle — two-tap place

1. **Tap tray piece** → `selectedPuzzlePieceId`, tray highlight.
2. **Tap board cell** → `submitPuzzlePlacement()` → fly animation → friend sync.

Tray/board handlers use `shouldHandleTrayTap()` / `shouldHandleBoardTap()` debounce (~24ms) and `runAfterPuzzleTapPaint()` on iOS so layout is stable before hit-testing.

### Starter flip

Shared **FLIP** button (`#starter-flip-btn`) before `starterFlipDone`. Mascot copy in `#puffly-thought`; friend flip voice via bus (`blue_is_flipping`, etc.), not mascot TTS.

### Custom messaging surfaces

| Surface | Element | Purpose |
|---------|---------|---------|
| **Friend status** | `#friend-status` | Primary room line: `formatFriendRoomStatusLine()` — room code, player count, game, team, hints |
| **Mascot thought** | `#puffly-thought` | Short emoji + turn/flip hints; **friend mode = text only** (no gameplay speech from render) |
| **Room text chat** | `#friend-chat-panel` | Scrollable `#chat-messages`, `#chat-input`, send/mute; synced via `/api/rooms/chat` on poll/move responses |
| **Rules** | `#rules-panel` | Context rules per mode/game |
| **Lock overlay** | `#friend-lock-overlay` | Blocks board until 2/2 or correct turn |

Status strings are mostly **silent** in friend mode (`speakFromStatus` filters boilerplate); gameplay speech uses WAV clips only.

### Mode chrome

- `body.friend-mode` toggles visible panels (`syncPlayModeChrome()` / `pufflyApplyPlayModeChrome()` in `index.html`).
- Practice shows difficulty + audio toggle; friend shows room toolbar + puzzle size when game is puzzle.
- Puzzle hides undo; checkers/four keep undo (friend undo when server allows).

### iOS audio gate

iPad/iPadOS (including desktop UA) requires **Tap Start for Voice** overlay or **START VOICE** toolbar button before friend WAV clips play. Desktop Mac primes on OPEN GAME ROOM / JOIN. See `detectIOSLikeBrowser()` / `isIPadOSLikeDevice()`.

---

## 6. Voice architecture

Two parallel systems — **do not merge**:

| Mode | Entry | Notes |
|------|--------|------|
| **Practice** | `speakPracticeMascotVoice()` | Gated by practice Start overlay; mascot can speak |
| **Friend** | **Friend Voice Bus** only | `requestFriendVoice` → `drainFriendVoiceBus`; one clip at a time |

**Friend bus priorities:** `welcome` (10) → `flip` (20) → turn (30) → `status` (40).  
**Dedupe keys:** `welcome:ROOM:phrase`, `preflip:ROOM:game:vN`, `turn:player`.

**Enqueue on:** `syncFriendVoiceBusFromStates()` inside `applyRemoteRoomState()` (flip done, turn change, pre-flip).  
**Gestures:** `tryDrainFriendVoiceBus({ fromGesture: true })` after Start or gameplay taps.

**Guest welcome (iOS):** `announceFriendGuestWelcome()` arms full welcome; `friendGameplayVoiceGatedByWelcome()` blocks flip/turn until START + welcome completes; `flushFriendGameplayVoiceAfterWelcome()` / `announceFriendDeferredTurnVoiceAfterWelcome()` plays pre-flip or turn catch-up (incl. opponent turn when Blue flipped before START).

**Phrases/clips:** `iphone-checkers/src/voicePhrases.js` + `iphone-checkers/assets/voice/{id}.wav`. Run `npm test` from `iphone-checkers/` after changes.

**Voice backlog:** `iphone-checkers/FRIEND_VOICE_BACKLOG.md` (v357 complete; optional polish in Phase G1/G3–G5).

---

## 7. Integrating a new game

### 1. Register

Add to `iphone-checkers/src/games/registry.js` with `id`, `title`, `implemented: true`.

### 2. Implement game module

Export pure functions, e.g.:

- `createInitialState(options?)`
- Move/apply helpers returning `{ ok, nextState, message }` or `{ nextState, status }`
- Win/draw detection inside state

Keep **no DOM or `fetch`** in game modules.

### 3. Wire shell (`iphone-checkers/src/app.js`)

| Hook | What to add |
|------|-------------|
| `createStateForGame(gameId)` | Branch to your `createInitialState` |
| `normalizeStateForGame(stateLike, gameId)` | Validate/repair remote snapshots |
| `renderUi()` | Branch: board renderer (checkers grid / four columns / puzzle cells) |
| Board input | Handler in shared pointer path or dedicated `handle*Tap` |
| **Practice** | After human move, call `runComputerTurn()` or equivalent if applicable |
| **Friend** | `ensureFriendTurnSyncedBeforeMove()` → local apply → `notifyFriendVoiceAfterLocalMove(mover, nextState)` → `submitRemoteMove(nextState, { skipVoiceSync: true, … })` |
| Flip | If game uses starter flip, respect `starterFlipDone` / `starterPlayer` / `currentPlayer` |
| Rules | Extend `updateRulesForMode()` copy |
| Voice | Add clips to `voicePhrases.js`; map turn lines via bus only — **no** `setPufflyState` speech in friend mode |

### 4. Server

`multiplayer_server.py` must accept your `gameType` on create and store opaque `state` JSON. Room enforces turn via `currentPlayer` and `expectedVersion` on `/api/rooms/move`. Host can switch game type; client handles `gameTypeChanged` in `syncRoomState()`.

### 5. UI shell

- Add game button in `iphone-checkers/index.html` `.game-buttons` with `data-game="yourid"`.
- If game needs extra chrome (like puzzle difficulty), add a friend-only panel and toggle in `updateFriendPuzzleDifficultyPanel()` pattern.
- Ensure `lockBoardGeometry()` can size the board for your grid.

### 6. Tests

- Game rules: dedicated `*.test.mjs` if non-trivial.
- Voice phrases if new spoken lines.
- Manual matrix: Practice flip + one turn; Friend Mac host + iPad guest, flip + one turn, then switch game type.

---

## 8. Invariants (do not break)

1. **Friend gameplay voice** only through the voice bus — not `setPufflyState` / Web Speech on render.
2. **Practice** must call `resetFriendVoiceForPracticeSwitch()` when leaving friend mode.
3. **Local move before submit** in friend mode so turn clips fire once (puzzle/checkers/four pattern).
4. **iOS:** Start dismiss must not be blocked by global gesture capture (`isFriendVoiceStartTapTarget`).
5. **Guest attach** uses `guest-join.html`; do not auto-join heavy voice preload on cold boot.
6. **WAV assets** must be real files (> ~8KB); stub files break all playback.
7. Bump **`CLIENT_BUILD`**, `index.html` `app.js?v=`, and `guest-join.html` `GUEST_BUILD` together on deploy.

---

## 9. Key API endpoints (friend)

| Endpoint | Use |
|----------|-----|
| `POST /api/rooms/create` | Host opens room |
| `POST /api/rooms/join` | Guest joins |
| `POST /api/rooms/reconnect` | Resume session |
| `POST /api/rooms/reclaim-guest` | Guest seat reclaim |
| `GET /api/rooms/state` | Poll + hydrate |
| `POST /api/rooms/move` | Submit `nextState` + `expectedVersion` |
| `POST /api/rooms/chat` | Text chat message |

---

*Last updated: v357 — friend voice loop complete (Mac host + iPad guest); see FRIEND_VOICE_BACKLOG.md.*
