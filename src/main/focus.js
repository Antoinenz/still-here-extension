// Tab focus / visibility: always visible, always focused.

spoofGetter(Document.prototype, 'hidden', 'focus', () => false);
spoofGetter(Document.prototype, 'visibilityState', 'focus', () => 'visible');
spoofGetter(Document.prototype, 'webkitHidden', 'focus', () => false);
spoofGetter(Document.prototype, 'webkitVisibilityState', 'focus', () => 'visible');
spoofMethod(Document.prototype, 'hasFocus', 'focus', () => true);

swallowEvents(
  ['blur', 'focus', 'focusin', 'focusout', 'visibilitychange', 'webkitvisibilitychange', 'freeze', 'resume'],
  'focus',
);
