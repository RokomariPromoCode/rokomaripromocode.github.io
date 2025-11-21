/* assets/app.js */
(function(){
  // safe SITE_BASE & JSON path (if page set window.JSON_DATA_PATH earlier it will be used)
  const SITE_BASE = (window.SITE_BASE || "").toString().trim().replace(/\/$/, "");
  const DEFAULT_JSON = SITE_BASE ? (SITE_BASE + "/data/default.json") : "/data/default.json";
  const jsonPath = (typeof window.JSON_DATA_PATH === "string" && window.JSON_DATA_PATH.trim()) ? window.JSON_DATA_PATH.trim() : DEFAULT_JSON;

  // minimal helpers
  function el(tag, cls, html){
    const e = document.createElement(tag);
    if(cls) e.className = cls;
    if(html !== undefined) e.innerHTML = html;
    return e;
  }
  function safeImage(url){
    if(!url) return (SITE_BASE ? SITE_BASE + "/assets/images/no-image.png" : "/assets/images/no-image.png");
    return url;
  }

  // search handling (listens to header event 'app:search')
  const searchResultsBox = document.getElementById('header-search-results');
  let productDatabase = window.HEADER_PRODUCT_DB || []; // built by header if any
  // app can fetch JSON and flatten product list
  async function loadJsonToDB(path){
    try{
      const res = await fetch(path, {cache:'no-store'});
      if(!res.ok) throw new Error('fetch failed');
      const data = await res.json();
      // expected format: object with categories arrays or flat array
      // flatten: if data is array -> use it; if object -> gather all values arrays
      let items = [];
      if(Array.isArray(data)){
        items = data;
      } else {
        // gather arrays within object
        Object.values(data).forEach(v => {
          if(Array.isArray(v)) items = items.concat(v);
        });
      }
      // normalize and push to productDatabase
      items.forEach(it => {
        productDatabase.push({
          title: it.title || it.name || '',
          author: it.author || it.writer || '',
          seller: it.seller || it.brand || '',
          img: it.img || it.image || '',
          link: it.link || it.href || it.url || '#'
        });
      });
      // optional debug: console.log('loaded json products=', productDatabase.length);
    }catch(err){
      // fetch failed — silently continue with whatever DB we have
      console.warn('loader fetchJson error for', path, err);
    }
  }

  // search: receives string q, shows up to 8 unique results
  function doSearch(q){
    q = (q||'').toString().trim().toLowerCase();
    if(!q){
      if(searchResultsBox) searchResultsBox.style.display = 'none';
      return;
    }
    // ensure DB loaded (if not loaded yet, lazy load)
    if(productDatabase.length < 1 && !window._APP_JSON_LOADED){
      window._APP_JSON_LOADED = true;
      loadJsonToDB(jsonPath);
    }
    const matches = [];
    const seen = new Set();
    for(const p of productDatabase){
      const title = (p.title||'').toLowerCase();
      const author = (p.author||'').toLowerCase();
      const seller = (p.seller||'').toLowerCase();
      if(title.includes(q) || author.includes(q) || seller.includes(q)){
        const key = p.link || p.title;
        if(!seen.has(key)){
          seen.add(key); matches.push(p);
        }
        if(matches.length >= 10) break;
      }
    }
    // render
    if(!searchResultsBox) return;
    searchResultsBox.innerHTML = '';
    if(matches.length === 0){
      searchResultsBox.style.display = 'none';
      return;
    }
    matches.forEach(m => {
      const a = el('a','result-item');
      a.href = m.link || '#';
      a.innerHTML = `<img src="${safeImage(m.img)}" alt=""><div class="result-info"><h4>${(m.title||'').slice(0,70)}</h4><p>${m.author||''}</p></div>`;
      searchResultsBox.appendChild(a);
    });
    searchResultsBox.style.display = 'block';
  }

  // listen for header search event
  document.addEventListener('app:search', function(ev){
    const q = ev && ev.detail ? ev.detail : '';
    doSearch(q);
  });

  // Hide search dropdown when click outside
  document.addEventListener('click', function(ev){
    const sr = document.getElementById('header-search-results');
    const si = document.getElementById('header-search-input');
    if(!sr) return;
    if(!sr.contains(ev.target) && si && !si.contains(ev.target)){
      sr.style.display = 'none';
    }
  });

  // Home page card loader: only if path is root or index (so other pages not auto-load cards)
  const pathname = location.pathname.replace(SITE_BASE,'') || '/';
  const isHome = (pathname === '/' || pathname === '/index.html' || pathname === '/index' || typeof window.FORCE_LOAD_CARDS !== 'undefined' && window.FORCE_LOAD_CARDS);

  async function loadAndRenderHome(){
    // fetch jsonPath and render sections (simplified)
    try{
      const res = await fetch(jsonPath, {cache:'no-store'});
      if(!res.ok) throw new Error('fetch failed');
      const data = await res.json();
      // data may be array or object; if object we expect keys = categories
      const categories = {};
      if(Array.isArray(data)){
        // default category list
        categories['others'] = data;
      } else {
        Object.entries(data).forEach(([k,v])=>{
          if(Array.isArray(v)) categories[k] = v;
        });
      }
      // render sections inside #main-content at top
      const container = document.getElementById('main-content');
      if(!container) return;
      // create a section wrapper element
      const wrapper = el('div','home-sections');
      // choose order
      const order = ['best_seller','books','electronics','foods','furniture','beauty','others'];
      order.forEach(catKey=>{
        const items = categories[catKey] || [];
        if(items.length === 0) return;
        const sec = el('section','section');
        const head = el('div','section-head', `<div class="title">Rokomari PromoCode For ${catKey.replace(/_/g,' ')}</div>`);
        sec.appendChild(head);
        const row = el('div','card-row');
        // render up to 8 items
        items.slice(0,8).forEach(it=>{
          const card = el('article','card');
          const imgWrap = el('div','img-wrap');
          const img = el('img');
          img.src = it.img || safeImage(it.img);
          img.alt = it.title || '';
          img.style.maxWidth = '100%'; img.style.maxHeight = '100%'; img.style.objectFit = 'contain';
          imgWrap.appendChild(img);
          card.appendChild(imgWrap);
          card.appendChild(el('div','title', `<div>${it.title || ''}</div>`));
          card.appendChild(el('div','meta', `${it.author ? 'লেখক: ' + it.author : ''}`));
          card.appendChild(el('div','desc', (it.desc||'').slice(0,220)));
          const cta = el('div','cta-row');
          cta.innerHTML = `<div class="offer-text">ডিসকাউন্ট পেতে এখানে ক্লিক করুন</div><a class="buy-btn" href="${it.link||'#'}" target="_blank">Buy Now</a>`;
          card.appendChild(cta);
          row.appendChild(card);
        });
        head.appendChild(el('div','carousel-arrow','<i class="fas fa-chevron-right"></i>'));
        sec.appendChild(row);
        wrapper.appendChild(sec);
      });
      // Insert wrapper BEFORE existing content (so your markdown remains in the middle)
      container.insertBefore(wrapper, container.firstChild);
    }catch(err){
      console.warn('home loader failed', err);
    }
  }

  if(isHome) {
    loadAndRenderHome();
    // also preload DB for search
    loadJsonToDB(jsonPath);
  } else {
    // for non-home pages, still load small DB if HEADER_PRODUCT_DB empty
    if((window.HEADER_PRODUCT_DB || []).length < 1) loadJsonToDB(jsonPath);
  }

})();
