// Window size, screen size and the docked-DevTools heuristic (outer minus inner).

const realGet = (o, p) => {
  const d = o && Object.getOwnPropertyDescriptor(o, p);
  return d && d.get;
};
const realInnerW = realGet(window, 'innerWidth');
const realInnerH = realGet(window, 'innerHeight');
const FAKE_CHROME_HEIGHT = 85; // a plausible toolbar + tab strip height

let snap = {};
configHooks.push(() => { snap = {}; });
const frozen = (key, real) => (key in snap ? snap[key] : (snap[key] = real));

function sizeSpoof(key, normalised) {
  return function (real) {
    const m = config.resize;
    if (m === 'freeze') return frozen(key, real);
    if (m === 'normalise' && normalised) return normalised.call(this, real);
    return undefined;
  };
}

const win = [
  ['innerWidth'], ['innerHeight'], ['devicePixelRatio'], ['screenX'], ['screenY'], ['screenLeft'], ['screenTop'],
];
for (const [p] of win) spoofGetter(window, p, 'resize', sizeSpoof('w.' + p));
spoofGetter(window, 'outerWidth', 'resize', sizeSpoof('w.outerWidth', function () {
  return Reflect.apply(realInnerW, this, []);
}));
spoofGetter(window, 'outerHeight', 'resize', sizeSpoof('w.outerHeight', function () {
  return Reflect.apply(realInnerH, this, []) + FAKE_CHROME_HEIGHT;
}));

for (const p of ['width', 'height', 'availWidth', 'availHeight', 'availLeft', 'availTop']) {
  spoofGetter(window.Screen && Screen.prototype, p, 'resize', sizeSpoof('s.' + p));
}
if (window.VisualViewport) {
  for (const p of ['width', 'height', 'scale', 'offsetLeft', 'offsetTop', 'pageLeft', 'pageTop']) {
    spoofGetter(VisualViewport.prototype, p, 'resize', sizeSpoof('v.' + p));
  }
}

swallowEvents(['resize'], 'resize', (e) => e.target === window && config.resize === 'freeze');
