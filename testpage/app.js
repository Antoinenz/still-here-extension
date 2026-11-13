'use strict';
// Still Here detector test page. Plain JS, no dependencies. window.__sh exposes results for automation.

const $ = (id) => document.getElementById(id);
const live = []; // [fn] updaters
const results = {}; // section -> verdict

function table(id, rows) {
  const t = $(id);
  for (const [label, get] of rows) {
    const tr = t.insertRow();
    tr.insertCell().textContent = label;
    const td = tr.insertCell();
    live.push(() => {
      let v;
      try { v = get(); } catch (e) { v = 'error: ' + e.name; }
      const s = typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v);
      if (td.textContent !== s) td.textContent = s;
    });
  }
}
function verdict(section, status, badgeId) {
  results[section] = status;
  const b = $(badgeId);
  b.className = 'badge ' + status;
  b.textContent = status;
}
const counts = {};
const bump = (k) => { counts[k] = (counts[k] || 0) + 1; };
const total = (re) => Object.entries(counts).filter(([k]) => re.test(k)).reduce((a, [, n]) => a + n, 0);

// ---------- 1. focus / visibility
const LEAKY = ['blur', 'focus', 'visibilitychange', 'freeze', 'resume'];
for (const type of [...LEAKY, 'pagehide', 'pageshow']) {
  window.addEventListener(type, () => bump('window.' + type));
  document.addEventListener(type, () => bump('document.' + type));
  window.addEventListener(type, () => bump('window.capture.' + type), true);
}
window.onblur = () => bump('window.onblur');
window.onfocus = () => bump('window.onfocus');
document.onvisibilitychange = () => bump('document.onvisibilitychange');

let sawHidden = false;
setInterval(() => {
  if (document.hidden || document.visibilityState !== 'visible' || !document.hasFocus()) sawHidden = true;
}, 250);

// ground truth: rAF stops in hidden tabs, so a long gap means the tab really was hidden or throttled
let lastRaf = performance.now(); let episodes = 0; let hiddenMs = 0; let frames = 0; let fpsT = lastRaf; let fps = 0;
(function raf(t) {
  const gap = t - lastRaf;
  if (gap > 700) { episodes++; hiddenMs += gap; }
  lastRaf = t; frames++;
  if (t - fpsT >= 1000) { fps = Math.round((frames * 1000) / (t - fpsT)); frames = 0; fpsT = t; }
  requestAnimationFrame(raf);
})(performance.now());

let lastTick = performance.now(); let maxDrift = 0;
setInterval(() => { const n = performance.now(); maxDrift = Math.max(maxDrift, n - lastTick - 250); lastTick = n; }, 250);

table('t-focus', [
  ['document.hidden', () => document.hidden],
  ['document.visibilityState', () => document.visibilityState],
  ['document.webkitHidden', () => document.webkitHidden],
  ['document.hasFocus()', () => document.hasFocus()],
  ['document.activeElement', () => document.activeElement && document.activeElement.tagName],
  ['ever saw hidden / unfocused', () => sawHidden],
]);
table('t-truth', [
  ['ground truth: hidden episodes (rAF stalls)', () => episodes],
  ['ground truth: total hidden time', () => (hiddenMs / 1000).toFixed(1) + ' s'],
  ['leaky events seen', () => total(new RegExp(`\\.(${LEAKY.join('|')}|onblur|onfocus|onvisibilitychange)$`))],
]);
$('newtab').onclick = () => window.open('about:blank', '_blank');

// ---------- 2. resize
const base = { iw: innerWidth, ih: innerHeight, cw: document.documentElement.clientWidth, ch: document.documentElement.clientHeight };
let resizeEvents = 0; let roCount = 0;
window.addEventListener('resize', () => { resizeEvents++; });
new ResizeObserver(() => { roCount++; }).observe(document.documentElement);
const vv = window.visualViewport;
const cl = () => [document.documentElement.clientWidth, document.documentElement.clientHeight];
table('t-resize', [
  ['innerWidth x innerHeight', () => `${innerWidth} x ${innerHeight}`],
  ['outerWidth x outerHeight', () => `${outerWidth} x ${outerHeight}`],
  ['outer minus inner (DevTools check: >160 wide or >200 tall)', () => `${outerWidth - innerWidth} x ${outerHeight - innerHeight}`],
  ['DevTools heuristic', () => (outerWidth - innerWidth > 160 || outerHeight - innerHeight > 200 ? 'TRIGGERED' : 'clean')],
  ['screen width x height', () => `${screen.width} x ${screen.height}`],
  ['screen availWidth x availHeight', () => `${screen.availWidth} x ${screen.availHeight}`],
  ['screenX, screenY', () => `${screenX}, ${screenY}`],
  ['devicePixelRatio', () => devicePixelRatio],
  ['visualViewport width x height', () => (vv ? `${vv.width} x ${vv.height}` : 'n/a')],
  ['real layout size (clientWidth x clientHeight)', () => cl().join(' x ')],
  ['real layout changed since load', () => cl()[0] !== base.cw || cl()[1] !== base.ch],
  ['reported size changed since load', () => innerWidth !== base.iw || innerHeight !== base.ih],
  ['resize events / ResizeObserver callbacks', () => `${resizeEvents} / ${roCount}`],
]);

// ---------- 3. fullscreen
const fsBox = $('fs-box');
const fsLog = (m) => { $('fs-result').textContent = m; };
$('fs-div').onclick = () => fsBox.requestFullscreen().then(() => fsLog('requestFullscreen() resolved'), (e) => fsLog('rejected: ' + e.name));
$('fs-page').onclick = () => document.documentElement.requestFullscreen().then(() => fsLog('page requestFullscreen() resolved'), (e) => fsLog('rejected: ' + e.name));
$('fs-exit').onclick = () => document.exitFullscreen().then(() => fsLog('exitFullscreen() resolved'), (e) => fsLog('exit rejected: ' + e.name));
for (const t of ['fullscreenchange', 'webkitfullscreenchange', 'fullscreenerror']) document.addEventListener(t, () => bump('doc.' + t));
const trulyFs = () => fsBox.matches(':fullscreen') || document.documentElement.matches(':fullscreen');
const reportedFs = () => !!document.fullscreenElement;
table('t-fs', [
  ['document.fullscreenElement', () => { const e = document.fullscreenElement; return e ? (e.id || e.tagName) : 'null'; }],
  ['document.webkitFullscreenElement', () => { const e = document.webkitFullscreenElement; return e ? (e.id || e.tagName) : 'null'; }],
  ['document.fullscreen', () => document.fullscreen],
  ['document.webkitIsFullScreen', () => document.webkitIsFullScreen],
  ['document.fullscreenEnabled', () => document.fullscreenEnabled],
  ['matchMedia(display-mode: fullscreen)', () => matchMedia('(display-mode: fullscreen)').matches],
  ['screen.height === innerHeight', () => screen.height === innerHeight],
  ['ground truth (CSS :fullscreen)', () => trulyFs()],
  ['fullscreenchange events', () => total(/^doc\.(webkit)?fullscreenchange$/)],
  ['page sees the real state?', () => (trulyFs() === reportedFs() ? 'yes' : trulyFs() ? 'no: hidden' : 'no: faked')],
]);

// ---------- 4. mouse leave
const mouseTruth = { overs: 0 };
document.addEventListener('mouseout', (e) => { if (e.relatedTarget === null) { bump('mouse.mouseout'); if (e.clientY <= 0) $('exit').style.display = 'flex'; } });
document.addEventListener('mouseleave', () => bump('mouse.mouseleave'));
window.addEventListener('mouseout', (e) => { if (e.relatedTarget === null) bump('mouse.windowOut'); });
document.addEventListener('pointerleave', () => bump('mouse.pointerleave'));
document.addEventListener('mouseover', (e) => { if (e.relatedTarget === null) mouseTruth.overs++; }); // entering from outside
$('exit').onclick = () => { $('exit').style.display = 'none'; };
table('t-mouse', [
  ['document mouseout (to outside window)', () => counts['mouse.mouseout'] || 0],
  ['document mouseleave', () => counts['mouse.mouseleave'] || 0],
  ['window mouseout (to outside)', () => counts['mouse.windowOut'] || 0],
  ['document pointerleave', () => counts['mouse.pointerleave'] || 0],
  ['ground truth: pointer re-entered (mouseover from outside)', () => mouseTruth.overs],
]);

// ---------- 5. clipboard blockers
const clipAttempts = { keys: 0, rightClick: 0, selection: 0 };
for (const t of ['copy', 'cut', 'contextmenu', 'selectstart', 'dragstart']) {
  $('protected').addEventListener(t, (e) => { bump('clip.' + t); e.preventDefault(); });
}
$('nopaste').addEventListener('paste', (e) => { bump('clip.paste'); e.preventDefault(); });
// attempts, seen through events that are not blocked
document.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && ['c', 'x', 'v', 'a'].includes(e.key.toLowerCase())) clipAttempts.keys++; });
document.addEventListener('mousedown', (e) => { if (e.button === 2) clipAttempts.rightClick++; });
document.addEventListener('selectionchange', () => { if (String(getSelection()).length > 0) clipAttempts.selection++; });
table('t-clip', [
  ['page blocker handlers that ran', () => total(/^clip\./)],
  ['  by type', () => Object.fromEntries(Object.entries(counts).filter(([k]) => k.startsWith('clip.')))],
  ['your attempts: Ctrl/Cmd C X V A', () => clipAttempts.keys],
  ['your attempts: right-clicks', () => clipAttempts.rightClick],
  ['your attempts: selection changes with text', () => clipAttempts.selection],
  ['current selection length', () => String(getSelection()).length],
  ['computed user-select on protected text', () => getComputedStyle($('protected')).userSelect],
  ['free box text length', () => $('freebox').value.length],
]);

// ---------- 6. beforeunload
let unloadRan = false;
try { unloadRan = sessionStorage.getItem('sh.unloadRan') === '1'; sessionStorage.removeItem('sh.unloadRan'); } catch {}
const wasArmed = (() => { try { const v = sessionStorage.getItem('sh.armed') === '1'; sessionStorage.removeItem('sh.armed'); return v; } catch { return false; } })();
const onBeforeUnload = (e) => {
  try { sessionStorage.setItem('sh.unloadRan', '1'); sessionStorage.setItem('sh.armed', '1'); } catch {}
  e.preventDefault(); e.returnValue = '';
};
$('arm').onchange = () => {
  if ($('arm').checked) window.addEventListener('beforeunload', onBeforeUnload);
  else window.removeEventListener('beforeunload', onBeforeUnload);
  try { if ($('arm').checked) sessionStorage.setItem('sh.armed', '1'); else sessionStorage.removeItem('sh.armed'); } catch {}
};
table('t-unload', [
  ['previous load: prompt armed', () => wasArmed],
  ['previous load: handler ran on leaving', () => (wasArmed ? unloadRan : 'n/a')],
]);

// ---------- 7. misc
let idleResult = '(click button)'; let screensResult = '(click button)';
$('idle-btn').onclick = async () => {
  try { idleResult = typeof IdleDetector === 'undefined' ? 'IdleDetector missing' : await IdleDetector.requestPermission(); } catch (e) { idleResult = 'threw ' + e.name; }
};
$('screens-btn').onclick = async () => {
  try { const d = await window.getScreenDetails(); screensResult = 'ok, ' + d.screens.length + ' screen(s)'; } catch (e) { screensResult = 'rejected: ' + e.name; }
};
table('t-misc', [
  ['typeof IdleDetector', () => typeof window.IdleDetector],
  ['IdleDetector.requestPermission()', () => idleResult],
  ['screen.isExtended', () => screen.isExtended],
  ['typeof getScreenDetails', () => typeof window.getScreenDetails],
  ['getScreenDetails()', () => screensResult],
]);

// ---------- 8. stealth probes
function runStealth() {
  const out = [];
  const add = (name, ok, info = '') => out.push({ name, ok, info });
  const NATIVE = (n) => `function ${n}() { [native code] }`;
  const D = Object.getOwnPropertyDescriptor(Document.prototype, 'hidden');
  const g = D.get;
  const ts = Function.prototype.toString;
  add('getter toString looks native', ts.call(g) === NATIVE('get hidden'), ts.call(g).slice(0, 60));
  add('getter name and length', g.name === 'get hidden' && g.length === 0, `${g.name} / ${g.length}`);
  add('getter is not constructible, has no prototype', (() => { try { new g(); return false; } catch { return !('prototype' in g); } })());
  add('illegal receiver throws TypeError', (() => { try { g.call({}); return false; } catch (e) { return e instanceof TypeError; } })());
  add('descriptor shape (enumerable, configurable, no setter)', D.enumerable === true && D.configurable === true && D.set === undefined);
  add('error stack shows no extension frames', (() => { try { g.call({}); return false; } catch (e) { return !/chrome-extension:/.test(e.stack || ''); } })());
  add('Function.prototype.toString looks native', ts.call(ts) === NATIVE('toString') && ts.toString() === NATIVE('toString'));
  add('hasFocus looks native', ts.call(document.hasFocus) === NATIVE('hasFocus') && document.hasFocus.length === 0);
  add('requestFullscreen looks native', ts.call(Element.prototype.requestFullscreen) === NATIVE('requestFullscreen') && Element.prototype.requestFullscreen.name === 'requestFullscreen');
  const iw = Object.getOwnPropertyDescriptor(window, 'innerWidth');
  add('window.innerWidth getter looks native', !!iw && ts.call(iw.get) === NATIVE('get innerWidth'), iw ? ts.call(iw.get).slice(0, 60) : 'no accessor');
  add('no suspicious own properties on document', !Object.getOwnPropertyNames(document).some((n) => /spoof|still|sh-/i.test(n)), Object.getOwnPropertyNames(document).join(','));
  add('no suspicious own properties on window', !Object.getOwnPropertyNames(window).some((n) => /spoof|stillhere|^sh-/i.test(n)));
  // synthetic events written by the page itself must still be delivered
  let sv = 0; const fn = () => sv++;
  document.addEventListener('visibilitychange', fn); window.addEventListener('blur', fn);
  document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('blur'));
  document.removeEventListener('visibilitychange', fn); window.removeEventListener('blur', fn);
  add('page-dispatched synthetic events still delivered', sv === 2, `${sv}/2`);
  // fresh same-origin iframe: spoof must be consistent there too
  const f = document.createElement('iframe'); f.style.display = 'none'; document.body.appendChild(f);
  try {
    const w = f.contentWindow;
    add('iframe reports same hidden/visibility/focus', w.document.hidden === document.hidden && w.document.visibilityState === document.visibilityState && w.document.hasFocus() === document.hasFocus(), `${w.document.hidden}/${w.document.visibilityState}/${w.document.hasFocus()}`);
    const cross = w.Function.prototype.toString.call(g);
    add('cross-realm toString (iframe realm) looks native [known limit]', cross === NATIVE('get hidden'), cross.slice(0, 50));
  } catch (e) { add('iframe probes', null, 'error ' + e.name); }
  f.remove();
  return out;
}
let stealthResults = [];
function showStealth() {
  stealthResults = runStealth();
  const t = $('t-stealth'); t.textContent = '';
  for (const r of stealthResults) {
    const tr = t.insertRow();
    tr.insertCell().textContent = r.name;
    const td = tr.insertCell();
    td.className = r.ok === true ? 'PASS' : r.ok === false ? 'FAIL' : 'INFO';
    td.textContent = (r.ok === true ? 'PASS' : r.ok === false ? 'FAIL' : 'INFO') + (r.info ? '  ' + r.info : '');
  }
  const fails = stealthResults.filter((r) => r.ok === false && !/known limit/.test(r.name)).length;
  verdict('stealth', fails ? 'DETECTED' : 'HIDDEN', 'v-stealth');
}
$('run-stealth').onclick = showStealth;

// ---------- 9. timing
table('t-timing', [
  ['rAF frames per second', () => fps],
  ['worst setInterval(250ms) drift', () => Math.round(maxDrift) + ' ms'],
  ['navigator.userAgent', () => navigator.userAgent],
]);

// ---------- verdicts and summary
function judge() {
  // focus
  const leaks = total(new RegExp(`\\.(${LEAKY.join('|')}|onblur|onfocus|onvisibilitychange)$`));
  verdict('focus', leaks > 0 || sawHidden ? 'DETECTED' : episodes > 0 ? 'HIDDEN' : 'WAITING', 'v-focus');
  // resize
  const realChanged = cl()[0] !== base.cw || cl()[1] !== base.ch;
  const reportedChanged = innerWidth !== base.iw || innerHeight !== base.ih;
  const devtools = outerWidth - innerWidth > 160 || outerHeight - innerHeight > 200;
  verdict('resize', devtools || (realChanged && reportedChanged) || resizeEvents > 0 ? 'DETECTED' : realChanged ? 'HIDDEN' : 'WAITING', 'v-resize');
  // fullscreen
  const gotFs = (counts['doc.fullscreenchange'] || 0) + (counts['doc.webkitfullscreenchange'] || 0) > 0;
  const t = trulyFs(), r = reportedFs();
  verdict('fullscreen', t && !r ? 'HIDDEN' : !t && r ? 'FAKED' : t && r ? 'DETECTED' : gotFs ? 'DETECTED' : 'WAITING', 'v-fs');
  // mouse
  const seen = total(/^mouse\./) > 0;
  verdict('mouse', seen ? 'DETECTED' : mouseTruth.overs > 0 ? 'HIDDEN' : 'WAITING', 'v-mouse');
  // clipboard
  const ran = total(/^clip\./) > 0;
  const tried = clipAttempts.keys + clipAttempts.rightClick + clipAttempts.selection > 0;
  verdict('clipboard', ran ? 'DETECTED' : tried ? 'HIDDEN' : 'WAITING', 'v-clip');
  // unload
  verdict('unload', !wasArmed ? 'WAITING' : unloadRan ? 'DETECTED' : 'HIDDEN', 'v-unload');
  // misc
  const idleSeen = typeof window.IdleDetector !== 'undefined' && idleResult === 'granted';
  const screensSeen = screen.isExtended === true || /^ok/.test(screensResult);
  verdict('misc', idleSeen || screensSeen ? 'DETECTED' : idleResult.startsWith('(') && screensResult.startsWith('(') ? 'WAITING' : 'HIDDEN', 'v-misc');

  const sum = $('sum'); sum.textContent = '';
  for (const [k, v] of Object.entries(results)) {
    const tr = sum.insertRow(); tr.insertCell().textContent = k;
    const td = tr.insertCell(); td.className = v; td.textContent = v;
  }
  const evs = Object.entries(counts).filter(([k]) => /^(window|document)\./.test(k));
  $('ev-focus').textContent = evs.length ? evs.map(([k, n]) => `${k} x${n}`).join('\n') : 'none';
}

function tick() { for (const u of live) u(); judge(); }
setInterval(tick, 250); tick();

$('reset').onclick = () => {
  for (const k of Object.keys(counts)) delete counts[k];
  episodes = 0; hiddenMs = 0; sawHidden = false; maxDrift = 0; resizeEvents = 0; roCount = 0; mouseTruth.overs = 0;
  clipAttempts.keys = clipAttempts.rightClick = clipAttempts.selection = 0;
  base.iw = innerWidth; base.ih = innerHeight; base.cw = cl()[0]; base.ch = cl()[1];
  tick();
};
function report() {
  return { when: new Date().toISOString(), url: location.href, ua: navigator.userAgent, verdicts: { ...results }, counts: { ...counts }, stealth: stealthResults };
}
$('copy').onclick = async () => {
  try { await navigator.clipboard.writeText(JSON.stringify(report(), null, 2)); $('copied').textContent = 'copied'; }
  catch { $('copied').textContent = 'clipboard blocked; see console'; console.log(report()); }
};
window.__sh = { results, counts, report, runStealth: showStealth, judge };
showStealth();
