# Jijiga Express — Phone-only Release Runbook

## Release model

This PR is intended for the existing Firebase project `sunny-discipline-hvd6f` and existing Firestore database `ai-studio-remixjijigaexpre-729909c5-f38a-4c4a-8d31-a10d6eb77286`. It does not create a project or database. New service orders are COD-only until a trusted payment backend can be used without requiring a billing upgrade.

There is no Cloud Functions source or deployment workflow in this PR branch. EEU terminal receipt photos are compressed on the rider's phone and stored in the existing protected order document in Firestore, so this receipt flow does not need Cloud Storage.

## Exactly how rules deploy today

**On the current `main` branch before PR #2 is merged:** `.github/workflows/firebase-production-backend-deploy.yml` is triggered only by `workflow_dispatch` (someone manually starts it from GitHub Actions). It installs Firebase CLI and runs `firebase deploy --only firestore:rules,storage,functions`. It is not triggered by a normal push, and it is not automatically run when a pull request is opened. The separate `firestore-rules.yml` workflow runs tests only.

**In PR #2:** the backend deploy/preflight workflows and Functions source have been removed. After this PR is merged, these rules will not be automatically published by a workflow. The intended publishing method is copy/paste in Firebase Console.

**Hosting is separate:** `.github/workflows/firebase-hosting.yml` publishes the web front end from `main`. It does not publish Firestore rules. The Android build workflow builds an APK; it does not publish Firestore rules.

## Publish the Firestore rules from your phone

1. Open Firebase Console in your phone browser and select project `sunny-discipline-hvd6f`.
2. Open **Firestore Database** and select the existing database `ai-studio-remixjijigaexpre-729909c5-f38a-4c4a-8d31-a10d6eb77286`. Do not choose `(default)` unless you have confirmed that a separate app uses it. Do not create/migrate a database.
3. Open the database's **Rules** tab. Copy the currently published rules into a note first so you have a rollback copy.
4. In GitHub, open PR #2, select **Files changed**, and open `firestore.rules` from branch `fix/customer-profile-self-read`.
5. Copy the entire contents of `firestore.rules`, return to the selected Firestore database's Rules editor, replace the complete editor contents, and press **Publish**.
6. Confirm that the console shows the rules were published. Do not report the rules as live until this manual publish succeeds.

No CLI, computer, terminal, script, or deployment workflow is needed for these steps.

## Admin access without custom claims

The signed-in Firebase Auth email must be verified, and it must match one of the existing allow-listed email addresses in `firestore.rules`. The same account's Firestore document `/users/{uid}` in the selected database must contain `role: "admin"` and `active: true`. All three conditions are required. Admin authorization no longer reads custom claims.

You can inspect the account in Firebase Console → **Authentication** → **Users**, then use that user's UID to inspect `users/{uid}` in Firestore Console. Do not create a second admin profile or change a different customer's role.

## Former privileged backend functions

The existing `main` source had these Firebase Cloud Functions:
- `createServiceOrder`: server-side creation/pricing of Parcel, Ride, and EEU service orders.
- `provisionStaff`: privileged creation/provisioning of staff accounts.
- `setStaffActive`: privileged staff activation/deactivation.
- `createTelebirrCheckout`: server-side Telebirr checkout creation.
- `paymentWebhook`: HTTP payment settlement endpoint.
- `telebirrWebhook`: Telebirr payment callback/signature validation.

They were written under `functions/src/index.ts` using Firebase Cloud Functions v2 HTTPS APIs and were targeted at Firebase project `sunny-discipline-hvd6f`. Their code had no explicit `region`, which means the usual Firebase default is `us-central1`; confirm an actually deployed function's region and status in Firebase Console → **Functions**.

Firebase documents Cloud Functions as requiring the Blaze plan, so their source and deploy workflow have been removed from this PR. Removing code from GitHub does not delete functions already deployed to Firebase. If any of those names still appear in Console → Functions, delete only the obsolete functions there after confirming they are unused. No CLI is needed. This PR does not have access to verify or delete deployed resources in your Firebase project.

## Payment and receipt behavior

- New customer service orders use **Cash on Delivery (COD)** with `paymentStatus: "UNPAID"`.
- Online Telebirr/wallet checkout and webhook settlement are disabled in this branch. Do not use an old function endpoint to accept payment.
- The rider's EEU receipt image is compressed on-device and stored as a bounded JPEG data URL in the protected order document. Firestore rules limit its size and allow it to be attached once at `AT_EEU_HUB`; receipt/token fields are immutable afterward.
- Cloud Storage is not required for this receipt flow. This PR does not ask you to publish Storage rules or upgrade billing.

## Manual phone smoke test

After publishing rules, use a test customer: register/sign in, close/reopen the app, submit a COD order, and confirm it appears under that customer's account. Confirm a different customer cannot read it. Test rider order assignment and status changes with a designated test rider. For EEU, use test data only and do not submit a live recharge until the full physical card handoff is verified.

