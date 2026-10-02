import React, { useState } from 'react';
import { 
  Zap, 
  User, 
  Bike, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  Receipt, 
  Eye, 
  ChevronRight,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Order, EeuCustodyPhase, EeuRechargeDetails } from '../../types';
import { EEU_STATE_CHAIN, getNextEeuPhase } from '../../utils/eeuStateMachine';

interface EeuCustodyStepperProps {
  order: Order;
  isRiderView?: boolean;
  onAdvanceState?: (nextPhase: EeuCustodyPhase, updates?: Partial<EeuRechargeDetails>) => void;
  onRequestCameraReceipt?: () => void;
}

export const EeuCustodyStepper: React.FC<EeuCustodyStepperProps> = ({
  order,
  isRiderView = false,
  onAdvanceState,
  onRequestCameraReceipt
}) => {
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const details = order.eeuDetails;

  if (!details) return null;

  const currentPhase = details.custodyPhase;
  const currentStepConfig = EEU_STATE_CHAIN.find(s => s.phase === currentPhase) || EEU_STATE_CHAIN[0];
  const nextPhase = getNextEeuPhase(currentPhase);
  const isCompleted = currentPhase === 'RETURNED';

  const getStepStatus = (stepPhase: EeuCustodyPhase, stepIdx: number) => {
    const currentIdx = currentStepConfig.stepIndex;
    if (stepIdx < currentIdx || isCompleted) return 'COMPLETED';
    if (stepIdx === currentIdx && !isCompleted) return 'ACTIVE';
    return 'PENDING';
  };

  return (
    <div className="bg-white rounded-2xl border border-amber-200/80 shadow-xs overflow-hidden">
      {/* Header Banner */}
      <div className="bg-linear-to-r from-amber-900 via-slate-900 to-amber-950 p-4 sm:p-5 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-bold">
              <Zap className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  EEU Prepaid Chain of Custody
                </span>
                <span className="text-xs font-mono text-slate-400">
                  Meter: {details.meterNumber}
                </span>
              </div>
              <h4 className="text-base sm:text-lg font-bold text-white mt-0.5">
                Current Custody: <span className="text-amber-400">{details.custodyLabel}</span>
              </h4>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700 text-right">
              <span className="text-[10px] text-slate-400 block font-medium">Recharge Float</span>
              <span className="font-bold font-mono text-amber-400 text-sm">{details.rechargeAmount} ETB</span>
            </div>
            {details.kwhUnits && (
              <div className="bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700 text-right">
                <span className="text-[10px] text-slate-400 block font-medium">Est. Units</span>
                <span className="font-bold font-mono text-emerald-400 text-sm">~{details.kwhUnits} kWh</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 5-Step Stepper Progress Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-100 bg-amber-50/30">
        <div className="flex justify-between items-center text-[11px] font-bold text-slate-500 mb-2 font-mono">
          <span>Workflow: [WITH_CUSTOMER → WITH_RIDER → AT_EEU_HUB → WITH_RIDER → RETURNED]</span>
          <span className="text-amber-700">Step {currentStepConfig.stepIndex} of 5</span>
        </div>

        {/* Stepper visual cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {EEU_STATE_CHAIN.map((step) => {
            const status = getStepStatus(step.phase, step.stepIndex);
            return (
              <div
                key={step.phase}
                className={`p-2.5 rounded-xl border transition-all text-xs flex flex-col justify-between ${
                  status === 'COMPLETED'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                    : status === 'ACTIVE'
                    ? 'bg-amber-500 text-white border-amber-600 shadow-xs ring-2 ring-amber-400/40'
                    : 'bg-white border-slate-200 text-slate-400 opacity-60'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-[10px] font-bold">
                      {step.stepIndex}. {step.label}
                    </span>
                    {status === 'COMPLETED' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    ) : status === 'ACTIVE' ? (
                      <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    ) : (
                      <Clock className="w-3 h-3 text-slate-300" />
                    )}
                  </div>
                  <div className={`font-bold text-[11px] leading-tight ${status === 'ACTIVE' ? 'text-white' : 'text-slate-800'}`}>
                    {step.title}
                  </div>
                </div>

                <div className={`text-[10px] mt-2 font-medium ${status === 'ACTIVE' ? 'text-amber-100' : 'text-slate-500'}`}>
                  Actor: <strong>{step.actor}</strong>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Phase Description & Verification Section */}
      <div className="p-4 sm:p-5 space-y-4">
        <div className="flex items-start gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
          <RotateCcw className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="space-y-1">
            <span className="font-bold text-slate-900 block">
              Step {currentStepConfig.stepIndex} Active Protocol: {currentStepConfig.title}
            </span>
            <p className="text-slate-600">
              {currentStepConfig.description}
            </p>
            <div className="text-[11px] text-slate-500 font-mono pt-1">
              Designated Hub: <strong>{details.eeuHubName}</strong>
            </div>
          </div>
        </div>

        {/* Mandatory Camera Paper Receipt Section */}
        <div className={`p-4 rounded-xl border text-xs space-y-2.5 ${
          details.receiptImageUrl 
            ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
            : 'bg-amber-50/60 border-amber-200 text-amber-950'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold">
              <Receipt className="w-4 h-4 text-amber-700" />
              <span>Official EEU Terminal Paper Receipt</span>
            </div>
            {details.receiptImageUrl ? (
              <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-bold flex items-center gap-1 shadow-2xs">
                <CheckCircle2 className="w-3 h-3" />
                Verified Snapshot
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-md bg-amber-200 text-amber-900 text-[10px] font-bold">
                Mandatory for Completion
              </span>
            )}
          </div>

          {details.receiptImageUrl ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-3">
                <img
                  src={details.receiptImageUrl}
                  alt="EEU Receipt"
                  className="w-14 h-14 rounded-lg object-cover border border-emerald-300 shadow-2xs cursor-pointer hover:opacity-90"
                  onClick={() => setShowReceiptModal(true)}
                />
                <div className="space-y-0.5">
                  <div className="font-mono font-bold text-xs text-slate-900">
                    STS Token: {details.tokenCode || '4920-1928-4820-9182-3849'}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Captured at {details.receiptTimestamp || 'EEU Kiosk Counter'}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowReceiptModal(true)}
                className="px-3 py-1.5 bg-white border border-emerald-300 text-emerald-800 text-xs font-semibold rounded-lg hover:bg-emerald-50 transition cursor-pointer flex items-center gap-1"
              >
                <Eye className="w-3.5 h-3.5" />
                Inspect Paper Receipt
              </button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-slate-600">
              <p className="text-[11px]">
                {isRiderView 
                  ? 'As a Rider, you must execute the Camera Intent to snap the EEU terminal printout before returning card to customer.'
                  : 'Rider is instructed to photograph the physical terminal paper receipt with 20-digit token upon terminal recharge.'}
              </p>
              {isRiderView && onRequestCameraReceipt && (
                <button
                  onClick={onRequestCameraReceipt}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap self-start sm:self-auto"
                >
                  <Receipt className="w-3.5 h-3.5" />
                  Snap Receipt Photo
                </button>
              )}
            </div>
          )}
        </div>

        {/* Custody Timeline Log */}
        {details.custodyTimeline && details.custodyTimeline.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-slate-700 block uppercase tracking-wider">
              Custody Transfer Log:
            </span>
            <div className="space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              {details.custodyTimeline.map((item, idx) => (
                <div key={idx} className="flex items-start justify-between text-[11px] text-slate-600 pb-1 border-b border-slate-100 last:border-none last:pb-0">
                  <div className="flex items-start gap-1.5">
                    <span className="font-mono font-bold text-amber-700">[{item.label}]</span>
                    <span>{item.note}</span>
                  </div>
                  <span className="font-mono text-slate-400 ml-2 whitespace-nowrap">{item.timestamp}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rider Operational Controls (Advance State Machine) */}
        {isRiderView && !isCompleted && onAdvanceState && nextPhase && (
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">
              Next Custody Handover: <strong className="text-slate-800">{nextPhase}</strong>
            </span>
            <button
              onClick={() => onAdvanceState(nextPhase)}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <span>Advance Custody to {nextPhase}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Modal: Paper Receipt Zoom Lightbox */}
      <AnimatePresence>
        {showReceiptModal && details.receiptImageUrl && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden"
            >
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-amber-400" />
                  <h4 className="font-bold text-sm">Official EEU Terminal Paper Receipt</h4>
                </div>
                <button
                  onClick={() => setShowReceiptModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div className="aspect-4/3 rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                  <img
                    src={details.receiptImageUrl}
                    alt="Official EEU Terminal Receipt"
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="bg-amber-50/80 p-3 rounded-xl border border-amber-200 space-y-2 text-xs">
                  <div className="font-bold text-amber-950 flex items-center justify-between">
                    <span>20-Digit STS Prepaid Token</span>
                    <span className="font-mono text-amber-800">{details.kwhUnits} kWh</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-amber-200 font-mono font-bold text-center text-sm tracking-wider text-slate-900 select-all">
                    {details.tokenCode || '4920-1928-4820-9182-3849'}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1 font-mono">
                    <div>Meter: <strong>{details.meterNumber}</strong></div>
                    <div>Amount: <strong>{details.rechargeAmount} ETB</strong></div>
                    <div>Terminal: <strong>{details.eeuHubName.slice(0, 24)}...</strong></div>
                    <div>Custody Status: <strong>{details.custodyLabel}</strong></div>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                <button
                  onClick={() => setShowReceiptModal(false)}
                  className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Close Receipt
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
