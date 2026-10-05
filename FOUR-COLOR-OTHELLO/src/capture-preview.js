import { t } from './i18n.js';
// Only the hovered/focused move is evaluated. CSS crossfades shared stone
// textures; there are no polling timers, extra stones, or board mutations.
export function createCapturePreview(surface, badge = null) {
  let enabled = false, cells = [], resolve = () => [], current = null, marked = [], target = null;
  function clear() {
    if (badge) badge.hidden = true;
    for (const cell of marked) cell.classList.remove('capture-preview');
    marked = [];
    if (target) {
      target.classList.remove('capture-target');
      target.removeAttribute('data-capture-count');
      if (target.classList.contains('legal-hint')) target.setAttribute('aria-description', t('ここに置けます'));
      else target.removeAttribute('aria-description');
      target = null;
    }
  }
  function hide() { clear(); current = null; }
  function show(index) {
    if (!enabled || index === current) return;
    clear(); current = index;
    if (index === null) return;
    const flips = resolve(index);
    if (!flips.length || !cells[index]) return;
    marked = flips.map(i => cells[i]);
    for (const cell of marked) cell.classList.add('capture-preview');
    target = cells[index]; target.classList.add('capture-target');
    target.setAttribute('data-capture-count', String(flips.length));
    if (badge) {
      // Read geometry only on a new candidate, never on every pointer frame.
      const rect = target.getBoundingClientRect();
      badge.textContent = t`${flips.length}枚`;
      badge.style.left = `${rect.right - rect.width * .03}px`;
      badge.style.top = `${rect.top + rect.height * .03}px`;
      badge.hidden = false;
    }
    target.setAttribute('aria-description', t`ここに置くと相手の石を${flips.length}枚取れます`);
  }
  function indexOf(event) {
    const cell = event.target.closest?.('.cell');
    return cell && surface.contains(cell) ? Number(cell.dataset.index) : null;
  }
  function pointer(event) { if (event.pointerType === 'touch') { hide(); return; } show(indexOf(event)); }
  function focus(event) { if (event.target.matches?.(':focus-visible')) show(indexOf(event)); }
  const handlers = { pointermove:pointer, pointerleave:hide, pointercancel:hide, focusin:focus, focusout:hide };
  for (const [type, handler] of Object.entries(handlers)) surface.addEventListener(type, handler, { passive:true });
  return {
    sync(options) {
      hide(); enabled = options.enabled; cells = options.cells; resolve = options.resolve;
      surface.style.setProperty('--capture-image', `var(--stone-${options.color})`);
    },
    hide,
    destroy() { hide(); for (const [type, handler] of Object.entries(handlers)) surface.removeEventListener(type, handler); }
  };
}
