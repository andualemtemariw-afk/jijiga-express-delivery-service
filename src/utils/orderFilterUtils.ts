import { Order } from '../types';
import { OrderFilterState } from '../components/orders/OrderSearchFilterBar';

/**
 * Extracts a list of unique cities across a list of orders + default known hubs.
 */
export function extractAvailableCities(orders: Order[], defaultCities: string[] = ['Jijiga', 'Hargeisa', 'Dire Dawa', 'Harar', 'Addis Ababa']): string[] {
  const citiesSet = new Set<string>(defaultCities);
  orders.forEach((o) => {
    if (o.customerCity) citiesSet.add(o.customerCity.trim());
    if (o.parcelDetails?.receiverCity) citiesSet.add(o.parcelDetails.receiverCity.trim());
    if (o.parcelDetails?.senderCity) citiesSet.add(o.parcelDetails.senderCity.trim());
    if (o.rideDetails?.city) citiesSet.add(o.rideDetails.city.trim());
  });
  return Array.from(citiesSet).filter(Boolean).sort();
}

/**
 * Applies search query, status, date range, and delivery city filters to an array of orders.
 */
export function applyOrderFilters(orders: Order[], filters: OrderFilterState): Order[] {
  return orders.filter((order) => {
    // 1. Search Query Filter
    if (filters.searchQuery.trim()) {
      const q = filters.searchQuery.toLowerCase().trim();
      const idMatch = order.id.toLowerCase().includes(q);
      const batchMatch = (order.batchName || '').toLowerCase().includes(q);
      const customerMatch = (order.customerName || '').toLowerCase().includes(q);
      const phoneMatch = (order.customerPhone || '').toLowerCase().includes(q);
      const mamilaMatch = (order.mamilaName || '').toLowerCase().includes(q) || (order.mamilaLocation || '').toLowerCase().includes(q);
      const cityMatch = (order.customerCity || '').toLowerCase().includes(q);
      const addressMatch = (order.customerAddress || '').toLowerCase().includes(q) || (order.customerPlusCode || '').toLowerCase().includes(q);
      const noteMatch = (order.specialInstructions || '').toLowerCase().includes(q) || (order.cookingInstruction || '').toLowerCase().includes(q);
      const parcelTrackingMatch = order.parcelDetails?.trackingCode.toLowerCase().includes(q);
      const eeuMeterMatch = order.eeuDetails?.meterNumber.toLowerCase().includes(q);

      const matchesKeyword = 
        idMatch || 
        batchMatch || 
        customerMatch || 
        phoneMatch || 
        mamilaMatch || 
        cityMatch || 
        addressMatch || 
        noteMatch || 
        parcelTrackingMatch || 
        eeuMeterMatch;

      if (!matchesKeyword) return false;
    }

    // 2. Status Filter
    if (filters.status && filters.status !== 'ALL') {
      if (filters.status === 'ACTIVE') {
        const isCompleted = order.status === 'DELIVERED' || order.status === 'RATED';
        const isTerminated = order.status === 'CANCELLED' || order.status === 'DEFECT_REJECTED';
        if (isCompleted || isTerminated) return false;
      } else if (filters.status === 'DELIVERED') {
        if (order.status !== 'DELIVERED' && order.status !== 'RATED') return false;
      } else {
        if (order.status !== filters.status) return false;
      }
    }

    // 3. Delivery City Filter
    if (filters.city && filters.city !== 'ALL') {
      const targetCity = filters.city.toLowerCase().trim();
      const orderCity = (
        order.customerCity || 
        order.parcelDetails?.receiverCity || 
        order.rideDetails?.city || 
        'Jijiga'
      ).toLowerCase().trim();

      if (orderCity !== targetCity && !orderCity.includes(targetCity)) {
        return false;
      }
    }

    // 4. Date Range Filter
    if (filters.startDate || filters.endDate) {
      const orderDate = new Date(order.createdAt);
      if (isNaN(orderDate.getTime())) return true; // Keep if invalid date

      if (filters.startDate) {
        const start = new Date(filters.startDate);
        start.setHours(0, 0, 0, 0);
        if (orderDate < start) return false;
      }

      if (filters.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        if (orderDate > end) return false;
      }
    }

    return true;
  });
}
