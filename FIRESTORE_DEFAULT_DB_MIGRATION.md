# Firestore Named-Database to Default-Database Migration Runbook

## Scope

This runbook migrates the Jijiga Express Firestore data from:

`ai-studio-remixjijigaexpre-729909c5-f38a-4c4a-8d31-a10d6eb77286`

to the supported production default database:

`(default)`

Do not change the application database target until the migration has been completed and verified.

## Pre-migration controls

1. Confirm Google Cloud billing/Blaze requirements and required Firestore/Storage permissions are available.
2. Freeze application writes and administrative changes.
3. Confirm the destination `(default)` database is not being used for live application traffic.
4. Deploy the same Firestore rules to both source and destination.
5. Record the migration start time, operator, source database ID, destination database ID, and export location.
6. Inventory current collection counts, representative documents, and any indexes used by the application before export.

## Export the source database

Using the Google Cloud project `sunny-discipline-hvd6f`:

```bash
gcloud config set project sunny-discipline-hvd6f
gcloud firestore export gs://<MIGRATION_BUCKET>/<timestamp> \
  --database='ai-studio-remixjijigaexpre-729909c5-f38a-4c4a-8d31-a10d6eb77286' \
  --async
```

Monitor the operation until it completes successfully. The managed export is not an exact point-in-time snapshot, so the write freeze must remain in force throughout the export. Managed exports require billing and a suitable Cloud Storage bucket.

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

Also verify the destination index configuration against the source inventory. Firestore exports do not carry index definitions; the destination uses its current index definitions during import. Do not declare the migration complete until application queries used by production have been tested against `(default)`.

## Application cutover

After verification, change both application layers to use the default Firestore service:

- Web client: `getFirestore(app)` / `initializeFirestore(app, settings)`
- Functions: `getFirestore()`

Remove the named database ID from `firebase-applet-config.json` and from the Functions initialization code.

Run the complete CI/security suite on the cutover commit, deploy the backend, and perform controlled production smoke testing before reopening writes. Keep the source database intact until the post-deployment checks pass.

## Rollback

Keep the original named database intact until the default-database deployment has passed production smoke tests. If the cutover fails, restore application configuration to the prior commit and continue operating from the source database while the failure is investigated.
