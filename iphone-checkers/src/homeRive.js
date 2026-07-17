/**
 * Home hero Rive loader — mounts Puffly_home_hero.riv (manifest v1.1.0).
 * Contract: assets/Puffly/riv/home/Home_Manifest.json
 * - HTML owns click + optional Hover for a11y
 * - Rive owns Eye_Look_Position via Button/Belly listeners
 */
(function () {
  const CLIENT_BUILD = 513;
  const RIV_SRC = `./assets/Puffly/riv/home/Puffly_home_hero.riv?v=${CLIENT_BUILD}`;
  /** Names must match the .riv binary (see Home_Manifest.json). */
  const ARTBOARD = "Puffly_Home_Page";
  const STATE_MACHINE = "Home_HeroSM";
  const INPUT_HOVER = "Hover";
  const INPUT_EYE_LOOK = "Eye_Look_Position";

  const host = document.getElementById("home-hero-rive");
  const canvas = document.getElementById("home-hero-rive-canvas");
  const btn = document.getElementById("home-lets-play-btn");
  const poster = document.querySelector(".hero-image");

  if (!host || !canvas || !btn || typeof window.rive === "undefined") {
    return;
  }

  const prefersReducedMotion =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (prefersReducedMotion) {
    document.body.classList.add("home-rive-skipped");
    return;
  }

  const { Rive, Layout, Fit, Alignment } = window.rive;

  let hoverInput = null;
  /** Resolved for debug only — native Rive listeners own this value. */
  let eyeLookInput = null;
  let riveInstance = null;

  /** HTML may set Hover for CTA focus/hover; never write Eye_Look_Position. */
  function setHoverState(isHovered) {
    if (hoverInput) {
      hoverInput.value = Boolean(isHovered);
    }
  }

  function wireHoverControls() {
    const on = () => setHoverState(true);
    const off = () => setHoverState(false);
    btn.addEventListener("pointerenter", on);
    btn.addEventListener("pointerleave", off);
    btn.addEventListener("focus", on);
    btn.addEventListener("blur", off);
  }

  function markReady() {
    document.body.classList.add("home-rive-ready");
    if (poster) {
      poster.setAttribute("aria-hidden", "true");
    }
  }

  function markFailed(error) {
    console.warn("[homeRive] load failed; keeping static hero", error);
    document.body.classList.add("home-rive-failed");
    document.body.classList.remove("home-rive-ready");
    if (riveInstance) {
      try {
        riveInstance.cleanup?.();
      } catch (_) {
        // ignore
      }
      riveInstance = null;
    }
  }

  function isLandscape() {
    return window.matchMedia("(orientation: landscape)").matches;
  }

  function pickFit() {
    return isLandscape() ? Fit.Contain : Fit.Cover;
  }

  function pickAlignment() {
    return Alignment.Center;
  }

  /** Portrait Cover (immersive); landscape Contain (full composition). */
  function buildLayout() {
    return new Layout({
      fit: pickFit(),
      alignment: pickAlignment(),
    });
  }

  function applyLayout() {
    if (!riveInstance) {
      return;
    }
    try {
      riveInstance.layout = buildLayout();
    } catch (error) {
      console.warn("[homeRive] layout update failed", error);
    }
  }

  function resizeCanvasToHost() {
    applyLayout();
    const rect = host.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssW = Math.max(1, Math.round(rect.width));
    const cssH = Math.max(1, Math.round(rect.height));
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    canvas.width = Math.max(1, Math.round(cssW * dpr));
    canvas.height = Math.max(1, Math.round(cssH * dpr));
    if (riveInstance && typeof riveInstance.resizeDrawingSurfaceToCanvas === "function") {
      riveInstance.resizeDrawingSurfaceToCanvas();
    } else if (riveInstance) {
      riveInstance.resizeToCanvas?.();
    }
  }

  try {
    riveInstance = new Rive({
      src: RIV_SRC,
      canvas,
      artboard: ARTBOARD,
      stateMachines: STATE_MACHINE,
      autoplay: true,
      // Required for Button/Belly hit targets (manifest v1.1.0)
      shouldDisableRiveListeners: false,
      layout: buildLayout(),
      onLoad: () => {
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
            console.warn("[homeRive] artboard mismatch", { expected: ARTBOARD, artboardNames });
          }
          if (smNames && !smNames.includes(STATE_MACHINE)) {
            console.warn("[homeRive] state machine mismatch", { expected: STATE_MACHINE, smNames });
          }
          const inputs = riveInstance.stateMachineInputs(STATE_MACHINE) || [];
          hoverInput = inputs.find((input) => input.name === INPUT_HOVER) || null;
          eyeLookInput = inputs.find((input) => input.name === INPUT_EYE_LOOK) || null;
          if (!hoverInput) {
            console.warn("[homeRive] missing input:", INPUT_HOVER, inputs.map((i) => i.name));
          }
          if (!eyeLookInput) {
            console.warn("[homeRive] missing input:", INPUT_EYE_LOOK, inputs.map((i) => i.name));
          }
          setHoverState(false);
          resizeCanvasToHost();
          wireHoverControls();
          markReady();
          riveInstance.resizeDrawingSurfaceToCanvas?.();
          riveInstance.play?.(STATE_MACHINE);
        } catch (error) {
          markFailed(error);
        }
      },
      onLoadError: (event) => {
        markFailed(event);
      },
    });
  } catch (error) {
    markFailed(error);
    return;
  }

  let resizeTimer = 0;
  const scheduleResize = () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(resizeCanvasToHost, 80);
  };
  window.addEventListener("resize", scheduleResize);
  window.addEventListener("orientationchange", scheduleResize);
  if (typeof ResizeObserver === "function") {
    new ResizeObserver(scheduleResize).observe(host);
  }

  window.pufflyHomeRiveBuild = CLIENT_BUILD;
})();
