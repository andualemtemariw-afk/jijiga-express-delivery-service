# Operational Remediation - Stage 2

Implemented in this build:

- Atomic order + inventory reservation transaction.
- Atomic customer cancellation + stock restoration.
- Firestore reservation records and rules tying stock changes to the order/customer.
- Rider payment-status restriction: riders may only mark COD as collected at delivery; they cannot self-confirm non-COD payments.
- Real browser/device GPS telemetry for active rider jobs, throttled to 15 seconds or 30m movement.
- Real EEU receipt image capture via mobile camera/file input.
- Protected Firebase Storage path for EEU receipt images.
- Receipt metadata includes order and rider identity.

Important deployment requirements:

1. Deploy `firestore.rules` and `storage.rules` together.
2. Enable Firebase Storage for the project.
3. Test Firestore rules with the Firebase Emulator before production deployment.
4. Test Android/iOS location and camera permissions on physical devices.
5. Payment gateway verification remains a separate backend integration; this build does not pretend that a client-side payment field is proof of payment.
