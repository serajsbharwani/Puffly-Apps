# iPhone Checkers (PlayPuffly)

Unified PWA for **Practice** and **Play with a Friend** (Checkers, Four-in-a-Row, Puzzle). Test baseline: **v381** — see `TEST_BUILD.md`.

## Run

From the repo root:

1. Start static-only mode (Practice / local pass-and-play):
   - `python3 -m http.server 8002`
2. Open:
   - `http://localhost:8002/iphone-checkers/`

For Mac + iPad testing over Cloudflare tunnel, use `python3 multiplayer_server.py 8002` and the URLs in `TEST_BUILD.md` (`https://dev.playpuffly.org/...`).

## Remote Friend Mode

For room-based remote friend play, start the multiplayer API server:

1. `python3 multiplayer_server.py 8002`
2. Open the app (PWA or browser).
3. In the app:
   - Choose a game from the top selector (`Checkers`, `Four-in-a-Row`, `Puzzle`)
   - Switch to **Play with a Friend**
   - Host taps **OPEN GAME ROOM** (welcome voice plays here), then **INVITE FRIEND** and shares the Messages link
   - Guest opens the invite link in Safari → auto-attach via `guest-join.html`
   - Use **Leave Room** to disconnect
   - **Voice Chat** in the sidebar for audio chat and avatar speaking indicators

Notes:

- Lightweight room server for friendly play; memory-only state (resets on server restart).
- Plain `python3 -m http.server` will not serve friend API (expected).

## PWA install

Use `install.html` or `index.html?source=pwa&tableUi=1` — manifest `start_url` includes the same flags. Verify `window.pufflyClientBuild === 381` after load.

## Tests

From `iphone-checkers/`:

```bash
node ./src/engine.test.mjs
node ./src/voicePhrases.test.mjs
```

Or `npm test` if npm is on your PATH.

Expected:

- `All iPhone engine tests passed.`
- `voicePhrases: … clips, … phrases OK`

Practice voice lines are defined in `src/voicePhrases.js`. After changing phrases or `assets/voice/*.wav`, run the voice test before deploying.

## GitHub Actions

On push/PR to `main` or `mobile-compat-v1`, when `iphone-checkers/` changes, the workflow `.github/workflows/iphone-checkers-tests.yml` runs both tests above.
