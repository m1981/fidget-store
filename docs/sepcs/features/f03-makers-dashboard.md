# Feature F-03: The "Makers" Production Dashboard

## 1. Value Proposition
The core operational bottleneck of "Fidget Fun!" is the single 3D printer. To maximize efficiency, the Makers (Leo & Sam) must print in batches grouped by filament color to minimize spool changes. This dashboard provides a simplified, read-only view of what needs to be printed today, completely abstracted from individual customer orders, pricing, or PII (Personally Identifiable Information).

## 2. Scope
*   **In Scope:**
    *   PIN-based authentication for the Makers.
    *   Aggregated view of all unprinted items from `PAID` orders, grouped by filament color and model.
    *   1-Tap completion button (`[+1]`) for each model variant.
    *   FIFO (First-In, First-Out) automatic allocation of completed prints to the oldest pending customer order.
    *   Undo functionality (`[-1]`) within a 60-second window.
    *   Automated status advancement of the parent `Order` to `PACKED` when all its items are printed.
*   **Out of Scope:**
    *   Viewing customer names, addresses, or order totals.
    *   Managing the Weekly Drop capacity or Factory Switch (Admin only).
    *   Generating InPost labels (Admin only).
    *   Refunding or cancelling orders.

## 3. Key Components (The "Views")
*   **PIN Login Screen:** A simple numeric keypad for Leo and Sam to access their dashboard.
*   **The Print Batch List:** The main view. A vertical list grouped by Filament Color (e.g., a "Silk Blue" section containing rows for "Crystal Dragon" and "Hex Spinner").
*   **Progress Indicators:** Each row shows `[Completed Count] / [Total Required]`.
*   **Action Buttons:** Large, touch-friendly `[+1]` and `[-1]` buttons next to each row.

## 4. Dependencies
*   **F-04 (Capacity Engine):** To determine which items are confirmed (`PAID`) and need printing.
*   **F-05 (Admin Operations):** To receive the push notification when an order reaches `PACKED` status.

---

## 5. BDD Scenarios (Behavior & Acceptance Criteria)

### Scenario 1: Viewing the Aggregated Print Batch
**Given** the Makers are authenticated with their PIN
**And** there are multiple `PAID` orders containing "Silk Blue Crystal Dragons"
**When** the Makers open the Production Dashboard
**Then** the system should aggregate all unprinted items by filament color
**And** the system should display a single row for "Silk Blue Crystal Dragon" showing the total required across all orders (e.g., "0 / 5 Completed")
**And** the system should hide all customer names, order IDs, and prices.

### Scenario 2: Marking a Print Job Complete (FIFO Allocation)
**Given** the Makers are viewing the Print Batch List
**And** the row for "Silk Blue Crystal Dragon" shows "0 / 5 Completed"
**When** a Maker taps the `[+1]` button for that row
**Then** the system should query the database for the *oldest* `PAID` order containing a Silk Blue Crystal Dragon
**And** the system should mark that specific customer's line item as `PRINTED`
**And** the UI should immediately update to show "1 / 5 Completed".

### Scenario 3: Completing a Full Customer Order
**Given** a customer order contains exactly one "Silk Blue Crystal Dragon" and one "Gold Hex Spinner"
**And** the "Gold Hex Spinner" is already marked as `PRINTED`
**When** a Maker taps `[+1]` on the "Silk Blue Crystal Dragon" row
**And** the system allocates that print to this specific customer's order via FIFO
**Then** the system should detect that all items in the order are now `PRINTED`
**And** the system should automatically advance the Order status to `PACKED`
**And** the system should send a push notification to the Admin (Uncle Mike): "Order #[ID] is fully printed and ready to pack."

### Scenario 4: Undoing an Accidental Completion
**Given** a Maker has just tapped `[+1]` on a row
**And** less than 60 seconds have passed
**When** the Maker taps the `[-1]` (Undo) button on that same row
**Then** the system should revert the specific line item back to unprinted
**And** the UI should decrement the completed count (e.g., back to "0 / 5 Completed")
**And** if the order had briefly reached `PACKED` status, it should revert to `PRINTING`
**And** the system should cancel or retract the push notification to the Admin if possible.

### Scenario 5: Handling the Mystery Box
**Given** a customer has purchased a "Mystery Box"
**When** the Makers view the Print Batch List
**Then** the system should display a dedicated group called "Mystery Boxes (Use Leftover Filament)"
**And** the row should show the total number of Mystery Boxes required (e.g., "0 / 3 Completed")
**When** a Maker taps `[+1]` on the Mystery Box row
**Then** the system should allocate it to the oldest pending Mystery Box order, regardless of what physical item or color the boys actually printed.