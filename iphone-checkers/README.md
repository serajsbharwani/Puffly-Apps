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
   - Switch to `Play with a Friend`
   - One player taps `Create Room`
   - Other player enters the room code and taps `Join Room`
   - Use `Leave Room` to disconnect and free the slot
   - Use room chat (`BLUE` / `GREEN`) during play
   - Use `Mute Chat` and unread badge cues as needed
   - Share URL on same network or over a reachable host setup

Notes:

- This is a lightweight room server for friendly play and prototyping.
- Room state is memory-only and resets when the server restarts.
- If you run `python3 -m http.server`, the friend mode API buttons will fail (expected).

## Engine Tests

- `node ./iphone-checkers/src/engine.test.mjs`

Expected:

- `All iPhone engine tests passed.`
