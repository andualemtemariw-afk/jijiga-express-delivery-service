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
- Root `npm run lint`: success.
- Root `npm run build`: success.
- Functions `npm ci`: success.
- Functions `npm run lint`: success.
- Functions `npm run build`: success.
- Functions high-severity audit gate: success.
- Root high-severity audit gate: success.
- Latest Firestore/Auth/Storage rules smoke tests: success.
- Latest Production Validation: success.

The final verified runtime head passed the complete configured CI gate. The prior smoke-test failure was a test-harness fixture defect and was corrected without weakening production rules.

## Deployment requirements

1. Run and record `PRODUCTION_SMOKE_TESTS.md` against the emulator.
2. Store `PAYMENT_WEBHOOK_SECRET` and the Telebirr production secrets in Firebase Secret Manager.
3. Use the implemented Telebirr provider-specific signature adapter before accepting production callbacks.
4. Keep `VITE_ENABLE_DEMO_SANDBOX=false` in production.
5. Refresh Auth ID tokens after staff role/active custom claims are changed.
6. Restrict Google Maps production keys to the production origin and required APIs.
7. Configure monitoring, backups, and alerting.
