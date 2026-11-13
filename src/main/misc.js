// Idle detection and multi-screen detection.

const denied = () => clean(new DOMException('Permission denied.', 'NotAllowedError'));

if (window.IdleDetector) {
  patchMethod(IdleDetector, 'requestPermission', (orig, self, args) => {
    if (!on('misc')) return Reflect.apply(orig, self, args);
    hit('misc');
    return Promise.resolve('denied');
  });
  patchMethod(IdleDetector.prototype, 'start', (orig, self, args) => {
    if (!on('misc')) return Reflect.apply(orig, self, args);
    hit('misc');
    return Promise.reject(denied());
  });
}
spoofGetter(window.Screen && Screen.prototype, 'isExtended', 'misc', () => false);
patchMethod(window, 'getScreenDetails', (orig, self, args) => {
  if (!on('misc')) return Reflect.apply(orig, self, args);
  hit('misc');
  return Promise.reject(denied());
});
