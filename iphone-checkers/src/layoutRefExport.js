/**
 * Temporary Four-in-a-Row layout reference exporter for Rive column mapping.
 * Enable with ?layoutRef=1 or localStorage puffly.layoutRef=1
 *
 * v515: bake guides into a live DOM/SVG overlay before html2canvas capture
 * so column centers share the board's layout space (no post-hoc canvas remap).
 */
const HTML2CANVAS_SRC =
  "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js";
const OVERLAY_ATTR = "data-puffly-layout-ref-overlay";

let html2canvasLoader = null;

function isLayoutRefExportEnabled() {
  try {
    const search = new URLSearchParams(window.location.search || "");
    if (search.get("layoutRef") === "1") {
      return true;
    }
    if (window.localStorage?.getItem("puffly.layoutRef") === "1") {
      return true;
    }
  } catch {
    // ignore
  }
  return false;
}

function loadHtml2Canvas() {
  if (typeof window.html2canvas === "function") {
    return Promise.resolve(window.html2canvas);
  }
  if (html2canvasLoader) {
    return html2canvasLoader;
  }
  html2canvasLoader = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-puffly-html2canvas="1"]`);
    if (existing) {
      existing.addEventListener("load", () => {
        if (typeof window.html2canvas === "function") {
          resolve(window.html2canvas);
        } else {
          reject(new Error("html2canvas loaded without export"));
        }
      });
      existing.addEventListener("error", () => reject(new Error("html2canvas failed to load")));
      return;
    }
    const script = document.createElement("script");
    script.src = HTML2CANVAS_SRC;
    script.async = true;
    script.dataset.pufflyHtml2canvas = "1";
    script.onload = () => {
      if (typeof window.html2canvas === "function") {
        resolve(window.html2canvas);
      } else {
        reject(new Error("html2canvas loaded without export"));
      }
    };
    script.onerror = () => reject(new Error("html2canvas failed to load"));
    document.head.appendChild(script);
  });
  return html2canvasLoader;
}

function orientationLabel() {
  return window.matchMedia?.("(orientation: landscape)")?.matches ? "landscape" : "portrait";
}

function clearLayoutRefOverlays(root = document) {
  root.querySelectorAll(`[${OVERLAY_ATTR}]`).forEach((node) => node.remove());
}

function makeGuideLine({ left, top, width, height }) {
  const line = document.createElement("div");
  line.className = "layout-ref-guide-line";
  Object.assign(line.style, {
    position: "absolute",
    left: `${left}px`,
    top: `${top}px`,
    width: `${width}px`,
    height: `${height}px`,
    background: "rgba(255, 28, 64, 0.92)",
    pointerEvents: "none",
  });
  return line;
}

/**
 * Mount guide overlays in the live DOM using board-local square geometry.
 * Captured by html2canvas so guides stay locked to the painted board.
 */
function mountFourColumnGuideOverlay(options) {
  const { boardElement, findSquareElement, fourCols, fourRows, clientBuild, cluster } = options;
  clearLayoutRefOverlays(cluster || document);

  const boardRect = boardElement.getBoundingClientRect();
  const width = Math.max(1, boardRect.width);
  const height = Math.max(1, boardRect.height);

  const host = boardElement.parentElement || boardElement;
  const hostStyle = window.getComputedStyle(host);
  if (hostStyle.position === "static") {
    host.style.position = "relative";
    host.dataset.pufflyLayoutRefHostPos = "1";
  }

  const hostRect = host.getBoundingClientRect();
  const overlay = document.createElement("div");
  overlay.className = "layout-ref-guide-overlay";
  overlay.setAttribute(OVERLAY_ATTR, "board");
  Object.assign(overlay.style, {
    position: "absolute",
    left: `${boardRect.left - hostRect.left}px`,
    top: `${boardRect.top - hostRect.top}px`,
    width: `${width}px`,
    height: `${height}px`,
    overflow: "visible",
    pointerEvents: "none",
    zIndex: "60",
    boxSizing: "border-box",
    border: "2px dashed rgba(220, 36, 48, 0.95)",
  });

  for (let col = 0; col < fourCols; col += 1) {
    const topSq = findSquareElement(0, col);
    const botSq = findSquareElement(fourRows - 1, col);
    if (!topSq || !botSq) {
      continue;
    }
    const topR = topSq.getBoundingClientRect();
    const botR = botSq.getBoundingClientRect();
    const cx = topR.left + topR.width / 2 - boardRect.left;
    const y0 = Math.max(0, topR.top - boardRect.top);
    const y1 = Math.min(height, botR.bottom - boardRect.top);
    const lineHeight = Math.max(1, y1 - y0);

    overlay.appendChild(
      makeGuideLine({
        left: cx - 1.125,
        top: y0,
        width: 2.25,
        height: lineHeight,
      })
    );

    for (let row = 0; row < fourRows; row += 1) {
      const sq = findSquareElement(row, col);
      if (!sq) {
        continue;
      }
      const r = sq.getBoundingClientRect();
      const cy = r.top + r.height / 2 - boardRect.top;
      overlay.appendChild(
        makeGuideLine({
          left: cx - 7,
          top: cy - 1.125,
          width: 14,
          height: 2.25,
        })
      );
    }

    const label = document.createElement("div");
    label.className = "layout-ref-guide-label";
    label.textContent = `C${col}`;
    Object.assign(label.style, {
      position: "absolute",
      left: `${cx}px`,
      top: `${Math.max(0, y0 - 18)}px`,
      transform: "translateX(-50%)",
      color: "rgba(170, 0, 28, 0.96)",
      font: '700 14px/1 "Trebuchet MS", "Segoe UI", sans-serif',
      whiteSpace: "nowrap",
      pointerEvents: "none",
    });
    overlay.appendChild(label);
  }

  host.appendChild(overlay);

  if (cluster) {
    const legend = document.createElement("div");
    legend.setAttribute(OVERLAY_ATTR, "legend");
    legend.className = "layout-ref-guide-legend";
    legend.textContent = `Four-in-a-Row layout ref · ${orientationLabel()} · v${clientBuild} · C0–C${fourCols - 1} centers`;
    Object.assign(legend.style, {
      position: "absolute",
      left: "10px",
      top: "8px",
      zIndex: "61",
      pointerEvents: "none",
      color: "rgba(43, 43, 43, 0.92)",
      font: '600 12px/1.2 "Trebuchet MS", "Segoe UI", sans-serif',
      textShadow: "0 1px 0 rgba(244, 239, 230, 0.9)",
    });
    const clusterStyle = window.getComputedStyle(cluster);
    if (clusterStyle.position === "static") {
      cluster.style.position = "relative";
      cluster.dataset.pufflyLayoutRefClusterPos = "1";
    }
    cluster.appendChild(legend);
  }

  return () => {
    clearLayoutRefOverlays(cluster || document);
    if (host.dataset.pufflyLayoutRefHostPos === "1") {
      host.style.position = "";
      delete host.dataset.pufflyLayoutRefHostPos;
    }
    if (cluster?.dataset.pufflyLayoutRefClusterPos === "1") {
      cluster.style.position = "";
      delete cluster.dataset.pufflyLayoutRefClusterPos;
    }
  };
}

function downloadCanvasPng(canvas, filename) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("PNG encode failed"));
        return;
      }
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.rel = "noopener";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 2500);
      resolve(filename);
    }, "image/png");
  });
}

function waitNextFrame() {
  return new Promise((resolve) => window.requestAnimationFrame(() => resolve()));
}

export function syncLayoutRefExportButton(state = {}) {
  const btn = document.getElementById("practice-export-layout-ref-btn");
  if (!btn) {
    return;
  }
  const enabled = isLayoutRefExportEnabled();
  document.body.classList.toggle("layout-ref-export-enabled", enabled);
  const show =
    enabled &&
    Boolean(state.practiceTableActive) &&
    state.selectedGameId === "fourinarow" &&
    state.playMode === "puffly";
  btn.hidden = !show;
  btn.disabled = !show;
  btn.setAttribute("aria-hidden", show ? "false" : "true");
}

export async function exportFourInARowLayoutRef(options) {
  const {
    boardElement,
    findSquareElement,
    fourCols,
    fourRows,
    clientBuild,
    selectedGameId,
  } = options;

  if (selectedGameId !== "fourinarow") {
    throw new Error("Layout ref export is only available for Four-in-a-Row");
  }

  const cluster = document.getElementById("practice-play-cluster");
  if (!cluster || !boardElement) {
    throw new Error("Practice play cluster / board not ready");
  }

  const removeOverlay = mountFourColumnGuideOverlay({
    boardElement,
    findSquareElement,
    fourCols,
    fourRows,
    clientBuild,
    cluster,
  });

  try {
    // Let the overlay paint before cloning into html2canvas.
    await waitNextFrame();
    await waitNextFrame();

    const html2canvas = await loadHtml2Canvas();
    const scale = Math.min(Math.max(window.devicePixelRatio || 1, 1), 2);
    const canvas = await html2canvas(cluster, {
      backgroundColor: "#f4efe6",
      scale,
      logging: false,
      useCORS: true,
      allowTaint: true,
      imageTimeout: 8000,
    });

    const filename = `fourinarow_puffly_board_${orientationLabel()}_v${clientBuild}.png`;
    await downloadCanvasPng(canvas, filename);
    return filename;
  } finally {
    removeOverlay();
  }
}

export function initLayoutRefExport(getOptions) {
  if (!isLayoutRefExportEnabled()) {
    document.body.classList.remove("layout-ref-export-enabled");
    const hiddenBtn = document.getElementById("practice-export-layout-ref-btn");
    if (hiddenBtn) {
      hiddenBtn.hidden = true;
    }
    return;
  }

  document.body.classList.add("layout-ref-export-enabled");
  const btn = document.getElementById("practice-export-layout-ref-btn");
  if (!btn || btn.dataset.bound === "1") {
    return;
  }
  btn.dataset.bound = "1";
  btn.addEventListener("click", async () => {
    const options = typeof getOptions === "function" ? getOptions() : {};
    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Exporting…";
    try {
      const filename = await exportFourInARowLayoutRef(options);
      btn.textContent = "Saved";
      console.info("[layoutRef]", filename);
      window.setTimeout(() => {
        btn.textContent = original;
        btn.disabled = false;
        syncLayoutRefExportButton(options);
      }, 1200);
    } catch (error) {
      console.warn("[layoutRef] export failed", error);
      btn.textContent = "Failed";
      window.setTimeout(() => {
        btn.textContent = original;
        btn.disabled = false;
        syncLayoutRefExportButton(options);
      }, 1600);
    }
  });
}

export { isLayoutRefExportEnabled };
