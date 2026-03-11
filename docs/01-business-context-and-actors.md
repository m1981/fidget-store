# 1. Business Context & System Actors
**Project:** Fidget Fun! PWA
**Target Market:** Poland (2026)
**Platform:** Mobile-First / Progressive Web App (PWA)

## 1.1 Executive Summary
A hyper-local, family-run e-commerce and community business specializing in 3D-printed fidget toys and puzzles. Run by two brothers (Leo, 12, and Sam, 10) and their Uncle Mike. The brand leverages the "Maker Movement" aesthetic, operating on a limited-capacity, high-scarcity model to drive demand. 

Instead of a massive, static catalog, the store features a rotating, weekly updated assortment of "Hero" items (The "Weekly Drop"). Scarcity is by design, embracing the natural bottleneck of a single 3D printer.

## 1.2 System Actors
1. **Customer (Guest):** Community member purchasing via mobile. No mandatory account creation to reduce friction.
2. **Admin (Uncle Mike):** Manages business operations: store state (Factory Switch), drops, fulfillment, InPost labels, refunds.
3. **The Makers (Leo & Sam):** Require a simplified, read-only "Production View" to see what needs to be printed each day, aggregated by color and model.
4. **External Systems:** 
    * **Payment Gateway:** Aggregator (e.g., PayU/Przelewy24) for native BLIK integration.
    * **Logistics API:** InPost Paczkomaty (Geowidget for locker selection and API for label generation).

## 1.3 Core Marketing & Operational Pillars
* **Authenticity:** Raw, blueprint-style UI. Photography features real hands and the actual 3D printing process.
* **FOMO (Fear Of Missing Out):** Weekly rotating assortment and limited printer capacity naturally create urgency.
* **Batched Fulfillment:** Orders are aggregated after the drop closes. Production is batched by color and model to maximize printer efficiency.