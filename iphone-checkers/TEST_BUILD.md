# PlayPuffly unified test build (v382)

Single canonical install for regression testing **Home**, **Practice**, and **Friend** before commit.

## Install (Mac + iPad)

1. **Delete the old PlayPuffly Home Screen icon** (and any PlayPufflyTest / Puffly Skeleton icons). iOS caches the old launcher graphic until you remove and re-add.
2. Open the install page or app URL (cache-bust with `cb=382`):
   - **Public:** https://dev.playpuffly.org/iphone-checkers/install.html
   - **Home (PWA start):** https://dev.playpuffly.org/iphone-checkers/home.html?source=pwa&tableUi=1&cb=382
   - **Direct shell (skip home):** https://dev.playpuffly.org/iphone-checkers/index.html?source=pwa&tableUi=1&cb=382
3. **Add to Home Screen** from Safari while on the **home page** (`home.html`) — confirm the new **Puffly face** icon (`Puffly_Icon-192/512.png`) appears in the Add preview.
4. Launch **PlayPuffly** from the Home Screen icon → home scene → **LET'S PLAY**.

## Verify build

In Safari Web Inspector or the in-app console (after **LET'S PLAY** → game shell):

```js
window.pufflyClientBuild === 382
window.pufflyGetInviteLinkOrigin?.() // should be https://dev.playpuffly.org when hosting from localhost
```

## Invite link opens Safari (expected — not a bug)

On iPhone and iPad, when a guest taps the invite link in **Messages**, iOS opens **Safari** — not the PlayPuffly Home Screen icon — even if PlayPuffly is already installed or open.

**Why:** iOS does not route `https://` links from Messages into an installed web PWA. There is no Universal Links / native app setup in this project. That is normal Apple behavior for “Add to Home Screen” apps.

**What this means for testing and users:**

| Role | How to open the app | Invite |
|------|---------------------|--------|
| **Host** | PlayPuffly **Home Screen icon** (PWA) → home → LET'S PLAY | Friend → OPEN GAME ROOM → INVITE FRIEND → share link in Messages |
| **Guest** | **Tap the link in Messages** → Safari | No room code, no JOIN ROOM — one tap on the link |

The guest Safari flow is intentional: `https://dev.playpuffly.org/join/ROOM` → `guest-join.html` → auto-join as Green → game (v382 guest voice path). **Guests never see the home page.**

**Do not treat “link opened Safari instead of the PWA” as a regression.** The seamless guest experience is: tap link → play. Safari is the correct browser for guests.

## Home checklist

Launch from Home Screen icon:

- [ ] Home Screen icon shows **Puffly face** (new `Puffly_Icon-192/512.png`, not old generic icon)
- [ ] Unified light cream canvas (`--home-parchment: #f4efe6`) behind transparent hero; no frame-within-frame
- [ ] Transparent hero (`PlayPuffly_HomePage_Hero_New_Transparent.png`) in `.hero-container` at ~65vh
- [ ] No `mix-blend-mode` on hero image
- [ ] Top **PLAYPUFFLY** title (bold, `#2B2B2B`) + italic tagline **Where Generations Play** (`#555555`)
- [ ] Pill **LET'S PLAY** (`max-width: 170px`, min-height 64px) centered on cream belly with slight right nudge (`--lets-play-x-nudge: 14px`)
- [ ] LET'S PLAY → Practice table shell with flip overlay (“Flip to choose who starts”)
- [ ] `body.practice-table-layout` + `practice-table-initializing` while flip pending

## Practice checklist

Home → **LET'S PLAY** (or direct shell URL) → **Practice**:

- [ ] Top navbar **AUDIO GUIDE** button (not “Audio”)
- [ ] Side trays: matching 3px borders + team tint (blue `#eef5ff`, green `#f0fff0`); your tray slightly stronger glow
- [ ] Table/skeleton layout (trays left/right, board centered) on **Mac and iPad**
- [ ] Four-in-a-Row: drops, win detection
- [ ] Puzzle: tray pieces, placement, completion
- [ ] Flip board / orientation controls
- [ ] Switch game type without layout corruption

## Friend checklist

**Host (Mac or iPad PWA):** tunnel running (`python3 multiplayer_server.py 8002`).

- [ ] PlayPuffly icon → home → LET'S PLAY → Friend → **OPEN GAME ROOM**
- [ ] OPEN GAME ROOM → welcome voice plays immediately (“Welcome… You are Blue…”), not deferred until INVITE
- [ ] **INVITE FRIEND** → Messages link uses `https://dev.playpuffly.org/join/ROOM` (not localhost)
- [ ] When guest joins: “Your friend joined” + flip cue
- [ ] Voice Chat sidebar: title + **Connected / Not Connected** subtitle (no separate status line, no Speaker button)
- [ ] Sidebar flush with bottom navbar on iPad; trays full height; bottom bar (Undo / Play Again / Rules)
- [ ] Opponent moves animate (ghost fly / drop / puzzle tray fly) — not instant snap
- [ ] Play a few moves; no hang/crash on load

**Guest (iPad or iPhone — via Messages link in Safari):**

- [ ] Tap invite link in Messages (opens **Safari** — correct)
- [ ] Brief “Joining as Green…” then game loads (**no home page**)
- [ ] iOS: tap **START VOICE** if prompted → welcome → Green team → flip → turn
- [ ] Board + trays match host; voice / game sync
- [ ] Guest does **not** need a room code or JOIN ROOM

## Mode switching

- [ ] Practice → Friend → back to Practice: no corrupted trays or board sizing
- [ ] Friend mode strips practice-table layout; Practice restores it when `tableUi` is enabled

## Infrastructure

```bash
python3 multiplayer_server.py 8002
cloudflared tunnel run --token <token>   # dev.playpuffly.org
```

## Build notes (v369 → v382)

- **v369:** One PWA (`tableUi=1` in manifest); unified Practice table on Mac + iPad.
- **v370–371:** Friend UI (voice sidebar, bottom navbar, hide static “You · Green” footer).
- **v372:** Invite-first guest flow — link → Safari → `guest-join.html`; host create voice; JOIN ROOM hidden from toolbar.
- **v373:** Friend sidebar polish — Voice Chat subtitle; sidebar stretch on iPad.
- **v374–376:** Friend-mode tray height caps (60% → 80% → 95% of board).
- **v377–378:** Friend-mode opponent move animation (Checkers, Four-in-a-Row, Puzzle).
- **v379:** Host welcome voice on OPEN GAME ROOM.
- **v380:** Practice **AUDIO GUIDE** label; team-colored tray borders.
- **v381:** Matched tray styling — 3px borders + subtle blue/green tint on both trays (Practice + Friend).
- **v382:** New PWA home page (`home.html`) — parchment scene, hero, LET'S PLAY → unchanged Practice first screen; manifest `start_url` → home.

Current builds: `CLIENT_BUILD` / `GUEST_BUILD` **382**, `app.js?v=382`.

## Legacy test PWAs (ignore)

Do not use for this regression pass:

- `test.html` / PlayPufflyTest
- `skeleton.html` / Puffly Skeleton

Use **PlayPuffly** only (`manifest.json` on `home.html`).
