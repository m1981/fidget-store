# 2. Domain-Driven Design & Business Rules
**Project:** Fidget Fun! PWA

## 2.1 Ubiquitous Language
* **Drop:** A time-bounded weekly production window. Orders may only be placed while the Drop is active.
* **Production Minutes:** The atomic unit of capacity. Replaces naive "Print Slots".
* **Active Window:** The daily hours the printer can be operated (e.g., 08:00 - 18:00).
* **Turnaround Buffer:** Time required to cool the bed, scrape the part, and reheat (e.g., 30 mins).
* **Print Job:** A single physical item to be printed.
* **FIFO Allocation:** First-In, First-Out. The Makers print a generic "Blue Dragon"; the system automatically assigns it to the oldest pending customer order for a Blue Dragon.
* **Mystery Box:** A special variant with no color or model selection; fulfills using leftover filament. Assigned a Fixed Maximum Duration (e.g., 120 mins) for capacity math.

## 2.2 Bounded Contexts & Aggregates

### A. Sales & Catalog Context
* **`Drop` (Aggregate Root):** Defines the weekly sales window.
    * *Properties:* `id`, `status` (DRAFT, ACTIVE, CLOSED), `total_capacity_minutes`, `allocated_minutes`.
* **`Product` (Aggregate Root):** The catalog item.
    * *Properties:* `id`, `print_duration_minutes`, `inpost_gabaryt` (A, B, or C).
    * *Validation Rule:* `print_duration_minutes` MUST be <= `Global.daily_active_hours` (e.g., a 14h print cannot exist if the active window is 10h, unless overnight printing without removal is explicitly allowed in settings).

### B. Checkout & Payment Context
* **`Order` (Aggregate Root):** The customer's purchase.
    * *State Machine:* `CART` → `PENDING_PAYMENT` (BLIK initiated, capacity soft-locked) → `PAID` (Capacity hard-deducted) → `PRINTING` (Drop closed) → `PACKED` (All items printed) → `SHIPPED` (Label generated) → `DELIVERED` (InPost Webhook).

### C. Production Context
* **`PrintBatch` (Aggregate Root):** The aggregated view for the Makers. Groups `PrintJobs` by filament color and model.

## 2.3 Time-Based Production Scheduling Algorithm
Because there is no auto-remove tool and the Makers must sleep, capacity is calculated by time, not item count.

1. **Cart Validation:** System sums: `(Item A Print Time + Buffer) + (Item B Print Time + Buffer)`.
2. **Capacity Check:** System checks if `Drop.allocated_minutes + Cart Total Minutes <= Drop.total_capacity_minutes`. If false, checkout is blocked.
3. **ETA Calculation:** System projects the print time onto the `Active Window` schedule. The resulting ETA is displayed to the customer before payment.

## 2.4 Legal & Compliance (Poland 2026)
* **Omnibus Directive:** The database will only store a single `price_pln` integer (in grosze). No `compare_at_price` fields will be created in the MVP to strictly avoid Omnibus directive complexities regarding promotional history.