The biggest mistake developers make with e-commerce is trying to build the "Happy Path" (Add to Cart -> Pay) all at once. That leads to a monolithic mess that is hard to debug when the payment gateway fails or stock counts get out of sync.

To build this efficiently and test in isolation, we will use a **"Outside-In" approach with Feature Flags and Mocking**.

Here is the phased development plan designed for isolation and stability.

---

### Phase 1: The "Core Domain" (No UI, No Database)
**Goal:** Verify the business logic (Cart, Price Math, Inventory Rules) without touching a browser or a database.

1.  **Setup Types & Zod Schemas:**
    *   Define `CartItem`, `Product`, `Order` interfaces in TypeScript.
    *   Write Zod schemas for input validation (e.g., `BlikCodeSchema`, `AddressSchema`).
2.  **Pure Logic Functions (The "Brain"):**
    *   Write a `calculateTotal(cartItems, productMap)` function.
    *   Write a `validateStock(cartItems, inventoryMap)` function.
3.  **Testing:**
    *   **Unit Tests (Vitest):** Test these functions with hardcoded JSON data.
    *   *Why?* You ensure money calculations are correct before you even install a database driver.

### Phase 2: The "Mock" Backend (The API Contract)
**Goal:** Build the SvelteKit API routes so the Frontend can be built in parallel, without waiting for the real Database or Payment Gateway.

1.  **Mock Repositories:**
    *   Create an interface `IProductRepository` and `IOrderRepository`.
    *   Implement `MockProductRepository` that returns static JSON data.
    *   Implement `MockPaymentGateway` that simulates BLIK success/failure after a 2-second delay.
2.  **SvelteKit Endpoints:**
    *   Build `GET /api/products` and `POST /api/checkout/initiate` using these mocks.
3.  **Testing:**
    *   **Integration Tests (Supertest/Vitest):** Hit the API endpoints. Verify that sending a bad BLIK code to the mock returns the correct 400/409 error structure defined in your spec.

### Phase 3: The "Mobile-First" Frontend (UI Isolation)
**Goal:** Build the visual layer using the Mock API. Focus purely on UX, Animations, and Mobile responsiveness.

1.  **Component Library (Atomic Design):**
    *   Build `ProductCard.svelte`, `CartDrawer.svelte`, `BlikInput.svelte`.
    *   **Storybook (Optional but recommended):** Or just a `/test/components` route where you can view these components in various states (Loading, Error, Success) without running the whole app.
2.  **The AVIF Implementation:**
    *   Implement the `<picture>` tag logic.
    *   Test loading performance on a throttled network (Chrome DevTools -> Network -> Fast 3G).
3.  **State Management:**
    *   Wire up the Svelte Stores to `localStorage`.
    *   Test: Add item, refresh page. Does it stay? Yes.

### Phase 4: The "Real" Infrastructure (Database & Admin)
**Goal:** Replace Mocks with Real Data.

1.  **Database Migration:**
    *   Set up SQLite/Turso. Run the schema migrations.
    *   Implement `SqliteProductRepository` and `SqliteOrderRepository`.
2.  **Dependency Injection:**
    *   Swap the `MockRepository` for `SqliteRepository` in your SvelteKit `hooks.server.ts` or service layer.
3.  **The Admin Panel:**
    *   Build the simple upload form.
    *   *Test:* Upload a file, check R2 bucket, check DB record.

### Phase 5: The "Dangerous" Part (Payment Integration)
**Goal:** Connect real money. This is the hardest part to test in isolation.

1.  **Gateway Sandbox:**
    *   Connect to Stripe/P24 **Sandbox** environment.
2.  **Webhook Handler:**
    *   Build `POST /api/webhooks/payment`.
    *   **Testing Tool:** Use **ngrok** or **Localtunnel** to expose your localhost to the internet so the gateway can hit your webhook.
3.  **The "Zombie Order" Cron:**
    *   Write the script that checks for `PENDING_PAYMENT > 15 mins`.
    *   *Test:* Manually insert an old pending order in DB, run script, verify status changes to `FAILED` and stock increments.

---

### Summary of the "Isolation" Strategy

| Component | How to Test in Isolation |
| :--- | :--- |
| **Price Logic** | Unit Tests (Vitest) with hardcoded numbers. |
| **UI Components** | Storybook or a `/playground` route with mock props. |
| **Checkout Flow** | Use `MockPaymentGateway` that returns "Success" instantly. |
| **Database** | Use an in-memory SQLite DB for tests that resets every run. |
| **Webhooks** | Use `curl` or Postman to send fake webhook payloads to your API. |

### Recommended Dev Sequence

1.  **Day 1:** Domain Logic (Types, Math) + Mock API.
2.  **Day 2:** Frontend (Product Grid, AVIFs, Cart Store).
3.  **Day 3:** Database Setup + Admin Panel (Get real data in).
4.  **Day 4:** Checkout API (Real DB, Mock Payment).
5.  **Day 5:** Real Payment Integration + Webhooks.

This approach ensures that if the UI breaks, you know it's not the database. If the Payment fails, you know it's not the UI. **Separation of Concerns is your best friend here.**