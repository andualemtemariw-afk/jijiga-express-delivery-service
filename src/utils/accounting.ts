import type { Order } from '../types';

/**
 * Returns collected gross order value for dashboards, not platform profit.
 *
 * Payment principal for EEU electricity is passed to the utility and is not
 * Jijiga Express earnings, so only the validated service/delivery fee counts.
 * Unpaid, pending, failed, refunded, cancelled, and defect-rejected orders do
 * not contribute. Platform profit needs separate commission and payout data.
 */
export function calculateCollectedOrderValue(
  order: Pick<Order, 'status' | 'paymentStatus' | 'serviceType' | 'totalPrice' | 'deliveryFee'>
): number {
  if (order.status === 'CANCELLED' || order.status === 'DEFECT_REJECTED') {
    return 0;
  }

  if (order.paymentStatus !== 'PAID_CONFIRMED' && order.paymentStatus !== 'COLLECTED_BY_RIDER') {
    return 0;
  }

  if (order.serviceType === 'EEU_RECHARGE') {
    return Number.isFinite(order.deliveryFee) && order.deliveryFee >= 0 ? order.deliveryFee : 0;
  }

  return Number.isFinite(order.totalPrice) && order.totalPrice >= 0 ? order.totalPrice : 0;
}
