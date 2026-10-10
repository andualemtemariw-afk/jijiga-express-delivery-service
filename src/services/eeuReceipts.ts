import { doc, getDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { auth, db } from './googleAuth';
import { EeuRechargeDetails } from '../types';

export const EEU_TERMINAL_RECEIPT_DOC_ID = 'terminal';
export const MAX_EEU_RECEIPT_DATA_URL_LENGTH = 300000;

/**
 * Store the compressed receipt separately from the order document and atomically
 * attach its immutable metadata to the order. Firestore rules authorize both writes.
 */
export async function saveEeuReceiptAndOrderDetails(
  orderId: string,
  riderUid: string,
  imageDataUrl: string,
  eeuDetails: EeuRechargeDetails
): Promise<void> {
  const user = auth.currentUser;
  if (!user || user.uid !== riderUid) {
    throw new Error('The signed-in rider does not match this order receipt.');
  }
  if (
    imageDataUrl.length > MAX_EEU_RECEIPT_DATA_URL_LENGTH ||
    !/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(imageDataUrl)
  ) {
    throw new Error('Receipt image must be a compressed JPEG within the 300 KB evidence limit.');
  }
  if (eeuDetails.custodyPhase !== 'AT_EEU_HUB' || eeuDetails.receiptCaptured !== true) {
    throw new Error('The receipt can only be attached while the EEU card is at the hub.');
  }

  const orderRef = doc(db, 'orders', orderId);
  const receiptRef = doc(orderRef, 'receipts', EEU_TERMINAL_RECEIPT_DOC_ID);
  const batch = writeBatch(db);
  batch.set(receiptRef, {
    receiptImageUrl: imageDataUrl,
    capturedBy: riderUid,
    capturedAt: serverTimestamp(),
  });
  batch.update(orderRef, {
    eeuDetails,
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
}

/** Fetches the photo only when an authorized participant opens the receipt. */
export async function loadEeuReceiptImage(orderId: string): Promise<string | null> {
  if (!auth.currentUser) throw new Error('Sign in to view this order receipt.');
  const receiptRef = doc(db, 'orders', orderId, 'receipts', EEU_TERMINAL_RECEIPT_DOC_ID);
  const snap = await getDoc(receiptRef);
  if (!snap.exists()) return null;
  const image = snap.data().receiptImageUrl;
  return typeof image === 'string' ? image : null;
}
