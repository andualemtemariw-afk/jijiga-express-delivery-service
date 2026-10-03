# Jijiga Express — Production Security Remediation

## Implemented hardening

- Customer self-registration is limited to a customer Firestore profile; client-side staff/admin email bootstrap was removed.
- Staff role access fails closed when the profile is missing, and inactive staff are denied staff-scoped operations.
- Customer-created orders use a strict field allowlist and cannot self-assign runners/riders or payment verification fields.
- Order creation validates service type, initial payment state, numeric bounds, and service-specific total-price rules.
- FOOD and KHAT customer orders require a same-transaction inventory reservation.
- Customer order updates cannot modify pricing, payment verification, or courier assignment fields.
- Runner and rider updates remain role/ownership/status constrained.
- Rider delivery of a non-COD order requires PAID_CONFIRMED; COD delivery requires COLLECTED_BY_RIDER.
- EEU receipt storage is create-only, immutable, image-only, size-limited, and metadata-bound to order/rider identity.
- Synthetic/demo rider GPS is disabled in production unless the explicit demo sandbox flag is enabled.
- Payment webhook events now require an event ID and are idempotent; conflicting replays and conflicting payment references are rejected.
- Root and Functions npm lockfiles remain committed and are installed with npm ci.

## Dependency finding

The current root Firebase npm package is 12.19.0 and its Firestore component is 4.17.2. The root lockfile resolves @grpc/grpc-js 1.9.16 through the web Firestore dependency tree. Functions resolves @grpc/grpc-js 1.14.5.

This finding has not been hidden with npm audit fix --force, an out-of-range override, or a Firebase downgrade. A compatible upgrade must be established by dependency testing before changing the root Firebase dependency graph.

## Remaining production gates

- Run and record the Firebase Emulator authorization suite.
- Complete successful root and Functions CI build/typecheck evidence.
- Review the current dependency-audit result and document any remaining advisories with runtime relevance.
- Implement the selected real payment provider signature adapter and configure its production credentials.
- Deploy Firestore/Storage rules and Functions only after the emulator suite passes.