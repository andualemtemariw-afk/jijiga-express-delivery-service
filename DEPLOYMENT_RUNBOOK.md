# Jijiga Express — Phone-only Release Runbook

## Release model

This branch is designed for the existing Firebase project on the no-cost Spark plan. The customer app writes to the existing Firestore database under restrictive security rules; there is no Cloud Functions source or automatic Cloud Functions deployment in this branch. New orders are COD-only. Telebirr/online checkout must remain disabled until there is an approved, trusted payment verification backend.

No Firebase CLI, local computer, bootstrap script, custom auth claims, new Firebase project, or new database is required to publish the rules.

## Preserve the current rules before publishing

1. Open Firebase Console on your phone and select project `sunny-discipline-hvd6f`.
2. Open Firestore Database and select the existing database `ai-studio-remixjijigaexpre-729909c5-f38a-4c4a-8d31-a10d6eb77286`. Do not create or migrate a database.
3. Open the **Rules** tab and copy the currently published rules somewhere safe as rollback evidence before changing anything.
4. In GitHub, open PR #2, choose **Files changed**, and open `firestore.rules` from branch `fix/customer-profile-self-read`. Copy the complete contents of that file.
5. Return to the selected production database's Rules editor, replace the editor contents with the copied file, and press **Publish**.
6. Do not publish to `(default)` unless you verify a separate running client uses that database. Firestore rules apply per database; the app is configured for the named database above.

## Publish Storage rules

If the existing Firebase Storage bucket is available in your current plan:

1. In the same project, open **Storage** → **Rules**.
2. Save a copy of the current rules for rollback.
3. Copy the complete `storage.rules` contents from the same PR branch, paste them into the Storage Rules editor, and press **Publish**.

Receipt uploads are immutable, limited to image files up to 10 MiB, and scoped to the authenticated user's UID path. A user still cannot attach a receipt to another customer's order because the Firestore order rules require the assigned rider identity and a valid EEU custody transition. If Firebase Console requires a billing upgrade for your existing Storage bucket, do not add billing without approval; photo receipt upload will remain unavailable until an acceptable no-cost option is confirmed.

## Admin access without scripts or custom claims

An administrator must satisfy **all three** conditions:
- Firebase Authentication email is verified.
- The email is one of the existing allow-listed addresses in `firestore.rules`.
- The profile `/users/{uid}` in the selected Firestore database has `role: "admin"` and `active: true`.

You can check the Auth UID in Firebase Console → Authentication → Users, and inspect the profile document in Firestore Console. Console edits use project-owner privileges. Do not change another customer's profile or set admin access on an unverified/non-allow-listed account. Admin privileges do not depend on custom claims.

## Old deployed Cloud Functions

Deleting source code or a workflow from GitHub does **not** delete a function already deployed in Firebase. Open Firebase Console → Functions and check whether any old functions are listed. If present, remove obsolete functions only after confirming they are no longer required: `createServiceOrder`, `provisionStaff`, `setStaffActive`, `createTelebirrCheckout`, `paymentWebhook`, and `telebirrWebhook`. Use the Console's delete action; no CLI is required. If none are listed, nothing needs deleting. Do not re-enable online payments by calling an old endpoint.

## What runs automatically

- GitHub Actions runs the TypeScript/build and Firebase Emulator rule tests for PR #2.
- The Android workflow builds a debug APK only when code is pushed to `main` (or manually dispatched from GitHub Actions). A PR does not publish production rules.
- The separate `firebase-hosting.yml` workflow affects the web/PWA only and runs from `main`; it does **not** publish Firestore or Storage rules. Its prior run failed because the `FIREBASE_SERVICE_ACCOUNT` secret was missing.

## Manual smoke test after publishing

Use a new customer account to register/sign in, close and reopen the app, place a COD order, and verify that only that customer can read it. Then check the order under the dispatcher/rider account. For EEU, do not process a real meter/recharge during testing; verify only the custody and receipt UI until the full flow is confirmed with a controlled test.
