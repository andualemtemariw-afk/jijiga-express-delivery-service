import React, { useState } from 'react';
import { 
  Zap, 
  CreditCard, 
  MapPin, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  X, 
  ArrowRight,
  Receipt,
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Order, PaymentMethod, EeuRechargeDetails } from '../../types';
import { EEU_HUBS, validateMeterNumber, calculateEstimatedUnits } from '../../utils/eeuStateMachine';

interface BookEeuModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (eeuOrder: Partial<Order>) => void;
  customerProfile?: {
    uid?: string;
    displayName?: string;
    phone?: string;
    city?: string;
    address?: string;
    plusCode?: string;
  } | null;
}

export const BookEeuModal: React.FC<BookEeuModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  customerProfile
}) => {
  const [meterInput, setMeterInput] = useState<string>('0142883910293');
  const [cardSerial, setCardSerial] = useState<string>('EEU-SM-99482');
  const [rechargeAmount, setRechargeAmount] = useState<number>(500);
  const [selectedHubId, setSelectedHubId] = useState<string>(EEU_HUBS[0].id);
  const [customerAddress, setCustomerAddress] = useState<string>(customerProfile?.address || 'Kebele 04, Jijiga');
  const [customerPhone, setCustomerPhone] = useState<string>(customerProfile?.phone || '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('TELEBIRR');
  const [specialNote, setSpecialNote] = useState<string>('');

  const serviceFee = 75; // Standard errand & round-trip physical transit fee
  const totalDue = rechargeAmount + serviceFee;
  const estimatedKwh = calculateEstimatedUnits(rechargeAmount);

  const meterValidation = validateMeterNumber(meterInput);

  const handleMeterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMeterInput(e.target.value);
  };

  const handleQuickAmount = (amt: number) => {
    setRechargeAmount(amt);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!meterValidation.isValid) return;

    const hub = EEU_HUBS.find(h => h.id === selectedHubId) || EEU_HUBS[0];
    const nowIso = new Date().toISOString();
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const customerDisplayName = customerProfile?.displayName || 'Customer';

    const initialCustody: EeuRechargeDetails = {
      meterNumber: meterValidation.formatted,
      cardSerialNumber: cardSerial.trim() || undefined,
      rechargeAmount: Number(rechargeAmount),
      serviceFee: serviceFee,
      eeuHubName: hub.name,
      custodyPhase: 'WITH_CUSTOMER',
      custodyLabel: 'WITH_CUSTOMER',
      custodyTimeline: [
        {
          phase: 'WITH_CUSTOMER',
          label: 'WITH_CUSTOMER',
          timestamp: timeStr,
          note: `Service requested by ${customerDisplayName}. Physical smart card ready for pickup at ${customerAddress}.`,
          actor: 'Customer'
        }
      ],
      kwhUnits: estimatedKwh
    };

    const newOrder: Partial<Order> = {
      id: 'ord-eeu-' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36),
      serviceType: 'EEU_RECHARGE',
      batchName: `EEU Card Recharge: ${rechargeAmount} ETB (~${estimatedKwh} kWh)`,
      batchId: `eeu-${Date.now()}`,
      mamilaId: 'eeu_hub',
      mamilaName: hub.name,
      mamilaLocation: hub.address,
      price: rechargeAmount,
      quantity: 1,
      deliveryFee: serviceFee,
      totalPrice: totalDue,
      status: 'PENDING',
      paymentMethod: paymentMethod,
      paymentStatus: paymentMethod === 'COD' ? 'UNPAID' : 'PAYMENT_PENDING',
      customerId: customerProfile?.uid || '',
      customerName: customerDisplayName,
      customerPhone: customerPhone,
      customerCity: customerProfile?.city || 'Jijiga',
      customerAddress: customerAddress,
      customerPlusCode: customerProfile?.plusCode || '8F2P+5H Jijiga',
      specialInstructions: specialNote ? `EEU Note: ${specialNote}` : '',
      eeuDetails: initialCustody,
      createdAt: new Date()
    };

    onSubmit(newOrder);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6"
      >
        {/* Header */}
        <div className="bg-linear-to-r from-amber-600 via-amber-700 to-amber-800 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center font-bold text-white shadow-xs">
              <Zap className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">EEU Prepaid Electricity Card Recharge</h3>
              <p className="text-xs text-amber-100">
                Round-trip physical card collection & terminal top-up service
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-amber-200 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chain of Custody Protocol Notice */}
        <div className="bg-amber-50 border-b border-amber-200/80 px-5 py-3 text-xs text-amber-900 flex items-start gap-2.5">
          <RotateCcw className="w-4 h-4 text-amber-700 mt-0.5 flex-shrink-0" />
          <div className="space-y-0.5">
            <span className="font-bold">Strict 5-Step Chain of Custody Enforced:</span>
            <div className="font-mono text-[11px] text-amber-800 font-semibold">
              WITH_CUSTOMER → WITH_RIDER → AT_EEU_HUB → WITH_RIDER → RETURNED
            </div>
            <p className="text-[11px] text-amber-700">
              Rider collects your physical card, visits the EEU terminal, captures a mandatory photo of the paper receipt with 20-digit STS token, and returns the charged card back to your doorstep.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 text-xs">
          {/* 13-Digit Meter Number Field */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="font-bold text-slate-800 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-amber-600" />
                13-Digit Meter Number (Keypad / Smart Card)
              </label>
              {meterValidation.isValid ? (
                <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Valid 13 Digits
                </span>
              ) : (
                <span className="text-[11px] font-medium text-rose-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Needs 13 digits ({meterValidation.cleaned.length}/13)
                </span>
              )}
            </div>
            <input
              type="text"
              required
              value={meterInput}
              onChange={handleMeterChange}
              placeholder="e.g. 0142 8839 1029 3"
              className={`w-full p-2.5 rounded-xl border font-mono text-sm tracking-wide focus:outline-hidden focus:ring-2 ${
                meterValidation.isValid
                  ? 'border-emerald-300 focus:ring-emerald-500/20 bg-emerald-50/20'
                  : 'border-slate-300 focus:ring-amber-500/20'
              }`}
            />
            {meterValidation.isValid && (
              <p className="text-[11px] font-mono text-slate-500 mt-1">
                Formatted: <strong>{meterValidation.formatted}</strong>
              </p>
            )}
          </div>

          {/* Physical Card Serial Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-800 block mb-1">Card Serial # (Printed on Card)</label>
              <input
                type="text"
                value={cardSerial}
                onChange={(e) => setCardSerial(e.target.value)}
                placeholder="e.g. EEU-SM-99482"
                className="w-full p-2.5 rounded-xl border border-slate-300 font-mono text-xs"
              />
            </div>
            <div>
              <label className="font-bold text-slate-800 block mb-1">Target EEU Hub / Branch</label>
              <select
                value={selectedHubId}
                onChange={(e) => setSelectedHubId(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-xs"
              >
                {EEU_HUBS.map(hub => (
                  <option key={hub.id} value={hub.id}>
                    {hub.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Cash Float Amount Field */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="font-bold text-slate-800">
                Cash Float / Recharge Amount (ETB)
              </label>
              <span className="text-[11px] text-emerald-700 font-bold">
                ≈ {estimatedKwh} kWh Estimated Units
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2 mb-2">
              {[300, 500, 1000, 2000].map(amt => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => handleQuickAmount(amt)}
                  className={`py-2 rounded-xl border text-xs font-bold transition cursor-pointer ${
                    rechargeAmount === amt
                      ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {amt} ETB
                </button>
              ))}
            </div>
            <input
              type="number"
              required
              min={100}
              max={15000}
              step={50}
              value={rechargeAmount}
              onChange={(e) => setRechargeAmount(Math.max(0, Number(e.target.value)))}
              className="w-full p-2.5 rounded-xl border border-slate-300 font-mono text-sm"
              placeholder="Enter custom ETB amount"
            />
          </div>

          {/* Pickup & Return Address */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-800 block mb-1">Pickup & Return Address</label>
              <input
                type="text"
                required
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 text-xs"
              />
            </div>
            <div>
              <label className="font-bold text-slate-800 block mb-1">Contact Phone</label>
              <input
                type="text"
                required
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 text-xs"
              />
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="font-bold text-slate-800 block mb-1">Payment Method for Float & Errand Fee</label>
            <div className="grid grid-cols-3 gap-2">
              {(['TELEBIRR', 'COD'] as PaymentMethod[]).map(pm => (
                <button
                  key={pm}
                  type="button"
                  onClick={() => setPaymentMethod(pm)}
                  className={`py-2 px-2.5 rounded-xl border text-[11px] font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    paymentMethod === pm
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {pm === 'TELEBIRR' && 'Telebirr Wallet'}
                  {pm === 'CBE_BIRR' && 'CBE Birr'}
                  {pm === 'COD' && 'Cash Handover'}
                </button>
              ))}
            </div>
          </div>

          {/* Cost Summary Breakdown */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Card Recharge Float (Deposited to EEU):</span>
              <span className="font-mono font-bold text-slate-900">{rechargeAmount.toLocaleString()} ETB</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Round-Trip Errand & Transit Fee:</span>
              <span className="font-mono text-slate-900">{serviceFee} ETB</span>
            </div>
            <div className="flex justify-between text-slate-900 font-bold pt-1.5 border-t border-slate-200 text-sm">
              <span>Total Settlement:</span>
              <span className="font-mono text-amber-700">{totalDue.toLocaleString()} ETB</span>
            </div>
          </div>

          {/* Footer Submit */}
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!meterValidation.isValid || rechargeAmount <= 0}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition"
              >
                <span>Dispatch Rider for Card Pickup</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[11px] text-slate-500 text-center font-medium">
              To request custom delivery features, ask support.
            </p>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
