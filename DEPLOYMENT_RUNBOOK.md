# Jijiga Express — Deployment Runbook

## Preconditions
- Merge only after the release candidate is explicitly marked READY.
- Use npm and the committed root and Functions lockfiles.
- Do not use npm audit fix --force.
- Do not downgrade Firebase packages to remove an audit finding.
- Confirm the Firebase project target from .firebaserc.
- Confirm the selected payment provider adapter and production credentials are available.
- Confirm Firebase Storage, monitoring, alerting, and backups are configured.

## Local validation

    npm ci
    npm run lint
    npm run build
    npm --prefix functions ci
    npm --prefix functions run lint
    npm --prefix functions run build
    npm audit --audit-level=high
    npm --prefix functions audit --audit-level=high

For rules validation, start the Firebase Emulator with Auth, Firestore, and Storage and execute PRODUCTION_SMOKE_TESTS.md.

## Firebase configuration

The current Firebase project is defined in .firebaserc.

Required backend secret:
- PAYMENT_WEBHOOK_SECRET — store in Firebase Secret Manager. Never commit it to source control.

The payment endpoint is a provider-neutral normalized contract. A real Telebirr/eBirr/CBE Birr/Coop Pay integration must supply the provider-specific signature verification adapter before production callbacks are accepted.

## Rules and Functions deployment

After emulator tests pass:

    firebase use <project-id>
    firebase deploy --only firestore:rules,storage,functions

Do not deploy the frontend with the demo-sandbox flag enabled.

## Frontend validation before publish
- VITE_ENABLE_DEMO_SANDBOX must be false.
- No production provider secrets may be exposed through VITE_* variables.
- Restrict the Google Maps API key to the production origin and required APIs.

## Post-deploy smoke test

Repeat the production-safe subset of PRODUCTION_SMOKE_TESTS.md using controlled accounts.
Stop rollout immediately if an authorization rule unexpectedly permits a protected mutation.