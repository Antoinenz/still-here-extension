// Fullscreen: hide it, or fake it without really going fullscreen.

let fakeEl = null;
const mode = () => (on('fullscreen') ? config.fullscreen : 'off');
configHooks.push(() => { if (mode() !== 'fake') fakeEl = null; });

const fsElement = function () {
  const m = mode();
  if (m === 'hide') return null;
  if (m === 'fake') return fakeEl;
  return undefined;
};
const fsBool = function () {
  const m = mode();
  if (m === 'hide') return false;
  if (m === 'fake') return !!fakeEl;
  return undefined;
};

for (const p of ['fullscreenElement', 'webkitFullscreenElement', 'webkitCurrentFullScreenElement']) {
  spoofGetter(Document.prototype, p, 'fullscreen', fsElement);
}
for (const p of ['fullscreen', 'webkitIsFullScreen']) {
  spoofGetter(Document.prototype, p, 'fullscreen', fsBool);
}
spoofGetter(Document.prototype, 'fullscreenEnabled', 'fullscreen', () => (mode() === 'fake' ? true : undefined));
spoofGetter(Document.prototype, 'webkitFullscreenEnabled', 'fullscreen', () => (mode() === 'fake' ? true : undefined));

function fireChange(el) {
  for (const type of ['fullscreenchange', 'webkitfullscreenchange']) {
    nativeDispatch.call(el, new Event(type, { bubbles: true, composed: true }));
  }
}

function fakeRequest(orig, self, args) {
  if (mode() !== 'fake') return Reflect.apply(orig, self, args);
  if (!(self instanceof Element)) throw new TypeError("Failed to execute 'requestFullscreen' on 'Element': Illegal invocation");
  fakeEl = self;
  hit('fullscreen');
  const p = Promise.resolve();
  p.then(() => fireChange(self));
  return p;
}
function fakeExit(orig, self, args) {
  if (mode() !== 'fake') return Reflect.apply(orig, self, args);
  if (!fakeEl) return Promise.reject(clean(new TypeError('Document not active')));
  const el = fakeEl;
  fakeEl = null;
  const p = Promise.resolve();
  p.then(() => fireChange(el));
  return p;
}
for (const p of ['requestFullscreen', 'webkitRequestFullscreen', 'webkitRequestFullScreen']) {
  patchMethod(Element.prototype, p, fakeRequest);
}
for (const p of ['exitFullscreen', 'webkitExitFullscreen', 'webkitCancelFullScreen']) {
  patchMethod(Document.prototype, p, fakeExit);
}

// matchMedia('(display-mode: fullscreen)')
spoofGetter(window.MediaQueryList && MediaQueryList.prototype, 'matches', 'fullscreen', function (real) {
  if (!/display-mode\s*:\s*fullscreen/i.test(this.media)) return undefined;
  const m = mode();
  if (m === 'hide') return false;
  if (m === 'fake') return !!fakeEl;
  return undefined;
});

// Real fullscreenchange events are hidden in "hide" mode; our synthetic ones (untrusted) pass.
swallowEvents(['fullscreenchange', 'webkitfullscreenchange', 'fullscreenerror'], 'fullscreen', () => mode() === 'hide');
