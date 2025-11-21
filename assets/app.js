/* assets/app.js
   Main site loader: search, card rendering (home), per-section carousel.
   - Normalizes SITE_BASE and JSON path to avoid duplicated segments.
   - Only injects home sections when on root (or when FORCE_LOAD_CARDS is true).
*/

(function () {
  'use strict';

  /* -------------------------
     Utilities
     ------------------------- */
  function normBase(raw) {
    raw = (raw || '').toString().trim();
    if (!raw || raw === '/') return '';
    if (raw[0] !== '/') raw = '/' + raw;
    return raw.replace(/\/+$/, '');
  }

  function normPath(base, path) {
    // ensure no double slashes and path starts with single slash if base present
    base = normBase(base);
    path = (path || '').toString().trim();
    // if path already absolute (starts with http), return unchanged
    if (/^https?:\/\//i.test(path)) return path;
    if (!path) return base || '/';
    if (path[0] !== '/') path = '/' + path;
    // remove repeated segments like '/trial/trial/data/...'
    // We'll collapse any repeated adjacent directory names
    const full = (base + path).replace(/\/+/g, '/');
    // remove duplicated directory names (naive approach: if base contains same last segment as following)
    // This handles the common 'trial/trial' case:
    const parts = full.split('/').filter(Boolean);
    for (let i = 1; i < parts.length; i++) {
      if (parts[i] === parts[i - 1]) {
        parts.splice(i, 1);
        i--; // recheck
      }
    }
    return '/' + parts.join('/');
  }

  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }

  function isRootPath(path, base) {
    // consider root if path === '/' or '/index.html' or '/index'
    const rel = (path || location.pathname || '').replace(base || '', '') || '/';
    const clean = rel.split('?')[0].split('#')[0];
    return clean === '/' || clean === '/index.html' || clean === '/index';
  }

  /* -------------------------
     Config & environment
     ------------------------- */
  const rawBase = (window.SITE_BASE !== undefined) ? window.SITE_BASE : '';
  const SITE_BASE = normBase(rawBase);
  // default JSON path can be overridden by pages (window.JSON_DATA_PATH)
  const defaultJson = '/data/default.json';
  const jsonRaw = (window.JSON_DATA_PATH !== undefined) ? window.JSON_DATA_PATH : (SITE_BASE + defaultJson);
  const JSON_PATH = normPath(SITE_BASE, jsonRaw);

  const FORCE_LOAD = !!window.FORCE_LOAD_CARDS; // if true, treat any page like home for card injection

  // DOM references
  const mainEl = document.getElementById('main-content') || document.querySelector('main') || document.body;
  const searchResultsEl = document.getElementById('search-results');
  const searchInputEl = document.getElementById('header-search-input');

  // product DB for search suggestions
  let productDatabase = [];

  /* -------------------------
     Search handling
     ------------------------- */
  function showSearchResults(items) {
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

  function searchQuery(q) {
    q = (q || '').toString().trim().toLowerCase();
    if (!q) {
      if (searchResultsEl) searchResultsEl.style.display = 'none';
      return;
    }
    const matches = [];
    const seen = new Set();
    for (let i = 0; i < productDatabase.length && matches.length < 12; i++) {
      const p = productDatabase[i];
      const title = (p.title || '').toString().toLowerCase();
      const author = (p.author || '').toString().toLowerCase();
      const seller = (p.seller || '').toString().toLowerCase();
      if (title.includes(q) || author.includes(q) || seller.includes(q)) {
        const key = (p.link || p.title || i).toString();
        if (!seen.has(key)) {
          seen.add(key);
          matches.push(p);
        }
      }
    }
    showSearchResults(matches);
  }

  // listen to header dispatch (header includes dispatching app:search when input changes)
  document.addEventListener('app:search', (ev) => {
    const q = ev && ev.detail ? ev.detail : '';
    searchQuery(q);
  });

  // also fallback to direct input events if header not using app:search
  if (searchInputEl) {
    searchInputEl.addEventListener('input', (e) => {
      const v = e.target.value || '';
      // dispatch event for unify
      const ev = new CustomEvent('app:search', { detail: v });
      document.dispatchEvent(ev);
    });
  }

  /* click outside -> hide search results */
  document.addEventListener('click', (ev) => {
    if (!searchResultsEl) return;
    if (!searchResultsEl.contains(ev.target) && !searchInputEl.contains(ev.target)) {
      searchResultsEl.style.display = 'none';
    }
  });

  /* -------------------------
     Fetch JSON + prepare productDatabase
     ------------------------- */
  async function fetchJson(path) {
    try {
      const resp = await fetch(path, { cache: 'no-store' });
      if (!resp.ok) {
        console.warn('JSON fetch failed', path, resp.status);
        return [];
      }
      const json = await resp.json();
      if (!Array.isArray(json)) {
        console.warn('JSON is not an array', path);
        return [];
      }
      return json;
    } catch (err) {
      console.error('fetchJson error', err, path);
      return [];
    }
  }

  function normalizeProducts(list) {
    // ensure fields exist and create minimal normalized product objects
    const out = [];
    const seen = new Set();
    for (const it of list) {
      const link = (it.link || it.url || '').toString();
      const key = link || (it.title || '').toString().slice(0, 80);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        title: it.title || '',
        author: it.author || '',
        seller: it.seller || (it.brand || '') || '',
        img: it.img || (it.image || '') || '',
        desc: it.desc || it.summary || '',
        link: link || '#',
        category: (it.category || it.cat || it.group || 'others').toString().toLowerCase(),
        best_seller: !!it.best_seller
      });
    }
    return out;
  }

  /* -------------------------
     Card building and sections
     ------------------------- */
  function makeCard(product) {
    const c = el('div', 'card');
    const wrap = el('div', 'img-wrap');
    const img = el('img'); img.src = product.img || ''; img.alt = product.title || '';
    wrap.appendChild(img);
    c.appendChild(wrap);

    const title = el('div', 'title', product.title || '');
    c.appendChild(title);

    const meta = el('div', 'meta', ((product.author ? 'লেখক: ' + product.author : '') + (product.seller ? ' • বিক্রেতা: ' + product.seller : '')).trim());
    c.appendChild(meta);

    const desc = el('div', 'desc', product.desc || '');
    c.appendChild(desc);

    const cta = el('div', 'cta-row');
    const offer = el('div', 'offer-text', 'ডিসকাউন্ট পেতে এখানে কিনুন');
    const buy = el('a', 'buy-btn', 'Buy Now');
    buy.href = product.link || '#';
    buy.target = '_blank';
    cta.appendChild(offer);
    cta.appendChild(buy);
    c.appendChild(cta);

    return c;
  }

  function makeSeeMoreButton(name, href) {
    const s = el('div', 'see-more');
    s.innerHTML = `<div><button class="see-more-btn">See all ${name}</button></div>`;
    const btn = s.querySelector('.see-more-btn');
    if (href) btn.addEventListener('click', () => { location.href = href; });
    return s;
  }

  function perViewForWidth(w) {
    if (w <= 540) return 1;
    if (w <= 880) return 2;
    if (w <= 1100) return 3;
    return 4;
  }

  function createSection(title, products, options) {
    options = options || {};
    const sec = el('section', 'section');
    const head = el('div', 'section-head');
    head.innerHTML = `<div class="title">${title}</div>`;
    sec.appendChild(head);

    const rowWrap = el('div', 'row-wrap');
    const row = el('div', 'card-row');
    row.style.transition = 'transform .45s cubic-bezier(.22,.9,.18,1)';
    rowWrap.appendChild(row);
    sec.appendChild(rowWrap);

    // populate cards
    products.forEach(p => row.appendChild(makeCard(p)));

    // see more placeholder (half-card)
    const seeMore = makeSeeMoreButton(title, options.moreHref || '#');
    row.appendChild(seeMore);

    // arrows
    const left = el('button', 'carousel-arrow prev', '<i class="fas fa-chevron-left"></i>');
    const right = el('button', 'carousel-arrow next', '<i class="fas fa-chevron-right"></i>');
    left.style.left = '6px'; left.style.right = 'auto'; left.style.display = 'none';
    sec.appendChild(left); sec.appendChild(right);

    // carousel state
    let perView = perViewForWidth(window.innerWidth);
    let idx = 0; // index of first visible card

    function updatePerView() {
      perView = perViewForWidth(window.innerWidth);
      // clamp idx
      if (idx > Math.max(0, products.length - perView)) {
        idx = Math.max(0, products.length - perView);
      }
      repaint();
    }

    function repaint() {
      // compute card width including gap (assume first child width)
      const child = row.children[0];
      if (!child) return;
      const style = getComputedStyle(child);
      const gap = 18; // matches CSS gap used
      const cardW = child.getBoundingClientRect().width + gap;
      row.style.transform = `translateX(-${idx * cardW}px)`;
      // arrow visibility
      left.style.display = idx <= 0 ? 'none' : '';
      // right arrow hidden when we've reached or exceeded last-full-screen (allow see-more)
      if (idx + perView >= products.length) {
        right.style.display = 'none';
      } else {
        right.style.display = '';
      }
    }

    left.addEventListener('click', () => {
      idx = Math.max(0, idx - perView);
      repaint();
    });
    right.addEventListener('click', () => {
      idx = Math.min(products.length, idx + perView);
      repaint();
    });

    window.addEventListener('resize', () => {
      updatePerView();
    });

    // initial paint after images load (slight delay)
    setTimeout(() => {
      updatePerView();
      repaint();
    }, 120);

    return sec;
  }

  /* -------------------------
     Render home (only if root or force)
     ------------------------- */
  async function renderHomeSections(jsonList) {
    // normalize and group by category
    const normalized = normalizeProducts(jsonList);
    // fill global productDatabase for search dedupe
    productDatabase = normalized.slice(); // it's already deduped by normalizeProducts

    const groups = {};
    normalized.forEach(it => {
      const cat = (it.category || 'others').toString().toLowerCase();
      groups[cat] = groups[cat] || [];
      groups[cat].push(it);
    });

    // create 'best seller' from flagged or first items
    let best = normalized.filter(x => x.best_seller).slice(0, 8);
    if (best.length < 6) {
      best = normalized.slice(0, 8);
    }

    // Only inject sections if allowed (is root or forced)
    const path = location.pathname || '/';
    const isRoot = isRootPath(path, SITE_BASE);
    if (!isRoot && !FORCE_LOAD) return;

    // Clear main content to show homepage layout (Option A: as requested)
    if (mainEl) {
      mainEl.innerHTML = '';
    }

    // Site title + subtitle
    const titleWrap = el('div', 'site-title', '<h1>Rokomari Promo Code</h1><p style="color:#666;margin-top:6px">হোম পেজে বিভিন্ন ক্যাটাগরি দেখানো হবে — সার্চ ও মোবাইল মেনু ব্যবহার করে ব্রাউজ করুন।</p>');
    mainEl.appendChild(titleWrap);

    // Best seller
    if (best && best.length) {
      const secBest = createSection('Best Seller', best, { moreHref: SITE_BASE + '/best-seller/' });
      mainEl.appendChild(secBest);
    }

    // desired order
    const order = ['books', 'electronics', 'foods', 'furniture', 'beauty', 'others'];
    order.forEach(cat => {
      const list = (groups[cat] || []).slice(0, 12);
      if (list.length) {
        const pretty = 'Rokomari PromoCode For ' + (cat.charAt(0).toUpperCase() + cat.slice(1));
        const sec = createSection(pretty, list, { moreHref: SITE_BASE + '/' + cat + '/' });
        mainEl.appendChild(sec);
      }
    });
  }

  /* -------------------------
     Initialization flow
     ------------------------- */
  (async function init() {
    // Fetch default JSON (will set productDatabase for search), but don't crash site on 404
    const attemptedPath = JSON_PATH;
    let jsonList = [];
    try {
      jsonList = await fetchJson(attemptedPath);
      if (!Array.isArray(jsonList)) jsonList = [];
    } catch (err) {
      jsonList = [];
    }

    // If fetch returned empty and the path looked like '/trial/trial/...' try a second normalized attempt:
    if ((!jsonList || jsonList.length === 0) && attemptedPath) {
      // try to recover: remove duplicated segments if any
      const alt = attemptedPath.replace(/\/([^\/]+)\/\1\//, '/$1/'); // simple replace trial/trial
      if (alt !== attemptedPath) {
        const altList = await fetchJson(alt);
        if (Array.isArray(altList) && altList.length) {
          jsonList = altList;
          console.info('Recovered JSON from alt path', alt);
        }
      }
    }

    // populate productDatabase even if not injecting home (so search works on other pages)
    productDatabase = normalizeProducts(jsonList);

    // render home sections only on root (or when forced)
    await renderHomeSections(jsonList);

    // good to go
    console.info('app.js initialized. SITE_BASE=', SITE_BASE, 'JSON_PATH=', JSON_PATH);
  })();

})();