# Jijiga Express — Production Launch Plan

## Implemented in Stage 3

- Firebase Storage import/type fix.
- Rider and diagnostic delivery flows no longer mark non-COD orders as paid from the client.
- Admin Firestore updates are blocked from changing payment verification fields directly.
- Staff access honors the `active` flag so deactivated staff lose role access.
- Removed demo/default EEU token from the Rider receipt workflow.
- Added a trusted Firebase Functions layer for staff provisioning/deactivation.
- Added a provider-neutral payment webhook contract that validates order ID, amount, currency and payment state before writing `paymentStatus`.
- Registered the `functions/` source directory in `firebase.json`.
- Added a trusted `createServiceOrder` callable for PARCEL, RIDE, and EEU_RECHARGE pricing and order creation; direct customer Firestore creation is limited to inventory-backed FOOD/KHAT.
- Added an npm root override for `@grpc/grpc-js` 1.14.5 and locked its transitive dependency tree.

## Payment integration rule

Do not connect a payment provider directly to React to set `PAID_CONFIRMED`.
The provider adapter must authenticate the provider's webhook/signature and then send a normalized event to `paymentWebhook`.

Normalized event fields:

- `orderId`
- `provider`
- `reference`
- `status`
- `amount`
- `currency` (`ETB`)

The backend rejects unknown orders, unsupported currency, and amount mismatches.

## Staff provisioning

Create or deactivate staff through `provisionStaff` and `setStaffActive` callable functions. The client must not create a Firestore user profile with a staff role.

## Remaining deployment work

1. Install `functions/` dependencies and generate its lockfile.
2. Configure `PAYMENT_WEBHOOK_SECRET` using Firebase Secret Manager, not source code.
3. Implement the specific payment-provider signature adapter before accepting real provider callbacks.
4. Run Firebase Emulator rules tests against `firestore.rules` and `storage.rules`.
5. Review the remaining moderate dependency findings and add monitoring/alerts and production backups before public launch.
