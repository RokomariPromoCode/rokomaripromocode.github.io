---
layout: default
---

<div id="layout-placeholder"></div>

<h1>Test Page — Editable</h1>

<div id="my-cards" class="cards-container"></div>

<link rel="stylesheet" href="/assets/styles.css">
<script src="/assets/includes-loader.js" defer></script>
<script src="/assets/card-generator.js" defer></script>
<script src="/assets/category-generator.js" defer></script>

<script defer>
document.addEventListener("DOMContentLoaded", function(){
  const fallback = [
    "data/books.json",
    "/trial/data/books.json",
    "/data/books.json",
    "./data/books.json"
  ];
  window.generateCards({
    dataUrl: "data/books.json",
    container: "#my-cards",
    columns: 2,
    imagePathPrefix: "/",
    fallbackDataPaths: fallback
  }).catch(err => {
    console.error("Card generation error:", err);
    const el = document.querySelector("#my-cards");
    if (el) el.innerHTML = "<p class='center'>Could not load items. Check console for details.</p>";
  });
});
</script>