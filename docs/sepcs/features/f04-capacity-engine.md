# Feature F-04: Time-Based Capacity Engine

## 1. Value Proposition
Unlike a traditional e-commerce store that counts physical inventory (e.g., "We have 5 items in a box"), Fidget Fun! sells *future manufacturing time*. Because the 3D printer lacks an auto-remove tool and the Makers (Leo & Sam) must sleep, capacity cannot be calculated as 24/7 uptime. This engine translates physical constraints into software rules, ensuring the business never over-promises, accurately calculates ETAs, and handles concurrent checkouts without double-booking the printer.

## 2. Scope
*   **In Scope:**
    *   Calculating total `Production Minutes` for a cart (Print Duration + Turnaround Buffer).
    *   Validating cart totals against the Drop's remaining capacity.
    *   Projecting print jobs onto the `Active Window` schedule to calculate accurate ETAs.
    *   Managing "Soft Locks" (temporary holds during BLIK payment) and "Hard Deductions" (confirmed sales).
    *   Handling the fixed-time allocation for Mystery Boxes.
*   **Out of Scope:**
    *   UI rendering of the scarcity badges (handled in F-01).
    *   Admin configuration of the Drop hours (handled in F-05).

## 3. Key Components (Backend Logic)
*   **Capacity Validator:** A service that sums the cart and checks `allocated_minutes + cart_minutes <= total_capacity_minutes`.
*   **ETA Calculator:** A scheduling algorithm that takes the current queue, adds the new cart, and wraps the time around the `daily_active_hours` (e.g., pausing the clock at 18:00 and resuming at 08:00).
*   **Lock Manager:** A Redis-backed (or database transaction) service that holds capacity for 3 minutes while waiting for the BLIK webhook.

## 4. Dependencies
*   **F-05 (Admin Operations):** Relies on global settings configured by Uncle Mike (`turnaround_buffer_minutes`, `daily_active_hours`).

---

## 5. BDD Scenarios (Behavior & Acceptance Criteria)

### Scenario 1: Basic Capacity Validation (Success)
**Given** the current Drop has `600` Production Minutes remaining
**And** the global `turnaround_buffer_minutes` is set to `30`
**When** a customer adds a "Hex Spinner" (`print_duration_minutes` = `120`) to the cart
**Then** the system should calculate the required capacity as `150` minutes (120 + 30)
**And** the system should allow the checkout to proceed because `150 <= 600`.

### Scenario 2: Capacity Validation (Failure / Sold Out)
**Given** the current Drop has `100` Production Minutes remaining
**And** the global `turnaround_buffer_minutes` is set to `30`
**When** a customer adds a "Crystal Dragon" (`print_duration_minutes` = `840`) to the cart
**Then** the system should calculate the required capacity as `870` minutes
**And** the system should block the checkout
**And** the system should flag the "Crystal Dragon" as "Sold Out" for this Drop.

### Scenario 3: ETA Calculation (Crossing the Sleep Boundary)
**Given** the `daily_active_hours` are set to `08:00` to `18:00` (10 hours / 600 minutes per day)
**And** the current printer queue will finish exactly at `16:00` today
**When** a customer attempts to buy a "Crystal Dragon" requiring `870` Production Minutes
**Then** the ETA Calculator should allocate `120` minutes to today (16:00 to 18:00)
**And** the calculator should pause at `18:00` (Makers go to sleep)
**And** the calculator should allocate `600` minutes to tomorrow (08:00 to 18:00)
**And** the calculator should allocate the remaining `150` minutes to the day after tomorrow (08:00 to 10:30)
**And** the system should display the ETA to the customer as: "Est. Print Completion: [Date of Day After Tomorrow] at 10:30".

### Scenario 4: The Mystery Box Fixed Time Allocation
**Given** the Admin has configured the Mystery Box `fixed_duration_minutes` to `120`
**And** the global `turnaround_buffer_minutes` is `30`
**When** a customer adds a Mystery Box to the cart
**Then** the system should calculate the required capacity as exactly `150` minutes
**And** the system should ignore the actual print times of whatever leftover filament models the boys eventually choose to print.

### Scenario 5: Concurrency and Soft Lock Expiration
**Given** the current Drop has exactly `150` Production Minutes remaining
**And** Customer A and Customer B both have a "Hex Spinner" (requires 150 mins) in their carts
**When** Customer A initiates BLIK checkout first
**Then** the system should place a "Soft Lock" of 150 minutes for Customer A
**And** the Drop's available capacity should temporarily drop to `0`
**When** Customer B attempts to initiate checkout 10 seconds later
**Then** the system should block Customer B with a "Sold Out" message
**When** Customer A's BLIK payment times out after 2 minutes
**Then** the Lock Manager should release the Soft Lock
**And** the Drop's available capacity should return to `150`
**And** Customer B should now be able to successfully initiate checkout.

### Scenario 6: Product Creation Validation (Admin Constraint)
**Given** Uncle Mike is adding a new Product to the catalog
**And** the `daily_active_hours` are set to 10 hours (600 minutes)
**When** Uncle Mike attempts to save a Product with a `print_duration_minutes` of `700`
**Then** the system should reject the save
**And** the system should display an error: "Print duration cannot exceed the daily active window (600 mins). The boys need to sleep!"