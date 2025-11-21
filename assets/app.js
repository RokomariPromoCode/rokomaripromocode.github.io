/* assets/app.js
   Main site behavior: JSON load, site-wide search, home sections carousel, card rendering.
*/

(function () {
  'use strict';

  // Config from layout (set by _layouts/default.html)
  const SITE_BASE = window.SITE_BASE || '';
  const jsonPath = window.JSON_DATA_PATH || (SITE_BASE + '/data/default.json');

  // Main content node (layout places content in #main-content)
  const main = document.getElementById('main-content') || document.querySelector('main') || document.body;

  // Determine whether we should render home-like sections
  const relPath = (location.pathname || '').replace(SITE_BASE, '') || '/';
  const isHome = (relPath === '/' || relPath === '/index.html' || relPath === '/index' || !!window.FORCE_LOAD_CARDS);

  // Utility to create elements quickly
  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }

  // ---- Search system ----
  let productDatabase = []; // array of normalized products used for suggestions

  // Listen for header search custom events (header dispatches 'app:search')
  document.addEventListener('app:search', function (ev) {
    const q = String((ev && ev.detail) || '').trim().toLowerCase();
    doSearch(q);
  });

  // Also wire direct input (fallback)
  const searchInput = document.getElementById('header-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', function (e) {
      const q = String(e.target.value || '').trim().toLowerCase();
      doSearch(q);
    });
  }

  const searchResultsEl = document.getElementById('search-results');

  function renderSearchResults(items) {
    if (!searchResultsEl) return;
    searchResultsEl.innerHTML = '';
    if (!items || items.length === 0) {
      searchResultsEl.style.display = 'none';
      return;
    }
    items.forEach(it => {
      const a = el('a', 'item');
      a.href = it.link || '#';
      a.innerHTML = `<img src="${it.img || ''}" alt=""><div><h4>${it.title || ''}</h4><p>${it.author || ''}</p></div>`;
      searchResultsEl.appendChild(a);
    });
    searchResultsEl.style.display = 'block';
  }

  function doSearch(q) {
    if (!q) {
      if (searchResultsEl) searchResultsEl.style.display = 'none';
      return;
    }
    const matches = [];
    const seen = new Set();
    for (let i = 0; i < productDatabase.length && matches.length < 12; i++) {
      const p = productDatabase[i];
      const title = (p.title || '').toLowerCase();
      const author = (p.author || '').toLowerCase();
      const seller = (p.seller || '').toLowerCase();
      if (title.includes(q) || author.includes(q) || seller.includes(q)) {
        const key = p.link || (p.title || i);
        if (!seen.has(key)) {
          seen.add(key);
          matches.push(p);
        }
      }
    }
    renderSearchResults(matches);
  }

  // hide suggestions on outside click
  document.addEventListener('click', function (ev) {
    if (!searchResultsEl || !searchInput) return;
    if (!searchResultsEl.contains(ev.target) && !searchInput.contains(ev.target)) {
      searchResultsEl.style.display = 'none';
    }
  });

  // ---- Fetch JSON helper ----
  async function fetchJson(path) {
    try {
      const r = await fetch(path, { cache: 'no-store' });
      if (!r.ok) {
        console.warn('app.js: fetch failed', path, r.status);
        return [];
      }
      const data = await r.json();
      if (!Array.isArray(data)) {
        console.warn('app.js: JSON not array', path);
        return [];
      }
      return data;
    } catch (err) {
      console.error('app.js: fetch error', path, err);
      return [];
    }
  }

  // Normalize shapes and dedupe by link or title
  function normalizeProducts(list) {
    const out = [];
    const seen = new Set();
    for (const it of (list || [])) {
      const link = (it.link || it.url || '').toString();
      const key = link || (it.title || '').toString().slice(0, 80);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        title: it.title || it.name || '',
        author: it.author || '',
        seller: it.seller || it.brand || '',
        img: it.img || it.image || '',
        desc: (it.desc || it.summary || '').replace(/<br\s*\/?>/gi, ' '),
        link: link || '#',
        category: (it.category || it.cat || it.group || 'others').toString().toLowerCase(),
        best_seller: !!it.best_seller
      });
    }
    return out;
  }

  // ---- Card creation ----
  function makeCard(product) {
    const c = el('div', 'card');

    const wrap = el('div', 'img-wrap');
    const img = el('img');
    img.src = product.img || '';
    img.alt = product.title || '';
    wrap.appendChild(img);
    c.appendChild(wrap);

    const title = el('div', 'title');
    title.textContent = product.title || '';
    c.appendChild(title);

    const meta = el('div', 'meta');
    const metaParts = [];
    if (product.author) metaParts.push('লেখক: ' + product.author);
    if (product.seller) metaParts.push('বিক্রেতা: ' + product.seller);
    meta.textContent = metaParts.join(' • ');
    c.appendChild(meta);

    const desc = el('div', 'desc');
    desc.textContent = product.desc || '';
    c.appendChild(desc);

    const cta = el('div', 'cta-row');
    const offer = el('div', 'offer-text');
    offer.textContent = 'ডিসকাউন্ট পেতে এখানে কিনুন';
    const buy = el('a', 'buy-btn');
    buy.href = product.link || '#';
    buy.target = '_blank';
    buy.rel = 'noopener noreferrer';
    buy.textContent = 'Buy Now';
    cta.appendChild(offer);
    cta.appendChild(buy);
    c.appendChild(cta);

    return c;
  }

  function makeSeeMore(name, href) {
    const sm = el('div', 'see-more');
    const btn = el('button', 'see-more-btn', `See all ${name}`);
    btn.addEventListener('click', () => {
      if (href) location.href = href;
    });
    sm.appendChild(btn);
    return sm;
  }

  // perView logic by viewport width
  function perViewForWidth(w) {
    if (w <= 540) return 1;
    if (w <= 880) return 2;
    if (w <= 1100) return 3;
    return 4;
  }

  // Create a carousel-style section
  function createSection(title, items, opts) {
    opts = opts || {};
    const section = el('section', 'section');
    const head = el('div', 'section-head');
    head.innerHTML = `<div class="title">${title}</div>`;
    section.appendChild(head);

    const wrap = el('div', 'row-wrap');
    wrap.style.position = 'relative';
    const row = el('div', 'card-row');
    row.style.transition = 'transform .45s cubic-bezier(.22,.9,.18,1)';
    wrap.appendChild(row);
    section.appendChild(wrap);

    // append cards
    items.forEach(p => row.appendChild(makeCard(p)));

    // append see-more placeholder as last element
    row.appendChild(makeSeeMore(title, opts.moreHref || '#'));

    // add arrows
    const prev = el('button', 'carousel-arrow prev', `<i class="fas fa-chevron-left"></i>`);
    const next = el('button', 'carousel-arrow next', `<i class="fas fa-chevron-right"></i>`);
    prev.style.display = 'none';
    section.appendChild(prev);
    section.appendChild(next);

    // state
    let perView = perViewForWidth(window.innerWidth);
    let idx = 0;

    function computeCardWidth() {
      const first = row.children[0];
      if (!first) return 260 + 18;
      const gap = 18;
      const w = first.offsetWidth || first.getBoundingClientRect().width || 260;
      return w + gap;
    }

    function repaint() {
      const cardW = computeCardWidth();
      row.style.transform = `translateX(-${idx * cardW}px)`;
      prev.style.display = idx <= 0 ? 'none' : '';
      // hide next arrow if we've pushed to show see-more
      if (idx + perView >= (items.length)) next.style.display = 'none';
      else next.style.display = '';
    }

    function onResize() {
      perView = perViewForWidth(window.innerWidth);
      const maxIdx = Math.max(0, items.length - perView);
      if (idx > maxIdx) idx = maxIdx;
      setTimeout(repaint, 60);
    }

    prev.addEventListener('click', () => {
      idx = Math.max(0, idx - perView);
      repaint();
    });
    next.addEventListener('click', () => {
      idx = Math.min(items.length, idx + perView);
      repaint();
    });

    window.addEventListener('resize', onResize);

    // initial paint after images may load
    setTimeout(() => {
      onResize();
      repaint();
    }, 220);

    return section;
  }

  // group normalized products by category
  function groupByCategory(list) {
    const groups = {};
    for (const p of list) {
      const cat = (p.category || 'others').toString().toLowerCase();
      groups[cat] = groups[cat] || [];
      groups[cat].push(p);
    }
    return groups;
  }

  // render home sections (best seller + categories)
  async function renderHomeSections(jsonList) {
    const normalized = normalizeProducts(jsonList);
    productDatabase = normalized.slice(); // fill db for search

    const groups = groupByCategory(normalized);

    // best sellers
    let best = normalized.filter(x => x.best_seller).slice(0, 12);
    if (best.length < 6) best = normalized.slice(0, 8);

    // clear main and inject title + sections
    if (main) main.innerHTML = '';

    const titleWrap = el('div', 'site-title');
    titleWrap.innerHTML = `<h1>Rokomari Promo Code</h1><p style="color:#666;margin-top:6px">বিভিন্ন ক্যাটাগরি দেখুন — সার্চ ও মোবাইল মেনু ব্যবহার করে ব্রাউজ করুন।</p>`;
    main.appendChild(titleWrap);

    if (best && best.length) {
      main.appendChild(createSection('Best Seller', best, { moreHref: SITE_BASE + '/best-seller/' }));
    }

    const order = ['books', 'electronics', 'foods', 'furniture', 'beauty', 'others'];
    order.forEach(cat => {
      const items = (groups[cat] || []).slice(0, 12);
      if (!items.length) return;
      const pretty = `Rokomari PromoCode For ${cat.charAt(0).toUpperCase() + cat.slice(1)}`;
      main.appendChild(createSection(pretty, items, { moreHref: SITE_BASE + '/' + cat + '/' }));
    });
  }

  // ----- initialization flow -----
  (async function init() {
    // Always try to load JSON to populate productDatabase (for search)
    const list = await fetchJson(jsonPath);

    // If home (or forced), render sections. If JSON empty, attempt simple alt path recovery.
    if (isHome) {
      if ((!list || list.length === 0) && jsonPath) {
        // Try to recover if path contains a duplicated dir like /trial/trial/
        const alt = jsonPath.replace(/\/([^\/]+)\/\1\//, '/$1/');
        if (alt !== jsonPath) {
          const altList = await fetchJson(alt);
          if (Array.isArray(altList) && altList.length) {
            await renderHomeSections(altList);
            return;
          }
        }
      }
      await renderHomeSections(list || []);
    } else {
      // not home: just fill productDatabase for search
      productDatabase = normalizeProducts(list);
    }

    // debug log
    console.info('app.js loaded. isHome=', isHome, 'jsonPath=', jsonPath, 'products=', productDatabase.length);
  })();

  // Expose some helpers globally (for debugging)
  window._app = {
    productDatabase,
    reloadJson: async function (path) {
      const p = path || jsonPath;
      const data = await fetchJson(p);
      productDatabase = normalizeProducts(data);
      console.info('app.js reloadJson done', p, productDatabase.length);
      return productDatabase;
    }
  };

})();