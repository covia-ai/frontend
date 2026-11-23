/**
 * True when a keydown's target takes typing: a form control (input, textarea,
 * select) or anything contenteditable. An app-wide shortcut that reuses an
 * editing chord (Ctrl/Cmd+X is cut, Ctrl/Cmd+B is bold) must leave these
 * alone, or it breaks that key in every field on every page.
 */
export function isEditingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return target instanceof HTMLInputElement
    || target instanceof HTMLTextAreaElement
    || target instanceof HTMLSelectElement;
}
