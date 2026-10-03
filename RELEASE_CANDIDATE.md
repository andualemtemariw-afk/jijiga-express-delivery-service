# Jijiga Express — Release Candidate

## Candidate

- Repository: `andualemtemariw-afk/jijiga-express-delivery-service`
- Branch: `feat/stage2-operational-remediations`
- Pull request: #1 — Apply Stage 3 production hardening
- Target: `main`
- Current head: `90e059dd02416302601bb718b01580e44cc5e746`

## Current gate

**NOT READY FOR MERGE**

Automated CI/security validation is green on the current head. The remaining work is production architecture, credential provisioning, deployment, and controlled post-deploy verification.

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

- Production Validation run **37150064530** passed on head `90e059dd02416302601bb718b01580e44cc5e746`.
- Firestore rules tests run **37150064522** passed on the same head.
- Root typecheck and frontend production build passed.
- Functions install, typecheck, and production build passed.
- Root dependency audit passed at the configured high-severity gate.
- Functions dependency audit passed at the configured high-severity gate.
- Telebirr signature adapter smoke tests passed.
- Firestore/Storage security smoke tests passed against the single supported emulator database.

## Remaining release blockers

1. **Named Firestore database architecture.** The app and Functions currently use the named database `ai-studio-remixjijigaexpre-729909c5-f38a-4c4a-8d31-a10d6eb77286`. Current Firebase Admin and Web SDK references mark named-database access as Public Preview and advise against production use. Do not silently switch to `(default)`; complete a controlled data migration and configuration change first.
2. **Telebirr production credentials.** Configure the real Fabric app ID/secret, merchant app ID/code, signing keys, callback URL, and redirect URL through Firebase Secret Manager. No secrets belong in source control.
3. **Non-Telebirr providers.** The current customer payment set is intentionally limited to Telebirr and COD. eBirr/CBE Birr/Coop Pay/etc. must not be enabled until each has its own verified provider callback adapter.
4. **Production Firebase deployment.** No production backend deployment has been performed from this PR.
5. **Post-deploy production smoke testing.** Run controlled Auth/Firestore/Storage/Functions/Telebirr lifecycle checks against the production project with non-destructive data and rollback procedures.
6. **Moderate dependency advisories.** The configured high-severity gates pass, but remaining moderate advisories still require owner acceptance, upstream remediation, or tested upgrades before making a stronger dependency-risk claim.

## Merge rule

Do not merge PR #1 until the remaining production blockers above have recorded evidence or an explicit, documented production-risk acceptance is made by the owner.
