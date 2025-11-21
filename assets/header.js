document.addEventListener('DOMContentLoaded', function() {
  const hamburger = document.getElementById('hamburgerBtn');
  const menuLinks = document.getElementById('menuLinks');
  const searchInput = document.getElementById('header-search-input');
  const resultsContainer = document.getElementById('header-search-results');
  const clearBtn = document.getElementById('search-clear');
  const searchLens = document.getElementById('search-lens');

  if (hamburger) {
    hamburger.addEventListener('click', () => {
      menuLinks.classList.toggle('active');
      const icon = hamburger.querySelector('i');
      if (menuLinks.classList.contains('active')) { icon.classList.remove('fa-bars'); icon.classList.add('fa-times'); }
      else { icon.classList.remove('fa-times'); icon.classList.add('fa-bars'); }
    });
  }

  document.addEventListener('click', (e) => {
    if (!hamburger.contains(e.target) && !menuLinks.contains(e.target) && menuLinks.classList.contains('active')) {
      menuLinks.classList.remove('active');
      const icon = hamburger.querySelector('i'); icon.classList.remove('fa-times'); icon.classList.add('fa-bars');
    }
  });

  function showResults(items) {
    if(!resultsContainer) return;
    resultsContainer.style.display = 'block';
    resultsContainer.innerHTML = '';
    if (!items.length) {
      resultsContainer.innerHTML = `<div class="no-result-box"><p>কোনো প্রোডাক্ট পাওয়া যায়নি!</p><button class="request-btn-small" onclick="triggerRequest()">ডিসকাউন্ট রিকুয়েষ্ট পাঠান</button></div>`;
      return;
    }
    items.forEach(item=>{
      const a = document.createElement('a');
      a.className = 'result-item';
      a.href = item.href || '#';
      a.innerHTML = `<img src="${item.img||''}" alt=""><div><strong style="display:block">${item.title}</strong><small>${item.meta||''}</small></div>`;
      resultsContainer.appendChild(a);
    });
  }

  function debounce(fn, wait=180){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), wait); }; }

  const onInput = debounce(async function() {
    const q = (this.value||'').trim();
    if (!q) { if(resultsContainer) resultsContainer.style.display='none'; if(clearBtn) clearBtn.style.display='none'; if(searchLens) searchLens.style.display='block'; return; }
    if(clearBtn) clearBtn.style.display='block'; if(searchLens) searchLens.style.display='none';

    // call global performSearch preview (app.js provides)
    if (typeof window.performSearch === 'function') {
      try {
        const r = window.performSearch(q, { preview:true });
        if (r && typeof r.then==='function') {
          const items = await r;
          showResults(items || []);
        } else {
          showResults(r || []);
        }
        return;
      } catch(e) {
        console.warn('performSearch preview failed', e);
      }
    }

    // fallback: search through any product-card DOM present
    const cards = document.querySelectorAll('.product-card');
    const db = Array.from(cards).map(c=>{
      return { title: c.dataset.title||'', img: c.dataset.img||'', href: c.dataset.href||'', meta: (c.dataset.author||'') + ' ' + (c.dataset.seller||'') };
    });
    const matches = db.filter(it=> (it.title+ ' '+ (it.meta||'')).toLowerCase().includes(q.toLowerCase()));
    showResults(matches.slice(0,12));
  }, 150);

  if (searchInput) searchInput.addEventListener('input', onInput);

  if (clearBtn) clearBtn.addEventListener('click', ()=>{
    searchInput.value = ''; if(resultsContainer) resultsContainer.style.display='none'; if(clearBtn) clearBtn.style.display='none'; if(searchLens) searchLens.style.display='block'; searchInput.focus();
  });

  window.triggerRequest = function(searchTerm='') {
    if (resultsContainer) resultsContainer.style.display='none';
    if (searchInput) searchInput.value = '';
    const req = document.getElementById('request-area');
    if (req) { req.scrollIntoView({behavior:'smooth'}); const p = document.getElementById('product-name'); if (p) p.value = searchTerm; }
    else alert('পেজের নিচের রিকোয়েস্ট ফর্মে যান।');
  };
});
