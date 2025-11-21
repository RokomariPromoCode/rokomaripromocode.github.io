/*  inject-includes.js
    -------------------
    This script allows any page to load header, footer, and WhatsApp
    button automatically WITHOUT repeating code.

    Usage in any .html or .md:
        <script src="/assets/inject-includes.js"></script>

    If a page uses layout: default, the layout already includes header/footer.
    The script detects that and does NOT duplicate them.
*/

(function () {
  "use strict";

  // SITE_BASE comes from _layouts/default.html
  const BASE = window.SITE_BASE || "";

  // Paths to includes
  const paths = {
    header: BASE + "/_includes/header.html",
    footer: BASE + "/_includes/footer.html",
    wa: BASE + "/_includes/wa.html"
  };

  // Utility: load text via fetch
  async function load(url) {
    try {
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) return "";
      return await r.text();
    } catch (e) {
      console.warn("inject-includes.js: fetch failed:", url, e);
      return "";
    }
  }

  function safeInsertHTML(target, html, position = "beforeend") {
    if (!target || !html) return;
    target.insertAdjacentHTML(position, html);
  }

  async function inject() {
    // avoid duplication:
    // if page already has header/footer via layout, skip
    const alreadyHeader = document.querySelector(".modern-header");
    const alreadyFooter = document.querySelector(".main-footer");

    // 1. Insert header at TOP if not already present
    if (!alreadyHeader) {
      const headerHTML = await load(paths.header);
      if (headerHTML) {
        safeInsertHTML(document.body, headerHTML, "afterbegin");
      }
    }

    // 2. Insert footer at BOTTOM if not already present
    if (!alreadyFooter) {
      const footerHTML = await load(paths.footer);
      if (footerHTML) {
        safeInsertHTML(document.body, footerHTML, "beforeend");
      }
    }

    // 3. Inject WhatsApp floating button (always at the bottom)
    const waExists = document.querySelector(".wa-float");
    if (!waExists) {
      const waHTML = await load(paths.wa);
      if (waHTML) {
        safeInsertHTML(document.body, waHTML, "beforeend");
      }
    }
  }

  // Wait for DOM
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", inject);
  } else {
    inject();
  }
})();