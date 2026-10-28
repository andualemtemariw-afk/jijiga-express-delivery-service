# JIJIGA EXPRESS DELIVERY SERVICE
## Systems Analysis & Senior Technical Product Management Report
**Downloadable Microsoft Word Document (.docx):** [`/downloads/Jijiga_Express_Systems_Analysis_Report.docx`](/downloads/Jijiga_Express_Systems_Analysis_Report.docx)  
**Target Environment:** Firebase Project `sunny-discipline-hvd6f`  
**Database:** Cloud Firestore (`ai-studio-remixjijigaexpre-729909c5-f38a-4c4a-8d31-a10d6eb77286`)  
**Production Host / Target:** Vercel (`https://jijiga-express-delivery-service.vercel.app`)  
**Locale / Operational Bounds:** Jijiga City & Somali Region, Ethiopia  

---

### Download Links
- **Microsoft Word Document (.docx):** Available in the app's Admin Dashboard and at `/downloads/Jijiga_Express_Systems_Analysis_Report.docx`
- **File Size:** ~14.4 KB
- **Formatting:** Formatted with headers, metadata tables, executive callout boxes, and priority matrix tables.

---

## 1. WORKSPACE PIPELINE & RECENT ACTIVITIES

### Telegram Bot Integration Track
- **Status:** *Awaiting Engineering Specification / External Service Track*
- **Audit:** Zero client-side bot credentials or webhook listeners are bundled into the frontend React/Vite distribution.
- **Backend Architecture Requirements:**
  - **Environment Variables:** `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, and `APP_SERVICE_URL` must reside exclusively on a secure backend server.
  - **Webhook Route:** `POST /api/webhooks/telegram` validated via `X-Telegram-Bot-Api-Secret-Token`.
  - **Event-Driven Dispatch:** Subscribes to Firestore order documents in `PENDING` or `READY_FOR_RIDER` status, transmitting dispatch cards directly to driver channels.

### Repository Status & Build Verification
- **Framework:** React 19 SPA, TypeScript 5.8, Vite 6, Tailwind CSS v4, Capacitor v8.
- **Verification:** `npm run typecheck` (`tsc --noEmit`) passes with 0 errors.
- **Regression Suite:** `npm test` (`scripts/unit-regression.mjs`) passes 7/7 unit tests verifying EEU electricity principal isolation (75 ETB platform fee vs. 1500 ETB utility principal), food merchant payout separation, Marhaba taxi/moto tariffs, 13-digit meter validation, and 5-phase EEU custody transitions.

### Emulator-Based Testing Safety Reviews
- Verification is routed through local Firebase Auth & Firestore emulators (`npm run test:rules`) to prevent unverified writes against production database `ai-studio-remixjijigaexpre-729909c5-f38a-4c4a-8d31-a10d6eb77286`.

---

## 2. CORE SYSTEM ARCHITECTURE & DATA STRUCTURES

### Multi-Role Identity Framework (RBAC)
Role separation across `CUSTOMER`, `MAMILA` (Merchant), `RUNNER`, `RIDER`, and `ADMIN`:
- **CUSTOMER:** Creates orders in `PENDING` state with COD payment invariants.
- **MAMILA:** Manages product batches and tags orders as `VERIFIED_READY`.
- **RUNNER & RIDER:** Handles batch aggregation, transit milestones (`PICKED_UP`, `DELIVERED`), and custody proofs.
- **ADMIN:** Allowlisted administrators (`andualemawraris4@gmail.com`, etc.) performing financial auditing and user management.

### Atomic Transaction Processing Chain (`runTransaction`)
Stock reservations are executed atomically in `src/services/orderTransactionService.ts`:
1. Concurrent read lock on `orders/{orderId}` and `batches/{batchId}`.
2. Verification of `batch.available >= order.quantity`.
3. Simultaneous batch inventory decrement, order creation, and `inventoryReservations/{orderId}` audit log record (`action: 'RESERVE'`).
4. Symmetrical cancellation rollback restores batch stock and writes `action: 'RELEASE'`.

---

## 3. STRATEGIC BOTTLENECKS & BLOCKING ARCHITECTURAL ISSUES

### Checkout Permissions & Rules Mismatches
- Fixed prior `FirebaseError: Missing or insufficient permissions` by aligning ride requests with security rules (`paymentMethod: 'COD'`, `paymentStatus: 'UNPAID'`, fixed tariffs: 283 ETB Taxi / 136 ETB Moto) and deferring driver assignments until rider acceptance.

### Regional Payment Gateway Integration (Telebirr & CBE Birr)
- Requires migration from offline COD to server-side webhook endpoints (`/api/payments/telebirr/notify`, `/api/payments/cbe-birr/callback`) with RSA/HMAC signature verification and `idempotencyKeys/{txnId}` deduplication. Currently *Awaiting Engineering Specification*.

### Mid-Checkout Stock Depletion
- Concurrent transactions reject depleted stock cleanly on the backend. Client checkout modals require real-time `onSnapshot` stock listeners to proactively inform customers before submission.

---

## 4. REGIONAL OPERATIONAL METRICS & LOGISTICS MAP

### Jijiga City Layout & Delivery Tariffs
- 20 Kebele zones with landmark-based routing (Kebele 04 Central Plaza, Taiwan Market, Arada Bakery Hub, Sheger South Depot, North Greenbelt Farm).
- Point-to-point tariffs calculated via Haversine distance with street dogleg interpolation and vehicle base rates.

### 4-Phase Execution Priority Checklist
1. **Phase 1: Core Transaction & Security Integrity** — *VERIFIED & ACTIVE*
2. **Phase 2: Hyperlocal Dispatch & Real-Time Logistics** — *IN PROGRESS*
3. **Phase 3: Regional Digital Payments & Webhooks** — *Awaiting Engineering Spec*
4. **Phase 4: Operational Automation & Telegram Track** — *Awaiting Engineering Spec*
