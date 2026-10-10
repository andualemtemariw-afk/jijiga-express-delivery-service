# Jijiga Express — Security and Operations Status

## Current release model

PR #2 is being changed for a phone-only, Console-published release. The existing project and Firestore database remain unchanged. There is no Cloud Functions source/deploy workflow in this PR branch; new orders are COD-only. Online payment verification is disabled rather than simulated.

## Security behavior implemented in the PR

- A customer can read their own Firestore profile during first login even before an `active` field exists. Customers can create only their own profile with `role: "customer"`.
- Admin access requires the active Firestore profile role, verified Firebase Auth email, and the existing email allow-list. No custom claims or bootstrap script is needed.
- Customer order reads are scoped to the customer. Order messages are scoped to order participants/admin.
- Runner/rider assignment must follow the correct dispatch status transition.
- Riders may perform only the allowed delivery/payment and EEU custody updates. A rider cannot mark digital payment as paid by setting `paymentStatus`; COD collection is allowed only in the valid delivery transition.
- EEU meter number, recharge amount, service fee, hub and authorization are immutable after order creation. The custody timeline must advance through the allowed sequence. The receipt can be attached once while at `AT_EEU_HUB`, has a size cap, and cannot be changed afterward.
- Delivery-event creation is restricted to an authenticated order participant with the matching actor UID/role; the submitted status must equal the order's currently persisted status and the payload is allow-listed.
- Customer batch-stock tampering is denied. Admin/Mamila inventory changes are separate role-specific operations; the customer stock delta must match a valid inventory reservation/release transaction.
- EEU receipt image data is stored separately at `/orders/{orderId}/receipts/terminal`, capped at 300,000 characters, readable only by order participants/admin, and immutable after creation. The order document carries only receipt metadata, so order-pool listeners do not download photos.

## Test evidence and limitations

GitHub Actions runs the root typecheck/build plus Auth and Firestore Emulator security tests for the PR. Emulator success does not prove that production rules have been published or that the app works on a physical phone. Those two steps remain manual, through Firebase Console and phone UI.

## Console-only publishing

1. Back up the currently published rules.
2. In Firebase Console, select the existing database `ai-studio-remixjijigaexpre-729909c5-f38a-4c4a-8d31-a10d6eb77286`, open Rules, paste the entire `firestore.rules` file from PR #2, and publish.
3. Check Authentication → Users and the matching `/users/{uid}` profile for the three admin conditions.
4. Open Console → Functions to check for former deployed function names listed in `DEPLOYMENT_RUNBOOK.md`. GitHub source deletion does not remove a previously deployed function. Delete only confirmed-obsolete functions using the Console.

No CLI or script is part of this release path. No Storage rules publish is needed for the Firestore receipt subcollection.

## Remaining limitations

- Online Telebirr and other wallet checkout are disabled; COD only.
- Any formerly deployed Cloud Functions need a separate Console deletion if they still exist.
- Firebase Hosting and Android APK builds are separate from Firestore rules publishing.
- Real-phone signup/restart/order tests and the production Console publish remain owner-side verification.
