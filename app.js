document.addEventListener('DOMContentLoaded', () => {
  init();
});

function init() {
  setupLanguage();
  setupCursor();
  setupNav();
  setupAnimations();
  revealHero();
  setupCart();
  setupCheckout();
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
          
          // Staggered fade in
          const texts = document.querySelectorAll(`[data-${currentLang}]`);
          texts.forEach((el, i) => {
            el.style.opacity = '0';
            setTimeout(() => {
              el.style.transition = 'opacity 0.5s';
              el.style.opacity = '1';
            }, 50 * i);
          });

          setTimeout(() => {
            overlay.classList.remove('sweep-out');
          }, 500);
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
  const elements = document.querySelectorAll('[data-en][data-am]');
  elements.forEach(el => {
    el.textContent = el.getAttribute(`data-${currentLang}`);
  });
}

function updateToggleUI() {
  const toggle = document.querySelector('.lang-toggle');
  if (toggle) {
    if (currentLang === 'am') {
      toggle.classList.add('am-active');
    } else {
      toggle.classList.remove('am-active');
    }
  }
}

/* --- ANIMATION MODULE --- */
function setupAnimations() {
  // Scroll reveals
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.reveal-up, .reveal-left, .reveal-right, .reveal-scale').forEach(el => {
    observer.observe(el);
  });

  // Stagger children
  document.querySelectorAll('.reveal-stagger').forEach(parent => {
    Array.from(parent.children).forEach((child, i) => {
      child.style.transitionDelay = `${i * 100}ms`;
    });
  });

  // Parallax
  window.addEventListener('scroll', () => {
    const scrolled = window.scrollY;
    document.querySelectorAll('[data-parallax]').forEach(el => {
      const speed = el.getAttribute('data-parallax') || 0.4;
      el.style.transform = `translateY(${scrolled * speed}px)`;
    });
  });

  // Magnetic Buttons
  document.querySelectorAll('.btn-magnetic').forEach(btn => {
    btn.addEventListener('mousemove', e => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      btn.style.transform = `translate(${x * 0.3}px, ${y * 0.3}px)`;
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'translate(0, 0)';
    });
  });

  // Tilt Cards
  document.querySelectorAll('.card-tilt').forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const xRot = ((y - rect.height/2) / rect.height) * 15;
      const yRot = ((x - rect.width/2) / rect.width) * -15;
      card.style.transform = `perspective(800px) rotateX(${xRot}deg) rotateY(${yRot}deg)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(800px) rotateX(0) rotateY(0)';
    });
  });

  // Horizontal scroll observer
  const hObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if(entry.isIntersecting) {
        entry.target.classList.add('centered');
      } else {
        entry.target.classList.remove('centered');
      }
    });
  }, { root: document.querySelector('.h-scroll-strip'), threshold: 0.6 });

  document.querySelectorAll('.h-scroll-item').forEach(item => hObserver.observe(item));
}

function revealHero() {
  const loadingScreen = document.querySelector('.loading-screen');
  if (!loadingScreen) return; // Not on home page

  // Split headline
  const headline = document.querySelector('.hero-content h1');
  if (headline) {
    const textEN = headline.getAttribute('data-en');
    const textAM = headline.getAttribute('data-am');
    const currentText = currentLang === 'en' ? textEN : textAM;
    headline.innerHTML = '';
    currentText.split('').forEach(c => {
      const span = document.createElement('span');
      span.className = 'char';
      span.innerHTML = c === ' ' ? '&nbsp;' : c;
      headline.appendChild(span);
    });
  }

  // Sequence
  setTimeout(() => {
    document.querySelector('.loading-logo')?.classList.add('show');
  }, 100);

  const loadingChars = document.querySelectorAll('.loading-char');
  loadingChars.forEach((c, i) => {
    setTimeout(() => c.classList.add('show'), 600 + (i * 50));
  });

  setTimeout(() => {
    loadingScreen.classList.add('hidden');
    setTimeout(() => {
      // Reveal headline chars
      document.querySelectorAll('.char').forEach((c, i) => {
        setTimeout(() => c.classList.add('revealed'), i * 40);
      });
      // Reveal subtitle
      setTimeout(() => {
        document.querySelector('.hero-subtitle')?.classList.add('revealed');
        document.querySelector('.scroll-indicator').style.opacity = '1';
      }, 800);
    }, 700);
  }, 2500);

  // Skip loading on click
  document.addEventListener('click', () => {
    if(!loadingScreen.classList.contains('hidden')) {
      loadingScreen.classList.add('hidden');
      document.querySelectorAll('.char').forEach(c => c.classList.add('revealed'));
      document.querySelector('.hero-subtitle')?.classList.add('revealed');
      document.querySelector('.scroll-indicator').style.opacity = '1';
    }
  }, {once:true});
}

function setupCursor() {
  if (window.matchMedia("(max-width: 768px)").matches) return;

  const dot = document.createElement('div');
  dot.className = 'cursor-dot';
  const ring = document.createElement('div');
  ring.className = 'cursor-ring';
  document.body.appendChild(dot);
  document.body.appendChild(ring);

  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let ringX = mouseX;
  let ringY = mouseY;

  window.addEventListener('mousemove', e => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    dot.style.transform = `translate(calc(${mouseX}px - 50%), calc(${mouseY}px - 50%))`;
    
    // Trail particles if over hero or shop
    if (Math.random() > 0.8) {
      createParticle(mouseX, mouseY);
    }
  });

  const render = () => {
    ringX += (mouseX - ringX) * 0.15;
    ringY += (mouseY - ringY) * 0.15;
    ring.style.transform = `translate(calc(${ringX}px - 50%), calc(${ringY}px - 50%))`;
    requestAnimationFrame(render);
  };
  requestAnimationFrame(render);

  document.querySelectorAll('a, button, .lang-toggle, .product-card').forEach(el => {
    el.addEventListener('mouseenter', () => ring.classList.add('active'));
    el.addEventListener('mouseleave', () => ring.classList.remove('active'));
  });
}

function createParticle(x, y) {
  const p = document.createElement('div');
  p.className = 'spice-particle';
  p.style.left = x + 'px';
  p.style.top = y + 'px';
  document.body.appendChild(p);

  const angle = Math.random() * Math.PI * 2;
  const radius = Math.random() * 20 + 10;
  const targetX = x + Math.cos(angle) * radius;
  const targetY = y + Math.sin(angle) * radius;

  p.style.transform = `translate(${Math.cos(angle)*radius}px, ${Math.sin(angle)*radius}px)`;
  
  setTimeout(() => { p.style.opacity = '0'; }, 50);
  setTimeout(() => { p.remove(); }, 650);
}

/* --- NAV MODULE --- */
function setupNav() {
  const nav = document.querySelector('.nav');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 80) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
    
    const indicator = document.querySelector('.scroll-indicator');
    if(indicator && window.scrollY > 100) indicator.style.opacity = '0';
  });
}

function setupPageTransitions() {
  document.querySelectorAll('a[href]:not([target="_blank"]):not([href^="#"])').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const href = link.getAttribute('href');
      const overlay = document.createElement('div');
      overlay.className = 'page-overlay';
      document.body.appendChild(overlay);
      
      // Force reflow
      void overlay.offsetWidth;
      overlay.classList.add('active');
      
      setTimeout(() => {
        window.location.href = href;
      }, 500);
    });
  });
}

/* --- CART MODULE --- */
let cart = JSON.parse(localStorage.getItem('shegye_cart')) || [];

function setupCart() {
  syncBadge();

  document.querySelectorAll('.btn-quick-add').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      const card = btn.closest('.product-card');
      const name = card.querySelector('[data-en]').getAttribute('data-en');
      const priceStr = card.querySelector('.product-price').textContent;
      const price = parseFloat(priceStr.replace(/[^0-9.]/g, ''));
      const img = card.querySelector('.product-img').src;

      addToCart({id: name, name, price, img, qty: 1});
      
      // Fly animation
      const imgClone = card.querySelector('.product-img').cloneNode();
      const rect = card.querySelector('.product-img').getBoundingClientRect();
      const cartIcon = document.querySelector('.cart-icon').getBoundingClientRect();
      
      imgClone.style.position = 'fixed';
      imgClone.style.top = rect.top + 'px';
      imgClone.style.left = rect.left + 'px';
      imgClone.style.width = rect.width + 'px';
      imgClone.style.height = rect.height + 'px';
      imgClone.style.borderRadius = '8px';
      imgClone.style.zIndex = '10000';
      imgClone.style.transition = 'all 0.8s cubic-bezier(0.2, 0.8, 0.2, 1)';
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
        const badge = document.querySelector('.cart-badge');
        badge.classList.add('bump');
        setTimeout(() => badge.classList.remove('bump'), 300);
      }, 800);
    });
  });

  if(document.getElementById('cart-items-list')) renderCart();
}

function addToCart(item) {
  const existing = cart.find(i => i.id === item.id);
  if(existing) existing.qty++;
  else cart.push(item);
  saveCart();
}

function removeFromCart(id, rowEl) {
  cart = cart.filter(i => i.id !== id);
  saveCart();
  if(rowEl) {
    rowEl.style.transition = 'all 0.4s ease';
    rowEl.style.opacity = '0';
    rowEl.style.height = '0';
    rowEl.style.padding = '0';
    rowEl.style.margin = '0';
    setTimeout(() => {
      rowEl.remove();
      calcTotals();
    }, 400);
  }
}

function updateQty(id, qty) {
  const item = cart.find(i => i.id === id);
  if(item) {
    item.qty = Math.max(1, qty);
    saveCart();
    renderCart(); // simple re-render for now
  }
}

function saveCart() {
  localStorage.setItem('shegye_cart', JSON.stringify(cart));
  syncBadge();
}

function syncBadge() {
  const badges = document.querySelectorAll('.cart-badge');
  const count = cart.reduce((sum, item) => sum + item.qty, 0);
  badges.forEach(b => {
    b.textContent = count;
    b.style.display = count > 0 ? 'flex' : 'none';
  });
}

function renderCart() {
  const list = document.getElementById('cart-items-list');
  if(!list) return;
  list.innerHTML = '';
  
  if(cart.length === 0) {
    list.innerHTML = '<p data-en="Your basket is empty." data-am="ቅርጫትዎ ባዶ ነው።">Your basket is empty.</p>';
    applyLanguage();
    calcTotals();
    return;
  }

  cart.forEach((item, index) => {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.style.gap = '1rem';
    row.style.marginBottom = '1rem';
    row.style.paddingBottom = '1rem';
    row.style.borderBottom = '1px solid #ddd';
    row.className = 'reveal-up reveal-stagger';
    
    row.innerHTML = `
      <img src="${item.img}" style="width:80px; height:80px; object-fit:cover; border-radius:8px;">
      <div style="flex:1">
        <h4>${item.name}</h4>
        <div style="color:var(--clr-berbere)">${item.price.toFixed(2)} ETB</div>
      </div>
      <div style="display:flex; align-items:center; gap:10px;">
        <button onclick="updateQty('${item.id}', ${item.qty-1})" style="padding:5px 10px; border:1px solid #ccc; background:none">-</button>
        <span>${item.qty}</span>
        <button onclick="updateQty('${item.id}', ${item.qty+1})" style="padding:5px 10px; border:1px solid #ccc; background:none">+</button>
      </div>
      <div style="font-weight:bold; min-width:80px; text-align:right;">${(item.price * item.qty).toFixed(2)} ETB</div>
      <button class="remove-btn" style="background:none; border:none; color:red; font-size:1.5rem; cursor:pointer">&times;</button>
    `;
    
    row.querySelector('.remove-btn').addEventListener('click', () => removeFromCart(item.id, row));
    list.appendChild(row);
  });
  calcTotals();
}

function calcTotals() {
  const sub = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const ship = sub > 0 ? 10 : 0;
  const tax = sub * 0.025;
  const total = sub + ship + tax;

  const subEl = document.getElementById('cart-subtotal');
  const shipEl = document.getElementById('cart-shipping');
  const taxEl = document.getElementById('cart-tax');
  const totalEl = document.getElementById('cart-total');

  if(subEl) subEl.textContent = sub.toFixed(2) + ' ETB';
  if(shipEl) shipEl.textContent = ship.toFixed(2) + ' ETB';
  if(taxEl) taxEl.textContent = tax.toFixed(2) + ' ETB';
  if(totalEl) totalEl.textContent = total.toFixed(2) + ' ETB';
}

/* --- CHECKOUT MODULE --- */
function setupCheckout() {
  const nextBtns = document.querySelectorAll('.btn-next');
  const prevBtns = document.querySelectorAll('.btn-prev');
  let currentStep = 1;

  function showStep(step) {
    document.querySelectorAll('.checkout-step').forEach(el => {
      el.style.display = 'none';
      el.style.opacity = '0';
      el.style.transform = 'translateX(50px)';
    });
    const active = document.getElementById(`step-${step}`);
    if(active) {
      active.style.display = 'block';
      setTimeout(() => {
        active.style.opacity = '1';
        active.style.transform = 'translateX(0)';
        active.style.transition = 'all 0.5s ease';
      }, 50);
    }
    
    // Progress bar
    const bar = document.querySelector('.progress-fill');
    if(bar) bar.style.width = ((step-1)/2 * 100) + '%';
  }

  nextBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      // Validation on step 2
      if(currentStep === 2) {
        const input = document.querySelector('input[type="text"]');
        if(!input.value) {
          input.parentElement.style.animation = 'shake 0.4s';
          setTimeout(() => input.parentElement.style.animation = '', 400);
          return;
        }
      }
      if(currentStep < 3) {
        currentStep++;
        showStep(currentStep);
        if(currentStep === 3) showSuccess();
      }
    });
  });

  prevBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if(currentStep > 1) {
        currentStep--;
        showStep(currentStep);
      }
    });
  });

  if(document.getElementById('step-1')) showStep(1);
}

function showSuccess() {
  const container = document.getElementById('step-3');
  for(let i=0; i<30; i++) {
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
}
