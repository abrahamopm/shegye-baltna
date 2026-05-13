document.documentElement.classList.add('js-animations');

let currentLang = localStorage.getItem('shegye_lang') || 'en';
const scrollLocks = new Set();

function getPageType() {
  return document.body?.dataset.pageType || 'brand';
}

function isCommercePage() {
  return getPageType() === 'commerce';
}

function setScrollLock(reason, locked) {
  if (!reason) return;
  if (locked) scrollLocks.add(reason);
  else scrollLocks.delete(reason);
  document.body?.classList.toggle('is-scroll-locked', scrollLocks.size > 0);
}

document.addEventListener('DOMContentLoaded', async () => {
  if (window.Catalog) await Catalog.load();
  init();
});

function init() {
  setupSkipLink();
  setupLanguage();
  setupCatalogPages();
  setupCursor();
  setupNav();
  setupMobileNav();
  setupAnimations();
  revealHero();
  setupToastRegion();
  setupGlobalCartDrawer();
  setupCartPage();
  setupShopToolbar();
  setupAccordions();
  setupCheckoutFlow();
  setupContactForm();
  setupNewsletter();
  setupPageTransitions();
}

function setupCatalogPages() {
  if (!window.Catalog) return;
  const shopGrid = document.getElementById('catalog-grid');
  const featured = document.getElementById('catalog-featured');
  const bestStrip = document.getElementById('catalog-best-sellers');
  const productRoot = document.getElementById('product-root');

  if (shopGrid) Catalog.renderAll(shopGrid);
  if (featured) Catalog.renderFeatured(featured);
  if (bestStrip) Catalog.renderBestSellers(bestStrip);
  if (productRoot) Catalog.hydrateProductPage(productRoot);

  if (shopGrid || featured || bestStrip || productRoot) applyLanguage();
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function showToast(message, variant = 'info') {
  const host = document.getElementById('toast-region');
  if (!host) return;
  const t = document.createElement('div');
  t.className = `toast toast--${variant}`;
  t.setAttribute('role', 'status');
  t.textContent = message;
  host.appendChild(t);
  requestAnimationFrame(() => t.classList.add('toast--visible'));
  setTimeout(() => {
    t.classList.remove('toast--visible');
    setTimeout(() => t.remove(), 400);
  }, 4200);
}

function setupToastRegion() {
  if (document.getElementById('toast-region')) return;
  const el = document.createElement('div');
  el.id = 'toast-region';
  el.className = 'toast-region';
  el.setAttribute('aria-live', 'polite');
  el.setAttribute('aria-relevant', 'additions');
  document.body.appendChild(el);
}

function setupSkipLink() {
  if (document.querySelector('.skip-link')) return;
  const target = document.getElementById('main-content');
  if (!target) return;
  const a = document.createElement('a');
  a.className = 'skip-link';
  a.href = '#main-content';
  a.setAttribute('data-en', 'Skip to main content');
  a.setAttribute('data-am', 'ወደ ዋና ይዘት ይዝለሉ');
  a.textContent = currentLang === 'en' ? a.getAttribute('data-en') : a.getAttribute('data-am');
  document.body.insertBefore(a, document.body.firstChild);
}

/* --- LANGUAGE MODULE --- */

function setupLanguage() {
  const toggle = document.querySelector('.lang-toggle');
  if (toggle) {
    toggle.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggle.click();
      }
    });
    toggle.addEventListener('click', () => {
      currentLang = currentLang === 'en' ? 'am' : 'en';
      localStorage.setItem('shegye_lang', currentLang);
      
      const overlay = document.querySelector('.page-overlay');
      if (overlay) {
        overlay.classList.add('active');
        setTimeout(() => {
          applyLanguage();
          updateToggleUI();
          overlay.classList.remove('active');
          overlay.classList.add('sweep-out');
          
          const texts = document.querySelectorAll(`[data-${currentLang}]`);
          texts.forEach((el, i) => {
            el.style.opacity = '0';
            setTimeout(() => { el.style.transition = 'opacity 0.5s'; el.style.opacity = '1'; }, 50 * i);
          });
          setTimeout(() => overlay.classList.remove('sweep-out'), 500);
        }, 500);
      } else {
        applyLanguage();
        updateToggleUI();
      }
    });
  }
  applyLanguage();
  updateToggleUI();
}

function applyLanguage() {
  document.documentElement.lang = currentLang;
  document.querySelectorAll('[data-en][data-am]').forEach(el => {
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      el.placeholder = el.getAttribute(`data-${currentLang}`);
    } else if (el.tagName === 'OPTION') {
      el.textContent = el.getAttribute(`data-${currentLang}`);
    } else {
      el.textContent = el.getAttribute(`data-${currentLang}`);
    }
  });
}

function updateToggleUI() {
  const toggle = document.querySelector('.lang-toggle');
  if (toggle) {
    toggle.classList.toggle('am-active', currentLang === 'am');
    toggle.setAttribute('role', 'switch');
    toggle.setAttribute('aria-checked', currentLang === 'am' ? 'true' : 'false');
    toggle.setAttribute('aria-label', currentLang === 'en' ? 'Switch language to Amharic' : 'Switch language to English');
    toggle.tabIndex = 0;
  }
}

/* --- ANIMATION MODULE --- */
function setupAnimations() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.querySelectorAll('.reveal-up, .reveal-left, .reveal-right, .reveal-scale').forEach((el) => {
      el.classList.add('active');
    });
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('active'); });
  }, { threshold: 0.1 });

  document.querySelectorAll('.reveal-up, .reveal-left, .reveal-right, .reveal-scale').forEach(el => observer.observe(el));

  document.querySelectorAll('.reveal-stagger').forEach(parent => {
    Array.from(parent.children).forEach((child, i) => child.style.transitionDelay = `${i * 100}ms`);
  });

  window.addEventListener('scroll', () => {
    const scrolled = window.scrollY;
    document.querySelectorAll('[data-parallax]').forEach(el => {
      const speed = el.getAttribute('data-parallax') || 0.4;
      el.style.transform = `translateY(${scrolled * speed}px)`;
    });
  });

  document.querySelectorAll('.card-tilt').forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const xRot = ((e.clientY - rect.top - rect.height/2) / rect.height) * 15;
      const yRot = ((e.clientX - rect.left - rect.width/2) / rect.width) * -15;
      card.style.transform = `perspective(800px) rotateX(${xRot}deg) rotateY(${yRot}deg)`;
    });
    card.addEventListener('mouseleave', () => card.style.transform = 'perspective(800px) rotateX(0) rotateY(0)');
  });

  const hObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => entry.target.classList.toggle('centered', entry.isIntersecting));
  }, { root: document.querySelector('.h-scroll-strip'), threshold: 0.6 });

  document.querySelectorAll('.h-scroll-item').forEach(item => hObserver.observe(item));
}

function revealHero() {
  const loadingScreen = document.querySelector('.loading-screen');
  if (!loadingScreen) return; 

  const headline = document.querySelector('.hero-content h1');
  if (headline) {
    const text = headline.getAttribute(`data-${currentLang}`);
    headline.innerHTML = '';
    text.split('').forEach(c => {
      const span = document.createElement('span');
      span.className = 'char';
      span.innerHTML = c === ' ' ? '&nbsp;' : c;
      headline.appendChild(span);
    });
  }

  setTimeout(() => document.querySelector('.loading-logo')?.classList.add('show'), 100);
  document.querySelectorAll('.loading-char').forEach((c, i) => setTimeout(() => c.classList.add('show'), 600 + (i * 50)));

  setTimeout(() => {
    loadingScreen.classList.add('hidden');
    setTimeout(() => {
      document.querySelectorAll('.char').forEach((c, i) => setTimeout(() => c.classList.add('revealed'), i * 40));
      setTimeout(() => {
        document.querySelector('.hero-subtitle')?.classList.add('revealed');
        if(document.querySelector('.scroll-indicator')) document.querySelector('.scroll-indicator').style.opacity = '1';
      }, 800);
    }, 700);
  }, 2500);

  document.addEventListener('click', () => {
    if(!loadingScreen.classList.contains('hidden')) {
      loadingScreen.classList.add('hidden');
      document.querySelectorAll('.char').forEach(c => c.classList.add('revealed'));
      document.querySelector('.hero-subtitle')?.classList.add('revealed');
    }
  }, {once:true});
}

function setupCursor() {
  if (document.body.classList.contains('admin-page')) return;
  if (isCommercePage()) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (window.matchMedia("(max-width: 768px)").matches) return;
  document.body.classList.add('custom-cursor-active');
  const dot = document.createElement('div'); dot.className = 'cursor-dot';
  const ring = document.createElement('div'); ring.className = 'cursor-ring';
  document.body.appendChild(dot); document.body.appendChild(ring);
  let mouseX = window.innerWidth / 2, mouseY = window.innerHeight / 2, ringX = mouseX, ringY = mouseY;

  window.addEventListener('mousemove', e => {
    mouseX = e.clientX; mouseY = e.clientY;
    dot.style.transform = `translate(calc(${mouseX}px - 50%), calc(${mouseY}px - 50%))`;
    if (Math.random() > 0.8) createParticle(mouseX, mouseY);
  });

  const render = () => {
    ringX += (mouseX - ringX) * 0.15; ringY += (mouseY - ringY) * 0.15;
    ring.style.transform = `translate(calc(${ringX}px - 50%), calc(${ringY}px - 50%))`;
    requestAnimationFrame(render);
  };
  requestAnimationFrame(render);

  document.querySelectorAll('a, button, .lang-toggle, .product-card, input').forEach(el => {
    el.addEventListener('mouseenter', () => ring.classList.add('active'));
    el.addEventListener('mouseleave', () => ring.classList.remove('active'));
  });
}

function createParticle(x, y) {
  const p = document.createElement('div'); p.className = 'spice-particle';
  p.style.left = x + 'px'; p.style.top = y + 'px';
  document.body.appendChild(p);
  const angle = Math.random() * Math.PI * 2, radius = Math.random() * 20 + 10;
  p.style.transform = `translate(${Math.cos(angle)*radius}px, ${Math.sin(angle)*radius}px)`;
  setTimeout(() => p.style.opacity = '0', 50);
  setTimeout(() => p.remove(), 650);
}

function setupNav() {
  const nav = document.querySelector('.nav');
  if (!nav) return;
  window.addEventListener('scroll', () => nav.classList.toggle('scrolled', window.scrollY > 80));
}

function setupMobileNav() {
  const nav = document.querySelector('.nav');
  const links = nav?.querySelector('.nav-links');
  if (!nav || !links || nav.querySelector('.nav-toggle')) return;

  links.id = links.id || 'primary-navigation';

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'nav-toggle';
  btn.setAttribute('aria-expanded', 'false');
  btn.setAttribute('aria-controls', links.id);
  btn.setAttribute('data-en', 'Menu');
  btn.setAttribute('data-am', 'ሜኑ');
  btn.textContent = currentLang === 'en' ? 'Menu' : 'ሜኑ';

  const closeNav = () => {
    nav.classList.remove('nav-mobile-open');
    btn.setAttribute('aria-expanded', 'false');
    setScrollLock('nav', false);
  };

  btn.addEventListener('click', () => {
    const open = nav.classList.toggle('nav-mobile-open');
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    setScrollLock('nav', open);
  });

  nav.insertBefore(btn, links);

  links.querySelectorAll('a').forEach((a) => {
    a.addEventListener('click', closeNav);
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 900) closeNav();
  });
}

function setupPageTransitions() {
  if (isCommercePage()) return;
  document.querySelectorAll('a[href]:not([target="_blank"]):not([href^="#"]):not([href^="javascript"])').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const href = link.getAttribute('href');
      const overlay = document.createElement('div'); overlay.className = 'page-overlay active';
      document.body.appendChild(overlay);
      setTimeout(() => window.location.href = href, 500);
    });
  });
}

/* --- CART DRAWER MODULE --- */
let cart = JSON.parse(localStorage.getItem('shegye_cart')) || [];

function extractProductFromCard(btn) {
  const card = btn.closest('.product-card');
  if (!card) return null;
  const slug = card.getAttribute('data-product-id');
  const titleEl = card.querySelector('h3[data-en]') || card.querySelector('h1[data-en]');
  const priceEl = card.querySelector('.product-price');
  const imgEl = card.querySelector('.product-img');
  if (!titleEl || !priceEl || !imgEl) return null;
  const name = titleEl.getAttribute('data-en');
  const id = slug || name;
  const price = parseFloat(priceEl.textContent.replace(/[^0-9.]/g, ''));
  if (!id || !name || Number.isNaN(price)) return null;
  const qtyInput = card.querySelector('.product-qty-input');
  const qty = qtyInput ? Math.max(1, parseInt(qtyInput.value, 10) || 1) : 1;
  return { id, name, price, img: imgEl.src, qty };
}

function flyToCart(imgEl) {
  const cartIcon = document.querySelector('.cart-icon');
  if (!imgEl || !cartIcon) return;
  const rect = imgEl.getBoundingClientRect();
  const target = cartIcon.getBoundingClientRect();
  const imgClone = imgEl.cloneNode();
  imgClone.alt = '';
  imgClone.style.cssText = `position:fixed;top:${rect.top}px;left:${rect.left}px;width:${rect.width}px;height:${rect.height}px;border-radius:8px;z-index:10000;transition:all 0.8s cubic-bezier(0.2,0.8,0.2,1);pointer-events:none`;
  document.body.appendChild(imgClone);
  requestAnimationFrame(() => {
    imgClone.style.top = `${target.top}px`;
    imgClone.style.left = `${target.left}px`;
    imgClone.style.width = '20px';
    imgClone.style.height = '20px';
    imgClone.style.opacity = '0';
    imgClone.style.borderRadius = '50%';
  });
  setTimeout(() => {
    imgClone.remove();
    document.querySelectorAll('.cart-badge').forEach((b) => {
      b.classList.add('bump');
      setTimeout(() => b.classList.remove('bump'), 300);
    });
  }, 800);
}

function setupGlobalCartDrawer() {
  if (!document.querySelector('.cart-drawer')) {
    const drawerHTML = `
      <div class="cart-drawer-overlay" tabindex="-1"></div>
      <aside class="cart-drawer" aria-hidden="true" aria-labelledby="cart-drawer-title">
        <div class="cart-drawer-header">
          <h2 id="cart-drawer-title" data-en="Your Basket" data-am="ቅርጫትዎ">Your Basket</h2>
          <button type="button" class="cart-drawer-close" aria-label="Close basket">&times;</button>
        </div>
        <div class="cart-drawer-body" id="drawer-items"></div>
        <div class="cart-drawer-footer">
          <div class="summary-line"><span data-en="Subtotal" data-am="ንዑስ ድምር">Subtotal</span><span id="drawer-subtotal">0 ETB</span></div>
          <a href="cart.html" class="btn-secondary btn-magnetic cart-drawer-full-btn" style="width:100%;margin-bottom:0.75rem;" data-en="View full basket" data-am="ሙሉ ቅርጫት ይመልከቱ">View full basket</a>
          <a href="checkout.html" class="btn-primary btn-magnetic cart-drawer-checkout-btn" style="width:100%" data-en="Proceed to Checkout" data-am="ወደ ክፍያ ይቀጥሉ">Proceed to Checkout</a>
        </div>
      </aside>
    `;
    document.body.insertAdjacentHTML('beforeend', drawerHTML);
    applyLanguage();

    const drawerBody = document.getElementById('drawer-items');
    if (drawerBody && !drawerBody.dataset.delegateBound) {
      drawerBody.dataset.delegateBound = '1';
      drawerBody.addEventListener('click', (e) => {
        const row = e.target.closest('.drawer-item');
        if (!row) return;
        const id = row.getAttribute('data-cart-id');
        if (!id) return;
        if (e.target.closest('[data-drawer-dec]')) changeCartLineQty(id, -1);
        else if (e.target.closest('[data-drawer-inc]')) changeCartLineQty(id, 1);
        else if (e.target.closest('[data-drawer-remove]')) changeCartLineQty(id, -Infinity);
      });
    }

    const proceed = document.querySelector('.cart-drawer-checkout-btn');
    if (proceed && !proceed.dataset.emptyGuard) {
      proceed.dataset.emptyGuard = '1';
      proceed.addEventListener(
        'click',
        (e) => {
          if (cart.length === 0) {
            e.preventDefault();
            e.stopPropagation();
            showToast(
              currentLang === 'en'
                ? 'Your basket is empty — add something delicious first.'
                : 'ቅርጫትዎ ባዶ ነው።',
              'warning'
            );
          }
        },
        true
      );
    }
  }

  syncBadge();

  const cartIcons = document.querySelectorAll('.cart-icon');
  cartIcons.forEach((icon) => {
    icon.addEventListener('click', (e) => {
      e.preventDefault();
      toggleCartDrawer(true);
    });
  });

  const closeBtn = document.querySelector('.cart-drawer-close');
  const overlay = document.querySelector('.cart-drawer-overlay');
  const drawer = document.querySelector('.cart-drawer');
  if (closeBtn) closeBtn.addEventListener('click', () => toggleCartDrawer(false));
  if (overlay) overlay.addEventListener('click', () => toggleCartDrawer(false));

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer?.classList.contains('open')) toggleCartDrawer(false);
  });

  document.querySelectorAll('.btn-quick-add').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const data = extractProductFromCard(btn);
      if (!data) return;

      addToCart(data);
      const imgEl = btn.closest('.product-card')?.querySelector('.product-img');
      flyToCart(imgEl);

      const msg =
        currentLang === 'en'
          ? `${data.qty > 1 ? data.qty + ' × ' : ''}${data.name} added to your basket`
          : `${data.name} ወደ ቅርጫትዎ ታክሏል`;
      showToast(msg, 'success');
      toggleCartDrawer(true);
    });
  });
}

function toggleCartDrawer(show) {
  const drawer = document.querySelector('.cart-drawer');
  const overlay = document.querySelector('.cart-drawer-overlay');
  if (!drawer || !overlay) return;

  if (show) renderDrawerItems();

  drawer.classList.toggle('open', show);
  overlay.classList.toggle('open', show);
  drawer.setAttribute('aria-hidden', show ? 'false' : 'true');

  updateDrawerCheckoutState();
  setScrollLock('cart', show);
}

function addToCart(item) {
  const existing = cart.find((i) => i.id === item.id);
  const addQty = item.qty || 1;
  if (existing) existing.qty += addQty;
  else cart.push({ ...item, qty: addQty });
  saveCart();
}

function changeCartLineQty(id, delta) {
  const item = cart.find((i) => i.id === id);
  if (!item) return;
  if (delta === -Infinity) {
    cart = cart.filter((i) => i.id !== id);
  } else {
    item.qty += delta;
    if (item.qty < 1) cart = cart.filter((i) => i.id !== id);
  }
  saveCart();
  renderDrawerItems();
}

function saveCart() {
  localStorage.setItem('shegye_cart', JSON.stringify(cart));
  syncBadge();
  renderCartPageIfPresent();
  renderCheckoutSummary();
}

function syncBadge() {
  const count = cart.reduce((sum, item) => sum + item.qty, 0);
  document.querySelectorAll('.cart-badge').forEach((b) => {
    b.textContent = count;
    b.style.display = count > 0 ? 'flex' : 'none';
  });
}

function renderDrawerItems() {
  const list = document.getElementById('drawer-items');
  if (!list) return;

  if (cart.length === 0) {
    list.innerHTML = `<p class="cart-empty-hint" data-en="Your basket is empty." data-am="ቅርጫትዎ ባዶ ነው።">${currentLang === 'en' ? 'Your basket is empty.' : 'ቅርጫትዎ ባዶ ነው።'}</p>`;
    calcDrawerTotals();
    updateDrawerCheckoutState();
    return;
  }

  list.innerHTML = cart
    .map(
      (item) => `
    <div class="drawer-item" data-cart-id="${escapeHtml(item.id)}">
      <img src="${item.img.replace(/"/g, '&quot;')}" alt="" class="drawer-item-thumb" width="70" height="70">
      <div class="drawer-item-main">
        <h4 class="drawer-item-title">${escapeHtml(item.name)}</h4>
        <div class="drawer-item-price">${item.price.toFixed(2)} ETB</div>
        <div class="qty-stepper" role="group" aria-label="${escapeHtml(item.name)} quantity">
          <button type="button" class="qty-stepper-btn" data-drawer-dec aria-label="Decrease quantity">−</button>
          <span class="qty-stepper-val">${item.qty}</span>
          <button type="button" class="qty-stepper-btn" data-drawer-inc aria-label="Increase quantity">+</button>
        </div>
      </div>
      <button type="button" class="drawer-item-remove" data-drawer-remove aria-label="Remove">&times;</button>
    </div>
  `
    )
    .join('');

  calcDrawerTotals();
  updateDrawerCheckoutState();
}

function updateDrawerCheckoutState() {
  const drawer = document.querySelector('.cart-drawer');
  if (!drawer) return;
  const proceed = drawer.querySelector('.cart-drawer-checkout-btn');
  if (!proceed) return;
  const disable = cart.length === 0;
  proceed.classList.toggle('is-disabled', disable);
  proceed.setAttribute('aria-disabled', disable ? 'true' : 'false');
}

function calcDrawerTotals() {
  const sub = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const subEl = document.getElementById('drawer-subtotal');
  if (subEl) subEl.textContent = sub.toFixed(2) + ' ETB';
}

function cartTotalsDetailed() {
  const sub = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const ship = cart.length ? 10 : 0;
  const tax = sub * 0.025;
  const total = sub + ship + tax;
  return { sub, ship, tax, total };
}

function renderCartPageIfPresent() {
  const root = document.getElementById('cart-items-list');
  const subEl = document.getElementById('cart-subtotal');
  if (!root || !subEl) return;

  if (cart.length === 0) {
    root.innerHTML = `
      <div class="cart-empty-state reveal-up active">
        <p class="cart-empty-state-title" data-en="Your basket is empty" data-am="ቅርጫትዎ ባዶ ነው">${currentLang === 'en' ? 'Your basket is empty' : 'ቅርጫትዎ ባዶ ነው'}</p>
        <p class="cart-empty-state-text" data-en="Browse the spice market and tap + on any product to start." data-am="የቅመማ ገበያውን ይመልከቱ እና በማንኛውም ምርት ላይ + ይጫኑ።">${currentLang === 'en' ? 'Browse the spice market and tap + on any product to start.' : 'የቅመማ ገበያውን ይመልከቱ እና በማንኛውም ምርት ላይ + ይጫኑ።'}</p>
        <a href="shop.html" class="btn-primary btn-magnetic" data-en="Shop spices" data-am="ቅመሞችን ይግዙ">Shop spices</a>
      </div>`;
    document.getElementById('cart-subtotal').textContent = '0.00 ETB';
    document.getElementById('cart-shipping').textContent = '0.00 ETB';
    document.getElementById('cart-tax').textContent = '0.00 ETB';
    document.getElementById('cart-total').textContent = '0.00 ETB';
    const checkoutBtn = document.querySelector('.cart-summary .btn-primary');
    if (checkoutBtn) {
      checkoutBtn.classList.add('is-disabled');
      checkoutBtn.setAttribute('aria-disabled', 'true');
    }
    return;
  }

  const checkoutBtn = document.querySelector('.cart-summary .btn-primary');
  if (checkoutBtn) {
    checkoutBtn.classList.remove('is-disabled');
    checkoutBtn.removeAttribute('aria-disabled');
  }

  root.innerHTML = cart
    .map(
      (item) => `
    <div class="cart-line card-row" data-cart-id="${escapeHtml(item.id)}">
      <img src="${item.img.replace(/"/g, '&quot;')}" alt="" class="cart-line-thumb" width="96" height="96">
      <div class="cart-line-body">
        <h3 class="cart-line-title">${escapeHtml(item.name)}</h3>
        <p class="cart-line-unit">${item.price.toFixed(2)} ETB <span data-en="each" data-am="ለአንዱ">${currentLang === 'en' ? 'each' : 'ለአንዱ'}</span></p>
        <div class="qty-stepper" role="group" aria-label="${escapeHtml(item.name)}">
          <button type="button" class="qty-stepper-btn" data-cart-dec aria-label="Decrease">−</button>
          <span class="qty-stepper-val">${item.qty}</span>
          <button type="button" class="qty-stepper-btn" data-cart-inc aria-label="Increase">+</button>
        </div>
      </div>
      <div class="cart-line-meta">
        <span class="cart-line-sub">${(item.price * item.qty).toFixed(2)} ETB</span>
        <button type="button" class="cart-line-remove" data-cart-remove data-en="Remove" data-am="ያስወግዱ">${currentLang === 'en' ? 'Remove' : 'ያስወግዱ'}</button>
      </div>
    </div>`
    )
    .join('');

  root.querySelectorAll('[data-en][data-am]').forEach((el) => {
    if (el.tagName !== 'BUTTON') return;
    el.textContent = el.getAttribute(`data-${currentLang}`);
  });

  if (!root.dataset.cartDelegateBound) {
    root.dataset.cartDelegateBound = '1';
    root.addEventListener('click', (e) => {
      const row = e.target.closest('.cart-line');
      if (!row) return;
      const id = row.getAttribute('data-cart-id');
      if (!id) return;
      if (e.target.closest('[data-cart-dec]')) changeCartLineQty(id, -1);
      else if (e.target.closest('[data-cart-inc]')) changeCartLineQty(id, 1);
      else if (e.target.closest('[data-cart-remove]')) changeCartLineQty(id, -Infinity);
    });
  }

  const { sub, ship, tax, total } = cartTotalsDetailed();
  document.getElementById('cart-subtotal').textContent = sub.toFixed(2) + ' ETB';
  document.getElementById('cart-shipping').textContent = ship.toFixed(2) + ' ETB';
  document.getElementById('cart-tax').textContent = tax.toFixed(2) + ' ETB';
  document.getElementById('cart-total').textContent = total.toFixed(2) + ' ETB';
}

function setupCartPage() {
  renderCartPageIfPresent();

  const checkoutBtn = document.querySelector('.cart-summary a[href="checkout.html"]');
  if (checkoutBtn && !checkoutBtn.dataset.guardBound) {
    checkoutBtn.dataset.guardBound = '1';
    checkoutBtn.addEventListener('click', (e) => {
      if (cart.length === 0) {
        e.preventDefault();
        showToast(
          currentLang === 'en' ? 'Add items before checkout.' : 'ከመክፈልዎ በፊት እቃ ይጨምሩ።',
          'warning'
        );
      }
    });
  }
}

function setupShopToolbar() {
  const sort = document.getElementById('shop-sort');
  const grid = document.querySelector('.shop-toolbar')?.closest('section')?.querySelector('.product-grid');
  if (!sort || !grid) return;

  const originalOrder = [...grid.querySelectorAll('.product-card')];

  sort.addEventListener('change', () => {
    const cards = [...grid.querySelectorAll('.product-card')];
    const v = sort.value;
    if (v === 'default') {
      originalOrder.forEach((c) => grid.appendChild(c));
      return;
    }
    cards.sort((a, b) => {
      const pa = parseFloat(a.querySelector('.product-price')?.textContent.replace(/[^0-9.]/g, '') || 0);
      const pb = parseFloat(b.querySelector('.product-price')?.textContent.replace(/[^0-9.]/g, '') || 0);
      const na = (a.querySelector('h3')?.getAttribute('data-en') || '').toLowerCase();
      const nb = (b.querySelector('h3')?.getAttribute('data-en') || '').toLowerCase();
      if (v === 'price-asc') return pa - pb;
      if (v === 'price-desc') return pb - pa;
      if (v === 'name') return na.localeCompare(nb);
      return 0;
    });
    cards.forEach((c) => grid.appendChild(c));
  });
}

function setupContactForm() {
  const form = document.querySelector('.contact-form');
  if (!form || form.dataset.bound) return;
  form.dataset.bound = '1';

  loadFormDraft(form);

  const nameInput = form.querySelector('[name="name"]');
  const emailInput = form.querySelector('[name="email"]');
  const messageInput = form.querySelector('[name="message"]');
  const submitBtn = form.querySelector('button[type="submit"]');

  nameInput?.addEventListener('input', () => validateField(nameInput, 'name'));
  emailInput?.addEventListener('input', () => validateField(emailInput, 'email'));
  messageInput?.addEventListener('input', () => validateField(messageInput, 'message'));

  form.addEventListener('input', debounce(() => saveFormDraft(form), 500));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = nameInput?.value.trim();
    const email = emailInput?.value.trim();
    const message = messageInput?.value.trim();

    const nameValid = validateField(nameInput, 'name');
    const emailValid = validateField(emailInput, 'email');
    const messageValid = validateField(messageInput, 'message');

    if (!nameValid || !emailValid || !messageValid) {
      showToast(currentLang === 'en' ? 'Please correct the errors above.' : 'እባክዎ የላይኛውን ስህተቶች ያስተካክሉ።', 'warning');
      return;
    }

    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.innerHTML = currentLang === 'en' ? 'Sending...' : 'በማስተላለፍ ላይ...';
    submitBtn.style.opacity = '0.7';

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ name, email, message })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to send message.');
      }

      showToast(
        currentLang === 'en' ? 'Thanks — your message has been sent successfully!' : 'እናመሰግናለን — መልእክትዎ በተሳካ ሁኔታ ተልኳል!',
        'success'
      );

      form.reset();
      clearFormDraft();
      clearFieldErrors(nameInput, emailInput, messageInput);
    } catch (error) {
      const messageText = currentLang === 'en'
        ? error.message || 'Sorry, something went wrong. Please try again.'
        : 'ይቅርታ፣ ስህተት ተፈጥሯል። እባክዎ በድጋሜ ይሞክሩ።';
      showToast(messageText, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
      submitBtn.style.opacity = '1';
    }
  });
}

function validateField(field, fieldType) {
  const value = field?.value.trim();
  const formGroup = field?.closest('.form-group');
  if (!field || !formGroup) return false;

  const existingError = formGroup.querySelector('.field-error');
  if (existingError) existingError.remove();

  let isValid = true;
  let errorMessage = '';

  switch (fieldType) {
    case 'name':
      if (!value) {
        isValid = false;
        errorMessage = currentLang === 'en' ? 'Name is required' : 'ስም ግዴታ ነው';
      } else if (value.length < 2) {
        isValid = false;
        errorMessage = currentLang === 'en' ? 'Name must be at least 2 characters' : 'ስም ቢዝን ቢዝን 2 ፊደሎች መሆን አለበት';
      }
      break;
    
    case 'email':
      if (!value) {
        isValid = false;
        errorMessage = currentLang === 'en' ? 'Email is required' : 'ኢሜል ግዴታ ነው';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        isValid = false;
        errorMessage = currentLang === 'en' ? 'Enter a valid email address' : 'ትክክለኛ ኢሜል ያስገቡ';
      }
      break;
    
    case 'message':
      if (!value) {
        isValid = false;
        errorMessage = currentLang === 'en' ? 'Message is required' : 'መልእክት ግዴታ ነው';
      } else if (value.length < 10) {
        isValid = false;
        errorMessage = currentLang === 'en' ? 'Message must be at least 10 characters' : 'መልእክት ቢዝን ቢዝን 10 ፊደሎች መሆን አለበት';
      }
      break;
  }

  if (!isValid) {
    field.style.borderColor = 'var(--clr-error, #e74c3c)';
    const errorElement = document.createElement('div');
    errorElement.className = 'field-error';
    errorElement.style.cssText = 'color: var(--clr-error, #e74c3c); font-size: 0.875rem; margin-top: 0.5rem;';
    errorElement.textContent = errorMessage;
    formGroup.appendChild(errorElement);
  } else {
    field.style.borderColor = '';
  }

  return isValid;
}

function clearFieldErrors(...fields) {
  fields.forEach(field => {
    if (field) {
      field.style.borderColor = '';
      const formGroup = field.closest('.form-group');
      const error = formGroup?.querySelector('.field-error');
      if (error) error.remove();
    }
  });
}

function saveFormDraft(form) {
  const formData = {
    name: form.querySelector('[name="name"]')?.value || '',
    email: form.querySelector('[name="email"]')?.value || '',
    message: form.querySelector('[name="message"]')?.value || '',
    timestamp: Date.now()
  };
  localStorage.setItem('contactFormDraft', JSON.stringify(formData));
}

function loadFormDraft(form) {
  try {
    const draft = localStorage.getItem('contactFormDraft');
    if (draft) {
      const formData = JSON.parse(draft);
      if (Date.now() - formData.timestamp < 3600000) {
        if (form.querySelector('[name="name"]')) form.querySelector('[name="name"]').value = formData.name || '';
        if (form.querySelector('[name="email"]')) form.querySelector('[name="email"]').value = formData.email || '';
        if (form.querySelector('[name="message"]')) form.querySelector('[name="message"]').value = formData.message || '';
      }
    }
  } catch (error) {
    console.warn('Could not load form draft:', error);
  }
}

function clearFormDraft() {
  localStorage.removeItem('contactFormDraft');
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function setupNewsletter() {
  const forms = document.querySelectorAll('.newsletter-form, .footer-newsletter-form');
  forms.forEach(form => {
    if (form.dataset.bound) return;
    form.dataset.bound = '1';
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = form.querySelector('input[type="email"]');
      const email = input?.value.trim();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showToast(currentLang === 'en' ? 'Please enter a valid email.' : 'ትክክለኛ ኢሜል ያስገቡ።', 'warning');
        return;
      }
      showToast(
        currentLang === 'en' ? 'You are subscribed — welcome to the table.' : 'ተመዝግበዋል — እንኳን ደህና መጡ።',
        'success'
      );
      input.value = '';
    });
  });
}

function setupAccordions() {
  if (document.body.dataset.accordionsDelegated) return;
  document.body.dataset.accordionsDelegated = '1';
  document.body.addEventListener('click', (e) => {
    const header = e.target.closest('.accordion-header');
    if (!header) return;
    const accordionRoot = header.closest('.accordion');
    if (!accordionRoot) return;
    const item = header.parentElement;
    const content = header.nextElementSibling;
    if (!content || !content.classList.contains('accordion-content')) return;
    const isActive = item.classList.contains('active');
    accordionRoot.querySelectorAll('.accordion-item').forEach((i) => {
      i.classList.remove('active');
      const c = i.querySelector('.accordion-content');
      if (c) c.style.maxHeight = null;
    });
    if (!isActive) {
      item.classList.add('active');
      content.style.maxHeight = content.scrollHeight + 'px';
    }
  });
}

/* --- CHECKOUT FLOW MODULE --- */
function setupCheckoutFlow() {
  const root = document.querySelector('.checkout-flow-root');
  if (!root) return;

  const stepPanels = Array.from(root.querySelectorAll('.checkout-step-panel[data-step]'));
  const shippingFields = root.querySelectorAll('#fname, #femail, #faddr');
  const paymentProofInput = document.getElementById('payment-proof');
  const paymentProofName = document.getElementById('payment-proof-name');

  function flagField(field, invalid) {
    const group = field?.closest('.form-group');
    if (!group) return;
    group.classList.toggle('has-error', invalid);
    if (invalid) {
      group.style.animation = 'shake 0.4s';
      setTimeout(() => { group.style.animation = ''; }, 400);
    }
  }

  function activateCheckoutStep(stepIndex) {
    stepPanels.forEach((panel) => {
      const panelIndex = Number(panel.dataset.step);
      panel.classList.toggle('active', panelIndex === stepIndex);
      panel.classList.toggle('is-complete', panelIndex < stepIndex && panelIndex < 2);
      
      // Logical Flow: Hide previous steps entirely if we are on the Success page
      if (stepIndex === 2 && panelIndex < 2) {
        panel.style.display = 'none';
      } else {
        panel.style.display = '';
      }
    });

    // The sidebar is now hidden until the very end, or we can just keep it hidden 
    // as we've integrated the summary into the success step.
    const sidebar = document.getElementById('checkout-sidebar');
    if (sidebar) {
      // Per user request, we move the summary to "after payment is confirmed" (Step 2)
      const shouldShowSidebar = stepIndex === 2; 
      sidebar.classList.toggle('sidebar-hidden', !shouldShowSidebar);
      sidebar.classList.toggle('sidebar-visible', shouldShowSidebar);

      // Update sidebar heading to "Receipt" if on success step
      const heading = sidebar.querySelector('h3');
      if (heading) {
        if (stepIndex === 2) {
          heading.dataset.en = "Order Receipt";
          heading.dataset.am = "የትዕዛዝ ደረሰኝ";
          heading.textContent = currentLang === 'en' ? "Order Receipt" : "የትዕዛዝ ደረሰኝ";
        } else {
          heading.dataset.en = "Order Summary";
          heading.dataset.am = "የትዕዛዝ ማጠቃለያ";
          heading.textContent = currentLang === 'en' ? "Order Summary" : "የትዕዛዝ ማጠቃለያ";
        }
      }
    }

    if (stepIndex === 1) autoPopulatePaymentForm();
    root.querySelector('.checkout-flow')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }

  function validateShippingStep() {
    if (cart.length === 0) {
      showToast(currentLang === 'en' ? 'Your basket is empty. Add spices before continuing.' : 'ቅርጫትዎ ባዶ ነው።', 'warning');
      return false;
    }

    let firstInvalid = null;
    shippingFields.forEach((field) => {
      const isBlank = !field.value.trim();
      flagField(field, isBlank);
      if (isBlank && !firstInvalid) firstInvalid = field;
    });

    const emailField = document.getElementById('femail');
    if (emailField && emailField.value.trim() && !sanitizeEmail(emailField.value)) {
      flagField(emailField, true);
      if (!firstInvalid) firstInvalid = emailField;
      showToast(currentLang === 'en' ? 'Please enter a valid email.' : 'ትክክለኛ ኢሜል ያስገቡ።', 'warning');
    }

    if (firstInvalid) {
      firstInvalid.focus();
      return false;
    }
    return true;
  }

  function syncProofFileName() {
    if (!paymentProofInput || !paymentProofName) return;
    const file = paymentProofInput.files && paymentProofInput.files[0];
    paymentProofName.textContent = file ? file.name : (currentLang === 'en' ? 'No file selected' : 'ምንም ፋይል አልተመረጠም');
  }

  renderCheckoutSummary();

  shippingFields.forEach((field) => {
    field.addEventListener('input', () => flagField(field, false));
  });

  paymentProofInput?.addEventListener('change', syncProofFileName);

  root.addEventListener('click', (event) => {
    const nextButton = event.target.closest('[data-checkout-next]');
    if (nextButton) {
      if (validateShippingStep()) activateCheckoutStep(Number(nextButton.dataset.checkoutNext));
      return;
    }

    const backButton = event.target.closest('[data-checkout-back]');
    if (backButton) {
      activateCheckoutStep(Number(backButton.dataset.checkoutBack));
      return;
    }

    if (event.target.closest('[data-manual-submit]')) {
      submitManualOrder();
    }
  });

  window.completeOrder = function () {
    if (cart.length === 0) {
      showToast(currentLang === 'en' ? 'Nothing to order. Your basket is empty.' : 'ቅርጫትዎ ባዶ ነው።', 'warning');
      return;
    }

    // Capture shipping info for the receipt
    const name = document.getElementById('fname')?.value || '';
    const email = document.getElementById('femail')?.value || '';
    const address = document.getElementById('faddr')?.value || '';
    const shippingHtml = `<strong>${escapeHtml(name)}</strong><br>${escapeHtml(email)}<br>${escapeHtml(address)}`;
    
    const shippingEl = document.getElementById('receipt-shipping-info');
    if (shippingEl) shippingEl.innerHTML = shippingHtml;
    
    const dateEl = document.getElementById('receipt-date');
    if (dateEl) {
      const now = new Date();
      dateEl.textContent = now.toLocaleDateString(currentLang === 'en' ? 'en-US' : 'am-ET', { 
        year: 'numeric', month: 'long', day: 'numeric' 
      });
    }

    // Snapshot cart for the success receipt before clearing
    const cartSnapshot = [...cart];
    const totalsSnapshot = cartTotalsDetailed();

    activateCheckoutStep(2);
    renderCheckoutSummary(cartSnapshot, totalsSnapshot);

    const container = document.getElementById('checkout-success').querySelector('.checkout-step-content');
    for (let i = 0; i < 40; i++) {
      const c = document.createElement('div');
      c.className = 'confetti';
      c.style.left = Math.random() * 100 + '%';
      c.style.top = Math.random() * 100 + '%';
      c.style.backgroundColor = Math.random() > 0.5 ? 'var(--clr-gold)' : 'var(--clr-berbere)';
      const x = (Math.random() - 0.5) * 200;
      const y = (Math.random() - 0.5) * 200;
      c.style.animation = 'float 1s ease-out forwards';
      c.style.transform = `translate(${x}px, ${y}px) rotate(${Math.random() * 360}deg)`;
      container.appendChild(c);
    }

    // Clear actual cart state
    cart = [];
    saveCart();
    if (typeof syncBadge === 'function') syncBadge();
  };

  syncProofFileName();
}

function renderCheckoutSummary(itemsOverride, totalsOverride) {
  const list = document.getElementById('checkout-summary-items');
  const successList = document.getElementById('success-summary-items');
  if (!list) return;

  const items = itemsOverride || cart;
  const totals = totalsOverride || cartTotalsDetailed();

  const alertBox = document.getElementById('checkout-cart-alert');
  if (alertBox) alertBox.hidden = items.length > 0;

  document.querySelectorAll('[data-checkout-next], [data-manual-submit]').forEach((button) => {
    const disable = items.length === 0;
    button.classList.toggle('is-disabled', disable);
    button.toggleAttribute('disabled', disable);
    button.setAttribute('aria-disabled', disable ? 'true' : 'false');
  });

  if (items.length === 0) {
    const emptyMsg = `<p data-en="Basket is empty" data-am="ቅርጫት ባዶ ነው">${currentLang==='en'?'Basket is empty':'ቅርጫት ባዶ ነው'}</p>`;
    list.innerHTML = emptyMsg;
    if (successList) successList.innerHTML = emptyMsg;
    return;
  }

  const itemsHtml = items.map(item => `
    <div class="checkout-summary-item">
      <div class="checkout-summary-item-name">
        <span>${escapeHtml(item.name)}</span>
        <span class="checkout-summary-item-qty">${item.qty} ${currentLang === 'en' ? 'item(s)' : 'እቃ'}</span>
      </div>
      <span>${(item.price * item.qty).toFixed(2)} ETB</span>
    </div>
  `).join('');

  list.innerHTML = itemsHtml;
  if (successList) successList.innerHTML = itemsHtml;

  const { sub, ship, tax, total } = totals;
  
  // Sidebar totals
  const subEl = document.getElementById('checkout-sub');
  const shipEl = document.getElementById('checkout-ship');
  const taxEl = document.getElementById('checkout-tax');
  const totalEl = document.getElementById('checkout-total');
  if (subEl) subEl.textContent = sub.toFixed(2) + ' ETB';
  if (shipEl) shipEl.textContent = ship.toFixed(2) + ' ETB';
  if (taxEl) taxEl.textContent = tax.toFixed(2) + ' ETB';
  if (totalEl) totalEl.textContent = total.toFixed(2) + ' ETB';

  // Integrated totals for Payment step and Success step
  const manualTotalDisplay = document.getElementById('manual-total-display');
  const successTotalDisplay = document.getElementById('success-total-display');
  if (manualTotalDisplay) manualTotalDisplay.textContent = total.toFixed(2) + ' ETB';
  if (successTotalDisplay) successTotalDisplay.textContent = total.toFixed(2) + ' ETB';
}

function autoPopulatePaymentForm() {
  const emailElement = document.getElementById('femail');
  const paymentEmailElement = document.getElementById('payment-email');
  if (emailElement && paymentEmailElement && !paymentEmailElement.value) {
    paymentEmailElement.value = emailElement.value.trim();
  }
}

function sanitizeInput(input) {
  if (typeof input !== 'string') return '';
  return input.trim().replace(/[<>]/g, '').replace(/[\x00-\x1f\x7f]/g, '').substring(0, 500);
}

function sanitizeEmail(email) {
  const sanitized = sanitizeInput(email);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitized) ? sanitized : '';
}

function sanitizePhone(phone) {
  const sanitized = sanitizeInput(phone);
  return sanitized.replace(/[^0-9+]/g, '');
}

function getShippingDetails() {
  const fnameElement = document.getElementById('fname');
  const femailElement = document.getElementById('femail');
  const faddrElement = document.getElementById('faddr');

  if (!fnameElement || !femailElement || !faddrElement) return null;

  const fname = sanitizeInput(fnameElement.value);
  const femail = sanitizeEmail(femailElement.value);
  const faddr = sanitizeInput(faddrElement.value);

  if (!fname || !femail || !faddr) return null;

  return { full_name: fname, email: femail, address: faddr };
}

function calculateOrderTotal() {
  const sub = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const ship = cart.length ? 10 : 0;
  const tax = sub * 0.025;
  const total = sub + ship + tax;
  return { subtotal: sub, shipping: ship, tax: tax, total: total };
}

function buildOrderPayload(shippingDetails, paymentEmail, paymentPhone) {
  return {
    userId: shippingDetails.email,
    user: {
      name: shippingDetails.full_name,
      email: paymentEmail || shippingDetails.email,
      phone: paymentPhone || '',
      address: shippingDetails.address
    },
    shipping: shippingDetails,
    items: cart.map(item => ({
      id: item.id || item.name,
      name: item.name,
      price: parseFloat(item.price) || 0,
      qty: parseInt(item.qty, 10) || 0,
      total: (parseFloat(item.price) || 0) * (parseInt(item.qty, 10) || 0)
    })),
    totals: calculateOrderTotal(),
    createdAt: Date.now()
  };
}

function setButtonBusy(button, busy, fallbackLabel) {
  if (!button) return;
  if (!button.dataset.originalLabel) {
    button.dataset.originalLabel = button.textContent.trim();
  }
  button.classList.toggle('is-loading', busy);
  button.disabled = busy;
  button.setAttribute('aria-disabled', busy ? 'true' : 'false');
  button.textContent = busy
    ? (currentLang === 'en' ? 'Processing...' : 'በሂደት ላይ...')
    : (button.getAttribute(`data-${currentLang}`) || fallbackLabel || button.dataset.originalLabel);
}

async function submitManualOrder() {
  const submitButton = document.querySelector('[data-manual-submit]');
  setButtonBusy(submitButton, true, currentLang === 'en' ? 'Submit Order for Approval' : 'ለማረጋገጥ ትዕዛዝ ይላኩ');

  try {
    if (cart.length === 0) {
      showToast(currentLang === 'en' ? 'Your basket is empty.' : 'ቅርጫትዎ ባዶ ነው።', 'warning');
      return;
    }

    const shippingDetails = getShippingDetails();
    if (!shippingDetails) {
      showToast(currentLang === 'en' ? 'Please complete shipping details first.' : 'እባክዎ የማጓጓዣ ዝርዝሮችን ይሙሉ።', 'warning');
      return;
    }

    const emailElement = document.getElementById('payment-email');
    const phoneElement = document.getElementById('payment-phone');
    const proofElement = document.getElementById('payment-proof');

    const paymentEmail = emailElement ? sanitizeEmail(emailElement.value) : '';
    const paymentPhone = phoneElement ? sanitizePhone(phoneElement.value) : '';
    const proofFile = proofElement && proofElement.files ? proofElement.files[0] : null;

    if (!paymentEmail) {
      showToast(currentLang === 'en' ? 'Please enter a valid email for payment.' : 'ትክክለኛ የክፍያ ኢሜል ያስገቡ።', 'warning');
      emailElement?.focus();
      return;
    }

    if (!proofFile) {
      showToast(currentLang === 'en' ? 'Please upload your payment proof.' : 'የክፍያ ማስረጃ ያክሉ።', 'warning');
      proofElement?.focus();
      return;
    }

    const orderPayload = buildOrderPayload(shippingDetails, paymentEmail, paymentPhone);
    const formData = new FormData();
    formData.append('order', JSON.stringify(orderPayload));
    formData.append('paymentProof', proofFile);

    const response = await fetch('/api/orders', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Order submission failed.');
    }

    showToast(currentLang === 'en' ? 'Order submitted for approval.' : 'ትዕዛዝዎ ለማረጋገጥ ተልኳል።', 'success');
    completeOrder();
  } catch (error) {
    console.error('Manual order error:', error);
    showToast(currentLang === 'en' ? error.message : 'ትዕዛዝ መላክ አልተሳካም።', 'error');
  } finally {
    setButtonBusy(submitButton, false, currentLang === 'en' ? 'Submit Order for Approval' : 'ለማረጋገጥ ትዕዛዝ ይላኩ');
  }
}
