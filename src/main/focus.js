// Tab focus / visibility: always visible, always focused.

spoofGetter(Document.prototype, 'hidden', 'focus', () => false);
spoofGetter(Document.prototype, 'visibilityState', 'focus', () => 'visible');
spoofGetter(Document.prototype, 'webkitHidden', 'focus', () => false);
spoofGetter(Document.prototype, 'webkitVisibilityState', 'focus', () => 'visible');
patchMethod(Document.prototype, 'hasFocus', (orig, self, args) => {
  const real = Reflect.apply(orig, self, args);
  if (on('focus')) {
    if (!real) hit('focus');
    return true;
  }
  return real;
});

swallowEvents(
  ['blur', 'focus', 'focusin', 'focusout', 'visibilitychange', 'webkitvisibilitychange', 'freeze', 'resume'],
  'focus',
);
