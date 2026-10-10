# Jijiga Express — Security and Operations Status

## Current release approach

This PR removes the paid Cloud Functions code/deployment workflow and keeps the app compatible with the existing Firebase project and named Firestore database. Direct customer writes are guarded by Firestore rules. New orders use COD only; online payment verification is disabled rather than simulated.

## Security behavior targeted by this PR

- Customers can read their own profile and orders, but not another customer's private profile/order.
- Customer self-registration creates only a customer role; users cannot set their own role or `active` flag.
- Admin Firestore access requires an active `admin` profile, a verified email, and an existing allow-listed email. No custom claims or bootstrap CLI are required.
- Rider order updates are limited to allowed status transitions. A rider cannot self-confirm a digital payment; COD collection is the only client-side payment-state transition.
- EEU meter number, recharge amount, service fee, and hub are immutable after request creation. Custody updates must follow the ordered steps and receipt rules.
- Order messages are restricted to order participants and admin.
- Delivery events require the authenticated actor, participant role, and the order's current persisted status.
- Customers cannot arbitrarily change batch stock; stock reservations/restorations must be linked to the order in the same transaction. Admin/Mamila inventory management remains separate.
- EEU receipt uploads are immutable, image-only, and confined to the authenticated uploader's UID path. Firestore rules decide whether an uploaded receipt may be attached to an order.

## What is not claimed as verified

Emulator tests exercise the rules and build. They do not prove that a production account has the right profile, that a live Console publish succeeded, or that the app was tested on a physical phone. The owner must still verify Authentication email/password settings and perform a real-device signup/restart/COD-order test.

## Console-only publishing

- Back up the current published rules.
- In Firebase Console, select the existing named database `ai-studio-remixjijigaexpre-729909c5-f38a-4c4a-8d31-a10d6eb77286`, open Rules, copy the full `firestore.rules` file from PR #2 and publish it.
- If the existing Storage bucket works without upgrading the plan, publish `storage.rules` the same way in Storage → Rules.
- Do not use a CLI, scripts, custom claims, or any deploy workflow to make this release live.
- Check Firebase Console → Functions for old deployed functions. Removing their source from GitHub does not remove an already-deployed function; delete any confirmed obsolete ones through the Console.

## Remaining limitations

- Online Telebirr and other wallet payment methods are disabled. Only COD is advertised until a trusted payment backend is available.
- Cloud Functions require the Blaze billing plan. This PR removes their source and deployment workflow; it does not silently upgrade billing.
- Hosting remains separately configured and previously failed on a missing `FIREBASE_SERVICE_ACCOUNT` secret. Hosting does not deploy database rules.
- Real-device authentication/order tests and an actual Console rules publish remain unverified until performed by the owner.
