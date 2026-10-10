import React, { useState } from 'react';
import { Mamila, Batch, Order, PaymentMethod } from '../../types';
import { 
  X, 
  Store, 
  MapPin, 
  Star, 
  Clock, 
  Sparkles, 
  ShieldCheck, 
  Check, 
  Heart, 
  ArrowLeft, 
  ChevronRight, 
  CheckCircle2, 
  Package, 
  Phone, 
  Info,
  Layers,
  Leaf,
  Navigation
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  mamilas: Mamila[];
  inventory: Batch[];
  customerProfile: {
    uid: string;
    name: string;
    phone: string;
    city: string;
    address: string;
    plusCode: string;
  };
  onConfirmOrder: (order: Order) => void;
}

type Step = 'SELECT_MAMILA' | 'SELECT_BATCH' | 'CHECKOUT';

export const KhatMarketplaceModal: React.FC<Props> = ({
  isOpen,
  onClose,
  mamilas,
  inventory,
  customerProfile,
  onConfirmOrder,
}) => {
  // Filter only Khat Mamilas
  const khatMamilas = mamilas.filter(m => m.category === 'Khat Vendor (Mamila)' || m.id.startsWith('khat_'));
  
  // Persistent preferred mamila memory (saved in state or localStorage)
  const [preferredMamilaId, setPreferredMamilaId] = useState<string>(() => {
    return localStorage.getItem('jijiga_preferred_mamila_id') || 'khat_m1';
  });

  const [step, setStep] = useState<Step>('SELECT_MAMILA');
  const [selectedMamila, setSelectedMamila] = useState<Mamila | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [landmark, setLandmark] = useState(customerProfile.address || 'Kebele 04, Near Central Plaza');
  const [plusCode, setPlusCode] = useState(customerProfile.plusCode || '8F2P+5H Jijiga');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('COD');
  const [specialNote, setSpecialNote] = useState('');
  const [wrapType, setWrapType] = useState<'Fresh Banana Leaf' | 'Traditional Palm Fiber' | 'Moist Burlap Wrap'>('Fresh Banana Leaf');

  if (!isOpen) return null;

  // Batches belonging to the currently selected Mamila
  const currentMamilaBatches = selectedMamila 
    ? inventory.filter(b => b.mamilaId === selectedMamila.id || (b.category === 'Khat Marketplace' && b.mamilaId.includes('khat_')))
    : [];

  const handleSelectMamila = (mamila: Mamila) => {
    setSelectedMamila(mamila);
    setStep('SELECT_BATCH');
  };

  const handleSelectBatch = (batch: Batch) => {
    setSelectedBatch(batch);
    if (batch.bundleWrapType) {
      setWrapType(batch.bundleWrapType as any);
    }
    setStep('CHECKOUT');
  };

  const handleSaveAsPreferred = (e: React.MouseEvent, mamilaId: string) => {
    e.stopPropagation();
    setPreferredMamilaId(mamilaId);
    localStorage.setItem('jijiga_preferred_mamila_id', mamilaId);
  };

  const handlePlaceOrder = () => {
    if (!selectedMamila || !selectedBatch) return;

    const deliveryFee = 60; // Standard express city fee in Jijiga
    const itemsTotal = selectedBatch.price * quantity;
    const totalPrice = itemsTotal + deliveryFee;
    const orderId = 'ord-kht-' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);

    const newOrder: Order = {
      id: orderId,
      serviceType: 'KHAT',
      batchId: selectedBatch.id,
      batchName: selectedBatch.name,
      mamilaId: selectedMamila.id,
      mamilaName: selectedMamila.name,
      mamilaLocation: selectedMamila.location,
      price: selectedBatch.price,
      quantity,
      deliveryFee,
      totalPrice,
      status: 'PENDING',
      paymentMethod,
      paymentStatus: paymentMethod === 'COD' ? 'UNPAID' : 'PAYMENT_PENDING',
      customerId: customerProfile.uid,
      customerName: customerProfile.name,
      customerPhone: customerProfile.phone,
      customerCity: customerProfile.city || 'Jijiga',
      customerAddress: landmark,
      customerPlusCode: plusCode,
      specialInstructions: specialNote || 'Handover tender leaf fresh in banana wrap.',
      khatDetails: {
        mamilaId: selectedMamila.id,
        mamilaName: selectedMamila.name,
        grade: selectedBatch.khatGrade || 'Abo Mismar (Prime)',
        origin: selectedBatch.harvestTime?.includes('Aweday') ? 'Aweday' : selectedBatch.harvestTime?.includes('Gursum') ? 'Gursum' : 'Harar Highlands',
        arrivalBatchTime: selectedBatch.expiry,
        bundlesCount: quantity,
        bundleWrapType: wrapType,
        deliveryLandmark: landmark,
        preferredMamilaCustomerNote: specialNote,
      },
      createdAt: new Date(),
    };

    onConfirmOrder(newOrder);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full border border-emerald-200/80 dark:border-emerald-900/50 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* Top Banner Header */}
          <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white p-5 flex items-center justify-between relative overflow-hidden">
            <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-32 h-32 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center gap-3 relative z-10">
              {step !== 'SELECT_MAMILA' && (
                <button
                  type="button"
                  onClick={() => {
                    if (step === 'CHECKOUT') setStep('SELECT_BATCH');
                    else if (step === 'SELECT_BATCH') setStep('SELECT_MAMILA');
                  }}
                  className="p-1.5 bg-white/20 hover:bg-white/30 rounded-xl transition-colors cursor-pointer"
                  title="Go Back"
                >
                  <ArrowLeft className="w-5 h-5 text-white" />
                </button>
              )}

              <div className="p-2.5 bg-white/20 rounded-2xl backdrop-blur-xs flex items-center justify-center shadow-inner">
                <Leaf className="w-6 h-6 text-emerald-200" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black tracking-tight flex items-center gap-2">
                    <span>KHAT MARKETPLACE</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest bg-emerald-500/40 text-emerald-100 px-2 py-0.5 rounded-full border border-emerald-400/40">
                      Live Fresh Batches
                    </span>
                  </h3>
                </div>
                <p className="text-xs text-emerald-100 mt-0.5">
                  Direct connection with your trusted local Mamila in Jijiga & Harar
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-white/20 text-white transition-colors cursor-pointer relative z-10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stepper Indicator */}
          <div className="bg-emerald-50 dark:bg-emerald-950/40 px-6 py-2.5 border-b border-emerald-200/60 dark:border-emerald-900/60 flex items-center justify-between text-xs font-semibold">
            <div className="flex items-center gap-2">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                step === 'SELECT_MAMILA' 
                  ? 'bg-emerald-600 text-white shadow-2xs' 
                  : 'bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100'
              }`}>
                1
              </span>
              <span className={step === 'SELECT_MAMILA' ? 'text-emerald-950 dark:text-emerald-100 font-bold' : 'text-slate-500'}>
                Choose Mamila
              </span>
            </div>

            <ChevronRight className="w-4 h-4 text-slate-400" />

            <div className="flex items-center gap-2">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                step === 'SELECT_BATCH' 
                  ? 'bg-emerald-600 text-white shadow-2xs' 
                  : 'bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100'
              }`}>
                2
              </span>
              <span className={step === 'SELECT_BATCH' ? 'text-emerald-950 dark:text-emerald-100 font-bold' : 'text-slate-500'}>
                Select Fresh Batch
              </span>
            </div>

            <ChevronRight className="w-4 h-4 text-slate-400" />

            <div className="flex items-center gap-2">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                step === 'CHECKOUT' 
                  ? 'bg-emerald-600 text-white shadow-2xs' 
                  : 'bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100'
              }`}>
                3
              </span>
              <span className={step === 'CHECKOUT' ? 'text-emerald-950 dark:text-emerald-100 font-bold' : 'text-slate-500'}>
                Landmark & Pay
              </span>
            </div>
          </div>

          {/* Modal Scrollable Body */}
          <div className="p-5 overflow-y-auto flex-1 space-y-4 text-slate-800 dark:text-slate-100">
            {/* ================= STEP 1: BROWSE AVAILABLE MAMILAS ================= */}
            {step === 'SELECT_MAMILA' && (
              <div className="space-y-4">
                <div className="bg-emerald-500/10 p-3.5 rounded-2xl border border-emerald-500/20 flex items-start gap-3">
                  <Heart className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <span className="font-bold text-emerald-950 dark:text-emerald-200 block">
                      Preserve Your Preferred Mamila Relationship:
                    </span>
                    <p className="text-slate-600 dark:text-slate-400 mt-0.5">
                      In the Horn of Africa, your Mamila knows your exact leaf preference. Select your preferred vendor below to see their exclusive morning and afternoon fresh shipments.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Registered Verified Mamilas in Jijiga ({khatMamilas.length})
                  </h4>

                  <div className="grid grid-cols-1 gap-3">
                    {khatMamilas.map((mamila) => {
                      const isPreferred = preferredMamilaId === mamila.id;
                      const mamilaBatchesCount = inventory.filter(b => b.mamilaId === mamila.id).length;

                      return (
                        <div
                          key={mamila.id}
                          onClick={() => handleSelectMamila(mamila)}
                          className={`p-4 rounded-2xl border transition-all cursor-pointer hover:shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden ${
                            isPreferred 
                              ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 ring-2 ring-emerald-500/20' 
                              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-300'
                          }`}
                        >
                          {isPreferred && (
                            <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[10px] font-bold px-3 py-0.5 rounded-bl-xl shadow-xs flex items-center gap-1">
                              <Heart className="w-3 h-3 fill-white" />
                              <span>Your Preferred Mamila</span>
                            </div>
                          )}

                          <div className="flex items-start gap-3.5">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center font-bold text-lg shadow-sm flex-shrink-0">
                              🌿
                            </div>

                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-extrabold text-base text-slate-900 dark:text-white">
                                  {mamila.name}
                                </h4>
                                {mamila.stallNumber && (
                                  <span className="text-[11px] font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md text-slate-600 dark:text-slate-300 font-semibold">
                                    {mamila.stallNumber}
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                                <span className="flex items-center gap-1 font-semibold text-amber-600">
                                  <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                                  {mamila.rating}
                                </span>
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                  {mamila.location}
                                </span>
                                <span className="font-mono text-[11px] text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950 px-1.5 py-0.2 rounded">
                                  {mamila.plusCode}
                                </span>
                              </div>

                              {mamila.khatSpecialty && (
                                <p className="text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                                  Specialty: {mamila.khatSpecialty}
                                </p>
                              )}

                              {mamila.dailyArrivalTime && (
                                <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-1">
                                  <Clock className="w-3 h-3 text-slate-400" />
                                  <span>{mamila.dailyArrivalTime}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100 dark:border-slate-800">
                            <button
                              type="button"
                              onClick={(e) => handleSaveAsPreferred(e, mamila.id)}
                              className={`px-3 py-1 text-xs font-semibold rounded-xl border transition-colors flex items-center gap-1.5 cursor-pointer ${
                                isPreferred 
                                  ? 'bg-emerald-600 text-white border-emerald-600' 
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-emerald-600 border-slate-200'
                              }`}
                              title="Set as your preferred vendor"
                            >
                              <Heart className={`w-3.5 h-3.5 ${isPreferred ? 'fill-white' : ''}`} />
                              <span>{isPreferred ? 'Preferred' : 'Make Favorite'}</span>
                            </button>

                            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1.5 rounded-xl border border-emerald-200/60">
                              <span>{mamilaBatchesCount > 0 ? `${mamilaBatchesCount} Batches Live` : 'View Batches'}</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ================= STEP 2: VIEW CURRENTLY AVAILABLE BATCHES ================= */}
            {step === 'SELECT_BATCH' && selectedMamila && (
              <div className="space-y-4">
                {/* Active Mamila Overview Card */}
                <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-slate-800 dark:to-slate-800/80 rounded-2xl border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                      🌿
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                        <span>{selectedMamila.name}</span>
                        {preferredMamilaId === selectedMamila.id && (
                          <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-semibold">
                            Your Preferred
                          </span>
                        )}
                      </h4>
                      <p className="text-xs text-slate-500">
                        {selectedMamila.location} • {selectedMamila.phone}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setStep('SELECT_MAMILA')}
                    className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    Change Mamila
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Live Fresh Batches on Display Today
                    </h4>
                    <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-200">
                      {currentMamilaBatches.length} Batches Ready
                    </span>
                  </div>

                  {currentMamilaBatches.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 space-y-2">
                      <p className="text-sm font-semibold text-slate-600">
                        No live batches currently listed for this Mamila.
                      </p>
                      <button
                        type="button"
                        onClick={() => setStep('SELECT_MAMILA')}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold cursor-pointer"
                      >
                        Choose Another Mamila
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3.5">
                      {currentMamilaBatches.map(batch => (
                        <div
                          key={batch.id}
                          className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 hover:shadow-lg transition-all flex flex-col sm:flex-row gap-4"
                        >
                          {/* Live/Current Batch Photo */}
                          <div className="sm:w-44 h-36 rounded-xl overflow-hidden relative flex-shrink-0 bg-slate-100">
                            <img
                              src={batch.imageUrl}
                              alt={batch.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-emerald-400" />
                              <span>Live Photo</span>
                            </div>
                            {batch.khatGrade && (
                              <div className="absolute bottom-2 left-2 bg-emerald-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs">
                                {batch.khatGrade}
                              </div>
                            )}
                          </div>

                          {/* Batch Information Details */}
                          <div className="flex-1 flex flex-col justify-between space-y-2">
                            <div>
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <h4 className="font-extrabold text-base text-slate-900 dark:text-white">
                                    {batch.name}
                                  </h4>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                                    {batch.description}
                                  </p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <span className="font-extrabold text-lg font-mono text-emerald-700 dark:text-emerald-400 block tabular-nums">
                                    {batch.price} ETB
                                  </span>
                                  <span className="text-[11px] text-slate-400 block font-medium">
                                    per bundle
                                  </span>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/60 text-xs">
                                <div>
                                  <span className="text-slate-400 text-[10px] font-bold uppercase block">
                                    Freshness & Arrival:
                                  </span>
                                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                                    {batch.expiry}
                                  </span>
                                </div>

                                <div>
                                  <span className="text-slate-400 text-[10px] font-bold uppercase block">
                                    Leaf Quality & Moisture:
                                  </span>
                                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                                    {batch.leafMoisture || 'Tender, high succulence'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/60">
                              <span className="text-xs text-slate-500">
                                Stock: <strong className="text-slate-800 dark:text-slate-200">{batch.available} bundles</strong> remaining
                              </span>

                              <button
                                type="button"
                                onClick={() => handleSelectBatch(batch)}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer"
                              >
                                <span>Select This Batch</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ================= STEP 3: CHECKOUT & LANDMARK SPECIFICATION ================= */}
            {step === 'CHECKOUT' && selectedMamila && selectedBatch && (
              <div className="space-y-4">
                {/* Batch Summary Header */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center gap-3">
                  <img
                    src={selectedBatch.imageUrl}
                    alt={selectedBatch.name}
                    className="w-16 h-16 rounded-xl object-cover border border-slate-300 dark:border-slate-600"
                  />
                  <div className="flex-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      From {selectedMamila.name}
                    </span>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                      {selectedBatch.name}
                    </h4>
                    <p className="text-xs text-slate-500 font-mono">
                      {selectedBatch.price} ETB / bundle • {selectedBatch.expiry}
                    </p>
                  </div>
                </div>

                {/* Quantity & Wrap Options */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                      Quantity (Number of Bundles)
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="w-9 h-9 rounded-xl border border-slate-300 dark:border-slate-700 flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 cursor-pointer"
                      >
                        -
                      </button>
                      <span className="text-base font-extrabold font-mono w-10 text-center">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQuantity(quantity + 1)}
                        className="w-9 h-9 rounded-xl border border-slate-300 dark:border-slate-700 flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 cursor-pointer"
                      >
                        +
                      </button>
                      <span className="text-xs text-slate-500 font-mono">
                        = {selectedBatch.price * quantity} ETB
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                      Preservation Wrap Style
                    </label>
                    <select
                      value={wrapType}
                      onChange={(e) => setWrapType(e.target.value as any)}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                    >
                      <option value="Fresh Banana Leaf">Fresh Banana Leaf (Maximum Moisture)</option>
                      <option value="Traditional Palm Fiber">Traditional Palm Fiber Wrap</option>
                      <option value="Moist Burlap Wrap">Moist Burlap Wrap (Shade Storage)</option>
                    </select>
                  </div>
                </div>

                {/* Delivery Landmark & Plus Code */}
                <div className="space-y-3 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Navigation className="w-4 h-4 text-emerald-600" />
                    <span>Delivery Landmark & Doorstep Address</span>
                  </h4>

                  <div className="space-y-2">
                    <label className="text-xs text-slate-500 block">
                      Specific Compound / Landmark in {customerProfile.city || 'Jijiga'}
                    </label>
                    <input
                      type="text"
                      value={landmark}
                      onChange={(e) => setLandmark(e.target.value)}
                      placeholder="e.g. Kebele 04, Behind Al-Baraka Hotel, Blue Gate"
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="text-[11px] text-slate-500 block">Google Plus Code</label>
                      <input
                        type="text"
                        value={plusCode}
                        onChange={(e) => setPlusCode(e.target.value)}
                        className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-700 font-mono bg-slate-50 dark:bg-slate-800"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-500 block">Recipient Phone</label>
                      <input
                        type="text"
                        defaultValue={customerProfile.phone}
                        className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-700 font-mono bg-slate-50 dark:bg-slate-800"
                        readOnly
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-500 block">
                      Special Note for Your Mamila (Optional)
                    </label>
                    <input
                      type="text"
                      value={specialNote}
                      onChange={(e) => setSpecialNote(e.target.value)}
                      placeholder="e.g. Please pick the softest young leaves from the morning batch."
                      className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    />
                  </div>
                </div>

                {/* Payment Method Selector */}
                <div className="space-y-2 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    Select Payment Method
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'COD', label: 'Cash on Delivery', badge: 'Pay courier at handover' }
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPaymentMethod(m.id as PaymentMethod)}
                        className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                          paymentMethod === m.id
                            ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 shadow-xs'
                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span>{m.label}</span>
                        <span className="text-[9px] font-normal text-slate-400">{m.badge}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Order Tariff Breakdown */}
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>{quantity}x {selectedBatch.name}</span>
                    <span className="font-mono">{selectedBatch.price * quantity} ETB</span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Express Motorcycle Delivery Fee</span>
                    <span className="font-mono">60 ETB</span>
                  </div>
                  <div className="flex justify-between text-base font-extrabold text-slate-900 dark:text-white pt-2 border-t border-emerald-200 dark:border-emerald-800">
                    <span>Total Due</span>
                    <span className="font-mono text-emerald-700 dark:text-emerald-400">
                      {selectedBatch.price * quantity + 60} ETB
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>

            {step === 'CHECKOUT' ? (
              <button
                type="button"
                onClick={handlePlaceOrder}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/25 flex items-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm & Place Khat Order ({selectedBatch ? selectedBatch.price * quantity + 60 : 0} ETB)</span>
              </button>
            ) : (
              <div className="text-xs text-slate-500 font-medium">
                {step === 'SELECT_MAMILA' ? 'Select a Mamila above to continue' : 'Pick a batch above to configure delivery'}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
