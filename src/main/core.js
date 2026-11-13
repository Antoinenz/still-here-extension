// Shared helpers. Everything is patched on prototypes (never own properties) and masked so
// Function.prototype.toString still reports native code. Patched functions are method shorthands
// so they are non-constructible and have no .prototype, like native ones.

const TOKEN = '__SH_TOKEN__';
const EVT_CFG = `sh-${TOKEN}-cfg`;
const EVT_HITS = `sh-${TOKEN}-hits`;
const EVT_HELLO = `sh-${TOKEN}-hello`;

const config = { enabled: true };
for (const f of SH_FLAGS) config[f.key] = f.def;
const configHooks = [];

const hits = Object.create(null);
let hitsDirty = false;

const nativeToString = Function.prototype.toString;
const nativeAdd = EventTarget.prototype.addEventListener;
const nativeDispatch = EventTarget.prototype.dispatchEvent;
const NativeCustomEvent = CustomEvent;
const nativeSetInterval = setInterval;
const nativeParse = JSON.parse;
const nativeStringify = JSON.stringify;
const masked = new WeakMap(); // patched fn -> native source text

const patchedToString = {
  toString() {
    const src = masked.get(this);
    return src !== undefined ? src : nativeToString.call(this);
  },
}.toString;
masked.set(patchedToString, nativeToString.call(nativeToString));
Object.defineProperty(Function.prototype, 'toString', {
  value: patchedToString, writable: true, configurable: true, enumerable: false,
});

// Our own frames must not show up in error stacks (they would reveal the extension URL).
const SELF = (() => {
  try { const m = /(chrome-extension:\/\/[^/\s)]+\/[^:\s)]+)/.exec(new Error().stack); return m && m[1]; } catch { return null; }
})();
function clean(e) {
  try {
    if (SELF && e && typeof e.stack === 'string') e.stack = e.stack.split('\n').filter((l) => !l.includes(SELF)).join('\n');
  } catch {}
  return e;
}

function on(flag) {
  const v = config[flag];
  return config.enabled && v && v !== 'off';
}
function hit(flag) {
  hits[flag] = (hits[flag] || 0) + 1;
  hitsDirty = true;
}

function mask(fn, original, name) {
  masked.set(fn, nativeToString.call(original));
  Object.defineProperty(fn, 'name', { value: name, configurable: true });
  return fn;
}

// Replace an accessor's getter, keeping descriptor shape. The real getter always runs first so
// illegal receivers still throw natively. fake(real) returns the spoofed value or undefined.
function spoofGetter(obj, prop, flag, fake) {
  const desc = obj && Object.getOwnPropertyDescriptor(obj, prop);
  if (!desc || !desc.get) return;
  const orig = desc.get;
  const get = {
    get() {
      let real;
      try { real = Reflect.apply(orig, this, []); } catch (e) { throw clean(e); }
      if (on(flag)) {
        const v = fake.call(this, real);
        if (v !== undefined) {
          if (v !== real) hit(flag);
          return v;
        }
      }
      return real;
    },
  }.get;
  mask(get, orig, `get ${prop}`);
  Object.defineProperty(obj, prop, { ...desc, get });
}

// Replace a method. impl(orig, self, args) decides everything.
function patchMethod(obj, prop, impl) {
  const desc = obj && Object.getOwnPropertyDescriptor(obj, prop);
  if (!desc || typeof desc.value !== 'function') return;
  const orig = desc.value;
  const fn = {
    [prop](...args) {
      try { return impl(orig, this, args); } catch (e) { throw clean(e); }
    },
  }[prop];
  Object.defineProperty(fn, 'length', { value: orig.length, configurable: true });
  mask(fn, orig, prop);
  Object.defineProperty(obj, prop, { ...desc, value: fn });
}

// Swallow real (trusted) events before any page listener sees them. We register first (MAIN world,
// document_start) so we always run first. Synthetic events the page dispatches itself pass through.
function swallowEvents(types, flag, filter) {
  const handler = (e) => {
    if (!e.isTrusted || !on(flag)) return;
    if (filter ? filter(e) : e.target === window || e.target === document) {
      hit(flag);
      e.stopImmediatePropagation();
    }
  };
  for (const t of types) nativeAdd.call(window, t, handler, true);
}

// ---- config in, hit counts out (event names carry a per-build random token)
nativeAdd.call(document, EVT_CFG, (e) => {
  if (typeof e.detail !== 'string') return;
  try {
    Object.assign(config, nativeParse(e.detail));
    for (const h of configHooks) h();
  } catch {}
}, true);

nativeSetInterval(() => {
  if (!hitsDirty) return;
  hitsDirty = false;
  const detail = nativeStringify(hits);
  for (const k in hits) delete hits[k];
  nativeDispatch.call(document, new NativeCustomEvent(EVT_HITS, { detail }));
}, 700);

function sayHello() {
  nativeDispatch.call(document, new NativeCustomEvent(EVT_HELLO));
}
