# Feature F-01: The "Weekly Drop" Storefront

## 1. Value Proposition
The storefront is designed to trigger the "Underdog Effect" and drive FOMO (Fear Of Missing Out). Instead of a sterile, corporate catalog, it presents a raw, blueprint-styled feed of what the boys are printing *this week*. By transparently showing the printer's status and translating backend time-capacity into real-time "Scarcity Badges," customers are compelled to reserve their spot before the week's capacity runs out.

## 2. Scope
*   **In Scope:**
    *   Dynamic "Printer Status" widget (reacting to the Admin's Factory Switch).
    *   Horizontal product carousel for the current Weekly Drop.
    *   Real-time Scarcity Badges (e.g., "Only 8 left!").
    *   Dedicated "Mystery Box" section.
    *   Product Detail Page (PDP) with visual color swatches and "Print Time & Effort" transparency.
    *   Static "Trust/Story" section featuring the founders.
*   **Out of Scope:**
    *   Shopping Cart and Checkout flow (Handled in F-02).
    *   Admin controls to change the status or add products (Handled in F-05).
    *   Customer account profiles or order history pages.

## 3. Key Components (The "Views")
*   **Homepage Feed:** A mobile-optimized, vertically scrolling page with a blueprint background aesthetic.
*   **Printer Status Widget:** A sticky or prominent banner at the top. Green ("OPEN") or Grey/Red ("PAUSED").
*   **Product Card:** Displays image, title, price (PLN), and the Scarcity Badge overlay.
*   **PDP Modal/Screen:** Shows the "See it Move!" animation link, circular filament color swatches, and the "Approx. [X] hours to print" widget.

## 4. Dependencies
*   **F-04 (Capacity Engine):** Provides the remaining `Production Minutes` to calculate the Scarcity Badges.
*   **F-05 (Admin Operations):** Provides the current state of the Factory Switch and the active Drop data.

---

## 5. BDD Scenarios (Behavior & Acceptance Criteria)

### Scenario 1: Viewing an Active Drop
**Given** the Admin has set the Factory Switch to `ACTIVE`
**And** there is a Weekly Drop currently open
**When** a customer visits the homepage
**Then** the Printer Status Widget should display "OPEN! The nozzle is cool and ready."
**And** the system should display the horizontal carousel of products assigned to this Drop
**And** the "Add to Cart" buttons on all products should be enabled.

### Scenario 2: Viewing a Paused Storefront
**Given** the Admin has set the Factory Switch to `PAUSED` with the message "Homework week!"
**When** a customer visits the homepage
**Then** the Printer Status Widget should turn Grey/Red and display "Homework week!"
**And** the Scarcity Badges on all products should change to "Paused"
**And** the "Add to Cart" buttons on all Product Detail Pages should be disabled (greyed out).

### Scenario 3: Calculating the Scarcity Badge (Time-to-Item Translation)
*Note: Because the backend tracks time (minutes) not items, the UI must translate remaining time into a maximum item count for the user.*
**Given** the Drop has `8400` Production Minutes remaining
**And** a "Crystal Dragon" requires `840` minutes to print (including buffer)
**When** the system renders the Product Card for the Crystal Dragon
**Then** the system should divide remaining Drop minutes by the product's required minutes (8400 / 840 = 10)
**And** the Scarcity Badge should display "Only 10 left!"
**When** another customer buys a 120-minute Spinner (leaving 8280 minutes in the Drop)
**Then** the system should recalculate (8280 / 840 = 9.8) and round down
**And** the Scarcity Badge for the Dragon should instantly update to "Only 9 left!".

### Scenario 4: Selecting a Variant on the PDP
**Given** a customer taps on the "Crystal Dragon" product card
**When** the Product Detail Page opens
**Then** the system should display circular color swatches for available filaments (e.g., Rainbow, Silk Blue, Gold)
**And** the system should display the "Print Time & Effort" widget showing "Approx. 14 hours to print"
**When** the customer taps the "Rainbow" swatch
**Then** the visual selection indicator should move to "Rainbow"
**And** the "Add to Cart" button should become active.

### Scenario 5: The Mystery Box CTA
**Given** the customer scrolls past the Weekly Drop carousel
**When** the customer views the "Feeling Lucky?" section
**Then** the system should display the Mystery Box description ("Help us use up our extra filament!")
**And** the system should display a single "Surprise Me!" button
**When** the customer taps "Surprise Me!"
**Then** the system should bypass the PDP and color selection entirely
**And** the system should add 1 Mystery Box directly to the cart and open the Checkout view.