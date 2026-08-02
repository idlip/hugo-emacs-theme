/**
 * Keyboard Navigation for Emacs Blog Theme
 */

(function () {
  'use strict';

  let selectedIndex = 0;
  let keySequence = '';
  let sequenceTimeout = null;
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

  // ── Shared scroll utilities ──────────────────────────────────────────────
  window.emacsBlog = window.emacsBlog || {};
  window.emacsBlog.util = window.emacsBlog.util || {
    // Run fn at most once per animation frame (coalesces bursty resize events).
    rafThrottle: function (fn) {
      var ticking = false;
      return function () {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(function () { fn(); ticking = false; });
      };
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
      sel.scrollIntoView({ block: 'nearest', behavior: 'instant' });
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

  // ── Code copy buttons ────────────────────────────────────────────────────
  // Chroma puts data-lang on <code>, not <pre> — the pre::before lang label
  // (theme.css) reads it from <pre>, so it silently never fired. Copy it up
  // while we're already walking every code block for the copy button.
  function addCodeCopyButtons() {
    document.querySelectorAll('.post-body pre').forEach(function (pre) {
      var code = pre.querySelector('code');
      if (!code) return;
      var lang = code.getAttribute('data-lang');
      if (lang) pre.setAttribute('data-lang', lang);

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'code-copy-btn';
      btn.textContent = 'Copy';
      btn.setAttribute('aria-label', 'Copy code to clipboard');
      btn.addEventListener('click', function () {
        navigator.clipboard.writeText(code.textContent).then(function () {
          btn.textContent = 'Copied!';
          btn.classList.add('copied');
          clearTimeout(btn._copyReset);
          btn._copyReset = setTimeout(function () {
            btn.textContent = 'Copy';
            btn.classList.remove('copied');
          }, 1500);
        }).catch(function () {});
      });
      pre.appendChild(btn);
    });
  }

  // ── Heading anchor links ─────────────────────────────────────────────────
  // go-org already assigns sequential ids (headline-N) to post headings; add
  // a visible, focusable link to each so sections are directly linkable.
  function addHeadingAnchors() {
    document.querySelectorAll('.post-body :is(h2, h3, h4, h5, h6)[id]').forEach(function (h) {
      var a = document.createElement('a');
      a.className = 'heading-anchor';
      a.href = '#' + h.id;
      a.setAttribute('aria-label', 'Link to this section');
      a.textContent = '#';
      h.appendChild(a);
    });
  }

  // ── Image lightbox ───────────────────────────────────────────────────────
  // Click a post image to view it full-size in the shared <dialog> (baseof.html).
  // Esc and backdrop-click close it natively/via the same idiom as the palette.
  function initImageLightbox() {
    var imgs = document.querySelectorAll('.post-body img');
    if (!imgs.length) return;
    var dlg = document.getElementById('image-lightbox');
    var lbImg = document.getElementById('lightbox-img');
    if (!dlg || !lbImg) return;
    imgs.forEach(function (img) {
      img.addEventListener('click', function () {
        lbImg.src = img.currentSrc || img.src;
        lbImg.alt = img.alt || '';
        dlg.showModal();
      });
    });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
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

    if (isPostPage) {
      addCodeCopyButtons();
      addHeadingAnchors();
      initImageLightbox();
    }

    if (!isPostPage) {
      updateSelection(0, false);
      updateListModeline();

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
