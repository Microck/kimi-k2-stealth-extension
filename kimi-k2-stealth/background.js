/* eslint-disable no-console */
const STORAGE = {
  apiKey: "t3_kimi_api_key",
  cfg: "t3_kimi_cfg",
  profile: "t3_kimi_profile",
  prompts: "t3_kimi_prompts",
  debug: "t3_kimi_debug"
};

const DEFAULT_CFG = {
  baseUrl: "https://api.moonshot.ai",
  endpointPath: "/v1/chat/completions",
  modelText: "kimi-k2-0905-preview",
  modelVision: "moonshot-v1-128k-vision-preview",
  temperature: 0.2,
  toastsEnabled: true,
  imgMaxDim: 1600,
  jpegQuality: 0.85,
  autoClearMs: 10 * 60 * 1000,
  hotkeys: {
    openMenu: "Ctrl+Shift+M",
    inputSelectedText: "Ctrl+Shift+T",
    inputClipboardText: "Ctrl+Shift+L",
    inputImage: "Ctrl+Shift+I",
    captureArea: "Ctrl+Shift+C",
    pasteOutputText: "Ctrl+Shift+P",
    copyOutputText: "Ctrl+Shift+Y",
    showOutputTooltip: "Ctrl+Shift+U"
  }
};

const DEFAULT_PROFILE = {
  language: "en-US",
  mode: "technical", // "technical" | "student" | "singleAnswer" | "shortAnswer"
  outputFormat: "plain", // "plain" | "json"
  length: "medium", // "short" | "medium" | "long" | "extraLong"
  autoLangDetect: true,
  maxChars: 1600,
  trimInput: true
};

const DEFAULT_PROMPTS = {
  inputSelectedText:
    "Focus only on relevant content. Ignore unrelated parts. Be concise.",
  inputClipboardText:
    "Use only what is necessary from the clipboard text. Be concise.",
  inputImage:
    "Answer the captured region and answer the task briefly and precisely. Be concise and exact.",
  captureArea:
    "Explain the captured region and answer the task briefly and precisely."
};

const LENGTH_PRESETS = {
  short:
    "Respond in one single plain-line sentence (~20 words). No intro text.",
  medium:
    "Respond in one concise paragraph of ~3 lines. Plain text only. No intro.",
  long:
    "Respond in one compact paragraph of ~5 lines. Plain text only. No intro.",
  extraLong: "Respond in about 3 short paragraphs. Plain text only. No intro."
};

let lastOutput = "";
let lastMeta = "";
let autoClearTimer = null;

chrome.runtime.onInstalled.addListener(async () => {
  await recreateMenus();
});

chrome.runtime.onStartup.addListener(async () => {
  await recreateMenus();
});

async function recreateMenus() {
  try {
    await chrome.contextMenus.removeAll();
  } catch (e) {}
  const items = [
    {
      id: "t3_sel",
      title: "Kimi: Process selected text",
      contexts: ["selection"]
    },
    {
      id: "t3_clip_text",
      title: "Kimi: Process clipboard text",
      contexts: ["page"]
    },
    {
      id: "t3_img_ctx",
      title: "Kimi: Describe this image",
      contexts: ["image"]
    },
    {
      id: "t3_clip_img",
      title: "Kimi: Input image from clipboard",
      contexts: ["page"]
    },
    {
      id: "t3_cap",
      title: "Kimi: Capture area (A→B)",
      contexts: ["page"]
    },
    {
      id: "t3_sep1",
      type: "separator",
      contexts: ["all"]
    },
    {
      id: "t3_paste",
      title: "Kimi: Paste last output",
      contexts: ["all"]
    },
    {
      id: "t3_copy",
      title: "Kimi: Copy last output",
      contexts: ["all"]
    },
    {
      id: "t3_show",
      title: "Kimi: Show last output",
      contexts: ["all"]
    }
  ];
  for (const it of items) {
    try {
      chrome.contextMenus.create(it);
    } catch (e) {
      log("menu create failed", it, e);
    }
  }
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const tabId = tab?.id;
  if (!tabId) return;
  try {
    switch (info.menuItemId) {
      case "t3_sel":
        await handleSelectedText(info.selectionText || "", tabId);
        break;
      case "t3_clip_text":
        await handleClipboardText(tabId);
        break;
      case "t3_img_ctx":
        await handleImageFromUrl(info.srcUrl, tabId, "img");
        break;
      case "t3_clip_img":
        await handleClipboardImage(tabId);
        break;
      case "t3_cap":
        await startCapture(tabId);
        break;
      case "t3_paste":
        await pasteLastOutput(tabId);
        break;
      case "t3_copy":
        await copyLastOutput(tabId);
        break;
      case "t3_show":
        await showLastOutput(tabId);
        break;
    }
  } catch (e) {
    await toastInTab(tabId, "Error: " + (e?.message || e));
    log("onClicked error", e);
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || !msg.type) return false;

  // Hotkeys and page-driven actions from content.js
  if (msg.type === "t3-action") {
    (async () => {
      const tabId = sender.tab?.id;
      if (!tabId) return;

      const a = msg.action;
      try {
        if (a === "inputSelectedText") {
          const t = String(msg.payload?.text || "").trim();
          if (t) await handleSelectedText(t, tabId);
          else await toastInTab(tabId, "No selection or clipboard text.");
        } else if (a === "inputClipboardText") {
          await handleClipboardText(tabId);
        } else if (a === "inputImage") {
          const p = msg.payload || {};
          if (p.dataUrl) {
            await handleImageFromDataUrl(p.dataUrl, tabId, "clipboard");
          } else if (p.hoveredSrc) {
            await handleImageFromUrl(p.hoveredSrc, tabId, "hovered");
          } else {
            await toastInTab(tabId, "No clipboard or hovered image.");
          }
        } else if (a === "captureArea") {
          await startCapture(tabId);
        } else if (a === "pasteOutputText") {
          await pasteLastOutput(tabId);
        } else if (a === "copyOutputText") {
          await copyLastOutput(tabId);
        } else if (a === "showOutputTooltip") {
          await showLastOutput(tabId);
        }
      } catch (e) {
        await toastInTab(tabId, "Error: " + (e?.message || e));
        log("t3-action error", a, e);
      }
    })();
    sendResponse({ ok: true });
    return true;
  }

  // Overlay capture result
  if (msg.type === "t3-capture-result") {
    (async () => {
      const tabId = sender.tab?.id;
      if (!tabId) return;
      try {
        const cfg = await getCfg();
        const profile = await getProfile();
        const lang = profile.language;
        const sys = buildSystemPrompt(profile, lang);
        const textPart = buildUserForImage(
          (await getPrompts()).captureArea,
          lang
        );
        const downsized = await downscaleDataUrl(
          msg.dataUrl,
          cfg.imgMaxDim,
          cfg.jpegQuality
        );
        const messages = [
          { role: "system", content: sys },
          {
            role: "user",
            content: [textPart, { type: "image_url", image_url: downsized }]
          }
        ];
        const { text, meta } = await callKimi(messages, cfg.modelVision);
        await setLast(text, `${cfg.modelVision}, ${metaFrom(null, null, "capture")}`);
        await copyToClipboardInTab(tabId, text);
        await toastInTab(tabId, "Copied.");
      } catch (e) {
        await toastInTab(tabId, "Error: " + (e?.message || e));
        log("capture error", e);
      }
    })();
    sendResponse({ ok: true });
    return true;
  }

  // Content asks for last output/meta
  if (msg.type === "t3-get-last") {
    sendResponse({ output: lastOutput, meta: lastMeta });
    return true;
  }

  // Content asks for cfg/profile/prompts
  if (msg.type === "t3-get-config") {
    (async () => {
      const [cfg, profile, prompts, debug] = await Promise.all([
        getCfg(),
        getProfile(),
        getPrompts(),
        getDebug()
      ]);
      sendResponse({ cfg, profile, prompts, debug });
    })();
    return true;
  }

  return false;
});

// ---------------- Actions ----------------

async function handleSelectedText(selected, tabId) {
  let text = String(selected || "");
  if (!text.trim()) {
    // fallback to clipboard text
    text = await readClipboardTextInTab(tabId);
    if (!text.trim()) {
      await toastInTab(tabId, "No selection or clipboard text.");
      return;
    }
  }
  const cfg = await getCfg();
  const profile = await getProfile();
  const prompts = await getPrompts();
  const norm = normalizeInput(text, profile.maxChars, profile.trimInput);
  const lang = detectLanguage(norm, profile);
  const sys = buildSystemPrompt(profile, lang);
  const user = buildUserForText(prompts.inputSelectedText, norm, lang);
  const messages = [
    { role: "system", content: sys },
    { role: "user", content: user }
  ];
  const { text: out, raw, usage } = await callKimi(messages, cfg.modelText);
  const fmtUsed =
    profile.mode === "singleAnswer" || profile.mode === "shortAnswer"
      ? "json"
      : profile.outputFormat;
  const clean = postProcess(out, lang, profile.mode, fmtUsed, profile);
  await setLast(clean, `${cfg.modelText}, ${metaFrom(raw, usage, lang)}`);
  await copyToClipboardInTab(tabId, clean);
  await toastInTab(tabId, "Copied.");
}

async function handleClipboardText(tabId) {
  const clip = await readClipboardTextInTab(tabId);
  if (!clip || !clip.trim()) {
    await toastInTab(tabId, "No clipboard text.");
    return;
  }
  const cfg = await getCfg();
  const profile = await getProfile();
  const prompts = await getPrompts();
  const norm = normalizeInput(clip, profile.maxChars, profile.trimInput);
  const lang = detectLanguage(norm, profile);
  const sys = buildSystemPrompt(profile, lang);
  const user = buildUserForText(prompts.inputClipboardText, norm, lang);
  const messages = [
    { role: "system", content: sys },
    { role: "user", content: user }
  ];
  const { text: out, raw, usage } = await callKimi(messages, cfg.modelText);
  const fmtUsed =
    profile.mode === "singleAnswer" || profile.mode === "shortAnswer"
      ? "json"
      : profile.outputFormat;
  const clean = postProcess(out, lang, profile.mode, fmtUsed, profile);
  await setLast(clean, `${cfg.modelText}, ${metaFrom(raw, usage, lang)}`);
  await copyToClipboardInTab(tabId, clean);
  await toastInTab(tabId, "Copied.");
}

async function handleClipboardImage(tabId) {
  // Ask page to read clipboard image (must be user-initiated via menu)
  const [{ result: dataUrl }] = await chrome.scripting.executeScript({
    target: { tabId },
    func: async () => {
      if (!navigator.clipboard?.read) return "";
      try {
        const items = await navigator.clipboard.read();
        for (const it of items) {
          const type = it.types.find((t) => t.startsWith("image/"));
          if (type) {
            const blob = await it.getType(type);
            const fr = new FileReader();
            const p = new Promise((res) => {
              fr.onload = () => res(String(fr.result || ""));
            });
            fr.readAsDataURL(blob);
            return await p;
          }
        }
      } catch (e) {}
      return "";
    }
  });
  if (!dataUrl) {
    await toastInTab(tabId, "No clipboard image.");
    return;
  }
  await handleImageFromDataUrl(dataUrl, tabId, "clipboard");
}

async function handleImageFromUrl(srcUrl, tabId, sourceLabel) {
  if (!srcUrl) {
    await toastInTab(tabId, "No image source.");
    return;
  }
  const cfg = await getCfg();
  const ab = await fetchArrayBuffer(srcUrl);
  const dataUrl = await downscaleArrayBufferToDataUrl(
    ab.bytes,
    ab.type,
    cfg.imgMaxDim,
    cfg.jpegQuality
  );
  await handleImageCommon(dataUrl, tabId, sourceLabel || "img");
}

async function handleImageFromDataUrl(dataUrl, tabId, sourceLabel) {
  const cfg = await getCfg();
  const downsized = await downscaleDataUrl(
    dataUrl,
    cfg.imgMaxDim,
    cfg.jpegQuality
  );
  await handleImageCommon(downsized, tabId, sourceLabel || "clipboard");
}

async function handleImageCommon(dataUrl, tabId, source) {
  const cfg = await getCfg();
  const profile = await getProfile();
  const prompts = await getPrompts();
  const lang = profile.language;
  const sys = buildSystemPrompt(profile, lang);
  const textPart = buildUserForImage(prompts.inputImage, lang);
  const messages = [
    { role: "system", content: sys },
    {
      role: "user",
      content: [textPart, { type: "image_url", image_url: dataUrl }]
    }
  ];
  const { text: out, raw, usage } = await callKimi(messages, cfg.modelVision);
  const fmtUsed =
    profile.mode === "singleAnswer" || profile.mode === "shortAnswer"
      ? "json"
      : profile.outputFormat;
  const clean = postProcess(out, lang, profile.mode, fmtUsed, profile);
  await setLast(clean, `${cfg.modelVision}, ${metaFrom(raw, usage, source)}`);
  await copyToClipboardInTab(tabId, clean);
  await toastInTab(tabId, "Copied.");
}

async function pasteLastOutput(tabId) {
  if (!lastOutput) {
    await toastInTab(tabId, "No output yet.");
    return;
  }
  const ok = await insertAtCaretInTab(tabId, lastOutput);
  if (ok) await toastInTab(tabId, "Pasted.");
  else {
    await copyToClipboardInTab(tabId, lastOutput);
    await toastInTab(tabId, "Copied.");
  }
}

async function copyLastOutput(tabId) {
  if (!lastOutput) {
    await toastInTab(tabId, "No output yet.");
    return;
  }
  await copyToClipboardInTab(tabId, lastOutput);
  await toastInTab(tabId, "Copied.");
}

async function showLastOutput(tabId) {
  if (!lastOutput) {
    await toastInTab(tabId, "No output yet.");
    return;
  }
  await showTooltipInTab(tabId, { body: lastOutput, meta: lastMeta });
}

async function startCapture(tabId) {
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["overlay.js"]
  });
}

// ---------------- Config + storage ----------------

async function getCfg() {
  const st = await chrome.storage.sync.get(STORAGE.cfg);
  return { ...DEFAULT_CFG, ...(st[STORAGE.cfg] || {}) };
}
async function getProfile() {
  const st = await chrome.storage.sync.get(STORAGE.profile);
  return { ...DEFAULT_PROFILE, ...(st[STORAGE.profile] || {}) };
}
async function getPrompts() {
  const st = await chrome.storage.sync.get(STORAGE.prompts);
  return { ...DEFAULT_PROMPTS, ...(st[STORAGE.prompts] || {}) };
}
async function getApiKey() {
  const st = await chrome.storage.sync.get(STORAGE.apiKey);
  const k = (st[STORAGE.apiKey] || "").trim();
  if (!k) throw new Error("Missing API key (set it in Options).");
  return k;
}
async function getDebug() {
  const st = await chrome.storage.sync.get(STORAGE.debug);
  return !!st[STORAGE.debug];
}

async function setLast(out, meta) {
  lastOutput = String(out || "");
  lastMeta = String(meta || "");
  const cfg = await getCfg();
  if (autoClearTimer) clearTimeout(autoClearTimer);
  if (cfg.autoClearMs) {
    autoClearTimer = setTimeout(() => {
      lastOutput = "";
      lastMeta = "";
      log("Auto-cleared cached output");
    }, cfg.autoClearMs);
  }
}

// ---------------- Prompt + processing ----------------

function detectLanguage(sample, profile) {
  if (!profile.autoLangDetect) return profile.language;
  const s = (sample || "").slice(0, 800).toLowerCase();
  let es = 0;
  [
    " el ",
    " la ",
    " los ",
    " las ",
    " un ",
    " una ",
    " es ",
    " para ",
    " con ",
    " que ",
    " de ",
    " por ",
    " en ",
    " y ",
    " o ",
    "¿",
    "¡",
    "ción",
    "sión",
    "ñ",
    "á",
    "é",
    "í",
    "ó",
    "ú"
  ].forEach((h) => s.includes(h) && es++);
  let en = 0;
  [
    " the ",
    " and ",
    " or ",
    " with ",
    " for ",
    " of ",
    " to ",
    " in ",
    " on ",
    " is ",
    " are ",
    " can ",
    " will "
  ].forEach((h) => s.includes(h) && en++);
  if (es > en + 1) return "es-ES";
  if (en > es + 1) return "en-US";
  return profile.language;
}

function buildSystemPrompt(profile, lang) {
  const mode = profile.mode;
  const fmt =
    mode === "singleAnswer" || mode === "shortAnswer"
      ? "json"
      : profile.outputFormat || "plain";
  const lengthRule =
    mode === "singleAnswer" || mode === "shortAnswer"
      ? "Ignore length; answer must be minimal."
      : LENGTH_PRESETS[profile.length] || LENGTH_PRESETS.medium;
  const langLine =
    lang === "es-ES" ? "Language: Español (España)." : "Language: English.";

  let modeLine = "";
  if (mode === "technical") {
    modeLine =
      lang === "es-ES"
        ? "Modo: técnico, preciso y conciso."
        : "Mode: technical, precise, and concise.";
  } else if (mode === "student") {
    modeLine =
      lang === "es-ES"
        ? "Modo: estudiante (grado medio de informática). Lenguaje sencillo, claro y natural."
        : "Mode: student (mid-level IT). Simple, clear, natural language.";
  } else if (mode === "singleAnswer") {
    modeLine =
      lang === "es-ES"
        ? "Modo: respuesta única (una letra o palabra)."
        : "Mode: single answer (one letter or one word).";
  } else if (mode === "shortAnswer") {
    modeLine =
      lang === "es-ES"
        ? "Modo: respuesta corta (pocas palabras)."
        : "Mode: short answer (few words).";
  }

  const fmtLine =
    fmt === "json"
      ? "Output format: JSON only. No code fences, no markdown, no extra keys."
      : "Output format: plain text only. No markdown, no lists, no intro text.";

  const behavior =
    lang === "es-ES"
      ? [
          "Responde solo con el contenido solicitado, sin saludos ni frases de relleno.",
          "No uses formato markdown, emojis, negritas o cursivas.",
          "Mantén el espaciado normal y sin líneas extra."
        ].join("\n")
      : [
          "Respond only with the requested content; no greetings or filler phrases.",
          "Do not use markdown, emojis, bold or italics.",
          "Keep normal spacing with no extra blank lines."
        ].join("\n");

  const jsonRule =
    (mode === "singleAnswer" || mode === "shortAnswer") && fmt === "json"
      ? lang === "es-ES"
        ? 'Devuelve únicamente: {"answer":"..."} sin claves adicionales.'
        : 'Return only: {"answer":"..."} with no additional keys.'
      : "";

  return [
    "You are Kimi, an AI assistant by Moonshot AI.",
    langLine,
    modeLine,
    fmtLine,
    "Length target: " + lengthRule,
    "Behavior rules:",
    behavior,
    jsonRule
  ]
    .filter(Boolean)
    .join("\n");
}

function buildUserForText(directive, text, lang) {
  const label =
    lang === "es-ES"
      ? "Texto (entre triple comillas)."
      : "Text (between triple quotes).";
  const head = directive
    ? lang === "es-ES"
      ? `Directiva: ${directive}\n`
      : `Directive: ${directive}\n`
    : "";
  const replyLine =
    lang === "es-ES" ? "Responde de forma concisa." : "Reply concisely.";
  return head + `${label}\n"""${text}"""\n` + replyLine;
}

function buildUserForImage(directive, lang) {
  const text =
    directive ||
    (lang === "es-ES"
      ? "Describe o responde sobre la imagen con precisión y brevedad."
      : "Describe or answer about the image precisely and briefly.");
  return { type: "text", text };
}

function stripMarkdownAndFiller(s) {
  let out = String(s || "");
  out = out.replace(/^\s*```[\s\S]*?```/g, "").trim();
  out = out.replace(/^\s*[*_#>\-]+/gm, "").trim();
  const heads = [
    /^answer\s*[:\-]\s*/i,
    /^respuesta\s*[:\-]\s*/i,
    /^(here(?:’|')?s|here is)\s+(the\s+)?(answer|result|summary)\s*[:\-]?\s*/i,
    /^(la|una)\s+respuesta\s*[:\-]?\s*/i,
    /^(resultado|resumen)\s*[:\-]?\s*/i
  ];
  for (const re of heads) out = out.replace(re, "");
  out = out.replace(/[ \t]+/g, " ");
  out = out.replace(/\n{3,}/g, "\n\n").trim();
  if (!out.includes("\n")) {
    out = out.replace(/([^\w)])\s*$/, (m, g1) =>
      /[.?!,:;)]/.test(g1) ? "" : g1
    );
  }
  return out.trim();
}

function extractJsonAnswer(raw) {
  if (!raw) return null;
  let s = String(raw).trim();
  s = s.replace(/^```json\s*|^```\s*|```$/gim, "").trim();
  try {
    const obj = JSON.parse(s);
    if (obj && typeof obj.answer !== "undefined") return obj;
  } catch {}
  if (/^answer\s*[:\-]\s*/i.test(s)) {
    const ans = s.replace(/^answer\s*[:\-]\s*/i, "").trim();
    return { answer: ans };
  }
  return null;
}

function postProcess(text, lang, mode, fmt, profile) {
  let out = String(text || "");
  if (mode === "singleAnswer" || mode === "shortAnswer") {
    const obj = extractJsonAnswer(out);
    if (obj && typeof obj.answer !== "undefined")
      return String(obj.answer || "").trim();
    return stripMarkdownAndFiller(out);
  }
  if (fmt === "json") {
    const obj = extractJsonAnswer(out);
    if (obj && typeof obj.answer !== "undefined")
      return String(obj.answer || "").trim();
  }
  out = stripMarkdownAndFiller(out);
  if (profile.length === "short") {
    out = out.replace(/\s*\n\s*/g, " ").trim();
  }
  return out;
}

// ---------------- API ----------------

async function callKimi(messages, model) {
  const apiKey = await getApiKey();
  const cfg = await getCfg();
  const url = new URL(cfg.endpointPath, cfg.baseUrl).toString();
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: cfg.temperature,
      stream: false
    })
  });
  if (!res.ok) {
    throw new Error("Kimi API error: " + res.status + " " + (await res.text()));
  }
  const data = await res.json();
  const text =
    data?.choices?.[0]?.message?.content ||
    data?.output_text ||
    data?.text ||
    "";
  const usage = data?.usage || null;
  return { text: String(text || "").trim(), raw: data, usage };
}

function metaFrom(raw, usage, extra) {
  try {
    const finish = raw?.choices?.[0]?.finish_reason || "";
    const u = usage
      ? `tok p${usage.prompt_tokens || 0}/c${usage.completion_tokens || 0}/t${
          usage.total_tokens || 0
        }`
      : "";
    const add = extra ? `, ${extra}` : "";
    return `${finish}${add} ${u}`.trim();
  } catch {
    return extra || "";
  }
}

// ---------------- Binary + imaging ----------------

async function fetchArrayBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Image fetch failed: " + res.status);
  const type = res.headers.get("content-type") || "image/jpeg";
  const bytes = await res.arrayBuffer();
  return { bytes, type };
}

async function downscaleArrayBufferToDataUrl(
  bytes,
  type,
  maxDim,
  quality
) {
  try {
    const blob = new Blob([bytes], { type: type || "image/jpeg" });
    const bmp = await createImageBitmap(blob);
    const w = bmp.width;
    const h = bmp.height;
    let nw = w;
    let nh = h;
    if (Math.max(w, h) > maxDim) {
      const s = maxDim / Math.max(w, h);
      nw = Math.max(1, Math.round(w * s));
      nh = Math.max(1, Math.round(h * s));
    }
    const oc = new OffscreenCanvas(nw, nh);
    const ctx = oc.getContext("2d");
    ctx.drawImage(bmp, 0, 0, nw, nh);
    const outBlob = await oc.convertToBlob({
      type: "image/jpeg",
      quality: quality
    });
    const ab = await outBlob.arrayBuffer();
    const b64 = toBase64(new Uint8Array(ab));
    return `data:image/jpeg;base64,${b64}`;
  } catch (e) {
    // Fallback: return original as data URL
    const b64 = toBase64(new Uint8Array(bytes));
    return `data:${type};base64,${b64}`;
  }
}

async function downscaleDataUrl(dataUrl, maxDim, quality) {
  try {
    const arr = dataUrlToBytes(dataUrl);
    return await downscaleArrayBufferToDataUrl(
      arr.bytes,
      arr.type,
      maxDim,
      quality
    );
  } catch (e) {
    return dataUrl;
  }
}

function dataUrlToBytes(dataUrl) {
  const m = String(dataUrl).match(/^data:(.*?);base64,(.*)$/);
  if (!m) throw new Error("Invalid data URL");
  const type = m[1] || "image/jpeg";
  const bin = atob(m[2]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { bytes: bytes.buffer, type };
}

function toBase64(bytes) {
  let bin = "";
  for (let i = 0; i < bytes.length; i++)
    bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

// ---------------- Page helpers (exec in tab) ----------------

async function readClipboardTextInTab(tabId) {
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId },
    func: async () => {
      try {
        if (navigator.clipboard?.readText) {
          const t = await navigator.clipboard.readText();
          return t || "";
        }
      } catch (e) {}
      return "";
    }
  });
  return String(result || "");
}

async function copyToClipboardInTab(tabId, text) {
  await chrome.scripting.executeScript({
    target: { tabId },
    func: async (t) => {
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(t);
          return true;
        }
      } catch (e) {}
      try {
        const ta = document.createElement("textarea");
        ta.value = t;
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
    },
    args: [text]
  });
}

async function insertAtCaretInTab(tabId, text) {
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId },
    func: (t) => {
      function activeTextTarget() {
        const el = document.activeElement;
        if (!el) return null;
        const tag = (el.tagName || "").toLowerCase();
        if (
          tag === "textarea" ||
          (tag === "input" &&
            /^(text|search|url|email|tel)$/i.test(el.type))
        ) {
          return el;
        }
        if (el.isContentEditable) return el;
        return null;
      }
      function insertAtCaret(text) {
        const el = activeTextTarget();
        if (!el) return false;
        if (el.isContentEditable) {
          try {
            document.execCommand("insertText", false, text);
            return true;
          } catch (e) {}
          const sel = window.getSelection();
          if (!sel || !sel.rangeCount) return false;
          const range = sel.getRangeAt(0);
          range.deleteContents();
          range.insertNode(document.createTextNode(text));
          return true;
        }
        const start = el.selectionStart ?? el.value.length;
        const end = el.selectionEnd ?? el.value.length;
        const before = el.value.slice(0, start);
        const after = el.value.slice(end);
        el.value = before + text + after;
        const pos = start + text.length;
        el.selectionStart = el.selectionEnd = pos;
        el.dispatchEvent(new Event("input", { bubbles: true }));
        return true;
      }
      return insertAtCaret(t);
    },
    args: [text]
  });
  return !!result;
}

async function toastInTab(tabId, msg) {
  const cfg = await getCfg();
  if (!cfg.toastsEnabled) return;
  await chrome.tabs.sendMessage(tabId, {
    type: "t3-show-toast",
    msg
  });
}

async function showTooltipInTab(tabId, data) {
  await chrome.tabs.sendMessage(tabId, {
    type: "t3-show-tooltip",
    body: data.body,
    meta: data.meta
  });
}

// ---------------- Misc ----------------

function normalizeInput(str, cap, doTrim) {
  let s = String(str || "");
  if (doTrim) s = s.replace(/\s+/g, " ").trim();
  if (cap && s.length > cap) s = s.slice(0, cap);
  return s;
}

async function log(...args) {
  const dbg = await getDebug();
  if (dbg) console.log("[KimiExt]", ...args);
}
