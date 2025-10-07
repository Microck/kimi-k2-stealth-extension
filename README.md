# Kimi K2 Stealth (Extension)

Stealth browser extension for Moonshot Kimi K2: crosshair A→B screen capture, clipboard text/image, smart prompting, auto‑copied outputs, and native right‑click menus.

API note: This extension assumes Moonshot Kimi’s Chat Completions API is OpenAI‑compatible at `https://api.moonshot.ai/v1/chat/completions`. If your account uses different endpoints/models, adjust them in Options.


---

## Features

- Native right‑click integration
  - “Kimi: Process selected text” (appears when text is highlighted)
  - Submenu items: clipboard text, clipboard image, capture area (A→B), paste/copy/show last output
  - Right‑click on an `<img>` → “Kimi: Describe this image”
- Two‑click crosshair capture (A → B) with vision model (no extra UI)
- Input sources:
  - Selected text (falls back to clipboard text if none via hotkey)
  - Clipboard text
  - Clipboard image (or right‑clicked `<img>`)
- Auto‑copy outputs for all actions (no extra dialogs)
- Smart prompt profile:
  - Language: English (US) or Spanish (Spain), optional auto‑detect for text
  - Modes: technical, student, singleAnswer, shortAnswer
  - Length presets: short, medium, long, extraLong
  - Plain text only (no filler/markdown) or minimal JSON for single/short answers
- Toggleable bottom toasts (silent mode)
- Privacy‑first: no telemetry; API key stored locally by the extension

---

## Install

1) Load the extension  
- Chrome/Edge/Brave: open `chrome://extensions`, enable Developer mode, click “Load unpacked,” and select the folder with `manifest.json`.

2) Configure  
- Open the extension Options:
  - Set Kimi API Key (paste your Moonshot Kimi key)
  - Optional: Toggle toasts, Language, Mode, Output length, Hotkeys, Models, Base URL/Endpoint

---

## Quick start

- Right‑click highlighted text → “Kimi: Process selected text.”
- Right‑click an image → “Kimi: Describe this image.”
- Right‑click page → Kimi K2 Stealth submenu:
  - Process clipboard text
  - Input image from clipboard
  - Capture area (A→B)
  - Paste / Copy / Show last output
- Every result is automatically copied to the clipboard. You can optionally show the last output in a floating tooltip.

Note: The browser’s “select a screen/window/tab” prompt for capture is required by browser security and cannot be bypassed. For best mapping, choose “This tab” or “Entire screen.”

---

## Default hotkeys

- Input selected text: Ctrl+Shift+T
- Input clipboard text: Ctrl+Shift+L
- Input image (clipboard/hovered): Ctrl+Shift+I
- Capture area (A→B): Ctrl+Shift+C
- Paste output text: Ctrl+Shift+P
- Copy output: Ctrl+Shift+Y
- Show output tooltip: Ctrl+Shift+U

You can change these in Options.

---

## Settings (Options) — in depth

Open the extension Options. All settings persist locally (Chrome Sync).

### 1) Set Kimi API Key
- Stores your Moonshot Kimi API key locally.
- Required once. You can rotate it anytime.

### 2) Toggle toasts
- Shows/hides the small bottom messages (“Copied.” / “Error.”).
- Useful for stealth or when you only want silent auto‑copy behavior.

### 3) Language (ES/EN)
- Switches prompt language: Spanish (Spain) or English (US).
- Also used for “student” tone.

### 4) Mode (technical / student / singleAnswer / shortAnswer)
- technical: expert‑level, precise, concise.
- student: simpler language, clearer explanations.
- singleAnswer: output reduced to a single letter/word; the extension requests minimal JSON and extracts `answer`.
- shortAnswer: a few words only; same minimal‑JSON discipline.
- Note: In single/short modes, “Output format” is minimal JSON internally, but the extension outputs clean text only (value of `answer`).

### 5) Output Length (short / medium / long / extraLong)
- Soft targets for response size (ignored in single/short modes):
  - short: ~1 sentence (≈1 line)
  - medium: ~1 paragraph (≈3 lines)
  - long: ~1 paragraph (≈5 lines)
  - extraLong: ~3 short paragraphs

### 6) Default prompts (per action)
- Redefine the quiet directive for each action:
  - Selected text
  - Clipboard text
  - Input image
  - Capture area
- No dialog appears during use; defaults are applied automatically.

### 7) Hotkeys
- Reassign any shortcut.
- Format tips:
  - Case‑insensitive strings like `Ctrl+Shift+T`, `Alt+X`, `Ctrl+Alt+I`
  - Avoid conflicts with system/global shortcuts when possible.

### 8) Context‑menu note
- “Process selected text” appears in the main context menu only when text is highlighted. Other actions appear under the “Kimi K2 Stealth” submenu.

### 9) Debug logs
- Prints verbose logs to the background console for troubleshooting.

### 10) API Base/Path/Models
- Adjust if your Kimi account specifies different endpoints/models:
  - Base URL (default: `https://api.moonshot.ai`)
  - Endpoint path (default: `/v1/chat/completions`)
  - Text model (default: `kimi-k2-0905-preview`)
  - Vision model (default: `moonshot-v1-128k-vision-preview`)

---

## Behavior details

- Auto‑copy: Every response is copied to clipboard automatically (across all inputs).
- No per‑action prompts: Uses saved default directives.
- Language auto‑detect: For text inputs, the extension attempts basic EN/ES detection on your content and may switch language accordingly (can be disabled).
- Output cleanup:
  - Plain mode removes greetings, “Answer:”, markdown, extra whitespace.
  - Single/short modes reduce structured responses to a single clean line/word.
- Input image priority:
  - Clipboard image if present
  - Else right‑clicked `<img>` (via image context menu)
- Capture (A→B): Two clicks define a rectangle in the shared screen view; the captured region is scaled down (if needed) to reduce tokens.

---

## Permissions and privacy

- Clipboard: reads text/images on demand and writes outputs automatically.
- Screen capture: invokes the browser’s screen picker for region capture.
- Network: calls your configured Kimi endpoint via `fetch`.
- Storage: Chrome Sync storage for settings and API key.
- No analytics/telemetry collected by this extension.

---

## Known limitations

- The screen‑picker dialog is enforced by modern browsers and cannot be bypassed.
- “Process selected text” only shows when right‑clicking highlighted text; other items are in the submenu.
- Some sites replace the native context menu; use Shift+F10 or hotkeys as a fallback.

---

## Updating

- Load‑unpacked installs: go to `chrome://extensions` and click **Reload** on the extension.
- Store installs (if published): updates will arrive automatically.

---

## API configuration

Defaults assume:
- Base URL: https://api.moonshot.ai
- Endpoint: /v1/chat/completions
- Text model: kimi-k2-0905-preview
- Vision model: moonshot-v1-128k-vision-preview

Update in Options if your account differs.

---

## Troubleshooting

- “Selection item missing”: Highlight text and right‑click directly on it; the item is not inside the submenu.
- “Clipboard read blocked”: Click/tap once in the page, then try again.
- “Screen capture denied”: Re‑run and select “This tab” or “Entire screen.”
- “No image found”: Put an image on your clipboard first, or right‑click an `<img>`.

---

## License

MIT © Microck
