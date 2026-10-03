# Jijiga Express — Production Security Remediation

## Implemented hardening

- New users can self-create only a customer profile; the legacy client-side admin bootstrap exception has been removed.
- Staff and admin authorization fails closed unless the profile explicitly has `active=true`.
- Customer order creation uses a strict field allowlist and cannot inject courier or payment-verification fields.
- Customer order creation validates service type, initial payment state, numeric bounds, service-specific pricing, and required inventory reservation for FOOD/KHAT.
- Customer order updates cannot modify protected pricing, payment-verification, or courier-assignment fields.
- Runner/rider transitions are constrained by authenticated role, ownership, and status.
- A rider cannot deliver a non-COD order unless `paymentStatus=PAID_CONFIRMED`; COD delivery requires `COLLECTED_BY_RIDER`.
- EEU receipt objects are immutable after creation, image-only, size-limited, and scoped by order/rider/customer metadata.
- Production code no longer invents rider GPS coordinates; synthetic telemetry is restricted to the explicit demo sandbox.
- Payment webhook events require authenticated normalized input, amount/currency/provider checks, durable event IDs, idempotent replay handling, and conflicting-reference protection.
- Root and Functions lockfiles are committed and installed with `npm ci`.

## Dependency findings

The current CI configuration runs high-severity audits for both the root project and Functions. The verified latest release validation passed both high-severity audit jobs. Moderate dependency advisories may remain in transitive dependencies and require documented owner acceptance, upstream remediation, or tested upgrades before making a stronger dependency-risk claim.

## Remaining release gates

- Successful latest-head Firebase Emulator Firestore/Storage/Auth smoke tests.
- Successful latest-head root/Functions build and typecheck run.
- Formal review/acceptance of the remaining dependency risk.
- Provider-specific Telebirr signature verification adapter and production credentials.
- Production deployment of rules/functions and controlled post-deploy testing.
- Firestore database architecture review; named-database usage is supported and migration to `(default)` is optional.
