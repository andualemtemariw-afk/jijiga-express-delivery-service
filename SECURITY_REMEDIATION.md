# Jijiga Express — Security Remediation Status

## Changes in PR #2

- Customer self-registration can create only a customer profile at the authenticated UID. A signed-in account may read its own profile even when `active` is absent, allowing the first login to initialize the profile.
- Customers can read only their own orders. Active runners/riders can read assigned work and the intended dispatch pool; ordinary staff cannot browse unrelated customer profiles.
- Admin Firestore access requires the admin profile role, `active: true`, a verified Firebase Auth email, and membership in the existing email allow-list. Admin Firestore access no longer requires custom claims or an operator bootstrap script.
- Only the authenticated order participants/admin can read order-scoped messages.
- Delivery-event writes require a real actor UID, matching order participation, an allow-listed payload, and a status equal to the order's current status.
- Runner/rider assignment must use the valid status transition; neither may claim an arbitrary PENDING order.
- New orders are COD-only and begin `UNPAID`. A rider cannot self-confirm a digital payment. Telebirr checkout/webhook logic has been removed from the app/release branch until a trusted paid backend is explicitly approved.
- Parcel/Ride/EEU direct order creation is covered by Firestore rules for fixed allowed pricing and required service fields. EEU requires explicit customer authorization and custody updates preserve meter and recharge values.
- Customer stock mutation is denied except the exact inventory reservation/release transaction; authorized admin/Mamila updates remain role-specific.
- Receipt objects are immutable, image-only, size-limited and UID-path scoped. Firestore rules still authorize whether a receipt may be attached to an order.

## Removed from this branch

- Cloud Functions source code and its manual deployment workflow.
- The command-line administrator bootstrap script.
- Telebirr adapter smoke-test script and payment checkout calls in the customer app.

Firebase documents Cloud Functions as available on the Blaze plan. This branch does not ask the owner to upgrade. Note: removing source and deployment workflow does not delete a Cloud Function that was already deployed before this PR; inspect Firebase Console → Functions and delete confirmed obsolete functions there.

## Verification boundary

GitHub Actions emulator tests cover the relevant authorization cases. They do not prove that production rules have been published or that a phone successfully registered and placed an order. Keep the PR unmerged until the current-head CI checks are green; after approval, publish rules through Firebase Console and test on a physical phone.
