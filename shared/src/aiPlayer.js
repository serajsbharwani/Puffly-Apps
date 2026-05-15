import { applyMove, getAllLegalMovesForPlayer } from "./rulesEngine.js";

const PIECE_VALUE = 3;
const KING_BONUS = 2;
const MOBILITY_WEIGHT = 0.2;
const LOOKAHEAD_DEPTH = 2;

function scoreMove(state, move) {
  let score = 0;
  if (move.isCapture) {
    score += 10;
  }

  const piece = state.board[move.from.row][move.from.col];
  const promotionRow = piece?.player === "light" ? 0 : 7;
  if (piece && !piece.king && move.to.row === promotionRow) {
    score += 6;
  }

  // Prefer central control slightly to keep AI from hugging the edges.
  const distanceFromCenter = Math.abs(3.5 - move.to.col);
  score += 2 - distanceFromCenter * 0.4;

  return score;
}

function moveKey(move) {
  return `${move.from.row}${move.from.col}-${move.to.row}${move.to.col}-${move.isCapture ? 1 : 0}`;
}

function deterministicChoice(items) {
  return [...items].sort((a, b) => moveKey(a).localeCompare(moveKey(b)))[0];
}

function randomChoice(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function opponent(player) {
  return player === "dark" ? "light" : "dark";
}

function countMaterial(board, player) {
  let score = 0;
  for (const row of board) {
    for (const piece of row) {
      if (!piece || piece.player !== player) {
        continue;
      }
      score += PIECE_VALUE + (piece.king ? KING_BONUS : 0);
    }
  }
  return score;
}

function evaluateState(state, computerPlayer) {
  if (state.winner === computerPlayer) {
    return 1000;
  }
  if (state.winner && state.winner !== computerPlayer) {
    return -1000;
  }

  const enemy = opponent(computerPlayer);
  const myMaterial = countMaterial(state.board, computerPlayer);
  const enemyMaterial = countMaterial(state.board, enemy);
  const myMobility = getAllLegalMovesForPlayer(state, computerPlayer).allMoves.length;
  const enemyMobility = getAllLegalMovesForPlayer(state, enemy).allMoves.length;

  return (
    (myMaterial - enemyMaterial) +
    (myMobility - enemyMobility) * MOBILITY_WEIGHT
  );
}

function minimaxScore(state, computerPlayer, depth) {
  if (depth === 0 || state.winner) {
    return evaluateState(state, computerPlayer);
  }

  const legal = getAllLegalMovesForPlayer(state, state.currentPlayer);
  if (legal.allMoves.length === 0) {
    return evaluateState(state, computerPlayer);
  }

  const maximizing = state.currentPlayer === computerPlayer;
  let best = maximizing ? -Infinity : Infinity;

  for (const move of legal.allMoves) {
    const result = applyMove(state, move);
    const score = minimaxScore(result.nextState, computerPlayer, depth - 1);
    best = maximizing ? Math.max(best, score) : Math.min(best, score);
  }

  return best;
}

function chooseHardMove(state, computerPlayer) {
  const legal = getAllLegalMovesForPlayer(state, computerPlayer);
  if (legal.allMoves.length === 0) {
    return null;
  }

  let bestScore = -Infinity;
  let bestMoves = [];

  for (const move of legal.allMoves) {
    const result = applyMove(state, move);
    const score = minimaxScore(result.nextState, computerPlayer, LOOKAHEAD_DEPTH);
    if (score > bestScore) {
      bestScore = score;
      bestMoves = [move];
    } else if (score === bestScore) {
      bestMoves.push(move);
    }
  }

  return deterministicChoice(bestMoves);
}

export function chooseComputerMove(state, computerPlayer = "light", difficulty = "medium") {
  const legal = getAllLegalMovesForPlayer(state, computerPlayer);
  if (legal.allMoves.length === 0) {
    return null;
  }

  if (difficulty === "easy") {
    return randomChoice(legal.allMoves);
  }

  if (difficulty === "hard") {
    return chooseHardMove(state, computerPlayer);
  }

  const ranked = legal.allMoves
    .map((move) => ({ move, score: scoreMove(state, move) }))
    .sort((a, b) => b.score - a.score);

  const bestScore = ranked[0].score;
  const bestMoves = ranked.filter((entry) => entry.score === bestScore).map((entry) => entry.move);
  return deterministicChoice(bestMoves);
}

export function performComputerTurn(state, computerPlayer = "light", difficulty = "medium") {
  let currentState = state;
  let status = `Computer (${difficulty}) is thinking...`;
  let moved = false;

  // Continue applying moves while chain-captures force the same player to move.
  while (!currentState.winner && currentState.currentPlayer === computerPlayer) {
    const move = chooseComputerMove(currentState, computerPlayer, difficulty);
    if (!move) {
      break;
    }

    const result = applyMove(currentState, move);
    currentState = result.nextState;
    status = result.status;
    moved = true;
  }

  if (!moved) {
    return { nextState: currentState, status: "Computer has no legal moves." };
  }

  return { nextState: currentState, status };
}
