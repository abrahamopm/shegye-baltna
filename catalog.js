/**
 * Catalog: loads data/products.json and merges optional admin override from localStorage (shegye_products_catalog).
 */
(function () {
  const OVERRIDE_KEY = 'shegye_products_catalog';

  function esc(str) {
    if (str == null) return '';
    const d = document.createElement('div');
    d.textContent = String(str);
    return d.innerHTML;
  }

  function mergeById(baseList, overrideList) {
    const map = new Map();
    (baseList || []).forEach((p) => map.set(p.id, JSON.parse(JSON.stringify(p))));
    (overrideList || []).forEach((p) => {
      if (!p || !p.id) return;
      const cur = map.get(p.id) || {};
      map.set(p.id, deepMerge(cur, p));
    });
    return Array.from(map.values());
  }

  function deepMerge(a, b) {
    const out = Array.isArray(a) ? [...a] : { ...a };
    for (const k of Object.keys(b)) {
      const bv = b[k];
      const av = a[k];
      if (bv && typeof bv === 'object' && !Array.isArray(bv) && bv !== null && typeof av === 'object' && av !== null && !Array.isArray(av)) {
        out[k] = deepMerge(av, bv);
      } else if (bv !== undefined) out[k] = bv;
    }
    return out;
  }

  function cardHtml(p) {
    const href = `product.html?id=${encodeURIComponent(p.id)}`;
    return `
      <div class="product-card reveal-up card-tilt" data-product-id="${esc(p.id)}">
        <div class="product-img-wrapper"><a href="${href}"><img src="${esc(p.image)}" alt="" class="product-img"></a></div>
        <div class="product-info">
          <h3 data-en="${esc(p.names.en)}" data-am="${esc(p.names.am)}">${esc(p.names.en)}</h3>
          <p class="product-price">${esc(p.price)} ETB</p>
          <a href="${href}" style="text-decoration:underline" data-en="Details" data-am="ዝርዝሮች">Details</a>
        </div>
        <button type="button" class="btn-quick-add" aria-label="Add to basket">+</button>
      </div>`;
  }

  window.Catalog = {
    products: [],

    async load() {
      let base = { products: [] };
      try {
        const res = await fetch('data/products.json', { cache: 'no-store' });
        if (res.ok) base = await res.json();
      } catch (_) {}

      let merged = base.products || [];
      try {
        const raw = localStorage.getItem(OVERRIDE_KEY);
        if (raw) {
          const o = JSON.parse(raw);
          if (o && Array.isArray(o.products)) merged = mergeById(merged, o.products);
        }
      } catch (_) {}

      this.products = merged;
      return this.products;
    },

    getById(id) {
      return this.products.find((p) => p.id === id) || null;
    },

    renderIntoGrid(container, predicate) {
      if (!container) return;
      const list = predicate ? this.products.filter(predicate) : this.products;
      container.innerHTML = list.map((p) => cardHtml(p)).join('');
      container.classList.add('reveal-stagger');
      Array.from(container.children).forEach((child, i) => {
        child.style.transitionDelay = `${i * 80}ms`;
      });
    },

    renderFeatured(container) {
      this.renderIntoGrid(container, (p) => p.featured);
    },

    renderAll(container) {
      this.renderIntoGrid(container);
    },

    renderBestSellers(container) {
      if (!container) return;
      const list = this.products.filter((p) => p.bestSeller);
      container.innerHTML = list
        .map((p) => {
          const href = `product.html?id=${encodeURIComponent(p.id)}`;
          return `<a href="${href}" class="h-scroll-item"><img src="${esc(p.image)}" alt="" style="width:100%; height:200px; object-fit:cover; border-radius:8px"></a>`;
        })
        .join('');
    },

    hydrateProductPage(root) {
      if (!root) return;
      const params = new URLSearchParams(window.location.search);
      let id = params.get('id');
      if (!id && this.products.length) id = this.products[0].id;
      const p = this.getById(id);
      if (!p) {
        root.innerHTML =
          '<p class="product-missing-msg" data-en="Product not found." data-am="ምርቱ አልተገኘም።">Product not found.</p>' +
          '<p><a href="shop.html" data-en="Back to shop" data-am="ወደ ሱቅ ይመለሱ">Back to shop</a></p>';
        return;
      }

      document.title = `${p.names.en} | Shegye Baltna`;

      const lang = document.documentElement.lang || 'en';
      const L = (o) => (o && (lang === 'am' ? o.am : o.en)) || '';

      root.innerHTML = `
        <div class="product-detail-layout product-card" style="margin-top:120px">
          <div class="product-detail-img reveal-left">
            <img src="${esc(p.image)}" alt="" class="product-img">
          </div>
          <div class="product-detail-info reveal-right">
            <div style="display:flex; align-items:center; gap:0.5rem; color:var(--clr-gold); margin-bottom:1rem">
              <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
              <span style="color:#888; font-size:0.9rem" data-en="(124 reviews)" data-am="(124 ግምገማዎች)">(124 reviews)</span>
            </div>
            <h1 class="display" style="font-size: 3rem; color: var(--clr-espresso);" data-en="${esc(p.names.en)}" data-am="${esc(p.names.am)}">${esc(p.names.en)}</h1>
            <p style="font-size: 1.5rem; color: var(--clr-berbere); margin: 1rem 0; font-weight: bold;" class="product-price">${esc(p.price)} ETB</p>
            <p style="font-size: 1.1rem; line-height: 1.6; color: #555; margin-bottom: 2rem;" data-en="${esc(p.description.en)}" data-am="${esc(p.description.am)}">${esc(L(p.description))}</p>
            <div style="display:flex; gap:1rem; margin-bottom: 3rem; align-items: center; flex-wrap: wrap;">
              <label class="visually-hidden" for="product-qty" data-en="Quantity" data-am="ብዛት">Quantity</label>
              <input type="number" id="product-qty" class="product-qty-input" value="1" min="1" max="99" aria-describedby="product-qty-hint">
              <span id="product-qty-hint" class="visually-hidden" data-en="Number of units to add" data-am="የሚጨመሩ ብዛት">Number of units to add</span>
              <button type="button" class="btn-primary btn-magnetic btn-quick-add" style="flex:1" data-en="Add to Basket" data-am="ወደ ቅርጫት አክል">Add to Basket</button>
            </div>
            <div class="accordion">
              <div class="accordion-item">
                <button type="button" class="accordion-header">
                  <span data-en="Ingredients" data-am="ንጥረ ነገሮች">Ingredients</span>
                  <span class="accordion-icon">+</span>
                </button>
                <div class="accordion-content">
                  <p data-en="${esc(p.ingredients.en)}" data-am="${esc(p.ingredients.am)}">${esc(L(p.ingredients))}</p>
                </div>
              </div>
              <div class="accordion-item">
                <button type="button" class="accordion-header">
                  <span data-en="Culinary uses" data-am="የምግብ አጠቃቀም">Culinary uses</span>
                  <span class="accordion-icon">+</span>
                </button>
                <div class="accordion-content">
                  <p data-en="${esc(p.culinary.en)}" data-am="${esc(p.culinary.am)}">${esc(L(p.culinary))}</p>
                </div>
              </div>
              <div class="accordion-item">
                <button type="button" class="accordion-header">
                  <span data-en="Shipping" data-am="ማጓጓዣ">Shipping</span>
                  <span class="accordion-icon">+</span>
                </button>
                <div class="accordion-content">
                  <p data-en="${esc(p.shipping.en)}" data-am="${esc(p.shipping.am)}">${esc(L(p.shipping))}</p>
                </div>
              </div>
            </div>
          </div>
        </div>`;
    },
  };
})();
