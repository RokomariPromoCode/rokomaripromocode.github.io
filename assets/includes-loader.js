// assets/includes-loader.js
(function(){
  'use strict';
  // CHANGE THIS if your site root is different (for your GitHub Pages it is "/trial")
  const BASE = '/trial';
  const includesPath = BASE + '/_includes';

  async function insertHtml(selector, filename){
    try {
      const placeholder = document.querySelector(selector);
      if(!placeholder) return;
      const resp = await fetch(includesPath + '/' + filename, {cache:'no-store'});
      if(!resp.ok) throw new Error('Not found ' + filename);
      const html = await resp.text();
      placeholder.innerHTML = html;
      // run any inline scripts inside include (move them to body)
      placeholder.querySelectorAll('script').forEach(s=>{
        const ns = document.createElement('script');
        if(s.src) ns.src = s.src;
        else ns.textContent = s.textContent;
        document.body.appendChild(ns);
        s.remove();
      });
    } catch(err){
      console.warn('Include loader error', filename, err);
    }
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    if(!document.getElementById('site-header')) { const h=document.createElement('div'); h.id='site-header'; document.body.insertBefore(h, document.body.firstChild); }
    if(!document.getElementById('site-footer')) { const f=document.createElement('div'); f.id='site-footer'; document.body.appendChild(f); }
    if(!document.getElementById('site-wa')) { const w=document.createElement('div'); w.id='site-wa'; document.body.appendChild(w); }

    insertHtml('#site-header','header.html');
    insertHtml('#site-footer','footer.html');
    insertHtml('#site-wa','wa.html');
  });
})();
