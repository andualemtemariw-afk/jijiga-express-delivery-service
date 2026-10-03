# Jijiga Express — Operational Remediation

## Implemented

- Atomic order + inventory reservation transaction for FOOD and KHAT.
- Atomic customer cancellation + stock restoration.
- Firestore reservation records tied to the order, batch, quantity, and customer.
- Rider payment-status restrictions: riders cannot self-confirm non-COD payment.
- Non-COD delivery is blocked unless backend payment state is PAID_CONFIRMED.
- Real device GPS telemetry for active rider jobs, with a persisted riderLocationUpdatedAt timestamp.
- Production map components no longer invent rider positions; synthetic positions are demo/development-only.
- EEU receipt capture uses device image input and protected Firebase Storage.
- Receipt objects are immutable after creation.
- Demo behavior is controlled by VITE_ENABLE_DEMO_SANDBOX; production configuration defaults to false.
- Firebase Emulator configuration includes Auth, Firestore, and Storage endpoints.
- A GitHub Actions production-validation workflow runs root/Functions install, typecheck/build, and Firebase Emulator smoke tests.
- A separate CI dependency-audit job records audit failures rather than hiding them.

## Deployment requirements

1. Run PRODUCTION_SMOKE_TESTS.md against the Emulator before backend deployment.
2. Configure PAYMENT_WEBHOOK_SECRET in Firebase Secret Manager.
3. Implement the provider-specific webhook signature adapter before real callbacks.
4. Restrict production Google Maps keys to the production origin and required APIs.
5. Keep VITE_ENABLE_DEMO_SANDBOX=false in production.
6. Configure monitoring, alerting, and backups.