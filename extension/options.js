(async () => {
  const $ = (id) => document.getElementById(id);
  let store = await shLoad();

  function render() {
    $('master').checked = store.enabled;
    shRenderFlags($('flags'), shEffective({ ...store, sites: {} }, ''), new Set(Object.keys(store.defaults)), async (k, v) => {
      store.defaults[k] = v;
      await shSave({ defaults: store.defaults });
      render();
    });
    const t = $('sites');
    t.textContent = '';
    const hosts = Object.keys(store.sites).sort();
    $('none').hidden = hosts.length > 0;
    for (const h of hosts) {
      const s = store.sites[h];
      const tr = t.insertRow();
      tr.insertCell().textContent = h;
      tr.insertCell().textContent = s.enabled === false ? 'disabled' : 'enabled';
      tr.insertCell().textContent = Object.entries(s.flags || {}).map(([k, v]) => `${k}=${v}`).join(' ') || 'defaults';
      const b = document.createElement('button');
      b.textContent = 'Remove';
      b.onclick = async () => { delete store.sites[h]; await shSave({ sites: store.sites }); render(); };
      tr.insertCell().appendChild(b);
    }
  }
  $('master').onchange = () => shSave({ enabled: (store.enabled = $('master').checked) });
  $('export').onclick = () => { $('json').value = JSON.stringify(store, null, 2); $('msg').textContent = ''; };
  $('import').onclick = async () => {
    try {
      const o = JSON.parse($('json').value);
      store = { enabled: o.enabled !== false, defaults: o.defaults || {}, sites: o.sites || {} };
      await shSave(store);
      render();
      $('msg').textContent = 'Imported.';
    } catch (e) { $('msg').textContent = 'Invalid JSON: ' + e.message; }
  };
  render();
})();
