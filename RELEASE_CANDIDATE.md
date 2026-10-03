# Jijiga Express — Release Candidate

## Candidate

- Repository: `andualemtemariw-afk/jijiga-express-delivery-service`
- Branch: `feat/stage2-operational-remediations`
- Pull request: #1 — Apply Stage 3 production hardening
- Target: `main`
- Current head: `f0da46cc71d14723547854b656191af7dd75e372`

## Current gate

**NOT READY FOR MERGE**

Automated CI/security validation is green on runtime head `5d57dc9`; the latest documentation head `f0da46c` also passed fresh Firestore rules and Production Validation runs. Remaining work is production credential provisioning, deployment, controlled post-deploy verification, and dependency-risk disposition.

## Implemented

- Firestore authorization and service-specific order validation.
- Atomic FOOD and KHAT inventory reservation.
- Immutable scoped EEU receipt storage independent of cross-database Storage lookups.
- Production/demo GPS separation.
- Strict rider delivery/payment state.
- Idempotent payment event handling.
- Trusted staff provisioning and one-time admin bootstrap.
- Reproducible npm lockfiles and CI workflows.
- Firebase Emulator smoke-test harness.
- Telebirr provider-specific signing verification, merchant identity validation, server-side H5 checkout creation, merchant-order binding, idempotent callback settlement, and client redirect.
- Generic normalized payment webhooks explicitly reject Telebirr so the provider-specific callback cannot be bypassed.

## Verified evidence — 2026-10-03 UTC

- Production Validation run **37152937776** passed on documentation head `f0da46cc71d14723547854b656191af7dd75e372`.
- Firestore rules tests run **37152937798** passed on the same documentation head.
- Root typecheck and frontend production build passed.
- Functions install, typecheck, and production build passed.
- Root dependency audit passed at the configured high-severity gate.
- Functions dependency audit passed at the configured high-severity gate.
- Telebirr signature adapter smoke tests passed.
- Firestore/Storage security smoke tests passed against the single supported emulator database.

## Remaining release blockers

1. **Telebirr production credentials.** Configure the real Fabric app ID/secret, merchant app ID/code, signing keys, callback URL, and redirect URL through Firebase Secret Manager.
2. **Production Firebase deployment.** Deploy Firestore/Storage rules and Functions from the release head after production environment checks.
3. **Post-deploy production smoke testing.** Run controlled Auth/Firestore/Storage/Functions/Telebirr lifecycle checks against production with non-destructive data and rollback procedures.
4. **Moderate dependency advisories.** The configured high-severity CI gates pass; remaining moderate findings require documented owner acceptance, upstream remediation, or tested upgrades before making a stronger dependency-risk claim.

## Merge rule

Do not merge PR #1 until the remaining production blockers above have recorded evidence or an explicit, documented production-risk acceptance is made by the owner.
