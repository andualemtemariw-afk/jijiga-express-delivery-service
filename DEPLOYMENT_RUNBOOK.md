# Jijiga Express — Phone-only Release Runbook

## Release model

This PR is intended for the existing Firebase project `sunny-discipline-hvd6f` and existing Firestore database `ai-studio-remixjijigaexpre-729909c5-f38a-4c4a-8d31-a10d6eb77286`. It does not create a project or database. New service orders are COD-only until a trusted payment backend can be used without requiring a billing upgrade. **Do not publish the new rules to live customers while only the old `main`-branch APK/app is in service**: its flows may no longer match these restrictions. Build and check the updated app first, then coordinate the rule publish with rollout. If this is a private test environment, the risk is smaller.

There is no Cloud Functions source or deployment workflow in this PR branch. EEU terminal receipt photos are compressed on the rider's phone and stored as a separate, immutable document at `/orders/{orderId}/receipts/terminal`. The image is fetched only when an authorized order participant opens it, so regular order-list reads do not download the photo. This uses Firestore only; no Cloud Storage is required.

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

Phone-only provisioning if the profile is missing or not yet admin:

1. In Firebase Console → **Authentication** → **Users**, open the intended account and copy its UID. Confirm the email is verified and matches one of the three addresses listed in `firestore.rules`. If the email is not verified, complete normal email verification, then sign out/in so Firebase issues a refreshed token.
2. Open the same named Firestore database → **Data**. Find `users/{UID}`. If it already exists, edit only the intended account's `role` to the string `admin` and `active` to the boolean `true`, preserving its other profile fields.
3. If there is no profile document, create a document in collection `users` with document ID exactly equal to the Auth UID. Add fields: `uid` (string, UID), `email` (string, verified allow-listed email), `displayName` (string), `role` (string, `admin`), `active` (boolean, `true`), and `createdAt` (string timestamp). Do not change another person's profile.
4. Sign out/in to Jijiga Express and verify the admin navigation appears. No custom claims are required, and no script/CLI is used.

## Create test staff accounts in the Console

Before the rider/runner tests, create one test account for each role in Authentication → Users, then create or update that exact UID's `/users/{uid}` document in the same Firestore database. Set `role` to the lowercase string `runner` or `rider` and `active` to the boolean `true`; preserve the other profile fields. Do not edit your admin profile to become a rider or runner.

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
- The rider's EEU receipt image is compressed on-device and stored as a bounded JPEG data URL in `/orders/{orderId}/receipts/terminal`, with a 300,000-character cap. The photo document can be created once by the assigned rider at `AT_EEU_HUB`, cannot be read by outsiders, and cannot be changed/deleted afterward. The order document stores only `receiptCaptured`, timestamp and token metadata; the app downloads the photo only when opened.
- Cloud Storage is not required for this receipt flow. This PR does not ask you to publish Storage rules or upgrade billing.
- Parcel, Ride and EEU tariffs are validated server-side by Firestore Rules: the client proposes values, but a customer cannot choose a zero/mismatched price. The current tariffs are hard-coded in `firestore.rules`, not stored in an admin-editable tariff document.

## Manual phone smoke test

Only after the updated app is ready and the rules have been published, run these phone checks in order and record each **PASS** or **FAIL**:

1. Register/sign in as a test customer and place one COD order.
2. Force-close Jijiga Express, reopen it, and confirm the order is still visible under that customer's account.
3. Sign in as the allow-listed admin and open the same order. If admin access fails, restore the backup of the previously published rules and stop this test sequence.
4. Sign in as the test runner and claim the order through the valid dispatch state; sign in as the assigned test rider and complete the valid delivery transition with `paymentStatus: COLLECTED_BY_RIDER` after collecting COD.

These are not marked as passed until someone runs them on the phone. For EEU, use test data only and do not submit a live recharge until the physical card handoff is verified.

