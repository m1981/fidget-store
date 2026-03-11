# Feature Catalog: Fidget Fun! PWA

This document outlines the high-level functional blocks (Containers) of the system. Each feature represents a distinct slice of business value and serves as the parent for specific BDD scenarios and technical flows.

## F-01: The "Weekly Drop" Storefront
**Value Proposition:** Creates FOMO and drives sales by presenting a highly curated, time-limited, and capacity-limited shopping experience to the local community.
*   **Key Components:** Dynamic Printer Status Widget, Scarcity Badges, Product Carousel, Mystery Box CTA.
*   **Dependencies:** F-04 (Capacity Engine).
*   **Detailed Spec:** `features/f01-weekly-drop-storefront.md`

## F-02: Frictionless BLIK Checkout
**Value Proposition:** Maximizes conversion rates for mobile users by offering a one-page guest checkout with Poland's most popular instant payment method.
*   **Key Components:** Cart Summary, InPost Geowidget, BLIK 6-digit input with active countdown timer.
*   **Dependencies:** PayU/Przelewy24 API, InPost API.
*   **Detailed Spec:** `features/f02-blik-checkout.md`

## F-03: The "Makers" Production Dashboard
**Value Proposition:** Allows the young founders (Leo & Sam) to efficiently batch-print orders without seeing complex financial data or customer PII.
*   **Key Components:** Aggregated Print List (by filament color), 1-Tap FIFO Job Completion.
*   **Dependencies:** F-04 (Capacity Engine).
*   **Detailed Spec:** `features/f03-makers-dashboard.md`

## F-04: Time-Based Capacity Engine (Core Logic)
**Value Proposition:** Prevents over-selling by calculating real-time printer availability based on actual print durations, turnaround buffers, and the boys' sleep schedules.
*   **Key Components:** Cart Validation Logic, ETA Calculator, Soft/Hard Lock State Machine.
*   **Dependencies:** None (Core Domain).
*   **Detailed Spec:** `features/f04-capacity-engine.md`

## F-05: Admin Operations & Fulfillment
**Value Proposition:** Empowers Uncle Mike to manage the business, handle logistics, and enforce the "homework first" rule with a single tap.
*   **Key Components:** The "Factory Switch" (Pause/Resume), 1-Click InPost Label Generation, Drop Management, Refund Processing.
*   **Dependencies:** InPost API.
*   **Detailed Spec:** `features/f05-admin-operations.md`