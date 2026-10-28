type Child = Node | string | null | undefined | false;

export interface Props {
  class?: string;
  text?: string;
  title?: string;
  disabled?: boolean;
  onclick?: (ev: MouseEvent) => void;
  [attr: `data-${string}`]: string;
}

/** Minimal element builder. */
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, props: Props = {}, ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined) continue;
    if (k === 'class') el.className = v as string;
    else if (k === 'text') el.textContent = v as string;
    else if (k === 'title') el.title = v as string;
    else if (k === 'disabled') (el as unknown as HTMLButtonElement).disabled = v as boolean;
    else if (k === 'onclick') el.addEventListener('click', v as (ev: Event) => void);
    else el.setAttribute(k, String(v));
  }
  for (const c of children) if (c) el.append(c);
  return el;
}

/** Set text only when it changed, to avoid layout churn every frame. */
export function setText(el: HTMLElement, text: string): void {
  if (el.textContent !== text) el.textContent = text;
}

export function toggleClass(el: Element, cls: string, on: boolean): void {
  if (el.classList.contains(cls) !== on) el.classList.toggle(cls, on);
}

export { formatMoney as money } from '../i18n';
