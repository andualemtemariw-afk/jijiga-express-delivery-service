# Jijiga Express — Operational Remediation

## Implemented

- Atomic order + inventory reservation and atomic cancellation/restoration for FOOD and KHAT.
- Firestore reservations are linked to order, batch, customer, quantity, and action.
- Rider payment-status mutation is limited; non-COD delivery requires a trusted confirmed payment state.
- Real device GPS is persisted with `riderLocationUpdatedAt`.
- Production maps do not simulate rider coordinates; demo/development simulation is explicitly gated.
- EEU receipts are captured from the device and uploaded to protected immutable Storage paths.
- Staff provisioning/deactivation uses trusted Functions and Auth custom claims.
- One-time administrator bootstrap is operator-only and refuses to overwrite an existing unrelated administrator.
- A reproducible production-validation workflow and focused Firebase rules workflow are present.

## Validation evidence

Completed CI evidence:
- Root `npm ci`: success.
- Root `npm run lint`: success on the last completed validation run.
- Root `npm run build`: success on the last completed validation run.
- Functions `npm ci`: success.
- Functions `npm run lint`: success on the last completed validation run.
- Functions `npm run build`: success on the last completed validation run.
- Functions high-severity audit gate: success.
- Root high-severity audit gate: failure because the known root dependency findings remain.

The Firebase Emulator suite has reached the actual smoke script in prior runs, but current-head success is not yet recorded. Earlier failures were test-harness defects (Admin SDK resolution and fixture variable reference), not evidence that the application rules are safe.

## Deployment requirements

1. Run and record `PRODUCTION_SMOKE_TESTS.md` against the emulator.
2. Store `PAYMENT_WEBHOOK_SECRET` in Firebase Secret Manager.
3. Implement the selected real payment provider's signature adapter before accepting production callbacks.
4. Keep `VITE_ENABLE_DEMO_SANDBOX=false` in production.
5. Refresh Auth ID tokens after staff role/active custom claims are changed.
6. Restrict Google Maps production keys to the production origin and required APIs.
7. Configure monitoring, backups, and alerting.
