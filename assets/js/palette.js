/**
 * Command Palette — native <dialog>.
 * Default: commands + posts. "t " prefix: all base16 schemes.
 * Trigger: x key (keyboard.js) or window.emacsBlog.palette.open()
 */
(function () {
  'use strict';

  var dlg = document.getElementById('palette-dialog');
  var inp = document.getElementById('palette-input');
  var res = document.getElementById('palette-results');
  if (!dlg || !inp || !res) return;

  var BASE_KEYS = ['base00','base01','base02','base03','base04','base05','base06','base07',
                   'base08','base09','base0A','base0B','base0C','base0D','base0E','base0F'];

  function applyCustomPalette(colors) {
    BASE_KEYS.forEach(function (k, i) {
      if (colors[i]) document.documentElement.style.setProperty('--' + k, colors[i]);
    });
  }

  function clearCustomPalette() {
    BASE_KEYS.forEach(function (k) { document.documentElement.style.removeProperty('--' + k); });
    localStorage.removeItem('emacs-custom-palette');
  }

  var CMDS = [
    { t: 'Navigate: Home',            a: function () { location.href = '/'; } },
    { t: 'Navigate: All Posts',       a: function () { location.href = '/posts/'; } },
    { t: 'Toggle dark / light theme', a: function () { dlg.close(); window.toggleTheme && window.toggleTheme(); } },
    { t: 'Cycle font mode',           a: function () { dlg.close(); window.cycleFontMode && window.cycleFontMode(); } },
    { t: 'Cycle content width',       a: function () { dlg.close(); window.cycleWidth && window.cycleWidth(); } },
    { t: 'Browse all color schemes',  a: function () { inp.value = 't '; render('t '); inp.focus(); inp.setSelectionRange(2, 2); } },
    { t: 'Color scheme picker',       a: function () { dlg.close(); window.toggleSchemePopup && window.toggleSchemePopup(); } },
    { t: 'Keyboard shortcuts',        a: function () { inp.value = '? '; render('? '); inp.focus(); inp.setSelectionRange(2, 2); } },
  ];

  var HELP = [
    { t: 'n / ↓  —  Next article',           a: null },
    { t: 'p / ↑  —  Previous article',       a: null },
    { t: 'RET / o  —  Open article',         a: null },
    { t: '< / >  —  First / last in list',   a: null },
    { t: 'n / p  —  Next / prev post',       a: null },
    { t: 'Space  —  Scroll page',            a: null },
    { t: 'q  —  Go back to list',            a: null },
    { t: 'g h  —  Go home',                  a: function () { location.href = '/'; } },
    { t: 'g p  —  Go to posts',              a: function () { location.href = '/posts/'; } },
    { t: 'g g / g G  —  Top / bottom',       a: null },
    { t: 't  —  Toggle theme',               a: function () { dlg.close(); window.toggleTheme && window.toggleTheme(); } },
    { t: 'f  —  Cycle font mode',            a: function () { dlg.close(); window.cycleFontMode && window.cycleFontMode(); } },
    { t: 'w  —  Cycle content width',        a: function () { dlg.close(); window.cycleWidth && window.cycleWidth(); } },
    { t: 'c  —  Color scheme picker',        a: function () { dlg.close(); window.toggleSchemePopup && window.toggleSchemePopup(); } },
    { t: '+ / -  —  Font size',              a: null },
    { t: 'x  —  Open command palette',       a: null },
  ];

  var idx = 0, items = [];
  var allSchemes = null, snap = null;

  function snapRestore() {
    if (snap) BASE_KEYS.forEach(function (k, i) { snap[i] ? document.documentElement.style.setProperty('--'+k, snap[i]) : document.documentElement.style.removeProperty('--'+k); });
    snap = null;
  }

  function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;'); }

  function match(str, q) {
    if (!q) return esc(str);
    var lo = str.toLowerCase(), tokens = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!tokens.every(function (t) { return lo.includes(t); })) return null;
    var m = new Uint8Array(str.length), r = '', in_ = false;
    tokens.forEach(function (t) { var i = lo.indexOf(t); while (i >= 0) { m.fill(1, i, i+t.length); i = lo.indexOf(t, i+1); } });
    for (var i = 0; i < str.length; i++) {
      if (m[i] && !in_) { r += '<mark>'; in_ = true; }
      else if (!m[i] && in_) { r += '</mark>'; in_ = false; }
      r += esc(str[i]);
    }
    return in_ ? r + '</mark>' : r;
  }

  function buildList() {
    res.innerHTML = items.length
      ? items.map(function (it, i) {
          return '<div class="palette-item' + (i ? '' : ' selected') + '" data-i="' + i + '">'
            + '<span class="palette-item-title">' + it.html + '</span></div>';
        }).join('')
      : '<div class="palette-empty">No results</div>';
    idx = 0;
    res.querySelectorAll('[data-i]').forEach(function (el) {
      el.addEventListener('click', function () { items[+el.dataset.i].action(); });
    });
  }

  function renderSchemes(q) {
    if (!allSchemes) {
      res.innerHTML = '<div class="palette-empty">Loading schemes\u2026</div>';
      if (!window.__schemesUrl) return;
      fetch(window.__schemesUrl)
        .then(function (r) { return r.json(); })
        .then(function (data) {
          allSchemes = data.sort(function (a, b) { return a.name.localeCompare(b.name); });
          renderSchemes(q);
        }).catch(function () {});
      return;
    }
    if (!snap) snap = BASE_KEYS.map(function (k) { return document.documentElement.style.getPropertyValue('--'+k); });
    items = [];
    allSchemes.forEach(function (s) {
      var h = match(s.name, q);
      if (h !== null) {
        var colors = s.colors, key = s.key, name = s.name;
        items.push({ html: h, colors: colors, action: function () {
          applyCustomPalette(colors);
          localStorage.setItem('emacs-custom-palette', JSON.stringify({ key: key, name: name, colors: colors }));
          document.documentElement.removeAttribute('data-scheme');
          localStorage.removeItem('emacs-scheme');
          snap = null; dlg.close();
        }});
      }
    });
    buildList();
  }

  function render(v) {
    if (v.startsWith('t ')) {
      inp.placeholder = 'Color scheme\u2026';
      renderSchemes(v.slice(2).trim());
    } else if (v.startsWith('? ')) {
      inp.placeholder = 'Search shortcuts\u2026';
      var q = v.slice(2).trim();
      items = [];
      HELP.forEach(function (h) {
        var ht = match(h.t, q);
        if (ht !== null) items.push({ html: ht, action: h.a || function () { dlg.close(); } });
      });
      buildList();
    } else {
      inp.placeholder = 'Search commands and posts\u2026';
      var q = v.trim();
      items = [];
      CMDS.forEach(function (c) {
        var h = match(c.t, q); if (h !== null) items.push({ html: h, action: c.a });
      });
      (window.__posts || []).forEach(function (p) {
        var url = p.url, h = match(p.title, q);
        if (h !== null) items.push({ html: h, action: function () { location.href = url; } });
      });
      items = items.slice(0, 30);
      buildList();
    }
  }

  function sel(n) {
    var els = res.querySelectorAll('[data-i]');
    if (!els.length) return;
    idx = Math.max(0, Math.min(n, els.length - 1));
    els.forEach(function (el, i) { el.classList.toggle('selected', i === idx); });
    els[idx].scrollIntoView({ block: 'nearest' });
    if (snap && items[idx] && items[idx].colors) applyCustomPalette(items[idx].colors);
  }

  inp.addEventListener('input', function () { render(inp.value); });
  inp.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown' || (e.ctrlKey && e.key === 'n')) { sel(idx + 1); e.preventDefault(); }
    else if (e.key === 'ArrowUp'   || (e.ctrlKey && e.key === 'p')) { sel(idx - 1); e.preventDefault(); }
    else if (e.key === 'Enter' && items[idx]) { items[idx].action(); e.preventDefault(); }
    else if (e.key === 'Backspace' && (inp.value === 't ' || inp.value === '? ')) { snapRestore(); inp.value = ''; render(''); e.preventDefault(); }
  });
  dlg.addEventListener('click', function (e) { if (e.target === dlg) { snapRestore(); dlg.close(); } });

  function open(prefix) { dlg.showModal(); inp.value = prefix || ''; render(inp.value); inp.focus(); if (prefix) inp.setSelectionRange(prefix.length, prefix.length); }

  window.emacsBlog = window.emacsBlog || {};
  window.emacsBlog.palette = {
    open: open,
    close: function () { snapRestore(); dlg.close(); },
    isOpen: function () { return dlg.open; },
    clearCustomPalette: clearCustomPalette
  };
})();
