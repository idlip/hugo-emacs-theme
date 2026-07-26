/**
 * Keyboard Navigation for Emacs Blog Theme
 */

(function () {
  'use strict';

  let selectedIndex = 0;
  let keySequence = '';
  let sequenceTimeout = null;
  let isScrollingProgrammatically = false;
  let msgTimeout = null;

  // DOM
  const articleList = document.getElementById('article-list');
  // wander/projects use #buffer-content instead of #buffer-list — fall back so
  // scroll-sync and modeline updates work on those pages too
  const bufferList  = document.getElementById('buffer-list') ||
                      (articleList && document.getElementById('buffer-content')) || null;
  const echoMessage = document.getElementById('echo-message');

  // Are we on a single post page (no article list)?
  const isPostPage = !articleList;

  // ── Shared scroll utilities (used by the list-page scroll sync) ────────────
  // The document scrolls natively now; these centralise the rAF throttling and
  // the document-scroll metrics so nothing duplicates the pattern.
  window.emacsBlog = window.emacsBlog || {};
  window.emacsBlog.util = window.emacsBlog.util || {
    // Run fn at most once per animation frame (coalesces bursty scroll events).
    rafThrottle: function (fn) {
      var ticking = false;
      return function () {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(function () { fn(); ticking = false; });
      };
    },
    // Native document scroll position/extent.
    scrollMetrics: function () {
      var d = document.documentElement;
      return { top: d.scrollTop, max: d.scrollHeight - d.clientHeight, h: d.clientHeight };
    }
  };

  // Controlled page scroll (~1 screen with overlap). Native PageDown jumps a
  // full viewport, which overshoots to the bottom on short pages; this keeps
  // a couple of lines of context. dir = +1 down, -1 up.
  function pageScroll(dir) {
    window.scrollBy({ top: dir * window.innerHeight * 0.9, behavior: 'smooth' });
  }

  // ── Echo area ──────────────────────────────────────────────────────────────

  function showMessage(msg) {
    if (!echoMessage) return;
    clearTimeout(msgTimeout);
    echoMessage.textContent = msg;
    echoMessage.classList.add('flash');
    msgTimeout = setTimeout(() => {
      echoMessage.classList.remove('flash');
      updateEchoHint();
    }, 2500);
  }

  function updateEchoHint() {
    if (!echoMessage) return;
    echoMessage.textContent = '? help';
  }

  // ── List helpers ───────────────────────────────────────────────────────────

  function getArticleItems() {
    return articleList ? Array.from(articleList.querySelectorAll('.article-item')) : [];
  }

  function updateSelection(newIndex, scroll) {
    scroll = scroll !== false;
    const items = getArticleItems();
    if (!items.length) return;

    newIndex = Math.max(0, Math.min(newIndex, items.length - 1));

    items.forEach(function (item) {
      item.classList.remove('selected');
      item.setAttribute('aria-selected', 'false');
      var m = item.querySelector('.article-marker');
      if (m) m.textContent = ' ';
    });

    selectedIndex = newIndex;
    var sel = items[selectedIndex];
    sel.classList.add('selected');
    sel.setAttribute('aria-selected', 'true');
    var marker = sel.querySelector('.article-marker');
    if (marker) marker.textContent = '>';

    if (scroll) {
      isScrollingProgrammatically = true;
      sel.scrollIntoView({ block: 'nearest', behavior: 'instant' });
      setTimeout(function () { isScrollingProgrammatically = false; }, 50);
    }

    updateListModeline();
  }

  function updateListModeline() {
    var items = getArticleItems();
    var modeline = bufferList && bufferList.querySelector('.modeline');
    if (!modeline) return;
    var scrollEl = modeline.querySelector('[data-scroll-position]');
    if (scrollEl) {
      if (!items.length)               scrollEl.textContent = 'Empty';
      else if (selectedIndex === 0)    scrollEl.textContent = 'Top';
      else if (selectedIndex === items.length - 1) scrollEl.textContent = 'Bot';
      else scrollEl.textContent = Math.round((selectedIndex / (items.length - 1)) * 100) + '%';
    }
  }

  function openSelected() {
    var items = getArticleItems();
    if (!items.length) return;
    var item = items[selectedIndex];
    var url = item.dataset.url;
    if (!url) return;
    if (item.dataset.external) window.open(url, '_blank', 'noopener');
    else window.location.href = url;
  }

  // ── Key sequences ──────────────────────────────────────────────────────────

  function handleKeySequence(key) {
    keySequence += key;
    if (sequenceTimeout) clearTimeout(sequenceTimeout);

    var sequences = {
      'gh': function () { window.location.href = '/'; },
      'gp': function () { window.location.href = '/posts/'; },
      'gw': function () { window.location.href = '/wander/'; },
      'gr': function () { window.location.href = '/repo/'; },
      'gg': function () {
        if (isPostPage) window.scrollTo({ top: 0 });
        else updateSelection(0);
      },
      'gG': function () {
        if (isPostPage) window.scrollTo({ top: document.documentElement.scrollHeight });
        else updateSelection(getArticleItems().length - 1);
      }
    };

    if (sequences[keySequence]) {
      sequences[keySequence]();
      keySequence = '';
      return true;
    }

    // Prefix still valid?
    var isPrefixOf = Object.keys(sequences).some(function (k) {
      return k.startsWith(keySequence) && k !== keySequence;
    });

    if (isPrefixOf) {
      showMessage(keySequence + '-');
      sequenceTimeout = setTimeout(function () { keySequence = ''; }, 1000);
      return true; // consumed, waiting for more
    }

    keySequence = '';
    return false;
  }

  // ── Main keyboard handler ──────────────────────────────────────────────────

  function handleKeydown(e) {
    var key   = e.key;
    var ctrl  = e.ctrlKey;
    var meta  = e.metaKey;
    var shift = e.shiftKey;

    // Escape / C-g — always handled, even inside inputs
    if (key === 'Escape' || (ctrl && key === 'g')) {
      if (window.emacsBlog?.palette?.isOpen?.()) {
        window.emacsBlog.palette.close(); e.preventDefault(); return;
      }
      keySequence = '';
      return;
    }

    // Ignore when typing
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    // WCAG 2.1.4 (Character Key Shortcuts): all shortcuts below are single-key
    // (or modifier) shortcuts; when the user turns them off, bail here so native
    // browser behavior (/, Space, PageDown, quick-find, ...) is fully restored.
    if (localStorage.getItem('emacs-keys-off')) return;

    // Command palette — familiar editor bindings so people find it by habit:
    // Ctrl/Cmd+P (quick-open), Ctrl/Cmd+K (command menu), Alt+X (Emacs M-x).
    // e.code (not e.key) so Alt+X survives layouts where Alt composes a symbol.
    var code = e.code;
    if (((ctrl || meta) && (code === 'KeyP' || code === 'KeyK')) || (e.altKey && code === 'KeyX')) {
      window.emacsBlog?.palette?.open();
      e.preventDefault();
      return;
    }

    // Help — open palette in shortcut-browse mode
    if (key === '?') { window.emacsBlog?.palette?.open('? '); e.preventDefault(); return; }

    // g-prefix sequences
    if (keySequence || key === 'g') {
      if (handleKeySequence(key)) { e.preventDefault(); return; }
    }

    // ── Post page shortcuts ────────────────────────────────────────────────
    if (isPostPage) {
      switch (key) {
        case 'n': {
          var next = document.getElementById('post-next');
          if (next) { window.location.href = next.href; e.preventDefault(); }
          break;
        }
        case 'p': {
          var prev = document.getElementById('post-prev');
          if (prev) { window.location.href = prev.href; e.preventDefault(); }
          break;
        }
        case 'q':
          if (window.history.length > 1) window.history.back();
          else window.location.href = '/posts/';
          e.preventDefault();
          break;
        // Arrows / Home / End scroll natively (line + extremes). Space, Page
        // keys, and C-v/M-v use a controlled page (native PageDown over-jumps).
        case ' ':
          pageScroll(shift ? -1 : 1); e.preventDefault(); break;
        case 'v':
          if (ctrl)          { pageScroll(1);  e.preventDefault(); }
          else if (e.altKey) { pageScroll(-1); e.preventDefault(); }
          break;
      }
      // fall through to global shortcuts
    }

    // ── List page shortcuts ────────────────────────────────────────────────
    if (!isPostPage) {
      switch (key) {
        case 'n':
        case 'ArrowDown':
          updateSelection(selectedIndex + 1);
          e.preventDefault();
          break;
        case 'p':
        case 'ArrowUp':
          updateSelection(selectedIndex - 1);
          e.preventDefault();
          break;
        case 'Enter':
        case 'o':
          openSelected();
          e.preventDefault();
          break;
        case ' ':
          openSelected();
          e.preventDefault();
          break;
        case '<':
          updateSelection(0);
          e.preventDefault();
          break;
        case '>':
          updateSelection(getArticleItems().length - 1);
          e.preventDefault();
          break;
        case '/':
          document.getElementById('post-search')?.focus();
          e.preventDefault();
          break;
      }
    }

    // ── Global shortcuts ───────────────────────────────────────────────────
    switch (key) {
      case 'x':
        if (!ctrl && !meta) {
          window.emacsBlog?.palette?.open();
          e.preventDefault();
        }
        break;
      case 't':
      case 'i':
        if (!ctrl && !meta) { toggleTheme(); e.preventDefault(); }
        break;
      case 'w':
        if (!ctrl && !meta) { cycleWidth(); e.preventDefault(); }
        break;
      case 'a':
        if (!ctrl && !meta) { cycleAlign(); e.preventDefault(); }
        break;
      case 'c':
        if (!ctrl && !meta) { toggleSchemePopup(); e.stopPropagation(); }
        break;
      case '+':
      case '=':
        if (!ctrl && !meta) { adjustFontSize(1); e.preventDefault(); }
        break;
      case '-':
        if (!ctrl && !meta) { adjustFontSize(-1); e.preventDefault(); }
        break;
      // Controlled paging (both post + list); native PageDown over-jumps.
      case 'PageDown':
        pageScroll(1); e.preventDefault(); break;
      case 'PageUp':
        pageScroll(-1); e.preventDefault(); break;
    }
  }

  // ── Scroll sync (list page) ────────────────────────────────────────────────

  // Sync the list cursor to the document scroll position (native page scroll).
  function handleListScroll() {
    if (isScrollingProgrammatically) return;
    var items = getArticleItems();
    if (!items.length) return;
    var m = window.emacsBlog.util.scrollMetrics();
    if (m.top >= m.max - 4) {           // at page bottom → last item
      if (selectedIndex !== items.length - 1) updateSelection(items.length - 1, false);
      return;
    }
    var offset = 64;                     // clear the sticky menu-bar
    var closest = 0, closestDist = Infinity;
    items.forEach(function (item, i) {
      var top = item.getBoundingClientRect().top - offset; // viewport-relative
      if (top >= -item.offsetHeight / 2) {
        var d = Math.abs(top);
        if (d < closestDist) { closestDist = d; closest = i; }
      }
    });
    if (closest !== selectedIndex) updateSelection(closest, false);
  }

  // ── Init ───────────────────────────────────────────────────────────────────

  function init() {
    document.addEventListener('keydown', handleKeydown);
    // Clicking the echo message opens shortcut help in palette
    echoMessage?.addEventListener('click', function () { window.emacsBlog?.palette?.open('? '); });

    var util = window.emacsBlog.util;

    // Measure the fixed menu-bar so chrome offsets (body padding, progress-bar
    // top, anchor scroll-padding) track it without a magic number. Layout-time
    // only — runs on load, after web-fonts settle, and on resize; never on scroll.
    var menuBar = document.querySelector('.menu-bar');
    if (menuBar) {
      var setMenuH = function () {
        document.documentElement.style.setProperty('--menu-h', menuBar.offsetHeight + 'px');
      };
      setMenuH();
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(setMenuH);
      window.addEventListener('resize', util.rafThrottle(setMenuH), { passive: true });
    }

    // Post pages: one passive, rAF-throttled listener updates the modeline.
    // Single scrollMetrics() read, then batched writes — one custom prop --sp
    // (0..1) that CSS turns into the fill (scaleX) and the arrowhead (translateX),
    // plus the % text. transform-only visuals + contained layer = smooth scroll.
    if (isPostPage) {
      var modeline = document.querySelector('.modeline');
      var posEl = modeline && modeline.querySelector('[data-scroll-position]');
      if (modeline) {
        var updateProgress = function () {
          var m = util.scrollMetrics();
          var p = m.max > 0 ? m.top / m.max : 0;
          modeline.style.setProperty('--sp', p);
          if (posEl) {
            if (m.max <= 0)              posEl.textContent = 'All';
            else if (m.top <= 0)         posEl.textContent = 'Top';
            else if (m.top >= m.max - 1) posEl.textContent = 'Bot';
            else                         posEl.textContent = Math.round(p * 100) + '%';
          }
        };
        window.addEventListener('scroll', util.rafThrottle(updateProgress), { passive: true });
        updateProgress();
      }
    }

    if (!isPostPage) {
      updateSelection(0, false);
      updateListModeline();
      window.addEventListener('scroll', util.rafThrottle(handleListScroll), { passive: true });

      if (articleList) {
        articleList.addEventListener('mouseover', function (e) {
          var item = e.target.closest('.article-item:not(.no-articles)');
          if (!item) return;
          var idx = getArticleItems().indexOf(item);
          if (idx >= 0 && idx !== selectedIndex) updateSelection(idx, false);
        });
      }
    }

    updateEchoHint();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // WCAG 2.1.4: let users turn the single-key shortcuts off (persisted).
  window.toggleKeys = function () {
    var off = localStorage.getItem('emacs-keys-off');
    if (off) { localStorage.removeItem('emacs-keys-off'); showMessage('Keyboard shortcuts: on'); }
    else     { localStorage.setItem('emacs-keys-off', '1'); showMessage('Keyboard shortcuts: off'); }
  };

  window.emacsBlog = window.emacsBlog || {};
  window.emacsBlog.keyboard = { showMessage: showMessage };
})();
