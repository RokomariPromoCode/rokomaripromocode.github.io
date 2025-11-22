/* assets/app.js - category-safe, skeletons, random (except best-seller), desktop/mobile limits */
(function(){
  'use strict';

  // runtime SITE_BASE from layout (layout should set window.SITE_BASE). fallback to '/trial' for dev.
  const SITE_BASE = (typeof window !== 'undefined' && window.SITE_BASE) ? window.SITE_BASE : (typeof __SITE_BASE__ !== 'undefined' ? __SITE_BASE__ : '/trial');

  const qs = (s,p=document)=>p.querySelector(s);
  const qsa = (s,p=document)=>Array.from((p||document).querySelectorAll(s));

  function resolveUrl(u){
    if(!u) return u;
    u = String(u).trim();
    if(/^https?:\/\//i.test(u)) return u;
    if(!u.startsWith('/')) u = '/' + u;
    if(!SITE_BASE) return u;
    return (SITE_BASE + u).replace(/\/{2,}/g,'/');
  }

  async function fetchJson(path){
    try {
      const url = resolveUrl(path);
      const res = await fetch(url, {cache:'no-store'});
      if(!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } catch(err){
      console.warn('fetchJson', err, path);
      return [];
    }
  }

  function escapeHtml(str){ return String(str||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function safe(x){ return x==null ? '' : x; }
  function cleanDesc(s){
    if(!s) return '';
    let t = String(s).replace(/<\s*br\s*\/?>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
    return t;
  }

  function normalize(arr){
    if(!Array.isArray(arr)) return [];
    return arr.map(it=>({
      title: String(it.title || '').trim(),
      author: String(it.author || it.writer || '').trim(),
      seller: String(it.seller || '').trim(),
      img: String(it.img || it.image || '').trim(),
      desc: cleanDesc(it.desc || it.description || ''),
      link: String(it.link || it.url || '#').trim()
    }));
  }

  // Create a single card element formatted for category pages (no price shown)
  function createCard(item){
    const title = safe(item.title);
    const author = safe(item.author || '');
    const seller = safe(item.seller || '');
    const desc = safe(item.desc || '');
    const img = safe(item.img);
    const link = safe(item.link || '#');

    const article = document.createElement('article');
    article.className = 'card category-card';
    article.innerHTML = `
      <div class="card-media">
        ${ img ? `<img src="${escapeHtml(img)}" alt="${escapeHtml(title)}" loading="lazy">` : '<div class="no-image">No image</div>' }
      </div>
      <div class="card-body">
        <h4 class="card-title">${escapeHtml(title)}</h4>
        <div class="card-meta">${author ? 'লেখক: '+escapeHtml(author) : ''} ${seller ? ' • বিক্রেতা: '+escapeHtml(seller) : ''}</div>
        <p class="card-desc">${escapeHtml(desc)}</p>
        <div class="card-bottom">
          <div class="discount-text">ডিসকাউন্ট পেতে এখানে কিনুন</div>
          <a class="btn-buy" href="${escapeHtml(link)}" target="_blank" rel="noopener">Buy Now</a>
        </div>
      </div>
    `;
    return article;
  }

  // Home behavior (unchanged) - we keep existing renderHome but ensure it still works
  function injectPageTitle(){
    if(qs('.page-title')) return;
    const headerNode = qs('.modern-header');
    const el = document.createElement('div');
    el.className = 'page-title';
    el.innerHTML = `<h1>Rokomari Promo Code</h1>`;
    if(headerNode && headerNode.parentNode) headerNode.parentNode.insertBefore(el, headerNode.nextSibling);
    else document.body.insertBefore(el, document.body.firstChild);
  }

  async function renderHome(){
    // keep home injection behavior intact (this mirrors original logic but scoped)
    injectPageTitle();

    const root = document.createElement('div'); root.className = 'home-cats container';
    const cats = [
      { key:'best-seller', name:'Best Seller', file:'/data/best_seller.json', href:'/best-seller/' },
      { key:'books', name:'Books', file:'/data/books.json', href:'/books/' },
      { key:'electronics', name:'Electronics', file:'/data/electronics.json', href:'/electronics/' },
      { key:'foods', name:'Foods', file:'/data/foods.json', href:'/foods/' },
      { key:'furniture', name:'Furniture', file:'/data/furnitures.json', href:'/furniture/' },
      { key:'beauty', name:'Beauty', file:'/data/beauty.json', href:'/beauty/' },
      { key:'others', name:'Others', file:'/data/others.json', href:'/others/' }
    ];

    for(const c of cats){
      const section = document.createElement('section');
      section.className='cat-row';
      section.dataset.key=c.key;
      section.dataset.name=c.name;

      const header = document.createElement('div'); header.className='cat-header';
      const nameText = `Rokomari Promocode For ${c.name}`;
      const titleEl = document.createElement('h3'); titleEl.innerHTML = `<span class="cat-name">${escapeHtml(nameText)}</span>`;
      header.appendChild(titleEl);

      const actions = document.createElement('div'); actions.className='cat-actions';
      const prev = document.createElement('button'); prev.className='cat-btn prev'; prev.innerHTML='&#x25C0;';
      const next = document.createElement('button'); next.className='cat-btn next'; next.innerHTML='&#x25B6;';
      actions.appendChild(prev); actions.appendChild(next);
      header.appendChild(actions);
      section.appendChild(header);

      const wrapper = document.createElement('div'); wrapper.className='cat-track-wrapper';
      const track = document.createElement('div'); track.className='cat-track';
      wrapper.appendChild(track);
      section.appendChild(wrapper);
      root.appendChild(section);

      (async function load(catDef, sec){
        const raw = await fetchJson(catDef.file);
        let items = normalize(raw);
        // For home carousels: show up to 8 items; randomize order except best-seller
        if(catDef.key !== 'best-seller') {
          items = shuffle(items);
        }
        sec._items = items.slice(0, 8); // max 8 on home
        sec._track = track;
        sec._tx = 0;
        sec._loadedCount = 0;

        const batch = Math.max(1, 4);
        let idx = 0;
        const total = sec._items.length;
        const first = Math.min(batch, total - idx);
        appendItemsToTrack(sec, idx, first);
        idx += first;
        sec._loadedCount = idx;

        next.addEventListener('click', ()=> onNextClick(sec, catDef));
        prev.addEventListener('click', ()=> slideCategory(sec, -1));
        enableSwipe(wrapper, sec);

        sec._nextIndex = idx;
        sec._batchSize = batch;
        setTimeout(()=>updateButtonsVisibility(sec), 160);
      })(c, section);
    }

    const headerNode = qs('.modern-header');
    if(headerNode && headerNode.parentNode) headerNode.parentNode.insertBefore(root, headerNode.nextSibling?.nextSibling || headerNode.nextSibling);
    else document.body.insertBefore(root, document.body.firstChild);
  }

  function appendItemsToTrack(section, startIndex, count){
    const track = section._track;
    const items = section._items || [];
    const slice = items.slice(startIndex, startIndex + count);
    slice.forEach((it, idx)=>{
      const wrap = document.createElement('div'); wrap.className='cat-item';
      const card = createCard(it);
      card.style.animationDelay = String((startIndex + idx) * 40) + 'ms';
      wrap.appendChild(card); track.appendChild(wrap);
    });
    section._loadedCount = (section._loadedCount || 0) + slice.length;
    if(section._loadedCount >= (section._items || []).length){
      addSeeMoreCard(section);
    }
    setTimeout(()=>updateButtonsVisibility(section), 120);
  }

  function addSeeMoreCard(section){
    if(!section || !section._track) return;
    if(section._track.querySelector('.cat-item.see-more')) return;
    const wrap = document.createElement('div'); wrap.className='cat-item see-more';
    const link = `/${section.dataset.key}/`;
    const readable = section.dataset.name || section.dataset.key || 'আরও দেখুন';
    const inner = document.createElement('div');
    inner.className='see-more-card';
    inner.innerHTML = `<div>আরও দেখুন — ${escapeHtml(readable)}</div><a href="${resolveUrl(link)}">See all ${escapeHtml(readable)}</a>`;
    wrap.appendChild(inner);
    section._track.appendChild(wrap);
  }

  function onNextClick(section, catDef){
    const items = section._items || [];
    if(!items.length) return;
    const nextIdx = section._nextIndex || section._loadedCount || 0;
    if(nextIdx < items.length){
      const toAdd = Math.min(section._batchSize || 4, items.length - nextIdx);
      appendItemsToTrack(section, nextIdx, toAdd);
      section._nextIndex = nextIdx + toAdd;
      setTimeout(()=> slideCategory(section, +1), 80);
      return;
    }
    slideCategory(section, +1);
  }

  // carousel helpers (home)
  function getItemFullWidth(track){ const gap = parseFloat(getComputedStyle(track).gap || 16); const first = track.children[0]; if(!first) return 300 + gap; const w = first.getBoundingClientRect().width; return w + gap; }
  function getVisibleWidth(track){ const wrapper = track.parentElement; return wrapper.getBoundingClientRect().width; }
  function computeVisibleCount(){ const w = Math.max(window.innerWidth || 1024, 320); if(w < 600) return 1; if(w < 880) return 2; if(w < 1100) return 3; return 4; }
  function updateButtonsVisibility(section){ if(!section || !section._track) return; const track = section._track; const items = Array.from(track.children); if(!items.length) return; const itemW = getItemFullWidth(track); const totalWidth = items.length * itemW; const visWidth = getVisibleWidth(track); const prevBtn = section.querySelector('.cat-btn.prev'); const nextBtn = section.querySelector('.cat-btn.next'); const curTx = track._tx || 0; const maxLeft = Math.max(0, totalWidth - visWidth); if(prevBtn) prevBtn.style.display = (Math.abs(curTx) > 0) ? 'flex' : 'none'; if(nextBtn) nextBtn.style.display = (totalWidth > visWidth && Math.abs(curTx) < maxLeft) ? 'flex' : 'none'; }
  function slideCategory(section, direction){ const track = section._track; if(!track) return; const items = Array.from(track.children); if(!items.length) return; const itemW = getItemFullWidth(track); const visible = computeVisibleCount(); const totalWidth = items.length * itemW; const visibleWidth = visible * itemW; const maxLeft = Math.max(0, totalWidth - visibleWidth); const curTx = track._tx || 0; const moveBy = itemW * Math.max(1, visible); let newTx = curTx - direction * moveBy; if(Math.abs(newTx) > maxLeft) newTx = -maxLeft; if(newTx > 0) newTx = 0; track.style.transform = `translateX(${newTx}px)`; track._tx = newTx; updateButtonsVisibility(section); }
  function enableSwipe(wrapper, section){ let startX=0, curX=0, isDown=false; wrapper.addEventListener('touchstart', e=>{ startX = e.touches[0].clientX; isDown=true; }); wrapper.addEventListener('touchmove', e=>{ if(!isDown) return; curX = e.touches[0].clientX; const dx = curX - startX; section._track.style.transform = `translateX(${(section._track._tx || 0) + dx}px)`; }); wrapper.addEventListener('touchend', e=>{ if(!isDown) return; isDown=false; const dx = curX - startX; if(Math.abs(dx) > 40){ slideCategory(section, dx < 0 ? +1 : -1); } else { section._track.style.transform = `translateX(${section._track._tx || 0}px)`; } startX=curX=0; }); wrapper.addEventListener('mouseleave', ()=>{ if(isDown){ isDown=false; section._track.style.transform = `translateX(${section._track._tx || 0}px)`; }}); }

  // shuffle helper (Fisher-Yates)
  function shuffle(arr){
    const a = arr.slice();
    for(let i=a.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      [a[i],a[j]] = [a[j],a[i]];
    }
    return a;
  }

  // Category page renderer: grid with limits, skeletons, see more
  async function renderCategoryGrid(mainEl){
    const dataSrc = mainEl?.dataset?.src || null;
    if(!dataSrc && !(Array.isArray(window.rokomariData) && window.rokomariData.length) && !(window.FORCE_LOAD_CARDS && typeof window.JSON_DATA_PATH === 'string' && window.JSON_DATA_PATH)){
      return;
    }

    let raw = [];
    if(Array.isArray(window.rokomariData) && window.rokomariData.length) raw = window.rokomariData;
    else if(dataSrc) raw = await fetchJson(dataSrc);
    else if(window.FORCE_LOAD_CARDS && typeof window.JSON_DATA_PATH === 'string' && window.JSON_DATA_PATH) raw = await fetchJson(window.JSON_DATA_PATH);
    else raw = [];

    let all = normalize(raw);
    // preserve order for best-seller (if the JSON path/name suggests best_seller)
    const pathLower = String(dataSrc || '').toLowerCase();
    if(!/best[_-]?seller/.test(pathLower)){
      all = shuffle(all);
    }

    window._all_index = all;

    // build container
    let container = qs('#cardsArea', mainEl);
    if(!container){
      container = document.createElement('div');
      container.id = 'cardsArea';
      container.className = 'cards-area category-cards';
      mainEl.appendChild(container);
    } else {
      container.classList.add('category-cards');
      container.innerHTML = ''; // ensure clean
    }

    // skeleton loading placeholder function (create n skeletons)
    function addSkeletons(n){
      for(let i=0;i<n;i++){
        const sk = document.createElement('div');
        sk.className = 'category-skel';
        sk.innerHTML = `
          <div class="sk-media"></div>
          <div class="sk-body">
            <div class="sk-title"></div>
            <div class="sk-desc"></div>
            <div class="sk-bottom">
              <div class="sk-line"></div>
              <div class="sk-btn"></div>
            </div>
          </div>
        `;
        container.appendChild(sk);
      }
    }

    // render logic: mobile 10 initial, desktop 20 initial, batch=10
    const isMobile = (window.innerWidth || document.documentElement.clientWidth) < 600;
    const initial = isMobile ? 10 : 20;
    const batch = 10;
    let shown = 0;

    // show skeletons while first batch loads
    addSkeletons(Math.min(initial, all.length));

    // small helper to replace skeletons with cards
    function renderItems(count){
      // remove skeletons if present
      const sks = container.querySelectorAll('.category-skel');
      if(sks && sks.length) sks.forEach(n=>n.parentNode && n.parentNode.removeChild(n));
      const slice = all.slice(shown, shown + count);
      slice.forEach(it=>{
        const card = createCard(it);
        container.appendChild(card);
      });
      shown += slice.length;
      updateSeeMore();
      // ensure images get "attached" behavior
      attachImageSkeletons();
    }

    function updateSeeMore(){
      let btn = qs('.category-see-more', container);
      if(!btn){
        btn = document.createElement('button');
        btn.className = 'category-see-more';
        btn.textContent = 'See more';
        container.appendChild(btn);
      }
      btn.style.display = (shown < all.length) ? 'block' : 'none';
      btn.onclick = ()=>{ renderItems(batch); };
    }

    // initial load
    setTimeout(()=>{ renderItems(initial); }, 250);
  }

  // attach skeletons for images: replace placeholder when image loads
  function attachImageSkeletons(){
    // create skeletal overlay for each .card img - but only if not attached
    qsa('.card.category-card .card-media img').forEach(img=>{
      if(img.dataset._attached) return;
      img.dataset._attached = 1;
      const parent = img.parentNode;
      // wrap with placeholder if not present
      let sk = parent.querySelector('.img-skel');
      if(!sk){
        sk = document.createElement('div'); sk.className = 'img-skel';
        parent.insertBefore(sk, img);
      }
      img.style.opacity = 0;
      img.addEventListener('load', ()=>{ img.style.transition='opacity .35s'; img.style.opacity = 1; if(sk && sk.parentNode) sk.parentNode.removeChild(sk); });
      img.addEventListener('error', ()=>{ if(sk && sk.parentNode) sk.parentNode.removeChild(sk); img.style.opacity = 1; });
    });
  }

  // keep previous home cat-row update logic alive (updateAllButtons)
  function updateAllButtons(){
    qsa('.cat-row').forEach(section=>{ if(section._track) updateButtonsVisibility(section); });
  }

  // DOM ready handler: prefer data-src element for rendering category grid
  document.addEventListener('DOMContentLoaded', function(){
    // Setup search/menu header (if present) by calling existing setupHeader in original file if available
    try { if(typeof setupHeader === 'function') setupHeader(); } catch(e){ /* ignore */ }

    const path = (location.pathname || '/').replace(/\/$/, '') || '/';
    const base = SITE_BASE || '';
    const isHome = (path === '' || path === base || path === base + '/' || path === '/' || path === '');

    if(isHome){
      if(typeof renderHome === 'function') renderHome();
      return;
    }

    // prefer element in page with data-src
    const pageDataSrc = document.querySelector('[data-src]');
    const mainEl = pageDataSrc || qs('main') || document.body;

    const hasSrc = !!(mainEl && mainEl.dataset && mainEl.dataset.src);
    const hasInMemory = Array.isArray(window.rokomariData) && window.rokomariData.length;
    const hasGlobalJson = (typeof window.JSON_DATA_PATH === 'string' && window.JSON_DATA_PATH);
    const force = !!window.FORCE_LOAD_CARDS;

    if(hasSrc || hasInMemory || (force && hasGlobalJson)){
      // If element has data-src and also has data-cards="true" OR FORCE_LOAD_CARDS is true, render category grid
      if(hasSrc){
        renderCategoryGrid(mainEl);
      } else if(hasInMemory){
        renderCategoryGrid(mainEl);
      } else if(force && hasGlobalJson){
        // set mainEl.dataset.src to global path then render
        mainEl.dataset.src = window.JSON_DATA_PATH;
        renderCategoryGrid(mainEl);
      }
    } else {
      // do nothing; this page intentionally has no cards
    }

    // attach skeleton observer (images may be added later)
    setTimeout(()=>attachImageSkeletons(), 350);
  });

  // expose triggerRequest for header search to use (existing function signature)
  window.triggerRequest = function(searchTerm){
    const searchInput = qs('#header-search-input');
    const resultsContainer = qs('#header-search-results');
    if(resultsContainer) resultsContainer.style.display='none';
    if(searchInput){ searchInput.value=''; searchInput.blur(); }
    const requestArea = qs('#request-area') || qs('#footer') || null;
    const productInput = qs('#product-name');
    if(requestArea){ requestArea.scrollIntoView({behavior:'smooth'}); if(productInput){ productInput.value = searchTerm; setTimeout(()=>productInput.focus(), 600); } }
    else alert('রিকোয়েস্ট ফর্মের জন্য পেজের নিচে যান।');
  };

})();