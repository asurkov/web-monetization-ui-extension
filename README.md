# Web Monetization Monitor Extension

A minimal Chrome extension that logs Web Monetization document lifecycle events to the console.

## What It Does

Listens for `chrome.monetization` events and logs them to the service-worker
console:
- 🟢 **STARTED** — when the first monetization session begins on a document
- 🔴 **STOPPED** — when the last monetization session ends on a document
- 🔵 **PAYMENT** — when a payment is sent for a monetization session

While a tab is monetized, an animated color-cycling "$" badge is shown on
the toolbar icon for that tab.

Clicking the toolbar icon opens a popup that displays:
- Connected wallet info (address, name, currency, budget)
- Current balance (initial / remaining / renewal date)
- A live log of payments received while the popup is open — the
  "Remaining" balance updates in real time on each `onPayment` event.

## Requirements

- Chromium build with Web Monetization feature (trunk channel)
- `--experimental-extension-apis` command-line flag

## Installation

1. **Build Chromium** with monetization enabled (if not already built)

2. **Launch Chromium with experimental APIs enabled:**
   ```bash
   out/Default/Chromium.app/Contents/MacOS/Chromium --experimental-extension-apis
   ```

3. **Load the extension:**
   - Navigate to `chrome://extensions`
   - Enable "Developer mode" (toggle in top-right)
   - Click "Load unpacked"
   - Select this folder (`wm-ui-extension/`)

4. **View logs:**
   - On the extensions page, find "Web Monetization Monitor"
   - Click "Inspect views: Service Worker"
   - The console will show events as they occur

> **Note:** Opening DevTools for the service worker requires a full `chrome`
> build. If Chromium crashes when clicking "Inspect views", ensure you have
> built with `autoninja -C out/Default chrome` (not a partial/incremental build).

## Usage

Once loaded, the extension automatically listens for monetization events. Visit
any page with a web monetization `<link>` tag and a connected wallet:

```
[WM] STARTED
{
  "tabId": 123,
  "frameId": 0,
  "url": "https://example.com"
}
```

When the page is closed or navigated away:

```
[WM] STOPPED
{
  "tabId": 123,
  "frameId": 0,
  "url": "https://example.com"
}
```

If monetization is active in an iframe, `frameId` will be non-zero and
a separate `STARTED`/`STOPPED` pair fires for that frame independently.

## Files

- **manifest.json** — Extension metadata, permissions, popup registration
- **background.js** — Service worker: monetization listeners, badge animation,
  payment broadcast to popup
- **popup.html** — Popup markup (wallet / balance / payments sections)
- **popup.css** — Popup styles
- **popup.js** — Popup logic: fetches wallet & balance on open, listens for
  payment messages from the service worker
- **README.md** — This file

## Notes

- Events are **per-document** (per `RenderFrameHost`), not per-session:
  - `onStarted` fires once when the *first* session activates in a document
  - `onStopped` fires once when the *last* session ends in that document
- The `monetization` permission is only available:
  - In component extensions (bundled with Chromium)
  - With `--experimental-extension-apis` flag for development
- The extension runs as a service worker (MV3 architecture)
