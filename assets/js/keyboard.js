/**
 * Keyboard Navigation for Emacs Blog Theme
 */

(function () {
  'use strict';

  let selectedIndex = 0;
  let keySequence = '';
  let sequenceTimeout = null;
  let isScrollingProgrammatically = false;

  // DOM
  const articleList = document.getElementById('article-list');
  const bufferList  = document.getElementById('buffer-list');
  const echoMessage = document.getElementById('echo-message');
  const helpOverlay = document.getElementById('help-overlay');

  // Are we on a single post page (no article list)?
  const isPostPage = !articleList;

  // Scroll target on post pages
  const contentBody = document.getElementById('content-body');

  // ── Echo area ──────────────────────────────────────────────────────────────

  function showMessage(msg) {
    if (!echoMessage) return;
    echoMessage.textContent = msg;
    setTimeout(updateEchoHint, 3000);
  }

  function updateEchoHint() {
    if (!echoMessage) return;
    echoMessage.textContent = isPostPage
      ? 'q back  SPC scroll  ? help'
      : 'n/p navigate  RET open  / search  ? help';
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
      sel.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      setTimeout(function () { isScrollingProgrammatically = false; }, 150);
    }

    updateListModeline();
  }

  function updateListModeline() {
    var items = getArticleItems();
    var modeline = bufferList && bufferList.querySelector('.modeline');
    if (!modeline) return;
    var scrollEl = modeline.querySelector('[data-scroll-position]');
    var lineEl   = modeline.querySelector('[data-line-number]');
    if (scrollEl) {
      if (!items.length)               scrollEl.textContent = 'Empty';
      else if (selectedIndex === 0)    scrollEl.textContent = 'Top';
      else if (selectedIndex === items.length - 1) scrollEl.textContent = 'Bot';
      else scrollEl.textContent = Math.round((selectedIndex / (items.length - 1)) * 100) + '%';
    }
    if (lineEl) lineEl.textContent = selectedIndex + 1;
  }

  function openSelected() {
    var items = getArticleItems();
    if (!items.length) return;
    var url = items[selectedIndex].dataset.url;
    if (url) window.location.href = url;
  }

  // ── Key sequences ──────────────────────────────────────────────────────────

  function handleKeySequence(key) {
    keySequence += key;
    if (sequenceTimeout) clearTimeout(sequenceTimeout);

    var sequences = {
      'gh': function () { window.location.href = '/'; },
      'gp': function () { window.location.href = '/posts/'; },
      'gg': function () {
        if (isPostPage) { if (contentBody) contentBody.scrollTop = 0; }
        else updateSelection(0);
      },
      'gG': function () {
        if (isPostPage) { if (contentBody) contentBody.scrollTop = contentBody.scrollHeight; }
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

    // Ignore when typing
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    // Escape / C-g — close help or clear sequence
    if (key === 'Escape' || (ctrl && key === 'g')) {
      if (helpOverlay && helpOverlay.classList.contains('visible')) {
        toggleHelp(); e.preventDefault(); return;
      }
      keySequence = '';
      return;
    }

    // Help
    if (key === '?') { toggleHelp(); e.preventDefault(); return; }
    if (helpOverlay && helpOverlay.classList.contains('visible')) return;

    // g-prefix sequences
    if (keySequence || key === 'g') {
      if (handleKeySequence(key)) { e.preventDefault(); return; }
    }

    // ── Post page shortcuts ────────────────────────────────────────────────
    if (isPostPage) {
      switch (key) {
        case 'q':
          if (window.history.length > 1) window.history.back();
          else window.location.href = '/posts/';
          e.preventDefault();
          break;
        case ' ':
          if (contentBody) {
            contentBody.scrollBy({ top: shift ? -contentBody.clientHeight * 0.8 : contentBody.clientHeight * 0.8, behavior: 'smooth' });
            e.preventDefault();
          }
          break;
        case 'ArrowDown':
          if (contentBody) { contentBody.scrollBy({ top: 150, behavior: 'smooth' }); e.preventDefault(); }
          break;
        case 'ArrowUp':
          if (contentBody) { contentBody.scrollBy({ top: -150, behavior: 'smooth' }); e.preventDefault(); }
          break;
        case 'v':
          if (ctrl && contentBody)  { contentBody.scrollBy({ top: contentBody.clientHeight * 0.8, behavior: 'smooth' }); e.preventDefault(); }
          else if (e.altKey && contentBody) { contentBody.scrollBy({ top: -contentBody.clientHeight * 0.8, behavior: 'smooth' }); e.preventDefault(); }
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
      case 't':
        if (!ctrl && !meta) { window.toggleTheme && window.toggleTheme(); e.preventDefault(); }
        break;
      case '+':
      case '=':
        if (!ctrl && !meta) { window.adjustFontSize && window.adjustFontSize(1); e.preventDefault(); }
        break;
      case '-':
        if (!ctrl && !meta) { window.adjustFontSize && window.adjustFontSize(-1); e.preventDefault(); }
        break;
    }
  }

  // ── Help overlay ───────────────────────────────────────────────────────────

  function toggleHelp() {
    if (!helpOverlay) return;
    var v = helpOverlay.classList.toggle('visible');
    helpOverlay.setAttribute('aria-hidden', !v);
    if (v) document.getElementById('help-close') && document.getElementById('help-close').focus();
  }

  // ── Scroll sync (list page) ────────────────────────────────────────────────

  function handleListScroll(e) {
    if (isScrollingProgrammatically) return;
    var items = getArticleItems();
    if (!items.length) return;
    var containerTop = e.target.getBoundingClientRect().top;
    var closest = 0, closestDist = Infinity;
    items.forEach(function (item, i) {
      var top = item.getBoundingClientRect().top - containerTop;
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
    document.getElementById('help-close') && document.getElementById('help-close').addEventListener('click', toggleHelp);

    if (!isPostPage) {
      updateSelection(0, false);
      updateListModeline();
      var listBody = bufferList && bufferList.querySelector('.buffer-body');
      if (listBody) listBody.addEventListener('scroll', handleListScroll, { passive: true });
    }

    updateEchoHint();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.emacsBlog = window.emacsBlog || {};
  window.emacsBlog.keyboard = { showMessage: showMessage };
})();
