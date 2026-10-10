# Jijiga Express — Security Remediation Status

## Implemented in PR #2

- Customer self-registration is restricted to a customer profile at the authenticated UID; own-profile reads work before an `active` field exists.
- Admin Firestore access requires the active admin profile, verified Firebase Auth email, and membership in the existing allow-list. No custom claims/bootstrap script is required.
- Customers can read only their own orders; nested messages are restricted to order participants/admin.
- Runners and riders cannot claim arbitrary pending orders; assignment follows the dispatch-ready transition.
- Riders can update payment/custody fields only through rules-validated transitions. A rider cannot self-confirm digital payment; COD collection requires the allowed delivery transition.
- EEU meter number, recharge amount, service fee, hub and customer authorization are immutable after order creation.
- The receipt image is kept out of the order document: an assigned rider can create one protected `/orders/{orderId}/receipts/terminal` JPEG data URL (maximum 300,000 characters) while at `AT_EEU_HUB`. Reads are restricted to order participants/admin; update/delete are denied. The order keeps only receipt metadata, and the image loads on demand.
- Delivery-event creation requires a matching authenticated actor and order role, a fixed field allow-list and status equal to the current order status. An order participant can still add a same-status client-authored note, so it is not equivalent to server-originated delivery evidence.
- Customer batch-stock changes are denied except the exact reservation/release transaction. Authorized admin/Mamila inventory edits remain allowed.
- EEU receipt handling no longer requires Cloud Storage.

## Removed from this branch

- Firebase Cloud Functions source and the manual Functions deployment/preflight workflows.
- The CLI-only administrator bootstrap script.
- Client calls to the Telebirr checkout callable and the Telebirr payment/webhook adapter.
- Cloud Storage receipt upload code and Storage initialization from the app's receipt path.

Firebase documents Cloud Functions as available only on the Blaze plan; Cloud Storage for Firebase also requires Blaze under current Firebase policy. This PR does not ask the owner to upgrade. Removing source/workflows from GitHub does not delete functions already deployed in Firebase; inspect Console → Functions and delete only confirmed-obsolete functions there.

## Verification boundary

Automated CI covers root typecheck/build plus Auth/Firestore Emulator tests. It does not prove production rules were published or the APK was tested. Do not merge/publish until latest-head checks are green; after publishing via Firebase Console, verify on the actual phone.
