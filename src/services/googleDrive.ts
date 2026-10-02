import { Order } from '../types';

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  createdTime?: string;
  modifiedTime?: string;
  size?: string;
  webViewLink?: string;
  iconLink?: string;
}

const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3';

/**
 * List files in user's Google Drive.
 * Can filter by query or specific parent folder.
 */
export async function listDriveFiles(
  accessToken: string,
  options?: {
    pageSize?: number;
    q?: string;
    folderId?: string;
  }
): Promise<DriveFile[]> {
  const params = new URLSearchParams();
  params.set('pageSize', String(options?.pageSize || 25));
  params.set('fields', 'nextPageToken, files(id, name, mimeType, createdTime, modifiedTime, size, webViewLink, iconLink)');
  params.set('orderBy', 'modifiedTime desc');

  const queryParts: string[] = [];
  if (!options?.q || !options.q.includes('trashed')) {
    queryParts.push('trashed = false');
  }
  if (options?.folderId) {
    queryParts.push(`'${options.folderId}' in parents`);
  }
  if (options?.q) {
    queryParts.push(options.q);
  }
  if (queryParts.length > 0) {
    params.set('q', queryParts.join(' and '));
  }

  // NOTE: On GET requests, do NOT set 'Content-Type: application/json'
  // as it triggers an invalid CORS preflight check in browsers.
  const response = await fetch(`${DRIVE_API_BASE}/files?${params.toString()}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Google Drive API error (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  return data.files || [];
}

/**
 * Ensures or creates the "Jijiga Express Delivery Receipts" folder in Drive.
 */
export async function getOrCreateReceiptsFolder(accessToken: string): Promise<string> {
  const folderName = 'Jijiga Express Delivery Receipts';
  const query = `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder'`;

  try {
    const existingFolders = await listDriveFiles(accessToken, { q: query, pageSize: 1 });
    if (existingFolders.length > 0) {
      return existingFolders[0].id;
    }
  } catch (searchErr) {
    console.warn('Folder search error in Google Drive:', searchErr);
  }

  // Create folder
  const response = await fetch(`${DRIVE_API_BASE}/files`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      description: 'Official digital delivery receipts and proof of custody for Jijiga Express Delivery Service',
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to create receipts folder in Google Drive (${response.status}): ${errText}`);
  }

  const created = await response.json();
  return created.id;
}

/**
 * Uploads an order delivery receipt text/manifest to Google Drive.
 */
export async function uploadOrderReceiptToDrive(
  accessToken: string,
  order: Order
): Promise<DriveFile> {
  let folderId: string | undefined;
  try {
    folderId = await getOrCreateReceiptsFolder(accessToken);
  } catch (folderErr) {
    console.warn('Could not ensure receipts folder, uploading directly to Drive root:', folderErr);
  }

  const receiptContent = `===============================================================
           JIJIGA EXPRESS DELIVERY SERVICE - OFFICIAL RECEIPT
===============================================================
Order Reference: #${order.id}
Service Type:    ${order.serviceType}
Date:            ${new Date(order.createdAt).toLocaleString()}
Status:          ${order.status}
Customer Name:   ${order.customerName}
Customer Phone:  ${order.customerPhone}
Customer City:   ${order.customerCity || 'Jijiga'}
Dropoff Address: ${order.customerAddress || 'Kebele 04, Jijiga'}
Plus Code:       ${order.customerPlusCode || '8F2P+5H Jijiga'}

---------------------------------------------------------------
ORDER SPECIFICATIONS & LOGISTICS MANIFEST
---------------------------------------------------------------
Item/Batch:      ${order.batchName} (Qty: ${order.quantity})
Origin Hub:      ${order.mamilaName} (${order.mamilaLocation})
Assigned Courier:${order.riderName || order.runnerName || 'Jijiga Express Runner'}
Tamper Proof Tag:${order.runnerTagId || 'TAG-ET-VERIFIED'}

---------------------------------------------------------------
FINANCIAL RECONCILIATION
---------------------------------------------------------------
Subtotal:        ${order.price} ETB
Delivery Fee:    ${order.deliveryFee} ETB
Total Amount:    ${order.totalPrice} ETB
Payment Method:  ${order.paymentMethod} (Direct Mobile Money/Cash)

===============================================================
Verified by Jijiga Express Delivery Service • Regional Logistics Network
===============================================================`;

  const fileName = `Receipt_${order.id}_${order.customerCity || 'Jijiga'}.txt`;

  // Multipart upload to Google Drive
  const metadata: Record<string, any> = {
    name: fileName,
    mimeType: 'text/plain',
    description: `Official delivery receipt for order ${order.id}`,
  };
  if (folderId) {
    metadata.parents = [folderId];
  }

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: text/plain\r\n\r\n' +
    receiptContent +
    closeDelimiter;

  const response = await fetch(
    `${DRIVE_UPLOAD_BASE}/files?uploadType=multipart&fields=id,name,mimeType,webViewLink,createdTime,size`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to upload file to Google Drive: ${errorText}`);
  }

  return await response.json();
}

/**
 * Permanently deletes a file from Google Drive.
 * (Note: Callers MUST show explicit confirmation beforehand!)
 */
export async function deleteDriveFile(
  accessToken: string,
  fileId: string
): Promise<void> {
  const response = await fetch(`${DRIVE_API_BASE}/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok && response.status !== 204) {
    throw new Error(`Failed to delete file from Google Drive: ${response.statusText}`);
  }
}
