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
  autoClearMs: 600000,
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
  mode: "technical",
  outputFormat: "plain",
  length: "medium",
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

const els = {
  apiKey: document.getElementById("apiKey"),
  baseUrl: document.getElementById("baseUrl"),
  endpointPath: document.getElementById("endpointPath"),
  modelText: document.getElementById("modelText"),
  modelVision: document.getElementById("modelVision"),
  temperature: document.getElementById("temperature"),

  language: document.getElementById("language"),
  mode: document.getElementById("mode"),
  outputFormat: document.getElementById("outputFormat"),
  length: document.getElementById("length"),
  autoLangDetect: document.getElementById("autoLangDetect"),
  maxChars: document.getElementById("maxChars"),
  trimInput: document.getElementById("trimInput"),
  autoClearMs: document.getElementById("autoClearMs"),
  toastsEnabled: document.getElementById("toastsEnabled"),
  debug: document.getElementById("debug"),

  imgMaxDim: document.getElementById("imgMaxDim"),
  jpegQuality: document.getElementById("jpegQuality"),

  p_sel: document.getElementById("p_sel"),
  p_cliptext: document.getElementById("p_cliptext"),
  p_img: document.getElementById("p_img"),
  p_cap: document.getElementById("p_cap"),

  hk_sel: document.getElementById("hk_sel"),
  hk_cliptext: document.getElementById("hk_cliptext"),
  hk_img: document.getElementById("hk_img"),
  hk_cap: document.getElementById("hk_cap"),
  hk_paste: document.getElementById("hk_paste"),
  hk_copy: document.getElementById("hk_copy"),
  hk_show: document.getElementById("hk_show"),

  save: document.getElementById("save"),
  reset: document.getElementById("reset"),
  status: document.getElementById("status")
};

document.addEventListener("DOMContentLoaded", loadAll);
els.save.addEventListener("click", saveAll);
els.reset.addEventListener("click", resetDefaults);

async function loadAll() {
  const st = await chrome.storage.sync.get(null);
  const apiKey = st[STORAGE.apiKey] || "";
  const cfg = { ...DEFAULT_CFG, ...(st[STORAGE.cfg] || {}) };
  const profile = { ...DEFAULT_PROFILE, ...(st[STORAGE.profile] || {}) };
  const prompts = { ...DEFAULT_PROMPTS, ...(st[STORAGE.prompts] || {}) };
  const debug = !!st[STORAGE.debug];

  els.apiKey.value = apiKey;
  els.baseUrl.value = cfg.baseUrl;
  els.endpointPath.value = cfg.endpointPath;
  els.modelText.value = cfg.modelText;
  els.modelVision.value = cfg.modelVision;
  els.temperature.value = cfg.temperature;

  els.language.value = profile.language;
  els.mode.value = profile.mode;
  els.outputFormat.value = profile.outputFormat;
  els.length.value = profile.length;
  els.autoLangDetect.value = String(profile.autoLangDetect);
  els.maxChars.value = profile.maxChars;
  els.trimInput.value = String(profile.trimInput);
  els.autoClearMs.value = cfg.autoClearMs;
  els.toastsEnabled.value = String(cfg.toastsEnabled);
  els.debug.value = String(debug);

  els.imgMaxDim.value = cfg.imgMaxDim;
  els.jpegQuality.value = cfg.jpegQuality;

  els.p_sel.value = prompts.inputSelectedText;
  els.p_cliptext.value = prompts.inputClipboardText;
  els.p_img.value = prompts.inputImage;
  els.p_cap.value = prompts.captureArea;

  els.hk_sel.value = cfg.hotkeys.inputSelectedText;
  els.hk_cliptext.value = cfg.hotkeys.inputClipboardText;
  els.hk_img.value = cfg.hotkeys.inputImage;
  els.hk_cap.value = cfg.hotkeys.captureArea;
  els.hk_paste.value = cfg.hotkeys.pasteOutputText;
  els.hk_copy.value = cfg.hotkeys.copyOutputText;
  els.hk_show.value = cfg.hotkeys.showOutputTooltip;
}

async function saveAll() {
  const apiKey = els.apiKey.value.trim();
  const cfg = {
    baseUrl: els.baseUrl.value.trim(),
    endpointPath: els.endpointPath.value.trim(),
    modelText: els.modelText.value.trim(),
    modelVision: els.modelVision.value.trim(),
    temperature: Number(els.temperature.value) || 0.2,
    toastsEnabled: els.toastsEnabled.value === "true",
    imgMaxDim: Number(els.imgMaxDim.value) || 1600,
    jpegQuality: Number(els.jpegQuality.value) || 0.85,
    autoClearMs: Number(els.autoClearMs.value) || 600000,
    hotkeys: {
      inputSelectedText: els.hk_sel.value.trim() || "Ctrl+Shift+T",
      inputClipboardText: els.hk_cliptext.value.trim() || "Ctrl+Shift+L",
      inputImage: els.hk_img.value.trim() || "Ctrl+Shift+I",
      captureArea: els.hk_cap.value.trim() || "Ctrl+Shift+C",
      pasteOutputText: els.hk_paste.value.trim() || "Ctrl+Shift+P",
      copyOutputText: els.hk_copy.value.trim() || "Ctrl+Shift+Y",
      showOutputTooltip: els.hk_show.value.trim() || "Ctrl+Shift+U"
    }
  };
  const profile = {
    language: els.language.value,
    mode: els.mode.value,
    outputFormat: els.outputFormat.value,
    length: els.length.value,
    autoLangDetect: els.autoLangDetect.value === "true",
    maxChars: Number(els.maxChars.value) || 1600,
    trimInput: els.trimInput.value === "true"
  };
  const prompts = {
    inputSelectedText: els.p_sel.value.trim(),
    inputClipboardText: els.p_cliptext.value.trim(),
    inputImage: els.p_img.value.trim(),
    captureArea: els.p_cap.value.trim()
  };
  const debug = els.debug.value === "true";

  await chrome.storage.sync.set({
    [STORAGE.apiKey]: apiKey,
    [STORAGE.cfg]: cfg,
    [STORAGE.profile]: profile,
    [STORAGE.prompts]: prompts,
    [STORAGE.debug]: debug
  });
  status("Saved.");
}

async function resetDefaults() {
  await chrome.storage.sync.set({
    [STORAGE.cfg]: DEFAULT_CFG,
    [STORAGE.profile]: DEFAULT_PROFILE,
    [STORAGE.prompts]: DEFAULT_PROMPTS
  });
  status("Reset. Reloading...");
  setTimeout(loadAll, 400);
}

function status(msg) {
  els.status.textContent = msg;
  setTimeout(() => (els.status.textContent = ""), 1200);
}
