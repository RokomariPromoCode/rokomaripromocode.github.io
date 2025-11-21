/* assets/app.js - full (category-aware, home preserved) */
(function(){
  'use strict';

  // runtime SITE_BASE from layout if available otherwise default (keeps previous behavior)
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
    if(!path) return [];
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
    if(t.length <= 180) return t;
    const cut = t.lastIndexOf(' ', 140) || 140;
    return t.slice(0,cut) + '...';
  }

  function normalize(arr){
    if(!Array.isArray(arr)) return [];
    return arr.map(it=>({
      title: String(it.title || it.name || '').trim(),
      author: String(it.author || it.writer || '').trim(),
      seller: String(it.seller || '').trim(),
      img: String(it.img || it.image || it.thumbnail || '').trim(),
      desc: cleanDesc(it.desc || it.description || it.summary || ''),
      link: String(it.link || it.url || '#').trim()
    }));
  }

  // Simple Fisher-Yates shuffle (in place)
  function shuffleArray(a){
    const arr = a.slice();
    for(let i=arr.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
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
        ${ img ? `<img src="${escapeHtml(img)}" alt="${escapeHtml(title)}" loading="lazy">` : `<div class="no-image">No image</div>` }
      </div>
      <div class="card-body">
        <h4 class="title">${escapeHtml(title)}</h4>
        <div class="meta">${author ? 'লেখক: '+escapeHtml(author) : ''} ${seller ? (author ? ' • ' : '') + 'বিক্রেতা: ' + escapeHtml(seller) : ''}</div>
        <p class="desc">${escapeHtml(desc)}</p>
        <div class="card-bottom">
          <div class="discount-text">ডিসকাউন্ট পেতে এখানে কিনুন</div>
          <a class="btn" href="${escapeHtml(link)}" target="_blank" rel="noopener">Buy Now</a>
        </div>
      </div>
    `;
    return article;
  }

  /* ---------- Header & Search (unchanged behavior) ---------- */
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

    // prefetch merged index for search (keeps previous behavior)
    let localIndex = [];
    (async ()=>{
      const files = ['/data/json_data.json','/data/best_seller.json','/data/books.json','/data/electronics.json','/data/foods.json','/data/furnitures.json','/data/beauty.json','/data/others.json'];
      const fetched = await Promise.all(files.map(f => fetchJson(f)));
      const merged = fetched.flat();
      const normalized = normalize(merged);
      const map = new Map();
      normalized.forEach(item=>{
        const key = (item.link || item.title).toString();
        if(!map.has(key)) map.set(key, item);
      });
      localIndex = Array.from(map.values());
    })();

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
  }

  /* ---------- Home renderer: keep category rows intact, but cap each to 8 items (9th is see-more) ---------- */
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
        // for home sliders: keep best-seller order, shuffle others to show variety
        if(catDef.key !== 'best-seller') items = shuffleArray(items);
        sec._items = items;
        sec._track = track;
        sec._tx = 0;
        sec._loadedCount = 0;

        const maxInitial = Math.min(8, items.length); // show up to 8 cards
        let idx = 0;
        const first = Math.min(maxInitial, items.length - idx);
        appendItemsToTrack(sec, idx, first);
        idx += first;
        sec._loadedCount = idx;

        // add see-more card if items remain
        if(idx < items.length) addSeeMoreCard(sec, catDef);

        next.addEventListener('click', ()=> onNextClick(sec, catDef));
        prev.addEventListener('click', ()=> slideCategory(sec, -1));
        enableSwipe(wrapper, sec);

        sec._nextIndex = idx;
        sec._batchSize = 4;

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
    setTimeout(()=>updateButtonsVisibility(section), 120);
  }

  function addSeeMoreCard(section, catDef){
    if(!section || !section._track) return;
    if(section._track.querySelector('.cat-item.see-more')) return;
    const wrap = document.createElement('div'); wrap.className='cat-item see-more';
    const link = catDef && catDef.href ? catDef.href : `/${section.dataset.key}/`;
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
    wrapper.addEventListener('touchmove', e=>{ if(!isDown) return; curX = e.touches[0].clientX; const dx = curX - startX; try{ section._track.style.transform = `translateX(${(section._track._tx || 0) + dx}px)`; }catch(e){} });
    wrapper.addEventListener('touchend', e=>{ if(!isDown) return; isDown=false; const dx = curX - startX; if(Math.abs(dx) > 40){ slideCategory(section, dx < 0 ? +1 : -1); } else { section._track.style.transform = `translateX(${section._track._tx || 0}px)`; } startX=curX=0; });
    wrapper.addEventListener('mouseleave', ()=>{ if(isDown){ isDown=false; section._track.style.transform = `translateX(${section._track._tx || 0}px)`; }});
  }

  /* ---------- Category page renderer (ONLY runs when page has an element with data-src) ---------- */
  async function renderCategory(mainEl){
    // data-src expected like "data/electronics.json" or "/data/electronics.json"
    const dataSrc = mainEl?.dataset?.src || null;
    if(!dataSrc && !(Array.isArray(window.rokomariData) && window.rokomariData.length)) return;

    // fetch
    let raw = [];
    if(Array.isArray(window.rokomariData) && window.rokomariData.length) raw = window.rokomariData;
    else raw = await fetchJson(dataSrc);

    let all = normalize(raw);

    // If the source is best_seller, do not shuffle; otherwise randomize
    const normalizedSrc = String(dataSrc || '').toLowerCase();
    if(!normalizedSrc.includes('best_seller') && !normalizedSrc.includes('best-seller') && !normalizedSrc.includes('best-seller.json')){
      all = shuffleArray(all);
    }

    window._all_index = all;

    // create container
    let cards = qs('#cardsArea', mainEl);
    if(!cards){
      cards = document.createElement('div');
      cards.id = 'cardsArea';
      cards.className = 'cards-area container category-cards';
      // append after existing content of mainEl
      mainEl.appendChild(cards);
    } else {
      cards.classList.add('category-cards');
    }

    // layout limits
    const isMobile = (window.innerWidth || document.documentElement.clientWidth) < 900;
    const initialCount = isMobile ? 10 : 20;
    const batchSize = 10;
    let shown = 0;

    function renderItems(count){
      const slice = all.slice(shown, shown + count);
      slice.forEach(it=>{
        const card = createCard(it);
        cards.appendChild(card);
      });
      shown += slice.length;
      // update see more visibility
      if(shown < all.length){
        showMoreBtn.style.display = 'block';
      } else {
        showMoreBtn.style.display = 'none';
      }
    }

    // initial render
    renderItems(Math.min(initialCount, all.length));

    // See more button (loads batch)
    let showMoreBtn = qs('.category-see-more', cards);
    if(!showMoreBtn){
      showMoreBtn = document.createElement('button');
      showMoreBtn.className = 'category-see-more';
      showMoreBtn.textContent = 'See more';
      cards.appendChild(showMoreBtn);
    }

    showMoreBtn.addEventListener('click', ()=>{
      renderItems(batchSize);
      // fade-in new images handled by attachImageSkeletons
      attachImageSkeletons();
      // scroll to newly appended content (gentle)
      showMoreBtn.scrollIntoView({behavior:'smooth', block:'nearest'});
    });

    attachImageSkeletons();
  }

  /* ---------- Image skeleton handling (YouTube-like shimmer) ---------- */
  function attachImageSkeletons(){
    document.querySelectorAll('.category-cards .card .card-media').forEach(wrapper=>{
      // add skeleton only if img not loaded yet
      if(wrapper.dataset._skel) return;
      wrapper.dataset._skel = 1;
      const img = wrapper.querySelector('img');
      const sk = document.createElement('div'); sk.className = 'yt-skel';
      wrapper.insertBefore(sk, wrapper.firstChild);
      if(!img) { // no image: remove skeleton
        sk.classList.add('no-img');
        return;
      }
      img.style.opacity = 0;
      img.addEventListener('load', ()=>{ img.style.transition='opacity .35s'; img.style.opacity = 1; if(sk && sk.parentNode) sk.parentNode.removeChild(sk); });
      img.addEventListener('error', ()=>{ if(sk && sk.parentNode) sk.parentNode.removeChild(sk); });
      // if already complete
      if(img.complete && img.naturalWidth){
        if(sk && sk.parentNode) sk.parentNode.removeChild(sk);
        img.style.opacity = 1;
      }
    });
  }

  // observe DOM changes to attach skeletons for dynamically added cards
  const mut = new MutationObserver(()=>attachImageSkeletons());
  mut.observe(document.body, { childList:true, subtree:true });

  /* ---------- Start logic: prefer element with data-src on page for category rendering ---------- */
  document.addEventListener('DOMContentLoaded', function(){
    setupHeader();

    // normalized path detection (site base aware)
    const path = (location.pathname || '/').replace(/\/$/, '') || '/';
    const base = SITE_BASE || '';
    const isHome = (path === '' || path === base || path === base + '/' || path === '/' || path === '');

    if(isHome){
      renderHome();
      return;
    }

    // Prefer explicit data-src element (category pages include <main data-src="..."> or a div with data-src)
    const pageDataSrcEl = document.querySelector('[data-src]');
    const mainElCandidate = pageDataSrcEl || qs('main') || document.body;

    // Determine whether to render cards:
    const hasSrc = !!(mainElCandidate && mainElCandidate.dataset && mainElCandidate.dataset.src);
    const hasInMemory = Array.isArray(window.rokomariData) && window.rokomariData.length;
    const hasGlobalJson = (typeof window.JSON_DATA_PATH === 'string' && window.JSON_DATA_PATH);
    const force = !!window.FORCE_LOAD_CARDS;

    // category pages: renderCategory only if element contains data-src or in-memory or forced global JSON path
    if(hasSrc || hasInMemory || (force && hasGlobalJson)){
      renderCategory(mainElCandidate);
    } else {
      // do nothing on other pages (no cards)
    }
  });

  // small helper used by search/request
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
