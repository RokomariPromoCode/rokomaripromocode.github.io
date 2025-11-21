/* assets/app.js - minimal cards + search renderer */
(function(){
  const SITE_BASE = window.SITE_BASE || "";
  const JSON_PATH = window.JSON_DATA_PATH || (SITE_BASE ? (SITE_BASE + "/data/default.json") : "/data/default.json");
  const main = document.getElementById('main-content');

  // categories to show on home - order matters
  const HOME_CATEGORIES = ['best_seller','books','electronics','foods','furniture','beauty','others'];

  // For search suggestions
  let productDatabase = [];

  // determine if we are home (root) - allow override
  function getRelPath(){
    let p = location.pathname || "/";
    if (SITE_BASE && p.indexOf(SITE_BASE) === 0) p = p.slice(SITE_BASE.length);
    return p || "/";
  }
  const relPath = getRelPath();
  const isHome = (relPath === '/' || relPath === '/index.html' || relPath === '/index' || typeof window.FORCE_LOAD_CARDS !== 'undefined');

  // small element helper
  function el(tag, cls, html){
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }

  // show search results dropdown (header includes this element)
  const searchResultsEl = document.getElementById('header-search-results');
  function showSearchList(items){
    if (!searchResultsEl) return;
    searchResultsEl.innerHTML = '';
    if (!items || items.length === 0) { searchResultsEl.style.display = 'none'; return; }
    items.forEach(it => {
      const a = el('a','result-item');
      a.href = it.link || '#';
      a.innerHTML = `<img src="${it.img||''}" alt=""><div><h4>${it.title}</h4><p>${it.author||''}</p></div>`;
      searchResultsEl.appendChild(a);
    });
    searchResultsEl.style.display = 'block';
  }

  // search query handler (called by header)
  function handleSearchQuery(q){
    if (!q) { showSearchList([]); return; }
    q = q.toLowerCase();
    const matches = productDatabase.filter(p =>
      (p.title||'').toLowerCase().includes(q) ||
      (p.author||'').toLowerCase().includes(q) ||
      (p.seller||'').toLowerCase().includes(q)
    );
    // dedupe by link
    const seen = new Set();
    const unique = [];
    for (const m of matches) {
      if (!m.link) continue;
      if (seen.has(m.link)) continue;
      seen.add(m.link);
      unique.push(m);
      if (unique.length >= 10) break;
    }
    showSearchList(unique);
  }

  document.addEventListener('app:search', function(e){
    handleSearchQuery(String((e && e.detail) || ''));
  });

  // fetch JSON
  async function fetchJson(){
    try {
      const r = await fetch(JSON_PATH, {cache:'no-store'});
      if (!r.ok) throw new Error('fetch failed ' + r.status);
      const data = await r.json();
      return data;
    } catch(err){
      console.warn('app.js fetchJson failed for', JSON_PATH, err);
      return null;
    }
  }

  // Build product database flatten from JSON structure
  function buildFlatDatabase(data){
    productDatabase = [];
    if(!data || !Array.isArray(data.products)) return;
    data.products.forEach(item => {
      // item expected: { title, author, seller, img, desc, link, category }
      productDatabase.push({
        title: item.title || '',
        author: item.author || '',
        seller: item.seller || '',
        img: item.img || '',
        link: item.link || '#',
        category: item.category || ''
      });
    });
  }

  // Render a section with horizontal cards
  function renderSection(title, items){
    const section = el('section','section');
    const head = el('div','section-head');
    head.innerHTML = `<div class="title">Rokomari PromoCode For ${title}</div>`;
    section.appendChild(head);

    const rowWrap = el('div','card-row');
    // container for cards
    items.forEach(it => {
      const card = el('article','card');
      const imgWrap = el('div','img-wrap');
      const img = document.createElement('img');
      img.src = it.img || '/assets/images/logo.png';
      img.alt = it.title || '';
      imgWrap.appendChild(img);
      card.appendChild(imgWrap);

      const t = el('div','title', it.title || '');
      card.appendChild(t);
      const meta = el('div','meta', (it.seller ? 'বিক্রেতা: ' + it.seller : '') + (it.author ? ' • লেখক: ' + it.author : ''));
      card.appendChild(meta);
      const desc = el('div','desc', it.desc ? it.desc : '');
      card.appendChild(desc);

      const cta = el('div','cta-row');
      const offer = el('div','offer-text','ডিসকাউন্ট পেতে এখানে কিনুন');
      const buy = el('a','buy-btn','Buy Now');
      buy.href = it.link || '#';
      cta.appendChild(offer);
      cta.appendChild(buy);
      card.appendChild(cta);

      rowWrap.appendChild(card);
    });

    // Add "see more" half-card if more items follow on this category
    const placeholder = el('div','see-more');
    placeholder.innerHTML = `<div><strong>আরও দেখুন</strong><br><a class="buy-btn" href="/${title.toLowerCase()}/">See all ${title}</a></div>`;
    rowWrap.appendChild(placeholder);

    section.appendChild(rowWrap);
    return section;
  }

  // Render all home sections
  function renderHomeSections(data){
    if (!main) return;
    // create wrapper to add above the footer (so user content remains where they put it)
    const container = el('div','home-sections');
    const grouped = {};
    (data.products || []).forEach(p => {
      const cat = (p.category || 'others').toLowerCase();
      grouped[cat] = grouped[cat] || [];
      grouped[cat].push(p);
    });

    // for each category in HOME_CATEGORIES show up to 8 items (4 visible + next)
    HOME_CATEGORIES.forEach(catKey => {
      const items = grouped[catKey] || [];
      if (items.length === 0) return;
      // keep item fields minimal
      const processed = items.map(i => ({
        title: i.title,
        author: i.author,
        seller: i.seller,
        img: i.img,
        desc: i.desc,
        link: i.link,
        category: i.category
      }));
      const sectionEl = renderSection(catKey.charAt(0).toUpperCase() + catKey.slice(1), processed.slice(0, 8));
      container.appendChild(sectionEl);
    });

    // insert container BEFORE footer (main-content is page content; append container at the end of main-content)
    main.appendChild(container);
  }

  // main init
  (async function init(){
    const data = await fetchJson();
    if (!data) {
      // fallback minimal demo
      const fallback = {
        products: [
          { title: "ডেমো বই - লেখক", author:"লেখক নাম", seller:"Rokomari", img:"/assets/images/logo.png", desc:"ডেমো বর্ণনা", link:"#", category:"books" },
          { title: "ডেমো প্রোডাক্ট", author:"", seller:"Ghorer Bazar", img:"/assets/images/logo.png", desc:"ডেমো", link:"#", category:"others" }
        ]
      };
      buildFlatDatabase(fallback);
      if (isHome) renderHomeSections(fallback);
      return;
    }
    buildFlatDatabase(data);
    if (isHome) renderHomeSections(data);
  })();

})();
