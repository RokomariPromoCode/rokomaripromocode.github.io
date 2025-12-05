// assets/app.js
(function () {
  'use strict';

  // ---- helpers -------------------------------------------------------------

  function resolveUrl(path) {
    // simple resolver – adjust if you later use a base URL
    return path;
  }

  async function loadJson(path) {
    const res = await fetch(resolveUrl(path), { cache: 'no-store' });
    if (!res.ok) {
      throw new Error('Failed to load JSON: ' + path + ' (' + res.status + ')');
    }
    return res.json();
  }

  // ---- spinner / loading helpers ------------------------------------------

  function showLoading(el) {
    el.innerHTML = (
      '<div class="loading-spinner" aria-label="Loading">' +
        '<div class="spinner"></div>' +
      '</div>'
    );
  }

  function showLoadError(el, msg) {
    el.innerHTML =
      '<p class="load-error">' +
      (msg || 'Sorry, we couldn’t load the offers right now. Please refresh the page.') +
      '</p>';
  }

  // ---- card rendering ------------------------------------------------------

  function renderCards(main, data) {
    if (!Array.isArray(data)) {
      showLoadError(main, 'No offers found.');
      return;
    }

    const cardsHtml = data.map(function (item) {
      const title = item.title || item.name || 'Offer';
      const desc = item.description || '';
      const btn = item.button_text || 'Buy Now';
      const link = item.url || item.link || '#';
      const price = item.price || '';
      const tag = item.tag || item.category || '';

      return (
        '<article class="deal-card">' +
          '<div class="deal-card-body">' +
            (tag ? '<div class="deal-tag">' + escapeHtml(tag) + '</div>' : '') +
            '<h3 class="deal-title">' + escapeHtml(title) + '</h3>' +
            (desc ? '<p class="deal-desc">' + escapeHtml(desc) + '</p>' : '') +
            (price ? '<p class="deal-price">' + escapeHtml(price) + '</p>' : '') +
          '</div>' +
          '<div class="deal-card-footer">' +
            '<a class="deal-btn" href="' + escapeAttr(link) + '" target="_blank" rel="noopener">' +
              escapeHtml(btn) +
            '</a>' +
          '</div>' +
        '</article>'
      );
    }).join('');

    main.innerHTML =
      '<div class="deal-grid">' +
        cardsHtml +
      '</div>';
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeAttr(str) {
    return escapeHtml(str);
  }

  // ---- load cards for category pages --------------------------------------

  async function loadCardsForMain() {
    const main = document.querySelector('#main[data-src]');
    if (!main) return;

    const src = main.getAttribute('data-src');
    if (!src) return;

    showLoading(main);

    try {
      const data = await loadJson(src);
      renderCards(main, data);
    } catch (err) {
      console.error(err);
      showLoadError(main);
    }
  }

  // ---- search: auto-discover JSON sources ---------------------------------

  const SEARCH_INDEX_URL = '/data/index.json';
  let _searchSourcesCache = null;

  async function getSearchSources() {
    if (_searchSourcesCache) return _searchSourcesCache;

    try {
      const list = await loadJson(SEARCH_INDEX_URL);
      _searchSourcesCache = Array.isArray(list)
        ? list.filter(function (item) { return item && item.name !== 'index.json'; })
        : [];
    } catch (e) {
      console.error('Failed to load search index', e);
      _searchSourcesCache = [];
    }
    return _searchSourcesCache;
  }

  async function runSearch(query) {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return [];

    const sources = await getSearchSources();
    const results = [];

    for (let i = 0; i < sources.length; i++) {
      const src = sources[i];
      try {
        const data = await loadJson(src.path);
        if (!Array.isArray(data)) continue;

        data.forEach(function (item) {
          const title = (item.title || item.name || '').toLowerCase();
          const desc = (item.description || '').toLowerCase();

          if (!title && !desc) return;

          if (title.indexOf(q) !== -1 || desc.indexOf(q) !== -1) {
            results.push({
              source: src.name,
              title: item.title || item.name || '',
              description: item.description || '',
              url: item.url || item.link || '#'
            });
          }
        });
      } catch (e) {
        console.warn('Search: failed to read', src.path, e);
      }
    }

    return results;
  }

  function setupSearch() {
    const form = document.querySelector('#search-form');
    const input = document.querySelector('#search-input');
    const resultsBox = document.querySelector('#search-results');

    if (!form || !input) return;

    if (resultsBox) {
      resultsBox.innerHTML = '';
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      runAndRenderSearch(input.value);
    });

    input.addEventListener('keyup', function (e) {
      if (e.key === 'Enter') return; // already handled by submit
      if (input.value.trim().length >= 3) {
        runAndRenderSearch(input.value);
      } else if (resultsBox) {
        resultsBox.innerHTML = '';
        resultsBox.classList.remove('is-visible');
      }
    });

    async function runAndRenderSearch(q) {
      if (!resultsBox) return;

      const query = String(q || '').trim();
      if (!query) {
        resultsBox.innerHTML = '';
        resultsBox.classList.remove('is-visible');
        return;
      }

      resultsBox.classList.add('is-visible');
      resultsBox.innerHTML =
        '<div class="loading-spinner"><div class="spinner"></div></div>';

      try {
        const results = await runSearch(query);
        if (!results.length) {
          resultsBox.innerHTML =
            '<p class="search-empty">No results found.</p>';
          return;
        }

        const html = results.map(function (r) {
          return (
            '<a class="search-item" href="' + escapeAttr(r.url) + '" target="_blank" rel="noopener">' +
              '<span class="search-item-title">' + escapeHtml(r.title || 'Offer') + '</span>' +
              (r.description
                ? '<span class="search-item-desc">' + escapeHtml(r.description) + '</span>'
                : ''
              ) +
              '<span class="search-item-meta">' + escapeHtml(r.source) + '</span>' +
            '</a>'
          );
        }).join('');

        resultsBox.innerHTML = '<div class="search-list">' + html + '</div>';
      } catch (e) {
        console.error('Search error', e);
        resultsBox.innerHTML =
          '<p class="load-error">Search is not available right now.</p>';
      }
    }
  }

  // ---- header nav (optional: active link state) ----------------------------

  function setupHeader() {
    const navLinks = document.querySelectorAll('header nav a[href]');
    const current = location.pathname.replace(/\/+$/, '') || '/';

    navLinks.forEach(function (a) {
      const href = a.getAttribute('href') || '';
      const normalized = href.replace(/\/+$/, '') || '/';
      if (normalized === current) {
        a.classList.add('is-active');
      }
    });
  }

  // ---- boot ----------------------------------------------------------------

  document.addEventListener('DOMContentLoaded', function () {
    setupHeader();
    setupSearch();
    loadCardsForMain();
  });
})();
