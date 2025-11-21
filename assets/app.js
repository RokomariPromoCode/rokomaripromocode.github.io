/* assets/app.js - category-safe, skeletons, randomized (except best-seller) */
(function(){
  'use strict';

  // Runtime SITE_BASE (layout sets window.SITE_BASE). Fallback to literal to preserve existing behaviour.
  const SITE_BASE = (typeof window !== 'undefined' && window.SITE_BASE) ? window.SITE_BASE : '/trial';

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
    if(t.length <= 300) return t;
    const cut = t.lastIndexOf(' ', 200) || 200;
    return t.slice(0,cut) + '...';
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

  // Fisher-Yates shuffle
  function shuffleArray(arr){
    const a = arr.slice();
    for(let i=a.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      [a[i],a[j]] = [a[j],a[i]];
    }
    return a;
  }

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
        ${ img ? `<div class="media-wrap"><img src="${escapeHtml(img)}" alt="${escapeHtml(title)}" loading="lazy"></div>` : '<div class="media-wrap no-image">No image</div>' }
      </div>
      <div class="card-body">
        <h4 class="title" title="${escapeHtml(title)}">${escapeHtml(title)}</h4>
        <div class="meta">${author ? 'লেখক: '+escapeHtml(author) : ''}${author && seller ? ' • ' : ''}${seller ? 'বিক্রেতা: '+escapeHtml(seller) : ''}</div>
        <p class="desc">${escapeHtml(desc)}</p>
        <div class="card-bottom">
          <div class="discount-text">ডিসকাউন্ট পেতে এখানে কিনুন</div>
          <a class="btn" href="${escapeHtml(link)}" target="_blank" rel="noopener">Buy Now</a>
        </div>
      </div>
    `;
    return article;
  }

  /* ------------------ header & search (keeps original behaviour) ------------------ */
  function setupHeader(){
    const searchInput = qs('#header-search-input');
    const resultsContainer = qs('#header-search-results');
    const clearBtn = qs('#search-clear');
    const lens = qs('#search-lens');
    const hamburger = qs('.hamburger');
    const menuLinks = qs('.menu-links');

    const categories = [
      {key:'best-seller',label:'Best Seller',href:'/best-seller/'},
      {key:'books',label:'Books',href:'/books/'},
      {key:'electronics',label:'Electronics',href:'/electronics/'},
      {key:'foods',label:'Foods',href:'/foods/'},
      {key:'furniture',label:'Furniture',href:'/furniture/'},
      {key:'beauty',label:'Beauty',href:'/beauty/'},
      {key:'others',label:'Others',href:'/others/'},
    ];

    if(menuLinks){
      menuLinks.innerHTML = '';
      const homeLi = document.createElement('li');
      homeLi.innerHTML = `<a href="${resolveUrl('/')}">Home</a>`;
      menuLinks.appendChild(homeLi);
      categories.forEach(c=>{
        const li = document.createElement('li');
        li.innerHTML = `<a href="${resolveUrl(c.href)}">${escapeHtml(c.label)}</a>`;
        menuLinks.appendChild(li);
      });
    }

    if(hamburger && menuLinks){
      hamburger.addEventListener('click', (e)=>{
        e.stopPropagation();
        menuLinks.classList.toggle('active');
        const icon = hamburger.querySelector('i');
        if(menuLinks.classList.contains('active')){ icon.classList.remove('fa-bars'); icon.classList.add('fa-times'); }
        else { icon.classList.remove('fa-times'); icon.classList.add('fa-bars'); }
      });
      document.addEventListener('click', (e)=>{
        if(menuLinks.classList.contains('active') && !e.target.closest('.menu-links') && !e.target.closest('.hamburger')){
          menuLinks.classList.remove('active');
          const icon = hamburger.querySelector('i');
          if(icon){ icon.classList.remove('fa-times'); icon.classList.add('fa-bars'); }
        }
      });
    }

    // Build a simple search index by merging available data files (non-blocking)
    (async ()=>{
      try {
        const files = ['/data/json_data.json','/data/best_seller.json','/data/books.json','/data/electronics.json','/data/foods.json','/data/furnitures.json','/data/beauty.json','/data/others.json'];
        const fetched = await Promise.all(files.map(f => fetchJson(f)));
        const merged = fetched.flat();
        const normalized = normalize(merged);
        const map = new Map();
        normalized.forEach(item=>{
          const key = (item.link || item.title).toString();
          if(!map.has(key)) map.set(key, item);
        });
        let localIndex = Array.from(map.values());
        let timer;
        if(searchInput){
          searchInput.addEventListener('input', function(){
            clearTimeout(timer);
            const q = this.value.trim();
            if(!q){ if(resultsContainer) resultsContainer.style.display='none'; if(clearBtn) clearBtn.style.display='none'; if(lens) lens.style.display='block'; return; }
            if(clearBtn) clearBtn.style.display='block'; if(lens) lens.style.display='none';
            timer = setTimeout(()=>{
              const matches = localIndex.length ? localIndex.filter(it => (it.title + ' ' + (it.author||'') + ' ' + (it.seller||'')).toLowerCase().includes(q.toLowerCase())) : [];
              const seen = new Set();
              const unique = [];
              matches.forEach(m=>{
                const id = m.link || m.title;
                if(!seen.has(id)){ seen.add(id); unique.push(m); }
              });
              resultsContainer.innerHTML = '';
              if(!unique.length){
                resultsContainer.innerHTML = `<div class="no-result-box" style="padding:16px;text-align:center;color:#6b7280"><p>কোনো প্রোডাক্ট পাওয়া যায়নি!</p><button class="request-btn-small" onclick="triggerRequest('${escapeHtml(q)}')">ডিসকাউন্ট রিকুয়েস্ট পাঠান</button></div>`;
              } else {
                unique.slice(0,10).forEach(m=>{
                  const a = document.createElement('a'); a.className='result-item'; a.href = m.link || '#';
                  const thumb = m.img ? `<img src="${escapeHtml(m.img)}" alt="">` : `<div style="width:64px;height:64px;background:#f4f6f7;border-radius:6px"></div>`;
                  const meta = (m.author || m.seller) ? `<p>${escapeHtml(m.author || '')} ${m.author && m.seller ? ' • ' : ''}${escapeHtml(m.seller||'')}</p>` : '';
                  a.innerHTML = `${thumb}<div class="result-info"><h4>${escapeHtml(m.title)}</h4>${meta}</div>`;
                  a.target = '_blank'; a.rel = 'noopener';
                  resultsContainer.appendChild(a);
                });
              }
              resultsContainer.style.display = 'block';
            }, 160);
          });

          if(clearBtn) clearBtn.addEventListener('click', ()=>{ searchInput.value=''; resultsContainer.style.display='none'; clearBtn.style.display='none'; if(lens) lens.style.display='block'; searchInput.focus(); });
          document.addEventListener('click', (e)=>{ if(!e.target.closest('.search-box') && resultsContainer) resultsContainer.style.display='none'; });
        }
      } catch(e){
        console.warn('search index init failed', e);
      }
    })();
  }

  /* ------------------ Keep home rendering behaviour (unchanged) ------------------ */
  function injectPageTitle(){
    const existing = qs('.page-title');
    if(existing) return;
    const headerNode = qs('.modern-header');
    const el = document.createElement('div');
    el.className = 'page-title';
    el.innerHTML = `<h1>Rokomari Promo Code</h1>`;
    if(headerNode && headerNode.parentNode) headerNode.parentNode.insertBefore(el, headerNode.nextSibling);
    else document.body.insertBefore(el, document.body.firstChild);
  }

  async function renderHome(){
    // NO changes here so home remains exactly as before
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
        // keep best-seller in original order; shuffle others and show up to 8 in slider
        let items = normalize(raw);
        if(!(catDef.key && catDef.key.includes('best'))) items = shuffleArray(items);
        sec._items = items.slice(0,8); // show max 8 in slider
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

  /* Home helpers (unchanged except minor safety) */
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

  function getItemFullWidth(track){
    const gap = parseFloat(getComputedStyle(track).gap || 16);
    const first = track.children[0];
    if(!first) return 300 + gap;
    const w = first.getBoundingClientRect().width;
    return w + gap;
  }

  function getVisibleWidth(track){
    const wrapper = track.parentElement;
    return wrapper.getBoundingClientRect().width;
  }

  function computeVisibleCount(){
    const w = Math.max(window.innerWidth || 1024, 320);
    if (w < 600) return 1;
    if (w < 880) return 2;
    if (w < 1100) return 3;
    return 4;
  }

  function updateButtonsVisibility(section){
    if(!section || !section._track) return;
    const track = section._track;
    const items = Array.from(track.children);
    if(!items.length) return;
    const itemW = getItemFullWidth(track);
    const totalWidth = items.length * itemW;
    const visWidth = getVisibleWidth(track);
    const prevBtn = section.querySelector('.cat-btn.prev');
    const nextBtn = section.querySelector('.cat-btn.next');
    const curTx = track._tx || 0;
    const maxLeft = Math.max(0, totalWidth - visWidth);
    if(prevBtn) prevBtn.style.display = (Math.abs(curTx) > 0) ? 'flex' : 'none';
    if(nextBtn) nextBtn.style.display = (totalWidth > visWidth && Math.abs(curTx) < maxLeft) ? 'flex' : 'none';
  }

  function slideCategory(section, direction){
    const track = section._track;
    if(!track) return;
    const items = Array.from(track.children);
    if(!items.length) return;
    const itemW = getItemFullWidth(track);
    const visible = computeVisibleCount();
    const totalWidth = items.length * itemW;
    const visibleWidth = visible * itemW;
    const maxLeft = Math.max(0, totalWidth - visibleWidth);
    const curTx = track._tx || 0;
    const moveBy = itemW * Math.max(1, visible);
    let newTx = curTx - direction * moveBy;
    if(Math.abs(newTx) > maxLeft) newTx = -maxLeft;
    if(newTx > 0) newTx = 0;
    track.style.transform = `translateX(${newTx}px)`;
    track._tx = newTx;
    updateButtonsVisibility(section);
  }

  function enableSwipe(wrapper, section){
    let startX=0, curX=0, isDown=false;
    wrapper.addEventListener('touchstart', e=>{ startX = e.touches[0].clientX; isDown=true; });
    wrapper.addEventListener('touchmove', e=>{ if(!isDown) return; curX = e.touches[0].clientX; const dx = curX - startX; section._track.style.transform = `translateX(${(section._track._tx || 0) + dx}px)`; });
    wrapper.addEventListener('touchend', e=>{ if(!isDown) return; isDown=false; const dx = curX - startX; if(Math.abs(dx) > 40){ slideCategory(section, dx < 0 ? +1 : -1); } else { section._track.style.transform = `translateX(${section._track._tx || 0}px)`; } startX=curX=0; });
    wrapper.addEventListener('mouseleave', ()=>{ if(isDown){ isDown=false; section._track.style.transform = `translateX(${section._track._tx || 0}px)`; }});
  }

  /* -------------- Category page renderer (grid, uniform cards, see-more batch) -------------- */
  async function renderStandard(mainEl){
    const dataSrc = mainEl?.dataset?.src || null;

    if(!dataSrc && !(Array.isArray(window.rokomariData) && window.rokomariData.length) && !(window.FORCE_LOAD_CARDS && typeof window.JSON_DATA_PATH === 'string' && window.JSON_DATA_PATH)){
      // nothing explicitly requested
      return;
    }

    let raw = [];
    if(Array.isArray(window.rokomariData) && window.rokomariData.length) raw = window.rokomariData;
    else if(dataSrc) raw = await fetchJson(dataSrc);
    else if(window.FORCE_LOAD_CARDS && typeof window.JSON_DATA_PATH === 'string' && window.JSON_DATA_PATH) raw = await fetchJson(window.JSON_DATA_PATH);
    else raw = [];

    let all = normalize(raw);
    // if the JSON filename contains 'best' or '/best_' preserve order, else randomize
    const preserveOrder = String(dataSrc || '').toLowerCase().includes('best') || String(dataSrc || '').toLowerCase().includes('best_seller') || String(dataSrc || '').toLowerCase().includes('best-seller');
    if(!preserveOrder) all = shuffleArray(all);
    window._all_index = all;

    // create container scoped for category pages so we don't affect home styles
    let cards = qs('#cardsArea', mainEl);
    if(!cards){
      cards = document.createElement('div');
      cards.id = 'cardsArea';
      cards.className = 'category-cards';
      mainEl.appendChild(cards);
    } else {
      cards.classList.add('category-cards');
    }

    // determine limits
    const isMobile = (window.innerWidth || document.documentElement.clientWidth) < 600;
    const initialCount = isMobile ? 10 : 20; // initial items shown
    const batchSize = 10; // load 10 more on See more
    let shown = 0;

    // Add skeleton loader area while first images load (skeleton elements will be removed once images load)
    function addSkeletons(count){
      const frag = document.createDocumentFragment();
      for(let i=0;i<count;i++){
        const sk = document.createElement('div');
        sk.className = 'card category-card skeleton';
        sk.innerHTML = `<div class="card-media"><div class="media-wrap sk-media"></div></div><div class="card-body"><div class="sk-line sk-title"></div><div class="sk-line sk-meta"></div><div class="sk-line sk-desc"></div><div class="sk-line sk-bottom"></div></div>`;
        frag.appendChild(sk);
      }
      cards.appendChild(frag);
    }

    function removeSkeletons(){
      cards.querySelectorAll('.skeleton').forEach(n=>n.parentNode && n.parentNode.removeChild(n));
    }

    function renderItems(count){
      // remove skeletons when we actually render data
      removeSkeletons();
      const slice = all.slice(shown, shown + count);
      const frag = document.createDocumentFragment();
      slice.forEach(it => {
        const card = createCard(it);
        frag.appendChild(card);
      });
      cards.appendChild(frag);
      shown += slice.length;
      // attach image skeletons to new images
      attachImageSkeletons();
    }

    // initial render: add visual skeletons, then render items
    addSkeletons(Math.min(6, initialCount)); // show a few skeletons quickly
    setTimeout(()=> {
      renderItems(initialCount);
      updateSeeMore();
    }, 220);

    // See more button
    let seeMoreBtn = cards.querySelector('.see-more-btn');
    if(!seeMoreBtn){
      seeMoreBtn = document.createElement('button');
      seeMoreBtn.className = 'see-more-btn';
      seeMoreBtn.textContent = 'See more';
      cards.appendChild(seeMoreBtn);
    }
    function updateSeeMore(){
      if(shown < all.length){
        seeMoreBtn.style.display = 'inline-block';
      } else {
        seeMoreBtn.style.display = 'none';
      }
    }
    seeMoreBtn.addEventListener('click', ()=>{
      renderItems(batchSize);
      updateSeeMore();
    });
  }

  function attachImageSkeletons(){
    document.querySelectorAll('.category-cards .card .media-wrap img').forEach(img=>{
      if(img.dataset._attached) return;
      img.dataset._attached = 1;
      const wrapper = img.closest('.media-wrap');
      if(!wrapper) return;
      // add a skeleton overlay element if missing
      if(!wrapper.querySelector('.img-skel')){
        const sk = document.createElement('div'); sk.className = 'img-skel';
        wrapper.insertBefore(sk, wrapper.firstChild);
      }
      img.style.opacity = 0;
      img.addEventListener('load', ()=>{ img.style.transition='opacity .35s'; img.style.opacity = 1; const sk = wrapper.querySelector('.img-skel'); if(sk && sk.parentNode) sk.parentNode.removeChild(sk); });
      img.addEventListener('error', ()=>{ const sk = wrapper.querySelector('.img-skel'); if(sk && sk.parentNode) sk.parentNode.removeChild(sk); });
    });
  }

  // keep helper for home updates
  function updateAllButtons(){
    qsa('.cat-row').forEach(section=>{ if(section._track) try{ updateButtonsVisibility(section); }catch(e){} });
  }

  /* --------------- bootstrap DOM ready --------------- */
  document.addEventListener('DOMContentLoaded', function(){
    setupHeader();

    // compute path and normalize with SITE_BASE awareness
    const path = (location.pathname || '/').replace(/\/$/, '') || '/';
    const base = SITE_BASE || '';
    const isHome = (path === '' || path === base || path === base + '/' || path === '/' || path === '');

    if(isHome){
      renderHome();
      return;
    }

    // Prefer an element that explicitly sets data-src (page author places <main data-src="..."> or a div)
    const pageDataSrcEl = document.querySelector('[data-src]');
    const mainElCandidate = pageDataSrcEl || qs('main') || document.body;

    const hasSrc = !!(mainElCandidate && mainElCandidate.dataset && mainElCandidate.dataset.src);
    const hasInMemory = Array.isArray(window.rokomariData) && window.rokomariData.length;
    const hasGlobalJson = (typeof window.JSON_DATA_PATH === 'string' && window.JSON_DATA_PATH);
    const force = !!window.FORCE_LOAD_CARDS;

    if(hasSrc || hasInMemory || (force && hasGlobalJson)){
      renderStandard(mainElCandidate);
    } else {
      // intentionally do nothing — no injected cards on regular pages
    }
  });

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
