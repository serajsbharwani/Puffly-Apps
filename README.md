# Little Puffly Checkers (Local Chrome Game)

This is a local browser checkers game designed for children, with standard rules and a playful themed board.

## AI Difficulty Levels

- `Easy`: random legal moves.
- `Medium`: heuristic move picker (captures, promotion, central control).
- `Hard`: shallow lookahead with board evaluation.

## Day/Night Themes

- Use the `Scene Theme` dropdown in the control panel.
- `Auto (Local Time)` switches automatically (`Night` from 6pm to 6am).
- `Day` keeps the warm storybook palette.
- `Night` switches to moonlit colors with star accents.

## 3D Scene + Puffly Opponent

- The board is shown in a tilted 3D tabletop scene.
- The computer opponent (Puffly) sits across the table.
- Puffly controls the dark-side pieces closest to the opponent side.
- The user controls the frog pieces from the near side.
- During computer turns, Puffly's hand animation plays each move so piece motion is easier to follow.
- Use the `Board Size` dropdown (`Compact`, `Normal`, `Large`) to fit the board comfortably on your screen.

## Run Locally in Chrome

From the `Checkers` folder:

1. Start a static server:
   - `python3 -m http.server 8000`
2. Open this URL in Chrome:
   - `http://localhost:8000/checkers/`

## Rules Test Command

Run the rules engine checks:

- `node ./checkers/src/rulesEngine.test.mjs`

Expected output:

- `All rules engine tests passed.`

## Manual QA Checklist

- [ ] Dark side moves first.
- [ ] Pieces move diagonally on dark squares only.
- [ ] Non-king pieces move forward only.
- [ ] A capture is mandatory when available.
- [ ] Multi-jump capture chains are enforced in one turn.
- [ ] Captured pieces are removed.
- [ ] Promotion to king occurs on the farthest row.
- [ ] Kings move and capture forward and backward.
- [ ] Win triggers when opponent has no pieces.
- [ ] Win triggers when opponent has no legal moves.
- [ ] Bottom-right board square appears light.
- [ ] Restart button resets to initial board and dark turn.
