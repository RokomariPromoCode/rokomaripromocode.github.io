/* assets/app.js - with list skeletons */
(function () {
  'use strict';

  // prefer runtime SITE_BASE if set by layout, otherwise fallback to literal (keeps previous behavior)
  const SITE_BASE =
    typeof window !== 'undefined' && window.SITE_BASE
      ? window.SITE_BASE
      : '/';

  const qs = (s, p = document) => p.querySelector(s);
  const qsa = (s, p = document) =>
    Array.from((p || document).querySelectorAll(s));

  function resolveUrl(u) {
    if (!u) return u;
    u = String(u).trim();
    if (/^https?:\/\//i.test(u)) return u;
    if (!u.startsWith('/')) u = '/' + u;
    if (!SITE_BASE) return u;
    return (SITE_BASE + u).replace(/\/{2,}/g, '/');
  }

  async function fetchJson(path) {
    try {
      const url = resolveUrl(path);
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } catch (err) {
      console.error('Failed to load JSON:', path, err);
      throw err;
    }
  }

  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function safe(x, def = '') {
    if (x === undefined || x === null) return def;
    return x;
  }

  function debounce(fn, wait) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  // --------------------------
  // Shared rendering helpers
  // --------------------------

  // List skeletons while JSON is loading
  function renderSkeletonCards(container, count = 6) {
    if (!container) return;
    container.innerHTML = '';
    const frag = document.createDocumentFragment();

    for (let i = 0; i < count; i++) {
      const article = document.createElement('article');
      article.className = 'card card-skel';
      article.innerHTML = `
        <div class="card-content">
          <div class="media skel-anim"></div>
          <div class="body">
            <div class="skel-line skel-line-lg skel-anim"></div>
            <div class="skel-line skel-anim"></div>
            <div class="skel-line skel-line-sm skel-anim"></div>
            <div class="card-bottom">
              <div class="skel-pill skel-anim"></div>
              <div class="skel-pill skel-pill-sm skel-anim"></div>
            </div>
            <div class="skel-btn skel-anim"></div>
          </div>
        </div>
      `;
      frag.appendChild(article);
    }

    container.appendChild(frag);
  }

  function renderProductCards(items, container) {
    if (!container) return;
    container.innerHTML = '';

    if (!items || !items.length) {
      container.innerHTML =
        '<p class="empty">কোনো প্রোডাক্ট পাওয়া যায়নি।</p>';
      return;
    }

    const frag = document.createDocumentFragment();

    items.forEach((item) => {
      const title = safe(item.title || item.name || 'নাম নেই');
      const author = safe(item.author || item.writer);
      const seller = safe(item.seller || item.shop_name);
      const img = safe(item.img || item.image || item.cover);
      const link = safe(item.link || item.url || '#');
      const discount = safe(item.discount_text || item.discount || '');
      const price = safe(item.price_text || item.price || '');
      const desc = safe(
        item.desc || item.description || item.short_description || ''
      );

      const article = document.createElement('article');
      article.className = 'card';
      article.innerHTML = `
        <div class="card-content">
          <div class="media">
            ${
              img
                ? `<img src="${escapeHtml(
                    resolveUrl(img)
                  )}" alt="${escapeHtml(title)}" loading="lazy" height="260">`
                : '<div class="no-image">No image</div>'
            }
          </div>
          <div class="body">
            <h4 class="title">${escapeHtml(title)}</h4>
            <div class="meta">
              ${
                author
                  ? 'লেখক: ' + escapeHtml(author)
                  : ''
              }
              ${
                seller
                  ? (author ? ' • ' : '') +
                    'বিক্রেতা: ' +
                    escapeHtml(seller)
                  : ''
              }
            </div>
            <p class="desc">${escapeHtml(desc)}</p>
            <div class="card-bottom">
              <div class="discount-text">
                ${escapeHtml(discount || 'ডিসকাউন্ট পেতে এখানে কিনুন')}
              </div>
              <div class="price">
                ${price ? escapeHtml(price) : ''}
              </div>
            </div>
            <a class="card-btn" href="${escapeHtml(
              resolveUrl(link)
            )}" target="_blank" rel="noopener">
              এখনই দেখুন
            </a>
          </div>
        </div>
      `;
      frag.appendChild(article);
    });

    container.appendChild(frag);
  }

  // Attach skeleton + lazy loading for images
  function initLazyImages(root = document) {
    const imgs = qsa('img[loading="lazy"]', root);
    if (!('IntersectionObserver' in window)) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const img = entry.target;
          io.unobserve(img);

          if (img.dataset._attached) return;
          img.dataset._attached = 1;
          const wrapper = img.parentNode;
          const sk = document.createElement('div');
          sk.className = 'img-skel';
          wrapper.insertBefore(sk, img);
          img.style.opacity = 0;

          img.addEventListener('load', () => {
            img.style.transition = 'opacity .35s';
            img.style.opacity = 1;
            if (sk && sk.parentNode) sk.parentNode.removeChild(sk);
            updateAllButtons();
          });

          img.addEventListener('error', () => {
            if (sk && sk.parentNode) sk.parentNode.removeChild(sk);
            updateAllButtons();
          });

          // trigger load (already has src)
          if (img.complete) {
            img.dispatchEvent(new Event('load'));
          }
        });
      },
      { rootMargin: '100px 0px' }
    );

    imgs.forEach((img) => io.observe(img));
  }

  // Simple state to re-run UI updates when cards change
  const updateCallbacks = [];

  function onUpdate(fn) {
    if (typeof fn === 'function') updateCallbacks.push(fn);
  }

  function updateAllButtons() {
    updateCallbacks.forEach((fn) => {
      try {
        fn();
      } catch (e) {
        console.error(e);
      }
    });
  }

  // --------------------------
  // Page-specific logic
  // --------------------------

  async function initIndexPage() {
    const container = qs('#index-products');
    if (!container) return;

    // show skeletons before fetching
    renderSkeletonCards(container, 6);

    try {
      const data = await fetchJson('/data/index.json');
      renderProductCards(data.items || data, container);
      initLazyImages(container);
      updateAllButtons();
    } catch (err) {
      container.innerHTML =
        '<p class="error">ডাটা লোড করতে সমস্যা হয়েছে। একটু পরে চেষ্টা করুন।</p>';
    }
  }

  async function initBooksPage() {
    const container = qs('#books-products');
    if (!container) return;

    const searchInput = qs('#books-search-input');
    const categorySelect = qs('#books-category-select');

    let allItems = [];

    function applyFilter() {
      let items = allItems.slice();

      const term = (searchInput && searchInput.value || '').trim().toLowerCase();
      const cat = (categorySelect && categorySelect.value) || '';

      if (term) {
        items = items.filter((it) => {
          const t =
            String(it.title || it.name || '')
              .toLowerCase()
              .includes(term) ||
            String(it.author || it.writer || '')
              .toLowerCase()
              .includes(term);
          return t;
        });
      }

      if (cat && cat !== 'all') {
        items = items.filter(
          (it) =>
            String(it.category || it.cat || '')
              .toLowerCase() === cat.toLowerCase()
        );
      }

      renderProductCards(items, container);
      initLazyImages(container);
      updateAllButtons();
    }

    if (searchInput) {
      searchInput.addEventListener('input', debounce(applyFilter, 200));
    }

    if (categorySelect) {
      categorySelect.addEventListener('change', applyFilter);
    }

    // skeletons while books JSON loads
    renderSkeletonCards(container, 8);

    try {
      const data = await fetchJson('/data/books.json');
      allItems = data.items || data;
      applyFilter();
    } catch (err) {
      container.innerHTML =
        '<p class="error">ডাটা লোড করতে সমস্যা হয়েছে। একটু পরে চেষ্টা করুন।</p>';
    }
  }

  async function initBestSellerPage() {
    const container = qs('#best-seller-products');
    if (!container) return;

    renderSkeletonCards(container, 6);

    try {
      const data = await fetchJson('/data/best_seller.json');
      renderProductCards(data.items || data, container);
      initLazyImages(container);
      updateAllButtons();
    } catch (err) {
      container.innerHTML =
        '<p class="error">ডাটা লোড করতে সমস্যা হয়েছে। একটু পরে চেষ্টা করুন।</p>';
    }
  }

  async function initBabyProductsPage() {
    const container = qs('#baby-products');
    if (!container) return;

    renderSkeletonCards(container, 6);

    try {
      const data = await fetchJson('/data/baby-products.json');
      renderProductCards(data.items || data, container);
      initLazyImages(container);
      updateAllButtons();
    } catch (err) {
      container.innerHTML =
        '<p class="error">ডাটা লোড করতে সমস্যা হয়েছে। একটু পরে চেষ্টা করুন।</p>';
    }
  }

  async function initElectronicsPage() {
    const container = qs('#electronics-products');
    if (!container) return;

    renderSkeletonCards(container, 6);

    try {
      const data = await fetchJson('/data/electronics.json');
      renderProductCards(data.items || data, container);
      initLazyImages(container);
      updateAllButtons();
    } catch (err) {
      container.innerHTML =
        '<p class="error">ডাটা লোড করতে সমস্যা হয়েছে। একটু পরে চেষ্টা করুন।</p>';
    }
  }

  async function initFoodsPage() {
    const container = qs('#foods-products');
    if (!container) return;

    renderSkeletonCards(container, 6);

    try {
      const data = await fetchJson('/data/foods.json');
      renderProductCards(data.items || data, container);
      initLazyImages(container);
      updateAllButtons();
    } catch (err) {
      container.innerHTML =
        '<p class="error">ডাটা লোড করতে সমস্যা হয়েছে। একটু পরে চেষ্টা করুন।</p>';
    }
  }

  async function initGorerBazarPage() {
    const container = qs('#gorer-bazar-products');
    if (!container) return;

    renderSkeletonCards(container, 6);

    try {
      const data = await fetchJson('/data/gorer-bazar.json');
      renderProductCards(data.items || data, container);
      initLazyImages(container);
      updateAllButtons();
    } catch (err) {
      container.innerHTML =
        '<p class="error">ডাটা লোড করতে সমস্যা হয়েছে। একটু পরে চেষ্টা করুন।</p>';
    }
  }

  async function initBeautyPage() {
    const container = qs('#beauty-products');
    if (!container) return;

    renderSkeletonCards(container, 6);

    try {
      const data = await fetchJson('/data/beauty.json');
      renderProductCards(data.items || data, container);
      initLazyImages(container);
      updateAllButtons();
    } catch (err) {
      container.innerHTML =
        '<p class="error">ডাটা লোড করতে সমস্যা হয়েছে। একটু পরে চেষ্টা করুন।</p>';
    }
  }

  async function initKidsToysPage() {
    const container = qs('#kids-toys-products');
    if (!container) return;

    renderSkeletonCards(container, 6);

    try {
      const data = await fetchJson('/data/kids-toys.json');
      renderProductCards(data.items || data, container);
      initLazyImages(container);
      updateAllButtons();
    } catch (err) {
      container.innerHTML =
        '<p class="error">ডাটা লোড করতে সমস্যা হয়েছে। একটু পরে চেষ্টা করুন।</p>';
    }
  }

  function initContactPage() {
    const form = qs('#contact-form');
    if (!form) return;

    const nameInput = qs('#contact-name', form);
    const emailInput = qs('#contact-email', form);
    const messageInput = qs('#contact-message', form);
    const typeSelect = qs('#contact-type', form);
    const statusBox = qs('.form-status', form);

    function showStatus(msg, type = 'info') {
      if (!statusBox) return;
      statusBox.textContent = msg;
      statusBox.className = 'form-status ' + type;
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const name = (nameInput && nameInput.value.trim()) || '';
      const email = (emailInput && emailInput.value.trim()) || '';
      const message = (messageInput && messageInput.value.trim()) || '';
      const type = (typeSelect && typeSelect.value) || 'help';

      if (!name || !email || !message) {
        showStatus('সব ঘর পূরণ করুন।', 'error');
        return;
      }

      showStatus('মেসেজ পাঠানো হচ্ছে...', 'info');

      const payload = {
        name,
        email,
        message,
        type,
        time: new Date().toISOString()
      };

      console.log('Contact form payload:', payload);
      setTimeout(() => {
        showStatus('ধন্যবাদ! আপনার মেসেজ রিসিভ করা হয়েছে।', 'success');
        form.reset();
      }, 800);
    });
  }

  // Generic page router based on body class
  function detectPageAndInit() {
    const body = document.body;
    if (!body) return;

    const cls = body.className || '';

    if (cls.includes('page-index')) {
      initIndexPage();
    }
    if (cls.includes('page-books')) {
      initBooksPage();
    }
    if (cls.includes('page-best-seller')) {
      initBestSellerPage();
    }
    if (cls.includes('page-baby-products')) {
      initBabyProductsPage();
    }
    if (cls.includes('page-electronics')) {
      initElectronicsPage();
    }
    if (cls.includes('page-foods')) {
      initFoodsPage();
    }
    if (cls.includes('page-gorer-bazar')) {
      initGorerBazarPage();
    }
    if (cls.includes('page-beauty')) {
      initBeautyPage();
    }
    if (cls.includes('page-kids-toys')) {
      initKidsToysPage();
    }
    if (cls.includes('page-contact')) {
      initContactPage();
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    detectPageAndInit();
  });
})();

// --- Scroll to top / bottom buttons ---
const scrollUpBtn = document.querySelector('.scroll-btn-up');
const scrollDownBtn = document.querySelector('.scroll-btn-down');

function smoothScrollTo(y) {
  window.scrollTo({
    top: y,
    behavior: 'smooth'
  });
}

if (scrollUpBtn) {
  scrollUpBtn.addEventListener('click', () => {
    smoothScrollTo(0);
  });
}

if (scrollDownBtn) {
  scrollDownBtn.addEventListener('click', () => {
    const maxY =
      document.documentElement.scrollHeight - window.innerHeight;
    smoothScrollTo(maxY);
  });
}

window.addEventListener('scroll', () => {
  const scrollY =
    window.scrollY || document.documentElement.scrollTop;
  const maxY =
    document.documentElement.scrollHeight - window.innerHeight;

  if (scrollUpBtn) {
    scrollUpBtn.classList.toggle('visible', scrollY > 300);
  }
  if (scrollDownBtn) {
    scrollDownBtn.classList.toggle(
      'visible',
      scrollY < maxY - 300
    );
  }
});
