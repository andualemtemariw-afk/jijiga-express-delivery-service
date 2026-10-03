# Jijiga Express — Release Candidate

## Candidate

- Repository: `andualemtemariw-afk/jijiga-express-delivery-service`
- Branch: `feat/stage2-operational-remediations`
- Pull request: #1 — Apply Stage 3 production hardening
- Target: `main`
- Verified head: `3cf27f510d817bac5d2b097f48544ff4a1925761`

## Current gate

**NOT READY FOR MERGE**

The current head is CI-green for the pull-request validation workflows. Production readiness is still blocked by real Telebirr credential provisioning, production Firebase deployment, controlled post-deploy verification, and dependency-risk disposition.

## Verified automated evidence — 2026-10-03/04 UTC

- Production Validation run **37153708919** — **PASSED** on head `3cf27f510d817bac5d2b097f48544ff4a1925761`.
- Firestore rules tests run **37153708987** — **PASSED** on the same head.
- Root lint/typecheck and frontend production build passed in Production Validation.
- Functions install, typecheck, and production build passed.
- Root and Functions dependency audits passed at the configured **high-severity** gate.
- Telebirr signature adapter smoke tests passed.
- Firestore/Storage emulator security smoke tests passed.
- The inventory-release security fixture is seeded with the trusted Admin SDK and verifies the customer-side mutation against the real Firestore rules.

## Implemented

- Firestore authorization and service-specific order validation.
- Atomic FOOD and KHAT inventory reservation.
- Immutable scoped EEU receipt storage.
- Production/demo GPS separation.
- Strict rider delivery/payment state.
- Trusted staff provisioning.
- Reproducible npm lockfiles and CI workflows.
- Telebirr provider-specific signature verification, merchant identity validation, server-side H5 checkout creation, merchant-order binding, idempotent callback settlement, and client redirect.
- New customer payment methods are restricted to **TELEBIRR** and **COD**.
- Generic normalized payment webhooks explicitly reject Telebirr and unintegrated providers.

## Firebase Hosting status

- Firebase Hosting deployment configuration is committed at `.github/workflows/firebase-hosting.yml`.
- The workflow is guarded to deploy the **live** channel only from `main`.
- The deployment requires the `FIREBASE_SERVICE_ACCOUNT` GitHub secret and the configured Firebase project.
- The hosting site/domain still requires production provisioning and post-deploy URL evidence.

## Remaining release blockers

1. **Telebirr production credentials.** Configure the real Fabric app ID/secret, merchant app ID/code, signing keys, callback URL, and redirect URL through Firebase Secret Manager.
2. **Production Firebase deployment.** Deploy Firestore/Storage rules and Functions from the verified release head after confirming the production project, named Firestore database, Storage bucket, backups, monitoring, and rollback controls.
3. **Firebase Hosting production provisioning.** Confirm the Hosting site/domain and required frontend `VITE_*` configuration, then perform the guarded `main` deployment.
4. **Post-deploy production smoke testing.** Run controlled Auth/Firestore/Storage/Functions/Telebirr lifecycle checks against production with non-destructive data and documented rollback procedures.
5. **Moderate dependency advisories.** The configured high-severity CI gates pass; remaining moderate findings require owner acceptance, upstream remediation, or tested upgrades before making a stronger dependency-risk claim.

## Merge rule

Do not merge PR #1 until the remaining production blockers above have recorded evidence or an explicit, documented production-risk acceptance is made by the owner.
