/* assets/inject-includes.js - small injector for pages without Jekyll layout
   If a page has <div id="inject-header"></div> etc., this script will fetch includes.
   NOTE: This is optional if you use the _layouts/default.html system.
*/
(function(){
  // only run on non-Jekyll environments (pages that have no header)
  function fetchAndInsert(path, selector){
    fetch(path, {cache:'no-store'}).then(r=> r.text()).then(html => {
      const container = document.querySelector(selector);
      if(container) container.innerHTML = html;
    }).catch(()=>{});
  }

  // try injecting common placeholders
  if(document.getElementById('inject-header')) fetchAndInsert('/_includes/header.html', '#inject-header');
  if(document.getElementById('inject-footer')) fetchAndInsert('/_includes/footer.html', '#inject-footer');
})();
