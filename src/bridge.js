// Isolated-world bridge: storage -> MAIN-world config, MAIN-world hit counts -> background.
(() => {
  const TOKEN = '__SH_TOKEN__';
  const EVT_CFG = `sh-${TOKEN}-cfg`;
  const EVT_HITS = `sh-${TOKEN}-hits`;
  const EVT_HELLO = `sh-${TOKEN}-hello`;

  // Settings follow the top-level site, so embedded frames behave like their page.
  let host = location.hostname;
  try {
    const o = location.ancestorOrigins;
    if (o && o.length) host = new URL(o[o.length - 1]).hostname;
  } catch {}

  let store = null;
  let styleEl = null;

  function applyStyle(cfg) {
    const want = cfg.enabled && cfg.clipboard;
    if (!want) { if (styleEl) { styleEl.remove(); styleEl = null; } return; }
    if (styleEl) return;
    const root = document.head || document.documentElement;
    if (!root) { document.addEventListener('DOMContentLoaded', () => applyStyle(cfg), { once: true }); return; }
    styleEl = document.createElement('style');
    styleEl.textContent = '*{-webkit-user-select:text!important;user-select:text!important;-webkit-touch-callout:default!important}';
    root.appendChild(styleEl);
  }

  function send() {
    if (!store) return;
    const cfg = shEffective(store, host);
    document.dispatchEvent(new CustomEvent(EVT_CFG, { detail: JSON.stringify(cfg) }));
    applyStyle(cfg);
  }

  document.addEventListener(EVT_HELLO, send);
  document.addEventListener(EVT_HITS, (e) => {
    try {
      chrome.runtime.sendMessage({ type: 'hits', hits: JSON.parse(e.detail) }).catch(() => {});
    } catch {}
  });

  async function load() {
    try {
      store = await shLoad();
      send();
    } catch {}
  }
  load();
  try {
    chrome.storage.onChanged.addListener((_c, area) => { if (area === 'local') load(); });
  } catch {}
})();
