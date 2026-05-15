function getSquareElement(boardElement, row, col) {
  return boardElement.querySelector(`.square[data-row="${row}"][data-col="${col}"]`);
}

function moveNodeTo(node, x, y, durationMs) {
  return new Promise((resolve) => {
    node.style.transitionDuration = `${durationMs}ms`;
    requestAnimationFrame(() => {
      node.style.left = `${x}px`;
      node.style.top = `${y}px`;
    });
    window.setTimeout(resolve, durationMs + 30);
  });
}

function easeInOutCubic(t) {
  if (t < 0.5) {
    return 4 * t * t * t;
  }
  const p = -2 * t + 2;
  return 1 - (p * p * p) / 2;
}

function moveNodeAlongCurve(node, toX, toY, durationMs, arcLift = 28, onUpdate) {
  const fromX = Number.parseFloat(node.style.left);
  const fromY = Number.parseFloat(node.style.top);
  const midX = (fromX + toX) / 2;
  const midY = (fromY + toY) / 2 - arcLift;

  return new Promise((resolve) => {
    const start = performance.now();

    function step(now) {
      const rawT = clamp((now - start) / durationMs, 0, 1);
      const t = easeInOutCubic(rawT);
      const oneMinusT = 1 - t;
      const x = oneMinusT * oneMinusT * fromX + 2 * oneMinusT * t * midX + t * t * toX;
      const y = oneMinusT * oneMinusT * fromY + 2 * oneMinusT * t * midY + t * t * toY;
      node.style.left = `${x}px`;
      node.style.top = `${y}px`;
      if (onUpdate) {
        onUpdate(x, y);
      }

      if (rawT < 1) {
        requestAnimationFrame(step);
      } else {
        resolve();
      }
    }

    requestAnimationFrame(step);
  });
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getShoulderPoint(critterElement, handSide) {
  const rect = critterElement.getBoundingClientRect();
  return {
    x: rect.left + rect.width * (handSide === "left" ? 0.38 : 0.62),
    y: rect.top + rect.height * 0.8,
  };
}

function setPufflyLookAtPoint(critterElement, targetX, targetY) {
  const rect = critterElement.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height * 0.34;
  const dx = targetX - centerX;
  const dy = targetY - centerY;

  const lookX = clamp(dx / 26, -6, 6);
  const lookY = clamp(dy / 42, -3, 4);
  const lookRot = clamp(dx / 18, -12, 12);

  critterElement.style.setProperty("--face-look-x", `${lookX}px`);
  critterElement.style.setProperty("--face-look-y", `${lookY}px`);
  critterElement.style.setProperty("--face-look-rot", `${lookRot}deg`);
}

function resetPufflyLook(critterElement) {
  critterElement.style.setProperty("--face-look-x", "0px");
  critterElement.style.setProperty("--face-look-y", "0px");
  critterElement.style.setProperty("--face-look-rot", "0deg");
}

function resetPufflyHands(critterElement) {
  critterElement.style.setProperty("--left-hand-angle", "-10deg");
  critterElement.style.setProperty("--right-hand-angle", "10deg");
  critterElement.style.setProperty("--left-hand-stretch", "1");
  critterElement.style.setProperty("--right-hand-stretch", "1");
}

function resetPufflyBodyLean(critterElement) {
  critterElement.style.setProperty("--body-lean-x", "0px");
  critterElement.style.setProperty("--body-lean-y", "0px");
  critterElement.style.setProperty("--body-lean-rot", "0deg");
}

function setPufflyBodyLean(critterElement, handSide, dx, distance) {
  const sideSign = handSide === "left" ? -1 : 1;
  const intensity = clamp((distance - 16) / 52, 0, 1);
  const directionalBias = clamp(dx / 90, -2.2, 2.2);
  const leanX = sideSign * intensity * 9 + directionalBias;
  const leanRot = sideSign * intensity * 6.5;
  const leanY = intensity * 3.2;

  critterElement.style.setProperty("--body-lean-x", `${leanX.toFixed(2)}px`);
  critterElement.style.setProperty("--body-lean-y", `${leanY.toFixed(2)}px`);
  critterElement.style.setProperty("--body-lean-rot", `${leanRot.toFixed(2)}deg`);
}

function setPufflyHandPose(critterElement, handSide, targetX, targetY) {
  const shoulder = getShoulderPoint(critterElement, handSide);
  const shoulderX = shoulder.x;
  const shoulderY = shoulder.y;
  const dx = targetX - shoulderX;
  const dy = targetY - shoulderY;
  const distance = Math.sqrt(dx * dx + dy * dy);

  const angle = clamp((Math.atan2(dx, dy) * 180) / Math.PI, -82, 82);
  const baseArmLength = 24;
  const stretch = clamp((distance + 8) / baseArmLength, 1, 6.2);
  setPufflyBodyLean(critterElement, handSide, dx, distance);

  if (handSide === "left") {
    critterElement.style.setProperty("--left-hand-angle", `${angle}deg`);
    critterElement.style.setProperty("--left-hand-stretch", `${stretch}`);
    critterElement.style.setProperty("--right-hand-angle", "12deg");
    critterElement.style.setProperty("--right-hand-stretch", "0.98");
  } else {
    critterElement.style.setProperty("--right-hand-angle", `${angle}deg`);
    critterElement.style.setProperty("--right-hand-stretch", `${stretch}`);
    critterElement.style.setProperty("--left-hand-angle", "-12deg");
    critterElement.style.setProperty("--left-hand-stretch", "0.98");
  }
}

function updateDriverArm(armNode, critterElement, handSide, targetX, targetY) {
  if (!armNode) {
    return;
  }
  const shoulder = getShoulderPoint(critterElement, handSide);
  const dx = targetX - shoulder.x;
  const dy = targetY - shoulder.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

  armNode.style.left = `${shoulder.x}px`;
  armNode.style.top = `${shoulder.y}px`;
  armNode.style.width = `${distance}px`;
  armNode.style.transform = `rotate(${angle}deg)`;
}

function chooseHandSide() {
  // Use a single dominant hand to avoid side-selection mismatches.
  // "left" here means the hand visible on the left side of the screen.
  return "left";
}

export async function animatePufflyHandMove(boardElement, move, critterElement, onDragPiece) {
  if (!critterElement) {
    if (onDragPiece) {
      await onDragPiece();
    }
    return;
  }

  const fromSquare = getSquareElement(boardElement, move.from.row, move.from.col);
  const toSquare = getSquareElement(boardElement, move.to.row, move.to.col);
  if (!fromSquare || !toSquare) {
    if (onDragPiece) {
      await onDragPiece();
    }
    return;
  }

  const critterRect = critterElement.getBoundingClientRect();
  const fromRect = fromSquare.getBoundingClientRect();
  const toRect = toSquare.getBoundingClientRect();

  const fromX = fromRect.left + fromRect.width / 2;
  const fromY = fromRect.top + fromRect.height / 2;
  const toX = toRect.left + toRect.width / 2;
  const toY = toRect.top + toRect.height / 2;
  const handSide = chooseHandSide();
  const startX =
    critterRect.left + critterRect.width * (handSide === "left" ? 0.36 : 0.64);
  const startY = critterRect.top + critterRect.height * 0.9;

  const driver = document.createElement("div");
  driver.className = `critter-hand-driver ${handSide}-side`;
  driver.style.left = `${startX}px`;
  driver.style.top = `${startY}px`;
  const armVisual = document.createElement("div");
  armVisual.className = `critter-driver-arm ${handSide}-side`;
  const handVisual = document.createElement("div");
  handVisual.className = `critter-driver-hand ${handSide}-side`;
  driver.appendChild(handVisual);
  document.body.appendChild(armVisual);
  document.body.appendChild(driver);

  critterElement.classList.add("acting");
  critterElement.classList.add(`${handSide}-acting`);
  critterElement.classList.add("reaching");
  critterElement.classList.remove("thinking");
  setPufflyLookAtPoint(critterElement, fromX, fromY);
  setPufflyHandPose(critterElement, handSide, fromX, fromY);

  const syncPufflyPose = (x, y) => {
    setPufflyLookAtPoint(critterElement, x, y);
    setPufflyHandPose(critterElement, handSide, x, y);
    updateDriverArm(armVisual, critterElement, handSide, x, y);
  };

  await moveNodeAlongCurve(driver, fromX, fromY, 260, 18, syncPufflyPose);
  critterElement.classList.add("grabbing");
  handVisual.classList.add("grabbing");
  if (onDragPiece) {
    await onDragPiece(driver, { phase: "grab" });
  }
  const carryDurationMs = 360;
  await moveNodeAlongCurve(driver, toX, toY, carryDurationMs, 24, syncPufflyPose);
  if (onDragPiece) {
    await onDragPiece(driver, { phase: "drop" });
  }
  critterElement.classList.remove("grabbing");
  handVisual.classList.remove("grabbing");
  await moveNodeAlongCurve(driver, startX, startY, 260, 30, syncPufflyPose);

  driver.remove();
  armVisual.remove();
  resetPufflyLook(critterElement);
  resetPufflyHands(critterElement);
  resetPufflyBodyLean(critterElement);
  critterElement.classList.remove("reaching");
  critterElement.classList.remove(`${handSide}-acting`);
  critterElement.classList.remove("acting");
}
