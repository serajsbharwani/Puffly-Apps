# iPhone Checkers Plan (Clean Rebuild)

## Source Requirements

From the two `.docx` files:

- Standard checkers rules on an 8x8 board using dark squares only.
- Dark pieces move first.
- Diagonal movement, mandatory captures, multi-jump chains, king promotion, and king backward movement.
- Win by capturing all opponent pieces or leaving opponent with no legal moves.
- Child-friendly visual style inspired by Little Critter world (warm, colorful, whimsical).

## Build Strategy

1. Build a brand-new iPhone-first app in its own folder (`iphone-checkers`).
2. Keep rules engine isolated from UI (`src/engine.js`) with dedicated tests.
3. Use deterministic tap-only interaction flow:
   - Tap piece, then tap destination.
   - During mandatory capture, only legal capture origins/destinations are accepted.
4. Add simple deterministic AI for computer moves (dark side), including capture chains.
5. Keep visuals playful but clean and easy to read on small screens.

## Non-Goals (for this first iPhone version)

- No dependency on old browser app files.
- No drag-and-drop (tap interaction only for reliability).
- No large animation system in v1.
