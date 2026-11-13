importScripts('defaults.js');

// Per-tab counts of detections defeated, kept in session storage (the worker sleeps).
let queue = Promise.resolve();
const key = (tabId) => `hits:${tabId}`;

function updateBadge(tabId, total) {
  const text = total > 999 ? '999+' : total ? String(total) : '';
  chrome.action.setBadgeText({ tabId, text }).catch(() => {});
  chrome.action.setBadgeBackgroundColor({ tabId, color: '#2563eb' }).catch(() => {});
}

function addHits(tabId, incoming) {
  queue = queue.then(async () => {
    const cur = (await chrome.storage.session.get(key(tabId)))[key(tabId)] || {};
    let total = 0;
    for (const [k, n] of Object.entries(incoming)) cur[k] = (cur[k] || 0) + (Number(n) || 0);
    for (const n of Object.values(cur)) total += n;
    await chrome.storage.session.set({ [key(tabId)]: cur });
    updateBadge(tabId, total);
  }).catch(() => {});
}

chrome.runtime.onMessage.addListener((msg, sender, respond) => {
  if (msg && msg.type === 'hits' && sender.tab && msg.hits && typeof msg.hits === 'object') {
    addHits(sender.tab.id, msg.hits);
  } else if (msg && msg.type === 'getHits') {
    queue.then(async () => respond((await chrome.storage.session.get(key(msg.tabId)))[key(msg.tabId)] || {}));
    return true;
  }
});

chrome.tabs.onUpdated.addListener((tabId, info) => {
  if (info.status === 'loading') {
    queue = queue.then(() => chrome.storage.session.remove(key(tabId))).catch(() => {});
    updateBadge(tabId, 0);
  }
});
chrome.tabs.onRemoved.addListener((tabId) => {
  queue = queue.then(() => chrome.storage.session.remove(key(tabId))).catch(() => {});
});
