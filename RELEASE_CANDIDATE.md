# Jijiga Express — Release Candidate

## Candidate
- Repository: andualemtemariw-afk/jijiga-express-delivery-service
- Branch: feat/stage2-operational-remediations
- Pull request: #1 — Apply Stage 3 production hardening
- Reviewed head at document creation: 675c78a1295bbbd3c4cd1532709e85d54d8adf6c
- Target: main

## Current gate

**NOT READY FOR MERGE**

## Completed hardening
- Firestore self-service role-escalation protections.
- Customer order field allowlisting and pricing validation.
- Inactive-staff fail-closed authorization.
- Atomic FOOD and KHAT inventory reservation.
- Immutable EEU receipt uploads.
- Production/demo GPS separation.
- Rider GPS freshness field.
- Payment webhook replay/idempotency protection.
- Explicit demo-sandbox configuration.
- Root and Functions npm lockfiles retained for reproducibility.
- Reproducible frontend/Functions validation workflow added.

## Outstanding gates
1. Root dependency audit still resolves @grpc/grpc-js 1.9.16 through the Firebase Web Firestore dependency tree. The verified current Firebase package is 12.19.0 and its Firestore package is 4.17.2. No compatible patched Firebase release was identified in the current npm metadata reviewed; do not force an out-of-range override without compatibility testing.
2. Firebase Emulator security tests must be executed and recorded.
3. Root and Functions CI must run and produce successful build/typecheck evidence.
4. A provider-specific payment signature adapter and real provider credentials are still required before accepting production callbacks.
5. No production Firebase deployment has been performed.

## Merge rule
Do not merge PR #1 until every outstanding gate has recorded evidence. Passing documentation or static inspection alone is insufficient.