# Feature F-02: Frictionless BLIK Checkout

## 1. Value Proposition
Polish consumers in 2026 expect instant, mobile-first payments. By offering a guest-only, one-page checkout centered entirely around BLIK and InPost Paczkomaty, we eliminate friction, reduce cart abandonment, and secure immediate payment confirmation before deducting scarce 3D printer capacity.

## 2. Scope
*   **In Scope:**
    *   Guest checkout (Email + Phone Number only).
    *   InPost Paczkomat selection via mobile Geowidget.
    *   Native BLIK 6-digit code input with active UI countdown timer.
    *   Soft-locking capacity during the 2-minute payment window.
    *   Order creation upon successful webhook callback.
*   **Out of Scope:**
    *   Mandatory user account creation or login.
    *   Alternative payment methods (Cards, Apple Pay, PayPo) for the MVP.
    *   Home delivery via courier (InPost lockers only).
    *   BLIK One-Click (saved tokens) for the MVP.

## 3. Key Components (The "Views")
*   **Cart Summary:** A sticky header showing the total PLN amount and items.
*   **Delivery Section:** A button opening the InPost map modal.
*   **Payment Section:** A dedicated BLIK input field that appears after delivery is selected.
*   **Processing Modal:** A non-dismissible overlay showing the 2-minute countdown while waiting for bank authorization.

## 4. Dependencies
*   **F-04 (Capacity Engine):** To validate that the cart items still fit within the Drop's remaining time before initiating payment.
*   **External API:** PayU or Przelewy24 (for BLIK transaction creation and webhooks).
*   **External API:** InPost (for the Geowidget).

---

## 5. BDD Scenarios (Behavior & Acceptance Criteria)

The following scenarios define the exact behavior expected by the system. They are written in Gherkin syntax to be easily understood by Uncle Mike (Business) and directly testable by the Developers.

### Scenario 1: Successful BLIK Payment and Order Creation
**Given** the customer has items in their cart
**And** the Drop has enough remaining `Production Minutes` to fulfill the cart
**When** the customer enters their contact details and selects an InPost locker
**And** the customer enters a valid 6-digit BLIK code and taps "Pay"
**Then** the system should place a "Soft Lock" on the required `Production Minutes`
**And** the system should display a 2-minute countdown timer
**When** the Payment Gateway sends a successful webhook within 2 minutes
**Then** the system should create an `Order` with status `PAID`
**And** the system should convert the Soft Lock to a Hard Deduction on the Drop capacity
**And** the system should redirect the customer to the "Thank You" screen.

### Scenario 2: Cart Exceeds Capacity at Checkout
**Given** the customer has items in their cart
**But** another customer just purchased the last available `Production Minutes` for the Drop
**When** the customer attempts to initiate the BLIK payment
**Then** the system should block the payment request
**And** the system should display an error message: "Not enough time left in this week's drop!"
**And** the system should return the customer to the cart view.

### Scenario 3: BLIK Authorization Timeout
**Given** the customer has initiated a BLIK payment
**And** the 2-minute countdown timer is active
**And** the system has placed a "Soft Lock" on the required `Production Minutes`
**When** the 2-minute timer expires without a successful webhook from the Payment Gateway
**Then** the system should mark the payment attempt as `FAILED`
**And** the system should display an error message: "Payment timed out. Please try again."
**And** a background worker should release the "Soft Lock", returning the minutes to the Drop capacity.

### Scenario 4: BLIK Code Rejected by Bank
**Given** the customer has initiated a BLIK payment
**When** the Payment Gateway immediately returns a rejection (e.g., insufficient funds or invalid code)
**Then** the system should immediately release the "Soft Lock" on the `Production Minutes`
**And** the system should display an error message: "Payment declined by your bank. Please check your BLIK code and try again."
**And** the countdown timer should disappear, allowing the user to enter a new code.

### Scenario 5: Factory Paused During Checkout
**Given** the customer is on the checkout page
**When** Uncle Mike toggles the Factory Switch to `PAUSED`
**And** the customer attempts to tap "Pay"
**Then** the system should block the payment request
**And** the system should display the Admin's custom pause message (e.g., "Homework week! Back Friday.")
**And** the checkout form should be disabled.