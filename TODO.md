# Jijiga Express Upgrade TODO

## Customer foundation

- [x] Add a mobile-first service grid for Move, Deliver, Stay and Services, and More while retaining existing service entry points.
- [x] Add responsive bottom navigation for Home, Services/Search, Orders/History, Help, and Profile.
- [x] Map internal order statuses to customer-friendly labels without changing persisted operational states.
- [x] Route all new customer-facing strings through English, Somali, and Amharic locale resources.

## Food discovery

- [x] Add featured food discovery, category cards, popular vendors, vendor search, and rating display.
- [x] Use live vendor data instead of static vendor fallback wherever available.
- [x] Add filter and sort controls for rating, delivery time, price, distance, availability, and promotion.
- [x] Add vendor metadata cards for open/closed status, ETA, distance, delivery fee, and minimum order.

## Location and ordering

- [x] Add explicit serviceability state for unsupported cities/zones and prevent checkout when unavailable.
- [x] Add backward-compatible Cart and CartItem client models.
- [x] Support one-vendor cart behavior as the first safe cart increment.
- [x] Revalidate stock, prices, vendor status, address, and fees before order creation.
- [x] Add idempotency protection against duplicate checkout submissions.

## Authentication and support

- [x] Add feature-flagged +251/+252 phone OTP onboarding with resend timer, change-number action, and rate limits.
- [x] Preserve email/Google authentication for existing staff and users.
- [x] Add a unified categorized Help Center linked to orders and bookings.

## Retention and future services

- [x] Add a client loyalty tier and rewards display with server-aligned rules.
- [x] Implement Hotel booking as an isolated bounded service with room types and check-in confirmation.
- [x] Do not add gas delivery.

## Validation

- [x] Run `npm run typecheck`.
- [x] Run `npm run build`.
- [x] Run `npm test`.
- [x] Record security, migration, and deployment notes in `IMPLEMENTATION_REPORT.md`.
