# System Requirements Specification: "Fidget Fun!" MVP
**Document Version:** 1.0 | **Target Market:** Poland (2026) | **Platform:** Mobile-Only (PWA)

## 1. Executive Summary & Business Context
"Fidget Fun!" is a hyper-local, family-run e-commerce platform selling 3D-printed fidget toys. Run by two young brothers (Leo, 12, and Sam, 10) and their Uncle Mike, the brand leverages the "Kid-Preneur" and "Maker Movement" aesthetic. 

Instead of a traditional always-on store, it operates on a **"Weekly Drop & Batch Production"** model. Scarcity (limited 3D printer capacity) is used as a marketing tool to drive FOMO. The UI reflects a raw, authentic, blueprint-style aesthetic, emphasizing transparency and community support.

## 2. System Actors
1.  **Customer (Guest):** Community members buying products via mobile. No mandatory account creation to reduce friction.
2.  **Admin (Uncle Mike):** Manages the business operations (turning the store on/off, managing drops, handling InPost labels, refunds).
3.  **The Makers (Leo & Sam):** Require a simplified, read-only "Production View" to see what needs to be printed each day, aggregated by color and model.
4.  **External Systems:** 
    *   **Payment Gateway:** Aggregator (e.g., PayU/Przelewy24) for native BLIK integration.
    *   **Logistics API:** InPost Paczkomaty (Geowidget and label generation).

## 3. Core Functional Requirements (UI & Features)
Based on the provided mockups and business rules, the mobile storefront must include:

*   **Dynamic Printer Status (The "Factory Switch"):** A master toggle controlled by the Admin. 
    *   *ON:* Shows "OPEN! The nozzle is cool and ready" with estimated shipping times.
    *   *OFF (Pause/Holiday Mode):* Disables checkout, greys out "Add to Cart" buttons, and displays a custom message (e.g., "Homework week! Back on Friday").
*   **Scarcity & Capacity Engine:** Inventory is tracked by *Printer Capacity Slots*, not finished goods. UI displays real-time badges (e.g., "Only 8 left!", "Batch 1 of 3").
*   **Product Detail Page (PDP) Transparency:** 
    *   Visual color swatches for filament selection.
    *   "Print Time & Effort" widget (e.g., "Approx. 14 hours to print").
    *   Links to lightweight video animations (e.g., "See it Move!").
*   **The "Mystery Box" Logic:** A dedicated 1-click purchase option ("Surprise Me!") that bypasses color/model selection, allowing the Makers to use leftover filament efficiently.
*   **Trust & Story Section:** Static UI blocks reinforcing the "Real Kids, Real Hustle" narrative.

## 4. Key User Flows (Use Cases)

**Use Case 1: The FOMO Purchase Flow (BLIK Focus)**
1. Customer lands on the mobile site and checks the "Printer Status" widget.
2. Customer selects a product from the "Weekly Drop" carousel, chooses a color swatch, and taps "Add to Cart".
3. At checkout, customer enters phone/email and selects an InPost Paczkomat via the map widget.
4. Customer selects BLIK. The UI displays a 6-digit input field and a **2-minute countdown timer**.
5. Customer enters the code, confirms in their banking app, and the system deducts `1` from the global weekly print capacity.

**Use Case 2: Batched Production (The Makers' Workflow)**
1. The weekly drop window closes.
2. Leo and Sam open their specific mobile dashboard.
3. The system aggregates all orders and displays a "Print List" grouped by filament (e.g., *Silk Blue: 5x Dragons, 2x Spinners*).
4. As items finish printing, the boys check them off. Once a customer's full order is checked, Uncle Mike is notified to pack it.

**Use Case 3: Pausing the Home Factory**
1. The 3D printer jams, or the boys have exams.
2. Uncle Mike toggles the "Factory Switch" to OFF in the Admin panel and types a status message.
3. The storefront instantly updates: The Printer Status widget turns grey/red, displays the message, and all purchasing is locked until toggled back ON.

## 5. Technical Architecture & Integrations (Poland 2026)

*   **Frontend:** Progressive Web App (PWA) built with a modern framework (e.g., Next.js, React, or Vue). It must feel like a native app (fast, smooth scrolling) but requires no App Store approval.
*   **Backend / CMS:** A Headless CMS (like Sanity or Strapi) combined with a lightweight database (Supabase). This allows Uncle Mike to easily swap out the "Weekly Drop" products, update the Printer Status text, and manage capacity limits without coding.
*   **Localization:** All UI elements, database fields, and payment gateways must be localized to **PLN (zł)** and Polish language (though the English "vibe" can remain for branding if desired).
*   **Payments:** Native BLIK integration via a Polish aggregator. Must support the 6-digit code flow with an active UI countdown timer.
*   **Shipping:** InPost API integration is mandatory. The checkout must feature the mobile-friendly InPost Geowidget for locker selection, and the Admin panel must support 1-click label generation.
*   **Legal (Omnibus):** To avoid complex "lowest price in 30 days" tracking required by Polish law, the MVP will use flat pricing without "fake" sales or strikethrough discounts.

## 6. Next Steps for Implementation
To move into development, the next immediate step is to define the **Data Schema** (the exact database fields for `Products`, `Orders`, and `Global Settings`) and set up the Headless CMS environment for Uncle Mike.