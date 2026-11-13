// Pointer leaving the window (exit-intent, "come back" nags).
swallowEvents(
  ['mouseout', 'mouseleave', 'pointerout', 'pointerleave'],
  'mouse',
  (e) => e.relatedTarget === null,
);
