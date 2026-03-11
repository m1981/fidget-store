
### 1. Actors (Who interacts with the system)
For a minimal setup, we only need three primary actors:
1.  **Customer (Guest):** We will skip mandatory account creation to reduce friction. Customers buy as guests using their phone number and email.
2.  **Store Owner (Admin):** You, managing the hustle from your smartphone.
3.  **External Systems:** 
    *   Payment Gateway (e.g., PayU, Przelewy24, Tpay) for BLIK.
    *   Logistics API (InPost Paczkomaty) - *Crucial for Poland.*

---

### 2. Minimal Feature Set (The "Must-Haves")

#### A. Customer-Facing (Mobile Storefront)
*   **Product Feed (Homepage):** A simple, Instagram-style vertical scrolling feed of products with high-quality images, price, and an "Add to Cart" button.
*   **Product Details Modal:** A pop-up or slide-over screen with a short description, stock availability, and a larger image.
*   **Floating Cart:** A persistent cart icon showing the number of items and total price.
*   **Frictionless Checkout (One-Page):**
    *   Contact info (Email, Phone number).
    *   Delivery selection (Local Pickup / InPost Paczkomat map widget).
    *   Payment selection (BLIK as the default/primary option).
*   **Order Confirmation Page:** Displays the order number and a summary.

#### B. Admin-Facing (Mobile Dashboard)
*   **Simple Order Management:** A list of orders with statuses (New, Paid, Sent, Completed).
*   **Basic Product Management:** Ability to take a photo with your phone, add a title, price, and stock quantity, and publish it instantly.
*   **Push Notifications:** Instant alert on your phone when a new order is placed and paid.

---

### 3. Core Use Cases (User Flows)

#### Use Case 1: The Customer Purchase Flow (BLIK Focus)
1.  **Trigger:** Customer opens the store link via social media (Instagram/TikTok/Facebook local group).
2.  **Action:** Customer scrolls the feed and taps "Add to Cart" on an item.
3.  **Action:** Customer taps the Cart icon and proceeds to Checkout.
4.  **Action:** Customer enters their phone number and email.
5.  **Action:** Customer selects "InPost Paczkomat" and chooses their local locker from the mobile map.
6.  **Action:** Customer selects **BLIK**.
7.  **System:** Prompts for the 6-digit BLIK code (or uses BLIK One-Click if they are a returning customer who saved the store in their banking app).
8.  **Action:** Customer enters the code and confirms in their banking app.
9.  **System:** Payment gateway confirms payment instantly. System shows the "Thank You" screen and sends an SMS/Email receipt.

#### Use Case 2: Store Owner Order Fulfillment
1.  **Trigger:** Admin receives a push notification: *"New Order #102 paid via BLIK."*
2.  **Action:** Admin opens the mobile dashboard and views order details (Items, Paczkomat ID).
3.  **Action:** Admin packs the item.
4.  **Action:** Admin taps "Generate InPost Label" (integration automatically creates the shipping label).
5.  **Action:** Admin changes order status to "Sent."
6.  **System:** Sends an automated SMS/Email to the Customer with the InPost tracking link.

#### Use Case 3: Adding a New Product
1.  **Trigger:** Admin has a new batch of local products.
2.  **Action:** Admin opens the mobile dashboard and taps "Add Product."
3.  **Action:** Admin uses the phone camera to snap a picture.
4.  **Action:** Admin types the name, sets the price (PLN), and sets inventory count (e.g., 5 items).
5.  **Action:** Admin taps "Publish."
6.  **System:** Product instantly appears on the mobile storefront feed.

---

### 4. Technical & Market Specifics for Poland (2026)

*   **Payment Gateway:** You don't need to integrate BLIK directly. Use an aggregator like **Przelewy24, PayU, or Autopay**. They offer out-of-the-box mobile-optimized BLIK widgets. In 2026, ensure the gateway supports *BLIK Zbliżeniowy* (Contactless) or *BLIK One-Click* for returning customers.
*   **Delivery:** **InPost Paczkomaty** is non-negotiable in Poland. You must include the mobile-friendly InPost Geowidget so users can select their locker. For a local hustle, also add a free "Odbiór osobisty" (Local Pickup) option.
*   **Legal (Omnibus Directive):** Even for a small hustle, Polish law requires you to show the lowest price from the last 30 days if you run a promotion. Keep it simple: don't run "fake" sales in the MVP to avoid building this complex feature. Just use flat pricing.
*   **Tech Stack Recommendation:** Since it's mobile-only, a **PWA (Progressive Web App)** built on a headless framework (like Next.js/React) connected to a lightweight backend (like Supabase or a simplified Shopify/WooCommerce headless setup) is ideal. It feels like a native app but requires no App Store approval.

----

This is a brilliant business concept. The "Fidget Fun!" idea perfectly taps into the 2026 social commerce trends in Poland (TikTok/Instagram Reels driving traffic) and leverages the "Underdog/Maker" psychology. 

Because you are selling **capacity and reservations** rather than off-the-shelf inventory, the standard e-commerce model needs to be tweaked. We are moving from a traditional "Store" to a **"Drop & Batch Production"** platform.

Here is how we adapt the system requirements to support your specific story, including the "Factory Pause" feature and new use cases tailored to the boys' workflow.

---

### 1. Expanded Actors
We need to split the Admin role to support the family dynamic:
1.  **Customer (Guest):** The community member buying the story and the product.
2.  **Admin (The Uncle):** Manages the business side (Payments, InPost labels, refunds, turning the store on/off).
3.  **The Makers (The Boys):** Need a simplified, read-only mobile view that answers one question: *"What do we need to print today?"*

---

### 2. New & Refined Core Features (The "Fidget Fun" MVP)

*   **The "Factory Switch" (Pause/Vacation Mode):** A master toggle in the Admin panel. When flipped, it disables the checkout, changes "Reserve" buttons to "Out of Stock," and displays a customizable banner (e.g., *"Printer is cooling down! Back on Monday"* or *"Boys are on a school trip!"*).
*   **The "Drop" Countdown Timer:** A prominent, sticky timer on the mobile homepage counting down to the end of the current reservation window (e.g., *"Batch #4 closes in 2 days, 14 hours"*).
*   **Batched Production View:** A specific screen for the boys that aggregates orders not by customer, but by **Color and Model** to optimize the 3D printer build plate.
*   **Mystery Box Logic:** A product type that bypasses color/model selection, allowing you to use up leftover filament.

---

### 3. Discovered Supporting Use Cases

Here are the new use cases that bring your specific business model to life:

#### Use Case 4: Pausing the Home Factory (Outage/Holiday)
1.  **Trigger:** The 3D printer nozzle jams, or the family is going on a one-week holiday.
2.  **Action:** Admin (Uncle) opens the mobile dashboard and toggles "Factory Status" to OFF.
3.  **Action:** Admin types a short status message: *"Printer maintenance! Next drop delayed by 3 days."*
4.  **System:** Instantly updates the storefront. The countdown timer is replaced by the message. All "Reserve via BLIK" buttons are greyed out.
5.  **Action:** When ready, Admin toggles the switch back to ON, and the system resumes taking reservations.

#### Use Case 5: The Weekly Drop & FOMO Purchase
1.  **Trigger:** Customer clicks a link from a TikTok video showing the boys designing a new "Articulated Dragon."
2.  **System:** Customer lands on the mobile site. A banner reads: *"Batch #12: Only 30 Print Slots Available. Closes Sunday!"*
3.  **Action:** Customer selects the Dragon, chooses a color (e.g., "Silk Blue"), and taps **"Reserve My Spot"** (instead of "Add to Cart").
4.  **System:** Checks if the global capacity limit (e.g., 30 items per week) is reached. If not, proceeds to checkout.
5.  **Action:** Customer pays instantly via **BLIK**.
6.  **System:** Sends confirmation: *"You're in! The boys will start printing your Dragon on Monday. Expected InPost delivery: Thursday."*

#### Use Case 6: Generating the "Print Batch" (For the Makers)
1.  **Trigger:** The weekly reservation window closes on Sunday night.
2.  **Action:** The Makers (The Boys) open their specific mobile view on Monday morning.
3.  **System:** Instead of showing individual customer orders, the system aggregates the data and displays a "Print List":
    *   *Filament: Silk Blue -> 5x Dragons, 2x Spinners.*
    *   *Filament: Matte Black -> 10x Hex Puzzles.*
4.  **Action:** The boys load the Silk Blue filament, slice the files, and start the printer.
5.  **Action:** As items finish, the boys tap a checkbox next to the item on their phone.
6.  **System:** Once all items for a specific customer are checked off, the system alerts the Uncle: *"Order #105 is printed and ready for packing."*

#### Use Case 7: The "Filament Saver" Mystery Box
1.  **Trigger:** Customer wants to support the boys but doesn't know what to choose, or wants a surprise.
2.  **Action:** Customer selects "Mystery Box" on the storefront. There are no color or model options to choose from.
3.  **Action:** Customer pays via BLIK.
4.  **System:** Adds the Mystery Box to the Uncle's order list.
5.  **Value:** When the boys have half a spool of random filament left over from the main batch, they print a random item to fulfill this order, ensuring zero waste and maximum printer efficiency.

---

### 4. E-Commerce Engineering Advice for this Model

*   **Inventory Management:** Do not track inventory by *finished product*. Track inventory by **Printer Capacity Slots**. If your printer can make 40 items a week, your total store inventory is 40. Every time someone buys a Dragon or a Spinner, the global capacity drops by 1.
*   **Communication is Key:** Because customers are waiting for production, the system should ideally send one intermediate SMS/Email between Payment and Shipping. E.g., *"Update from the garage: Your item is currently on the printer!"* This reinforces the story and reduces "Where is my order?" messages.
*   **BLIK Pre-Auth (Optional for later):** For the MVP, take the BLIK payment immediately upon reservation. In the future (post-2026), you could use BLIK Pre-authorization, where the funds are locked but only captured when the Uncle generates the InPost label.

This setup keeps the technology minimal but perfectly aligns the software with the psychology of your brand. Shall we define the exact data fields needed for the "Print Batch" aggregation?


----


### 1. Feature Extraction from Mockups

Here are the specific features located in the designs that we must include in the engineering requirements:

**A. Homepage / Storefront (Image 1)**
*   **Dynamic Printer Status Widget:** A prominent UI block showing current operational status (e.g., "OPEN! The nozzle is cool and ready") and dynamic estimated shipping times (e.g., "2-3 Days"). This is the customer-facing side of the "Factory Switch."
*   **Scarcity Badges:** Overlays on product cards showing real-time capacity (e.g., "Only 8 left!" or "Batch 1 of 3").
*   **Horizontal Product Carousel:** For "This Week's Fresh Prints."
*   **Dedicated Mystery Box Block:** A distinct UI section with its own CTA ("Surprise Me!") separate from the standard product carousel.
*   **Trust/Story Section:** A static block featuring a photo of the founders and the "Homework comes before printing" rule.
*   **Footer Navigation:** Quick links for "Track My Order," "Contact Uncle Mike," and "Instagram."

**B. Product Detail Page (PDP) (Image 3)**
*   **Video/Animation Link:** A "See it Move! (Animation)" text link with a play icon, likely opening a lightweight modal or linking to a TikTok/Reel.
*   **Visual Color Swatches:** Circular UI elements for selecting filament colors (e.g., Rainbow, Silk Blue, Gold) instead of a standard dropdown menu.
*   **"Print Time & Effort" Widget:** A transparency feature showing the customer how long the item takes to make (e.g., "Approx. 14 hours to print").

**C. Checkout / Payment (Image 2)**
*   **Order Summary:** Clear breakdown of items and total cost.
*   **Native BLIK Integration UI:**
    *   Radio button selection for BLIK.
    *   6-digit input field formatted with spacing.
    *   **Active Countdown Timer:** (e.g., "Code expires in 1:45") - *Crucial technical requirement for BLIK API integration.*

*(Localization Note: The mockups show prices in USD ($). As your requirements engineer for Poland 2026, I will specify that the database and frontend must be localized to PLN (zł) for the actual build).*

---

### 2. Updated Use Cases

Based on the UI, here are the refined core use cases:

#### Use Case 1: The "Fidget Fun" Purchase Flow (Updated)
1.  **Trigger:** Customer lands on the mobile homepage.
2.  **Action:** Customer views the "Printer Status" widget to confirm the shop is taking orders.
3.  **Action:** Customer taps on the "Crystal Dragon" from the horizontal carousel.
4.  **System:** Opens the Product Detail Page (PDP).
5.  **Action:** Customer taps "See it Move!" to watch a quick animation, then selects the "Rainbow" color swatch.
6.  **System:** Updates the product image (if applicable) and displays the "Print Time & Effort" (14 hours).
7.  **Action:** Customer taps "Add to Cart".
8.  **Action:** Customer navigates to Checkout.
9.  **System:** Displays Order Summary.
10. **Action:** Customer selects BLIK and enters the 6-digit code from their banking app.
11. **System:** Starts the 2-minute countdown timer ("Code expires in 1:59").
12. **Action:** Customer confirms the payment in their banking app before the timer hits 0:00.
13. **System:** Processes payment, shows success screen, and deducts `1` from the global "Crystal Dragon" capacity limit.

#### Use Case 4: Pausing the Home Factory (Updated to match UI)
1.  **Trigger:** The boys have heavy homework loads this week.
2.  **Action:** Admin (Uncle Mike) opens the backend and toggles the Factory Switch to "PAUSED".
3.  **Action:** Admin updates the status text to: *"Homework week! Next drop on Friday."*
4.  **System:** The Homepage "Printer Status" widget turns Red/Grey. The text updates to the new message.
5.  **System:** All "Add to Cart" buttons on PDPs are disabled. The Scarcity Badges change to "Paused".

#### Use Case 7: The "Filament Saver" Mystery Box (Updated to match UI)
1.  **Trigger:** Customer scrolls past the weekly prints and sees the "Feeling Lucky?" section.
2.  **Action:** Customer taps "Surprise Me!".
3.  **System:** Instantly adds the $20 (PLN equivalent) Mystery Box to the cart without requiring color or model selection.
4.  **Action:** Customer completes BLIK checkout.
5.  **Value:** The boys use leftover filament at the end of the week to fulfill this, maximizing profit margins on otherwise wasted plastic.

### Next Steps for Specification
The UI is highly polished for an MVP. To build this efficiently, we should specify a **Headless CMS** (like Sanity or Strapi) so Uncle Mike can easily update the "Printer Status" text, swap out the "Weekly Drop" products, and change the Scarcity limits without touching any code. 
