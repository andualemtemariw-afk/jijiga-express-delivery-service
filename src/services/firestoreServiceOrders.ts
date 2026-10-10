import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from './googleAuth';

/**
 * Spark-plan compatible service-order writer.
 * Pricing and service-specific fields are checked by the Firestore security rules.
 * Online payment is intentionally unavailable until a trusted payment backend can be funded.
 */
export interface CreateServiceOrderResponse {
  orderId: string;
  price: number;
  deliveryFee: number;
  totalPrice: number;
  paymentStatus: string;
}

const ALLOWED_CREATE_FIELDS = [
  'id', 'serviceType', 'batchId', 'batchName', 'mamilaId', 'mamilaName',
  'mamilaLocation', 'price', 'quantity', 'deliveryFee', 'totalPrice',
  'status', 'paymentMethod', 'paymentStatus', 'customerId', 'customerName',
  'customerPhone', 'customerCity', 'customerPlusCode', 'customerAddress',
  'customerCoordinates', 'mamilaCoordinates', 'specialInstructions',
  'cookingInstruction', 'parcelDetails', 'rideDetails', 'eeuDetails',
  'khatDetails', 'distanceKm', 'etaMinutes'
] as const;

export async function createServiceOrder(order: Record<string, unknown>): Promise<CreateServiceOrderResponse> {
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in before creating a service order.');

  const orderId = typeof order.id === 'string' ? order.id.trim() : '';
  if (orderId.length < 8 || orderId.length > 128) {
    throw new Error('Invalid order ID. Please retry the booking.');
  }
  if (order.customerId !== user.uid) {
    throw new Error('The order customer does not match the signed-in account.');
  }
  if (order.paymentMethod !== 'COD') {
    throw new Error('Online payment is temporarily unavailable. Choose Cash on Delivery (COD).');
  }

  const payload: Record<string, unknown> = {};
  for (const key of ALLOWED_CREATE_FIELDS) {
    if (key in order && order[key] !== undefined) payload[key] = order[key];
  }
  payload.id = orderId;
  payload.customerId = user.uid;
  payload.status = 'PENDING';
  payload.paymentMethod = 'COD';
  payload.paymentStatus = 'UNPAID';
  payload.createdAt = serverTimestamp();

  // No optimistic success from this helper: Firestore must accept the write under rules.
  await setDoc(doc(db, 'orders', orderId), payload);

  return {
    orderId,
    price: Number(order.price || 0),
    deliveryFee: Number(order.deliveryFee || 0),
    totalPrice: Number(order.totalPrice || 0),
    paymentStatus: 'UNPAID',
  };
}
