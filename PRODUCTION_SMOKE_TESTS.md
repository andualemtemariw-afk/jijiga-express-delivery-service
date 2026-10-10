# Jijiga Express — Security Smoke-Test Matrix

CI runs the Auth, Firestore, and Storage emulator tests automatically on this PR. These are emulator tests, not proof that the production Console rules have been published or that the APK has been tested on a physical phone.

## Authentication and profiles
1. Anonymous users cannot read/write protected Firestore collections.
2. A newly registered customer can read their own missing profile before profile creation, then read it after sign-out/re-authentication.
3. Customer self-registration can create only a profile at the authenticated UID with role `customer`.
4. Customer cannot set their own `active` flag or change their profile role.
5. Customer cannot read another customer's profile.
6. Active runner/rider cannot read unrelated customer profiles.
7. Admin access succeeds only for a profile with role `admin`, `active: true`, a verified Auth email, and an email from the existing allow-list; admin Firestore access does not depend on custom claims.
8. Unverified and non-allow-listed admin identities are denied.

## Orders and payment state
9. Unauthenticated users cannot create protected orders.
10. Customer-created orders must be COD with `paymentStatus: UNPAID`; clients cannot create an already-paid order or inject payment-verification fields.
11. New COD FOOD/KHAT orders must link their inventory reservation and stock delta in a transaction.
12. COD Parcel/Ride/EEU orders must pass the service-specific field/pricing rules.
13. Customer can read only their own order; a different customer cannot read it or cancel it.
14. Runner cannot self-assign a PENDING order without the `RUNNER_ASSIGNED` transition.
15. Rider cannot self-assign a PENDING order; a rider claim must start from a ready-for-dispatch state.
16. Rider cannot mark a digital order paid or change its payment state to `PAID_CONFIRMED`. Rider may collect COD only as part of the allowed delivery transition.
17. A paid non-COD order cannot be customer-cancelled before a refund process exists.

## Inventory integrity
18. Direct customer stock tampering is denied.
19. A reservation greater than available stock is rejected.
20. Customer cancellation restores exactly the originally reserved quantity once, using a release record in the same transaction.
21. Customer cannot release inventory from a different batch or invent a larger release quantity.
22. Admin/Mamila stock management remains limited to authorized roles; the stock tamper denial test is for an ordinary customer.

## Messages and delivery events
23. Customer/rider messages are readable only by the order participants or an authorized admin.
24. An unrelated customer cannot read another order's message or forge a message with another sender identity.
25. Delivery event create requires actor UID = authenticated UID, role/order participation, an allow-listed payload, and event status equal to the order's current persisted status.
26. Outsider cannot forge a delivery event for another customer's order.
27. A customer cannot forge a future `DELIVERED` event while the order is still `PENDING`.

## EEU physical-card custody and receipts
28. EEU order creation requires a valid 13-digit/formatted meter number, recharge amount within the configured range and increment, separate service fee, explicit customer authorization, and the initial `WITH_CUSTOMER` custody phase.
29. Rider cannot change the meter number, recharge amount, service fee, hub, or customer authorization after order creation.
30. Rider cannot skip custody steps or mark the card returned without receipt evidence.
31. Receipt objects are image-only, size-limited, immutable, and scoped to the authenticated uploader's UID path.
32. Storage upload alone does not authorize an order change; the Firestore rules still require the assigned rider and valid custody transition before a receipt can be attached.

## Build and release
33. GitHub Actions runs root `npm ci`, `npm run lint`, `npm run build`, and the Firebase emulator rule test suite.
34. No production deploy is performed by these PR validation workflows.
35. The repository has no Cloud Functions source or backend deployment workflow in this release branch. Online Telebirr/wallet settlement is not enabled; use COD only.

Do not mark live authentication/order tests or a production rules publish as passed merely because emulator CI passes. Record the actual physical-device/Console result separately.
