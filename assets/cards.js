
// cards.js - renders cards from JSON (uses data/books.json by default) and provides search
window._cardsData = [];

function renderCards(items, containerId){
  const area = document.getElementById(containerId || 'cards-area');
  if(!area) return;
  area.innerHTML = '';
  if(!items || items.length === 0){
    area.innerHTML = '<p>No items found.</p>';
    return;
  }
  items.forEach(it=>{
    const div = document.createElement('div');
    div.className = 'card';
    div.innerHTML = `
      <img src="${it.image||'/assets/placeholder.png'}" alt="${it.title||''}" />
      <h3>${it.title||'Untitled'}</h3>
      <p class="author">${it.author ? 'By ' + it.author : ''}</p>
      <p class="price">${it.price ? it.price : ''}</p>
      <p class="sku">${it.sku ? 'SKU: ' + it.sku : ''}</p>
    `;
    area.appendChild(div);
  });
}

async function loadJSON(path, containerId){
  try{
    const res = await fetch(path, {cache: 'no-store'});
    if(!res.ok) throw new Error('JSON not found: ' + path);
    const data = await res.json();
    const items = Array.isArray(data) ? data : (data.items || []);
    window._cardsData = items;
    renderCards(items, containerId);
  }catch(err){
    console.error(err);
    renderCards([], containerId);
  }
}

function normalizeText(s){ return (s||'').toString().toLowerCase().trim(); }

function searchCards(q, containerId){
  const qn = normalizeText(q);
  if(!qn){
    renderCards(window._cardsData, containerId);
    return;
  }
  const filtered = window._cardsData.filter(it=>{
    return normalizeText(it.title).includes(qn) ||
           normalizeText(it.author).includes(qn) ||
           normalizeText(it.sku).includes(qn) ||
           normalizeText(it.category).includes(qn);
  });
  renderCards(filtered, containerId);
}

// expose globally
window.cardsSearch = searchCards;
window.loadCardsJSON = loadJSON;
