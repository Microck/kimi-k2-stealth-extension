# Kimi K2 Stealth (Browser Extension)

Native browser extension for Moonshot Kimi K2.  
Adds right‑click menu items and hotkeys to send selected text, clipboard text or image, hovered images, or two‑click (A→B) screen captures to the Kimi K2 API.  
Outputs are cleaned, formatted, and automatically copied to the clipboard.

---

## Features

- Native context‑menu items under **Kimi K2 Stealth**
  - Process selected text
  - Process clipboard text
  - Input image from clipboard or hovered `<img>`
  - Capture area (A→B) for screenshots
  - Paste / Copy / Show last output
- Automatic copy of responses to clipboard
- Optional tooltip overlay for last output
- Hotkeys for all actions
- Configurable language and style profiles:
  - English (US) or Spanish (Spain)
  - Modes: technical, student, singleAnswer, shortAnswer
  - Length targets: short, medium, long, extraLong
- Plain text or minimal JSON output
- All settings stored locally; no telemetry

---

## Installation

1. Download the extension folder or release ZIP.
2. Open `chrome://extensions` and enable **Developer mode**.
3. Click **Load unpacked** and select the folder containing `manifest.json`.
4. Open the extension **Options** page and paste your Moonshot Kimi API key.

---

## Usage

1. **Right‑click selected text**
   - Highlight text  
   - Right‑click selection → `Kimi: Process selected text`
2. **Right‑click page or image**
   - `Kimi K2 Stealth → Process clipboard text`
   - `Kimi K2 Stealth → Input image from clipboard`
   - `Kimi K2 Stealth → Capture area (A→B)`
   - `Kimi K2 Stealth → Paste / Copy / Show last output`
3. **Hotkeys (default)**
   - `Ctrl+Shift+T` – selected text  
   - `Ctrl+Shift+L` – clipboard text  
   - `Ctrl+Shift+I` – clipboard or hovered image  
   - `Ctrl+Shift+C` – screen capture A→B  
   - `Ctrl+Shift+P` – paste last output  
   - `Ctrl+Shift+Y` – copy last output  
   - `Ctrl+Shift+U` – show last output tooltip  

Each result is automatically copied to the clipboard.  
When a text field is focused, “Paste output” inserts directly.

**Capture:**  
When prompted, choose *This tab* or *Entire screen*.  
Click point A then point B to define the rectangle.

---

## Options

Accessible via the extension’s **Options** page or from `chrome://extensions`.

### API
- API key (required)
- Base URL / Endpoint path / Model names
- Temperature

### Profile
- Language (en‑US / es‑ES)
- Mode (technical / student / singleAnswer / shortAnswer)
- Output format (plain / json)
- Length target (short / medium / long / extraLong)
- Auto‑detect language
- Trim input and maximum characters
- Auto‑clear timer for cached output
- Enable/disable toast notifications
- Debug logging

### Images
- Maximum dimension (pixels)
- JPEG quality (0–1)

### Prompts
Default directive text for:
- Selected text
- Clipboard text
- Input image
- Capture area

### Hotkeys
Fully re‑assignable.  
Use notation such as `Ctrl+Alt+X`. Avoid OS‑reserved keys.

All settings are stored in Chrome Sync.

---

## Behavior

- Reads and writes the clipboard on explicit user actions.
- Uses the browser’s `getDisplayMedia` permission for screen capture.
- Text inputs auto‑detect English or Spanish unless disabled.
- Output cleanup removes markdown, greetings, and filler text.
- Single / short modes extract concise answers from minimal JSON.
- Cached outputs auto‑clear after the configured delay.

---

## Permissions

| Permission | Purpose |
|-------------|----------|
| `contextMenus` | Adds right‑click menu items |
| `storage` | Saves configuration and API key |
| `scripting` | Injects content and overlay scripts |
| `activeTab` | Communicates with the active page |
| `clipboardRead`, `clipboardWrite` | Reads input and writes output |
| `notifications` | Displays optional toast messages |
| `host_permissions` | Allows image fetching and API calls |

---

## API Defaults

- Base URL: `https://api.moonshot.ai`
- Endpoint: `/v1/chat/completions`
- Text model: `kimi-k2-0905-preview`
- Vision model: `moonshot-v1-128k-vision-preview`

---

## Troubleshooting

- **Missing selection menu:** Only appears when text is highlighted.  
- **Clipboard blocked:** Click on the page before triggering.  
- **Capture denied:** Enable screen capture; select “This tab” or “Entire screen.”  
- **No API response:** Verify API key and network access.  
- **No image:** Ensure an image is on the clipboard or right‑click over an `<img>`.

---

## Privacy

- No analytics, logging, or external requests other than API calls you trigger.
- All configuration and keys are stored locally.
- Clipboard and capture access occur only on explicit actions.

---

## License

MIT © Microck
