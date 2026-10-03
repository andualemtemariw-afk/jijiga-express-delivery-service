# Jijiga Express — Release Candidate

## Candidate

- Repository: `andualemtemariw-afk/jijiga-express-delivery-service`
- Branch: `feat/stage2-operational-remediations`
- Pull request: #1 — Apply Stage 3 production hardening
- Target: `main`

## Current gate

**NOT READY FOR MERGE**

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

## Verified evidence

- Root install succeeded in CI.
- Root typecheck succeeded in the last completed validation run.
- Frontend production build succeeded in the last completed validation run.
- Functions install/typecheck/build succeeded in the last completed validation run.
- Functions high-severity audit gate succeeded.
- Root audit still fails at high severity: 4 high and 3 moderate findings remain.
- Current-head rules smoke test has not yet completed successfully.

## Remaining blockers

1. The current-head Firebase Emulator rules suite must pass.
2. The root dependency tree still contains the gRPC high-severity and Capacitor/xcode/uuid moderate findings; no unsafe override or forced downgrade will be used.
3. Functions contains 8 moderate uuid-chain findings even though its high-severity gate passes.
4. The app uses a named Firestore database. Firebase Admin named-database support is public preview and requires explicit production architecture review before launch.
5. The payment webhook remains provider-neutral; a real provider-specific signature adapter and production credentials are required.
6. No production Firebase backend deployment has been performed.
7. Controlled post-deploy production smoke testing remains outstanding.

## Merge rule

Do not merge PR #1 until the blockers above have recorded evidence or an explicit, documented production-risk acceptance is made by the owner.
