# Feature F-05: Admin Operations & Fulfillment

## 1. Value Proposition
Running a side-hustle shouldn't feel like a full-time corporate job. Uncle Mike needs a mobile-optimized dashboard to manage the business logic (Drops, Capacity, Refunds) and logistics (InPost labels) with minimal taps. Crucially, this feature includes the "Factory Switch"—the master control that enforces the "homework comes before printing" rule, allowing the family to pause the store instantly without losing existing orders.

## 2. Scope
*   **In Scope:**
    *   Secure Admin authentication (PIN or Magic Link).
    *   The "Factory Switch" toggle (Active/Paused) with custom messaging.
    *   Weekly Drop Management (Create, Edit Capacity, Select Products).
    *   Order Fulfillment Queue (View `PACKED` orders).
    *   1-Click InPost Label Generation with Gabaryt (Parcel Size) override.
    *   Order Refund processing via Payment Gateway API.
*   **Out of Scope:**
    *   The Makers' Production View (Handled in F-03).
    *   Customer-facing storefront UI (Handled in F-01).
    *   Complex accounting or tax reporting (Export to CSV only for MVP).
    *   Automated marketing emails or SMS campaigns.

## 3. Key Components (The "Views")
*   **Admin Dashboard (Home):** Quick stats (Revenue, Active Drop Status) and the prominent "Factory Switch" toggle.
*   **Drop Manager:** A form to set Start/End dates, Total Capacity (in hours), and toggle which products are active this week.
*   **Fulfillment Queue:** A list of orders currently in `PACKED` status, waiting for shipping labels.
*   **Order Detail View:** Shows customer info, purchased items, BLIK transaction ID, and the "Generate InPost Label" / "Refund" buttons.

## 4. Dependencies
*   **F-04 (Capacity Engine):** Relies on the Admin's Drop configuration to calculate availability.
*   **External API:** InPost (for generating the PDF shipping labels).
*   **External API:** PayU/Przelewy24 (for processing refunds).

---

## 5. BDD Scenarios (Behavior & Acceptance Criteria)

### Scenario 1: Toggling the Factory Switch (Pause)
**Given** Uncle Mike is logged into the Admin Dashboard
**And** the Factory Switch is currently `ACTIVE`
**When** Uncle Mike toggles the switch to `PAUSED`
**And** he enters the message "Printer maintenance! Back tomorrow."
**And** he taps "Save Status"
**Then** the system should immediately update the global store state to `PAUSED`
**And** the system should broadcast the custom message to the Storefront (F-01)
**And** the system should disable all new checkouts (F-02)
**But** the system should *not* cancel or pause any existing `PAID` or `PRINTING` orders.

### Scenario 2: Creating a Weekly Drop
**Given** Uncle Mike is in the Drop Manager
**When** he creates a new Drop starting "Monday 08:00" and ending "Sunday 20:00"
**And** he sets the Total Capacity to `50` hours (3000 Production Minutes)
**And** he selects "Crystal Dragon" and "Hex Spinner" as the active products
**And** he taps "Publish Drop"
**Then** the system should save the Drop configuration
**And** the system should automatically activate the Drop on the Storefront at "Monday 08:00"
**And** the Capacity Engine (F-04) should use the 3000 minutes as the baseline for scarcity calculations.

### Scenario 3: Fulfilling an Order (1-Click InPost Label)
**Given** an order has reached `PACKED` status (all items printed by the Makers)
**And** Uncle Mike opens the Order Detail View
**When** he taps "Generate InPost Label"
**Then** the system should calculate the required parcel size (Gabaryt) based on the largest item in the order
**And** the system should call the InPost API with the customer's details and selected Paczkomat ID
**And** the system should receive the PDF label and tracking number
**And** the system should update the order status to `SHIPPED`
**And** the system should automatically send an SMS/Email to the customer with the tracking link.

### Scenario 4: Overriding the InPost Gabaryt
**Given** an order contains 10 small "Hex Spinners" (each configured as Gabaryt A)
**And** Uncle Mike knows they won't physically fit in a Gabaryt A box
**When** he opens the Order Detail View
**Then** he should see a dropdown for "Parcel Size" defaulting to "Gabaryt A"
**When** he manually changes the dropdown to "Gabaryt B"
**And** he taps "Generate InPost Label"
**Then** the system should call the InPost API requesting a Gabaryt B label instead of the auto-calculated size.

### Scenario 5: Issuing a Refund
**Given** a customer requests a cancellation for a `PAID` order
**And** Uncle Mike opens the Order Detail View
**When** he taps "Issue Full Refund"
**And** he confirms the action in the modal
**Then** the system should call the Payment Gateway API (PayU/Przelewy24) to reverse the BLIK transaction
**And** upon successful API response, the system should change the order status to `REFUNDED`
**And** the system should restore the order's `Production Minutes` back to the active Drop's available capacity
**And** the system should notify the customer via email.