# 01_spec.md - Fidget Fun Store Specification

## 1. Project Overview
**Goal:** Build a high-performance, mobile-first e-commerce store for a single category of products ("Fidget Toys").
**Core Value Proposition:** Instant load times, tactile user experience via AVIF animations, and a frictionless "Guest Checkout" flow using BLIK.
**Target Audience:** Mobile users.
**Concurrency Target:** Support minimum 10 concurrent active checkout sessions.

---

## 2. Technical Stack & Architecture
*   **Framework:** SvelteKit (SSR + Hydration).
*   **Language:** TypeScript (Strict mode enabled).
*   **Database:** SQLite (via LibSQL/Turso) - *Single Source of Truth (SSOT)*.
*   **Styling:** TailwindCSS (Mobile-first utility classes).
*   **State Management:** Svelte Stores (Client-side Cart SSOT).
*   **Media Storage:** Cloudflare R2 or AWS S3 compatible bucket (Public read access).
*   **Payment Gateway:** Stripe or Przelewy24 (P24) supporting **Level 0 BLIK** (White Label).

---

## 3. Functional Requirements

### 3.1. Storefront (Public)
*   **Layout:** Mobile-only vertical layout. Desktop view will render the mobile view centered with a max-width of 480px.
*   **Product List:**
    *   Grid layout (2 columns).
    *   Lazy-loaded thumbnails (WebP).
    *   Price displayed in local currency format.
*   **Product Detail:**
    *   **Hero Media:** Loop-playing AVIF animation.
    *   **Fallback:** `<picture>` tag must provide WebP/JPG fallback for browsers incompatible with AVIF.
    *   **Action:** "Add to Cart" button with haptic feedback (vibration API if available).
*   **Cart:**
    *   Persisted in browser `localStorage`.
    *   Syncs with UI immediately via Svelte Stores.
    *   No server-side cart storage until checkout initiation.

### 3.2. Checkout & Payment (The "BLIK" Flow)
*   **User Input:**
    *   Shipping Details: Name, Email, Phone, Address/Parcel Locker ID.
    *   Payment: 6-digit BLIK code input field.
*   **Process:**
    1.  User submits form + BLIK code.
    2.  Server validates stock and locks inventory (Atomic Transaction).
    3.  Server initiates payment with Gateway.
    4.  **Real-time Feedback:** Client subscribes to Server-Sent Events (SSE) or polls every 2s to check payment status.
    5.  **Completion:** On success, redirect to "Thank You" page. On failure, release stock lock and show error.

### 3.3. User Profile (No Login)
*   **Mechanism:** "Profile" is a read-only view of Order History.
*   **Identification:** The client stores `order_uuid`s in `localStorage` upon successful checkout.
*   **Data Retrieval:** The "Profile" page queries `GET /api/orders/batch?ids=...` to fetch status (e.g., "Processing", "Shipped").

### 3.4. Admin Panel
*   **Access:** `/admin/login` protected by a server-side cookie session (HttpOnly, Secure).
*   **Authentication:** Password hash comparison against `ADMIN_PASSWORD_HASH` env var.
*   **Capabilities:**
    *   **Product Management:** Create/Edit products. Upload **pre-processed** AVIF and WebP files (No server-side transcoding). Toggle `is_active`.
    *   **Order Management:** View "PAID" orders. Mark as "SHIPPED".
    *   **Dashboard:** Simple counter of "Orders Today".

---

## 4. Data Model (Schema)

### 4.1. Products Table
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PK, Auto-inc | |
| `slug` | TEXT | UNIQUE, NOT NULL | URL friendly identifier |
| `name` | TEXT | NOT NULL | |
| `price_cents` | INTEGER | NOT NULL | **SSOT for Price**. Never float. |
| `media_avif` | TEXT | NOT NULL | URL to AVIF file |
| `media_webp` | TEXT | NOT NULL | URL to WebP fallback |
| `stock_qty` | INTEGER | DEFAULT 0 | |
| `is_active` | BOOLEAN | DEFAULT 1 | Soft delete mechanism |

### 4.2. Orders Table
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | TEXT | PK, UUID | Public ID shared with client |
| `email` | TEXT | NOT NULL | |
| `phone` | TEXT | NOT NULL | |
| `address_json` | TEXT | NOT NULL | JSON string of shipping details |
| `status` | TEXT | ENUM | `PENDING_PAYMENT`, `PAID`, `SHIPPED`, `FAILED` |
| `total_cents` | INTEGER | NOT NULL | Snapshot of total cost |
| `created_at` | DATETIME | DEFAULT NOW | |
| `payment_ref` | TEXT | NULL | Gateway Transaction ID |

### 4.3. OrderItems Table
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `order_id` | TEXT | FK | |
| `product_id` | INTEGER | FK | |
| `quantity` | INTEGER | NOT NULL | |
| `price_snapshot`| INTEGER | NOT NULL | Price at moment of purchase |

---

## 5. API Contracts (OpenAPI Style)

### 5.1. Public Endpoints
*   `GET /api/products`
    *   **Cache:** `public, max-age=300, s-maxage=600`
    *   **Response:** `[{ id, slug, name, price_cents, media_webp }]`
*   `GET /api/products/{slug}`
    *   **Response:** Full product details including `media_avif` and `stock_qty`.

### 5.2. Checkout Endpoints
*   `POST /api/checkout/initiate`
    *   **Body:** `{ cart: [{id, qty}], customer: { ... }, blik_code: "123456" }`
    *   **Behavior:**
        1.  **BEGIN TRANSACTION**
        2.  Check stock for all items. If insufficient -> **ROLLBACK** & 409 Conflict.
        3.  Decrement stock.
        4.  Insert Order & OrderItems.
        5.  Call Payment Gateway (P24/Stripe) to register BLIK transaction.
        6.  **COMMIT**
    *   **Response:** `{ order_id: "uuid", status: "PENDING_PAYMENT" }`

*   `GET /api/checkout/status/{order_id}` (SSE Preferred)
    *   **Behavior:** Streams status updates.
    *   **Events:** `payment_success`, `payment_failure`.

### 5.3. Webhooks
*   `POST /api/webhooks/payment`
    *   **Security:** Verify Gateway Signature.
    *   **Behavior:** Update Order `status` to `PAID` or `FAILED`. If `FAILED`, increment `stock_qty` (release inventory).

---

## 6. Non-Functional Requirements

### 6.1. Performance
*   **LCP (Largest Contentful Paint):** < 2.5s on 4G networks.
*   **CLS (Cumulative Layout Shift):** < 0.1. All images must have explicit aspect-ratio CSS.
*   **Bundle Size:** Keep initial JS chunk < 50kb (gzip).

### 6.2. Security & Privacy
*   **Input Validation:** Zod schemas for all API inputs.
*   **Sanitization:** DOMPurify for any rendered text (though Svelte handles this natively).
*   **Data Retention:** Automated cron job to anonymize `email`, `phone`, and `address_json` in `Orders` table 30 days after `status` = `SHIPPED`.
*   **Rate Limiting:** Apply rate limiting to `POST /api/checkout/initiate` to prevent inventory denial-of-service attacks.

### 6.3. Error Handling
*   **Client:** Graceful UI degradation. If AVIF fails to load, show WebP. If Checkout fails, show specific error message (e.g., "BLIK code expired").
*   **Server:** Structured logging. Do not expose stack traces to the client.

---

## 7. Implementation Roadmap (YAGNI Phasing)
1.  **Phase 1:** Database setup & Admin Product Upload (Get data in).
2.  **Phase 2:** Public Storefront (Read-only).
3.  **Phase 3:** Cart Logic & Checkout API (Mock payment).
4.  **Phase 4:** Real BLIK Integration & Webhooks.
5.  **Phase 5:** "Profile" History & Polish.