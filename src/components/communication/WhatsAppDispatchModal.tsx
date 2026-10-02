import React, { useState } from 'react';
import { Order } from '../../types';
import { 
  createWhatsAppUrl, 
  generateRiderDispatchMessage, 
  generateCustomerUpdateMessage, 
  generateMerchantPickupAlert,
  formatPhoneForWhatsApp 
} from '../../utils/whatsappDispatch';
import { 
  X, 
  Send, 
  Copy, 
  Check, 
  Users, 
  User, 
  Store, 
  Bike, 
  Phone, 
  ExternalLink,
  MessageCircle,
  Share2,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
}

type DispatchTarget = 'RIDER' | 'CUSTOMER' | 'MERCHANT' | 'BROADCAST';

export const WhatsAppDispatchModal: React.FC<Props> = ({ isOpen, onClose, order }) => {
  const [target, setTarget] = useState<DispatchTarget>('RIDER');
  const [customPhone, setCustomPhone] = useState('');
  const [customerPhase, setCustomerPhase] = useState<'dispatched' | 'arriving' | 'delivered'>('dispatched');
  const [copied, setCopied] = useState(false);

  if (!isOpen || !order) return null;

  // Determine active default recipient phone
  let defaultPhone = '';
  if (target === 'RIDER') {
    defaultPhone = '0912345678'; // Default Rider Fleet Hotline or assigned rider
  } else if (target === 'CUSTOMER') {
    defaultPhone = order.customerPhone || '0911234567';
  } else if (target === 'MERCHANT') {
    defaultPhone = '0914567891'; // Mamila store phone
  }

  const activePhone = customPhone || defaultPhone;

  // Generate appropriate message text based on target
  let messageText = '';
  if (target === 'RIDER' || target === 'BROADCAST') {
    messageText = generateRiderDispatchMessage(order);
  } else if (target === 'CUSTOMER') {
    messageText = generateCustomerUpdateMessage(order, customerPhase);
  } else if (target === 'MERCHANT') {
    messageText = generateMerchantPickupAlert(order);
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenWhatsApp = () => {
    const url = createWhatsAppUrl(target === 'BROADCAST' ? undefined : activePhone, messageText);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="bg-emerald-600 dark:bg-emerald-700 text-white p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-xs">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <span>WhatsApp Dispatch Center</span>
                  <span className="text-[11px] font-mono bg-white/25 px-2 py-0.5 rounded-full">
                    #{order.id}
                  </span>
                </h3>
                <p className="text-xs text-emerald-100">
                  Instantly dispatch orders to couriers, notify customers, or broadcast to fleet groups
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 space-y-4 overflow-y-auto flex-1 text-slate-800 dark:text-slate-100">
            {/* Target Audience Segmented Control */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block">
                Select Dispatch Recipient
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => { setTarget('RIDER'); setCustomPhone(''); }}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    target === 'RIDER'
                      ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Bike className="w-3.5 h-3.5" />
                  <span>Rider</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setTarget('CUSTOMER'); setCustomPhone(''); }}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    target === 'CUSTOMER'
                      ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Customer</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setTarget('MERCHANT'); setCustomPhone(''); }}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    target === 'MERCHANT'
                      ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Store className="w-3.5 h-3.5" />
                  <span>Store/Kitchen</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setTarget('BROADCAST'); setCustomPhone(''); }}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    target === 'BROADCAST'
                      ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Fleet Group</span>
                </button>
              </div>
            </div>

            {/* Sub-options for Customer milestone notification */}
            {target === 'CUSTOMER' && (
              <div className="flex items-center gap-2 p-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200/70 dark:border-emerald-800/70 text-xs">
                <span className="font-bold text-emerald-900 dark:text-emerald-200 text-[11px] whitespace-nowrap">
                  Notification Type:
                </span>
                <div className="flex gap-1.5 overflow-x-auto">
                  {(['dispatched', 'arriving', 'delivered'] as const).map(phase => (
                    <button
                      key={phase}
                      type="button"
                      onClick={() => setCustomerPhase(phase)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize cursor-pointer transition-colors ${
                        customerPhase === phase
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'bg-white dark:bg-slate-800 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100'
                      }`}
                    >
                      {phase === 'dispatched' ? '📦 Order Dispatched' : phase === 'arriving' ? '🛵 Arriving Soon' : '✅ Delivered'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Recipient Phone Input (if not broadcasting to generic group) */}
            {target !== 'BROADCAST' && (
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Recipient WhatsApp Phone Number</span>
                  </label>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Formatted: +{formatPhoneForWhatsApp(activePhone)}
                  </span>
                </div>
                <input
                  type="text"
                  value={customPhone || defaultPhone}
                  onChange={(e) => setCustomPhone(e.target.value)}
                  placeholder="e.g. 0912345678 or +251 91 123 4567"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>
            )}

            {/* Message Preview Box */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  WhatsApp Formatted Message Preview
                </label>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied!' : 'Copy Text'}</span>
                </button>
              </div>
              <div className="p-3.5 bg-slate-50 dark:bg-slate-950/70 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-800 dark:text-slate-200 whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed border-l-4 border-l-emerald-500">
                {messageText}
              </div>
            </div>

            {/* Order Quick Summary Pill */}
            <div className="grid grid-cols-2 gap-2 text-[11px] p-2.5 bg-slate-100 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-400">
              <div>
                <span className="block text-slate-400 font-bold uppercase text-[9px]">Pickup:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">{order.mamilaName}</span>
              </div>
              <div>
                <span className="block text-slate-400 font-bold uppercase text-[9px]">Delivery:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">{order.customerName} ({order.customerCity || 'Jijiga'})</span>
              </div>
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleCopy}
              className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied to Clipboard' : 'Copy Message'}</span>
            </button>

            <button
              type="button"
              onClick={handleOpenWhatsApp}
              className="px-5 py-2.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-md shadow-emerald-600/20 flex items-center gap-2 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>
                {target === 'BROADCAST' 
                  ? 'Broadcast to WhatsApp Fleet' 
                  : `Launch WhatsApp (+${formatPhoneForWhatsApp(activePhone)})`}
              </span>
              <ExternalLink className="w-3.5 h-3.5 text-emerald-200" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
