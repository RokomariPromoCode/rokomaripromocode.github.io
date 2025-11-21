/* app.js - main site behaviour (cards + search) */
(function(){
  const SITE_BASE = window.SITE_BASE || "";
  const jsonPath = window.JSON_DATA_PATH || (SITE_BASE + "/data/default.json");
  const main = document.getElementById('main-content');

  // detect home page (root or index)
  const relPath = location.pathname.replace(SITE_BASE, '') || '/';
  const isHome = (relPath === '/' || relPath === '/index.html' || relPath === '/index' || typeof window.FORCE_LOAD_CARDS !== 'undefined' && window.FORCE_LOAD_CARDS);

  // categories to show on home page and order
  const homeCategories = ['best_seller','books','electronics','foods','furniture','beauty','others'];

  // small helper to create element
  function el(tag, cls, html){ const e=document.createElement(tag); if(cls) e.className=cls; if(html) e.innerHTML=html; return e; }

  // ---- search system ----
  let productDatabase = []; // flat list for search
  document.addEventListener('app:search', (ev)=>{
    const q = String(ev.detail || '').trim().toLowerCase();
    handleSearchQuery(q);
  });

  const searchInput = document.getElementById('header-search-input');
  const searchResults = document.getElementById('search-results');
  const clearBtn = document.getElementById('clear-search');

  function showSearchList(items){
    searchResults.innerHTML = '';
    if(!items || items.length===0){ searchResults.style.display='none'; return; }
    items.forEach(it=>{
      const a = el('a','item');
      a.href = it.link || '#';
      a.innerHTML = `<img src="${it.img||''}" alt=""><div><h4>${it.title}</h4><p>${(it.author||'')}</p></div>`;
      searchResults.appendChild(a);
    });
    searchResults.style.display = 'block';
  }

  function handleSearchQuery(q){
    if(!q){ searchResults.style.display='none'; return; }
    const matches = productDatabase.filter(p => (p.title||'').toLowerCase().includes(q) || (p.author||'').toLowerCase().includes(q) || (p.seller||'').toLowerCase().includes(q));
    // dedupe by link
    const seen = new Set();
    const unique = [];
    for (const m of matches){
      if(!m.link) continue;
      if(seen.has(m.link)) continue;
      seen.add(m.link);
      unique.push(m);
      if(unique.length >= 10) break;
    }
    showSearchList(unique);
  }

  // hide suggestion if clicked outside
  document.addEventListener('click', (e)=>{
    if(!searchResults.contains(e.target) && !searchInput.contains(e.target)){
      searchResults.style.display='none';
    }
  });

  // ---- rendering homepage sections ----
  async function fetchJson(){
    try{
      const r = await fetch(jsonPath, {cache:'no-store'});
      if(!r.ok) throw new Error('fetch failed');
      const data = await r.json();
      return data;
    }catch(err){
      console.warn('fetchJson failed for', jsonPath, err);