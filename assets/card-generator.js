// assets/card-generator.js
// Usage:
// generateCards({ dataUrl: "data/books.json", container: "#my-cards", columns: 2, imagePathPrefix: "/" });

async function fetchJsonWithFallback(paths) {
  for (const p of paths) {
    try {
      const r = await fetch(p);
      if (!r.ok) continue;
      return await r.json();
    } catch(e) {
      // try next
    }
  }
  throw new Error("Could not fetch JSON from any path: " + paths.join(", "));
}

function createCardEl(item) {
  const card = document.createElement("div");
  card.className = "card";

  const img = document.createElement("img");
  img.className = "card-image";
  img.alt = item.title || "image";
  img.src = item.image || "/assets/placeholder.png";

  const content = document.createElement("div");
  content.className = "card-content";

  const title = document.createElement("h3");
  title.className = "card-title";
  title.textContent = item.title || "Untitled";

  const meta = document.createElement("div");
  meta.className = "card-meta";
  meta.textContent = (item.author ? item.author + " • " : "") + (item.brand || "");

  const price = document.createElement("div");
  price.className = "card-price";
  if (item.price) price.textContent = item.price;

  content.appendChild(title);
  if (meta.textContent) content.appendChild(meta);
  if (price.textContent) content.appendChild(price);

  card.appendChild(img);
  card.appendChild(content);
  return card;
}

async function generateCards({ dataUrl, container = ".cards-container", columns = 2, imagePathPrefix = "", fallbackDataPaths = [] } = {}) {
  const containerEl = typeof container === "string" ? document.querySelector(container) : container;
  if (!containerEl) throw new Error("Container not found: " + container);

  // build fallback list of possible URLs
  const pathsToTry = [dataUrl].concat(fallbackDataPaths || []);
  const data = await fetchJsonWithFallback(pathsToTry);

  // set columns via CSS grid
  if (columns === 1) containerEl.style.gridTemplateColumns = "1fr";
  else containerEl.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;

  // build cards
  containerEl.innerHTML = "";
  for (const item of data) {
    // if item.image is relative, add prefix
    if (item.image && !/^https?:\/\//.test(item.image) && imagePathPrefix) {
      if (!item.image.startsWith("/")) item.image = imagePathPrefix + item.image;
      else item.image = imagePathPrefix.replace(/\/$/, "") + item.image;
    }
    const card = createCardEl(item);
    containerEl.appendChild(card);
  }
}

// export function for browsers
window.generateCards = generateCards;