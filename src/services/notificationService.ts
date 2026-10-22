import { Order, OrderStatus } from '../types';
import { playVoiceNoteChime } from '../utils/audioSimulation';
import { formatPhoneForWhatsApp, createWhatsAppUrl } from '../utils/whatsappDispatch';

export interface NotificationSettings {
  webPushEnabled: boolean;
  smsAlertsEnabled: boolean;
  whatsappAlertsEnabled: boolean;
  soundEnabled: boolean;
  vibrateEnabled: boolean;
}

export interface NotificationLog {
  id: string;
  orderId: string;
  title: string;
  body: string;
  channel: 'PUSH' | 'SMS' | 'WHATSAPP';
  timestamp: string;
  status: 'SENT' | 'CLICKED' | 'FAILED';
}

const SETTINGS_KEY = 'jijiga_notification_settings';
const LOGS_KEY = 'jijiga_notification_logs';

const DEFAULT_SETTINGS: NotificationSettings = {
  webPushEnabled: true,
  smsAlertsEnabled: true,
  whatsappAlertsEnabled: true,
  soundEnabled: true,
  vibrateEnabled: true,
};

/**
 * Checks whether the browser supports web push notifications.
 */
export function isPushSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Gets the current browser Notification permission state.
 */
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission;
}

/**
 * Requests browser permission to show Web Push notifications.
 */
export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isPushSupported()) return 'unsupported';
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      updateNotificationSettings({ webPushEnabled: true });
    } else {
      updateNotificationSettings({ webPushEnabled: false });
    }
    return permission;
  } catch (error) {
    console.warn('[NotificationService] Permission request failed:', error);
    return 'denied';
  }
}

/**
 * Retrieves persisted notification preferences from localStorage.
 */
export function getNotificationSettings(): NotificationSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    }
  } catch {
    // Ignore storage parse error
  }
  return DEFAULT_SETTINGS;
}

/**
 * Persists notification preferences.
 */
export function updateNotificationSettings(updates: Partial<NotificationSettings>): NotificationSettings {
  const current = getNotificationSettings();
  const updated = { ...current, ...updates };
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage quota error
  }
  return updated;
}

/**
 * Retrieves notification dispatch logs for audit & communication history.
 */
export function getNotificationLogs(): NotificationLog[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // Ignore storage parse error
  }
  return [];
}

/**
 * Appends a new dispatch event to notification logs.
 */
function logNotification(log: Omit<NotificationLog, 'id' | 'timestamp'>): void {
  try {
    const current = getNotificationLogs();
    const newEntry: NotificationLog = {
      ...log,
      id: `NOTIF-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      timestamp: new Date().toISOString(),
    };
    const trimmed = [newEntry, ...current].slice(0, 50); // Keep last 50
    localStorage.setItem(LOGS_KEY, JSON.stringify(trimmed));
  } catch {
    // Ignore storage quota error
  }
}

/**
 * Clear notification history.
 */
export function clearNotificationLogs(): void {
  try {
    localStorage.removeItem(LOGS_KEY);
  } catch {}
}

/**
 * Plays a pleasant synthesizer chime for order delivery notifications.
 */
export function playNotificationSound(): void {
  try {
    playVoiceNoteChime('start');
  } catch (e) {
    console.debug('[NotificationService] Sound playback ignored:', e);
  }
}

/**
 * Dispatches a native browser push notification.
 */
export async function showWebPushNotification(options: {
  title: string;
  body: string;
  orderId?: string;
  tag?: string;
  url?: string;
}): Promise<boolean> {
  const settings = getNotificationSettings();
  if (!settings.webPushEnabled) return false;
  if (!isPushSupported()) return false;
  if (Notification.permission !== 'granted') return false;

  const title = options.title;
  const notificationOptions: NotificationOptions & { renotify?: boolean } = {
    body: options.body,
    icon: '/icon-192.png',
    badge: '/icon.svg',
    tag: options.tag || `jijiga-order-${options.orderId || 'alert'}`,
    renotify: true,
    data: {
      url: options.url || '/',
      orderId: options.orderId,
      timestamp: Date.now()
    }
  };

  try {
    // 1. Try Service Worker ShowNotification first (best for background/PWA)
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        if (registration && registration.showNotification) {
          await registration.showNotification(title, notificationOptions);
          onNotificationSuccess(options);
          return true;
        }
      } catch (swErr) {
        console.debug('[NotificationService] ServiceWorker showNotification fallback:', swErr);
      }
    }

    // 2. Direct Window Notification API Fallback
    const notif = new Notification(title, notificationOptions);
    notif.onclick = () => {
      window.focus();
      notif.close();
    };

    onNotificationSuccess(options);
    return true;
  } catch (err) {
    console.warn('[NotificationService] Notification dispatch failed:', err);
    return false;
  }
}

function onNotificationSuccess(options: { title: string; body: string; orderId?: string }) {
  const settings = getNotificationSettings();
  if (settings.soundEnabled) {
    playNotificationSound();
  }
  if (settings.vibrateEnabled && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([200, 100, 200]);
    } catch {}
  }

  logNotification({
    orderId: options.orderId || 'SYS',
    title: options.title,
    body: options.body,
    channel: 'PUSH',
    status: 'SENT'
  });
}

/**
 * Pre-formats automated SMS payload for carrier dispatch.
 */
export function generateAutomatedSmsPayload(order: Order, stage: 'PLACED' | 'RUNNER' | 'TRANSIT' | 'DELIVERED'): {
  phone: string;
  body: string;
  smsUrl: string;
} {
  const phone = order.customerPhone || '0911234567';
  let body = '';

  switch (stage) {
    case 'PLACED':
      body = `[Jijiga Express] Order #${order.id} confirmed! Qty: ${order.quantity || 1}x ${order.batchName}. Total: ${order.totalPrice || order.price} ETB. Preparing for quality check.`;
      break;
    case 'RUNNER':
      body = `[Jijiga Express] Quality Runner ${order.runnerName || 'Assigned'} is inspecting your order #${order.id} at ${order.mamilaName}. Seal tag applied.`;
      break;
    case 'TRANSIT':
      body = `[Jijiga Express] Your order #${order.id} is OUT FOR DELIVERY! Rider ${order.riderName || 'Fleet'} en route to ${order.customerAddress || order.customerCity}. ETA: ~${order.etaMinutes || 7} mins.`;
      break;
    case 'DELIVERED':
      body = `[Jijiga Express] Order #${order.id} has been DELIVERED safely! Thank you for ordering local with Jijiga Express.`;
      break;
  }

  const cleanPhone = phone.replace(/\s+/g, '');
  const smsUrl = `sms:${cleanPhone}?body=${encodeURIComponent(body)}`;

  return { phone, body, smsUrl };
}

/**
 * Pre-formats automated WhatsApp dispatch payload.
 */
export function generateAutomatedWhatsAppPayload(order: Order, stage: 'PLACED' | 'RUNNER' | 'TRANSIT' | 'DELIVERED'): {
  phone: string;
  body: string;
  waUrl: string;
} {
  const phone = order.customerPhone || order.riderId ? '+251911234567' : '0911234567';
  let body = '';

  switch (stage) {
    case 'PLACED':
      body = `📦 *JIJIGA EXPRESS — ORDER CONFIRMED*\nOrder: #${order.id}\nItem: ${order.batchName}\nTotal: ${order.totalPrice || order.price} ETB (${order.paymentMethod})\nDestination: ${order.customerAddress || order.customerCity}\n\n_Your order has been queued for verification._`;
      break;
    case 'RUNNER':
      body = `🏃 *JIJIGA EXPRESS — RUNNER AT STORE*\nOrder: #${order.id}\nRunner: ${order.runnerName || 'Verified Runner'} (Tag #${order.runnerTagId || 'SEAL'})\nStore: ${order.mamilaName} (${order.mamilaLocation})\n\n_Quality inspection & tamper seal in progress._`;
      break;
    case 'TRANSIT':
      body = `🏍️ *JIJIGA EXPRESS — OUT FOR DELIVERY*\nOrder: #${order.id}\nRider: ${order.riderName || 'Express Courier'}\nETA: ~${order.etaMinutes || 7} mins\nDestination: ${order.customerAddress || order.customerCity}\n\n_Rider is on the way to your doorstep!_`;
      break;
    case 'DELIVERED':
      body = `✅ *JIJIGA EXPRESS — DELIVERED!*\nOrder: #${order.id}\nItem: ${order.batchName}\nStatus: Delivered & Confirmed\n\n_Thank you for choosing Jijiga Express!_`;
      break;
  }

  const waUrl = createWhatsAppUrl(phone, body);

  return { phone, body, waUrl };
}

/**
 * Evaluates an order status transition and automatically fires the corresponding
 * Web Push notification and records communication logs.
 */
export async function notifyOrderStatusChange(
  order: Order,
  previousStatus?: OrderStatus
): Promise<boolean> {
  if (previousStatus && previousStatus === order.status) {
    return false; // No status transition
  }

  let title = '';
  let body = '';

  switch (order.status) {
    case 'PENDING':
    case 'TRANSACTION_PENDING':
      title = '📦 Order Placed & Confirmed';
      body = `Order #${order.id.slice(0, 8)} (${order.batchName}) has been received and queued for dispatch.`;
      break;

    case 'RUNNER_ASSIGNED':
      title = '🏃 Courier Runner Assigned';
      body = `Runner ${order.runnerName || 'Courier'} has arrived at ${order.mamilaName} for quality inspection.`;
      break;

    case 'VERIFIED_READY':
    case 'READY_FOR_RIDER':
      title = '🛡️ Quality Verified & Staged';
      body = `Order #${order.id.slice(0, 8)} passed inspection with tamper-seal. Ready for rider pickup.`;
      break;

    case 'RIDER_DISPATCHED':
    case 'RIDER_ACCEPTED':
      title = '🏍️ Rider En Route to Hub';
      body = `Rider ${order.riderName || 'Courier'} accepted your delivery and is en route to collect the batch.`;
      break;

    case 'IN_TRANSIT':
    case 'PICKED_UP':
      title = '🚀 Out for Delivery!';
      body = `Rider ${order.riderName || 'Courier'} is on the way to ${order.customerAddress || order.customerCity}. ETA: ~${order.etaMinutes || 7} mins.`;
      break;

    case 'DELIVERED':
      title = '✅ Order Delivered to Doorstep';
      body = `Your order #${order.id.slice(0, 8)} (${order.batchName}) was delivered successfully. Enjoy!`;
      break;

    case 'RATED':
      title = '⭐ Rating Submitted';
      body = `Thank you for reviewing your delivery experience on Jijiga Express!`;
      break;

    case 'DEFECT_REJECTED':
      title = '⚠️ Inspection Notice: Declined';
      body = `Order #${order.id.slice(0, 8)} was declined during quality checks: ${order.defectReason || 'Item quality standard not met.'}`;
      break;

    case 'CANCELLED':
      title = '🚫 Order Cancelled';
      body = `Order #${order.id.slice(0, 8)} has been cancelled.`;
      break;

    default:
      return false;
  }

  // Trigger browser push notification
  const dispatched = await showWebPushNotification({
    title,
    body,
    orderId: order.id,
    tag: `jijiga-order-${order.id}-${order.status}`
  });

  return dispatched;
}

/**
 * Triggers an instant simulated test notification to confirm permissions and audio.
 */
export async function triggerTestNotification(): Promise<boolean> {
  const perm = getNotificationPermission();
  if (perm !== 'granted') {
    const requested = await requestNotificationPermission();
    if (requested !== 'granted') return false;
  }

  return showWebPushNotification({
    title: '🔔 Jijiga Express Live Notification',
    body: 'Browser push notifications and audio chimes are active and operational.',
    orderId: 'TEST-001',
    tag: 'jijiga-test-notif'
  });
}
