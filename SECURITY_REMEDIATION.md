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

### Root

The current root Firebase package is `12.19.0`, with Firestore `4.17.2`. The root lockfile resolves `@grpc/grpc-js 1.9.16` through the Firebase Web Firestore dependency tree. The current root audit reports 7 vulnerabilities: 4 high and 3 moderate.

The high findings are the `@grpc/grpc-js` advisories. The dependency is installed by the web Firestore package, while browser Firestore uses its WebChannel transport rather than Node gRPC. The dependency remains in the installed tree, so the audit finding is still recorded rather than suppressed.

The moderate root findings include the Capacitor CLI → xcode → uuid chain. Current stable `@capacitor/cli` is 8.5.2 and current stable `xcode` is 3.0.1; there is no same-line stable upgrade that removes this chain without introducing an unsupported or breaking dependency change.

### Functions

The current Functions package uses `firebase-functions 6.6.0` and `firebase-admin 13.10.0`. The current audit reports 8 moderate `uuid`-chain vulnerabilities through Google Cloud dependencies. The Functions high-severity audit gate passes, but the dependency tree is not audit-clean at moderate severity.

A coordinated Functions/Admin major-version upgrade is not being applied solely to silence audit output. It requires compatibility testing and still has known `uuid` dependency-chain findings in current Admin releases.

## Remaining release gates

- Successful current-head Firebase Emulator Firestore/Storage/Auth smoke tests.
- Successful current-head root/Functions build and typecheck run.
- Formal review/acceptance of the remaining dependency risk.
- Provider-specific payment signature verification adapter and production credentials.
- Production deployment of rules/functions and controlled post-deploy testing.
- Migration/review of the named Firestore database architecture before calling the backend production-ready.
