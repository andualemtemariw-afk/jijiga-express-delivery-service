# Jijiga Express — Release Candidate #2

## Candidate

- Repository: `andualemtemariw-afk/jijiga-express-delivery-service`
- PR: [#2 — Harden customer profiles and verified admin access](https://github.com/andualemtemariw-afk/jijiga-express-delivery-service/pull/2)
- Branch: `fix/customer-profile-self-read`
- Firebase project: `sunny-discipline-hvd6f`
- Existing Firestore database: `ai-studio-remixjijigaexpre-729909c5-f38a-4c4a-8d31-a10d6eb77286`

## Gate

**NOT READY FOR PRODUCTION PUBLISH** until latest-head CI is green and the owner completes the Firebase Console publish plus a phone smoke test.

## Changes in this candidate

- First-time customers can read their own profile before the `active` field exists and can persist/re-read their customer profile.
- Admin access uses an active Firestore admin profile, verified Auth email and the existing allow-list; no custom claims or bootstrap script.
- Customer profile/order reads and order messages are scoped to the right account/participants.
- Runner/rider assignment follows the dispatch state machine.
- Rider payment and EEU fields are strictly constrained. Online payment cannot be self-confirmed; new orders are COD-only.
- Delivery events require a valid authenticated actor/participant, a small allow-listed payload and the order's current persisted status.
- Batch stock updates require authorized management or an exact reservation/release transaction.
- EEU receipt photos are compressed on-device and stored inline in the Firestore order document; this receipt flow does not use Cloud Storage.
- Cloud Functions source, the command-line admin bootstrap script and Functions deployment/preflight workflows have been removed from this PR branch. The remaining Firebase Admin dependency package is used only by Emulator tests and does not deploy functions.

## Exactly how production rules were deployed before this PR

On `main`, the GitHub workflow `.github/workflows/firebase-production-backend-deploy.yml` is manual-only (`workflow_dispatch`) and runs `firebase deploy --only firestore:rules,storage,functions`. It is not automatically triggered by an ordinary push or pull request. The separate Firestore rule workflow tests in an emulator; it does not publish rules. The Hosting workflow deploys web files only.

This PR removes the manual backend deployment workflow. After merge, publish by Firebase Console copy/paste as below. PR/CI jobs do not touch production data/rules.

## Phone-only publish procedure

1. In Firebase Console, back up the currently published Firestore rules.
2. Choose the named database above → **Rules**.
3. Copy the full `firestore.rules` file from this PR branch's Files changed view, paste it into the Console Rules editor and press **Publish**.
4. Confirm the allow-listed admin's Auth email is verified and `/users/{uid}` in that same database has `role: "admin"` and `active: true`.
5. Check Console → **Functions** for formerly deployed function names. Source deletion from GitHub does not delete a running cloud function; remove only confirmed-obsolete functions in Console.

## Known limitations

- Online Telebirr/wallet checkout is disabled; only COD is enabled.
- Existing deployed Cloud Functions, if any, require separate Console deletion.
- No Firestore rules have been published to production by PR automation.
- Emulator CI does not substitute for testing sign-in/order flow on the physical phone.
