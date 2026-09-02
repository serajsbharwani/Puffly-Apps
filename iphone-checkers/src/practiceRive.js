/**
 * Practice Four-in-a-Row Puffly Rive loader.
 * Contract: assets/Puffly/riv/practice/FourInARow_Manifest.json
 * Scope: playMode === "puffly" && game === "fourinarow"
 *
 * v517: load once — do not tear down / restart while a load is in flight
 * (render() used to cancel the 13MB .riv repeatedly).
 */
const CLIENT_BUILD = 550;
const RIV_SRC = `./assets/Puffly/riv/practice/puffly_four_in_a_row.riv?v=${CLIENT_BUILD}`;
/** Names must match the .riv binary (see FourInARow_Manifest.json). */
const ARTBOARD = "Puffly_Four_in_a_Row Portrait";
const STATE_MACHINE = "State Machine 1";
const COLUMN_TRIGGER_NAMES = [
  "Trigger_C0",
  "Trigger_C1",
  "Trigger_C2",
  "Trigger_C3",
  "Trigger_C4",
  "Trigger_C5",
  "Trigger_C6",
];
const REACTION_TRIGGER_PUFF = "Trigger_Puff";
const REACTION_TRIGGER_THINKING = "Trigger_Thinking";
const REACTION_TRIGGER_HUMBLE = "Trigger_Humble";
const RIVE_RUNTIME_WAIT_MS = 4000;

let riveInstance = null;
let columnTriggers = [];
let puffTrigger = null;
let thinkingTrigger = null;
let humbleTrigger = null;
let loadToken = 0;
let resizeObserver = null;
let canvasEl = null;
let hostEl = null;
/** In-flight load promise — shared so repeated sync calls don't restart. */
let loadPromise = null;
let lastScopeKey = "";

function prefersReducedMotion() {
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function hasRiveRuntime() {
  return Boolean(window.rive && window.rive.Rive && window.rive.Layout);
}

function scopeKey(state = {}) {
  return [
    state.playMode || "",
    state.selectedGameId || "",
    state.practiceTableActive ? "1" : "0",
  ].join("|");
}

function waitForRiveRuntime(timeoutMs = RIVE_RUNTIME_WAIT_MS) {
  if (hasRiveRuntime()) {
    return Promise.resolve(true);
  }
  return new Promise((resolve) => {
    const started = Date.now();
    const timer = window.setInterval(() => {
      if (hasRiveRuntime()) {
        window.clearInterval(timer);
        resolve(true);
        return;
      }
      if (Date.now() - started >= timeoutMs) {
        window.clearInterval(timer);
        resolve(false);
      }
    }, 50);
  });
}

function markSkipped() {
  document.body.classList.add("practice-four-rive-skipped");
  document.body.classList.remove(
    "practice-four-rive-ready",
    "practice-four-rive-failed",
    "practice-four-rive-loading"
  );
}

function markLoading() {
  document.body.classList.add("practice-four-rive-loading");
  document.body.classList.remove(
    "practice-four-rive-ready",
    "practice-four-rive-failed",
    "practice-four-rive-skipped"
  );
}

function markFailed(error) {
  console.warn("[practiceRive] load failed; keeping skeleton", error);
  document.body.classList.add("practice-four-rive-failed");
  document.body.classList.remove(
    "practice-four-rive-ready",
    "practice-four-rive-loading",
    "practice-four-rive-skipped"
  );
  teardownInstance({ keepFailedClass: true });
}

function markReady() {
  document.body.classList.add("practice-four-rive-ready");
  document.body.classList.remove(
    "practice-four-rive-failed",
    "practice-four-rive-skipped",
    "practice-four-rive-loading"
  );
  console.info("[practiceRive] ready", {
    artboard: ARTBOARD,
    stateMachine: STATE_MACHINE,
    triggers: columnTriggers.filter(Boolean).length,
    puff: Boolean(puffTrigger),
    thinking: Boolean(thinkingTrigger),
    humble: Boolean(humbleTrigger),
  });
}

function teardownInstance(options = {}) {
  loadPromise = null;
  if (resizeObserver) {
    try {
      resizeObserver.disconnect();
    } catch {
      // ignore
    }
    resizeObserver = null;
  }
  if (riveInstance) {
    try {
      riveInstance.cleanup?.();
    } catch {
      // ignore
    }
    riveInstance = null;
  }
  columnTriggers = [];
  puffTrigger = null;
  thinkingTrigger = null;
  humbleTrigger = null;
  if (canvasEl) {
    canvasEl.remove();
    canvasEl = null;
  }
  hostEl = null;
  document.body.classList.remove("practice-four-rive-ready", "practice-four-rive-loading");
  if (!options.keepFailedClass) {
    document.body.classList.remove("practice-four-rive-failed", "practice-four-rive-skipped");
  }
}

function ensureCanvas(host) {
  let canvas = host.querySelector("#practice-four-rive-canvas");
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.id = "practice-four-rive-canvas";
    canvas.className = "practice-four-rive-canvas";
    canvas.setAttribute("aria-hidden", "true");
    host.appendChild(canvas);
  }
  canvasEl = canvas;
  hostEl = host;
  return canvas;
}

function buildLayout() {
  const { Layout, Fit, Alignment } = window.rive;
  // Portrait-first: Contain + CSS scale (v528 ~3.65) for stronger opponent presence.
  return new Layout({
    fit: Fit.Contain,
    alignment: Alignment.BottomCenter,
  });
}

function resizeCanvasToHost() {
  if (!riveInstance || !canvasEl || !hostEl) {
    return;
  }
  try {
    riveInstance.layout = buildLayout();
  } catch (error) {
    console.warn("[practiceRive] layout update failed", error);
  }
  const rect = hostEl.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cssW = Math.max(1, Math.round(rect.width));
  const cssH = Math.max(1, Math.round(rect.height));
  canvasEl.style.width = `${cssW}px`;
  canvasEl.style.height = `${cssH}px`;
  canvasEl.width = Math.max(1, Math.round(cssW * dpr));
  canvasEl.height = Math.max(1, Math.round(cssH * dpr));
  if (typeof riveInstance.resizeDrawingSurfaceToCanvas === "function") {
    riveInstance.resizeDrawingSurfaceToCanvas();
  } else {
    riveInstance.resizeToCanvas?.();
  }
}

function bindColumnTriggers(inputs) {
  columnTriggers = COLUMN_TRIGGER_NAMES.map((name) => {
    const input = inputs.find((entry) => entry.name === name) || null;
    if (!input) {
      console.warn("[practiceRive] missing trigger:", name, inputs.map((i) => i.name));
    }
    return input;
  });
  puffTrigger = inputs.find((entry) => entry.name === REACTION_TRIGGER_PUFF) || null;
  thinkingTrigger = inputs.find((entry) => entry.name === REACTION_TRIGGER_THINKING) || null;
  humbleTrigger = inputs.find((entry) => entry.name === REACTION_TRIGGER_HUMBLE) || null;
  if (!puffTrigger) {
    console.warn("[practiceRive] missing trigger:", REACTION_TRIGGER_PUFF, inputs.map((i) => i.name));
  }
  if (!thinkingTrigger) {
    console.warn(
      "[practiceRive] missing trigger:",
      REACTION_TRIGGER_THINKING,
      inputs.map((i) => i.name),
    );
  }
  if (!humbleTrigger) {
    console.warn("[practiceRive] missing trigger:", REACTION_TRIGGER_HUMBLE, inputs.map((i) => i.name));
  }
}

function fireNamedTrigger(input, name) {
  if (!document.body.classList.contains("practice-four-rive-ready")) {
    console.warn("[practiceRive] trigger skipped — not ready", { name });
    return false;
  }
  if (!input || typeof input.fire !== "function") {
    console.warn("[practiceRive] trigger missing", name);
    return false;
  }
  try {
    input.fire();
    return true;
  } catch (error) {
    console.warn("[practiceRive] trigger fire failed", name, error);
    return false;
  }
}

function loadIntoHost(host) {
  const canvas = ensureCanvas(host);
  const token = ++loadToken;
  const { Rive } = window.rive;
  markLoading();
  console.info("[practiceRive] loading", RIV_SRC);

  const promise = new Promise((resolve) => {
    try {
      riveInstance = new Rive({
        src: RIV_SRC,
        canvas,
        artboard: ARTBOARD,
        stateMachines: STATE_MACHINE,
        autoplay: true,
        shouldDisableRiveListeners: true,
        layout: buildLayout(),
        onLoad: () => {
          if (token !== loadToken) {
            resolve(false);
            return;
          }
          try {
            const artboardNames =
              typeof riveInstance.artboardNames === "function"
                ? riveInstance.artboardNames()
                : null;
            const smNames =
              typeof riveInstance.stateMachineNames === "function"
                ? riveInstance.stateMachineNames()
                : null;
            if (artboardNames && !artboardNames.includes(ARTBOARD)) {
              console.warn("[practiceRive] artboard mismatch", {
                expected: ARTBOARD,
                artboardNames,
              });
            }
            if (smNames && !smNames.includes(STATE_MACHINE)) {
              console.warn("[practiceRive] state machine mismatch", {
                expected: STATE_MACHINE,
                smNames,
              });
            }
            const inputs = riveInstance.stateMachineInputs(STATE_MACHINE) || [];
            bindColumnTriggers(inputs);
            resizeCanvasToHost();
            if (typeof ResizeObserver === "function" && !resizeObserver) {
              resizeObserver = new ResizeObserver(() => resizeCanvasToHost());
              resizeObserver.observe(host);
            }
            riveInstance.resizeDrawingSurfaceToCanvas?.();
            riveInstance.play?.(STATE_MACHINE);
            markReady();
            resolve(true);
          } catch (error) {
            markFailed(error);
            resolve(false);
          } finally {
            if (loadPromise === promise) {
              loadPromise = null;
            }
          }
        },
        onLoadError: (event) => {
          if (token !== loadToken) {
            resolve(false);
            return;
          }
          markFailed(event);
          if (loadPromise === promise) {
            loadPromise = null;
          }
          resolve(false);
        },
      });
    } catch (error) {
      markFailed(error);
      if (loadPromise === promise) {
        loadPromise = null;
      }
      resolve(false);
    }
  });

  loadPromise = promise;
  return promise;
}

/**
 * Enable/disable Practice Four-in-a-Row Rive based on current app scope.
 * Safe to call from every render — will not restart an in-flight load.
 */
export async function syncPracticeFourRive(state = {}) {
  const shouldRun =
    state.playMode === "puffly" &&
    state.selectedGameId === "fourinarow" &&
    Boolean(state.practiceTableActive);
  const nextKey = scopeKey(state);

  if (!shouldRun) {
    if (lastScopeKey !== "" || riveInstance || loadPromise) {
      loadToken += 1;
      teardownInstance();
      lastScopeKey = "";
    }
    return false;
  }

  if (prefersReducedMotion()) {
    loadToken += 1;
    teardownInstance();
    markSkipped();
    lastScopeKey = nextKey;
    return false;
  }

  // Already ready: only resize (layout passes call sync often).
  if (riveInstance && document.body.classList.contains("practice-four-rive-ready")) {
    lastScopeKey = nextKey;
    resizeCanvasToHost();
    return true;
  }

  // Load already in flight — join it; do not teardown/restart.
  if (loadPromise) {
    lastScopeKey = nextKey;
    return loadPromise;
  }

  const runtimeOk = await waitForRiveRuntime();
  if (!runtimeOk) {
    markFailed(new Error("Rive runtime missing"));
    lastScopeKey = nextKey;
    return false;
  }

  // Another sync may have started while we waited for the CDN.
  if (loadPromise) {
    lastScopeKey = nextKey;
    return loadPromise;
  }
  if (riveInstance && document.body.classList.contains("practice-four-rive-ready")) {
    lastScopeKey = nextKey;
    resizeCanvasToHost();
    return true;
  }

  const host = document.getElementById("rive-character-host");
  if (!host) {
    markFailed(new Error("rive-character-host missing"));
    lastScopeKey = nextKey;
    return false;
  }

  lastScopeKey = nextKey;
  return loadIntoHost(host);
}

/**
 * Fire Trigger_C{col} for a computer Four-in-a-Row drop.
 * @returns {boolean} true if a trigger was fired
 */
export function fireFourInARowColumnTrigger(col) {
  const index = Number(col);
  if (!Number.isInteger(index) || index < 0 || index >= COLUMN_TRIGGER_NAMES.length) {
    return false;
  }
  return fireNamedTrigger(columnTriggers[index], COLUMN_TRIGGER_NAMES[index]);
}

/** Fire Trigger_Puff (Chest_Puff ~2s) after a block, trap, or Puffly win. */
export function fireFourInARowPuffTrigger() {
  return fireNamedTrigger(puffTrigger, REACTION_TRIGGER_PUFF);
}

/** Fire Trigger_Thinking (Puffly_Thinking ~3s) when human blocks Puffly's win. */
export function fireFourInARowThinkingTrigger() {
  return fireNamedTrigger(thinkingTrigger, REACTION_TRIGGER_THINKING);
}

/** Fire Trigger_Humble (Humble_Gesture ~2s) when Puffly loses. */
export function fireFourInARowHumbleTrigger() {
  return fireNamedTrigger(humbleTrigger, REACTION_TRIGGER_HUMBLE);
}

export function isPracticeFourRiveReady() {
  return document.body.classList.contains("practice-four-rive-ready");
}

export const PRACTICE_FOUR_RIVE_BUILD = CLIENT_BUILD;

if (typeof window !== "undefined") {
  window.pufflyPracticeFourRiveBuild = CLIENT_BUILD;
  window.pufflyFireFourColumn = fireFourInARowColumnTrigger;
  window.pufflyFireFourPuff = fireFourInARowPuffTrigger;
  window.pufflyFireFourThinking = fireFourInARowThinkingTrigger;
  window.pufflyFireFourHumble = fireFourInARowHumbleTrigger;
  window.pufflySyncPracticeFourRive = syncPracticeFourRive;
}
