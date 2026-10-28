# Jijiga Express Upgrade TODO

## Customer foundation

- [ ] Add a mobile-first service grid for Move, Deliver, Stay and Services, and More while retaining existing service entry points.
- [ ] Add responsive bottom navigation for Home, Services/Search, Orders/History, Help, and Profile.
- [ ] Map internal order statuses to customer-friendly labels without changing persisted operational states.
- [ ] Route all new customer-facing strings through English, Somali, and Amharic locale resources.

## Food discovery

- [x] Add featured food discovery, category cards, popular vendors, vendor search, and rating display.
- [ ] Use live vendor data instead of static vendor fallback wherever available.
- [ ] Add filter and sort controls for rating, delivery time, price, distance, availability, and promotion.
- [ ] Add vendor metadata cards for open/closed status, ETA, distance, delivery fee, and minimum order.

## Location and ordering

- [ ] Add explicit serviceability state for unsupported cities/zones and prevent checkout when unavailable.
- [ ] Add backward-compatible Cart and CartItem client models.
- [ ] Support one-vendor cart behavior as the first safe cart increment.
- [ ] Revalidate stock, prices, vendor status, address, and fees before order creation.
- [ ] Add idempotency protection against duplicate checkout submissions.

## Authentication and support

- [ ] Add feature-flagged +251/+252 phone OTP onboarding with resend timer, change-number action, and rate limits.
- [ ] Preserve email/Google authentication for existing staff and users.
- [ ] Add a unified categorized Help Center linked to orders and bookings.

## Retention and future services

- [ ] Add a server-authoritative loyalty ledger and tier display.
- [ ] Keep Hotel behind a feature flag until Hotel, RoomType, Availability, Reservation, and refund rules exist.

## Validation

- [ ] Run `npm run typecheck`.
- [ ] Run `npm run build`.
- [ ] Run `npm test`.
- [ ] Run Firestore rules tests when Firebase emulator configuration is available.
- [ ] Record security, migration, and deployment notes in `IMPLEMENTATION_REPORT.md`.
