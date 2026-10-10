# Jijiga Express — Spark-Compatible Launch Plan

## Scope of this release

This branch preserves the existing Firebase project `sunny-discipline-hvd6f` and named Firestore database `ai-studio-remixjijigaexpre-729909c5-f38a-4c4a-8d31-a10d6eb77286`. It does not create a project, migrate data, or deploy server-side Functions.

To avoid requiring a billing upgrade, the app no longer calls Cloud Functions. Service orders are written directly to Firestore and accepted only when the security rules validate customer identity, service data, price fields, and initial state. New orders are COD-only. Telebirr/online checkout is hidden/disabled until a trusted payment verification service is funded and explicitly reintroduced.

## Security gates

- New accounts are customer-only and cannot self-assign staff/admin roles.
- Admin access requires an active Firestore admin profile plus verified email in the existing allow-list. No custom claims, bootstrap script, or CLI are required.
- Customer read access is scoped to their own profile/order.
- Order message and delivery-event writes are tied to order participants and current state.
- Rider payment updates cannot claim a digital payment was paid by a button press.
- The EEU create rule requires a 13-digit/formatted meter number, permitted recharge amount, separate service fee, customer authorization, and initial `WITH_CUSTOMER` custody state. Later custody changes are strictly scoped and require receipt evidence before return.
- Batch stock changes are restricted to authorized Mamila/admin edits or exact inventory reservation transactions.

## Phone-only publish steps

1. Back up the live Firestore rules from Console.
2. In Firebase Console, select the existing named database above, open Rules, paste the complete `firestore.rules` file from PR #2, and publish.
3. In Storage → Rules, back up existing rules and paste the PR's complete `storage.rules` file if the existing Storage bucket is available under the current plan.
4. Check Authentication → Users to confirm the allow-listed admin account has verified email and check Firestore `/users/{uid}` for `role: "admin"` and `active: true`.
5. Test registration, restart persistence, a COD order, cross-customer access denial, and message/event permissions in a controlled test account.

No local computer, Firebase CLI, or script is needed for those publishing steps.

## Paid backend functions

Firebase documents Cloud Functions as available on the Blaze plan. This branch removes the Functions source and manual backend-deployment workflow instead of asking the owner to upgrade. Older deployed functions, if present in Console → Functions, remain deployed until explicitly deleted there. Verify and delete only confirmed obsolete endpoints; do not assume source deletion removes production deployments.

## Not yet production-proven

- Physical-phone sign-in and order persistence have not been tested by the owner.
- Console publishing of Firestore/Storage rules has not been performed by this PR.
- Existing Storage bucket availability on the current billing plan must be confirmed in Console.
- Hosting is separate; its previous run failed because the Hosting service-account secret was unavailable.
