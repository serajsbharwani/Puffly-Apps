export function updateStatusPanel(
  state,
  turnLabelElement,
  statusLabelElement,
  statusMessage,
  { humanPlayer = "light", computerPlayer = "dark" } = {},
) {
  if (state.winner) {
    turnLabelElement.textContent = "Turn: Complete";
    if (state.winner === humanPlayer) {
      statusLabelElement.textContent = "Congratulations! You Won";
    } else if (state.winner === computerPlayer) {
      statusLabelElement.textContent = "Puffly won! Better luck in the next game";
    } else {
      statusLabelElement.textContent = statusMessage ?? "Game complete.";
    }
    return;
  }

  const friendlyTurn = state.currentPlayer === "dark" ? "Dark (Blue)" : "Light (Green)";
  turnLabelElement.textContent = `Turn: ${friendlyTurn}`;
  statusLabelElement.textContent = statusMessage ?? "Make your move.";
}
