/**
 * Menu Bar Interactions for Emacs Blog Theme
 * Handles dropdown menus, theme toggle, font size, color schemes, width toggle
 */

(function() {
  'use strict';

  // State
  let openMenu = null;
  let fontSize = 100;
  let schemePopupOpen = false;

  // DOM
  const menuBar = document.querySelector('.menu-bar');
  const menuItems = document.querySelectorAll('.menu-item');
  const hamburger = document.querySelector('.menu-hamburger');
  const backdrop = document.getElementById('menu-backdrop');
  const schemePopupBtn = document.getElementById('scheme-popup-btn');
  const schemePopup = document.getElementById('scheme-popup');

  // ── Theme ────────────────────────────────────────────────────────────────

  function toggleTheme() {
    const html = document.documentElement;
    const current = html.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('emacs-theme', next);
    updateThemeIcons(next);
    window.emacsBlog?.keyboard?.showMessage?.('Theme: ' + (next === 'dark' ? 'Dark' : 'Light'));
  }

  function updateThemeIcons(theme) {
    document.querySelectorAll('.theme-icon-dark').forEach(el => {
      el.style.display = theme === 'dark' ? 'inline' : 'none';
    });
    document.querySelectorAll('.theme-icon-light').forEach(el => {
      el.style.display = theme === 'light' ? 'inline' : 'none';
    });
  }

  // ── Color Scheme ─────────────────────────────────────────────────────────

  function applyScheme(schemeName) {
    const html = document.documentElement;
    if (!schemeName || schemeName === 'modus') {
      html.removeAttribute('data-scheme');
      localStorage.removeItem('emacs-scheme');
    } else {
      html.setAttribute('data-scheme', schemeName);
      localStorage.setItem('emacs-scheme', schemeName);
    }
    updateSchemeMarkers(schemeName || '');
    const label = document.querySelector('.scheme-option[data-scheme="' + (schemeName || '') + '"]')?.textContent?.trim()
      || schemeName || 'Modus';
    window.emacsBlog?.keyboard?.showMessage?.('Scheme: ' + label);
  }

  function updateSchemeMarkers(current) {
    document.querySelectorAll('.scheme-option').forEach(opt => {
      const match = (opt.dataset.scheme || '') === current;
      opt.classList.toggle('active', match);
    });
  }

  function initSchemes() {
    const saved = localStorage.getItem('emacs-scheme') || '';
    updateSchemeMarkers(saved);
  }

  // ── Scheme Popup (right-side button) ─────────────────────────────────────

  function openSchemePopup() {
    schemePopup?.classList.add('open');
    schemePopupBtn?.setAttribute('aria-expanded', 'true');
    schemePopupOpen = true;
    // No backdrop — outside click closes it; backdrop is reserved for mobile drawer
  }

  function closeSchemePopup() {
    schemePopup?.classList.remove('open');
    schemePopupBtn?.setAttribute('aria-expanded', 'false');
    schemePopupOpen = false;
  }

  function toggleSchemePopup() {
    schemePopupOpen ? closeSchemePopup() : openSchemePopup();
  }

  // ── Backdrop ─────────────────────────────────────────────────────────────

  function showBackdrop() {
    backdrop?.classList.add('visible');
  }

  function hideBackdrop() {
    backdrop?.classList.remove('visible');
  }

  // ── Font Size ────────────────────────────────────────────────────────────

  function adjustFontSize(delta) {
    fontSize = Math.max(80, Math.min(150, fontSize + delta * 10));
    document.documentElement.style.fontSize = fontSize + '%';
    localStorage.setItem('emacs-font-size', fontSize);
    window.emacsBlog?.keyboard?.showMessage?.('Font size: ' + fontSize + '%');
  }

  function resetFontSize() {
    fontSize = 100;
    document.documentElement.style.fontSize = '100%';
    localStorage.removeItem('emacs-font-size');
    window.emacsBlog?.keyboard?.showMessage?.('Font size reset');
  }

  function restoreFontSize() {
    const saved = localStorage.getItem('emacs-font-size');
    if (saved) {
      const n = parseInt(saved, 10);
      if (!isNaN(n) && n >= 80 && n <= 150) {
        fontSize = n;
        document.documentElement.style.fontSize = n + '%';
      }
    }
  }

  // ── Content Width Toggle ─────────────────────────────────────────────────
  // Cycle: 100% → 80ch → 60ch → 840px (widthIdx=3 = 840px is the default/starting point)

  const WIDTH_STEPS = ['100%', '80ch', '60ch', '840px'];
  let widthIdx = 3;

  function cycleWidth() {
    widthIdx = (widthIdx + 1) % WIDTH_STEPS.length;
    const w = WIDTH_STEPS[widthIdx];
    document.documentElement.style.setProperty('--content-max-width', w);
    localStorage.setItem('emacs-width-idx', widthIdx);
    window.emacsBlog?.keyboard?.showMessage?.('Width: ' + w);
  }

  function restoreWidth() {
    const saved = localStorage.getItem('emacs-width-idx');
    if (saved !== null) {
      const idx = parseInt(saved, 10);
      if (idx >= 0 && idx < WIDTH_STEPS.length) {
        widthIdx = idx;
        document.documentElement.style.setProperty('--content-max-width', WIDTH_STEPS[idx]);
      }
    }
  }

  // ── Menu Dropdowns ───────────────────────────────────────────────────────

  function openMenuDropdown(item) {
    closeAllMenus();
    item.classList.add('open');
    item.querySelector('button')?.setAttribute('aria-expanded', 'true');
    openMenu = item;
  }

  function closeAllMenus() {
    menuItems.forEach(item => {
      item.classList.remove('open');
      item.querySelector('button')?.setAttribute('aria-expanded', 'false');
    });
    openMenu = null;
  }

  function toggleMobileMenu() {
    const isOpen = menuBar?.classList.toggle('menu-open');
    hamburger?.setAttribute('aria-expanded', String(!!isOpen));
    isOpen ? showBackdrop() : hideBackdrop();
  }

  function closeMobileMenu() {
    menuBar?.classList.remove('menu-open');
    hamburger?.setAttribute('aria-expanded', 'false');
    if (!schemePopupOpen) hideBackdrop();
  }

  function handleMenuClick(e) {
    const item = e.target.closest('.menu-item');
    if (!item) return;
    const btn = e.target.closest('button');
    if (btn && btn.parentElement === item) {
      item.classList.contains('open') ? closeAllMenus() : openMenuDropdown(item);
      e.preventDefault();
    }
  }

  function handleDropdownClick(e) {
    const el = e.target.closest('.menu-dropdown-item');
    if (!el) return;

    const action = el.dataset.action;
    switch (action) {
      case 'toggle-theme':   toggleTheme(); break;
      case 'increase-font':  adjustFontSize(1); break;
      case 'decrease-font':  adjustFontSize(-1); break;
      case 'reset-font':     resetFontSize(); break;
      case 'cycle-width':    cycleWidth(); break;
      case 'show-help':
        document.getElementById('help-overlay')?.classList.add('visible');
        break;
      default:
        if (el.classList.contains('scheme-option')) {
          applyScheme(el.dataset.scheme || '');
        }
    }
    closeAllMenus();
    closeSchemePopup();
  }

  function handleOutsideClick(e) {
    if (openMenu && !e.target.closest('.menu-item')) closeAllMenus();
    if (schemePopupOpen && !e.target.closest('#scheme-popup-container')) closeSchemePopup();
  }

  function handleBackdropClick() {
    closeMobileMenu();
    closeSchemePopup();
    closeAllMenus();
    hideBackdrop();
  }

  function handleMenuKeydown(e) {
    if (e.key === 'Escape') {
      closeAllMenus();
      closeSchemePopup();
      closeMobileMenu();
      return;
    }
    if (!openMenu) return;
    const dropdown = openMenu.querySelector('.menu-dropdown');
    const items = dropdown?.querySelectorAll('.menu-dropdown-item:not(.disabled)');
    if (!items?.length) return;
    const focused = dropdown.querySelector('.menu-dropdown-item:focus');
    let idx = focused ? Array.from(items).indexOf(focused) : -1;
    switch (e.key) {
      case 'ArrowDown':
        items[(idx + 1) % items.length].focus(); e.preventDefault(); break;
      case 'ArrowUp':
        items[idx <= 0 ? items.length - 1 : idx - 1].focus(); e.preventDefault(); break;
      case 'Enter':
        if (focused) { focused.click(); e.preventDefault(); } break;
    }
  }

  // ── Init ─────────────────────────────────────────────────────────────────

  function init() {
    menuItems.forEach(item => item.addEventListener('click', handleMenuClick));
    document.querySelectorAll('.menu-dropdown-item').forEach(item => {
      item.addEventListener('click', handleDropdownClick);
    });

    // Standalone theme toggle (in menu-bar-right)
    document.querySelectorAll('[data-action="toggle-theme"]:not(.menu-dropdown-item)').forEach(btn => {
      btn.addEventListener('click', e => { toggleTheme(); closeAllMenus(); e.preventDefault(); });
    });

    // Width toggle button (modeline + elsewhere)
    document.querySelectorAll('[data-action="cycle-width"]').forEach(btn => {
      btn.addEventListener('click', e => { cycleWidth(); e.preventDefault(); });
    });

    // Scheme popup button
    schemePopupBtn?.addEventListener('click', e => { toggleSchemePopup(); e.stopPropagation(); });

    // Backdrop click closes everything
    backdrop?.addEventListener('click', handleBackdropClick);

    hamburger?.addEventListener('click', toggleMobileMenu);
    document.addEventListener('click', handleOutsideClick);
    document.addEventListener('keydown', handleMenuKeydown);

    menuItems.forEach(item => {
      item.addEventListener('mouseenter', () => {
        if (openMenu && openMenu !== item) openMenuDropdown(item);
      });
    });

    restoreFontSize();
    restoreWidth();

    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    updateThemeIcons(currentTheme);
    initSchemes();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Globals for keyboard shortcuts
  window.toggleTheme = toggleTheme;
  window.adjustFontSize = adjustFontSize;
  window.resetFontSize = resetFontSize;

  window.emacsBlog = window.emacsBlog || {};
  window.emacsBlog.menu = { toggleTheme, adjustFontSize, resetFontSize, closeAllMenus, applyScheme, cycleWidth };
})();
