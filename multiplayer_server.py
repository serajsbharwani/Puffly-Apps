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
SUPPORTED_GAMES = {"checkers", "fourinarow", "puzzle"}

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
    "starterFlipDone": False,
    "starterPlayer": None,
    "preFlipSetupReady": False,
  }


def create_fourinarow_initial_state() -> Dict[str, Any]:
  grid: list[list[Optional[str]]] = [[None for _ in range(7)] for _ in range(6)]
  return {
    "grid": grid,
    "currentPlayer": "dark",
    "winner": None,
    "draw": False,
    "selectedSquare": None,
    "forcedPiece": None,
    "lastMove": None,
    "winningLine": [],
    "starterFlipDone": False,
    "starterPlayer": None,
    "preFlipSetupReady": False,
  }


PUZZLE_DIFFICULTY_GRID = {"easy": 2, "medium": 4, "hard": 5}
PUZZLE_ALLOWED_GRID_SIZES = {2, 4, 5}


def normalize_puzzle_difficulty(difficulty: Optional[str]) -> str:
  normalized = str(difficulty or "medium").strip().lower()
  if normalized in PUZZLE_DIFFICULTY_GRID:
    return normalized
  return "medium"


def create_puzzle_initial_state(difficulty: str = "medium", flip_turn: str = "dark") -> Dict[str, Any]:
  grid_size = PUZZLE_DIFFICULTY_GRID.get(normalize_puzzle_difficulty(difficulty), 4)
  if grid_size not in PUZZLE_ALLOWED_GRID_SIZES:
    grid_size = 4
  piece_count = grid_size * grid_size
  dark_count = piece_count // 2
  piece_indices = list(range(piece_count))
  random.shuffle(piece_indices)
  pieces = []
  for order, idx in enumerate(piece_indices):
    pieces.append(
      {
        "id": f"pz-{idx + 1}",
        "correctRow": idx // grid_size,
        "correctCol": idx % grid_size,
        "owner": "dark" if order < dark_count else "light",
        "placed": False,
        "placedRow": None,
        "placedCol": None,
        "locked": False,
      }
    )
  normalized_flip = flip_turn if flip_turn in {"dark", "light"} else "dark"
  return {
    "rows": grid_size,
    "cols": grid_size,
    "pieces": pieces,
    "currentPlayer": normalized_flip,
    "puzzleFlipTurn": normalized_flip,
    "selectedSquare": None,
    "forcedPiece": None,
    "winner": None,
    "draw": False,
    "lastMove": None,
    "starterFlipDone": False,
    "starterPlayer": None,
    "preFlipSetupReady": False,
  }


def puzzle_difficulty_from_state(state: Optional[Dict[str, Any]]) -> str:
  if not isinstance(state, dict):
    return "medium"
  rows = state.get("rows")
  if rows == 2:
    return "easy"
  if rows == 5:
    return "hard"
  return "medium"


def is_fresh_puzzle_pre_flip_state(state: Optional[Dict[str, Any]]) -> bool:
  """True when the board is already reset and waiting for the coin flip."""
  if not isinstance(state, dict) or state.get("starterFlipDone"):
    return False
  pieces = state.get("pieces")
  if not isinstance(pieces, list) or not pieces:
    return False
  return all(not piece.get("placed") for piece in pieces)


def is_puzzle_complete(state: Optional[Dict[str, Any]]) -> bool:
  if not isinstance(state, dict):
    return False
  pieces = state.get("pieces")
  if not isinstance(pieces, list) or not pieces:
    return False
  return all(piece.get("placed") for piece in pieces)


def puzzle_flip_turn_for_round(puzzle_round: int) -> str:
  """Odd rounds: Blue flips first. Even rounds: Green flips first."""
  normalized_round = max(1, int(puzzle_round or 1))
  return "dark" if normalized_round % 2 == 1 else "light"


def puzzle_flip_turn_for_room(room: Dict[str, Any]) -> str:
  stored = room.get("puzzleFlipTurn")
  if stored in {"dark", "light"}:
    return stored
  return puzzle_flip_turn_for_round(room.get("puzzleRound") or 1)


def stamp_puzzle_flip_fields(room: Dict[str, Any], state: Optional[Dict[str, Any]]) -> Dict[str, Any]:
  if room.get("gameType") != "puzzle" or not isinstance(state, dict):
    return state or {}
  flip_turn = puzzle_flip_turn_for_room(room)
  stamped = dict(state)
  stamped["puzzleFlipTurn"] = flip_turn
  if not stamped.get("starterFlipDone"):
    stamped["currentPlayer"] = flip_turn
  return stamped


def create_initial_state_for_game(game_type: str, puzzle_difficulty: Optional[str] = None) -> Dict[str, Any]:
  normalized = str(game_type or "checkers").strip().lower()
  if normalized == "connect4":
    normalized = "fourinarow"
  if normalized == "fourinarow":
    return create_fourinarow_initial_state()
  if normalized == "puzzle":
    return create_puzzle_initial_state(puzzle_difficulty or "medium")
  return create_initial_state()


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
    meta: Dict[str, Any] = {
      "playerCount": player_count,
      "ready": player_count >= 2,
      "voiceParticipants": room["voice"]["participants"],
    }
    if room.get("gameType") == "puzzle":
      meta["puzzleDifficulty"] = room.get("puzzleDifficulty") or puzzle_difficulty_from_state(room.get("state"))
      meta["puzzleFlipTurn"] = puzzle_flip_turn_for_room(room)
      meta["puzzleRound"] = int(room.get("puzzleRound") or 1)
    return meta

  def __init__(self) -> None:
    self.rooms: Dict[str, Dict[str, Any]] = {}

  def _cleanup(self) -> None:
    cutoff = now_ts() - ROOM_TTL_SECONDS
    stale = [code for code, room in self.rooms.items() if room["updated_at"] < cutoff]
    for code in stale:
      self.rooms.pop(code, None)

  def _new_player_id(self) -> str:
    return f"player-{int(now_ts() * 1000)}-{random.randint(1000, 9999)}"

  def _reset_room_to_waiting(self, room: Dict[str, Any]) -> None:
    game_type = room.get("gameType", "checkers")
    puzzle_level = room.get("puzzleDifficulty") if game_type == "puzzle" else None
    flip_turn = puzzle_flip_turn_for_room(room) if game_type == "puzzle" else "dark"
    if game_type == "puzzle":
      room["state"] = create_puzzle_initial_state(puzzle_level or "medium", flip_turn=flip_turn)
    else:
      room["state"] = create_initial_state_for_game(game_type)
    room["undoStack"] = []
    room["messages"] = []
    room["nextMessageId"] = 1
    room["chatRate"] = {}
    room["voice"] = {
      "participants": {"dark": False, "light": False},
      "signals": {"dark": [], "light": []},
    }
    room["version"] += 1

  def _prune_players_before_join(self, room: Dict[str, Any], reclaim_host: bool) -> None:
    players: Dict[str, Player] = room["players"]
    if not players:
      return
    host_id = str(room.get("hostPlayerId") or "")
    state = room.get("state") or {}
    if len(players) < 2:
      if reclaim_host and len(players) == 1:
        only = next(iter(players.values()))
        if only.color == "dark" and only.player_id != host_id:
          only.color = "light"
      return

    if state.get("starterFlipDone") and not reclaim_host:
      return

    waiting: Optional[Player] = None
    for player in players.values():
      if player.color == "light":
        waiting = player
        break
    if not waiting:
      for player in players.values():
        if player.player_id != host_id:
          waiting = player
          break
    if not waiting:
      waiting = next(iter(players.values()))
    if waiting.color != "light":
      waiting.color = "light"
    room["players"] = {waiting.player_id: waiting}
    for pid in list(room["chatRate"].keys()):
      if pid != waiting.player_id:
        room["chatRate"].pop(pid, None)
    self._reset_room_to_waiting(room)

  def create_room(self, game_type: str = "checkers", puzzle_difficulty: Optional[str] = None) -> Dict[str, Any]:
    self._cleanup()
    normalized_game = str(game_type or "checkers").strip().lower()
    if normalized_game == "connect4":
      normalized_game = "fourinarow"
    if normalized_game not in SUPPORTED_GAMES:
      raise ValueError("Unsupported game type.")
    if len(self.rooms) >= MAX_ROOMS:
      raise ValueError("Server is busy. Please try again.")
    room_code = random_code()
    while room_code in self.rooms:
      room_code = random_code()
    player_id = self._new_player_id()
    puzzle_level = normalize_puzzle_difficulty(puzzle_difficulty)
    initial_state = (
      create_puzzle_initial_state(puzzle_level, flip_turn="dark")
      if normalized_game == "puzzle"
      else create_initial_state_for_game(normalized_game)
    )
    room = {
      "code": room_code,
      "gameType": normalized_game,
      "state": initial_state,
      "puzzleDifficulty": puzzle_level if normalized_game == "puzzle" else None,
      "puzzleRound": 1 if normalized_game == "puzzle" else None,
      "puzzleFlipTurn": "dark" if normalized_game == "puzzle" else None,
      "version": 0,
      "undoStack": [],
      "messages": [],
      "nextMessageId": 1,
      "chatRate": {},
      "voice": {
        "participants": {"dark": False, "light": False},
        "signals": {"dark": [], "light": []},
      },
      "players": {player_id: Player(player_id=player_id, color="dark")},
      "hostPlayerId": player_id,
      "creatorPlayerId": player_id,
      "hostVacant": False,
      "updated_at": now_ts(),
    }
    self.rooms[room_code] = room
    return self._session_payload(room, player_id)

  def _can_undo_for(self, room: Dict[str, Any], player_id: str) -> bool:
    stack = room.get("undoStack") or []
    return bool(stack and stack[-1].get("by") == player_id)

  def _ensure_room_host_metadata(self, room: Dict[str, Any]) -> None:
    if not room.get("creatorPlayerId") and room.get("hostPlayerId"):
      room["creatorPlayerId"] = room["hostPlayerId"]
    if "hostVacant" not in room:
      room["hostVacant"] = False

  def _balance_two_player_colors(self, room: Dict[str, Any]) -> None:
    """Ensure Blue (dark) + Green (light) when two players are in the room."""
    if len(room["players"]) != 2:
      return
    host_id = str(room.get("hostPlayerId") or room.get("creatorPlayerId") or "")
    if not host_id:
      host_id = next(iter(room["players"].keys()), "")
    by_id = {pid: player for pid, player in room["players"].items()}
    dark_ids = [pid for pid, player in by_id.items() if player.color == "dark"]
    light_ids = [pid for pid, player in by_id.items() if player.color == "light"]
    if len(dark_ids) == 2:
      for pid in dark_ids:
        if pid != host_id:
          by_id[pid].color = "light"
    elif len(light_ids) == 2:
      if host_id in by_id:
        by_id[host_id].color = "dark"
      for pid in light_ids:
        if pid != host_id:
          by_id[pid].color = "light"

  def join_room(
    self,
    room_code: str,
    game_type: Optional[str] = None,
    reclaim_host: bool = False,
  ) -> Dict[str, Any]:
    self._cleanup()
    room = self.rooms.get(room_code)
    if not room:
      raise ValueError("Room not found.")
    self._ensure_room_host_metadata(room)
    # Only reclaim Blue when the host actually left; ignore client reclaimHost otherwise.
    reclaim_host = bool(room.get("hostVacant"))
    if game_type:
      normalized_game = str(game_type).strip().lower()
      if normalized_game == "connect4":
        normalized_game = "fourinarow"
      if normalized_game not in SUPPORTED_GAMES:
        raise ValueError("Unsupported game type.")
      if normalized_game != room.get("gameType", "checkers"):
        raise ValueError("This room is for a different game.")
    state = room.get("state") or {}
    if len(room["players"]) >= 2:
      if state.get("starterFlipDone") and not reclaim_host:
        raise ValueError("Room already has two players.")
      # Guest reopened the invite after the server already has 2/2 (pre-flip).
      # Return the existing Green slot instead of pruning and issuing a new player id.
      if not reclaim_host:
        for pid, player in room["players"].items():
          if player.color == "light":
            self._balance_two_player_colors(room)
            room["updated_at"] = now_ts()
            return self._session_payload(room, pid)
      self._prune_players_before_join(room, reclaim_host=reclaim_host)
    elif reclaim_host and len(room["players"]) == 1:
      only = next(iter(room["players"].values()))
      if only.color == "dark" and room.get("hostVacant"):
        only.color = "light"

    occupied = {player.color for player in room["players"].values()}
    if "dark" in occupied and "light" in occupied:
      raise ValueError("Room already has two players.")
    if reclaim_host:
      if "dark" in occupied:
        for pid, player in list(room["players"].items()):
          if player.color == "dark":
            room["players"].pop(pid, None)
            room["chatRate"].pop(pid, None)
        occupied = {player.color for player in room["players"].values()}
      new_color = "dark"
    else:
      new_color = "light" if "dark" in occupied else "dark"
    player_id = self._new_player_id()
    room["players"][player_id] = Player(player_id=player_id, color=new_color)
    if reclaim_host:
      room["hostPlayerId"] = player_id
      room["hostVacant"] = False
    self._balance_two_player_colors(room)
    room["updated_at"] = now_ts()
    return self._session_payload(room, player_id)

  def reclaim_guest_session(self, room_code: str) -> Dict[str, Any]:
    self._cleanup()
    room = self.rooms.get(room_code)
    if not room:
      raise ValueError("Room not found.")
    self._ensure_room_host_metadata(room)
    for pid, player in room["players"].items():
      if player.color == "light":
        self._balance_two_player_colors(room)
        room["updated_at"] = now_ts()
        return self._session_payload(room, pid)
    raise ValueError("No guest in this room yet. Ask your friend to send a new invite.")

  def reconnect_room(self, room_code: str, player_id: str) -> Dict[str, Any]:
    self._cleanup()
    room = self.rooms.get(room_code)
    if not room:
      raise ValueError("Room not found.")
    self._ensure_room_host_metadata(room)
    if player_id not in room["players"]:
      raise ValueError("Previous player session is no longer available.")
    player: Player = room["players"][player_id]
    creator_id = str(room.get("creatorPlayerId") or "")
    if not room.get("hostVacant") and creator_id and player_id == creator_id and player.color != "dark":
      others_dark = any(p.color == "dark" for pid, p in room["players"].items() if pid != player_id)
      if not others_dark:
        player.color = "dark"
    self._balance_two_player_colors(room)
    room["updated_at"] = now_ts()
    return self._session_payload(room, player_id)

  def get_state(self, room_code: str, player_id: Optional[str] = None) -> Dict[str, Any]:
    room = self.rooms.get(room_code)
    if not room:
      raise ValueError("Room not found.")
    self._ensure_room_host_metadata(room)
    game_type = room.get("gameType", "checkers")
    # Backward-compatible migration for rooms created before game-specific state.
    if game_type == "fourinarow" and not isinstance(room.get("state", {}).get("grid"), list):
      room["state"] = create_initial_state_for_game(game_type)
      room["version"] += 1
    if game_type == "puzzle" and not isinstance(room.get("state", {}).get("pieces"), list):
      flip_turn = puzzle_flip_turn_for_room(room)
      room["state"] = create_puzzle_initial_state(room.get("puzzleDifficulty", "medium"), flip_turn=flip_turn)
      room["version"] += 1
    if game_type == "checkers" and not isinstance(room.get("state", {}).get("board"), list):
      room["state"] = create_initial_state_for_game(game_type)
      room["version"] += 1
    self._balance_two_player_colors(room)
    room["updated_at"] = now_ts()
    payload: Dict[str, Any] = {
      "gameType": game_type,
      "state": stamp_puzzle_flip_fields(room, room["state"]),
      "version": room["version"],
      "messages": room["messages"],
      "hostVacant": bool(room.get("hostVacant")),
      **self._room_meta(room),
    }
    payload["hostPlayerId"] = room.get("hostPlayerId")
    payload["creatorPlayerId"] = room.get("creatorPlayerId")
    if player_id:
      player = room["players"].get(player_id)
      if player:
        payload["yourColor"] = player.color
      payload["canUndo"] = self._can_undo_for(room, player_id)
    return payload

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
    room["undoStack"].append({"state": room["state"], "by": player_id})
    if len(room["undoStack"]) > 20:
      room["undoStack"] = room["undoStack"][-20:]
    room["state"] = stamp_puzzle_flip_fields(room, next_state)
    room["version"] += 1
    room["updated_at"] = now_ts()
    return {
      "state": room["state"],
      "version": room["version"],
      "messages": room["messages"],
      "canUndo": self._can_undo_for(room, player_id),
      **self._room_meta(room),
    }

  def flip_starter(self, room_code: str, player_id: str, winner: str) -> Dict[str, Any]:
    room = self.rooms.get(room_code)
    if not room:
      raise ValueError("Room not found.")
    if player_id not in room["players"]:
      raise ValueError("Player is not in this room.")
    if len(room["players"]) < 2:
      raise ValueError("Waiting for opponent to join.")
    player: Player = room["players"][player_id]
    game_state = room.get("state") or {}
    if game_state.get("starterFlipDone"):
      raise ValueError("Flip already completed.")
    if room.get("gameType") == "puzzle":
      flipper = puzzle_flip_turn_for_room(room)
    else:
      flipper = "dark"
    if player.color != flipper:
      flip_label = "Blue" if flipper == "dark" else "Green"
      raise ValueError(f"Only {flip_label} can flip to start.")
    normalized_winner = str(winner or "").strip().lower()
    if normalized_winner not in {"dark", "light"}:
      raise ValueError("Invalid flip winner.")
    game_state["starterFlipDone"] = True
    game_state["starterPlayer"] = normalized_winner
    game_state["currentPlayer"] = normalized_winner
    game_state["preFlipSetupReady"] = False
    game_state["selectedSquare"] = None
    game_state["forcedPiece"] = None
    game_state["lastMove"] = None
    room["state"] = stamp_puzzle_flip_fields(room, game_state)
    room["version"] += 1
    room["updated_at"] = now_ts()
    return {
      "state": room["state"],
      "version": room["version"],
      "messages": room["messages"],
      **self._room_meta(room),
    }

  def set_puzzle_difficulty(self, room_code: str, player_id: str, puzzle_difficulty: str) -> Dict[str, Any]:
    room = self.rooms.get(room_code)
    if not room:
      raise ValueError("Room not found.")
    player: Optional[Player] = room["players"].get(player_id)
    if not player:
      raise ValueError("Player is not in this room.")
    if room.get("gameType") != "puzzle":
      raise ValueError("This room is not a puzzle game.")
    if player.color != "dark":
      raise ValueError("Only the room host can change puzzle size.")
    game_state = room.get("state") or {}
    level = normalize_puzzle_difficulty(puzzle_difficulty)
    if is_fresh_puzzle_pre_flip_state(game_state):
      flip_turn = puzzle_flip_turn_for_room(room)
    elif is_puzzle_complete(game_state):
      current_flip = puzzle_flip_turn_for_room(room)
      flip_turn = "light" if current_flip == "dark" else "dark"
      room["puzzleRound"] = int(room.get("puzzleRound") or 1) + 1
      room["puzzleFlipTurn"] = flip_turn
    else:
      # Mid-game size switch: fresh board at new size, same flip assignment.
      flip_turn = puzzle_flip_turn_for_room(room)
    room["puzzleDifficulty"] = level
    room["state"] = create_puzzle_initial_state(level, flip_turn=flip_turn)
    room["undoStack"] = []
    room["version"] += 1
    room["updated_at"] = now_ts()
    return {
      "state": room["state"],
      "version": room["version"],
      "puzzleDifficulty": level,
      "messages": room["messages"],
      **self._room_meta(room),
    }

  def restart_room(self, room_code: str, player_id: str, puzzle_difficulty: Optional[str] = None) -> Dict[str, Any]:
    room = self.rooms.get(room_code)
    if not room:
      raise ValueError("Room not found.")
    if player_id not in room["players"]:
      raise ValueError("Player is not in this room.")
    game_type = room.get("gameType", "checkers")
    if game_type == "puzzle":
      if puzzle_difficulty:
        room["puzzleDifficulty"] = normalize_puzzle_difficulty(puzzle_difficulty)
      game_state = room.get("state") or {}
      if is_fresh_puzzle_pre_flip_state(game_state):
        flip_turn = puzzle_flip_turn_for_room(room)
      else:
        current_flip = puzzle_flip_turn_for_room(room)
        flip_turn = "light" if current_flip == "dark" else "dark"
        room["puzzleRound"] = int(room.get("puzzleRound") or 1) + 1
      room["puzzleFlipTurn"] = flip_turn
      room["state"] = create_puzzle_initial_state(room.get("puzzleDifficulty", "medium"), flip_turn=flip_turn)
    else:
      room["state"] = create_initial_state_for_game(game_type)
    room["undoStack"] = []
    room["version"] += 1
    room["updated_at"] = now_ts()
    return {
      "state": room["state"],
      "version": room["version"],
      "messages": room["messages"],
      **self._room_meta(room),
    }

  def change_room_game(
    self,
    room_code: str,
    player_id: str,
    game_type: str,
    puzzle_difficulty: Optional[str] = None,
  ) -> Dict[str, Any]:
    room = self.rooms.get(room_code)
    if not room:
      raise ValueError("Room not found.")
    player: Optional[Player] = room["players"].get(player_id)
    if not player:
      raise ValueError("Player is not in this room.")
    normalized = str(game_type or "checkers").strip().lower()
    if normalized == "connect4":
      normalized = "fourinarow"
    if normalized not in SUPPORTED_GAMES:
      raise ValueError("Unsupported game type.")
    room["gameType"] = normalized
    if normalized == "puzzle":
      level = normalize_puzzle_difficulty(puzzle_difficulty or room.get("puzzleDifficulty"))
      room["puzzleDifficulty"] = level
      room["puzzleRound"] = 1
      room["puzzleFlipTurn"] = "dark"
      room["state"] = create_puzzle_initial_state(level, flip_turn="dark")
    else:
      room["puzzleDifficulty"] = None
      room["puzzleRound"] = None
      room["puzzleFlipTurn"] = None
      room["state"] = create_initial_state_for_game(normalized)
    room["undoStack"] = []
    room["version"] += 1
    room["updated_at"] = now_ts()
    return self._session_payload(room, player_id)

  def undo_room(self, room_code: str, player_id: str) -> Dict[str, Any]:
    room = self.rooms.get(room_code)
    if not room:
      raise ValueError("Room not found.")
    if player_id not in room["players"]:
      raise ValueError("Player is not in this room.")
    undo_stack = room.get("undoStack") or []
    if not undo_stack:
      raise ValueError("No turn available to undo.")
    latest = undo_stack[-1]
    if latest.get("by") != player_id:
      raise ValueError("You can only undo your own most recent turn.")
    room["undoStack"] = undo_stack[:-1]
    room["state"] = latest["state"]
    room["version"] += 1
    room["updated_at"] = now_ts()
    return {
      "state": room["state"],
      "version": room["version"],
      "messages": room["messages"],
      "canUndo": self._can_undo_for(room, player_id),
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

    self._ensure_room_host_metadata(room)
    host_id = str(room.get("hostPlayerId") or "")
    creator_id = str(room.get("creatorPlayerId") or "")
    if player_id == host_id or player_id == creator_id or player.color == "dark":
      room["hostVacant"] = True

    only_player = next(iter(room["players"].values()))
    if room.get("hostVacant"):
      # Host left — waiting player should stay Green.
      if only_player.color != "light":
        only_player.color = "light"
    elif only_player.player_id == host_id or only_player.player_id == creator_id:
      # Guest left — host (Blue) stays in the room.
      if only_player.color != "dark":
        only_player.color = "dark"
    self._reset_room_to_waiting(room)
    room["chatRate"] = {only_player.player_id: {"times": [], "lastText": "", "lastAt": 0.0}}
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
      "gameType": room.get("gameType", "checkers"),
      "playerId": player.player_id,
      "color": player.color,
      "yourColor": player.color,
      "hostPlayerId": room.get("hostPlayerId"),
      "creatorPlayerId": room.get("creatorPlayerId"),
      "hostVacant": bool(room.get("hostVacant")),
      "state": stamp_puzzle_flip_fields(room, room["state"]),
      "version": room["version"],
      "messages": room["messages"],
      "canUndo": self._can_undo_for(room, player_id),
      **self._room_meta(room),
    }


STORE = RoomStore()


class Handler(SimpleHTTPRequestHandler):
  def __init__(self, *args: Any, **kwargs: Any) -> None:
    super().__init__(*args, directory=str(ROOT_DIR), **kwargs)

  def do_GET(self) -> None:  # noqa: N802
    parsed = urlparse(self.path)
    join_prefix = "/join/"
    if parsed.path.startswith(join_prefix):
      code = parsed.path[len(join_prefix) :].strip("/").split("/")[0].strip().upper()
      if len(code) >= 4 and len(code) <= 8 and code.isalnum():
        params = parse_qs(parsed.query)
        game = str((params.get("game") or ["checkers"])[0]).strip().lower() or "checkers"
        if game == "connect4":
          game = "fourinarow"
        if game not in SUPPORTED_GAMES:
          game = "checkers"
        location = f"/iphone-checkers/guest-join.html?room={code}&game={game}"
        if game == "puzzle":
          puzzle_size = str((params.get("puzzleSize") or params.get("puzzleDifficulty") or ["medium"])[0]).strip().lower()
          if puzzle_size in {"easy", "medium", "hard", "mini", "classic", "mega"}:
            location += f"&puzzleSize={puzzle_size}"
        body = b""
        self.send_response(HTTPStatus.FOUND)
        self.send_header("Location", location)
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)
        return
    if parsed.path == "/api/health":
      self._json_endpoint(
        lambda: {
          "ok": True,
          "puzzleFlipAlternation": True,
          "features": ["puzzleFlipTurn", "puzzleRound", "stampPuzzleFlipFields", "changeRoomGame"],
        }
      )
      return
    if parsed.path == "/api/rooms/state":
      params = parse_qs(parsed.query)
      room_code = (params.get("roomCode") or [""])[0].strip().upper()
      player_id = (params.get("playerId") or [""])[0].strip()
      self._json_endpoint(lambda: STORE.get_state(room_code, player_id or None))
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
      game_type = str(payload.get("gameType", "checkers")).strip().lower()
      puzzle_difficulty = payload.get("puzzleDifficulty")
      self._json_endpoint(lambda: STORE.create_room(game_type, puzzle_difficulty))
      return
    if parsed.path == "/api/rooms/join":
      room_code = str(payload.get("roomCode", "")).strip().upper()
      game_type_raw = payload.get("gameType")
      game_type = str(game_type_raw).strip().lower() if game_type_raw else None
      reclaim_host = bool(payload.get("reclaimHost"))
      print(
        f"[rooms] join room={room_code} reclaim_host={reclaim_host} "
        f"ua={(self.headers.get('User-Agent') or '')[:96]}",
        flush=True,
      )
      self._json_endpoint(lambda: STORE.join_room(room_code, game_type, reclaim_host))
      return
    if parsed.path == "/api/rooms/reconnect":
      room_code = str(payload.get("roomCode", "")).strip().upper()
      player_id = str(payload.get("playerId", "")).strip()
      self._json_endpoint(lambda: STORE.reconnect_room(room_code, player_id))
      return
    if parsed.path == "/api/rooms/reclaim-guest":
      room_code = str(payload.get("roomCode", "")).strip().upper()
      print(
        f"[rooms] reclaim-guest room={room_code} "
        f"ua={(self.headers.get('User-Agent') or '')[:96]}",
        flush=True,
      )
      self._json_endpoint(lambda: STORE.reclaim_guest_session(room_code))
      return
    if parsed.path == "/api/rooms/flip":
      room_code = str(payload.get("roomCode", "")).strip().upper()
      player_id = str(payload.get("playerId", "")).strip()
      winner = str(payload.get("winner", "")).strip().lower()
      self._json_endpoint(lambda: STORE.flip_starter(room_code, player_id, winner))
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
      puzzle_difficulty = payload.get("puzzleDifficulty")
      self._json_endpoint(lambda: STORE.restart_room(room_code, player_id, puzzle_difficulty))
      return
    if parsed.path == "/api/rooms/change-game":
      room_code = str(payload.get("roomCode", "")).strip().upper()
      player_id = str(payload.get("playerId", "")).strip()
      game_type = str(payload.get("gameType", "checkers")).strip().lower()
      puzzle_difficulty = payload.get("puzzleDifficulty")
      self._json_endpoint(
        lambda: STORE.change_room_game(room_code, player_id, game_type, puzzle_difficulty)
      )
      return
    if parsed.path == "/api/rooms/puzzle-size":
      room_code = str(payload.get("roomCode", "")).strip().upper()
      player_id = str(payload.get("playerId", "")).strip()
      puzzle_difficulty = str(payload.get("puzzleDifficulty", "")).strip()
      self._json_endpoint(lambda: STORE.set_puzzle_difficulty(room_code, player_id, puzzle_difficulty))
      return
    if parsed.path == "/api/rooms/undo":
      room_code = str(payload.get("roomCode", "")).strip().upper()
      player_id = str(payload.get("playerId", "")).strip()
      self._json_endpoint(lambda: STORE.undo_room(room_code, player_id))
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

  def end_headers(self) -> None:
    path = urlparse(self.path).path
    if "/iphone-checkers/" in path and path.endswith((".html", ".js", ".css")):
      self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
      self.send_header("Pragma", "no-cache")
    super().end_headers()

  def _send_json(self, data: Dict[str, Any], status: HTTPStatus) -> None:
    encoded = json.dumps(data).encode("utf-8")
    self.send_response(status)
    self.send_header("Content-Type", "application/json; charset=utf-8")
    self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
    self.send_header("Pragma", "no-cache")
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

