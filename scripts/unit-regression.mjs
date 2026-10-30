import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { calculateOrderRevenue, calculatePlatformTotals } from '../src/utils/revenueAccounting.ts';
import { validateMeterNumber, validateEeuTransition, getNextEeuPhase } from '../src/utils/eeuStateMachine.ts';
import { CITIES, NEARBY_SERVICES_PROVIDERS } from '../src/data.ts';
import { CITY_COORDINATES, calculateDistanceKm } from '../src/utils/geo.ts';
import { extractAvailableCities } from '../src/utils/orderFilterUtils.ts';

console.log('--- Starting Jijiga Express Unit & Accounting Regression Suite ---');

 // TEST 0: Production customer UI must not expose simulated phone OTP.
{
  const customerViewSource = readFileSync(
    new URL('../src/roles/CustomerView.tsx', import.meta.url),
    'utf8',
  );
  assert.doesNotMatch(
    customerViewSource,
    /PhoneOtpModal|showPhoneOtpModal|phone-usr-|OTP Login|Auto-verified sandbox mode/,
    'Customer UI must not expose the simulated phone OTP flow.',
  );
  assert.match(
    customerViewSource,
    /\{\/\* Guest sign-in button for unauthenticated customers \*\/\}\s*\{!currentUser && \(\s*<button\s+onClick=\{onSignIn\}/,
    'Guest sign-in must use the existing authenticated sign-in handler.',
  );
  console.log('PASS: customer guests use the existing sign-in flow; simulated OTP is not reachable');
}

// TEST 1: EEU Prepaid Electricity Accounting Separation
{
  const eeuOrder = {
    id: 'ord-eeu-test-01',
    serviceType: 'EEU_RECHARGE',
    price: 1500, // 1500 ETB electricity principal
    quantity: 1,
    deliveryFee: 75, // 75 ETB platform service fee
    totalPrice: 1575,
    status: 'DELIVERED',
    paymentMethod: 'COD',
    paymentStatus: 'COLLECTED_BY_RIDER',
    customerId: 'cust-123',
    eeuDetails: {
      rechargeAmount: 1500,
      serviceFee: 75,
      meterNumber: '0142-8839-1029-3',
      custodyPhase: 'RETURNED',
    }
  };

  const rev = calculateOrderRevenue(eeuOrder);
  assert.strictEqual(rev.platformRevenue, 75, 'Platform revenue from EEU must ONLY be the 75 ETB service fee, NOT the 1500 ETB electricity money');
  assert.strictEqual(rev.utilityPrincipal, 1500, 'Utility principal must equal 1500 ETB');
  assert.strictEqual(rev.grossTransactionValue, 1575, 'Gross transaction value must equal 1575 ETB');
  assert.strictEqual(rev.merchantPayout, 0, 'EEU order must not disburse any payout to merchant Mamilas');
  assert.strictEqual(rev.isSettled, true, 'Collected by rider must be marked as settled');
  console.log('PASS: EEU electricity principal correctly isolated from platform revenue');
}

// TEST 2: Food Order Accounting
{
  const foodOrder = {
    id: 'ord-food-test-01',
    serviceType: 'FOOD',
    price: 350, // 350 ETB food price to Mamila
    quantity: 1,
    deliveryFee: 150, // 150 ETB courier fee
    totalPrice: 500,
    status: 'DELIVERED',
    paymentMethod: 'COD',
    paymentStatus: 'COLLECTED_BY_RIDER',
    customerId: 'cust-123',
  };

  const rev = calculateOrderRevenue(foodOrder);
  assert.strictEqual(rev.platformRevenue, 150, 'Food platform revenue is strictly the delivery fee');
  assert.strictEqual(rev.merchantPayout, 350, 'Mamila payout must equal the food product price');
  assert.strictEqual(rev.utilityPrincipal, 0, 'Food order has 0 utility principal');
  console.log('PASS: Food order correctly attributes delivery fee vs merchant payout');
}

// TEST 3: Ride Order Accounting (Taxi & Moto)
{
  const taxiOrder = {
    id: 'ord-ride-taxi-01',
    serviceType: 'RIDE',
    price: 283,
    quantity: 1,
    deliveryFee: 0,
    totalPrice: 283,
    status: 'DELIVERED',
    paymentMethod: 'COD',
    paymentStatus: 'COLLECTED_BY_RIDER',
    customerId: 'cust-123',
    rideDetails: { vehicleType: 'MARHABA_TAXI' }
  };
  const motoOrder = {
    id: 'ord-ride-moto-01',
    serviceType: 'RIDE',
    price: 136,
    quantity: 1,
    deliveryFee: 0,
    totalPrice: 136,
    status: 'PENDING',
    paymentMethod: 'COD',
    paymentStatus: 'UNPAID',
    customerId: 'cust-123',
    rideDetails: { vehicleType: 'MARHABA_MOTO' }
  };

  const taxiRev = calculateOrderRevenue(taxiOrder);
  assert.strictEqual(taxiRev.platformRevenue, 283, 'Taxi full fare is transport revenue');
  assert.strictEqual(taxiRev.isSettled, true);

  const motoRev = calculateOrderRevenue(motoOrder);
  assert.strictEqual(motoRev.platformRevenue, 136, 'Moto fare is 136 ETB');
  assert.strictEqual(motoRev.isSettled, false);
  console.log('PASS: Ride fares (Taxi 283 ETB, Moto 136 ETB) correctly attributed');
}

// TEST 4: Cancelled & Defect Orders Must Generate 0 ETB Platform Revenue
{
  const cancelledOrder = {
    id: 'ord-cancelled-01',
    serviceType: 'FOOD',
    price: 400,
    quantity: 1,
    deliveryFee: 150,
    totalPrice: 550,
    status: 'CANCELLED',
    paymentMethod: 'COD',
    paymentStatus: 'UNPAID',
    customerId: 'cust-123',
  };
  const defectOrder = {
    id: 'ord-defect-01',
    serviceType: 'KHAT',
    price: 600,
    quantity: 1,
    deliveryFee: 150,
    totalPrice: 750,
    status: 'DEFECT_REJECTED',
    paymentMethod: 'COD',
    paymentStatus: 'UNPAID',
    customerId: 'cust-123',
  };

  const revCancelled = calculateOrderRevenue(cancelledOrder);
  assert.strictEqual(revCancelled.platformRevenue, 0, 'Cancelled order produces 0 ETB revenue');
  assert.strictEqual(revCancelled.grossTransactionValue, 0);

  const revDefect = calculateOrderRevenue(defectOrder);
  assert.strictEqual(revDefect.platformRevenue, 0, 'Defect rejected order produces 0 ETB revenue');
  console.log('PASS: Cancelled and defect-rejected orders generate 0 ETB platform revenue');
}

// TEST 5: Comprehensive Platform Financial Aggregation
{
  const testDataset = [
    // Delivered EEU order
    { id: '1', serviceType: 'EEU_RECHARGE', price: 1000, quantity: 1, deliveryFee: 75, totalPrice: 1075, status: 'DELIVERED', paymentMethod: 'COD', paymentStatus: 'COLLECTED_BY_RIDER', customerId: 'c1' },
    // Delivered Food order
    { id: '2', serviceType: 'FOOD', price: 300, quantity: 1, deliveryFee: 150, totalPrice: 450, status: 'DELIVERED', paymentMethod: 'COD', paymentStatus: 'COLLECTED_BY_RIDER', customerId: 'c2' },
    // Active Parcel order
    { id: '3', serviceType: 'PARCEL', price: 80, quantity: 1, deliveryFee: 120, totalPrice: 200, status: 'IN_TRANSIT', paymentMethod: 'COD', paymentStatus: 'UNPAID', customerId: 'c3' },
    // Delivered Taxi ride
    { id: '4', serviceType: 'RIDE', price: 283, quantity: 1, deliveryFee: 0, totalPrice: 283, status: 'DELIVERED', paymentMethod: 'COD', paymentStatus: 'COLLECTED_BY_RIDER', customerId: 'c4' },
    // Cancelled Food order
    { id: '5', serviceType: 'FOOD', price: 500, quantity: 1, deliveryFee: 150, totalPrice: 650, status: 'CANCELLED', paymentMethod: 'COD', paymentStatus: 'UNPAID', customerId: 'c5' },
  ];

  const totals = calculatePlatformTotals(testDataset);

  // Expected platform revenue:
  // EEU: 75 (fee only, NOT 1075)
  // Food: 150 (fee only, NOT 450)
  // Parcel: 200
  // Ride: 283
  // Cancelled: 0
  // Total Platform Revenue = 75 + 150 + 200 + 283 = 708 ETB
  assert.strictEqual(totals.totalPlatformRevenue, 708, `Expected platform revenue 708 ETB, got ${totals.totalPlatformRevenue}`);

  // Expected GMV:
  // EEU (1075) + Food (450) + Parcel (200) + Ride (283) = 2008 ETB
  assert.strictEqual(totals.grossPlatformGMV, 2008, `Expected GMV 2008 ETB, got ${totals.grossPlatformGMV}`);

  // Expected Utility Principal: 1000 ETB
  assert.strictEqual(totals.totalUtilityPrincipal, 1000, `Expected EEU utility principal 1000 ETB, got ${totals.totalUtilityPrincipal}`);

  // Expected Merchant Payout: Food price 300 ETB
  assert.strictEqual(totals.totalMerchantPayouts, 300, `Expected Mamila payout 300 ETB, got ${totals.totalMerchantPayouts}`);

  // Volume counts
  assert.strictEqual(totals.totalOrders, 4, '4 valid orders (excluding 1 cancelled)');
  assert.strictEqual(totals.completedOrders, 3, '3 completed orders');
  assert.strictEqual(totals.activeOrders, 1, '1 active order');
  assert.strictEqual(totals.cancelledOrders, 1, '1 cancelled order');

  console.log('PASS: Certified platform financial aggregation matches exact accounting model');
}

// TEST 6: EEU Custody State Machine Transitions
{
  assert.strictEqual(getNextEeuPhase('WITH_CUSTOMER'), 'WITH_RIDER_OUTBOUND');
  assert.strictEqual(getNextEeuPhase('WITH_RIDER_OUTBOUND'), 'AT_EEU_HUB');
  assert.strictEqual(getNextEeuPhase('AT_EEU_HUB'), 'WITH_RIDER_RETURN');
  assert.strictEqual(getNextEeuPhase('WITH_RIDER_RETURN'), 'RETURNED');
  assert.strictEqual(getNextEeuPhase('RETURNED'), null);

  // Test illegal jump
  const illegalCheck = validateEeuTransition({ custodyPhase: 'WITH_CUSTOMER' }, 'RETURNED');
  assert.strictEqual(illegalCheck.allowed, false, 'Direct jump from WITH_CUSTOMER to RETURNED must be blocked');

  // Test receipt requirement when leaving hub
  const noReceiptCheck = validateEeuTransition({ custodyPhase: 'AT_EEU_HUB', receiptCaptured: false }, 'WITH_RIDER_RETURN');
  assert.strictEqual(noReceiptCheck.allowed, false, 'Leaving AT_EEU_HUB without receipt photo must be blocked');

  const withReceiptCheck = validateEeuTransition({ custodyPhase: 'AT_EEU_HUB', receiptCaptured: true }, 'WITH_RIDER_RETURN');
  assert.strictEqual(withReceiptCheck.allowed, true, 'Leaving AT_EEU_HUB with receipt captured must be allowed');

  console.log('PASS: EEU custody chain and receipt requirements strictly validated');
}

// TEST 7: 13-digit EEU Meter Number Validation
{
  assert.strictEqual(validateMeterNumber('0142883910293').isValid, true);
  assert.strictEqual(validateMeterNumber('0142-8839-1029-3').isValid, true);
  assert.strictEqual(validateMeterNumber('0142-8839-1029-3').formatted, '0142-8839-1029-3');
  assert.strictEqual(validateMeterNumber('12345').isValid, false, 'Short meter number rejected');
  assert.strictEqual(validateMeterNumber('014288391029399').isValid, false, 'Overlong meter number rejected');
  console.log('PASS: EEU 13-digit meter number validation and format masking validated');
}

// TEST 8: Parcel Service Locations (Mombas, Babile, Dawee, Kurfa Chele, Girawa, Badeno)
{
  const targetLocations = ['Mombas', 'Babile', 'Dawee', 'Kurfa Chele', 'Girawa', 'Badeno'];
  const cityNames = CITIES.map((c) => c.name);
  for (const loc of targetLocations) {
    assert.ok(cityNames.includes(loc), `CITIES array must contain ${loc}`);
    assert.ok(CITY_COORDINATES[loc], `CITY_COORDINATES must define coordinates for ${loc}`);
    assert.ok(typeof CITY_COORDINATES[loc].lat === 'number' && typeof CITY_COORDINATES[loc].lng === 'number');
    
    // Check distance calculation from Jijiga
    const dist = calculateDistanceKm(CITY_COORDINATES['Jijiga'], CITY_COORDINATES[loc]);
    assert.ok(dist > 0 && dist < 400, `Distance between Jijiga and ${loc} (${dist} km) must be realistic`);
  }

  // Check extractAvailableCities defaults
  const available = extractAvailableCities([]);
  for (const loc of targetLocations) {
    assert.ok(available.includes(loc), `extractAvailableCities must include ${loc} by default`);
  }

  // Check parcel order accounting for regional route
  const parcelOrder = {
    id: 'ord-pcl-test-babile',
    serviceType: 'PARCEL',
    price: 80, // 50 ETB weight + 30 ETB tamper seal
    quantity: 1,
    deliveryFee: 200, // 200 ETB inter-city corridor fee
    totalPrice: 280,
    status: 'DELIVERED',
    paymentMethod: 'ZAAD',
    paymentStatus: 'COLLECTED_BY_RIDER',
    customerId: 'cust-babile-01',
    parcelDetails: {
      senderName: 'Ali Ahmed',
      senderCity: 'Jijiga',
      receiverName: 'Hodan Omer',
      receiverCity: 'Babile',
      parcelCategory: 'DOCUMENTS',
      weightCategory: '< 1 kg',
      trackingCode: 'PARCEL-JIBA-8821',
      tamperSealRequested: true,
    }
  };

  const rev = calculateOrderRevenue(parcelOrder);
  assert.strictEqual(rev.platformRevenue, 280, 'Parcel service fees and courier fees accrue to platform courier revenue');
  assert.strictEqual(rev.merchantPayout, 0, 'Express courier parcel has 0 merchant payout');
  console.log('PASS: Parcel Service locations (Mombas, Babile, Dawee, Kurfa Chele, Girawa, Badeno) & routes strictly validated');
}

// TEST 9: Nearby Services Radar, Proximity Calculation & Dispatch Accounting
{
  assert.ok(Array.isArray(NEARBY_SERVICES_PROVIDERS) && NEARBY_SERVICES_PROVIDERS.length >= 8, 'Must have at least 8 verified nearby providers');
  
  // Verify mandatory categories exist
  const categories = new Set(NEARBY_SERVICES_PROVIDERS.map(p => p.category));
  assert.ok(categories.has('WATER_TANKER'), 'Must support Clean Water Tankers');
  assert.ok(categories.has('ELECTRIC_SOLAR'), 'Must support Solar & Electricians');
  assert.ok(categories.has('PLUMBING'), 'Must support Master Plumbers');
  assert.ok(categories.has('ROADSIDE_RESCUE'), 'Must support Roadside Rescue');
  assert.ok(categories.has('GAS_REFILL'), 'Must support Cooking Gas Swap');
  assert.ok(categories.has('EMERGENCY_PHARMACY'), 'Must support Pharmacy Runners');
  assert.ok(categories.has('ERRAND_RUNNER'), 'Must support Errand Runners (Ergo)');

  // Verify proximity calculation between Jijiga city center and providers
  const jijigaCenter = CITY_COORDINATES['Jijiga'];
  const waterProvider = NEARBY_SERVICES_PROVIDERS.find(p => p.id === 'nsp_water_karamara');
  assert.ok(waterProvider, 'Karamara water provider must exist');
  
  const distanceKm = calculateDistanceKm(
    jijigaCenter,
    waterProvider.coordinates
  );
  assert.ok(distanceKm < 15, `Water provider distance (${distanceKm.toFixed(2)} km) must be within urban radius`);

  // Verify order dispatch accounting for nearby service
  const nearbyOrder = {
    id: 'ord-nearby-test-01',
    serviceType: 'NEARBY_SERVICE',
    price: 350, // 250 base + 100 emergency
    quantity: 1,
    deliveryFee: 0,
    totalPrice: 350,
    status: 'PENDING',
    paymentMethod: 'TELEBIRR',
    paymentStatus: 'UNPAID',
    customerId: 'cust-nearby-01',
    nearbyServiceDetails: {
      providerId: waterProvider.id,
      providerName: waterProvider.name,
      providerPhone: waterProvider.phone,
      category: waterProvider.category,
      categoryLabel: waterProvider.categoryLabel,
      serviceRequested: '5,000L Truck Tanker Delivery',
      urgency: 'URGENT_EMERGENCY',
      baseDispatchFee: 350,
      customerLandmark: 'Taiwan Market Gate 2, Jijiga',
      issueDescription: 'Residential cistern dry, urgent fill needed.',
    }
  };

  const rev = calculateOrderRevenue(nearbyOrder);
  assert.strictEqual(rev.platformRevenue, 350, 'Platform receives base dispatch and priority fee');
  assert.strictEqual(rev.merchantPayout, 0, 'No merchant Mamila payout for service dispatch');
  console.log('PASS: Nearby Services Radar providers, distance calculations & dispatch accounting strictly validated');
}

console.log('--- ALL REGRESSION TESTS PASSED SUCCESSFULLY (9/9) ---');

