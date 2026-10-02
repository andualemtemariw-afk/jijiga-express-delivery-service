import { Order } from '../types';

const GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me';

export interface GmailMessageItem {
  id: string;
  threadId: string;
  snippet?: string;
  subject?: string;
  date?: string;
  to?: string;
}

/**
 * Encodes a string into base64url according to RFC 4648.
 */
function toBase64Url(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Sends an email using the Gmail REST API (users.messages.send).
 * NOTE: Callers MUST present explicit confirmation dialog to user before calling this!
 */
export async function sendDeliveryEmail(
  accessToken: string,
  params: {
    to: string;
    subject: string;
    bodyText: string;
    orderId?: string;
  }
): Promise<{ id: string; threadId: string }> {
  const rfc822 = [
    `To: ${params.to}`,
    `Subject: =?utf-8?B?${btoa(unescape(encodeURIComponent(params.subject)))}?=`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 7bit',
    '',
    params.bodyText,
  ].join('\r\n');

  const raw = toBase64Url(rfc822);

  const response = await fetch(`${GMAIL_API_BASE}/messages/send`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gmail API send failed (${response.status}): ${errorText}`);
  }

  return await response.json();
}

/**
 * Generates official email content for an order dispatch/receipt.
 */
export function buildOrderDispatchEmail(order: Order, recipientEmail: string) {
  const subject = `[Jijiga Express] Delivery Confirmation for Order #${order.id} (${order.batchName})`;
  const bodyText = `Dear Customer,

Thank you for choosing Jijiga Express Delivery Service!

Here are the details of your order dispatch:
------------------------------------------------------------
Order Reference: #${order.id}
Service Type:    ${order.serviceType}
Item / Batch:    ${order.batchName} (Quantity: ${order.quantity})
Origin Store:    ${order.mamilaName} (${order.mamilaLocation})
Dropoff City:    ${order.customerCity || 'Jijiga'}
Dropoff Address: ${order.customerAddress || 'Kebele 04, Jijiga'}
Plus Code:       ${order.customerPlusCode || '8F2P+5H Jijiga'}
Courier Status:  ${order.status}
Verification Tag:${order.runnerTagId || 'TAG-ET-VERIFIED'}

Payment Method:  ${order.paymentMethod}
Total Paid:      ${order.totalPrice} ETB (Includes ${order.deliveryFee} ETB delivery)

------------------------------------------------------------
Need help? Contact our central dispatch hotline at +251 91 123 4567.

Warm regards,
Jijiga Express Delivery Logistics Team
Horn of Africa Regional Transit Network`;

  return { subject, bodyText, to: recipientEmail };
}

/**
 * Lists recent Jijiga Express delivery emails from user's mailbox.
 */
export async function listRecentDeliveryEmails(
  accessToken: string,
  maxResults = 10
): Promise<GmailMessageItem[]> {
  const query = encodeURIComponent('subject:"Jijiga Express"');
  const res = await fetch(`${GMAIL_API_BASE}/messages?maxResults=${maxResults}&q=${query}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error('Failed to retrieve messages from Gmail');
  }

  const data = await responseJsonSafe(res);
  if (!data.messages || !Array.isArray(data.messages)) {
    return [];
  }

  // Fetch snippets for these messages
  const items: GmailMessageItem[] = await Promise.all(
    data.messages.slice(0, 10).map(async (msg: { id: string; threadId: string }) => {
      try {
        const detailRes = await fetch(`${GMAIL_API_BASE}/messages/${msg.id}?format=metadata`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!detailRes.ok) return { id: msg.id, threadId: msg.threadId };
        const detail = await detailRes.json();
        
        const headers: { name: string; value: string }[] = detail.payload?.headers || [];
        const subject = headers.find(h => h.name.toLowerCase() === 'subject')?.value;
        const date = headers.find(h => h.name.toLowerCase() === 'date')?.value;
        const to = headers.find(h => h.name.toLowerCase() === 'to')?.value;

        return {
          id: msg.id,
          threadId: msg.threadId,
          snippet: detail.snippet,
          subject,
          date,
          to,
        };
      } catch {
        return { id: msg.id, threadId: msg.threadId };
      }
    })
  );

  return items;
}

async function responseJsonSafe(res: Response) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}
