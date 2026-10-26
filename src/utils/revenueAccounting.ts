import { Order } from '../types';

export interface OrderRevenueBreakdown {
  orderId: string;
  serviceType: Order['serviceType'];
  platformRevenue: number;        // Jijiga Express earnings (delivery/service fees, ride fare, parcel fare)
  grossTransactionValue: number;  // Full customer payment (totalPrice)
  utilityPrincipal: number;       // Pass-through utility funds (EEU electricity amount)
  merchantPayout: number;         // Vendor product subtotal (Food & Khat batch prices)
  paymentStatus: Order['paymentStatus'];
  isSettled: boolean;             // Paid/collected
  isCancelled: boolean;           // Cancelled or rejected (0 platform revenue)
}

export interface PlatformFinancialSummary {
  // Volume counts
  totalOrders: number;
  completedOrders: number;
  activeOrders: number;
  cancelledOrders: number;

  // Platform Earnings (Jijiga Express revenue)
  totalPlatformRevenue: number;
  settledPlatformRevenue: number;
  pendingPlatformRevenue: number;

  // Gross Transaction Value (GMV) across all services
  grossPlatformGMV: number;

  // Pass-through utility principal (EEU funds)
  totalUtilityPrincipal: number;

  // Merchant payouts (Food & Khat batch products)
  totalMerchantPayouts: number;

  // Revenue breakdown by service type
  serviceRevenue: {
    foodDeliveryFees: number;
    khatDeliveryFees: number;
    parcelLogisticsFees: number;
    rideTransportFares: number;
    eeuPlatformServiceFees: number;
  };
}

/**
 * Calculates deterministic revenue attribution for an individual order.
 * 
 * Accounting Principles:
 * 1. EEU Electricity Principal: Customer utility purchase amount is NEVER platform revenue.
 *    Only the EEU service fee (75 ETB) belongs to Jijiga Express.
 * 2. Food & Khat: Platform revenue is strictly the delivery fee. The item price is owed to the merchant Mamila.
 * 3. Parcel: Full logistics fee is platform transportation revenue.
 * 4. Ride: Full taxi/moto fare is transport service revenue.
 * 5. Cancelled/Defect-Rejected: Generates 0 ETB platform revenue.
 */
export function calculateOrderRevenue(order: Order): OrderRevenueBreakdown {
  const isCancelled = order.status === 'CANCELLED' || order.status === 'DEFECT_REJECTED';
  const isSettled = order.paymentStatus === 'PAID_CONFIRMED' || order.paymentStatus === 'COLLECTED_BY_RIDER';
  const grossTransactionValue = order.totalPrice || (order.price + (order.deliveryFee || 0)) || 0;

  if (isCancelled) {
    return {
      orderId: order.id,
      serviceType: order.serviceType,
      platformRevenue: 0,
      grossTransactionValue: 0,
      utilityPrincipal: 0,
      merchantPayout: 0,
      paymentStatus: order.paymentStatus,
      isSettled: false,
      isCancelled: true,
    };
  }

  let platformRevenue = 0;
  let utilityPrincipal = 0;
  let merchantPayout = 0;

  switch (order.serviceType) {
    case 'EEU_RECHARGE': {
      // For EEU recharge: price is electricity purchase amount (utility money)
      // deliveryFee is the platform service fee (75 ETB)
      utilityPrincipal = order.eeuDetails?.rechargeAmount || order.price || 0;
      platformRevenue = order.deliveryFee || order.eeuDetails?.serviceFee || 75;
      merchantPayout = 0; // Not a Mamila payout
      break;
    }
    case 'FOOD':
    case 'KHAT': {
      // Merchant products: delivery fee is platform courier earnings, price is Mamila inventory payout
      platformRevenue = order.deliveryFee !== undefined ? order.deliveryFee : 150;
      merchantPayout = order.price || 0;
      break;
    }
    case 'PARCEL': {
      // Direct logistics service: total logistics fee earned by platform
      platformRevenue = grossTransactionValue;
      merchantPayout = 0;
      break;
    }
    case 'RIDE': {
      // Express passenger ride: full trip fare earned by transport service
      platformRevenue = grossTransactionValue;
      merchantPayout = 0;
      break;
    }
    default: {
      platformRevenue = order.deliveryFee || 0;
      merchantPayout = order.price || 0;
    }
  }

  return {
    orderId: order.id,
    serviceType: order.serviceType,
    platformRevenue,
    grossTransactionValue,
    utilityPrincipal,
    merchantPayout,
    paymentStatus: order.paymentStatus,
    isSettled,
    isCancelled: false,
  };
}

/**
 * Aggregates a list of orders into certified platform financial totals.
 */
export function calculatePlatformTotals(orders: Order[]): PlatformFinancialSummary {
  let totalOrders = 0;
  let completedOrders = 0;
  let activeOrders = 0;
  let cancelledOrders = 0;

  let totalPlatformRevenue = 0;
  let settledPlatformRevenue = 0;
  let pendingPlatformRevenue = 0;
  let grossPlatformGMV = 0;
  let totalUtilityPrincipal = 0;
  let totalMerchantPayouts = 0;

  const serviceRevenue = {
    foodDeliveryFees: 0,
    khatDeliveryFees: 0,
    parcelLogisticsFees: 0,
    rideTransportFares: 0,
    eeuPlatformServiceFees: 0,
  };

  for (const order of orders) {
    const isCancelled = order.status === 'CANCELLED' || order.status === 'DEFECT_REJECTED';
    const isCompleted = order.status === 'DELIVERED' || order.status === 'RATED';

    if (isCancelled) {
      cancelledOrders++;
      continue;
    }

    totalOrders++;
    if (isCompleted) {
      completedOrders++;
    } else {
      activeOrders++;
    }

    const breakdown = calculateOrderRevenue(order);

    grossPlatformGMV += breakdown.grossTransactionValue;
    totalPlatformRevenue += breakdown.platformRevenue;
    totalUtilityPrincipal += breakdown.utilityPrincipal;
    totalMerchantPayouts += breakdown.merchantPayout;

    if (breakdown.isSettled) {
      settledPlatformRevenue += breakdown.platformRevenue;
    } else {
      pendingPlatformRevenue += breakdown.platformRevenue;
    }

    switch (order.serviceType) {
      case 'FOOD':
        serviceRevenue.foodDeliveryFees += breakdown.platformRevenue;
        break;
      case 'KHAT':
        serviceRevenue.khatDeliveryFees += breakdown.platformRevenue;
        break;
      case 'PARCEL':
        serviceRevenue.parcelLogisticsFees += breakdown.platformRevenue;
        break;
      case 'RIDE':
        serviceRevenue.rideTransportFares += breakdown.platformRevenue;
        break;
      case 'EEU_RECHARGE':
        serviceRevenue.eeuPlatformServiceFees += breakdown.platformRevenue;
        break;
    }
  }

  return {
    totalOrders,
    completedOrders,
    activeOrders,
    cancelledOrders,
    totalPlatformRevenue,
    settledPlatformRevenue,
    pendingPlatformRevenue,
    grossPlatformGMV,
    totalUtilityPrincipal,
    totalMerchantPayouts,
    serviceRevenue,
  };
}
