// Copy / paste / right-click / selection blockers. Off by default: it can break sites that
// legitimately use these handlers (custom context menus, rich editors).

const isPlainField = (t) => t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement;

// A site's own custom context menu is the price of this switch.
swallowEvents(['copy', 'cut', 'contextmenu', 'selectstart', 'dragstart'], 'clipboard', () => true);
swallowEvents(['paste'], 'clipboard', (e) => isPlainField(e.target));
