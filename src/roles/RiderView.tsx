import { Order, ChatMessage, EeuCustodyPhase, EeuRechargeDetails } from '../types';
import { 
  Navigation2, 
  CheckCircle2, 
  PackageCheck, 
  MapPin, 
  Phone, 
  MessageSquare, 
  MessageCircle,
  DollarSign, 
  Calculator, 
  ShieldCheck, 
  Map as MapIcon, 
  Maximize2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Send,
  Radio,
  Camera,
  Zap,
  Receipt,
  X,
  ArrowRight,
  AlertTriangle
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { OrderMapPreview } from '../components/map/OrderMapPreview';
import { CommunicationBridgeModal } from '../components/communication/CommunicationBridgeModal';
import { WhatsAppDispatchModal } from '../components/communication/WhatsAppDispatchModal';
import { EeuCustodyStepper } from '../components/eeu/EeuCustodyStepper';
import { EEU_STATE_CHAIN, getNextEeuPhase, normalizeEeuStsToken, validateEeuTransition } from '../utils/eeuStateMachine';
import { motion, AnimatePresence } from 'motion/react';
import { saveEeuReceiptAndOrderDetails, MAX_EEU_RECEIPT_DATA_URL_LENGTH } from '../services/eeuReceipts';

 

/**
 * Compress an EEU receipt locally before saving it in the order-scoped receipts subcollection.
 * This avoids Cloud Storage while keeping large image data out of order list snapshots.
 */
async function compressReceiptForFirestore(file: File): Promise<string> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Could not open the receipt image. Please capture it again.'));
      image.src = objectUrl;
    });

    const maxDimension = 960;
    const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Image compression is unavailable on this device.');

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    for (const quality of [0.72, 0.62, 0.52, 0.42, 0.32]) {
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      if (dataUrl.length <= MAX_EEU_RECEIPT_DATA_URL_LENGTH) return dataUrl;
    }
    throw new Error('Receipt image is too large for the free Firestore evidence limit. Please capture the receipt closer with less background.');
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

interface Props {
  orders: Order[];
  orderMessages?: Record<string, ChatMessage[]>;
  onSendMessage?: (orderId: string, message: Omit<ChatMessage, 'id' | 'orderId'>) => void;
  onUpdateOrder: (orderId: string, updates: Partial<Order>, persistToFirestore?: boolean) => void;
  isDemoMode?: boolean;
  currentRiderId: string;
  currentRiderName?: string;
  onClaimOrder?: (orderId: string) => Promise<void>;
  onOpenMapPreview?: (order: Order) => void;
}

export function RiderView({ 
  orders, 
  orderMessages,
  onSendMessage,
  onUpdateOrder, 
  isDemoMode = false,
  currentRiderId, 
  currentRiderName,
  onClaimOrder,
  onOpenMapPreview 
}: Props) {
  const readyOrders = orders.filter(o => o.status === 'READY_FOR_RIDER' && !o.riderId);
  const activeJobs = orders.filter(o => ['RIDER_ACCEPTED', 'PICKED_UP'].includes(o.status) && o.riderId === currentRiderId);
  const [dialedPhone, setDialedPhone] = useState<string | null>(null);
  const [activeChatOrder, setActiveChatOrder] = useState<Order | null>(null);
  const [whatsAppOrder, setWhatsAppOrder] = useState<Order | null>(null);
  const [collapsedMaps, setCollapsedMaps] = useState<Record<string, boolean>>({});
  const [quickPillFeedback, setQuickPillFeedback] = useState<Record<string, string>>({});

  // Cash change calculator state
  const [tenderedAmount, setTenderedAmount] = useState<Record<string, number>>({});

  // EEU Prepaid Card State Machine & Camera Receipt Intent State
  const [cameraOrder, setCameraOrder] = useState<Order | null>(null);
  const [cameraTokenInput, setCameraTokenInput] = useState<string>('');
  const [isCapturingReceipt, setIsCapturingReceipt] = useState(false);
  const [eeuErrorMsg, setEeuErrorMsg] = useState<Record<string, string | null>>({});
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState<string | null>(null);
  const lastGpsWriteRef = useRef<Record<string, { at: number; lat: number; lng: number }>>({});

  // Real device GPS telemetry. Updates are throttled to reduce battery/data usage.
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation || activeJobs.length === 0) return;
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
        const now = Date.now();
        activeJobs.forEach((order) => {
          const previous = lastGpsWriteRef.current[order.id];
          const distanceApprox = previous
            ? Math.sqrt(Math.pow((coords.lat - previous.lat) * 111000, 2) + Math.pow((coords.lng - previous.lng) * 111000, 2))
            : Infinity;
          if (!previous || now - previous.at >= 15000 || distanceApprox >= 30) {
            lastGpsWriteRef.current[order.id] = { at: now, ...coords };
            onUpdateOrder(order.id, { riderCoordinates: coords });
          }
        });
      },
      (error) => console.warn('Rider GPS unavailable:', error.message),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [activeJobs.map(o => `${o.id}:${o.status}`).join('|'), onUpdateOrder]);

  const handleAdvanceEeuCustody = (order: Order, nextPhase: EeuCustodyPhase) => {
    if (!order.eeuDetails) return;

    const check = validateEeuTransition(order.eeuDetails, nextPhase);
    if (!check.allowed) {
      setEeuErrorMsg(prev => ({ ...prev, [order.id]: check.reason || 'Custody action blocked' }));
      return;
    }
    setEeuErrorMsg(prev => ({ ...prev, [order.id]: null }));

    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const stepConfig = EEU_STATE_CHAIN.find(s => s.phase === nextPhase);
    const isReturned = nextPhase === 'RETURNED';

    const newTimelineItem = {
      phase: nextPhase,
      label: stepConfig ? stepConfig.label : nextPhase,
      timestamp: nowTime,
      note: `Custody transitioned to ${stepConfig ? stepConfig.title : nextPhase} by Rider.`,
      actor: `Rider ${currentRiderId}`
    };

    const updatedEeuDetails: EeuRechargeDetails = {
      ...order.eeuDetails,
      custodyPhase: nextPhase,
      custodyLabel: stepConfig ? stepConfig.label : (nextPhase as any),
      custodyTimeline: [...order.eeuDetails.custodyTimeline, newTimelineItem],
    };

    const cashCollectedAtPickup = nextPhase === 'WITH_RIDER_OUTBOUND' && order.paymentMethod === 'COD';
    onUpdateOrder(order.id, {
      eeuDetails: updatedEeuDetails,
      status: isReturned ? 'DELIVERED' : 'PICKED_UP',
      paymentStatus: ((isReturned || cashCollectedAtPickup) && order.paymentMethod === 'COD')
        ? 'COLLECTED_BY_RIDER'
        : order.paymentStatus,
      riderId: currentRiderId,
      riderName: currentRiderName || 'Verified Rider'
    });
  };

  const openReceiptCamera = (order: Order) => {
    if (receiptPreviewUrl) URL.revokeObjectURL(receiptPreviewUrl);
    setReceiptPreviewUrl(null);
    setReceiptFile(null);
    setCameraTokenInput('');
    setEeuErrorMsg(prev => ({ ...prev, [order.id]: null }));
    setCameraOrder(order);
  };

  const closeReceiptCamera = () => {
    if (receiptPreviewUrl) URL.revokeObjectURL(receiptPreviewUrl);
    setReceiptPreviewUrl(null);
    setReceiptFile(null);
    setCameraTokenInput('');
    setCameraOrder(null);
  };

  const handleReceiptFileSelected = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setEeuErrorMsg(prev => ({ ...prev, [cameraOrder?.id || 'unknown']: 'Please capture an image file.' })); return; }
    if (file.size > 10 * 1024 * 1024) { setEeuErrorMsg(prev => ({ ...prev, [cameraOrder?.id || 'unknown']: 'Receipt image must be 10 MB or smaller.' })); return; }
    setReceiptFile(file);
    if (receiptPreviewUrl) URL.revokeObjectURL(receiptPreviewUrl);
    setReceiptPreviewUrl(URL.createObjectURL(file));
  };

  const handleCaptureReceiptSubmit = async () => {
    if (!cameraOrder?.eeuDetails || !receiptFile) return;
    const normalizedTokenCode = normalizeEeuStsToken(cameraTokenInput);
    if (normalizedTokenCode.length !== 20) {
      setEeuErrorMsg(prev => ({ ...prev, [cameraOrder.id]: 'Enter the full 20-digit STS token shown on the official EEU receipt.' }));
      return;
    }
    setIsCapturingReceipt(true);
    try {
      const receiptImageUrl = await compressReceiptForFirestore(receiptFile);
      const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const updatedEeu: EeuRechargeDetails = {
        ...cameraOrder.eeuDetails,
        receiptCaptured: true,
        receiptTimestamp: new Date().toISOString(),
        tokenCode: normalizedTokenCode,
        custodyTimeline: [...cameraOrder.eeuDetails.custodyTimeline, {
          phase: cameraOrder.eeuDetails.custodyPhase,
          label: cameraOrder.eeuDetails.custodyLabel,
          timestamp: nowTime,
          note: 'Actual EEU terminal receipt image compressed on-device and saved in the protected order receipts subcollection.',
          actor: `Rider ${currentRiderId}`
        }]
      };
      if (isDemoMode) {
        // Demo-only local previews may use the legacy inline field; it is never persisted to Firestore.
        onUpdateOrder(cameraOrder.id, {
          eeuDetails: { ...updatedEeu, receiptImageUrl }
        }, false);
      } else {
        await saveEeuReceiptAndOrderDetails(cameraOrder.id, currentRiderId, receiptImageUrl, updatedEeu);
        // The service committed order metadata and photo atomically; update app state without a duplicate write.
        onUpdateOrder(cameraOrder.id, { eeuDetails: updatedEeu }, false);
      }
      setReceiptFile(null);
      if (receiptPreviewUrl) URL.revokeObjectURL(receiptPreviewUrl);
      setReceiptPreviewUrl(null);
      setCameraTokenInput('');
      setCameraOrder(null);
    } catch (error: any) {
      setEeuErrorMsg(prev => ({ ...prev, [cameraOrder.id]: error?.message || 'Receipt upload failed.' }));
    } finally {
      setIsCapturingReceipt(false);
    }
  };

  const handleTenderChange = (orderId: string, val: number) => {
    setTenderedAmount(prev => ({ ...prev, [orderId]: val }));
  };

  const toggleMapCollapse = (orderId: string) => {
    setCollapsedMaps(prev => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {dialedPhone && (
        <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl flex items-center justify-between text-xs">
          <span>Encrypted relay dialer active: <strong className="font-mono">{dialedPhone}</strong></span>
          <button onClick={() => setDialedPhone(null)} className="font-semibold text-blue-700 hover:text-blue-900 cursor-pointer">
            End Call
          </button>
        </div>
      )}

      {activeJobs.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              Active Dispatch Delivery
            </h2>
            <span className="text-xs font-mono font-bold bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full">
              {activeJobs.length} In Transit
            </span>
          </div>

          <div className="space-y-4">
            {activeJobs.map(order => {
              const due = order.totalPrice || order.price;
              const tendered = tenderedAmount[order.id] || due;
              const changeDue = Math.max(0, tendered - due);

              return (
                <div key={order.id} className="bg-white border-2 border-emerald-200 p-6 rounded-2xl shadow-sm space-y-5">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-mono font-bold text-emerald-700 uppercase bg-emerald-50 px-2 py-0.5 rounded">
                        Order #{order.id}
                      </span>
                      <h3 className="font-bold text-xl text-slate-900 mt-1">{order.batchName}</h3>
                      <p className="text-xs text-slate-500">From Mamila: {order.mamilaName} ({order.mamilaLocation})</p>
                    </div>
                    <div className="text-right">
                      <p className="font-extrabold text-xl font-mono text-slate-900 tabular-nums">{due} ETB</p>
                      <span className={`text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full mt-1 inline-block ${
                        order.paymentMethod === 'COD' 
                          ? 'bg-amber-100 text-amber-800 border border-amber-300' 
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {order.paymentMethod === 'COD' ? 'Collect Cash on Delivery' : `${order.paymentMethod} Paid`}
                      </span>
                    </div>
                  </div>

                  {/* Special EEU Prepaid Card Chain of Custody Stepper for Rider */}
                  {order.serviceType === 'EEU_RECHARGE' && (
                    <div className="space-y-3">
                      <EeuCustodyStepper
                        order={order}
                        isRiderView={true}
                        onAdvanceState={(nextPhase) => handleAdvanceEeuCustody(order, nextPhase)}
                        onRequestCameraReceipt={() => openReceiptCamera(order)}
                      />
                      {eeuErrorMsg[order.id] && (
                        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                          <span>{eeuErrorMsg[order.id]}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Customer Navigation Box */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 font-semibold block text-[10px] uppercase">Destination</span>
                      <span className="font-bold text-slate-900 text-sm block">{order.customerName}</span>
                      <span className="text-slate-600 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                        {order.customerCity || 'Jijiga'}: {order.customerAddress || order.customerPlusCode}
                      </span>
                      <span className="text-[11px] font-mono text-blue-700 font-semibold mt-1 block">
                        Plus Code: {order.customerPlusCode}
                      </span>
                    </div>

                    <div className="flex flex-col justify-between sm:items-end">
                      <div className="text-left sm:text-right">
                        <span className="text-slate-400 font-semibold block text-[10px] uppercase">Route Telemetry</span>
                        <span className="font-mono font-bold text-slate-800 text-xs">
                          ~{order.distanceKm || 3.2} km · ~{order.etaMinutes || 12} mins
                        </span>
                        <span className="text-[10px] text-emerald-700 font-bold block mt-0.5">
                          {order.runnerTagId ? `Tamper Seal: ${order.runnerTagId}` : 'Awaiting Runner Seal'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-2 sm:mt-0">
                        <button
                          onClick={() => setActiveChatOrder(order)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 font-bold hover:bg-blue-100 transition-colors text-xs cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                          Chat & Voice ({((orderMessages && orderMessages[order.id]) || []).length})
                        </button>

                        <button
                          onClick={() => setWhatsAppOrder(order)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-300 rounded-lg text-emerald-800 font-bold hover:bg-emerald-100 transition-colors text-xs cursor-pointer shadow-2xs"
                          title="Open WhatsApp with Customer or Store"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                          WhatsApp
                        </button>

                        <button
                          onClick={() => order.customerPhone && setDialedPhone(order.customerPhone)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-700 font-semibold hover:bg-slate-100 transition-colors text-xs cursor-pointer"
                        >
                          <Phone className="w-3.5 h-3.5 text-emerald-600" />
                          Call
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Vernacular 1-Tap Quick-Pills for Courier */}
                  <div className="p-3 bg-gradient-to-r from-emerald-50/70 to-teal-50/70 rounded-xl border border-emerald-200/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-emerald-950 flex items-center gap-1.5">
                        <Radio className="w-3 h-3 text-emerald-600 animate-pulse" />
                        1-Tap Vernacular Dispatch Quick-Pills:
                      </span>
                      {quickPillFeedback[order.id] && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full animate-bounce">
                          {quickPillFeedback[order.id]}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { label: 'Waan soo dhowaaday (5 daqiiqo)', text: 'Waan soo dhowaaday, qiyaastii 5 daqiiqo ayaan kuugu imanayaa.', lang: 'so' as const, tag: '🇸🇴 Arriving in 5m' },
                        { label: 'Waan taaganahay albaabka', text: 'Waan taaganahay albaabkaaga hore, fadlan soo bax.', lang: 'so' as const, tag: '🇸🇴 At Front Gate' },
                        { label: 'እየደረስኩ ነው (5 ደቂቃ)', text: 'እየደረስኩ ነው፣ በ5 ደቂቃ አካባቢ እደርሳለሁ።', lang: 'am' as const, tag: '🇪🇹 Arriving in 5m' },
                        { label: 'ደጃፉ ጋ ቆሜያለሁ', text: 'ደጃፍዎ ላይ ደርሼ ቆሜያለሁ፣ እባክዎ ይውጡ።', lang: 'am' as const, tag: '🇪🇹 At Front Gate' },
                        { label: 'Arriving in ~5 mins', text: 'I am arriving shortly, approximately 5 minutes away.', lang: 'en' as const, tag: '🇬🇧 Arriving' },
                      ].map((pill, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            if (onSendMessage) {
                              const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                              onSendMessage(order.id, {
                                senderRole: 'RIDER',
                                senderName: 'Staff Rider',
                                text: pill.text,
                                timestamp: timeStr,
                                language: pill.lang,
                                status: 'DELIVERED'
                              });
                              setQuickPillFeedback(prev => ({ ...prev, [order.id]: '✓ Sent to customer!' }));
                              setTimeout(() => {
                                setQuickPillFeedback(prev => {
                                  const c = { ...prev };
                                  delete c[order.id];
                                  return c;
                                });
                              }, 3000);
                            }
                          }}
                          className="px-2.5 py-1 bg-white hover:bg-emerald-600 hover:text-white border border-emerald-200 text-slate-700 rounded-lg text-xs font-medium transition-all shadow-2xs cursor-pointer flex items-center gap-1"
                        >
                          <span className="text-[10px] opacity-75">{pill.tag}:</span>
                          <span>"{pill.label}"</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Special Instructions Note */}
                  {order.specialInstructions && (
                    <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl flex items-start gap-2 text-xs text-amber-950">
                      <MessageSquare className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Customer Instruction: </span>
                        <span>"{order.specialInstructions}"</span>
                      </div>
                    </div>
                  )}

                  {/* Turn-by-Turn Route Map Preview */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => toggleMapCollapse(order.id)}
                        className="text-xs font-bold text-slate-800 flex items-center gap-1.5 hover:text-blue-600 transition-colors cursor-pointer"
                      >
                        <MapIcon className="w-4 h-4 text-blue-600" />
                        <span>Live Dispatch Route Map Preview</span>
                        {collapsedMaps[order.id] ? (
                          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                        ) : (
                          <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                        )}
                      </button>

                      {onOpenMapPreview && (
                        <button
                          type="button"
                          onClick={() => onOpenMapPreview(order)}
                          className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Maximize2 className="w-3 h-3" />
                          Fullscreen
                        </button>
                      )}
                    </div>

                    {!collapsedMaps[order.id] && (
                      <OrderMapPreview
                        order={order}
                        heightClass="h-[280px]"
                        onExpandFullscreen={onOpenMapPreview ? () => onOpenMapPreview(order) : undefined}
                        showControls={true}
                      />
                    )}
                  </div>

                  {/* Cash Change Calculator for COD */}
                  {order.paymentMethod === 'COD' && order.status === 'PICKED_UP' && (
                    <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2 text-xs">
                      <div className="flex items-center gap-2 text-amber-900 font-bold">
                        <Calculator className="w-4 h-4" />
                        <span>COD Cash Change Calculator</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <label className="text-[11px] text-slate-500 block mb-0.5">Cash Tendered by Customer</label>
                          <input
                            type="number"
                            value={tendered}
                            onChange={(e) => handleTenderChange(order.id, Number(e.target.value))}
                            className="w-full p-2 bg-white rounded-lg border border-slate-300 font-mono font-bold"
                          />
                        </div>
                        <div className="text-right">
                          <span className="text-[11px] text-slate-500 block">Change Due to Customer</span>
                          <span className="text-base font-extrabold font-mono text-emerald-700">
                            {changeDue} ETB
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Handlers */}
                  <div>
                    {order.serviceType === 'EEU_RECHARGE' ? (
                      <div className="space-y-2">
                        {order.eeuDetails?.custodyPhase === 'WITH_CUSTOMER' && (
                          <button
                            onClick={() => handleAdvanceEeuCustody(order, 'WITH_RIDER_OUTBOUND')}
                            className="w-full py-3.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                          >
                            <Zap className="w-5 h-5 text-amber-200" />
                            <span>Collect Physical Card & Cash Float from Customer (WITH_RIDER)</span>
                          </button>
                        )}

                        {order.eeuDetails?.custodyPhase === 'WITH_RIDER_OUTBOUND' && (
                          <button
                            onClick={() => handleAdvanceEeuCustody(order, 'AT_EEU_HUB')}
                            className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                          >
                            <Zap className="w-5 h-5 text-amber-400" />
                            <span>Arrived at EEU Branch Terminal (AT_EEU_HUB)</span>
                          </button>
                        )}

                        {order.eeuDetails?.custodyPhase === 'AT_EEU_HUB' && (
                          <div className="space-y-2">
                            {!(order.eeuDetails.receiptCaptured || order.eeuDetails.receiptImageUrl) ? (
                              <button
                                onClick={() => { setCameraOrder(order); setReceiptFile(null); setReceiptPreviewUrl(null); }}
                                className="w-full py-3.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 cursor-pointer shadow-md ring-2 ring-amber-400/40"
                              >
                                <Camera className="w-5 h-5 animate-pulse" />
                                <span>Mandatory Camera Intent: Snap Paper Receipt & STS Token</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleAdvanceEeuCustody(order, 'WITH_RIDER_RETURN')}
                                className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                              >
                                <CheckCircle2 className="w-5 h-5 text-blue-200" />
                                <span>Receipt Verified - Start Return to Customer (WITH_RIDER)</span>
                              </button>
                            )}
                          </div>
                        )}

                        {order.eeuDetails?.custodyPhase === 'WITH_RIDER_RETURN' && (
                          <button
                            onClick={() => handleAdvanceEeuCustody(order, 'RETURNED')}
                            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 cursor-pointer shadow-md"
                          >
                            <CheckCircle2 className="w-5 h-5" />
                            <span>Hand Back Recharged Card & Paper Receipt (RETURNED)</span>
                          </button>
                        )}

                        {order.eeuDetails?.custodyPhase === 'RETURNED' && (
                          <div className="w-full py-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl font-bold text-xs flex items-center justify-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>Chain of Custody Completed & Recharged Card Returned</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      order.status === 'RIDER_ACCEPTED' ? (
                        <button 
                          onClick={() => onUpdateOrder(order.id, { status: 'PICKED_UP' })} 
                          className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                        >
                          <PackageCheck className="w-5 h-5 text-emerald-400" /> Confirm Pickup from Runner & Start Transit
                        </button>
                      ) : (
                        <button 
                          onClick={() => onUpdateOrder(order.id, { 
                            status: 'DELIVERED',
                            ...(order.paymentMethod === 'COD' ? { paymentStatus: 'COLLECTED_BY_RIDER' as const } : {})
                          })} 
                          className="w-full py-3.5 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 flex items-center justify-center gap-2 cursor-pointer shadow-md"
                        >
                          <CheckCircle2 className="w-5 h-5" /> 
                          {order.paymentMethod === 'COD' 
                            ? `Collect ${due} ETB Cash & Complete Doorstep Handover`
                            : `Confirm Delivery Handover (Paid via ${order.paymentMethod})`
                          }
                        </button>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Available Pickups Pool */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Available Deliveries Pool</h2>
          <p className="text-sm text-slate-500">Orders verified and tagged by Runners, waiting for courier acceptance.</p>
        </div>

        {readyOrders.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-500">
            No deliveries pending courier pickup right now.
          </div>
        ) : (
          <div className="grid gap-4">
            {readyOrders.map(order => (
              <div key={order.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-base">{order.batchName}</span>
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                      #{order.id}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                    <span>{order.mamilaLocation}</span>
                    <span className="text-slate-300">→</span>
                    <span className="font-semibold text-slate-700">{order.customerCity || 'Jijiga'} ({order.customerPlusCode})</span>
                  </p>
                  <p className="text-xs text-blue-600 font-bold mt-1 font-mono tabular-nums">
                    Value: {order.totalPrice || order.price} ETB · {order.paymentMethod}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {onOpenMapPreview && (
                    <button
                      type="button"
                      onClick={() => onOpenMapPreview(order)}
                      className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <MapIcon className="w-3.5 h-3.5 text-blue-600" />
                      Map Preview
                    </button>
                  )}

                  <button 
                    onClick={() => {
                      if (onClaimOrder) {
                        onClaimOrder(order.id);
                      } else {
                        onUpdateOrder(order.id, { 
                          status: 'RIDER_ACCEPTED', 
                          riderId: currentRiderId, 
                          riderName: currentRiderName || 'Verified Rider' 
                        });
                      }
                    }} 
                    className="px-5 py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs whitespace-nowrap"
                  >
                    <Navigation2 className="w-4 h-4 text-emerald-400" /> Accept Delivery Job
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      {/* RIDER-CUSTOMER COMMUNICATION BRIDGE MODAL */}
      {activeChatOrder && onSendMessage && (
        <CommunicationBridgeModal
          isOpen={!!activeChatOrder}
          onClose={() => setActiveChatOrder(null)}
          order={activeChatOrder}
          currentUserRole="RIDER"
          targetRole="CUSTOMER"
          targetName={activeChatOrder.customerName || 'Customer'}
          targetPhone={activeChatOrder.customerPhone || ''}
          messages={(orderMessages && orderMessages[activeChatOrder.id]) || []}
          onSendMessage={onSendMessage}
        />
      )}

      {/* MANDATORY CAMERA INTENT EXECUTION MODAL FOR EEU TERMINAL RECEIPT */}
      <AnimatePresence>
        {cameraOrder && (
          <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden"
            >
              <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-amber-400" />
                  <h4 className="font-bold text-sm">Mandatory Camera Intent: EEU Paper Receipt</h4>
                </div>
                <button
                  onClick={() => setCameraOrder(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <input
                id="eeu-receipt-camera"
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => handleReceiptFileSelected(e.target.files?.[0])}
              />

              <div className="p-5 space-y-4 text-xs">
                {/* Device camera / image capture */}
                <div className="aspect-4/3 rounded-xl border-2 border-dashed border-amber-400 bg-slate-900 overflow-hidden relative flex flex-col items-center justify-center text-white p-4">
                  <div className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center mb-2">
                    <Camera className="w-6 h-6 animate-pulse" />
                  </div>
                  <span className="font-bold text-sm">EEU Terminal Printout Viewfinder</span>
                  <span className="text-[11px] text-slate-400 text-center mt-1">
                    Frame the 20-digit STS token, meter number, and date/time clearly.
                  </span>

                  {/* Camera Reticle corners */}
                  <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-amber-400" />
                  <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-amber-400" />
                  <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-amber-400" />
                  <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-amber-400" />

                  <div className="absolute bottom-3 bg-slate-950/90 px-3 py-1 rounded-md text-[10px] font-mono text-emerald-400 border border-emerald-500/30">
                    Device camera capture · Receipt image required
                  </div>
                </div>

                {receiptPreviewUrl && (
                  <img src={receiptPreviewUrl} alt="Captured EEU receipt preview" className="w-full max-h-64 object-contain rounded-xl border border-slate-200 bg-slate-50" />
                )}

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Confirmed 20-Digit STS Prepaid Token (Printed on Slip)
                  </label>
                  <input
                    type="text"
                    required
                    value={cameraTokenInput}
                    onChange={(e) => setCameraTokenInput(normalizeEeuStsToken(e.target.value))}
                    placeholder="e.g. 4920 1928 4820 9182 3849"
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-mono text-sm tracking-wider text-center font-bold"
                  />
                </div>

                <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-amber-900 text-[11px] space-y-1">
                  <div className="font-bold flex items-center gap-1">
                    <Receipt className="w-3.5 h-3.5 text-amber-700" />
                    Strict EEU Audit Protocol:
                  </div>
                  <p>
                    The captured receipt is uploaded to protected Firebase Storage and linked to this order. The rider must verify the printed token before submitting.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setCameraOrder(null)}
                    className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isCapturingReceipt || cameraTokenInput.length !== 20}
                    onClick={() => receiptFile ? handleCaptureReceiptSubmit() : document.getElementById('eeu-receipt-camera')?.click()}
                    className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isCapturingReceipt ? (
                      <>
                        <Camera className="w-4 h-4 animate-spin" />
                        Processing Snapshot...
                      </>
                    ) : (
                      <>
                        <Camera className="w-4 h-4" />
                        Capture & Attach Receipt
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* WhatsApp Dispatch Modal for Rider */}
      <WhatsAppDispatchModal
        isOpen={Boolean(whatsAppOrder)}
        onClose={() => setWhatsAppOrder(null)}
        order={whatsAppOrder}
      />
    </div>
  );
}
