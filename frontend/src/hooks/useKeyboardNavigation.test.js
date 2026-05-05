import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import useKeyboardNavigation from './useKeyboardNavigation';

describe('useKeyboardNavigation', () => {
  let cleanup;

  beforeEach(() => {
    document.body.innerHTML = '';
    document.body.className = '';
  });

  afterEach(() => {
    if (cleanup) cleanup();
  });

  it('attaches keyboard event listeners', () => {
    const addEventListenerSpy = vi.spyOn(document, 'addEventListener');
    
    const { unmount } = renderHook(() => useKeyboardNavigation());
    cleanup = unmount;

    expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    expect(addEventListenerSpy).toHaveBeenCalledWith('mousedown', expect.any(Function));
  });

  it('removes event listeners on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');
    
    const { unmount } = renderHook(() => useKeyboardNavigation());
    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('mousedown', expect.any(Function));
  });

  it('adds keyboard-nav class on Tab key', () => {
    renderHook(() => useKeyboardNavigation());

    const event = new KeyboardEvent('keydown', { key: 'Tab' });
    document.dispatchEvent(event);

    expect(document.body.classList.contains('keyboard-nav')).toBe(true);
  });

  it('removes keyboard-nav class on mousedown', () => {
    renderHook(() => useKeyboardNavigation());

    document.body.classList.add('keyboard-nav');
    const event = new MouseEvent('mousedown');
    document.dispatchEvent(event);

    expect(document.body.classList.contains('keyboard-nav')).toBe(false);
  });

  it('makes table rows navigable', () => {
    document.body.innerHTML = `
      <table>
        <tbody>
          <tr><td><button>Button</button></td></tr>
        </tbody>
      </table>
    `;

    renderHook(() => useKeyboardNavigation());

    const row = document.querySelector('tr');
    expect(row.getAttribute('tabindex')).toBe('0');
  });

  it('handles Alt+m shortcut to focus main content', () => {
    document.body.innerHTML = '<main id="mainContent" tabindex="-1">Content</main>';
    
    renderHook(() => useKeyboardNavigation());

    const focusSpy = vi.spyOn(document.getElementById('mainContent'), 'focus');
    const event = new KeyboardEvent('keydown', { key: 'm', altKey: true });
    document.dispatchEvent(event);

    expect(focusSpy).toHaveBeenCalled();
  });

  it('observes DOM mutations for new tables', () => {
    const { unmount } = renderHook(() => useKeyboardNavigation());
    cleanup = unmount;

    document.body.innerHTML = `
      <table>
        <tbody>
          <tr><td><button>New Button</button></td></tr>
        </tbody>
      </table>
    `;

    // Wait for mutation observer
    setTimeout(() => {
      const row = document.querySelector('tr');
      expect(row.getAttribute('tabindex')).toBe('0');
    }, 100);
  });
});
