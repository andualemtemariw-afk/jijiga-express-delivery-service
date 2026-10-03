# Jijiga Express — Production Smoke Tests

Run these tests against the Firebase Emulator before deployment, then repeat the operational subset against production with controlled test accounts.

## Authentication and roles
1. Anonymous users cannot read or write protected Firestore collections.
2. A first-time authenticated user can create only a customer profile under their own UID.
3. A customer cannot create or update a profile to admin, runner, rider, or mamila.
4. A customer cannot modify active or mamilaId.
5. An inactive staff account cannot access staff-scoped order data or mutate orders.

## Orders and payments
6. Customer order creation is rejected when it includes runnerId, riderId, payment verification fields, or other fields outside the allowlist.
7. Customer order creation is rejected when paymentStatus does not match the selected payment method.
8. Customer order creation is rejected when totalPrice does not match subtotal plus delivery fee.
9. Customer cannot change price, total price, delivery fee, payment status, or courier assignment after creation.
10. Runner cannot claim an order for another runner or bypass the allowed status transition.
11. Rider cannot deliver a non-COD order while payment is not PAID_CONFIRMED.
12. Rider can mark a COD order DELIVERED only with COLLECTED_BY_RIDER.
13. A non-COD rider cannot self-change PAID_CONFIRMED, provider, reference, or verification timestamp.

## Inventory
14. FOOD and KHAT order creation reserves stock atomically.
15. A reservation exceeding available stock fails without creating the order.
16. Customer cancellation restores the reserved quantity exactly once.
17. A customer cannot directly change inventory outside a valid reservation transaction.

## Storage
18. A rider can upload an EEU receipt only for an order assigned to that rider.
19. Receipt upload must be an image and no larger than 10 MiB.
20. Receipt metadata must contain the matching orderId and rider UID.
21. Existing receipt objects cannot be overwritten by a rider.
22. Customer, assigned rider, and active admin can read the receipt; unrelated users cannot.

## Payment webhook
23. Missing or incorrect webhook authentication is rejected.
24. Unknown order, non-ETB currency, amount mismatch, or invalid payment status is rejected.
25. Replaying the same eventId with the same payload is idempotent.
26. Reusing an eventId with a different payload is rejected.
27. A different payment reference cannot replace an already confirmed payment.
28. A refund cannot be applied to an order that was never confirmed paid.

## Demo separation
29. Synthetic courier/GPS simulation is available only in development or when VITE_ENABLE_DEMO_SANDBOX=true.
30. Production order creation does not initialize rider GPS with merchant coordinates.
31. Production simulation controls do not advance live orders.

## Build and release
32. npm ci succeeds at repository root.
33. npm run lint succeeds.
34. npm run build succeeds.
35. npm --prefix functions ci, npm --prefix functions run lint, and npm --prefix functions run build succeed.
36. npm audit --audit-level=high and the Functions audit are reviewed and recorded before merge.

Do not mark a test passed merely because the code path exists. Record the actual command, environment, date, and observed result.