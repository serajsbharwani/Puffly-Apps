# iPhone Checkers (Clean Project)

A standalone, iPhone-first checkers app rebuilt from the original requirements docs.

## Run

From the repo root:

1. Start static-only mode (Puffly mode and local pass-and-play):
   - `python3 -m http.server 8002`
2. Open:
   - `http://localhost:8002/iphone-checkers/`

## Remote Friend Mode

For room-based remote friend play, start the multiplayer API server instead:

1. `python3 multiplayer_server.py 8002`
2. Open:
   - `http://localhost:8002/iphone-checkers/`
3. In the app:
   - Choose a game from the top selector (`Checkers`, `Four-in-a-Row`, `Puzzle`)
   - Switch to `Play with a Friend`
   - One player taps `Create & Invite` and shares the invite link
   - Friend opens the invite link to auto-join
   - Use `Leave Room` to disconnect and free the slot
   - Tap `Join Voice` for audio chat and use avatar speaking indicators
   - Share URL on same network or over a reachable host setup

Notes:

- This is a lightweight room server for friendly play and prototyping.
- Room state is memory-only and resets when the server restarts.
- If you run `python3 -m http.server`, the friend mode API buttons will fail (expected).

## Engine Tests

- `node ./iphone-checkers/src/engine.test.mjs`

Expected:

- `All iPhone engine tests passed.`
