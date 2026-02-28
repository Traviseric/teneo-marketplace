---
id: 96
title: "Replace hardcoded cart data in cart-custom.html with session/API"
priority: P3
severity: low
status: completed
source: overnight_tasks
file: marketplace/frontend/cart-custom.html
created: "2026-02-28T12:00:00"
execution_hint: parallel
context_group: frontend_stubs
group_reason: "Same frontend stub fixes group as task 095"
---

# Replace hardcoded cart data in cart-custom.html with session/API

**Priority:** P3 (low)
**Source:** overnight_tasks (OVERNIGHT_TASKS.md P3 section)
**Location:** marketplace/frontend/cart-custom.html

## Problem

`cart-custom.html` has a comment: "in real app, load from session/API". The cart data is hardcoded in the HTML file. Users who add items to cart from catalog pages don't see their actual cart — they see placeholder items. Cart state doesn't persist across page navigations.

## How to Fix

1. Create a simple cart API or use sessionStorage as the persistence layer:
   - Option A (simpler): Use `sessionStorage` with a `cart` key — no backend needed
   - Option B (full): Create `POST /api/cart` and `GET /api/cart` endpoints backed by sessions

   Use Option A (sessionStorage) for quick win — it persists within the browser session and is already client-side.

2. Create `marketplace/frontend/js/cart.js`:
   ```js
   const Cart = {
     get() { return JSON.parse(sessionStorage.getItem('cart') || '[]'); },
     add(item) {
       const cart = this.get();
       const existing = cart.find(i => i.id === item.id && i.format === item.format);
       if (existing) { existing.quantity = (existing.quantity || 1) + 1; }
       else { cart.push({ ...item, quantity: 1 }); }
       sessionStorage.setItem('cart', JSON.stringify(cart));
     },
     remove(itemId) {
       const cart = this.get().filter(i => i.id !== itemId);
       sessionStorage.setItem('cart', JSON.stringify(cart));
     },
     clear() { sessionStorage.removeItem('cart'); }
   };
   ```

3. Update `cart-custom.html` to load cart from `Cart.get()` on DOMContentLoaded and render items dynamically

4. Update "Add to Cart" buttons in catalog/book pages to call `Cart.add(item)` and redirect to cart

5. Update cart item count badge in navbar across all pages

## Acceptance Criteria

- [ ] cart.js created with sessionStorage-backed Cart object
- [ ] cart-custom.html loads and renders items from Cart.get()
- [ ] "Add to Cart" from catalog pages adds to persistent cart
- [ ] Cart count shown in navbar
- [ ] Cart persists across page navigations within same session

## Notes

_From OVERNIGHT_TASKS.md P3 section. SessionStorage approach avoids backend complexity while making cart functional._
