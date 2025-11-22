// inject-includes.js — fetches includes/header.html footer.html wa.html and inserts into DOM
(async function(){
  function insertHTMLAtTop(html){ const div = document.createElement('div'); div.innerHTML = html; document.body.insertBefore(div, document.body.firstChild); }
  function insertHTMLAtBottom(html){ const div = document.createElement('div'); div.innerHTML = html; document.body.appendChild(div); }

  const base = (window.SITE_BASE || '') || '';
  try {
    const [h, f, w] = await Promise.all([
      fetch(base + '/includes/header.html').then(r => r.ok ? r.text() : ''),
      fetch(base + '/includes/footer.html').then(r => r.ok ? r.text() : ''),
      fetch(base + '/includes/wa.html').then(r => r.ok ? r.text() : '')
    ]);
    if (h) insertHTMLAtTop(h);
    if (f) insertHTMLAtBottom(f);
    if (w) insertHTMLAtBottom(w);
  } catch(e) {
    console.warn('inject-includes failed', e);
  }
})();
