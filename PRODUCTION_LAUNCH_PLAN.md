# Jijiga Express — Spark-Compatible Launch Plan

## Scope

This branch preserves project `sunny-discipline-hvd6f` and its existing named Firestore database `ai-studio-remixjijigaexpre-729909c5-f38a-4c4a-8d31-a10d6eb77286`. It does not create a project, migrate data, require a computer, or require Firebase CLI.

To avoid requiring Blaze, this branch removes Cloud Functions source and backend deployment/preflight workflows. The app writes new service orders directly to Firestore, with field and service-price checks enforced in Firestore rules. New orders are COD-only. Telebirr/wallet settlement stays disabled until a trusted payment backend is explicitly approved.

EEU receipt photos are compressed on the rider's phone and saved inline in the protected Firestore order document. The app no longer uses Cloud Storage for EEU receipt evidence.

## Security gates

- Customer self-registration creates only a customer profile.
- Admin access requires all of: a verified Auth email on the existing allow-list, and a Firestore profile with `role: "admin"` and `active: true`. No custom claims/bootstrap script.
- Customer reads are restricted to own profile/order; nested messages are restricted to order participants/admin.
- Runners/riders cannot arbitrarily self-assign work; assignment requires the correct persisted dispatch state.
- Riders cannot self-confirm a digital payment. COD collection requires the allowed delivery transition.
- Parcel/Ride/EEU order creation checks required service fields and pricing. EEU requires explicit customer authorization and begins in `WITH_CUSTOMER`.
- Meter number, recharge amount, service fee, hub and authorization stay immutable; rider custody updates must follow the prescribed state chain. Receipt image/token can be attached once at the EEU hub and cannot be replaced.
- Delivery-event writes are allow-listed, participant-scoped, and must match the current order status. This prevents arbitrary outsider/future-status events; it does not make participant-authored current-status notes equivalent to server-generated audit records.
- Batch stock changes require an authorized Mamila/admin action or exact stock reservation/release transaction.

## Phone-only Console publish

1. Copy the old published rules as a rollback note.
2. In Firebase Console, select the existing named database above → **Rules**.
3. Paste the entire `firestore.rules` source from PR #2 and press **Publish**.
4. Verify that the allow-listed admin's email is verified and their `/users/{uid}` document has `role: "admin"`, `active: true`.
5. Test registration/re-authentication, COD order creation, cross-customer read denial, and rider/security transitions from the phone UI.

No Storage rules publishing is needed for the EEU receipt path. No CLI or script is required.

## Former Cloud Functions

The source and deployment workflow were removed from the PR. Firebase's docs say Cloud Functions require the Blaze plan. If older functions still appear in Console → Functions, source removal alone did not delete them. Confirm they're obsolete, then delete through the Console; there is no CLI step in this procedure. The PR does not claim it has removed running resources from the live project.

## Not yet production-proven

- The owner still needs to publish the updated rules in Firebase Console.
- The owner still needs to test sign-in and a COD order on the physical phone.
- Any previously deployed Cloud Functions need separate Console removal if present.
- This release has not enabled online payment settlement.
