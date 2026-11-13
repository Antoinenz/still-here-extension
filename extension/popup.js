(async () => {
  const $ = (id) => document.getElementById(id);
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  let host = '';
  try {
    const u = new URL(tab.url);
    if (u.protocol === 'http:' || u.protocol === 'https:') host = shHost(u.hostname);
  } catch {}

  let store = await shLoad();
  $('options').onclick = (e) => { e.preventDefault(); chrome.runtime.openOptionsPage(); };
  $('master').checked = store.enabled;
  $('master').onchange = async () => { store.enabled = $('master').checked; await shSave({ enabled: store.enabled }); };

  if (!host) { $('site-block').hidden = true; $('no-site').hidden = false; return; }
  $('host').textContent = host;

  function site() { return (store.sites[host] = store.sites[host] || {}); }
  async function commit() { await shSave({ sites: store.sites }); render(); }

  function render() {
    const s = store.sites[host] || {};
    $('site').checked = s.enabled !== false;
    shRenderFlags($('flags'), shEffective(store, host), new Set(Object.keys(s.flags || {})), (k, v) => {
      site().flags = site().flags || {};
      site().flags[k] = v;
      commit();
    });
  }
  $('site').onchange = () => {
    if ($('site').checked) { delete site().enabled; } else { site().enabled = false; }
    commit();
  };
  $('reset').onclick = () => { delete store.sites[host]; commit(); };
  $('reload').onclick = () => { chrome.tabs.reload(tab.id); window.close(); };
  render();

  async function showHits() {
    const h = await chrome.runtime.sendMessage({ type: 'getHits', tabId: tab.id });
    const names = Object.fromEntries(SH_FLAGS.map((f) => [f.key, f.label]));
    const entries = Object.entries(h || {});
    $('hits').textContent = entries.length ? entries.map(([k, n]) => `${names[k] || k} x${n}`).join(', ') : 'none yet';
  }
  showHits();
  setInterval(showHits, 1000);
})();
