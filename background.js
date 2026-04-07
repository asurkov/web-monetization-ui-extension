// Web Monetization Monitor — service worker background script.
//
// Listens for chrome.monetization session lifecycle events and logs
// them to the service-worker console (visible in chrome://extensions →
// "Inspect views: Service Worker").
//
// Also shows a color-cycling "$" badge on the toolbar icon while
// monetization is active on a tab.

// Color palette for the cycling badge background.
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

function formatInfo(info) {
  return JSON.stringify(
    {
      tabId: info.tabId,
      frameId: info.frameId,
      url: info.url,
    },
    null,
    2
  );
}

if (!chrome.monetization) {
  console.error(
    "[WM] chrome.monetization is not available. " +
    "Launch Chromium with --experimental-extension-apis, " +
    "or use a local trunk build."
  );
} else {
  chrome.monetization.onStarted.addListener((info) => {
    console.log(
      `%c[WM] STARTED%c\n${formatInfo(info)}`,
      "color: green; font-weight: bold",
      ""
    );
    startBadge(info.tabId);
  });

  chrome.monetization.onStopped.addListener((info) => {
    console.log(
      `%c[WM] STOPPED%c\n${formatInfo(info)}`,
      "color: red; font-weight: bold",
      ""
    );
    stopBadge(info.tabId);
  });

  console.log("[WM] Web Monetization Monitor extension loaded — listening for session events.");
}
