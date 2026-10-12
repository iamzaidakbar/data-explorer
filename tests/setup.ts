import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});

// jsdom has no <dialog> support. Minimal stand-in so components can mount; real modal behaviour (focus trap,
// inert background, Esc) is browser-provided and covered by Playwright instead.
if (typeof HTMLDialogElement !== 'undefined' && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
}

// jsdom has no layout. The virtualizer measures its scroll container (offsetHeight/offsetWidth), clamps scrolling
// to scrollHeight - clientHeight, and scrolls with scrollTo(). Give every element a 1024×600 box whose content
// height is its first child's inline height (the virtual list's spacer), and make scrollTo update scrollTop.
Object.defineProperties(HTMLElement.prototype, {
  offsetHeight: { configurable: true, get: () => 600 },
  offsetWidth: { configurable: true, get: () => 1024 },
  clientHeight: { configurable: true, get: () => 600 },
  scrollHeight: {
    configurable: true,
    get(this: HTMLElement) {
      const content = Number.parseFloat((this.firstElementChild as HTMLElement | null)?.style.height ?? '');
      return Number.isFinite(content) ? Math.max(content, 600) : 600;
    },
  },
});
Element.prototype.scrollTo = function scrollTo(this: Element, arg?: ScrollToOptions | number, y?: number) {
  const top = typeof arg === 'object' ? arg.top : y;
  if (top === undefined) return;
  Object.defineProperty(this, 'scrollTop', { configurable: true, writable: true, value: top });
  this.dispatchEvent(new Event('scroll'));
};
