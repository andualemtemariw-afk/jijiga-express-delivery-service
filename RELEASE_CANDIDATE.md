# Jijiga Express — Release Candidate

## Candidate

- Repository: andualemtemariw-afk/jijiga-express-delivery-service
- Branch: feat/stage2-operational-remediations
- Pull request: #1 — Apply Stage 3 production hardening
- Current reviewed head: c2dab969c00d58f2d92643c74e5d26b0a4afc5a9
- Target: main

## Current gate

NOT READY FOR MERGE

## Completed in this candidate

- Firestore authorization hardening.
- Service-specific customer-order validation.
- Atomic FOOD and KHAT inventory reservation.
- Immutable scoped EEU receipt storage.
- Production/demo GPS separation.
- Rider delivery payment-state enforcement.
- Payment webhook idempotency/replay protection.
- Explicit demo-sandbox configuration.
- Firebase Emulator Storage configuration.
- Security smoke suite and production-validation workflow.
- Root and Functions lockfiles retained.

## Evidence status

- CI workflow has started for the current branch.
- Emulator/build/audit job conclusions are not yet recorded in the release candidate.
- No production Firebase deployment has been performed.

## Remaining gates

1. Obtain successful root and Functions build/typecheck results from CI.
2. Obtain successful Firebase Emulator security-test results from CI.
3. Review the root dependency audit, including the known @grpc/grpc-js 1.9.16 dependency path.
4. Resolve or formally document the remaining dependency risk without unsafe overrides or forced downgrades.
5. Complete the provider-specific payment signature adapter and production credential configuration.
6. Perform controlled production smoke testing after backend deployment.

## Merge rule

Do not merge PR #1 while any of the above gates lacks recorded evidence.