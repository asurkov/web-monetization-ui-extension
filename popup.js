// popup.js — Popup script for Web Monetization Monitor.
//
// On open: fetches wallet info and current balance via the chrome.monetization
// API and renders them. Listens for "payment" messages from the service worker
// to update the balance and append a payment entry in real time.
//
// All user-visible strings are inserted via textContent (never innerHTML) to
// avoid XSS from wallet-supplied data such as wallet name or address.

// =============================================================================
// DOM references.
// =============================================================================

const dom = {
  walletContent: document.getElementById("wallet-content"),
  balanceContent: document.getElementById("balance-content"),
  paymentsList: document.getElementById("payments-list"),
  noPayments: document.getElementById("no-payments"),
};

// =============================================================================
// DOM rendering helpers.
// =============================================================================

/**
 * Build a label/value row. Returns the row element; the value <span> is
 * accessible at row.querySelector(".value") so callers can update it later.
 *
 * @param {string} label
 * @param {string} value
 * @param {string} [valueClass] Optional extra class for the value span.
 */
function row(label, value, valueClass = "") {
  const wrap = document.createElement("div");
  wrap.className = "row";

  const labelEl = document.createElement("span");
  labelEl.className = "label";
  labelEl.textContent = label;

  const valueEl = document.createElement("span");
  valueEl.className = valueClass ? `value ${valueClass}` : "value";
  valueEl.textContent = value;

  wrap.append(labelEl, valueEl);
  return wrap;
}

function muted(container, text) {
  container.replaceChildren();
  const span = document.createElement("span");
  span.className = "muted";
  span.textContent = text;
  container.appendChild(span);
}

// =============================================================================
// Section renderers.
// =============================================================================

function renderWallet(wallet) {
  if (!wallet) {
    muted(dom.walletContent, "No wallet connected.");
    return;
  }

  dom.walletContent.replaceChildren(
    row("Address", wallet.address),
    row("Name", wallet.name || "—"),
    row("Currency", wallet.currency),
  );

  if (wallet.needsReconnect) {
    const warn = document.createElement("div");
    warn.className = "warning";
    warn.textContent = "⚠ Wallet needs reconnection.";
    dom.walletContent.appendChild(warn);
  }
}

function renderBalance(balance) {
  if (!balance) {
    muted(dom.balanceContent, "No balance data available.");
    return;
  }

  const children = [
    row("Initial", balance.initial),
    row("Remaining", balance.remaining, "highlight"),
  ];

  if (balance.renewDate) {
    const date = new Date(balance.renewDate).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    children.push(row("Renews", date));
  }

  dom.balanceContent.replaceChildren(...children);
}

/**
 * Update just the "Remaining" value in place. Falls back to a full re-render
 * if the balance section was never populated.
 */
function updateRemaining(balance) {
  if (!balance) return;
  const el = dom.balanceContent.querySelector(".value.highlight");
  if (el) {
    el.textContent = balance.remaining;
  } else {
    renderBalance(balance);
  }
}

function appendPayment(session) {
  if (dom.noPayments) {
    dom.noPayments.remove();
    dom.noPayments = null;
  }

  const li = document.createElement("li");

  const time = document.createElement("span");
  time.className = "payment-time";
  time.textContent = new Date().toLocaleTimeString();

  const meta = document.createTextNode(
    `tab ${session.tabId} · session ${session.sessionId}`,
  );

  const wallet = document.createElement("span");
  wallet.className = "payment-wallet";
  wallet.textContent = session.walletAddress;

  li.append(time, " ", meta, wallet);
  dom.paymentsList.prepend(li);
}

// =============================================================================
// Initialisation.
// =============================================================================

async function init() {
  if (!chrome.monetization) {
    muted(dom.walletContent, "chrome.monetization not available.");
    muted(dom.balanceContent, "chrome.monetization not available.");
    return;
  }

  const wallet = await chrome.monetization.getWallet().catch(() => null);

  renderWallet(wallet);
  renderBalance(wallet);
}

// =============================================================================
// Listen for payment broadcasts from the service worker.
// =============================================================================

chrome.runtime.onMessage.addListener((message) => {
  if (message.type !== "payment") return;
  appendPayment(message.session);
  updateRemaining(message.wallet);
});

init();

