# Jijiga Express — Release Candidate

## Candidate

- Repository: `andualemtemariw-afk/jijiga-express-delivery-service`
- Branch: `feat/stage2-operational-remediations`
- Pull request: #1 — Apply Stage 3 production hardening
- Target: `main`
- Current head: `442f78f81fae850087bc1abce1f3c206b655387a`

## Current gate

**NOT READY FOR MERGE**

CI/security validation is green on the current head. The remaining items are production architecture, payment-provider integration, dependency-risk disposition, deployment, and post-deploy verification.

## Implemented

- Firestore authorization and service-specific order validation.
- Atomic FOOD and KHAT inventory reservation.
- Immutable scoped EEU receipt storage independent of cross-database Storage lookups.
- Production/demo GPS separation.
- Strict rider delivery/payment state.
- Idempotent payment event handling.
- Trusted staff provisioning and one-time admin bootstrap.
- Reproducible npm lockfiles and CI workflows.
- Firebase Emulator smoke-test harness and release documentation.

## Verified evidence — 2026-10-03 UTC

- Production Validation run **37146148474** passed on current head `442f78f81fae`.
- Current-head root typecheck passed.
- Current-head frontend production build passed.
- Current-head Functions install/typecheck/build passed.
- Current-head root dependency audit passed at the configured **high-severity** gate.
- Current-head Functions dependency audit passed at the configured **high-severity** gate.
- Current-head Firebase rules/Storage smoke tests passed.
- Dedicated Firestore rules run **37146148458** passed on current head.
- The earlier stale smoke-test run was canceled after the workflow was corrected to isolate runs by commit and bound smoke execution to 10 minutes.

## Remaining blockers

1. **Dependency risk disposition.** The root tree still has moderate advisories in the Capacitor/xcode/uuid dependency chain. Functions still has moderate `uuid`-chain advisories through Google Cloud dependencies. The CI high-severity gates pass, but these moderate findings still require owner acceptance, upstream remediation, or a tested dependency upgrade before a stronger release claim is made.
2. **Named Firestore database architecture.** The app and Functions use the named Firestore database `ai-studio-remixjijigaexpre-729909c5-f38a-4c4a-8d31-a10d6eb77286`. Current Firebase Admin and Web SDK references document named-database access as Public Preview, so production use requires an explicit architecture decision. This must not be changed silently because migrating to `(default)` could require a data migration.
3. **Payment-provider integration.** `paymentWebhook` currently accepts a normalized event after a shared secret check. The code explicitly documents that a concrete Telebirr/eBirr/CBE Birr/Coop Pay/etc. adapter must authenticate the provider's real callback signature before forwarding the normalized event. A real provider adapter and production credentials are still required.
4. **Production Firebase deployment.** No production backend deployment has been performed from this PR.
5. **Post-deploy production smoke testing.** After deployment, run controlled Auth/Firestore/Storage/Functions/payment lifecycle checks against the production project with non-destructive test data and rollback procedures.

## Merge rule

Do not merge PR #1 until the remaining blockers above have recorded evidence or an explicit, documented production-risk acceptance is made by the owner.
