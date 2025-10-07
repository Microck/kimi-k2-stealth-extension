(() => {
  // A→B capture overlay with getDisplayMedia. Esc to cancel.
  const overlay = document.createElement("div");
  overlay.style.cssText =
    "position:fixed;inset:0;z-index:2147483646;cursor:crosshair;";
  const video = document.createElement("video");
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  video.playsInline = true;
  const mask = document.createElement("div");
  mask.style.cssText =
    "position:absolute;inset:0;background:#000;opacity:0.9;pointer-events:none;";
  overlay.append(video, mask, canvas);
  document.documentElement.appendChild(overlay);

  let stream;
  let a = null;
  let b = null;

  start().catch(cleanup);

  async function start() {
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false
      });
    } catch (e) {
      cleanup();
      return;
    }
    video.srcObject = stream;
    await video.play();
    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("click", onClick, true);
  }

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const r = overlay.getBoundingClientRect();
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    canvas.style.width = r.width + "px";
    canvas.style.height = r.height + "px";
    drawRect(a, b);
  }

  function onKey(e) {
    if (e.key === "Escape") cleanup();
  }

  function onClick(e) {
    const r = overlay.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    if (!a) a = { x, y };
    else {
      b = { x, y };
      window.removeEventListener("click", onClick, true);
      window.removeEventListener("keydown", onKey, true);
      finish();
    }
    drawRect(a, b);
  }

  function drawRect(p1, p2) {
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!p1) return;
    const x1 = p1.x * dpr;
    const y1 = p1.y * dpr;
    const x2 = (p2 ? p2.x : p1.x) * dpr;
    const y2 = (p2 ? p2.y : p1.y) * dpr;
    const x = Math.min(x1, x2);
    const y = Math.min(y1, y2);
    const w = Math.abs(x2 - x1);
    const h = Math.abs(y2 - y1);
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = 2 * dpr;
    ctx.strokeRect(
      x + dpr,
      y + dpr,
      Math.max(1, w - 2 * dpr),
      Math.max(1, h - 2 * dpr)
    );
  }

  function mapSelectionToVideo(p1, p2) {
    const over = overlay.getBoundingClientRect();
    const vw = video.videoWidth || 0;
    const vh = video.videoHeight || 0;
    if (!vw || !vh) return null;
    const scale = Math.min(over.width / vw, over.height / vh);
    const dispW = vw * scale;
    const dispH = vh * scale;
    const dx = (over.width - dispW) / 2;
    const dy = (over.height - dispH) / 2;

    const x1 = clamp(p1.x - dx, 0, dispW);
    const y1 = clamp(p1.y - dy, 0, dispH);
    const x2 = clamp(p2.x - dx, 0, dispW);
    const y2 = clamp(p2.y - dy, 0, dispH);

    const rx1 = Math.min(x1, x2) / dispW;
    const ry1 = Math.min(y1, y2) / dispH;
    const rx2 = Math.max(x1, x2) / dispW;
    const ry2 = Math.max(y1, y2) / dispH;

    const px = Math.round(rx1 * vw);
    const py = Math.round(ry1 * vh);
    const pw = Math.max(1, Math.round((rx2 - rx1) * vw));
    const ph = Math.max(1, Math.round((ry2 - ry1) * vh));
    if (pw < 3 || ph < 3) return null;
    return { x: px, y: py, w: pw, h: ph };
  }

  async function finish() {
    if (!a || !b) return cleanup();
    const rect = mapSelectionToVideo(a, b);
    if (!rect) return cleanup();

    const full = document.createElement("canvas");
    full.width = video.videoWidth;
    full.height = video.videoHeight;
    full.getContext("2d").drawImage(video, 0, 0, full.width, full.height);

    const crop = document.createElement("canvas");
    crop.width = rect.w;
    crop.height = rect.h;
    crop
      .getContext("2d")
      .drawImage(
        full,
        rect.x,
        rect.y,
        rect.w,
        rect.h,
        0,
        0,
        rect.w,
        rect.h
      );

    const dataUrl = crop.toDataURL("image/jpeg", 0.85);
    try {
      chrome.runtime.sendMessage({
        type: "t3-capture-result",
        dataUrl
      });
    } catch (e) {}
    cleanup();
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function cleanup() {
    try {
      window.removeEventListener("click", onClick, true);
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("resize", resize);
    } catch (e) {}
    try {
      video.pause();
      if (video.srcObject) {
        video.srcObject.getTracks().forEach((t) => t.stop());
      }
    } catch (e) {}
    overlay.remove();
  }
})();
