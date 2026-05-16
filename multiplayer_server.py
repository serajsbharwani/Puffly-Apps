#!/usr/bin/env python3
"""Static + multiplayer API server for iphone-checkers.

Usage:
  python3 multiplayer_server.py 8002
"""

from __future__ import annotations

import json
import os
import random
import string
import threading
import time
from dataclasses import dataclass
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any, Dict, Optional
from urllib.parse import parse_qs, urlparse


ROOM_TTL_SECONDS = 6 * 60 * 60
MAX_ROOMS = 500

ROOT_DIR = Path(__file__).resolve().parent
ROOMS_LOCK = threading.Lock()


def is_dark_square(row: int, col: int) -> bool:
  return (row + col) % 2 == 1


def create_initial_state() -> Dict[str, Any]:
  board: list[list[Optional[Dict[str, Any]]]] = [[None for _ in range(8)] for _ in range(8)]
  next_id = 1
  for row in range(8):
    for col in range(8):
      if not is_dark_square(row, col):
        continue
      if row <= 2:
        board[row][col] = {"id": f"piece-{next_id}", "player": "dark", "king": False}
        next_id += 1
      elif row >= 5:
        board[row][col] = {"id": f"piece-{next_id}", "player": "light", "king": False}
        next_id += 1
  return {
    "board": board,
    "currentPlayer": "dark",
    "selectedSquare": None,
    "forcedPiece": None,
    "winner": None,
    "lastMove": None,
  }


def random_code() -> str:
  alphabet = string.ascii_uppercase + string.digits
  return "".join(random.choice(alphabet) for _ in range(6))


def now_ts() -> float:
  return time.time()


@dataclass
class Player:
  player_id: str
  color: str


class RoomStore:
  def _room_meta(self, room: Dict[str, Any]) -> Dict[str, Any]:
    player_count = len(room["players"])
    return {
      "playerCount": player_count,
      "ready": player_count >= 2,
      "voiceParticipants": room["voice"]["participants"],
    }

  def __init__(self) -> None:
    self.rooms: Dict[str, Dict[str, Any]] = {}

  def _cleanup(self) -> None:
    cutoff = now_ts() - ROOM_TTL_SECONDS
    stale = [code for code, room in self.rooms.items() if room["updated_at"] < cutoff]
    for code in stale:
      self.rooms.pop(code, None)

  def _new_player_id(self) -> str:
    return f"player-{int(now_ts() * 1000)}-{random.randint(1000, 9999)}"

  def create_room(self) -> Dict[str, Any]:
    self._cleanup()
    if len(self.rooms) >= MAX_ROOMS:
      raise ValueError("Server is busy. Please try again.")
    room_code = random_code()
    while room_code in self.rooms:
      room_code = random_code()
    player_id = self._new_player_id()
    room = {
      "code": room_code,
      "state": create_initial_state(),
      "version": 0,
      "messages": [],
      "nextMessageId": 1,
      "chatRate": {},
      "voice": {
        "participants": {"dark": False, "light": False},
        "signals": {"dark": [], "light": []},
      },
      "players": {player_id: Player(player_id=player_id, color="dark")},
      "updated_at": now_ts(),
    }
    self.rooms[room_code] = room
    return self._session_payload(room, player_id)

  def join_room(self, room_code: str) -> Dict[str, Any]:
    self._cleanup()
    room = self.rooms.get(room_code)
    if not room:
      raise ValueError("Room not found.")
    colors = {p.color for p in room["players"].values()}
    if "light" in colors:
      raise ValueError("Room already has two players.")
    player_id = self._new_player_id()
    room["players"][player_id] = Player(player_id=player_id, color="light")
    room["updated_at"] = now_ts()
    return self._session_payload(room, player_id)

  def get_state(self, room_code: str) -> Dict[str, Any]:
    room = self.rooms.get(room_code)
    if not room:
      raise ValueError("Room not found.")
    room["updated_at"] = now_ts()
    return {
      "state": room["state"],
      "version": room["version"],
      "messages": room["messages"],
      **self._room_meta(room),
    }

  def apply_move(
    self,
    room_code: str,
    player_id: str,
    expected_version: int,
    next_state: Dict[str, Any],
  ) -> Dict[str, Any]:
    room = self.rooms.get(room_code)
    if not room:
      raise ValueError("Room not found.")
    player: Optional[Player] = room["players"].get(player_id)
    if not player:
      raise ValueError("Player is not in this room.")
    if room["version"] != expected_version:
      raise ValueError("Room state changed. Please resync.")
    current_turn = room["state"].get("currentPlayer")
    if current_turn != player.color:
      raise ValueError("It's not your turn yet.")
    room["state"] = next_state
    room["version"] += 1
    room["updated_at"] = now_ts()
    return {
      "state": room["state"],
      "version": room["version"],
      "messages": room["messages"],
      **self._room_meta(room),
    }

  def restart_room(self, room_code: str, player_id: str) -> Dict[str, Any]:
    room = self.rooms.get(room_code)
    if not room:
      raise ValueError("Room not found.")
    if player_id not in room["players"]:
      raise ValueError("Player is not in this room.")
    room["state"] = create_initial_state()
    room["version"] += 1
    room["updated_at"] = now_ts()
    return {
      "state": room["state"],
      "version": room["version"],
      "messages": room["messages"],
      **self._room_meta(room),
    }

  def post_chat(self, room_code: str, player_id: str, text: str) -> Dict[str, Any]:
    room = self.rooms.get(room_code)
    if not room:
      raise ValueError("Room not found.")
    player: Optional[Player] = room["players"].get(player_id)
    if not player:
      raise ValueError("Player is not in this room.")
    clean_text = str(text).strip()
    if not clean_text:
      raise ValueError("Message cannot be empty.")
    if len(clean_text) > 200:
      raise ValueError("Message is too long.")
    now = now_ts()
    rate = room["chatRate"].setdefault(player_id, {"times": [], "lastText": "", "lastAt": 0.0})
    rate["times"] = [stamp for stamp in rate["times"] if now - stamp < 10]
    if rate["times"] and now - rate["times"][-1] < 0.9:
      raise ValueError("Please slow down your chat messages.")
    if len(rate["times"]) >= 6:
      raise ValueError("Too many messages too quickly. Please wait a moment.")
    if clean_text.lower() == str(rate["lastText"]).lower() and now - float(rate["lastAt"]) < 2.5:
      raise ValueError("Please avoid repeating the same message.")
    rate["times"].append(now)
    rate["lastText"] = clean_text
    rate["lastAt"] = now
    message = {
      "id": room["nextMessageId"],
      "color": player.color,
      "text": clean_text,
      "ts": int(now),
    }
    room["nextMessageId"] += 1
    room["messages"].append(message)
    if len(room["messages"]) > 200:
      room["messages"] = room["messages"][-200:]
    room["updated_at"] = now_ts()
    return {
      "messages": room["messages"],
      **self._room_meta(room),
    }

  def leave_room(self, room_code: str, player_id: str) -> Dict[str, Any]:
    room = self.rooms.get(room_code)
    if not room:
      raise ValueError("Room not found.")
    player: Optional[Player] = room["players"].get(player_id)
    if not player:
      raise ValueError("Player is not in this room.")
    room["players"].pop(player_id, None)
    room["chatRate"].pop(player_id, None)
    room["voice"]["participants"][player.color] = False
    room["voice"]["signals"][player.color] = []
    if not room["players"]:
      self.rooms.pop(room_code, None)
      return {"left": True}

    # Keep room consistent for the remaining player.
    only_player = next(iter(room["players"].values()))
    only_player.color = "dark"
    room["state"] = create_initial_state()
    room["messages"] = []
    room["nextMessageId"] = 1
    room["chatRate"] = {only_player.player_id: {"times": [], "lastText": "", "lastAt": 0.0}}
    room["voice"] = {
      "participants": {"dark": False, "light": False},
      "signals": {"dark": [], "light": []},
    }
    room["version"] += 1
    room["updated_at"] = now_ts()
    return {
      "left": True,
      "state": room["state"],
      "version": room["version"],
      "messages": room["messages"],
      **self._room_meta(room),
    }

  def voice_join(self, room_code: str, player_id: str) -> Dict[str, Any]:
    room = self.rooms.get(room_code)
    if not room:
      raise ValueError("Room not found.")
    player: Optional[Player] = room["players"].get(player_id)
    if not player:
      raise ValueError("Player is not in this room.")
    room["voice"]["participants"][player.color] = True
    room["updated_at"] = now_ts()
    return {
      "joined": True,
      **self._room_meta(room),
    }

  def voice_leave(self, room_code: str, player_id: str) -> Dict[str, Any]:
    room = self.rooms.get(room_code)
    if not room:
      raise ValueError("Room not found.")
    player: Optional[Player] = room["players"].get(player_id)
    if not player:
      raise ValueError("Player is not in this room.")
    room["voice"]["participants"][player.color] = False
    room["voice"]["signals"][player.color] = []
    room["updated_at"] = now_ts()
    return {
      "leftVoice": True,
      **self._room_meta(room),
    }

  def voice_signal(
    self,
    room_code: str,
    player_id: str,
    signal_type: str,
    payload: Dict[str, Any],
    target_color: Optional[str] = None,
  ) -> Dict[str, Any]:
    room = self.rooms.get(room_code)
    if not room:
      raise ValueError("Room not found.")
    player: Optional[Player] = room["players"].get(player_id)
    if not player:
      raise ValueError("Player is not in this room.")
    if signal_type not in {"offer", "answer", "ice"}:
      raise ValueError("Unsupported signal type.")
    recipient = target_color or ("light" if player.color == "dark" else "dark")
    if recipient not in {"dark", "light"}:
      raise ValueError("Invalid signal target.")
    room["voice"]["signals"][recipient].append(
      {
        "type": signal_type,
        "fromColor": player.color,
        "payload": payload or {},
      }
    )
    if len(room["voice"]["signals"][recipient]) > 60:
      room["voice"]["signals"][recipient] = room["voice"]["signals"][recipient][-60:]
    room["updated_at"] = now_ts()
    return {"queued": True}

  def voice_poll(self, room_code: str, player_id: str) -> Dict[str, Any]:
    room = self.rooms.get(room_code)
    if not room:
      raise ValueError("Room not found.")
    player: Optional[Player] = room["players"].get(player_id)
    if not player:
      raise ValueError("Player is not in this room.")
    queue = room["voice"]["signals"][player.color]
    signals = list(queue)
    room["voice"]["signals"][player.color] = []
    room["updated_at"] = now_ts()
    return {
      "signals": signals,
      **self._room_meta(room),
    }

  def _session_payload(self, room: Dict[str, Any], player_id: str) -> Dict[str, Any]:
    player: Player = room["players"][player_id]
    return {
      "roomCode": room["code"],
      "playerId": player.player_id,
      "color": player.color,
      "state": room["state"],
      "version": room["version"],
      "messages": room["messages"],
      **self._room_meta(room),
    }


STORE = RoomStore()


class Handler(SimpleHTTPRequestHandler):
  def __init__(self, *args: Any, **kwargs: Any) -> None:
    super().__init__(*args, directory=str(ROOT_DIR), **kwargs)

  def do_GET(self) -> None:  # noqa: N802
    parsed = urlparse(self.path)
    if parsed.path == "/api/rooms/state":
      params = parse_qs(parsed.query)
      room_code = (params.get("roomCode") or [""])[0].strip().upper()
      self._json_endpoint(lambda: STORE.get_state(room_code))
      return
    if parsed.path == "/api/rooms/voice/poll":
      params = parse_qs(parsed.query)
      room_code = (params.get("roomCode") or [""])[0].strip().upper()
      player_id = (params.get("playerId") or [""])[0].strip()
      self._json_endpoint(lambda: STORE.voice_poll(room_code, player_id))
      return
    super().do_GET()

  def do_POST(self) -> None:  # noqa: N802
    parsed = urlparse(self.path)
    if not parsed.path.startswith("/api/"):
      self.send_error(HTTPStatus.NOT_FOUND, "Not found")
      return

    content_length = int(self.headers.get("Content-Length", "0"))
    raw = self.rfile.read(content_length) if content_length else b"{}"
    try:
      payload = json.loads(raw.decode("utf-8") or "{}")
    except json.JSONDecodeError:
      self._send_json({"error": "Invalid JSON payload."}, HTTPStatus.BAD_REQUEST)
      return

    if parsed.path == "/api/rooms/create":
      self._json_endpoint(STORE.create_room)
      return
    if parsed.path == "/api/rooms/join":
      room_code = str(payload.get("roomCode", "")).strip().upper()
      self._json_endpoint(lambda: STORE.join_room(room_code))
      return
    if parsed.path == "/api/rooms/move":
      room_code = str(payload.get("roomCode", "")).strip().upper()
      player_id = str(payload.get("playerId", "")).strip()
      expected_version = int(payload.get("expectedVersion", -1))
      next_state = payload.get("nextState")
      self._json_endpoint(
        lambda: STORE.apply_move(
          room_code=room_code,
          player_id=player_id,
          expected_version=expected_version,
          next_state=next_state,
        )
      )
      return
    if parsed.path == "/api/rooms/restart":
      room_code = str(payload.get("roomCode", "")).strip().upper()
      player_id = str(payload.get("playerId", "")).strip()
      self._json_endpoint(lambda: STORE.restart_room(room_code, player_id))
      return
    if parsed.path == "/api/rooms/leave":
      room_code = str(payload.get("roomCode", "")).strip().upper()
      player_id = str(payload.get("playerId", "")).strip()
      self._json_endpoint(lambda: STORE.leave_room(room_code, player_id))
      return
    if parsed.path == "/api/rooms/chat":
      room_code = str(payload.get("roomCode", "")).strip().upper()
      player_id = str(payload.get("playerId", "")).strip()
      text = str(payload.get("text", ""))
      self._json_endpoint(lambda: STORE.post_chat(room_code, player_id, text))
      return
    if parsed.path == "/api/rooms/voice/join":
      room_code = str(payload.get("roomCode", "")).strip().upper()
      player_id = str(payload.get("playerId", "")).strip()
      self._json_endpoint(lambda: STORE.voice_join(room_code, player_id))
      return
    if parsed.path == "/api/rooms/voice/leave":
      room_code = str(payload.get("roomCode", "")).strip().upper()
      player_id = str(payload.get("playerId", "")).strip()
      self._json_endpoint(lambda: STORE.voice_leave(room_code, player_id))
      return
    if parsed.path == "/api/rooms/voice/signal":
      room_code = str(payload.get("roomCode", "")).strip().upper()
      player_id = str(payload.get("playerId", "")).strip()
      signal_type = str(payload.get("signalType", "")).strip().lower()
      signal_payload = payload.get("payload") or {}
      target_color_raw = payload.get("targetColor")
      target_color = str(target_color_raw).strip().lower() if target_color_raw else None
      self._json_endpoint(
        lambda: STORE.voice_signal(
          room_code=room_code,
          player_id=player_id,
          signal_type=signal_type,
          payload=signal_payload,
          target_color=target_color,
        )
      )
      return

    self.send_error(HTTPStatus.NOT_FOUND, "Not found")

  def _json_endpoint(self, fn):
    with ROOMS_LOCK:
      try:
        data = fn()
      except ValueError as err:
        self._send_json({"error": str(err)}, HTTPStatus.BAD_REQUEST)
        return
      except Exception:
        self._send_json({"error": "Internal server error."}, HTTPStatus.INTERNAL_SERVER_ERROR)
        return
    self._send_json(data, HTTPStatus.OK)

  def _send_json(self, data: Dict[str, Any], status: HTTPStatus) -> None:
    encoded = json.dumps(data).encode("utf-8")
    self.send_response(status)
    self.send_header("Content-Type", "application/json; charset=utf-8")
    self.send_header("Content-Length", str(len(encoded)))
    self.end_headers()
    self.wfile.write(encoded)


def main() -> None:
  import sys

  port_arg = sys.argv[1] if len(sys.argv) > 1 else os.environ.get("PORT", "8002")
  port = int(port_arg)
  server = ThreadingHTTPServer(("0.0.0.0", port), Handler)
  print(f"Serving iphone-checkers + multiplayer API at http://0.0.0.0:{port}")
  server.serve_forever()


if __name__ == "__main__":
  main()

