import { Order } from '../types';

/**
 * Sanitizes phone numbers into international format suitable for WhatsApp links (wa.me/{number})
 * Handles Ethiopian (+251, 09..., 07...), Somaliland/Somalia (+252, 63..., 65...), Djibouti (+253), etc.
 */
export function formatPhoneForWhatsApp(phone?: string): string {
  if (!phone) return '';
  // Remove all non-numeric characters
  let digits = phone.replace(/\D/g, '');

  // If starts with 09... or 07... (Ethiopian domestic mobile), replace leading 0 with 251
  if (/^0[79]\d{8}$/.test(digits)) {
    digits = '251' + digits.substring(1);
  } else if (/^9\d{8}$/.test(digits)) {
    // 912345678 -> 251912345678
    digits = '251' + digits;
  } else if (/^7\d{8}$/.test(digits)) {
    // 712345678 -> 251712345678
    digits = '251' + digits;
  } else if (/^63\d{7}$/.test(digits) || /^65\d{7}$/.test(digits)) {
    // Somaliland mobile
    digits = '252' + digits;
  }

  return digits;
}

/**
 * Creates the direct wa.me link with prefilled text.
 */
export function createWhatsAppUrl(phone?: string, text?: string): string {
  const cleanPhone = formatPhoneForWhatsApp(phone);
  const encodedText = text ? encodeURIComponent(text) : '';
  
  if (cleanPhone) {
    return `https://wa.me/${cleanPhone}${encodedText ? `?text=${encodedText}` : ''}`;
  }
  // If no phone number provided (e.g. broadcasting to WhatsApp groups or choosing contact in WhatsApp)
  return `https://api.whatsapp.com/send?text=${encodedText}`;
}

/**
 * Generates dispatch order summary formatted for delivery riders / fleet channels.
 */
export function generateRiderDispatchMessage(order: Order, liveAppUrl?: string): string {
  const serviceEmojis: Record<string, string> = {
    FOOD: '🍱 FOOD ORDER',
    PARCEL: '📦 EXPRESS PARCEL',
    RIDE: '🚖 RIDE DISPATCH',
    EEU_RECHARGE: '⚡ EEU CARD RECHARGE',
    KHAT: '🌿 FRESH KHAT BATCH',
  };

  const serviceLabel = serviceEmojis[order.serviceType || 'FOOD'] || '📦 DELIVERY ORDER';
  const totalDue = order.totalPrice || order.price;
  const isCod = order.paymentMethod === 'COD';
  const appBase = liveAppUrl || (typeof window !== 'undefined' ? window.location.origin : '');

  let detailsBlock = '';
  if (order.serviceType === 'PARCEL' && order.parcelDetails) {
    detailsBlock = `*Parcel:* ${order.parcelDetails.parcelCategory} (${order.parcelDetails.weightCategory})\n*Track Code:* ${order.parcelDetails.trackingCode}\n*Receiver:* ${order.parcelDetails.receiverName} (${order.parcelDetails.receiverPhone})`;
  } else if (order.serviceType === 'RIDE' && order.rideDetails) {
    detailsBlock = `*Trip:* ${order.rideDetails.pickupLocation} ➡️ ${order.rideDetails.dropoffLocation}\n*Type:* ${order.rideDetails.vehicleType === 'MARHABA_TAXI' ? 'Taxi' : 'Moto'}`;
  } else if (order.serviceType === 'EEU_RECHARGE' && order.eeuDetails) {
    detailsBlock = `*Meter #:* ${order.eeuDetails.meterNumber}\n*Cash Float:* ${order.eeuDetails.rechargeAmount} ETB\n*EEU Office:* ${order.eeuDetails.eeuHubName}`;
  } else if (order.serviceType === 'KHAT' && order.khatDetails) {
    detailsBlock = `*Mamila Vendor:* ${order.khatDetails.mamilaName}\n*Grade & Origin:* ${order.khatDetails.grade} (${order.khatDetails.origin})\n*Bundles:* ${order.khatDetails.bundlesCount}x (${order.khatDetails.bundleWrapType})\n*Arrival Freshness:* ${order.khatDetails.arrivalBatchTime}\n*Landmark:* ${order.khatDetails.deliveryLandmark}`;
  } else {
    detailsBlock = `*Items:* ${order.quantity}x ${order.batchName}`;
  }

  const specialNote = order.cookingInstruction 
    ? `\n*Kitchen Prep Note:* "${order.cookingInstruction}"`
    : order.specialInstructions 
    ? `\n*Note:* "${order.specialInstructions}"`
    : '';

  return `🛵 *JIJIGA EXPRESS — NEW RUN DISPATCH*
━━━━━━━━━━━━━━━━━━━
*Run ID:* #${order.id}
*Service:* ${serviceLabel}
${detailsBlock}${specialNote}

📍 *PICKUP (Store/Hub):*
${order.mamilaName}
${order.mamilaLocation}

🏁 *DELIVERY (Customer):*
${order.customerName} (${order.customerCity || 'Jijiga'})
${order.customerAddress || order.customerPlusCode}
📞 Phone: ${order.customerPhone || 'N/A'}

💰 *PAYMENT & CASH COLLECTION:*
${isCod ? `⚠️ *COLLECT CASH AT DOORSTEP: ${totalDue} ETB*` : `✅ *PAID ONLINE via ${order.paymentMethod} (${totalDue} ETB)*`}

🗺️ *LIVE TRACKING & ACCEPT RUN:*
${appBase}?role=RIDER&orderId=${order.id}
━━━━━━━━━━━━━━━━━━━
_Reply to confirm acceptance or share arrival updates._`;
}

/**
 * Generates status notification message to send directly to customer on WhatsApp.
 */
export function generateCustomerUpdateMessage(order: Order, messageType: 'dispatched' | 'arriving' | 'delivered' = 'dispatched'): string {
  const runnerInfo = order.runnerName ? `Runner: ${order.runnerName}` : '';
  const riderInfo = order.riderName ? `Rider: ${order.riderName}` : '';
  const totalDue = order.totalPrice || order.price;

  if (messageType === 'arriving') {
    return `👋 *Selam / Assalamu alaykum ${order.customerName}!*
Your Jijiga Express courier (${order.riderName || 'our rider'}) is arriving near your address (*${order.customerAddress || order.customerPlusCode}*).

📦 *Order #${order.id}:* ${order.batchName}
${order.paymentMethod === 'COD' ? `💵 *Please prepare:* ${totalDue} ETB (Cash on Delivery)` : '✅ Paid in advance.'}

Thank you for choosing Jijiga Express Delivery! 🚀`;
  }

  if (messageType === 'delivered') {
    return `🎉 *Order #${order.id} Delivered Successfully!*
Dear ${order.customerName}, your delivery of *${order.batchName}* has been completed.

We hope you enjoyed our service! Please feel free to rate your delivery rider in the app.
_Jijiga Express Delivery — Fast, Secure, Horn of Africa Network._`;
  }

  return `📦 *JIJIGA EXPRESS ORDER CONFIRMATION*
━━━━━━━━━━━━━━━━━━━
Dear *${order.customerName}*, your order has been dispatched!

*Order ID:* #${order.id}
*Item:* ${order.batchName} (Qty: ${order.quantity})
*Store:* ${order.mamilaName}
*Destination:* ${order.customerAddress || order.customerPlusCode}, ${order.customerCity || 'Jijiga'}
*Amount:* ${totalDue} ETB (${order.paymentMethod})
${riderInfo ? `\n*Courier Assigned:* ${order.riderName}` : ''}

Track progress in real-time here:
${typeof window !== 'undefined' ? window.location.origin : ''}?orderId=${order.id}

For support, call or WhatsApp our dispatch desk: +251 91 123 4567.`;
}

/**
 * Generates message for the kitchen / merchant to notify them of an incoming courier.
 */
export function generateMerchantPickupAlert(order: Order): string {
  return `📢 *JIJIGA EXPRESS — COURIER DISPATCHED FOR PICKUP*
━━━━━━━━━━━━━━━━━━━
Hello *${order.mamilaName}*,
A courier has been dispatched to collect order *#${order.id}*.

*Item:* ${order.batchName} (Qty: ${order.quantity})
${order.cookingInstruction ? `*Prep Instructions:* "${order.cookingInstruction}"\n` : ''}*Customer:* ${order.customerName}
*Courier:* ${order.riderName || 'Jijiga Express Courier'}

Please have the package sealed and ready for rapid handover. Thank you!`;
}
