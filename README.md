# Shegye Baltna

Static memorial site and Ethiopian spice shop for **Shegye Baltna**. Pages are plain HTML with shared styles (`index.css`), cart/checkout behavior (`app.js`), and a JSON-driven product catalog (`catalog.js` + `data/products.json`).

## Running locally

Serve the folder over HTTP so `fetch('data/products.json')` works (opening `index.html` as a `file://` URL may block catalog loading in some browsers).

```bash
# Python 3
python -m http.server 8080

# Node (npx)
npx serve .
```

Then open `http://localhost:8080` (or the port shown).

## Project layout

| Path | Role |
|------|------|
| `index.html` | Home hero + featured products (`#catalog-featured`) |
| `story.html` | Memorial story |
| `shop.html` | Full catalog grid (`#catalog-grid`) + best sellers strip |
| `product.html?id=<sku>` | Product detail (filled by `catalog.js`) |
| `cart.html` / `checkout.html` | Basket and checkout (cart in `localStorage`) |
| `contact.html` | Contact form |
| `admin.html` | Optional catalog editor (PIN protected; see below) |
| `app.js` | Language toggle, cart drawer, animations, forms, checkout |
| `catalog.js` | Load/merge catalog JSON and render product UI |
| `data/products.json` | Canonical product list |
| `index.css` | Global styles |

Home uses `body.nav-over-media` for a transparent nav over the hero; other pages use a solid nav bar for readability.

## Product catalog

- Source of truth: **`data/products.json`** (`products` array). Each item has at least: `id`, `price`, `image`, `featured`, `bestSeller`, `names` (`en` / `am`), and localized blocks such as `description`, `ingredients`, `culinary`, `shipping`.
- **Featured** items appear on the home page; **`bestSeller`** drives the horizontal strip on the shop page.
- Links use stable IDs, e.g. `product.html?id=berbere`.

### Browser-only overrides

Edits from **`admin.html`** can be saved to **`localStorage`** under `shegye_products_catalog`. Those entries merge with `data/products.json` on load for that browser only.

### Publishing catalog changes for everyone

1. Edit `data/products.json` in the repo, **or** use `admin.html` → **Download JSON** after editing.
2. Replace `data/products.json` in the project and deploy.

There is no server-side database; GitHub Pages and similar hosts only serve static files.

## Admin page (`admin.html`)

- Default PIN is set in **`admin.html`** (search for `ADMIN_PIN`). **Change it** before sharing or deploying if the admin URL might be discovered.
- Unlock is stored in **`sessionStorage`** for the tab session.
- **`meta robots`** is set to **noindex** to discourage casual indexing; this is not a substitute for a strong PIN or hiding the URL.

## Language

English / አማርኛ toggle persists via **`localStorage`** (`shegye_lang`). Copy uses `data-en` / `data-am` attributes where bilingual strings are defined.

## Cart

Cart payload is in **`localStorage`** (`shegye_cart`). Line items reference catalog **`id`** values. Clearing site data resets the basket.

## License / credits

Content and branding belong to the project owners. Update this section if you add a formal license.
