/**
 * cart-shopify.js
 * Shopify-aware cart drawer (vanilla JS) — uses Shopify AJAX Cart API
 *
 * Expects:
 *  - #cartButton (button toggles drawer)
 *  - #cartCount (badge)
 *  - #cartBackdrop
 *  - #cartPanel
 *  - #cartItems (container rendered by JS)
 *  - #cartSubtotal
 *  - #cartCloseBtn, #checkoutBtn, #viewCartBtn
 *
 * How it works:
 *  - fetchCart() reads /cart.js and renders the drawer
 *  - addToCart(variantId, qty) posts to /cart/add.js then refreshes
 *  - updateItem(variantId, qty) posts to /cart/update.js then refreshes
 *  - remove sets qty = 0 via updateItem
 *
 * Install:
 *  - put this in assets and include in theme.liquid: <script src="{{ 'cart-shopify.js' | asset_url }}" defer></script>
 */

(function () {
  'use strict';

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  // DOM refs
  const cartButton = $('#cartButton');
  const cartCountEl = $('#cartCount');
  const backdrop = $('#cartBackdrop');
  const panel = $('#cartPanel');
  const closeBtn = $('#cartCloseBtn');
  const itemsContainer = $('#cartItems');
  const subtotalEl = $('#cartSubtotal');
  const checkoutBtn = $('#checkoutBtn');
  const viewCartBtn = $('#viewCartBtn');
  const cartEmptyEl = $('#cartEmpty');

  if (!cartButton || !panel || !backdrop || !itemsContainer) {
    // Required markup not present — nothing to initialize.
    return;
  }

  let lastFocused = null;
  let inFlight = false;

  // Utility: format cents to currency string using cartCurrency (fallback to EUR)
  function formatMoney(cents, currency) {
    const c = currency || 'EUR';
    const value = (cents / 100).toFixed(2);
    // Simple symbol mapping (extend if needed)
    const symbols = { EUR: '€', GBP: '£', USD: '$' };
    const symbol = symbols[c] || '';
    return symbol + value;
  }

  function isOpen() {
    return panel.classList.contains('open');
  }

  function setAriaOpen(open) {
    cartButton.setAttribute('aria-expanded', String(open));
    panel.setAttribute('aria-hidden', String(!open));
  }

  function openCart() {
    if (isOpen()) return;
    lastFocused = document.activeElement;
    panel.classList.add('open');
    backdrop.classList.add('open');
    setAriaOpen(true);
    const focusable = getFocusable(panel);
    if (focusable.length) focusable[0].focus();
    document.addEventListener('keydown', onKeyDown);
    trapTabKey(panel);
  }

  function closeCart() {
    if (!isOpen()) return;
    panel.classList.remove('open');
    backdrop.classList.remove('open');
    setAriaOpen(false);
    document.removeEventListener('keydown', onKeyDown);
    releaseTrap();
    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
  }

  // Toggle
  cartButton.addEventListener('click', function (e) {
    e.preventDefault();
    if (isOpen()) closeCart();
    else {
      fetchCart().then(openCart).catch(openCart);
    }
  });

  closeBtn && closeBtn.addEventListener('click', closeCart);
  backdrop.addEventListener('click', closeCart);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' || e.key === 'Esc') closeCart();
  });

  // Fetch current cart JSON and render
  async function fetchCart() {
    try {
      const res = await fetch('/cart.js', { credentials: 'same-origin' });
      if (!res.ok) throw new Error('Failed to fetch cart');
      const cart = await res.json();
      renderCart(cart);
      return cart;
    } catch (err) {
      console.error('fetchCart error', err);
      throw err;
    }
  }

  // Add item (variantId numeric)
  async function addToCart(variantId, quantity = 1) {
    if (inFlight) return;
    inFlight = true;
    try {
      const body = new URLSearchParams({ id: String(variantId), quantity: String(quantity) });
      const res = await fetch('/cart/add.js', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
        body: body.toString()
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error('Add to cart failed: ' + txt);
      }
      await fetchCart();
      openCart();
    } catch (err) {
      console.error(err);
    } finally {
      inFlight = false;
    }
  }

  // Update quantities by variant id (Shopify expects updates[variant_id]=qty)
  async function updateItem(variantId, quantity) {
    if (inFlight) return;
    inFlight = true;
    try {
      const body = new URLSearchParams();
      body.append(`updates[${variantId}]`, String(quantity));
      const res = await fetch('/cart/update.js', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
        body: body.toString()
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error('Update cart failed: ' + txt);
      }
      await fetchCart();
    } catch (err) {
      console.error(err);
    } finally {
      inFlight = false;
    }
  }

  // Render cart JSON into the drawer
  function renderCart(cart) {
    // Empty container
    itemsContainer.innerHTML = '';

    if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
      cartEmptyEl && (cartEmptyEl.style.display = 'block');
      subtotalEl && (subtotalEl.textContent = formatMoney(cart ? cart.total_price : 0, cart ? cart.currency : 'EUR'));
      cartCountEl && (cartCountEl.style.display = 'none');
      return;
    }

    cartEmptyEl && (cartEmptyEl.style.display = 'none');

    // Build items
    cart.items.forEach(item => {
      const el = document.createElement('div');
      el.className = 'cart-item';
      el.setAttribute('data-variant-id', item.variant_id);
      el.setAttribute('data-line', String(item.key || item.variant_id));
      el.setAttribute('data-price', String(item.price)); // price in cents for single unit

      // item.image might be null, use placeholder if needed
      const imgSrc = item.image || (item.featured_image && item.featured_image.src) || '';
      const imageHTML = imgSrc ? `<img src="${imgSrc}" alt="${escapeHtml(item.title)}"/>` : `<div style="width:72px;height:72px;background:#f3f3f3;border-radius:6px;"></div>`;

      const variantTitle = item.variant_title && item.variant_title !== 'Default Title' ? `<div class="item-meta">${escapeHtml(item.variant_title)}</div>` : '';
      const linePrice = item.line_price || item.price * item.quantity; // cents

      el.innerHTML = `
        ${imageHTML}
        <div class="item-info">
          <div class="item-title">${escapeHtml(item.title)}</div>
          ${variantTitle}
          <div class="item-actions">
            <input class="qty-input" type="number" min="0" value="${item.quantity}" aria-label="Quantity for ${escapeHtml(item.title)}" />
            <button class="btn-small remove-item" data-variant-id="${item.variant_id}" aria-label="Remove ${escapeHtml(item.title)}">Remove</button>
            <div class="item-price" aria-hidden="true">${formatMoney(linePrice, cart.currency)}</div>
          </div>
        </div>
      `;
      itemsContainer.appendChild(el);
    });

    // Subtotal and badge
    subtotalEl && (subtotalEl.textContent = formatMoney(cart.total_price, cart.currency));
    const qtyTotal = cart.item_count || cart.items.reduce((s, i) => s + i.quantity, 0);
    if (cartCountEl) {
      cartCountEl.textContent = qtyTotal > 0 ? String(qtyTotal) : '';
      cartCountEl.style.display = qtyTotal > 0 ? 'inline-block' : 'none';
    }
  }

  // Event delegation for quantity input & remove buttons
  itemsContainer.addEventListener('input', function (e) {
    const target = e.target;
    if (target && target.classList.contains('qty-input')) {
      // sanitize: allow 0 to remove
      let v = parseInt(target.value, 10);
      if (Number.isNaN(v) || v < 0) v = 0;
      target.value = v;
      const itemEl = target.closest('.cart-item');
      if (itemEl) {
        const variantId = itemEl.getAttribute('data-variant-id');
        // defer call a little to let typing finish (simple debounce)
        debounceUpdate(variantId, v);
      }
    }
  });

  // remove button
  itemsContainer.addEventListener('click', function (e) {
    const target = e.target;
    if (target && target.classList.contains('remove-item')) {
      const variantId = target.getAttribute('data-variant-id');
      if (variantId) updateItem(variantId, 0);
    }
  });

  // Simple debounce for quantity updates
  const _updateTimers = {};
  function debounceUpdate(variantId, qty, delay = 350) {
    if (_updateTimers[variantId]) clearTimeout(_updateTimers[variantId]);
    _updateTimers[variantId] = setTimeout(() => {
      updateItem(variantId, qty);
      delete _updateTimers[variantId];
    }, delay);
  }

  // Hooks for header buttons
  checkoutBtn && checkoutBtn.addEventListener('click', function () {
    // Replace with your checkout URL
    window.location.href = '/checkout';
  });

  viewCartBtn && viewCartBtn.addEventListener('click', function () {
    window.location.href = '/cart';
  });

  // Utility: escape HTML
  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, function (m) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m];
    });
  }

  // Focus helpers (same as previous)
  function getFocusable(container) {
    return Array.from(
      container.querySelectorAll(
        'a[href], button:not([disabled]), textarea, input:not([type="hidden"]):not([disabled]), select, [tabindex]:not([tabindex="-1"])'
      )
    ).filter(el => !el.hasAttribute('disabled') && el.offsetParent !== null);
  }

  let _trapHandler = null;
  function trapTabKey(modal) {
    const focusable = getFocusable(modal);
    if (!focusable.length) return;
    _trapHandler = function (e) {
      if (e.key !== 'Tab') return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    modal.addEventListener('keydown', _trapHandler);
  }

  function releaseTrap() {
    if (!_trapHandler) return;
    panel.removeEventListener('keydown', _trapHandler);
    _trapHandler = null;
  }

  function onKeyDown(e) {
    if (e.key === 'Escape' || e.key === 'Esc') closeCart();
  }

  // Initial load: render current cart and bind delegated add-to-cart for product buttons
  (function init() {
    fetchCart().catch(() => { /* ignore */ });

    // Delegated handler for "Add to cart" buttons:
    // Buttons should have class "add-to-cart" and data-variant-id attribute.
    document.addEventListener('click', function (e) {
      const btn = e.target.closest && e.target.closest('.add-to-cart');
      if (!btn) return;
      e.preventDefault();
      const variantId = btn.getAttribute('data-variant-id') || btn.getAttribute('data-variant');
      const qty = parseInt(btn.getAttribute('data-quantity') || '1', 10) || 1;
      if (variantId) addToCart(variantId, qty);
    });
  })();

  // Public API for other theme scripts
  window.NUA_Cart = {
    add: addToCart,
    update: updateItem,
    fetch: fetchCart,
    open: () => fetchCart().then(openCart).catch(openCart),
    close: closeCart
  };

})();