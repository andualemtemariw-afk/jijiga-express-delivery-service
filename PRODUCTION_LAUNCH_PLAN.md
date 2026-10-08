# Jijiga Express — Production Launch Plan

## Implemented in Stage 3

- Firebase Storage import/type fix.
- Rider and diagnostic delivery flows no longer mark non-COD orders as paid from the client.
- Admin Firestore updates are blocked from changing payment verification fields directly.
- Staff access honors the `active` flag so deactivated staff lose role access.
- Removed demo/default EEU token from the Rider receipt workflow.
- Added a trusted Firebase Functions layer for staff provisioning/deactivation.
- Added a provider-neutral payment settlement path with strict order, amount, currency, provider, and payment-state validation.
- Added a trusted `createServiceOrder` callable for PARCEL, RIDE, and EEU_RECHARGE pricing and order creation; direct customer Firestore creation is limited to inventory-backed FOOD/KHAT.
- Added an npm root override for `@grpc/grpc-js` 1.14.5 and locked its transitive dependency tree.
- Added a provider-specific Telebirr adapter with RSA-PSS verification, merchant identity checks, H5 checkout creation, merchant-order binding, and idempotent settlement.

## Payment integration rule

Do not connect a payment provider directly to React to set `PAID_CONFIRMED`.

For Telebirr, the production flow is:

1. Customer creates an order with `paymentMethod=TELEBIRR`.
2. React calls `createTelebirrCheckout`.
3. The trusted Function creates the Telebirr H5 pre-order and signs it server-side.
4. Telebirr calls `telebirrWebhook`.
5. The Function verifies Telebirr's signature and merchant identity before settling the order transactionally.
6. Duplicate callbacks are idempotent through `paymentEvents`.

The generic `paymentWebhook` is not an adapter for Telebirr and explicitly rejects Telebirr traffic. New customer payment methods are restricted to Telebirr and COD.

## Staff provisioning

Create or deactivate staff through `provisionStaff` and `setStaffActive` callable functions. The client must not create a Firestore user profile with a staff role.

## Remaining deployment work

1. No Firestore migration is required solely because the project uses a named database; migrate only after an explicit architecture decision.
2. Configure Telebirr production secrets in Firebase Secret Manager.
3. Keep non-Telebirr payment methods disabled until their provider-specific adapters are implemented and tested.
4. Deploy Firestore/Storage rules and Functions from the release commit after environment and secret checks.
5. Run controlled production smoke tests for authentication, order creation, inventory reservation, delivery-state transitions, receipt upload, and the Telebirr payment lifecycle.
6. Review and disposition remaining moderate dependency advisories.

