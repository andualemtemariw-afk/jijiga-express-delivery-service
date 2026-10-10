# Jijiga Express — Security Smoke-Test Matrix

GitHub Actions runs the Auth and Firestore Emulator tests automatically for this PR. These tests do not publish production rules and do not prove a physical phone flow.

## Authentication and profiles
1. Anonymous users cannot read/write protected Firestore documents.
2. A new customer can read their own profile before it exists, create only a customer profile at their own UID, sign out/re-authenticate, and read their own profile again.
3. Customer cannot promote their own profile, self-activate, or read a different customer profile.
4. An admin must have role `admin`, `active: true`, a verified Auth email and a match in the existing allow-list.
5. Unverified and verified-but-not-allow-listed admin accounts are denied admin access.

## Orders and payment state
6. Customer-created orders are COD-only and start `UNPAID`; a customer cannot inject a paid status or payment verification field.
7. FOOD/KHAT order writes must atomically link the order, stock delta and inventory reservation.
8. Parcel/Ride/EEU order creation validates required service data and configured pricing.
9. Customer can read only their own orders.
10. Runner cannot self-assign a PENDING order without the `RUNNER_ASSIGNED` transition.
11. Rider cannot self-assign a PENDING order; claims start from the dispatch-ready state.
12. Rider cannot set a digital order to `PAID_CONFIRMED`. For COD, `COLLECTED_BY_RIDER` is allowed only in the delivery transition.
13. Customer cannot cancel a paid order before a refund flow exists.

## Inventory
14. An ordinary customer cannot arbitrarily change batch stock.
15. A reservation exceeding the available quantity is denied.
16. Customer cancellation must restore exactly the originally reserved quantity once, through the linked release transaction.
17. A release with the wrong order/batch/quantity is denied.

## Messages and delivery events
18. A non-participant cannot read an order's messages or forge a message as another sender.
19. Delivery-event creation requires the authenticated actor UID, role/order participation, an allow-listed payload and status equal to the order's current persisted status.
20. An outsider cannot forge an event for another order.
21. A customer cannot create a future `DELIVERED` event while the persisted order remains `PENDING`.
22. Test also proves a legitimate order participant may add an event matching current status. This is a scoped client-authored event, not proof of a physical delivery; authoritative transition events would require trusted server-side code.

## EEU custody/receipt
23. EEU order create requires customer authorization, a valid meter number, allowed recharge amount, separate service fee and initial `WITH_CUSTOMER` phase.
24. Rider cannot change meter number, recharge amount, service fee, hub or customer authorization.
25. Rider cannot skip custody phases or mark an order returned before receipt evidence exists.
26. Assigned rider can add one correctly formatted, bounded JPEG data URL at `AT_EEU_HUB`.
27. Rider cannot replace receipt/token evidence after the first attach.
28. Receipt evidence is readable through the customer's own order; unrelated customers cannot read that order.

## Build/release
29. GitHub Actions runs root dependencies install, TypeScript check, production build, and emulator tests without local user scripts.
30. The PR's test workflows do not publish production rules.
31. The PR has no Cloud Functions source/deployment workflow. New orders are COD-only.

Do not mark production Console publishing or physical-phone verification passed just because CI passes.
