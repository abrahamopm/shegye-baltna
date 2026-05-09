document.addEventListener('DOMContentLoaded', () => {
  init();
});

function init() {
  setupLanguage();
  setupCursor();
  setupNav();
  setupAnimations();
  revealHero();
  setupGlobalCartDrawer();
  setupAccordions();
  setupCheckoutFlow();
  setupPageTransitions();
}

/* --- LANGUAGE MODULE --- */
let currentLang = localStorage.getItem('shegye_lang') || 'en';

function setupLanguage() {
  const toggle = document.querySelector('.lang-toggle');
  if (toggle) {
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
    // Check if element contains input or is input
    if(el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.placeholder = el.getAttribute(`data-${currentLang}`);
    } else {
        el.textContent = el.getAttribute(`data-${currentLang}`);
    }
  });
}

function updateToggleUI() {
  const toggle = document.querySelector('.lang-toggle');
  if (toggle) toggle.classList.toggle('am-active', currentLang === 'am');
}

/* --- ANIMATION MODULE --- */
function setupAnimations() {
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

  document.querySelectorAll('.btn-magnetic').forEach(btn => {
    btn.addEventListener('mousemove', e => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      btn.style.transform = `translate(${x * 0.3}px, ${y * 0.3}px)`;
    });
    btn.addEventListener('mouseleave', () => btn.style.transform = 'translate(0, 0)');
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
  if (window.matchMedia("(max-width: 768px)").matches) return;
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
  window.addEventListener('scroll', () => nav.classList.toggle('scrolled', window.scrollY > 80));
}

function setupPageTransitions() {
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

function setupGlobalCartDrawer() {
  // Inject drawer HTML if it doesn't exist
  if (!document.querySelector('.cart-drawer')) {
    const drawerHTML = `
      <div class="cart-drawer-overlay"></div>
      <div class="cart-drawer">
        <div class="cart-drawer-header">
          <h2 data-en="Your Basket" data-am="ቅርጫትዎ">Your Basket</h2>
          <button class="cart-drawer-close">&times;</button>
        </div>
        <div class="cart-drawer-body" id="drawer-items"></div>
        <div class="cart-drawer-footer">
          <div class="summary-line"><span data-en="Subtotal" data-am="ንዑስ ድምር">Subtotal</span><span id="drawer-subtotal">0 ETB</span></div>
          <a href="checkout.html" class="btn-primary btn-magnetic" style="width:100%" data-en="Proceed to Checkout" data-am="ወደ ክፍያ ይቀጥሉ">Proceed to Checkout</a>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', drawerHTML);
    applyLanguage(); // apply to newly injected html
  }

  syncBadge();

  document.querySelector('.cart-icon').addEventListener('click', (e) => {
    e.preventDefault();
    toggleCartDrawer(true);
  });

  document.querySelector('.cart-drawer-close').addEventListener('click', () => toggleCartDrawer(false));
  document.querySelector('.cart-drawer-overlay').addEventListener('click', () => toggleCartDrawer(false));

  document.querySelectorAll('.btn-quick-add').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      const card = btn.closest('.product-card');
      const name = card.querySelector('h3').getAttribute('data-en');
      const priceStr = card.querySelector('.product-price').textContent;
      const price = parseFloat(priceStr.replace(/[^0-9.]/g, ''));
      const img = card.querySelector('.product-img').src;

      addToCart({id: name, name, price, img, qty: 1});
      
      const imgClone = card.querySelector('.product-img').cloneNode();
      const rect = card.querySelector('.product-img').getBoundingClientRect();
      const cartIcon = document.querySelector('.cart-icon').getBoundingClientRect();
      
      imgClone.style.cssText = `position:fixed; top:${rect.top}px; left:${rect.left}px; width:${rect.width}px; height:${rect.height}px; border-radius:8px; z-index:10000; transition:all 0.8s cubic-bezier(0.2,0.8,0.2,1);`;
      document.body.appendChild(imgClone);

      setTimeout(() => {
        imgClone.style.top = cartIcon.top + 'px';
        imgClone.style.left = cartIcon.left + 'px';
        imgClone.style.width = '20px';
        imgClone.style.height = '20px';
        imgClone.style.opacity = '0';
        imgClone.style.borderRadius = '50%';
      }, 10);

      setTimeout(() => {
        imgClone.remove();
        document.querySelector('.cart-badge').classList.add('bump');
        setTimeout(() => document.querySelector('.cart-badge').classList.remove('bump'), 300);
        toggleCartDrawer(true);
      }, 800);
    });
  });
}

function toggleCartDrawer(show) {
  if(show) renderDrawerItems();
  document.querySelector('.cart-drawer').classList.toggle('open', show);
  document.querySelector('.cart-drawer-overlay').classList.toggle('open', show);
  document.body.style.overflow = show ? 'hidden' : '';
}

function addToCart(item) {
  const existing = cart.find(i => i.id === item.id);
  if(existing) existing.qty += item.qty || 1;
  else cart.push(item);
  saveCart();
}

function removeFromCart(id, rowEl) {
  cart = cart.filter(i => i.id !== id);
  saveCart();
  if(rowEl) {
    rowEl.style.opacity = '0';
    setTimeout(() => { rowEl.remove(); calcDrawerTotals(); }, 300);
  }
}

// Make globally available for inline onclicks in drawer
window.updateDrawerQty = function(id, qty) {
  const item = cart.find(i => i.id === id);
  if(item) {
    item.qty = Math.max(1, qty);
    saveCart();
    renderDrawerItems();
  }
};
window.removeDrawerItem = function(id, el) { removeFromCart(id, el.closest('.drawer-item')); };

function saveCart() {
  localStorage.setItem('shegye_cart', JSON.stringify(cart));
  syncBadge();
}

function syncBadge() {
  const count = cart.reduce((sum, item) => sum + item.qty, 0);
  document.querySelectorAll('.cart-badge').forEach(b => {
    b.textContent = count;
    b.style.display = count > 0 ? 'flex' : 'none';
  });
}

function renderDrawerItems() {
  const list = document.getElementById('drawer-items');
  if(!list) return;
  
  if(cart.length === 0) {
    list.innerHTML = `<p style="text-align:center; margin-top:2rem; color:#888" data-en="Your basket is empty." data-am="ቅርጫትዎ ባዶ ነው።">${currentLang==='en'?'Your basket is empty.':'ቅርጫትዎ ባዶ ነው።'}</p>`;
    calcDrawerTotals();
    return;
  }

  list.innerHTML = cart.map(item => `
    <div class="drawer-item" style="display:flex; gap:1rem; margin-bottom:1.5rem; transition:opacity 0.3s">
      <img src="${item.img}" style="width:70px; height:70px; object-fit:cover; border-radius:8px">
      <div style="flex:1">
        <h4 style="margin-bottom:0.2rem">${item.name}</h4>
        <div style="color:var(--clr-berbere); margin-bottom:0.5rem">${item.price.toFixed(2)} ETB</div>
        <div style="display:flex; align-items:center; gap:10px">
          <button onclick="updateDrawerQty('${item.id}', ${item.qty-1})" style="width:25px;height:25px; border:1px solid #ccc; background:none; cursor:none">-</button>
          <span>${item.qty}</span>
          <button onclick="updateDrawerQty('${item.id}', ${item.qty+1})" style="width:25px;height:25px; border:1px solid #ccc; background:none; cursor:none">+</button>
        </div>
      </div>
      <button onclick="removeDrawerItem('${item.id}', this)" style="background:none; border:none; color:#888; cursor:none; font-size:1.2rem">&times;</button>
    </div>
  `).join('');
  
  calcDrawerTotals();
  if(typeof renderCheckoutSummary === 'function') renderCheckoutSummary();
}

function calcDrawerTotals() {
  const sub = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const subEl = document.getElementById('drawer-subtotal');
  if(subEl) subEl.textContent = sub.toFixed(2) + ' ETB';
}

/* --- ACCORDION MODULE --- */
function setupAccordions() {
  document.querySelectorAll('.accordion-header').forEach(header => {
    header.addEventListener('click', () => {
      const item = header.parentElement;
      const content = header.nextElementSibling;
      const isActive = item.classList.contains('active');
      
      // Close all
      document.querySelectorAll('.accordion-item').forEach(i => {
        i.classList.remove('active');
        i.querySelector('.accordion-content').style.maxHeight = null;
      });
      
      if (!isActive) {
        item.classList.add('active');
        content.style.maxHeight = content.scrollHeight + "px";
      }
    });
  });
}

/* --- CHECKOUT FLOW MODULE --- */
function setupCheckoutFlow() {
  if(!document.getElementById('checkout-flow-container')) return;

  renderCheckoutSummary();

  const steps = document.querySelectorAll('.checkout-step-panel');
  
  window.nextCheckoutStep = function(currentStepNum) {
    // Basic validation
    if(currentStepNum === 1) {
      const inputs = steps[0].querySelectorAll('input[required]');
      let valid = true;
      inputs.forEach(i => { if(!i.value) { i.parentElement.style.animation = 'shake 0.4s'; setTimeout(()=>i.parentElement.style.animation='', 400); valid = false; }});
      if(!valid) return;
    }

    steps.forEach(s => s.classList.remove('active'));
    steps[currentStepNum].classList.add('active');
  };

  window.completeOrder = function() {
    steps.forEach(s => s.classList.remove('active'));
    document.getElementById('checkout-success').classList.add('active');
    
    // Confetti
    const container = document.getElementById('checkout-success').querySelector('.checkout-step-content');
    for(let i=0; i<40; i++) {
      const c = document.createElement('div');
      c.className = 'confetti';
      c.style.left = Math.random() * 100 + '%';
      c.style.top = Math.random() * 100 + '%';
      c.style.backgroundColor = Math.random() > 0.5 ? 'var(--clr-gold)' : 'var(--clr-berbere)';
      const x = (Math.random() - 0.5) * 200;
      const y = (Math.random() - 0.5) * 200;
      c.style.animation = `float 1s ease-out forwards`;
      c.style.transform = `translate(${x}px, ${y}px) rotate(${Math.random()*360}deg)`;
      container.appendChild(c);
    }
    
    // Clear cart
    cart = [];
    saveCart();
  };
}

function renderCheckoutSummary() {
  const list = document.getElementById('checkout-summary-items');
  if(!list) return;
  
  if(cart.length === 0) {
    list.innerHTML = `<p data-en="Basket is empty" data-am="ቅርጫት ባዶ ነው">${currentLang==='en'?'Basket is empty':'ቅርጫት ባዶ ነው'}</p>`;
    document.getElementById('checkout-sub').textContent = '0 ETB';
    document.getElementById('checkout-ship').textContent = '0 ETB';
    document.getElementById('checkout-tax').textContent = '0 ETB';
    document.getElementById('checkout-total').textContent = '0 ETB';
    return;
  }

  list.innerHTML = cart.map(item => `
    <div style="display:flex; justify-content:space-between; margin-bottom:1rem; font-size:0.9rem">
      <span>${item.qty}x ${item.name}</span>
      <span>${(item.price * item.qty).toFixed(2)} ETB</span>
    </div>
  `).join('');

  const sub = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const ship = 10;
  const tax = sub * 0.025;
  document.getElementById('checkout-sub').textContent = sub.toFixed(2) + ' ETB';
  document.getElementById('checkout-ship').textContent = ship.toFixed(2) + ' ETB';
  document.getElementById('checkout-tax').textContent = tax.toFixed(2) + ' ETB';
  document.getElementById('checkout-total').textContent = (sub+ship+tax).toFixed(2) + ' ETB';
}
