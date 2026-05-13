function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderAdminDashboard(messages, orders) {
  const docLinks = (documents) => {
    if (!documents || typeof documents !== 'object') return '—';
    const entries = Object.entries(documents).filter(([, file]) => file);
    if (!entries.length) return '—';
    const items = entries.map(([label, file]) => {
      if (typeof file === 'string') {
        return `<li><span class="file-label">${escapeHtml(label)}</span><span class="file-meta">${escapeHtml(file)}</span></li>`;
      }
      if (!file.relativePath) {
        return `<li><span class="file-label">${escapeHtml(label)}</span><span class="file-meta">${escapeHtml(file.originalName || 'uploaded')}</span></li>`;
      }
      const fileUrl = `/${encodeURI(file.relativePath)}`;
      return `<li>
        <span class="file-label">${escapeHtml(label)}</span>
        <a href="${fileUrl}" target="_blank" rel="noreferrer">View</a>
        <a href="${fileUrl}" download>Download</a>
      </li>`;
    }).join('');
    return `<ul class="file-list">${items}</ul>`;
  };

  const messageRows = messages
    .slice()
    .reverse()
    .map((message) => {
      const createdAt = new Date(message.createdAt).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
      const isRead = Boolean(message.readAt);
      const statusPill = isRead
        ? '<span class="row-pill read">Read</span>'
        : '<span class="row-pill unread">Unread</span>';

      return `
        <tr class="${isRead ? 'row-read' : 'row-unread'}">
          <td>${escapeHtml(createdAt)}</td>
          <td>${statusPill}</td>
          <td>${escapeHtml(message.companyName || message.company || message.name || '—')}</td>
          <td><a href="mailto:${escapeHtml(message.email)}">${escapeHtml(message.email)}</a></td>
          <td>${escapeHtml(message.phoneNumber || message.phone || '—')}</td>
          <td>${escapeHtml(message.mcNumber || '—')}</td>
          <td>${escapeHtml(Array.isArray(message.preferredStates) ? message.preferredStates.join(', ') : '—')}</td>
          <td>${docLinks(message.documents)}</td>
          <td>
            <div class="admin-actions">
              <form method="post" action="/admin/messages/${encodeURIComponent(message.id)}/read">
                <button type="submit" ${isRead ? 'disabled' : ''}>Mark as read</button>
              </form>
              <form method="post" action="/admin/messages/${encodeURIComponent(message.id)}/delete" onsubmit="return confirm('Delete this submission and uploaded files?');">
                <button type="submit" class="danger">Delete</button>
              </form>
            </div>
          </td>
        </tr>`;
    })
    .join('');

  const orderRows = orders
    .slice()
    .reverse()
    .map((order) => {
      const createdAt = new Date(order.createdAt).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
      const status = order.status || 'pending';
      const proof = order.payment?.proof;
      const proofHtml = proof?.relativePath
        ? `<a href="/${encodeURI(proof.relativePath)}" target="_blank" rel="noreferrer">View</a>`
        : '—';

      return `
        <tr>
          <td>${escapeHtml(createdAt)}</td>
          <td><span class="pill status-${escapeHtml(status)}">${escapeHtml(status)}</span></td>
          <td>${escapeHtml(order.user?.name || '—')}</td>
          <td><a href="mailto:${escapeHtml(order.user?.email || '')}">${escapeHtml(order.user?.email || '—')}</a></td>
          <td>${escapeHtml(order.user?.phone || '—')}</td>
          <td>${escapeHtml(order.totals?.total ? `${order.totals.total} ETB` : '—')}</td>
          <td>${escapeHtml(order.payment?.status || 'pending')}</td>
          <td>${proofHtml}</td>
          <td>
            <div class="admin-actions">
              <form method="post" action="/admin/orders/${encodeURIComponent(order.id)}/status">
                <input type="hidden" name="status" value="approved" />
                <button type="submit" ${status === 'approved' ? 'disabled' : ''}>Approve</button>
              </form>
              <form method="post" action="/admin/orders/${encodeURIComponent(order.id)}/status">
                <input type="hidden" name="status" value="denied" />
                <button type="submit" class="danger" ${status === 'denied' ? 'disabled' : ''}>Deny</button>
              </form>
            </div>
          </td>
        </tr>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en-US">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex, nofollow" />
  <title>Admin | Shegye Baltna</title>
  <link rel="stylesheet" href="/assets/css/index.css" />
  <style>
    body.admin-page { cursor: auto; }
    .admin-wrap { max-width: 1200px; margin: 0 auto; padding: 110px 1.5rem 4rem; }
    .admin-panel { background: var(--clr-parchment); border: 1px solid var(--clr-gold-light); border-radius: 12px; padding: 1.75rem; margin-top: 1rem; box-shadow: 0 8px 30px rgba(44,24,16,0.06); }
    .admin-hint { color: #555; line-height: 1.65; margin: 0.75rem 0 1.25rem; font-size: 0.95rem; }
    .admin-tabs { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; border-bottom: 2px solid var(--clr-gold-light); flex-wrap: wrap; }
    .tab-btn { padding: 0.75rem 1.5rem; background: none; border: none; border-bottom: 3px solid transparent; cursor: pointer; font-weight: 600; color: var(--clr-espresso); transition: all 0.3s ease; }
    .tab-btn:hover { background: rgba(44,24,16,0.05); }
    .tab-btn.active { border-bottom-color: var(--clr-gold); color: var(--clr-gold); }
    .tab-content { display: none; }
    .tab-content.active { display: block; }

    textarea.admin-json { width: 100%; min-height: 380px; font-family: ui-monospace, Consolas, monospace; font-size: 13px; line-height: 1.45; padding: 1rem; border-radius: 8px; border: 1px solid rgba(44,24,16,0.2); background: #fff; color: var(--clr-espresso); }
    .admin-actions { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-top: 1.25rem; align-items: center; }

    .product-form { margin-bottom: 2rem; }
    .product-form h3 { color: var(--clr-espresso); margin-bottom: 1rem; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem; }
    .form-group { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1rem; }
    .form-group label { font-weight: 600; color: var(--clr-espresso); }
    .form-group input, .form-group textarea { padding: 0.75rem; border: 1px solid rgba(44,24,16,0.2); border-radius: 8px; font-family: inherit; font-size: 0.95rem; }
    .form-group input:focus, .form-group textarea:focus { outline: none; border-color: var(--clr-gold); box-shadow: 0 0 0 3px rgba(212,175,55,0.1); }
    .form-group small { color: #666; font-size: 0.85rem; }
    .form-actions { display: flex; gap: 1rem; margin-top: 1.5rem; flex-wrap: wrap; }
    .image-input-group { display: flex; gap: 0.5rem; align-items: center; }
    .image-input-group input { flex: 1; }
    #image-preview img { max-width: 200px; max-height: 150px; border-radius: 8px; border: 1px solid rgba(44,24,16,0.2); }

    .product-list { margin-top: 2rem; }
    .product-list h3 { color: var(--clr-espresso); margin-bottom: 1rem; }
    #products-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1rem; }
    .product-card { background: white; border: 1px solid rgba(44,24,16,0.1); border-radius: 8px; padding: 1rem; position: relative; }
    .product-card h4 { color: var(--clr-espresso); margin-bottom: 0.5rem; }
    .product-card .price { color: var(--clr-gold); font-weight: 600; margin-bottom: 0.5rem; }
    .product-card .product-id { color: #666; font-size: 0.85rem; margin-bottom: 0.5rem; }
    .product-card .badges { display: flex; gap: 0.5rem; margin-bottom: 0.75rem; }
    .badge { padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600; }
    .badge.featured { background: var(--clr-gold-light); color: var(--clr-espresso); }
    .badge.bestseller { background: var(--clr-gold); color: white; }
    .product-card .actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .product-card button { padding: 0.5rem 1rem; border: none; border-radius: 4px; cursor: pointer; font-size: 0.85rem; }
    .edit-btn { background: var(--clr-gold-light); color: var(--clr-espresso); }
    .delete-btn { background: #dc3545; color: white; }
    .product-card button:hover { opacity: 0.8; }

    .table-wrap { background: #fff; border: 1px solid rgba(44,24,16,0.12); border-radius: 16px; overflow: auto; }
    table { width: 100%; border-collapse: collapse; min-width: 1050px; }
    th { text-align: left; background: rgba(44,24,16,0.03); padding: 1.15rem 1rem; font-weight: 700; color: var(--clr-espresso); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid var(--clr-gold-light); }
    td { padding: 1rem; border-bottom: 1px solid rgba(44,24,16,0.06); vertical-align: middle; font-size: 0.9rem; }
    tr:last-child td { border-bottom: none; }
    tr:hover { background: rgba(44,24,16,0.02); }

    .row-unread { background: rgba(212,175,55,0.04); }
    .row-pill { padding: 0.35rem 0.7rem; border-radius: 20px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; }
    .row-pill.read { background: #e0e0e0; color: #666; }
    .row-pill.unread { background: var(--clr-gold); color: white; }

    .pill { padding: 0.4rem 0.8rem; border-radius: 20px; font-size: 0.8rem; font-weight: 600; display: inline-block; }
    .status-approved { background: #d4edda; color: #155724; }
    .status-denied { background: #f8d7da; color: #721c24; }
    .status-pending { background: #fff3cd; color: #856404; }

    .file-list { list-style: none; padding: 0; margin: 0; font-size: 0.85rem; }
    .file-list li { margin-bottom: 0.4rem; border-bottom: 1px solid #eee; padding-bottom: 0.4rem; }
    .file-list li:last-child { border-bottom: none; margin-bottom: 0; }
    .file-label { display: block; font-weight: 600; font-size: 0.7rem; text-transform: uppercase; color: #888; }
    .file-meta { color: #555; word-break: break-all; }
    .file-list a { display: inline-block; margin-right: 0.75rem; color: var(--clr-gold); text-decoration: none; font-weight: 600; }
    .file-list a:hover { text-decoration: underline; }

    .admin-actions form { display: inline-block; }
    .admin-actions button { padding: 0.5rem 0.85rem; border-radius: 6px; border: 1px solid rgba(44,24,16,0.2); background: white; cursor: pointer; font-size: 0.8rem; font-weight: 600; transition: all 0.2s ease; }
    .admin-actions button:hover:not(:disabled) { background: var(--clr-gold); color: white; border-color: var(--clr-gold); }
    .admin-actions button.danger:hover { background: #dc3545; color: white; border-color: #dc3545; }
    .admin-actions button:disabled { opacity: 0.5; cursor: not-allowed; }
  </style>
</head>
<body class="admin-page">
  <nav class="nav" style="background: var(--clr-espresso);">
    <a href="/" class="nav-logo">
      <img src="/assets/images/logo.jpg" alt="Shegye Baltna Logo">
      <span>Shegye Baltna</span>
    </a>
    <div style="flex: 1;"></div>
    <a href="/" class="nav-link" style="color:white">Back to site</a>
  </nav>

  <main class="admin-wrap">
    <h1 class="display" style="color: var(--clr-espresso); font-size: 2.5rem;">Admin Control Center</h1>
    <p class="admin-hint">Manage orders, product inventory, and customer messages from this dashboard.</p>

    <div class="admin-tabs">
      <button class="tab-btn active" onclick="showTab('messages')">Messages</button>
      <button class="tab-btn" onclick="showTab('orders')">Orders</button>
      <button class="tab-btn" onclick="showTab('products')">Products</button>
    </div>

    <div id="messages" class="tab-content active">
      <div class="admin-panel">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
          <h2 style="color: var(--clr-espresso);">Customer Messages</h2>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Status</th>
                <th>Sender</th>
                <th>Email</th>
                <th>Phone</th>
                <th>MC#</th>
                <th>States</th>
                <th>Documents</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${messageRows || '<tr><td colspan="9" style="text-align:center; padding:3rem;">No messages found.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div id="orders" class="tab-content">
      <div class="admin-panel">
        <h2 style="color: var(--clr-espresso); margin-bottom:1.5rem;">Order Management</h2>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Status</th>
                <th>Customer</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Proof</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${orderRows || '<tr><td colspan="9" style="text-align:center; padding:3rem;">No orders found.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div id="products" class="tab-content">
      <div class="admin-panel">
        <h2 style="color: var(--clr-espresso); margin-bottom:1.5rem;">Inventory Manager</h2>
        
        <div class="product-form">
          <h3 id="form-title">Add New Product</h3>
          <form id="product-form" enctype="multipart/form-data" method="POST" action="/api/products">
            <input type="hidden" name="id" id="prod-id" />
            
            <div class="form-row">
              <div class="form-group">
                <label>Name (English)</label>
                <input type="text" name="name-en" id="prod-name-en" required />
              </div>
              <div class="form-group">
                <label>Name (Amharic)</label>
                <input type="text" name="name-am" id="prod-name-am" required />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Price (ETB)</label>
                <input type="number" name="price" id="prod-price" required />
              </div>
              <div class="form-group">
                <label>Product Image</label>
                <div class="image-input-group">
                  <input type="file" name="image-file" id="prod-image-file" accept="image/*" onchange="previewImage(this)" />
                  <input type="text" name="image" id="prod-image-path" placeholder="Or manual path" />
                </div>
                <div id="image-preview" style="margin-top:0.5rem; display:none;">
                   <img src="" alt="Preview" />
                </div>
              </div>
            </div>

            <div class="form-row">
               <div class="form-group">
                  <label><input type="checkbox" name="featured" id="prod-featured" /> Featured Product</label>
               </div>
               <div class="form-group">
                  <label><input type="checkbox" name="bestseller" id="prod-bestseller" /> Bestseller</label>
               </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Short Description (EN)</label>
                <textarea name="short-desc-en" id="prod-short-desc-en" rows="2"></textarea>
              </div>
              <div class="form-group">
                <label>Short Description (AM)</label>
                <textarea name="short-desc-am" id="prod-short-desc-am" rows="2"></textarea>
              </div>
            </div>

            <div class="form-group">
              <label>Full Description (EN)</label>
              <textarea name="desc-en" id="prod-desc-en" rows="3"></textarea>
            </div>
            
            <div class="form-group">
              <label>Ingredients (EN)</label>
              <input type="text" name="ingredients-en" id="prod-ingredients-en" />
            </div>

            <div class="form-actions">
              <button type="submit" class="btn-primary" style="padding: 0.85rem 2rem;">Save Product</button>
              <button type="button" onclick="resetProductForm()" style="padding: 0.85rem 1rem;">Clear</button>
            </div>
          </form>
        </div>

        <hr style="opacity:0.1; margin: 2rem 0;" />

        <div class="product-list">
          <h3>Existing Products</h3>
          <div id="products-grid">Loading...</div>
        </div>
      </div>
    </div>
  </main>

  <script>
    function showTab(tabId) {
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.getElementById(tabId).classList.add('active');
      document.querySelector('[onclick="showTab(\\''+tabId+'\\')"]').classList.add('active');
      
      const url = new URL(window.location);
      url.searchParams.set('tab', tabId);
      window.history.pushState({}, '', url);

      if(tabId === 'products') loadProducts();
    }

    // Tab persistence
    const params = new URLSearchParams(window.location.search);
    const initialTab = params.get('tab') || 'messages';
    showTab(initialTab);

    async function loadProducts() {
      const grid = document.getElementById('products-grid');
      try {
        const res = await fetch('/products');
        const data = await res.json();
        const products = data.products || [];
        
        if (products.length === 0) {
          grid.innerHTML = '<p>No products found.</p>';
          return;
        }

        grid.innerHTML = products.map(p => \`
          <div class="product-card">
            <div class="product-id">ID: \${p.id}</div>
            <h4>\${p.names.en}</h4>
            <div class="price">\${p.price} ETB</div>
            <div class="badges">
               \${p.featured ? '<span class="badge featured">Featured</span>' : ''}
               \${p.bestSeller ? '<span class="badge bestseller">Bestseller</span>' : ''}
            </div>
            <div class="actions">
              <button class="edit-btn" onclick="editProduct('\${p.id}')">Edit</button>
              <form method="POST" action="/api/products/delete" style="display:inline;" onsubmit="return confirm('Delete \${p.names.en}?');">
                 <input type="hidden" name="id" value="\${p.id}" />
                 <button type="submit" class="delete-btn">Delete</button>
              </form>
            </div>
          </div>
        \`).join('');
      } catch (err) {
        grid.innerHTML = '<p>Error loading products.</p>';
      }
    }

    let allProducts = [];
    async function editProduct(id) {
       const res = await fetch('/products');
       const data = await res.json();
       const p = data.products.find(item => item.id === id);
       if (!p) return;

       document.getElementById('form-title').innerText = 'Edit Product: ' + p.names.en;
       document.getElementById('prod-id').value = p.id;
       document.getElementById('prod-name-en').value = p.names.en;
       document.getElementById('prod-name-am').value = p.names.am;
       document.getElementById('prod-price').value = p.price;
       document.getElementById('prod-image-path').value = p.image;
       document.getElementById('prod-featured').checked = p.featured;
       document.getElementById('prod-bestseller').checked = p.bestSeller;
       document.getElementById('prod-short-desc-en').value = p.shortDescription.en;
       document.getElementById('prod-short-desc-am').value = p.shortDescription.am;
       document.getElementById('prod-desc-en').value = p.description.en;
       document.getElementById('prod-ingredients-en').value = p.ingredients.en;
       
       window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function resetProductForm() {
       document.getElementById('product-form').reset();
       document.getElementById('prod-id').value = '';
       document.getElementById('form-title').innerText = 'Add New Product';
       document.getElementById('image-preview').style.display = 'none';
    }

    function previewImage(input) {
      if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
          const preview = document.getElementById('image-preview');
          preview.querySelector('img').src = e.target.result;
          preview.style.display = 'block';
        }
        reader.readAsDataURL(input.files[0]);
      }
    }
  </script>
</body>
</html>`;
}

module.exports = {
  renderAdminDashboard,
};
