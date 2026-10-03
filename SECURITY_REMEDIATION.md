# Jijiga Express – Production Security Remediation

This revision addresses the highest-risk client-side/backend authorization issues found during the production code review.

## Changes

- Customer self-registration can no longer assign `runner`, `rider`, `mamila`, or other staff roles.
- Order reads are scoped by customer ownership, courier assignment/dispatch role, or admin role.
- Customer order creation must begin in `PENDING` state and cannot self-assign couriers.
- Customer order updates are limited to cancellation, rating/review, and dispute fields.
- Runner and rider updates require role ownership and constrained status transitions.
- Order chat is limited to actual order participants and records the authenticated sender UID.
- Delivery events require the authenticated actor UID and matching role/order relationship.
- The unused standalone `orderChats` collection is closed.
- Mamila inventory writes are constrained by the user's assigned `mamilaId`.
- Removed fake default phone/address/plus-code values from new user profiles.
- Android CI continues to use the repository's `package-lock.json` consistently through `npm ci`.

## Important remaining production work

These changes do **not** turn the simulated operational features into real integrations. Before launch, implement trusted backend workflows for:

1. Payment confirmation/webhooks.
2. Atomic inventory reservation and release.
3. Real device GPS telemetry.
4. Camera/receipt capture and secure Firebase Storage upload.
5. EEU token/recharge verification.
6. Server-side staff provisioning/custom claims.
7. Automated Firestore Rules tests.

The rules should be deployed and tested against a Firebase Emulator/CI rules test suite before production deployment.
