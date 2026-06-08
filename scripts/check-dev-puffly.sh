#!/usr/bin/env bash
# Health check for https://dev.playpuffly.org → local multiplayer_server.py
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${PORT:-8002}"
ORIGIN="http://127.0.0.1:${PORT}"
PUBLIC="https://dev.playpuffly.org"

echo "=== Puffly dev tunnel health (${PUBLIC}) ==="
echo

# 1. Local game server
if curl -sf -o /dev/null --max-time 3 "${ORIGIN}/iphone-checkers/"; then
  echo "[OK] Local server responds at ${ORIGIN}/iphone-checkers/"
  health="$(curl -sf --max-time 3 "${ORIGIN}/api/health" 2>/dev/null || echo "")"
  if echo "${health}" | grep -q puzzleFlipAlternation; then
    echo "[OK] Multiplayer API supports alternating puzzle flip (restart server if this was missing)"
    create_sample="$(curl -sf --max-time 3 -X POST "${ORIGIN}/api/rooms/create" \
      -H 'Content-Type: application/json' \
      -d '{"gameType":"puzzle","puzzleDifficulty":"medium"}' 2>/dev/null || echo "")"
    if echo "${create_sample}" | grep -q 'puzzleFlipTurn'; then
      echo "[OK] Puzzle rooms expose puzzleFlipTurn on create (flip alternation enabled)"
    else
      echo "[FAIL] Puzzle create response missing puzzleFlipTurn — stop and restart: python3 multiplayer_server.py ${PORT}"
    fi
  else
    echo "[FAIL] Old multiplayer_server.py still running (no /api/health puzzleFlipAlternation)"
    echo "       Stop port ${PORT} and restart: python3 multiplayer_server.py ${PORT}"
  fi
  reclaim_code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 3 -X POST "${ORIGIN}/api/rooms/reclaim-guest" \
    -H 'Content-Type: application/json' -d '{"roomCode":"ZZZZ"}' 2>/dev/null || echo 000)"
  if [ "${reclaim_code}" = "404" ]; then
    echo "[FAIL] /api/rooms/reclaim-guest missing — restart: python3 multiplayer_server.py ${PORT}"
  elif [ "${reclaim_code}" = "400" ] || [ "${reclaim_code}" = "500" ]; then
    echo "[OK] /api/rooms/reclaim-guest is registered (iPad can reclaim Green after slow join)"
  else
    echo "[?] /api/rooms/reclaim-guest returned HTTP ${reclaim_code}"
  fi
else
  echo "[FAIL] Nothing serving ${ORIGIN}/iphone-checkers/"
  echo "       Start from repo root: python3 multiplayer_server.py ${PORT}"
  if lsof -ti ":${PORT}" >/dev/null 2>&1; then
    echo "       Port ${PORT} is in use — stop the old process or use: lsof -ti :${PORT} | xargs kill"
  fi
fi

# 2. Named tunnel connector (dev-laptop)
if pgrep -f "cloudflared tunnel run" >/dev/null 2>&1; then
  echo "[OK] Named Cloudflare tunnel connector is running"
  if command -v cloudflared >/dev/null 2>&1; then
    cloudflared tunnel list 2>/dev/null | grep -E "NAME|dev-laptop" || true
  fi
else
  echo "[FAIL] Named tunnel not running (dev.playpuffly.org will show 502/503)"
  echo "       In Cloudflare Zero Trust → Networks → Tunnels → dev-laptop → copy the run command, e.g.:"
  echo "       cloudflared tunnel run --token <your-token>"
fi

# 3. Stale quick tunnel (does NOT power dev.playpuffly.org)
if pgrep -f "\.tools/cloudflared tunnel" >/dev/null 2>&1; then
  echo "[WARN] Old trycloudflare quick tunnel is still running — stop it:"
  echo "       pkill -f '.tools/cloudflared tunnel'"
fi

# 4. Public hostname (unauthenticated: Access redirect is normal)
code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "${PUBLIC}/iphone-checkers/" || echo 000)"
case "${code}" in
  200) echo "[OK] Public URL returns HTTP 200 (no Access gate on this path)" ;;
  302) echo "[OK] Public URL returns HTTP 302 → Cloudflare Access login (tunnel is up)" ;;
  503|502)
    echo "[FAIL] Public URL returns HTTP ${code} — Cloudflare cannot reach your Mac"
    echo "       Fix checklist:"
    echo "       1. Keep this Mac awake; VPN off for testing"
    echo "       2. python3 multiplayer_server.py ${PORT}"
    echo "       3. cloudflared tunnel run --token … (named tunnel dev-laptop)"
    echo "       4. Zero Trust → Tunnels → dev-laptop → Public Hostname → Service:"
    echo "          http://127.0.0.1:${PORT}  (not https, not port 8000)"
    ;;
  *) echo "[?] Public URL returned HTTP ${code}" ;;
esac

echo
echo "Open in browser (sign in with Access if prompted):"
echo "  ${PUBLIC}/iphone-checkers/index.html?cb=326"
echo "  (Hard-refresh iPad after deploy; invite links use /join/ROOMCODE)"
