# PlayPuffly unified test build (v453)

Single canonical install for regression testing **Home**, **Practice**, and **Friend** before commit.

## Install (Mac + iPad)

1. **Delete the old PlayPuffly Home Screen icon** (and any PlayPufflyTest / Puffly Skeleton icons). iOS caches the old launcher graphic until you remove and re-add.
2. Open the install page or app URL (cache-bust with `cb=453`):
   - **Public:** https://dev.playpuffly.org/iphone-checkers/install.html
   - **Home (PWA start):** https://dev.playpuffly.org/iphone-checkers/home.html?source=pwa&tableUi=1&cb=453
   - **Direct shell (skip home):** https://dev.playpuffly.org/iphone-checkers/index.html?source=pwa&tableUi=1&cb=453
3. **Add to Home Screen** from Safari while on the **home page** (`home.html`) — confirm the new **Puffly face** icon (`Puffly_Icon-192/512.png`) appears in the Add preview.
4. Launch **PlayPuffly** from the Home Screen icon → home scene → **LET'S PLAY**.

## Verify build

In Safari Web Inspector or the in-app console (after **LET'S PLAY** → game shell):

```js
window.pufflyClientBuild === 453
window.pufflyDebugMiniLandscapeCenter?.()
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

The guest Safari flow is intentional: `https://dev.playpuffly.org/join/ROOM` → `guest-join.html` → auto-join as Green → game (v397 guest voice path). **Guests never see the home page.**

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
- [ ] `body.practice-table-layout` + `practice-table-initializing` while flip pending — **new table UI** visible behind FLIP (no legacy top chrome)

## Practice checklist

Home → **LET'S PLAY** (or direct shell URL) → **Practice**:

- [ ] **Flip screen:** top setup rows still in `.app-chrome`; no gear Menu button
- [ ] **Open tray:** Game / Mode / Trait / Audio respond to taps (tray reparented to scene, z1450)
- [ ] **Head gap:** ~20px visible air between nav band bottom and Puffly head
- [ ] **Bottom pill:** player seat bar visible above bottom frame art
- [ ] **Setup tray:** open tray anchored to `--practice-nav-band-top`; dropdowns below `--practice-nav-band-bottom`
- [ ] **Bottom pill:** inside frame above bottom ink border (not on decorative art)
- [ ] **Frame:** board group ≤ 68vw centered inside illustrated border
- [ ] **Trays:** Blue/Green captured columns **same height as board** (top/bottom flush with board border)
- [ ] **⚙️ Menu** opens centered pill-nav on **same Y-axis** as gear button; gear **hidden** while tray open
- [ ] Pill-nav row: `Game ▾` · `Mode ▾` · `Trait ▾` · Audio guide — readable type (≥16px labels, 18px values), `padding: 14px 36px`
- [ ] Tray closes via Menu toggle, backdrop, Escape, or after game/mode/trait selection; gear reappears
- [ ] **Bottom bar:** floating white pill; borderless action cluster (no inner tan box); thin divider before Undo when thought visible
- [ ] **How to Play:** compact parchment shelf slides in from right (vertically centered, not full-height); Close / backdrop / Escape dismisses
- [ ] Side trays: matching 3px borders + team tint (blue `#eef5ff`, green `#f0fff0`); your tray slightly stronger glow
- [ ] Table/skeleton layout (trays left/right, board centered) on **Mac and iPad** (portrait + landscape)
- [ ] Landscape: pills inset from edges; Checkers/Four board size ≥ v430; Puzzle tuck + larger board (v432)
- [ ] Four-in-a-Row: drops, win detection
- [ ] Puzzle: tray pieces, placement, completion
- [ ] Flip board / orientation controls
- [ ] Switch game type without layout corruption

## Friend checklist

**Host (Mac or iPad PWA):** tunnel running (`python3 multiplayer_server.py 8002`).

- [ ] PlayPuffly icon → home → LET'S PLAY → Friend → **OPEN GAME ROOM**
- [ ] Friend mode: **no** `← Menu` or practice setup tray; top chrome unchanged from v382
- [ ] OPEN GAME ROOM → welcome voice plays immediately (“Welcome… You are Blue…”), not deferred until INVITE
- [ ] **INVITE FRIEND** → Messages link uses `https://dev.playpuffly.org/join/ROOM` (not localhost)
- [ ] When guest joins: “Your friend joined” + flip cue
- [ ] Voice Chat sidebar: title + **Connected / Not Connected** subtitle (no separate status line, no Speaker button)
- [ ] Sidebar flush with bottom navbar on iPad; trays full height; bottom bar (Undo / Play Again / How to Play)
- [ ] Opponent moves animate (ghost fly / drop / puzzle tray fly) — not instant snap
- [ ] Play a few moves; no hang/crash on load

**Guest (iPad or iPhone — via Messages link in Safari):**

- [ ] Tap invite link in Messages (opens **Safari** — correct)
- [ ] Brief “Joining as Green…” then game loads (**no home page**)
- [ ] iOS: tap **START VOICE** if prompted → welcome → Green team → flip → turn
- [ ] Board + trays match host; voice / game sync
- [ ] Guest does **not** need a room code or JOIN ROOM

## Mode switching

- [ ] Practice → Friend → back to Practice: no corrupted trays or board sizing; setup rows restore to `.app-chrome` on flip screen
- [ ] Friend mode strips practice-table layout; Practice restores it when `tableUi` is enabled
- [ ] Practice tray state resets (closed) when entering Friend or returning to flip screen (Play Again)

## Infrastructure

```bash
python3 multiplayer_server.py 8002
cloudflared tunnel run --token <token>   # dev.playpuffly.org
```

## Build notes (v369 → v397)

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
- **v383:** Practice setup tray experiment — hide top chrome during active play; floating Menu + tray reusing setup controls; flip screen unchanged.
- **v384:** Practice tray visual polish — top-left Menu capsule; pill-nav overlay (Game/Mode/Trait/Audio); light parchment backdrop.
- **v385:** Practice layout polish — top safe area; pill Y-alignment; ⚙️ Menu; floating bottom pill; hide gear when tray open.
- **v386:** Fix Puffly skeleton distortion — shift torso + dealer host together (`--practice-top-safe`); remove scene padding; bottom reserve on board matrix.
- **v387:** Practice breathing room — portrait board cap (78vw); computed vertical spacing tokens; premium pill typography/padding; Puffly head/torso cqw scaling in portrait; bottom pill `32px` float.
- **v388:** Structural layout — nav band + content offset; frame insets (all sides); board group 72vw; tray height = board; unified Puffly `transform: scale()`; bottom pill above frame art; `background-size: contain`.
- **v389:** Fix V388 portrait regressions — restore parchment `cover` (full bleed); remove Puffly scale hacks (v386 fixed art); `--practice-puffly-slot` pushes board down ~1.5cm; remove scene letterbox padding.
- **v390:** V380 board tuck (`margin-top: -30px`); fixed torso `max-width: 376px` (neck fix); portrait `contain` / landscape `cover` for square frame; bottom pill 14px black-on-white; board group 68vw.
- **v391:** Full-bleed parchment (`cover` all orientations); nav inside frame (`--practice-frame-safe-top`, reduced bottom inset); setup tray `absolute` in scene; Puffly/content offset retuned.
- **v392:** Unified frame model — portrait `contain` + letterbox calc; nav/chrome frame padding tokens; playfield drop.
- **v393:** **Scene + Stage refactor** — full-screen `cover`; `#practice-stage` flex column with artwork `%` safe insets; nav/board/seat as flex children.
- **v394:** **V380 tuck restore** — `#practice-play-cluster`; z-index sandwich (torso 2 / board 5 / head 10); host/board overlap margins.
- **v395:** Tray stacking fix — scene `absolute` backdrop (z35) + open tray `fixed` z1400; tuck tokens (`42px` board, `40px` host); `24px` play-cluster top margin; close tray on flip-to-play.
- **v396:** Tray CSS cleanup — legacy `fixed` rules scoped to initializing only; active play closed tray `display: none`; structural Puffly tuck (host `height: 0`, head/arm z10); `48px` board tuck + play-cluster top.
- **v397:** **Unified `#puffly-dealer-unit`** — torso + host share one 238px bottom anchor (reverts v396 `height: 0`); V380 tuck (`30px` board); `40px` head clearance; portrait parchment `contain`; tray positioned via `--practice-nav-band-bottom` JS sync.
- **v398:** Fix post-flip crash — apply practice chrome/DOM before `renderUi`; remove synthetic `resize` storm from viewport refresh; double-rAF board lock after flip transition.
- **v399:** Portrait `contain` + **`practiceTableSyncFrameInsets()`** — JS maps stage insets to visible parchment square; tray anchors to `--practice-nav-band-top`; 56px head clearance; scene max-width only on landscape ≥900px.
- **v400:** **Hard reset** — revert portrait `contain`; disable JS frame inset sync; full-bleed flex stage (`inset: 0` + safe-area padding); board height from seat-top budget (not collapsed matrix); tray anchored to `--practice-nav-band-bottom`; keep v397 dealer unit + v398 render-order fix.
- **v401:** **Decoupled model** — keep `cover` background; re-enable `practiceTableSyncFrameInsets()` with **cover crop math** (not contain); single inset pass; play cluster `justify-content: center`; open tray in-flow in `#practice-stage-top`; 44px dealer head margin; board budget from play-cluster geometry.
- **v402:** Fix v401 regressions — **clamp** frame insets (no negative left); drop `height: 100%` when frame-synced; play cluster `flex-start`; 28px head protrusion; stage-top safe-area padding for Menu.
- **v403:** **Nav band row** — `#practice-stage-top` horizontal 48px band; open tray pill same Y as Menu; `--practice-nav-to-head-gap` (20px) + `--practice-head-clearance` (48px) on play-cluster; dealer margin-top removed.
- **v404:** Open tray **`position: fixed` z-index 1400** above backdrop (z35) — restores pill interactivity; sync `--practice-nav-band-top` before open.
- **v405:** Escape `#practice-stage` stacking trap — **reparent tray to `#practice-table-scene`** on open; backdrop `fixed` z1340; tray z1450; dropdowns z1460.
- **v406:** **Anchored pill dropdowns** — reparent `.game-panel` / `.mode-panel` / `.practice-puffly-control-card` into pill clusters; `position: absolute` under triggers (trait right-aligned); unified 200–240px white dropdown style; 48px tap rows.
- **v407:** **Unified board footprint** — portrait active play sizes Four-in-a-Row and Puzzle to Checkers reference cell; 56px trays for all games; `--practice-footprint-board-height` locks tray height; shorter boards vertically centered in footprint slot.
- **v408:** **Four-in-a-Row footprint fill** — scale cell from footprint width/height (`~8/7×` ref); trays match actual board height; top-align board-wrap (`fourinarow-game`); restore Puffly tuck.
- **v409:** **Puzzle tray readability** — portrait 98px puzzle trays (not 56px); tray `pieceSize` tied to board cell (`--puzzle-cell-px`); 4-slot scroll unchanged; large board footprint kept.
- **v410:** **Puzzle grid + trait fixes** — size cells from actual center column (98px trays); square board columns; center tray pieces; pill **Size · Mini/Classic/Mega** for puzzle.
- **v411:** **Puzzle tray interlocks** — restore `overflow: visible` on portrait tray pieces/SVG (match landscape); puzzle tray columns allow horizontal tab overflow.
- **v412:** **How to Play popover** — rename Game Rules → How to Play; anchored card above bottom trigger (no layout shift); backdrop dismiss; clean tip list.
- **v413:** **How to Play copy** — Four-in-a-Row line 1 matches Checkers; Puzzle drops flip line.
- **v414:** **How to Play right drawer** — trigger stays in bottom pill; fixed right sidebar with slide animation; Close + backdrop dismiss.
- **v415:** **How to Play compact shelf** — content-sized card (max 450px), vertically centered; cream scrim backdrop; smoother slide easing.
- **v416:** **FLIP background** — practice init shows active table UI (board/trays/Puffly/bottom pill) behind flip modal; legacy top chrome hidden.
- **v417:** **Bottom pill restore** — remove legacy segmented navbar CSS that overrode v407 pill after v416.
- **v418:** **Borderless bottom pill** — reset global `.controls` box; vertical divider between status and actions.
- **v419:** **How to Play open slide on Puzzle** — closed shelf stays in layout (no `display:none`); layout flush before open class.
- **v420:** **How to Play Puzzle slide fix** — panel lives in `#practice-table-scene` (no reparent); `transition:none` priming + double-rAF open; transform-only transition.
- **v421:** **How to Play drawer animations** — visibility delay on close; `.rules-panel-priming` for Puzzle open; backdrop + panel teardown synced (380ms).
- **v422:** **How to Play WAAPI open** — Web Animations API for drawer + backdrop open (Puzzle-safe); CSS transitions kept for close.
- **v423:** **How to Play single open** — settle WAAPI end state without re-triggering CSS slide (commitStyles + transition:none handoff).
- **v424:** **How to Play WAAPI refactor** — single animation owner for open + close; removed priming/CSS transition stack.
- **v425:** **Puzzle open WAAPI paint** — prime off-screen with `visibility: visible`; transform-only keyframes; double-rAF before open on Puzzle.
- **v426:** **How to Play Puzzle open fix** — mount drawer on `document.body` (escape `#practice-table-scene` overflow); conditional setup-tray close; Puzzle layout settle (4 rAF + relayout) before open WAAPI; `will-change` during animation.
- **v427:** **How to Play Puzzle open animation** — skip board relayout during drawer open; block `lockBoardGeometry`/tray sync while drawer open/animating; pixel `translateX` WAAPI keyframes; extra Puzzle paint frames before open.
- **v428:** **Practice iPad landscape** — full-bleed `#practice-table-scene` (drop 840px letterbox); height-driven `--practice-board-group-max`; vertically center play cluster; landscape board budget in JS; smaller dealer on landscape.
- **v429:** **Practice landscape spacing** — restore head/seat gaps; reduce board tuck + host overlap; arm behind board on landscape; flex-start play cluster; 280px chrome reserve + 24px seat clearance in JS.
- **v430:** **Practice landscape tuck + trays** — portrait tuck tokens (28/36); z-index sandwich (torso/board/head); arm raised + scaled; stage/pill inset; tray stretch + board-wrap height sync; puzzle landscape tray height fix.
- **v431:** **Landscape pill inset + Puzzle scale** — min frame insets (28/32px); stage-top/seat margins; chrome reserve 360px; Puzzle drops landscape cell cap + shrink loop; tray height from captures row; board-wrap stretch.
- **v432:** **Decouple pill inset from board budget** — remove min frame insets; chrome reserve 320 (checkers/four) / 300 (puzzle); seat clearance 8 vs 24; tray height from board-wrap; keep pill CSS margins; puzzle tuck 32/40.
- **v433:** **Puzzle landscape Checkers-sized board** — cell from Checkers ref (`refCell × 8 / cols`); practice puzzle uses 112px tray budget (not 224); disable `--puzzle-landscape-scale` shrink; chrome reserve 320 + seat clearance 8 aligned with checkers; tuck 40/44; tray columns from `--practice-puzzle-tray-column-px`.
- **v434:** **Puzzle landscape Puffly alignment** — arm moved to torso layer (behind board z6); puzzle tuck moderated to 32/36; puzzle arm raised/scaled; `syncPracticeTablePufflyBoardAnchor()` centers dealer on puzzle board via `--practice-puffly-shift-x`.
- **v435:** **Puzzle landscape connected arm** — arm restored to host (in front of board); Checkers landscape arm tuning (`scale(0.88)`); puzzle `translateY(-8px)` clears grid; puzzle uses default landscape tuck 28/36; keep board-anchor shift; puzzle play-cluster `overflow: visible`.
- **v436:** **Puzzle landscape arm portrait calibration** — arm `top: 19%` dealer + `translateY(2px)`; puzzle tuck/host overlap match portrait (30/40); hand nearly touches board top edge.
- **v437:** **Puzzle landscape vertical fit + arm gap** — chrome reserve 372px + seat clearance 16px; shrink cell loop on `.board-and-captures` bottom; `syncPracticeTablePufflyArmGap()` targets 6px hand-to-board gap via `--practice-puffly-arm-offset-y`; revert play-cluster overflow visible; puzzle seat-gap 20px.
- **v438:** **Fix v437 tray collapse** — shrink loop uses board bottom (not captures) + MIN_TOUCH_CELL_PX floor; sync tray heights from board element in loop; puzzle landscape tray height from `#board`; puzzle `align-self: start` on wrap/trays; chrome reserve 340px.
- **v439:** **Puzzle landscape arm portrait parity** — arm `top: 19.7%` (47/238), no `scale(0.88)`; head `bottom: 62.2%`; capped arm gap sync (+4px down / -12px up).
- **v440:** **Puzzle landscape unified body lift** — `--practice-puffly-shift-y` on torso + host (default -8px); `syncPracticeTablePufflyBodyLift()` lifts whole frame up to -16px when arm overlaps board; remove arm-only offset.
- **v441:** **Puzzle body lift +6px** — baseline `-14px`, max `-22px`, arm-board gap target `10px`.
- **v442:** **Mini Puzzle landscape centering** — `puzzle-grid-mini` uses portrait-parity grid (`width: 100%`, `1fr` center column); `syncPracticeTablePufflyBoardAnchor()` aligns Puffly to `.board-and-captures` center (trays + board as one unit).
- **v443:** **Fix Mini landscape board shrink** — center column `auto` (not `minmax(0, 1fr)`); `board-wrap` `max-width: none` + `min-width: max-content`; `#board.puzzle-board` `min-width: max-content`.
- **v444:** **Mini landscape unified centering** — drop `width: 100%` mini grid hack; use same `fit-content` + `margin: auto` as classic/mega; keep shrink guards; Puffly anchor targets `#board` center (not `.board-and-captures`).
- **v445:** **Mini landscape JS stage-center** — `syncPracticeTablePuzzleMiniLandscapeGroupCenter()` translates `.board-and-captures` to `#practice-stage` center; runs before Puffly board anchor; clears on non-mini/landscape.
- **v446:** **Mini landscape scene-center via CSS var** — `--practice-mini-group-shift-x` on `.board-and-captures` (mini only); measure vs `#practice-table-scene` center; guard on `rows === 2`; double-rAF layout pass before Puffly anchor.
- **v447:** **Unified mini play-unit shift** — `--practice-mini-group-shift-x` on `#practice-play-cluster`; shifts `#game-board-matrix` + Puffly torso/host together; gap/seat/board measurement; torso-based Puffly fine-tune; `window.pufflyDebugMiniLandscapeCenter()`.
- **v448:** **Fix mini arm behind board** — move group `translateX` from `#game-board-matrix` to `.board-and-captures` (preserve v447 centering + arm z-index sandwich).
- **v449:** **Mini arm z-index + vertical gap** — board shift via `position: relative; left:` (no transform); mini tuck 16/20px; mini body-lift up to −38px.
- **v450:** **Orientation relayout reset** — `resetPracticeTableOrientationLayoutState()` clears puffly/puzzle/tray/footprint inline state; triple-pass relayout on `orientationchange`; generation guard on deferred puzzle Puffly layout.
- **v451:** **Orientation geometry hard reset** — clear `#board` inline px sizes; reset before each orientation pass; suppress `resize` relayout 500ms post-rotation; `innerWidth > innerHeight` orientation detect; portrait budget from stage/scene not polluted wrap width.
- **v452:** **Checkers landscape P→L fix** — drop `max-width: 100%` / 352px min in landscape; inline `max-width: none`; tray height from `#board`; landscape width budget capped via scene/viewport/group max.
- **v453:** **Four-in-a-Row landscape P→L fix** — scope height-budget group cap to Checkers only; Four uses full scene width minus trays; `applyPracticeTableFourLandscapeBoardStyles()` + landscape CSS `max-width: none`; tray height from `#board` in landscape.

Current builds: `CLIENT_BUILD` / `GUEST_BUILD` **453**, `app.js?v=453`, `styles.css?v=125`, `practice-table.css?v=121`.

## Legacy test PWAs (ignore)

Do not use for this regression pass:

- `test.html` / PlayPufflyTest
- `skeleton.html` / Puffly Skeleton

Use **PlayPuffly** only (`manifest.json` on `home.html`).
