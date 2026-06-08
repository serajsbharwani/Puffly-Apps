#!/usr/bin/env bash
# Creates GitHub issues from iphone-checkers/FRIEND_VOICE_BACKLOG.md
# Prereq: gh auth login
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

GH="${GH:-gh}"
if ! command -v "$GH" >/dev/null 2>&1; then
  if [[ -x /opt/homebrew/bin/gh ]]; then
    GH=/opt/homebrew/bin/gh
  else
    echo "GitHub CLI (gh) not found. Install: brew install gh && gh auth login"
    exit 1
  fi
fi

if ! "$GH" auth status >/dev/null 2>&1; then
  echo "Not logged in. Run: gh auth login"
  exit 1
fi

echo "Repository: $("$GH" repo view --json nameWithOwner -q .nameWithOwner)"
echo "Creating labels (ignore errors if they already exist)..."
for spec in \
  "voice:1d76db" \
  "friend-mode:0e8a16" \
  "priority-p0:b60205" \
  "priority-p1:d93f0b" \
  "priority-p2:fbc04d" \
  "priority-p3:cccccc"; do
  name="${spec%%:*}"
  color="${spec##*:}"
  "$GH" label create "$name" --color "$color" --force 2>/dev/null || true
done

create_issue() {
  local title="$1"
  local labels="$2"
  local body="$3"
  "$GH" issue create --title "$title" --label "$labels" --body "$body"
}

REGRESSION='## Regression checklist (before closing)
- [ ] Mac: Practice → Tap Start → flip voice once
- [ ] Mac: Friend → OPEN → INVITE → 2/2 → flip → one move
- [ ] iPad guest: invite → guest card → 2/2 → stays in room
- [ ] All three games: one turn each side after flip
- [ ] Bump `SPEECH_BUILD` + `app.js?v=` if voice files touched

**Do not change** `guest-join.html` handshake unless multiplayer regresses.

Reference: `iphone-checkers/FRIEND_VOICE_BACKLOG.md`, `iphone-checkers/VOICE.md`'

echo ""
echo "Creating umbrella issue..."
UMBRELLA_URL=$(create_issue \
  "[Voice] Friend multiplayer audio quality — umbrella" \
  "voice,friend-mode,priority-p0" \
  "$(cat <<EOF
Track voice polish now that **friend mode works** across Checkers, Four-in-a-Row, and Puzzle (guest-join v326).

## Implementation order
1. VOICE-A1 + A2 (observability)
2. VOICE-B1 → B2 (overlap / crackle)
3. VOICE-C1 (preload on tap)
4. VOICE-B3 / C2 if needed
5. VOICE-D1 → D2 (assets)
6. VOICE-E1 if Network tab shows slow first-fetch

## Child issues
Created by \`scripts/create-friend-voice-issues.sh\` — see open issues with \`[Voice\` prefix.

$REGRESSION
EOF
)")

echo "Umbrella: $UMBRELLA_URL"
echo ""

echo "Creating VOICE-A1..."
A1_URL=$(create_issue \
  "[Voice A1] Add voiceDebug logging for clip playback" \
  "voice,friend-mode,priority-p0" \
  "$(cat <<EOF
**ID:** VOICE-A1  
**Priority:** P0 — enables diagnosis of crackle vs delay

## Problem
Hard to tell if crackle is overlap, decode, or network latency.

## Scope
- URL flag \`?voiceDebug=1\` or \`localStorage.puffly.voiceDebug = \"1\"\`
- \`console.info\` per clip: \`clipId\`, backend (Web Audio / HTML), \`fromGesture\`, \`playMode\`, timestamp
- Log \`stopAllVoiceClips()\` and dedupe/blocked plays

## Acceptance
- [ ] Mac Safari: flip + one turn → readable log sequence
- [ ] iPad Safari (Web Inspector): same
- [ ] No behavior change when flag is off

## Files
\`iphone-checkers/src/app.js\` — \`playVoiceClip\`, \`playVoiceClipWebAudio\`, friend turn helpers

$REGRESSION
EOF
)")

echo "A1: $A1_URL"
echo ""

echo "Creating VOICE-A2..."
A2_URL=$(create_issue \
  "[Voice A2] Repro worksheet — post-flip iPad Green scenario" \
  "voice,friend-mode,priority-p0" \
  "$(cat <<EOF
**ID:** VOICE-A2  
**Priority:** P0 — document repro before fixing B/C

## First target scenario
**iPad Green, immediately after Mac Blue flips** — flip cue + your-turn behavior.

## Worksheet (copy per session)
\`\`\`text
Date:
Build (v___):
Devices: Mac / iPad
Game: checkers | fourinarow | puzzle
Moment: post-flip | your-turn | opponent-move | join-welcome | game-switch
Symptom: crackle | delay | missing | overlap
Delay (~seconds):
Both devices or one:
Notes:
\`\`\`

## Acceptance
- [ ] One filled worksheet attached to this issue or linked PR
- [ ] Findings inform VOICE-B1 / C1 priority

Depends on $A1_URL for logs.

$REGRESSION
EOF
)")

echo "A2: $A2_URL"
echo ""

echo "Creating VOICE-B1..."
B1_URL=$(create_issue \
  "[Voice B1] Stop friend clip overlap (single playback + dedupe)" \
  "voice,friend-mode,priority-p1" \
  "$(cat <<EOF
**ID:** VOICE-B1  
**Priority:** P1  
**Depends on:** $A1_URL

## Symptom
Crackling or doubled words (e.g. \"Your, Your turn\").

## Scope
- Before \`speakFriendClipSequence\` / \`playFriendYourTurnClipOnce\`: \`stopAllVoiceClips()\` + cancel friend queue timers
- Drop duplicate same \`clipId\` within ~500ms

## Acceptance
- [ ] No overlap on join welcome + flip (Mac)
- [ ] No doubled your-turn on iPad after host flip
- [ ] Practice flip voice unchanged

$REGRESSION
EOF
)")

echo "B1: $B1_URL"
echo ""

echo "Creating VOICE-B2..."
B2_URL=$(create_issue \
  "[Voice B2] Defer poll-triggered friend voice during active clip" \
  "voice,friend-mode,priority-p1" \
  "$(cat <<EOF
**ID:** VOICE-B2  
**Priority:** P1

## Symptom
Crackle or cutoffs when \`syncRoomState\` runs while a clip plays.

## Scope
- Skip \`announceFriendJoinWelcome\`, \`announceFriendOpponentJoined\`, turn phrases from poll if a clip is active
- Defer opponent-connected / game-switch voice until current clip ends

## Acceptance
- [ ] Host flips while guest clip playing — clean finish or replace, no garble
- [ ] iOS 1s poll does not start second clip mid-phrase

$REGRESSION
EOF
)")

echo "B2: $B2_URL"
echo ""

echo "Creating VOICE-B3..."
B3_URL=$(create_issue \
  "[Voice B3] Single playback backend per platform in friend mode" \
  "voice,friend-mode,priority-p2" \
  "$(cat <<EOF
**ID:** VOICE-B3  
**Priority:** P2

## Symptom
Crackle when Web Audio fails over to HTML Audio in the same gesture window.

## Scope
- iOS friend: Web Audio only for turn/your-turn (per VOICE.md)
- Desktop friend: HTML Audio preferred; Web Audio fallback on error only

## Acceptance
- [ ] iPad logs show one backend per clip (with A1 debug)
- [ ] Mac friend playback reliable

$REGRESSION
EOF
)")

echo "B3: $B3_URL"
echo ""

echo "Creating VOICE-C1..."
C1_URL=$(create_issue \
  "[Voice C1] Preload friend session clips on first user tap (minimal set)" \
  "voice,friend-mode,priority-p1" \
  "$(cat <<EOF
**ID:** VOICE-C1  
**Priority:** P1

## Symptom
First \`your_turn\` / flip cue delayed 1–3s on iPad.

## Scope
- Extend minimal preload list (not full \`VOICE_CLIP_IDS\`): \`your_turn\`, \`green_turn\`, \`blue_turn\`, \`tap_flip_start\`, \`green_flip\`, \`blue_flip\`, \`connected\`
- Preload on **first user gesture** after guest attach (flip / board / Start) — not on timer
- **Do not** restore full preload on guest-join or cold hydrate

## Acceptance
- [ ] Second flip/turn on iPad <300ms perceived delay (same session)
- [ ] No Safari crash loop on invite
- [ ] Practice preload unchanged

$REGRESSION
EOF
)")

echo "C1: $C1_URL"
echo ""

echo "Creating VOICE-C2..."
C2_URL=$(create_issue \
  "[Voice C2] iOS gesture window — your-turn from flip tap" \
  "voice,friend-mode,priority-p2" \
  "$(cat <<EOF
**ID:** VOICE-C2  
**Priority:** P2

## Symptom
Clips silent or very late until user taps again.

## Scope
- Document gesture window constant in backlog when located
- Schedule your-turn inside flip tap handler when guest flips
- Clear \`friendPendingYourTurnVoice\` on play or mode leave

## Acceptance
- [ ] Guest hears your-turn within one tap after flip when their turn
- [ ] No duplicate your-turn after reconnect

$REGRESSION
EOF
)")

echo "C2: $C2_URL"
echo ""

echo "Creating VOICE-D1..."
D1_URL=$(create_issue \
  "[Voice D1] Run test:voice and fix stub/small WAV assets" \
  "voice,priority-p2" \
  "$(cat <<EOF
**ID:** VOICE-D1  
**Priority:** P2

## Scope
- Run \`npm run test:voice\` from \`iphone-checkers/\`
- Every \`assets/voice/*.wav\` > 8KB (not placeholders)
- Note harsh clips for re-export

## Acceptance
- [ ] \`npm run test:voice\` passes
- [ ] Manual listen: \`your_turn\`, \`connected\`, \`friend_joined\`, flip clips

See \`iphone-checkers/VOICE.md\`.

$REGRESSION
EOF
)")

echo "D1: $D1_URL"
echo ""

echo "Creating VOICE-D2..."
D2_URL=$(create_issue \
  "[Voice D2] Normalize friend WAV levels" \
  "voice,priority-p3" \
  "$(cat <<EOF
**ID:** VOICE-D2  
**Priority:** P3  
**Depends on:** $D1_URL

## Scope
- Batch normalize friend multiplayer clips (consistent LUFS / peak)
- Re-run test:voice; bump \`SPEECH_BUILD\`

## Acceptance
- [ ] Mac + iPad: join → flip → turn at similar volume
- [ ] No new crackle

$REGRESSION
EOF
)")

echo "D2: $D2_URL"
echo ""

echo "Creating VOICE-E1..."
E1_URL=$(create_issue \
  "[Voice E1] Long-cache voice WAV static assets" \
  "voice,priority-p3" \
  "$(cat <<EOF
**ID:** VOICE-E1  
**Priority:** P3 (only if Network tab shows slow first-fetch)

## Symptom
First play of each clip slow over Cloudflare tunnel.

## Scope
- \`Cache-Control: public, max-age=86400\` for \`/iphone-checkers/assets/voice/*.wav\`
- HTML/JS/API remain \`no-store\`
- Verify Cloudflare preserves headers

## Acceptance
- [ ] Second load: WAVs from disk cache (Network tab)
- [ ] API routes still no-store

**Files:** \`multiplayer_server.py\` \`end_headers\`

$REGRESSION
EOF
)")

echo "E1: $E1_URL"
echo ""
echo "Done. Issues created:"
echo "  Umbrella: $UMBRELLA_URL"
echo "  A1: $A1_URL"
echo "  A2: $A2_URL"
echo "  B1: $B1_URL"
echo "  B2: $B2_URL"
echo "  B3: $B3_URL"
echo "  C1: $C1_URL"
echo "  C2: $C2_URL"
echo "  D1: $D1_URL"
echo "  D2: $D2_URL"
echo "  E1: $E1_URL"
