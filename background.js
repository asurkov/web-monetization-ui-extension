// Web Monetization Monitor — service worker background script.
//
// Responsibilities:
//   1. Listen for chrome.monetization session lifecycle events and log them
//      to the service-worker console (visible in chrome://extensions →
//      "Inspect views: Service Worker").
//   2. Show a color-cycling "$" badge on the toolbar icon while monetization
//      is active on a tab.
//   3. Broadcast onPayment events (with refreshed balance) to the popup so it
//      can update its UI in real time.

if (!chrome.monetization) {
  console.error(
    "[WM] chrome.monetization is not available. " +
      "Launch Chromium with --experimental-extension-apis, " +
      "or use a local trunk build."
  );
  // Nothing else to do — the rest of this script registers monetization
  // listeners that wouldn't work anyway.
} else {
  registerMonetizationListeners();
  console.log(
    "[WM] Web Monetization Monitor extension loaded — listening for session events."
  );
}

// =============================================================================
// Toolbar badge — animated "$" indicator while a tab is monetized.
// =============================================================================

const BADGE_COLORS = [
  "#2ecc71", // green
  "#1abc9c", // teal
  "#3498db", // blue
  "#9b59b6", // purple
  "#e67e22", // orange
];
const CYCLE_INTERVAL_MS = 500;

// tabId → { intervalId, colorIndex }
const activeTabs = new Map();

function startBadge(tabId) {
  // Clear any existing animation for this tab.
  stopBadge(tabId);

  let colorIndex = 0;
  chrome.action.setBadgeText({ tabId, text: "$" });
  chrome.action.setBadgeBackgroundColor({ tabId, color: BADGE_COLORS[0] });

  const intervalId = setInterval(() => {
    colorIndex = (colorIndex + 1) % BADGE_COLORS.length;
    chrome.action.setBadgeBackgroundColor({
      tabId,
      color: BADGE_COLORS[colorIndex],
    });
  }, CYCLE_INTERVAL_MS);

  activeTabs.set(tabId, { intervalId, colorIndex });
}

function stopBadge(tabId) {
  const entry = activeTabs.get(tabId);
  if (entry) {
    clearInterval(entry.intervalId);
    activeTabs.delete(tabId);
  }
  chrome.action.setBadgeText({ tabId, text: "" });
}

// =============================================================================
// Logging helper.
// =============================================================================

function logEvent(label, color, info) {
  console.log(
    `%c[WM] ${label}%c\n${JSON.stringify(info, null, 2)}`,
    `color: ${color}; font-weight: bold`,
    ""
  );
}

// =============================================================================
// Popup messaging — broadcast payment events to popup.js (if open).
// =============================================================================

async function broadcastPayment(session) {
  const wallet = await chrome.monetization.getWallet();
  // sendMessage rejects when no receiver (popup closed); ignore.
  chrome.runtime
    .sendMessage({ type: "payment", session, wallet })
    .catch(() => {});
}

// =============================================================================
// Monetization event registration.
// =============================================================================

function registerMonetizationListeners() {
  chrome.monetization.onStarted.addListener((info) => {
    logEvent("STARTED", "green", info);
    startBadge(info.tabId);
  });

  chrome.monetization.onStopped.addListener((info) => {
    logEvent("STOPPED", "red", info);
    stopBadge(info.tabId);
  });

  chrome.monetization.onPayment.addListener((session) => {
    logEvent("PAYMENT", "#3498db", session);
    broadcastPayment(session);
  });
}

