import { Order, ChatMessage } from '../types';
import { Camera, MapPin, PackageCheck, User, MessageSquare, ShieldAlert, XCircle, HandMetal, AlertCircle, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  orders: Order[];
  currentRunnerId?: string;
  currentRunnerName?: string;
  orderMessages?: Record<string, ChatMessage[]>;
  onSendMessage?: (orderId: string, message: Omit<ChatMessage, 'id' | 'orderId'>) => void;
  onUpdateStatus: (orderId: string, status: Order['status']) => void;
  onRejectDefect?: (orderId: string, reason: string) => void;
  onClaimOrder?: (orderId: string) => Promise<void>;
}

export function RunnerView({ 
  orders, 
  currentRunnerId,
  currentRunnerName,
  orderMessages, 
  onSendMessage, 
  onUpdateStatus, 
  onRejectDefect,
  onClaimOrder 
}: Props) {
  const [activeTab, setActiveTab] = useState<'unassigned' | 'my_inspections'>('unassigned');
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  
  // Checklist states for active verification
  const [checkFreshness, setCheckFreshness] = useState(false);
  const [checkInstructions, setCheckInstructions] = useState(false);
  const [checkSeal, setCheckSeal] = useState(false);

  // Defect reporting modal
  const [defectOrderId, setDefectOrderId] = useState<string | null>(null);
  const [defectReason, setDefectReason] = useState('Substandard freshness or damaged packaging');

  // Filter orders:
  // 1. Unassigned orders awaiting a runner to claim
  const unassignedOrders = orders.filter(
    o => !o.runnerId && (o.status === 'PENDING' || o.status === 'TRANSACTION_PENDING' || o.status === 'RUNNER_ASSIGNED')
  );

  // 2. Orders claimed by or assigned to this runner
  const myAssignedOrders = orders.filter(
    o => (o.runnerId === currentRunnerId || (!o.runnerId && o.status === 'RUNNER_ASSIGNED')) && o.status === 'RUNNER_ASSIGNED'
  );

  const startVerification = (id: string) => {
    setVerifyingId(id);
    setCheckFreshness(false);
    setCheckInstructions(false);
    setCheckSeal(false);
  };

  const submitDefect = () => {
    if (!defectOrderId || !onRejectDefect) return;
    onRejectDefect(defectOrderId, defectReason);
    setDefectOrderId(null);
  };

  const handleClaim = async (orderId: string) => {
    if (!onClaimOrder) return;
    try {
      setClaimingId(orderId);
      await onClaimOrder(orderId);
      setActiveTab('my_inspections');
    } catch (err: any) {
      console.error('Claim error:', err);
    } finally {
      setClaimingId(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Runner Inspection & Tagging Hub</h2>
          <p className="text-slate-500 text-xs">
            Courier: <span className="font-semibold text-slate-800">{currentRunnerName || 'Verified Runner'}</span>
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setActiveTab('unassigned')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'unassigned' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Available Jobs</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-800 font-bold">
              {unassignedOrders.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('my_inspections')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'my_inspections' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>My Active Queue</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-blue-100 text-blue-800 font-bold">
              {myAssignedOrders.length}
            </span>
          </button>
        </div>
      </div>

      {/* SECTION 1: UNASSIGNED ORDERS TO CLAIM */}
      {activeTab === 'unassigned' && (
        <div className="space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center justify-between">
            <span>
              <strong>Open Dispatch Pool:</strong> Claim an available order to begin physical packaging and quality verification at the Mamila store.
            </span>
          </div>

          {unassignedOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-56 text-slate-500 bg-white rounded-2xl border border-slate-200 p-6 text-center">
              <PackageCheck className="w-12 h-12 mb-2 text-slate-300" />
              <p className="font-semibold text-slate-800">No Open Jobs Available</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                All newly placed orders have already been claimed by active runners. New orders will appear here in real time.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {unassignedOrders.map(order => (
                <div key={order.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-bold tracking-wider text-amber-700 uppercase bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                        {order.serviceType || 'DELIVERY'} · Unassigned Job
                      </span>
                      <h3 className="text-lg font-bold text-slate-900 mt-1.5">{order.batchName}</h3>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">Order #{order.id}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-900 text-xs">{order.mamilaName}</p>
                      <p className="text-[11px] text-slate-500 flex items-center justify-end gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-blue-600" /> {order.mamilaLocation}
                      </p>
                    </div>
                  </div>

                  {order.specialInstructions && (
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 italic">
                      Note: "{order.specialInstructions}"
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-600">
                      Destination: <strong className="text-slate-900">{order.customerCity || 'Jijiga'}</strong>
                    </span>
                    <button
                      disabled={claimingId === order.id}
                      onClick={() => handleClaim(order.id)}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {claimingId === order.id ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Claiming...</span>
                        </>
                      ) : (
                        <>
                          <HandMetal className="w-3.5 h-3.5 text-amber-400" />
                          <span>Claim & Inspect Job</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: MY ACTIVE INSPECTION QUEUE */}
      {activeTab === 'my_inspections' && (
        <div className="space-y-4">
          {myAssignedOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-56 text-slate-500 bg-white rounded-2xl border border-slate-200 p-6 text-center">
              <PackageCheck className="w-12 h-12 mb-2 text-slate-300" />
              <p className="font-semibold text-slate-800">No Active Inspections</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                You have not claimed any jobs yet. Switch to "Available Jobs" to claim an unassigned pickup.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {myAssignedOrders.map(order => (
                <div key={order.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-5">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-bold tracking-wider text-blue-600 uppercase bg-blue-50 px-2.5 py-1 rounded-md">
                        Claimed By You · {order.quantity || 1} bundle(s)
                      </span>
                      <h3 className="text-xl font-bold text-slate-900 mt-2">{order.batchName}</h3>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">Order #{order.id}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-900 text-sm">{order.mamilaName}</p>
                      <p className="text-xs text-slate-500 flex items-center justify-end gap-1 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-blue-600" /> {order.mamilaLocation}
                      </p>
                      <span className="text-[11px] text-blue-700 font-semibold mt-1 inline-block">
                        Deliver to: {order.customerCity || 'Jijiga'}
                      </span>
                    </div>
                  </div>

                  {order.specialInstructions && (
                    <div className="p-3.5 bg-amber-50 border border-amber-200/90 rounded-xl flex items-start gap-2.5 text-xs text-amber-950">
                      <MessageSquare className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-amber-900">Customer Handling Instruction: </span>
                        <span className="italic">"{order.specialInstructions}"</span>
                      </div>
                    </div>
                  )}

                  {verifyingId === order.id ? (
                    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 space-y-5">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                        <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                          <Camera className="w-4 h-4 text-blue-600" />
                          Runner Physical Verification Checklist
                        </h4>
                        <span className="font-mono text-xs text-emerald-600 font-bold">
                          TAG-ET-{Math.floor(10000 + Math.random() * 90000)}
                        </span>
                      </div>

                      {/* 3-Point Checklist */}
                      <div className="space-y-2.5 text-xs">
                        <label className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={checkFreshness} 
                            onChange={(e) => setCheckFreshness(e.target.checked)}
                            className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                          />
                          <div>
                            <span className="font-semibold text-slate-900 block">Harvest & Expiry Verification</span>
                            <span className="text-slate-500 text-[11px]">Inspect harvest freshness, packaging integrity, and best-before date.</span>
                          </div>
                        </label>

                        <label className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={checkInstructions} 
                            onChange={(e) => setCheckInstructions(e.target.checked)}
                            className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                          />
                          <div>
                            <span className="font-semibold text-slate-900 block">Customer Note Confirmation</span>
                            <span className="text-slate-500 text-[11px]">Ensure bundle fulfills any special handling or packaging instructions.</span>
                          </div>
                        </label>

                        <label className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={checkSeal} 
                            onChange={(e) => setCheckSeal(e.target.checked)}
                            className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                          />
                          <div>
                            <span className="font-semibold text-slate-900 block">Apply Tamper-Evident Tag</span>
                            <span className="text-slate-500 text-[11px]">Affix barcode seal so customer can verify original condition at doorstep.</span>
                          </div>
                        </label>
                      </div>

                      {/* Verification Actions */}
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                        <button 
                          onClick={() => {
                            setDefectOrderId(order.id);
                            setVerifyingId(null);
                          }}
                          className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <ShieldAlert className="w-4 h-4" />
                          Reject Batch (Report Defect)
                        </button>

                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => setVerifyingId(null)} 
                            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button 
                            disabled={!checkFreshness || !checkInstructions || !checkSeal}
                            onClick={() => { 
                              setVerifyingId(null); 
                              onUpdateStatus(order.id, 'READY_FOR_RIDER'); 
                            }} 
                            className="px-5 py-2 text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
                          >
                            <PackageCheck className="w-4 h-4" />
                            Seal & Hand Over to Rider
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
                      <button 
                        onClick={() => startVerification(order.id)} 
                        className="w-full sm:flex-1 py-3 bg-slate-900 text-white rounded-xl font-semibold text-xs md:text-sm hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                      >
                        <Camera className="w-4 h-4" /> Verify Bundle Quality & Tag
                      </button>
                      <button
                        onClick={() => setDefectOrderId(order.id)}
                        className="px-4 py-3 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl font-semibold text-xs hover:bg-rose-100 transition-colors cursor-pointer whitespace-nowrap"
                      >
                        Report Defect
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* DEFECT REJECTION MODAL */}
      <AnimatePresence>
        {defectOrderId && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4"
            >
              <div className="flex justify-between items-start pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-rose-600" />
                  <h3 className="font-bold text-base text-slate-900">Reject Defective Batch</h3>
                </div>
                <button onClick={() => setDefectOrderId(null)} className="text-slate-400 hover:text-slate-600">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-slate-500">
                If the batch provided by the Mamila fails quality checks or freshness standards, reject it before rider transit. Stock will be restored and customer notified.
              </p>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700">Reason for Rejection</label>
                <select
                  value={defectReason}
                  onChange={(e) => setDefectReason(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white"
                >
                  <option value="Substandard freshness or damaged packaging">Substandard freshness or damaged packaging</option>
                  <option value="Expired harvest timestamp">Expired harvest timestamp</option>
                  <option value="Quantity does not match customer order">Quantity does not match customer order</option>
                  <option value="Failed customer temperature/handling note">Failed customer temperature/handling note</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  onClick={() => setDefectOrderId(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={submitDefect}
                  className="px-5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs cursor-pointer"
                >
                  Confirm Rejection
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
