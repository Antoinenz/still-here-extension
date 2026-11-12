// Shared helpers. Everything is patched on prototypes (never own properties) and
// masked so Function.prototype.toString still reports native code.

const config = {
  focus: true,
};

const nativeToString = Function.prototype.toString;
const masked = new WeakMap(); // patched fn -> native source text
const nativeAdd = EventTarget.prototype.addEventListener;

const patchedToString = function toString() {
  const src = masked.get(this);
  return src !== undefined ? src : nativeToString.call(this);
};
masked.set(patchedToString, nativeToString.call(nativeToString));
Object.defineProperty(Function.prototype, 'toString', {
  value: patchedToString,
  writable: true,
  configurable: true,
  enumerable: false,
});

function mask(fn, original, name) {
  masked.set(fn, nativeToString.call(original));
  if (name !== undefined) Object.defineProperty(fn, 'name', { value: name, configurable: true });
  return fn;
}

// Replace an accessor's getter, keeping descriptor shape. `fake()` returns the spoofed value
// (or undefined to fall through to the real one).
function spoofGetter(proto, prop, flag, fake) {
  const desc = Object.getOwnPropertyDescriptor(proto, prop);
  if (!desc || !desc.get) return;
  const orig = desc.get;
  const get = function () {
    if (config[flag]) {
      const v = fake.call(this);
      if (v !== undefined) return v;
    }
    return Reflect.apply(orig, this, []);
  };
  mask(get, orig, `get ${prop}`);
  Object.defineProperty(proto, prop, { ...desc, get });
}

function spoofMethod(proto, prop, flag, fake) {
  const desc = Object.getOwnPropertyDescriptor(proto, prop);
  if (!desc || typeof desc.value !== 'function') return;
  const orig = desc.value;
  const fn = function (...args) {
    if (config[flag]) {
      const v = fake.apply(this, args);
      if (v !== undefined) return v;
    }
    return Reflect.apply(orig, this, args);
  };
  mask(fn, orig, prop);
  Object.defineProperty(proto, prop, { ...desc, value: fn });
}

// Swallow real (trusted) events aimed at window/document before any page listener sees them.
// We register first (document_start, MAIN world), so we always run first. Synthetic events the
// page dispatches itself pass through untouched.
function swallowEvents(types, flag) {
  const handler = (e) => {
    if (!config[flag] || !e.isTrusted) return;
    if (e.target === window || e.target === document) e.stopImmediatePropagation();
  };
  for (const t of types) {
    nativeAdd.call(window, t, handler, true);
    nativeAdd.call(document, t, handler, true);
  }
}
