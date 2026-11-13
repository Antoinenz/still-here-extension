// Shared by the MAIN-world script (build prepends it), the bridge, background, popup and options.
// Plain classic script: no imports.

const SH_FLAGS = [
  { key: 'focus', label: 'Tab focus and visibility', type: 'bool', def: true,
    help: 'Always report the tab as visible and focused; hide blur/focus/visibilitychange events.' },
  { key: 'mouse', label: 'Mouse leaving the page', type: 'bool', def: true,
    help: 'Hide mouseout/mouseleave when the pointer leaves the window (exit-intent popups, "stay on page" nags).' },
  { key: 'resize', label: 'Window size and DevTools check', type: 'select', def: 'off',
    options: ['off', 'normalise', 'freeze'],
    help: 'normalise: outer size looks like a normal window (defeats docked-DevTools check). freeze: size values and resize events never change.' },
  { key: 'fullscreen', label: 'Fullscreen', type: 'select', def: 'off',
    options: ['off', 'hide', 'fake'],
    help: 'hide: always report not fullscreen. fake: pretend requestFullscreen worked without actually going fullscreen.' },
  { key: 'clipboard', label: 'Copy / paste / right-click / select blocks', type: 'bool', def: false,
    help: 'Stop page handlers for copy, cut, contextmenu, selectstart, dragstart and paste into plain inputs; force text selection. Can break custom context menus.' },
  { key: 'unload', label: '"Leave site?" prompts', type: 'bool', def: false,
    help: 'Suppress beforeunload prompts. Also hides "unsaved changes" warnings.' },
  { key: 'misc', label: 'Idle and multi-screen detection', type: 'bool', def: true,
    help: 'IdleDetector reports denied; screen.isExtended is false; getScreenDetails is denied.' },
];

function shHost(h) {
  return String(h || '').toLowerCase().replace(/^www\./, '');
}

function shEffective(store, host) {
  const site = (store.sites && store.sites[shHost(host)]) || {};
  const cfg = { enabled: store.enabled !== false && site.enabled !== false };
  for (const f of SH_FLAGS) {
    if (site.flags && f.key in site.flags) cfg[f.key] = site.flags[f.key];
    else if (store.defaults && f.key in store.defaults) cfg[f.key] = store.defaults[f.key];
    else cfg[f.key] = f.def;
  }
  return cfg;
}

async function shLoad() {
  const s = await chrome.storage.local.get(['enabled', 'defaults', 'sites']);
  return { enabled: s.enabled !== false, defaults: s.defaults || {}, sites: s.sites || {} };
}

function shSave(partial) {
  return chrome.storage.local.set(partial);
}
