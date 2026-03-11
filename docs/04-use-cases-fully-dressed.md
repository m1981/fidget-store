### UC-01: Reserve a Drop Product via BLIK

**Primary Actor:** Customer (Guest)
**Level:** 🌊 User Goal
**Trigger:** Customer decides to reserve a specific product variant from the active Weekly Drop.

**Stakeholders & Interests:**
- **Customer:** Wants to secure capacity before it runs out; wants a fast mobile checkout.
- **Admin (Uncle Mike):** Wants only confirmed, paid orders.
- **Payment Gateway:** Wants BLIK authorization completed within the 2-minute window.

**Preconditions:**
1. Factory Switch is ON.
2. The active Drop has enough `Production Minutes` remaining to fulfill the cart.
3. Customer has a BLIK-enabled banking app.

**Minimal Guarantees:** No capacity is permanently deducted unless payment is fully confirmed.
**Success Guarantees:** Required `Production Minutes` are atomically deducted. Order is created with status `PAID`.

**Main Success Scenario:**
1. Customer selects a product and identifies the desired filament color variant.
2. Customer adds the variant to the cart.
3. Customer initiates checkout, providing email and phone number.
4. Customer designates an InPost Paczkomat as the delivery point.
5. System validates that `Drop.allocated_minutes + Cart Total Minutes <= Drop.total_capacity_minutes`.
6. System calculates the ETA based on the `Active Window` schedule and displays it.
7. Customer initiates BLIK payment.
8. System creates the `Order` as `PENDING_PAYMENT` and places a **Soft Lock** on the required `Production Minutes`.
9. System requests BLIK transaction; 2-minute countdown timer starts on UI.
10. Customer authorizes the transaction in their banking app.
11. System receives Payment Gateway Webhook, updates Order to `PAID`, and converts the Soft Lock to a **Hard Deduction**.
12. System dispatches confirmation (email + SMS).

**Extensions:**
- **5a. Cart exceeds remaining Drop capacity:**
  - 5a1. System blocks checkout and displays "Not enough time left in this week's drop!"
- **9a. BLIK authorization window expires or fails:**
  - 9a1. System notifies customer.
  - 9a2. A background worker releases the Soft Lock after 3 minutes, returning the minutes to the Drop.

---

### UC-02: Purchase Mystery Box

**Primary Actor:** Customer (Guest)
**Level:** 🌊 User Goal
**Trigger:** Customer selects the "Surprise Me!" option.

**Main Success Scenario:**
1. Customer initiates the Mystery Box purchase ("Surprise Me!").
2. System adds a Mystery Box item to the cart.
3. **[Continues from UC-01, step 3 onward.]** *Note: System uses a Fixed Maximum Duration (e.g., 120 mins) for the capacity math in Step 5.*

---

### UC-03: Track Order Status

**Primary Actor:** Customer (Guest)
**Level:** 🌊 User Goal
**Trigger:** Customer wants to know the current state of their order.

**Main Success Scenario:**
1. Customer presents their order reference.
2. System locates the order.
3. System displays the current status:
   - `PAID` → "Payment confirmed."
   - `PRINTING` → "Your item is on the printer." *(Triggered automatically when Admin closes the Drop).*
   - `PACKED` → "Packed and ready!" *(Triggered when Makers finish all items).*
   - `SHIPPED` → "On its way! [Tracking link]." *(Triggered when Admin generates label).*
   - `DELIVERED` → "Delivered." *(Triggered via InPost Webhook).*

---

### UC-04: Toggle Factory Switch

**Primary Actor:** Admin (Uncle Mike)
**Level:** 🌊 User Goal
**Trigger:** A real-world event requires pausing production.

**Main Success Scenario:**
1. Admin navigates to Factory Switch control.
2. Admin sets the switch to PAUSED.
3. Admin provides a status message (e.g., "Homework week!").
4. Admin confirms the change.
5. System persists the new state and propagates it to the storefront: Printer Status widget turns OFF, Add-to-Cart controls are disabled.

---

### UC-05: Manage a Weekly Drop

**Primary Actor:** Admin (Uncle Mike)
**Level:** 🌊 User Goal
**Trigger:** Admin sets up the next batch production window.

**Main Success Scenario:**
1. Admin creates a new Drop.
2. Admin sets the Drop open and close timestamps.
3. Admin sets the total `Production Minutes` capacity for the Drop window.
4. Admin selects the products active in this Drop.
5. Admin publishes the Drop.
6. System activates the Drop at the configured open time.

---

### UC-06: Fulfill an Order

**Primary Actor:** Admin (Uncle Mike)
**Level:** 🌊 User Goal
**Trigger:** Admin is notified that an order is `PACKED`.

**Main Success Scenario:**
1. Admin selects an order with status `PACKED`.
2. System calculates the required InPost parcel size by finding the largest `inpost_gabaryt` among the order's items.
3. Admin reviews order contents and the calculated Gabaryt.
4. Admin requests InPost label generation.
5. System calls InPost API with order details.
6. System receives the label PDF and tracking number.
7. Admin marks the order as Shipped.
8. System updates order status to `SHIPPED` and sends tracking notification.

**Extensions:**
- **3a. Multiple items require a larger box than the auto-calculated Gabaryt:**
  - 3a1. Admin uses the Manual Override Dropdown to select a larger Gabaryt before generating the label.

---

### UC-07: Issue a Refund

**Primary Actor:** Admin (Uncle Mike)
**Level:** 🌊 User Goal
**Trigger:** Customer requests a cancellation.

**Main Success Scenario:**
1. Admin locates the order to refund.
2. Admin initiates the refund action.
3. System submits the refund request to the Payment Gateway.
4. Gateway confirms the refund.
5. System restores the `Production Minutes` to the Drop's capacity, sets order status to `REFUNDED`, and notifies the customer.

---

### UC-08: View Aggregated Print Batch

**Primary Actor:** Makers (Leo or Sam)
**Level:** 🌊 User Goal
**Trigger:** Makers open their view to plan the day's printing.

**Main Success Scenario:**
1. Maker opens the Makers View.
2. System selects the most recent closed Drop.
3. System aggregates all order items by filament color, then by model.
4. System displays the Print Batch (e.g., *Silk Blue → 0/5 Crystal Dragons Completed*).
5. Maker uses the list to load filament.

---

### UC-09: Mark a Print Job as Complete (FIFO Allocation)

**Primary Actor:** Makers (Leo or Sam)
**Level:** 🌊 User Goal
**Trigger:** A print job finishes on the printer.

**Main Success Scenario:**
1. Maker identifies the completed model on the Print Batch list (e.g., Silk Blue Dragon).
2. Maker taps the `[+1]` button next to that model.
3. System queries the database for the *oldest* `PAID` order containing a Silk Blue Dragon (FIFO Allocation).
4. System marks that specific customer's line item as `PRINTED`.
5. System updates the Maker UI to show the new total (e.g., *1/5 Completed*).
6. System checks if the Order that just received the item has all its items `PRINTED`.
7. If yes: System advances order status to `PACKED` and notifies Admin.

**Extensions:**
- **2a. Maker accidentally taps [+1]:**
  - 2a1. Maker can tap `[-1]` within 60 seconds to undo the allocation before the Admin alert is triggered.