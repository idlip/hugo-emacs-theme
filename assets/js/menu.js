/**
 * Menu Bar Interactions for Emacs Blog Theme
 */

(function() {
  'use strict';

  // ── State ─────────────────────────────────────────────────────────────────
  let openMenu = null;
  let fontSize = 100;
  let schemePopupOpen = false;
  let previewScheme = null; // scheme being hovered (for live preview)

  // ── DOM ───────────────────────────────────────────────────────────────────
  const menuBar       = document.querySelector('.menu-bar');
  const menuItems     = document.querySelectorAll('.menu-item');
  const hamburger     = document.querySelector('.menu-hamburger');
  const backdrop      = document.getElementById('menu-backdrop');
  const schemePopupBtn = document.getElementById('scheme-popup-btn');
  const schemePopup   = document.getElementById('scheme-popup');

  // ── Theme ─────────────────────────────────────────────────────────────────

  function toggleTheme() {
    const html = document.documentElement;
    const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('emacs-theme', next);
    showMsg('Theme: ' + (next === 'dark' ? 'Dark' : 'Light'));
  }

  // ── Color Scheme ──────────────────────────────────────────────────────────

  function applyScheme(name) {
    const html = document.documentElement;
    if (name) html.setAttribute('data-scheme', name);
    else      html.removeAttribute('data-scheme');
    localStorage.setItem('emacs-scheme', name || '');
    updateSchemeMarkers(name || '');
  }

  function updateSchemeMarkers(current) {
    document.querySelectorAll('.scheme-option').forEach(opt => {
      opt.classList.toggle('active', (opt.dataset.scheme || '') === current);
    });
  }

  // Random scheme — picks a new random on every page load unless pinned
  function initRandomScheme() {
    const fixed = localStorage.getItem('emacs-scheme-fixed');
    if (fixed !== null) {
      applyScheme(fixed);
      updatePinLabel(true);
      return;
    }

    const opts = Array.from(document.querySelectorAll('.scheme-option'))
                      .map(el => el.dataset.scheme || '');
    if (!opts.length) return;
    const pick = opts[Math.floor(Math.random() * opts.length)];
    applyScheme(pick);
    updatePinLabel(false);
  }

  function fixScheme() {
    const isPinned = localStorage.getItem('emacs-scheme-fixed') !== null;
    if (isPinned) {
      // Unpin — go back to random each session
      localStorage.removeItem('emacs-scheme-fixed');
      localStorage.removeItem('emacs-scheme');
      updatePinLabel(false);
      showMsg('Scheme unpinned (random each session)');
    } else {
      // Pin current scheme
      const cur = document.documentElement.getAttribute('data-scheme') || '';
      localStorage.setItem('emacs-scheme-fixed', cur);
      localStorage.setItem('emacs-scheme', cur);
      updatePinLabel(true);
      showMsg('Scheme pinned: ' + (cur || 'Modus'));
    }
  }

  function updatePinLabel(pinned) {
    const label = document.getElementById('pin-scheme-label');
    if (label) label.textContent = pinned ? 'Unpin' : 'Pin';
  }

  // Live hover preview — temporarily apply hovered scheme (~15 LOC)
  function initSchemeHoverPreview() {
    document.querySelectorAll('.scheme-option').forEach(opt => {
      opt.addEventListener('mouseenter', () => {
        previewScheme = document.documentElement.getAttribute('data-scheme');
        const hov = opt.dataset.scheme || '';
        hov ? document.documentElement.setAttribute('data-scheme', hov)
            : document.documentElement.removeAttribute('data-scheme');
      });
      opt.addEventListener('mouseleave', () => {
        if (previewScheme !== null) {
          previewScheme
            ? document.documentElement.setAttribute('data-scheme', previewScheme)
            : document.documentElement.removeAttribute('data-scheme');
          previewScheme = null;
        }
      });
    });
  }

  // ── Scheme Popup ──────────────────────────────────────────────────────────

  function openSchemePopup() {
    schemePopup?.classList.add('open');
    schemePopupBtn?.setAttribute('aria-expanded', 'true');
    schemePopupOpen = true;
  }

  function closeSchemePopup() {
    schemePopup?.classList.remove('open');
    schemePopupBtn?.setAttribute('aria-expanded', 'false');
    // Restore scheme if we're mid-hover-preview
    if (previewScheme !== null) {
      previewScheme
        ? document.documentElement.setAttribute('data-scheme', previewScheme)
        : document.documentElement.removeAttribute('data-scheme');
      previewScheme = null;
    }
    schemePopupOpen = false;
  }

  function toggleSchemePopup() {
    schemePopupOpen ? closeSchemePopup() : openSchemePopup();
  }

  // ── Font Mode Cycling ─────────────────────────────────────────────────────
  // Mono → Sans → Mixed (body sans + code mono)

  const FONT_STEPS = ['mono', 'sans', 'mixed'];
  const FONT_LABELS = { mono: 'Mono', sans: 'Sans', mixed: 'Mixed' };
  let fontIdx = 0;

  function cycleFontMode() {
    fontIdx = (fontIdx + 1) % FONT_STEPS.length;
    const f = FONT_STEPS[fontIdx];
    document.documentElement.setAttribute('data-font', f);
    localStorage.setItem('emacs-font-mode', f);
    showMsg('Font: ' + FONT_LABELS[f]);
  }

  function restoreFontMode() {
    const saved = localStorage.getItem('emacs-font-mode');
    if (saved && FONT_STEPS.includes(saved)) {
      fontIdx = FONT_STEPS.indexOf(saved);
      document.documentElement.setAttribute('data-font', saved);
    }
  }

  // ── Font Size ─────────────────────────────────────────────────────────────

  function adjustFontSize(delta) {
    fontSize = Math.max(80, Math.min(150, fontSize + delta * 10));
    document.documentElement.style.fontSize = fontSize + '%';
    localStorage.setItem('emacs-font-size', fontSize);
    showMsg('Font size: ' + fontSize + '%');
  }

  function resetFontSize() {
    fontSize = 100;
    document.documentElement.style.fontSize = '100%';
    localStorage.removeItem('emacs-font-size');
    showMsg('Font size reset');
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

  // ── Content Width Cycle ───────────────────────────────────────────────────
  // First click → 100%, then cycles 80ch → 60ch → 840px → back

  const WIDTH_STEPS = ['100%', '80ch', '60ch', '840px'];
  let widthIdx = 3; // default 840px; first click → idx 0 = 100%

  function cycleWidth() {
    widthIdx = (widthIdx + 1) % WIDTH_STEPS.length;
    const w = WIDTH_STEPS[widthIdx];
    document.documentElement.style.setProperty('--content-max-width', w);
    localStorage.setItem('emacs-width-idx', widthIdx);
    showMsg('Width: ' + w);
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

  // ── Echo message helper ───────────────────────────────────────────────────

  function showMsg(msg) {
    window.emacsBlog?.keyboard?.showMessage?.(msg);
  }

  // ── Backdrop ──────────────────────────────────────────────────────────────

  function showBackdrop() { backdrop?.classList.add('visible'); }
  function hideBackdrop() { backdrop?.classList.remove('visible'); }

  // ── Menu Dropdowns ────────────────────────────────────────────────────────

  function openMenuDropdown(item) {
    closeAllMenus();
    item.classList.add('open');
    item.querySelector(':scope > button')?.setAttribute('aria-expanded', 'true');
    openMenu = item;
  }

  function closeAllMenus() {
    menuItems.forEach(item => {
      item.classList.remove('open');
      item.querySelector(':scope > button')?.setAttribute('aria-expanded', 'false');
    });
    openMenu = null;
  }

  function toggleMobileMenu() {
    const isOpen = menuBar?.classList.toggle('menu-open');
    hamburger?.setAttribute('aria-expanded', String(!!isOpen));
  }

  function closeMobileMenu() {
    menuBar?.classList.remove('menu-open');
    hamburger?.setAttribute('aria-expanded', 'false');
  }

  function handleMenuClick(e) {
    const item = e.target.closest('.menu-item');
    if (!item) return;
    const btn = e.target.closest('button');
    if (btn && btn.parentElement === item) {
      item.classList.contains('open') ? closeAllMenus() : openMenuDropdown(item);
      e.preventDefault();
      e.stopPropagation();
    }
  }

  function handleActionClick(e) {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const action = el.dataset.action;
    switch (action) {
      case 'toggle-theme':   toggleTheme(); break;
      case 'increase-font':  adjustFontSize(1); break;
      case 'decrease-font':  adjustFontSize(-1); break;
      case 'reset-font':     resetFontSize(); break;
      case 'cycle-width':    cycleWidth(); break;
      case 'cycle-font':     cycleFontMode(); break;
      case 'fix-scheme':     fixScheme(); break;
      case 'open-palette':   window.emacsBlog?.palette?.open(); break;
      case 'show-help':
        document.getElementById('help-overlay')?.classList.add('visible');
        break;
    }
    closeAllMenus();
    if (action !== 'cycle-width' && action !== 'cycle-font' && action !== 'fix-scheme' && action !== 'open-palette') closeSchemePopup();
  }

  function handleSchemeOptionClick(e) {
    const el = e.target.closest('.scheme-option');
    if (!el) return;
    applyScheme(el.dataset.scheme || '');
    // If pinned, update the pin to the newly selected scheme
    if (localStorage.getItem('emacs-scheme-fixed') !== null) {
      localStorage.setItem('emacs-scheme-fixed', el.dataset.scheme || '');
      localStorage.setItem('emacs-scheme', el.dataset.scheme || '');
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
    closeAllMenus();
    hideBackdrop();
  }

  function handleKeydown(e) {
    if (e.key === 'Escape') {
      closeAllMenus();
      closeSchemePopup();
      closeMobileMenu();
    }
    if (!openMenu) return;
    const dropdown = openMenu.querySelector('.menu-dropdown');
    const items = dropdown?.querySelectorAll('.menu-dropdown-item:not(.disabled)');
    if (!items?.length) return;
    const focused = dropdown.querySelector('.menu-dropdown-item:focus');
    let idx = focused ? Array.from(items).indexOf(focused) : -1;
    if (e.key === 'ArrowDown') { items[(idx + 1) % items.length].focus(); e.preventDefault(); }
    if (e.key === 'ArrowUp')   { items[idx <= 0 ? items.length - 1 : idx - 1].focus(); e.preventDefault(); }
    if (e.key === 'Enter' && focused) { focused.click(); e.preventDefault(); }
  }

  // ── Init ──────────────────────────────────────────────────────────────────

  function init() {
    // Menu dropdowns
    menuItems.forEach(item => item.addEventListener('click', handleMenuClick));

    // Scheme options (both in View menu and popup)
    document.querySelectorAll('.scheme-option').forEach(opt => {
      opt.addEventListener('click', handleSchemeOptionClick);
    });

    // Action buttons (toggle-theme, cycle-*, fix-scheme, etc.)
    document.addEventListener('click', e => {
      if (e.target.closest('[data-action]') && !e.target.closest('.scheme-option')) {
        handleActionClick(e);
      }
    });

    // Scheme popup toggle
    schemePopupBtn?.addEventListener('click', e => {
      toggleSchemePopup();
      e.stopPropagation();
    });

    // Backdrop
    backdrop?.addEventListener('click', handleBackdropClick);

    // Hamburger
    hamburger?.addEventListener('click', toggleMobileMenu);

    // Outside click
    document.addEventListener('click', handleOutsideClick);

    // Keyboard
    document.addEventListener('keydown', handleKeydown);

    // Hover to open adjacent menu (desktop UX)
    menuItems.forEach(item => {
      item.addEventListener('mouseenter', () => {
        if (openMenu && openMenu !== item) openMenuDropdown(item);
      });
    });

    // Restore saved state
    restoreFontSize();
    restoreWidth();
    restoreFontMode();

    // Random/pinned scheme
    initRandomScheme();

    // Hover preview for schemes
    initSchemeHoverPreview();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose globals for keyboard.js shortcuts
  window.toggleTheme      = toggleTheme;
  window.adjustFontSize   = adjustFontSize;
  window.resetFontSize    = resetFontSize;
  window.cycleWidth       = cycleWidth;
  window.cycleFontMode    = cycleFontMode;
  window.toggleSchemePopup = toggleSchemePopup;
  window.applyScheme      = applyScheme;

  window.emacsBlog = window.emacsBlog || {};
  window.emacsBlog.menu = { toggleTheme, adjustFontSize, resetFontSize,
                             closeAllMenus, applyScheme, cycleWidth, cycleFontMode };
})();
