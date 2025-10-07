(() => {
  const STORAGE = {
    cfg: "t3_kimi_cfg",
    profile: "t3_kimi_profile",
    prompts: "t3_kimi_prompts",
    debug: "t3_kimi_debug"
  };

  let CFG = null;
  let PROFILE = null;
  let PROMPTS = null;
  let DEBUG = false;

  let toastEl, tipEl;
  let lastMouse = { x: 100, y: 100 };
  let hoveredImgSrc = "";

  init().catch(() => {});

  async function init() {
    await loadConfig();
    buildUI();
    wireEvents();
  }

  function buildUI() {
    toastEl = document.getElementById("t3km-toast-ext");
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.id = "t3km-toast-ext";
      toastEl.style.position = "fixed";
      toastEl.style.zIndex = "2147483647";
      toastEl.style.left = "50%";
      toastEl.style.transform = "translateX(-50%)";
      toastEl.style.bottom = "20px";
      toastEl.style.background = "rgba(50,50,50,0.95)";
      toastEl.style.color = "#fff";
      toastEl.style.borderRadius = "6px";
      toastEl.style.padding = "8px 10px";
      toastEl.style.font =
        "12px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif";
      toastEl.style.boxShadow = "0 2px 8px rgba(0,0,0,0.25)";
      toastEl.style.display = "none";
      document.documentElement.appendChild(toastEl);
    }

    tipEl = document.getElementById("t3km-tip-ext");
    if (!tipEl) {
      tipEl = document.createElement("div");
      tipEl.id = "t3km-tip-ext";
      tipEl.style.cssText = [
        "position:fixed",
        "z-index:2147483647",
        "right:16px",
        "bottom:16px",
        "width:420px",
        "max-width:95vw",
        "max-height:60vh",
        "overflow:auto",
        "background:#fff",
        "color:#222",
        "border:1px solid rgba(0,0,0,0.15)",
        "border-radius:6px",
        "box-shadow:0 6px 18px rgba(0,0,0,0.2)",
        "display:none",
        "font:13px/1.38 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif"
      ].join(";");
      tipEl.innerHTML =
        '<div style="display:flex;align-items:center;justify-content:space-between;padding:6px 8px;border-bottom:1px solid rgba(0,0,0,0.08);font-weight:600;">' +
        '<div>Kimi Output</div>' +
        '<div><span class="meta" style="font-weight:500;color:#666;font-size:12px;margin-right:6px;"></span>' +
        '<button class="btn-copy" style="background:#f1f1f1;color:#222;border:1px solid rgba(0,0,0,0.1);border-radius:4px;padding:4px 8px;cursor:pointer;font-size:12px;margin-right:6px;">Copy</button>' +
        '<button class="btn-close" style="background:#f1f1f1;color:#222;border:1px solid rgba(0,0,0,0.1);border-radius:4px;padding:4px 8px;cursor:pointer;font-size:12px;">Close</button>' +
        "</div></div>" +
        '<div class="body" style="padding:8px 10px;white-space:pre-wrap;word-wrap:break-word;"></div>';
      document.documentElement.appendChild(tipEl);
      tipEl.querySelector(".btn-close").addEventListener("click", () => {
        tipEl.style.display = "none";
      });
      tipEl.querySelector(".btn-copy").addEventListener("click", async () => {
        const text = tipEl.querySelector(".body").textContent || "";
        await copyToClipboard(text);
        toast("Copied.");
      });
    }
  }

  function wireEvents() {
    document.addEventListener(
      "mousemove",
      (e) => {
        lastMouse.x = e.clientX;
        lastMouse.y = e.clientY;
      },
      true
    );

    // Track hovered image src for hotkey "inputImage" fallback
    document.addEventListener(
      "mouseover",
      (e) => {
        const el = e.target;
        if (el && el.tagName === "IMG" && el.src) {
          hoveredImgSrc = el.src;
        }
      },
      true
    );

    window.addEventListener(
      "keydown",
      (e) => {
        if (!CFG?.hotkeys) return;
        try {
          if (isHotkey(e, CFG.hotkeys.inputSelectedText)) {
            e.preventDefault();
            inputSelectedText();
          } else if (isHotkey(e, CFG.hotkeys.inputClipboardText)) {
            e.preventDefault();
            inputClipboardText();
          } else if (isHotkey(e, CFG.hotkeys.inputImage)) {
            e.preventDefault();
            inputImage();
          } else if (isHotkey(e, CFG.hotkeys.captureArea)) {
            e.preventDefault();
            sendAction("captureArea");
          } else if (isHotkey(e, CFG.hotkeys.pasteOutputText)) {
            e.preventDefault();
            sendAction("pasteOutputText");
          } else if (isHotkey(e, CFG.hotkeys.copyOutputText)) {
            e.preventDefault();
            sendAction("copyOutputText");
          } else if (isHotkey(e, CFG.hotkeys.showOutputTooltip)) {
            e.preventDefault();
            sendAction("showOutputTooltip");
          }
        } catch (err) {
          dbg("keydown err", err);
        }
      },
      true
    );

    chrome.runtime.onMessage.addListener((msg) => {
      if (msg?.type === "t3-show-toast") {
        toast(msg.msg || "");
        return true;
      }
      if (msg?.type === "t3-show-tooltip") {
        showTooltip(msg.body || "", msg.meta || "");
        return true;
      }
      return false;
    });

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "sync") return;
      if (changes[STORAGE.cfg]) {
        CFG = { ...(CFG || {}), ...(changes[STORAGE.cfg].newValue || {}) };
      }
      if (changes[STORAGE.profile]) {
        PROFILE = {
          ...(PROFILE || {}),
          ...(changes[STORAGE.profile].newValue || {})
        };
      }
      if (changes[STORAGE.prompts]) {
        PROMPTS = {
          ...(PROMPTS || {}),
          ...(changes[STORAGE.prompts].newValue || {})
        };
      }
      if (changes[STORAGE.debug]) {
        DEBUG = !!changes[STORAGE.debug].newValue;
      }
    });
  }

  async function loadConfig() {
    const resp = await chrome.runtime.sendMessage({ type: "t3-get-config" });
    CFG = resp.cfg;
    PROFILE = resp.profile;
    PROMPTS = resp.prompts;
    DEBUG = !!resp.debug;
  }

  // ---------------- Actions triggered in page ----------------

  async function inputSelectedText() {
    let text = getSelectionText();
    if (!text) {
      try {
        if (navigator.clipboard?.readText) {
          text = await navigator.clipboard.readText();
        }
      } catch (e) {}
    }
    await sendAction("inputSelectedText", { text });
  }

  async function inputClipboardText() {
    let clip = "";
    try {
      if (navigator.clipboard?.readText) {
        clip = await navigator.clipboard.readText();
      }
    } catch (e) {}
    await sendAction("inputClipboardText", { text: clip });
  }

  async function inputImage() {
    // Try clipboard image first
    let dataUrl = "";
    try {
      if (navigator.clipboard?.read) {
        const items = await navigator.clipboard.read();
        for (const it of items) {
          const type = it.types.find((t) => t.startsWith("image/"));
          if (type) {
            const blob = await it.getType(type);
            dataUrl = await blobToDataURL(blob);
            break;
          }
        }
      }
    } catch (e) {}

    if (dataUrl) {
      await sendAction("inputImage", { dataUrl });
      return;
    }

    // Fallback to hovered image src collected in this content page
    if (hoveredImgSrc) {
      await sendAction("inputImage", { hoveredSrc: hoveredImgSrc });
      return;
    }

    toast("No clipboard or hovered image.");
  }

  // ---------------- UI helpers ----------------

  function toast(msg, ms = 1600) {
    if (!CFG?.toastsEnabled) return;
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.style.display = "block";
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(() => {
      toastEl.style.display = "none";
    }, ms);
  }

  function showTooltip(body, meta) {
    if (!tipEl) return;
    tipEl.querySelector(".body").textContent = body || "";
    tipEl.querySelector(".meta").textContent = meta || "";
    tipEl.style.display = "block";
  }

  function getSelectionText() {
    const sel = window.getSelection();
    return sel ? sel.toString() : "";
  }

  function isHotkey(e, combo) {
    if (!combo) return false;
    const parts = combo.toLowerCase().split("+").map((x) => x.trim());
    const need = {
      alt: parts.includes("alt"),
      shift: parts.includes("shift"),
      ctrl: parts.includes("ctrl") || parts.includes("control"),
      meta: parts.includes("meta") || parts.includes("cmd")
    };
    const main = parts.find(
      (k) => !["alt", "shift", "ctrl", "control", "meta", "cmd"].includes(k)
    );
    const key = e.key.toLowerCase();
    if (!!e.altKey !== need.alt) return false;
    if (!!e.shiftKey !== need.shift) return false;
    if (!!e.ctrlKey !== need.ctrl) return false;
    if (!!e.metaKey !== need.meta) return false;
    return !main || key === main;
  }

  async function sendAction(action, payload) {
    try {
      await chrome.runtime.sendMessage({
        type: "t3-action",
        action,
        payload
      });
    } catch (e) {
      dbg("sendAction error", action, e);
    }
  }

  async function copyToClipboard(text) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (e) {}
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      return true;
    } catch (e) {
      return false;
    }
  }

  function blobToDataURL(blob) {
    return new Promise((resolve) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result || ""));
      fr.readAsDataURL(blob);
    });
  }

  function dbg(...args) {
    if (DEBUG) console.log("[KimiExt:C]", ...args);
  }
})();
