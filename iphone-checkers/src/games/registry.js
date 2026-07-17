export const GAME_REGISTRY = {
  checkers: {
    id: "checkers",
    title: "Checkers",
    implemented: true,
  },
  fourinarow: {
    id: "fourinarow",
    title: "Four-in-a-Row",
    implemented: true,
  },
  puzzle: {
    id: "puzzle",
    title: "Puzzle",
    implemented: true,
  },
};

export const DEFAULT_GAME_ID = "fourinarow";

export function normalizeGameId(gameId) {
  const normalized = String(gameId || "").trim().toLowerCase();
  if (normalized === "connect4") {
    return "fourinarow";
  }
  return normalized;
}

export function getGameConfig(gameId) {
  return GAME_REGISTRY[normalizeGameId(gameId)] || GAME_REGISTRY[DEFAULT_GAME_ID];
}

export function isKnownGame(gameId) {
  return Boolean(GAME_REGISTRY[normalizeGameId(gameId)]);
}
