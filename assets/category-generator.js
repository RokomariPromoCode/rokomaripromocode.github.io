// assets/category-generator.js
// Simple helper that fetches a single category JSON and uses generateCards to render it.
// Usage:
// generateCategory({ dataUrl: "data/json_data.json", container: "#my-cards", filterFn: item => item.category==='books' });

async function generateCategory({ categoryKey, dataUrl, container = ".cards-container", filterFn = null, columns = 2, fallbackDataPaths = [] } = {}) {
  // Fetch raw JSON (try fallbacks)
  const paths = [dataUrl].concat(fallbackDataPaths || []);
  let json = null;
  for (const p of paths) {
    try {
      const r = await fetch(p);
      if (!r.ok) continue;
      json = await r.json();
      break;
    } catch(e){}
  }
  if (!json) throw new Error("Could not load category data from " + paths.join(","));

  const items = filterFn ? json.filter(filterFn) : json.filter(i => i.category === categoryKey || i.type === categoryKey);

  // Render filtered items directly
  const containerEl = typeof container === "string" ? document.querySelector(container) : container;
  if (!containerEl) throw new Error("Container not found: " + container);
  containerEl.innerHTML = "";
  if (columns === 1) containerEl.style.gridTemplateColumns = "1fr";
  else containerEl.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;

  // createCardEl is expected to be available from card-generator.js
  for (const item of items) {
    const card = window.createCardEl ? window.createCardEl(item) : (function(){
      // fallback simple card creation
      const c = document.createElement('div'); c.className='card';
      const img = document.createElement('img'); img.className='card-image'; img.src = item.image || '/assets/placeholder.png';
      const content = document.createElement('div'); content.className='card-content';
      const title = document.createElement('h3'); title.className='card-title'; title.textContent = item.title || 'Untitled';
      content.appendChild(title); c.appendChild(img); c.appendChild(content); return c;
    })();
    containerEl.appendChild(card);
  }
}

window.generateCategory = generateCategory;