// Renders the per-detector controls. values: effective config; overridden: Set of keys.
function shRenderFlags(el, values, overridden, onChange) {
  el.textContent = '';
  for (const f of SH_FLAGS) {
    const row = document.createElement('label');
    row.className = 'row';
    row.title = f.help;
    const name = document.createElement('span');
    name.textContent = f.label;
    if (overridden && overridden.has(f.key)) name.className = 'over';
    row.appendChild(name);
    let input;
    if (f.type === 'bool') {
      input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = !!values[f.key];
      input.onchange = () => onChange(f.key, input.checked);
    } else {
      input = document.createElement('select');
      for (const o of f.options) {
        const opt = document.createElement('option');
        opt.value = opt.textContent = o;
        input.appendChild(opt);
      }
      input.value = values[f.key];
      input.onchange = () => onChange(f.key, input.value);
    }
    row.appendChild(input);
    el.appendChild(row);
  }
}
