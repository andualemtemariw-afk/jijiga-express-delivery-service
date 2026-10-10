# Jijiga Express — Release Candidate #2

## Candidate

- Repository: `andualemtemariw-afk/jijiga-express-delivery-service`
- PR: [#2 — Harden customer profiles and verified admin access](https://github.com/andualemtemariw-afk/jijiga-express-delivery-service/pull/2)
- Release branch: `fix/customer-profile-self-read`
- Production project: `sunny-discipline-hvd6f`
- Production Firestore database: `ai-studio-remixjijigaexpre-729909c5-f38a-4c4a-8d31-a10d6eb77286`

## Gate

**NOT READY FOR PRODUCTION PUBLISH** until the latest PR-head checks are green and the owner has backed up/published the rules through Firebase Console and tested the app on a phone.

## Changes in this candidate

- Customer profile self-read works for newly registered profiles without an `active` field.
- Firestore admin access uses the profile's active admin role, verified email, and the existing allow-list; it does not require custom claims or a bootstrap script.
- Customer profiles/orders and order-scoped messages are access-restricted.
- Rider payment transitions prevent self-confirmation of digital payments; EEU details are guarded by field allow-lists and custody transitions.
- Delivery-event writes require the real actor and current order status.
- Batch stock reservations/restorations are validated in the same transaction.
- Parcel/Ride/EEU order creation is validated by Firestore rules for the selected COD-only flow.
- Cloud Functions source, bootstrap CLI script, and Functions deployment/preflight workflows have been removed from this branch. The emulator test-support package remains only to run Firebase Admin-backed automated tests.
- Root and rule tests run in GitHub Actions; the owner does not need to execute local scripts.

## Manual Firebase Console procedure

1. Copy the currently published Firestore rules for rollback.
2. Select the existing named Firestore database above → Rules.
3. Copy all of `firestore.rules` from this PR branch's Files changed view, paste and publish.
4. If the existing Storage bucket works on the current plan, back up and publish the full `storage.rules` file in Storage → Rules.
5. Check Firebase Console → Functions for any old deployed Functions. GitHub source/workflow removal does not delete already-deployed functions.
6. Verify the allow-listed admin's Auth email is verified and its Firestore profile has `role: "admin"` and `active: true`.

## Known limitations

- Online Telebirr/wallet checkout is disabled. Only COD is offered until an approved trusted payment-verification backend is available.
- Existing deployed Functions (if any) must be deleted manually in Firebase Console after confirming they are obsolete.
- Firebase Hosting is separate from rules deployment; the previous Hosting workflow failed because the `FIREBASE_SERVICE_ACCOUNT` secret was missing.
- Real-phone registration/restart/COD ordering and live Console publishing are not verified by build/CI alone.
