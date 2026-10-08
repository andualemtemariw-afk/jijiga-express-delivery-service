# Jijiga Express — Release Candidate

## Candidate

- Repository: `andualemtemariw-afk/jijiga-express-delivery-service`
- Branch: `feat/stage2-operational-remediations`
- Pull request: #1 — Apply Stage 3 production hardening
- Target: `main`
- Verified CI head: `9e1ddcf313ac83f4ab4eb16a994c1b25c6d794c9`

## Current gate

**NOT READY FOR MERGE**

The current release branch is CI-green for the pull-request validation workflows. Production readiness remains blocked by real Telebirr credential provisioning, production Firebase deployment, Hosting provisioning, controlled post-deploy verification, and dependency-risk disposition.

## Verified automated evidence — 2026-10-04 UTC

- Production Validation run **37155588106** — **PASSED** on head `9e1ddcf313ac83f4ab4eb16a994c1b25c6d794c9`.
- Firestore rules tests run **37155588100** — **PASSED** on the same head.
- Root typecheck and frontend production build passed.
- Functions install, typecheck, and production build passed.
- Root and Functions dependency audits passed at the configured **high-severity** gate.
- Telebirr signature adapter smoke tests passed.
- Firestore/Storage emulator security tests passed, including the inventory-release customer attack test.

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
- Guarded Firebase Hosting live deployment workflow.
- Guarded Firebase production preflight workflow.
- Guarded Firebase backend deployment workflow.

## Firebase deployment controls

The release branch now contains:
- `.github/workflows/firebase-production-preflight.yml` — manually verifies the Firebase service-account secret, target project, required Firebase/Telebirr secrets, Hosting provisioning, demo-sandbox gate, and live-deployment guard without printing secret values.
- `.github/workflows/firebase-production-backend-deploy.yml` — manually deploys Firestore rules, Storage rules, and Functions to `sunny-discipline-hvd6f` only after the production environment is selected and the required secrets are present.
- `.github/workflows/firebase-hosting.yml` — deploys the Vite `dist/` output to the Firebase Hosting live channel only from `main`.

## Remaining production blockers

1. **Telebirr production credentials.** Provision the real Fabric app ID/secret, merchant app ID/code, signing keys, callback URL, and redirect URL through Firebase Secret Manager.
2. **Firebase production environment.** Confirm the production Firebase project, named Firestore database, Storage bucket, backups, monitoring, alerting, and rollback controls.
3. **Run production preflight.** Execute the manual Firebase production preflight workflow and require a successful result.
4. **Deploy backend.** Execute the guarded Firebase backend deployment workflow and record its deployment result.
5. **Deploy frontend.** Merge only after the release candidate is approved, then use the guarded `main` Hosting deployment and record the live URL.
6. **Post-deploy verification.** Execute controlled Auth/Firestore/Storage/Functions/Telebirr lifecycle smoke tests using non-destructive test data and rollback procedures.
7. **Moderate dependency advisories.** The high-severity CI gates pass; remaining moderate findings require owner acceptance, upstream remediation, or tested upgrades before making a stronger dependency-risk claim.

## Merge rule

Do not merge PR #1 until the production blockers above have recorded evidence or an explicit, documented production-risk acceptance is made by the owner.
