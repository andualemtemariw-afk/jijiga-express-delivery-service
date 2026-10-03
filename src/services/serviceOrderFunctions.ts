import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from './googleAuth';

const functions = getFunctions(app);

export interface CreateServiceOrderResponse {
  orderId: string;
  price: number;
  deliveryFee: number;
  totalPrice: number;
  paymentStatus: string;
}

export async function createServiceOrder(order: Record<string, unknown>): Promise<CreateServiceOrderResponse> {
  const callable = httpsCallable<Record<string, unknown>, CreateServiceOrderResponse>(
    functions,
    'createServiceOrder'
  );
  const result = await callable(order);
  return result.data;
}


export interface CreateTelebirrCheckoutResponse {
  checkoutUrl: string;
  paymentMerchantOrderId: string;
  prepayId: string;
}

export async function createTelebirrCheckout(orderId: string): Promise<CreateTelebirrCheckoutResponse> {
  const callable = httpsCallable<{ orderId: string }, CreateTelebirrCheckoutResponse>(
    functions,
    'createTelebirrCheckout'
  );
  const result = await callable({ orderId });
  return result.data;
}
