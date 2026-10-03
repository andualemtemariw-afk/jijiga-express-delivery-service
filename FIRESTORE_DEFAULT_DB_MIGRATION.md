# Firestore Named-Database to Default-Database Migration Runbook

## Scope

This runbook migrates the Jijiga Express Firestore data from:

`ai-studio-remixjijigaexpre-729909c5-f38a-4c4a-8d31-a10d6eb77286`

to the supported production default database:

`(default)`

Do not change the application database target until the migration has been completed and verified.

## Pre-migration controls

1. Freeze application writes and administrative changes.
2. Take a current backup/export of the named database.
3. Confirm the destination `(default)` database is not being used for live application traffic.
4. Deploy the same Firestore rules to both source and destination.
5. Record the export location and the exact migration time.

## Export the source database

Using the Google Cloud project `sunny-discipline-hvd6f`:

```bash
gcloud config set project sunny-discipline-hvd6f
gcloud firestore export gs://<MIGRATION_BUCKET>/<timestamp> \
  --database='ai-studio-remixjijigaexpre-729909c5-f38a-4c4a-8d31-a10d6eb77286' \
  --async
```

Monitor the operation until it completes successfully.

## Import into the default database

```bash
gcloud firestore import \
  gs://<MIGRATION_BUCKET>/<EXPORT_PREFIX>/ \
  --database='(default)'
```

Do not delete the source database after import.

## Verification

Verify at minimum:

- `users`
- `orders`
- `batches`
- `mamilas`
- `inventoryReservations`
- `paymentEvents`
- `deliveryEvents`
- chat collections used by the application

Compare representative document counts and sample records. Verify that customer IDs, order IDs, payment status, inventory quantities, and timestamps are preserved.

## Application cutover

After verification, change both application layers to use the default Firestore service:

- Web client: `getFirestore(app)` / `initializeFirestore(app, settings)`
- Functions: `getFirestore()`

Remove the named database ID from `firebase-applet-config.json` and from the Functions initialization code.

Run the complete CI/security suite, deploy the backend, and perform controlled production smoke testing before reopening writes.

## Rollback

Keep the original named database intact until the default-database deployment has passed production smoke tests. If the cutover fails, restore application configuration to the prior commit and continue operating from the source database while the failure is investigated.
