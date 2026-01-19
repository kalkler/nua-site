// Cart panel behavior (vanilla JS)
// Expects element IDs/classes:
// - #cartButton
// - #cartCount
// - #cartBackdrop
// - #cartPanel
// - #cartItems (contains .cart-item elements)
// - each .cart-item should have data-price attribute and an input.qty-input
// - #cartSubtotal, #cartCloseBtn, #checkoutBtn, #viewCartBtn, #cartEmpty

(function () {
  'use strict';

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

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
    // Required markup not present; bail out.
    return;
  }

  let lastFocused = null;

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
    // focus first focusable in panel
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

  function toggleCart() {
    if (isOpen()) closeCart();
    else openCart();
  }

  // Click handlers
  cartButton.addEventListener('click', function (e) {
    e.preventDefault();
    toggleCart();
  });

  closeBtn && closeBtn.addEventListener('click', function () {
    closeCart();
  });

  backdrop.addEventListener('click', function () {
    closeCart();
  });

  function onKeyDown(e) {
    if (e.key === 'Escape' || e.key === 'Esc') {
      closeCart();
    }
  }

  // Compute subtotal and update badge
  function updateCartTotals() {
    const itemEls = $$('.cart-item', itemsContainer);
    let qtyTotal = 0;
    let total = 0;
    itemEls.forEach(item => {
      const price = parseFloat(item.getAttribute('data-price')) || 0;
      const qtyInput = item.querySelector('.qty-input');
      const qty = Math.max(0, Number(qtyInput ? qtyInput.value : 1));
      qtyTotal += qty;
      total += price * qty;

      // Update displayed item price if you want per-line total (optional)
      const itemPriceEl = item.querySelector('.item-price');
      if (itemPriceEl) {
        itemPriceEl.textContent = formatPrice(price * qty);
      }
    });

    if (cartCountEl) {
      cartCountEl.textContent = qtyTotal > 0 ? String(qtyTotal) : '';
      // hide badge when empty
      cartCountEl.style.display = qtyTotal > 0 ? 'inline-block' : 'none';
    }

    if (subtotalEl) subtotalEl.textContent = formatPrice(total);

    // show empty message
    if (itemEls.length === 0 || qtyTotal === 0) {
      cartEmptyEl && (cartEmptyEl.style.display = 'block');
    } else {
      cartEmptyEl && (cartEmptyEl.style.display = 'none');
    }
  }

  function formatPrice(num) {
    return '€' + Number(num).toFixed(2);
  }

  // Quantity change + remove handlers (event delegation)
  itemsContainer.addEventListener('input', function (e) {
    const target = e.target;
    if (target && target.classList.contains('qty-input')) {
      // sanitize input to integer >= 1
      let v = parseInt(target.value, 10);
      if (Number.isNaN(v) || v < 1) v = 1;
      target.value = v;
      updateCartTotals();
    }
  });

  itemsContainer.addEventListener('click', function (e) {
    const target = e.target;
    if (target && target.classList.contains('remove-item')) {
      const item = target.closest('.cart-item');
      if (item) {
        item.remove();
        updateCartTotals();
      }
    }
  });

  // Checkout & View cart hooks
  checkoutBtn && checkoutBtn.addEventListener('click', function () {
    // Replace with real checkout integration if needed
    console.log('Checkout clicked');
    closeCart();
  });

  viewCartBtn && viewCartBtn.addEventListener('click', function () {
    // For static demo, you could route to /cart.html or similar
    window.location.href = '/cart';
  });

  // Utility: get focusable elements
  function getFocusable(container) {
    return Array.from(
      container.querySelectorAll(
        'a[href], button:not([disabled]), textarea, input[type="text"], input[type="number"], input[type="email"], select, [tabindex]:not([tabindex="-1"])'
      )
    ).filter(el => !el.hasAttribute('disabled') && el.offsetParent !== null);
  }

  // Focus trap (simple)
  let _trapHandler = null;
  function trapTabKey(modal) {
    const focusable = getFocusable(modal);
    if (!focusable.length) return;

    _trapHandler = function (e) {
      if (e.key !== 'Tab') return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        // shift + tab
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        // tab
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

  // Initialize: compute totals and ensure badge visibility
  updateCartTotals();

  // Expose some methods for debugging / integration (optional)
  window.__NUA_Cart = {
    open: openCart,
    close: closeCart,
    update: updateCartTotals,
    addItem: function (itemHtml) {
      // Accepts an HTML string for a .cart-item and appends it to itemsContainer
      if (!itemsContainer) return;
      itemsContainer.insertAdjacentHTML('beforeend', itemHtml);
      updateCartTotals();
    }
  };

})();