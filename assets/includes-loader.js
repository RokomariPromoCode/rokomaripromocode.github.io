// assets/includes-loader.js
// Only injects unified layout include into placeholder.
// Tries multiple fallback paths.

(function(){
  const layout = {
    selector: "#layout-placeholder",
    paths: [
      "_includes/layout.html",
      "./_includes/layout.html",
      "includes/layout.html",
      "./includes/layout.html",
      "/_includes/layout.html"
    ]
  };

  async function tryFetch(paths) {
    for (const p of paths) {
      try {
        const r = await fetch(p);
        if (!r.ok) continue;
        return await r.text();
      } catch(e) {}
    }
    return null;
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const target = document.querySelector(layout.selector);
    if (!target) return;
    const html = await tryFetch(layout.paths);
    if (html) target.innerHTML = html;
    else console.warn("Failed to load unified layout file. Tried:", layout.paths);
  });
})();