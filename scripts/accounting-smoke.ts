import assert from 'node:assert/strict';
import { calculateCollectedOrderValue } from '../src/utils/accounting';

const base = {
  status: 'DELIVERED' as const,
  paymentStatus: 'COLLECTED_BY_RIDER' as const,
  serviceType: 'FOOD' as const,
  totalPrice: 570,
  deliveryFee: 120,
};

assert.equal(calculateCollectedOrderValue({ ...base, paymentStatus: 'UNPAID' }), 0);
assert.equal(calculateCollectedOrderValue({ ...base, paymentStatus: 'PAYMENT_PENDING' }), 0);
assert.equal(calculateCollectedOrderValue({ ...base, paymentStatus: 'FAILED' }), 0);
assert.equal(calculateCollectedOrderValue({ ...base, paymentStatus: 'REFUNDED' }), 0);
assert.equal(calculateCollectedOrderValue({
  ...base,
  dispute: {
    reason: 'Test refund',
    comment: 'Refund status recorded by admin',
    filedAt: new Date(),
    status: 'REFUNDED',
    resolutionNote: 'Test refund'
  }
}), 0);
assert.equal(calculateCollectedOrderValue({ ...base, status: 'CANCELLED', paymentStatus: 'PAID_CONFIRMED' }), 0);
assert.equal(calculateCollectedOrderValue({ ...base, paymentStatus: 'PAID_CONFIRMED' }), 570);
assert.equal(calculateCollectedOrderValue({ ...base, serviceType: 'PARCEL', paymentStatus: 'PAID_CONFIRMED', totalPrice: 200 }), 200);

// EEU totalPrice includes the 500 ETB electricity principal plus a 75 ETB fee.
// Only the service/delivery fee is retained in the dashboard's collected-value metric.
assert.equal(calculateCollectedOrderValue({
  ...base,
  serviceType: 'EEU_RECHARGE',
  status: 'DELIVERED',
  paymentStatus: 'COLLECTED_BY_RIDER',
  totalPrice: 575,
  deliveryFee: 75,
}), 75);

assert.equal(calculateCollectedOrderValue({ ...base, totalPrice: -1, paymentStatus: 'PAID_CONFIRMED' }), 0);
console.log('PASS collected order value: pending/unpaid/failed/refunded/cancelled excluded; EEU principal excluded');
