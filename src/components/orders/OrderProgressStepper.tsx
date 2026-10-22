import React from 'react';
import { 
  Clock, 
  ShoppingBag, 
  Bike, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Sparkles,
  ShieldCheck,
  Check
} from 'lucide-react';
import { Order, OrderStatus } from '../../types';

export interface OrderProgressStepperProps {
  order: Order;
  variant?: 'compact' | 'expanded';
  className?: string;
  showDescriptions?: boolean;
}

export interface ProgressStage {
  step: number;
  key: 'pending' | 'runner' | 'rider' | 'delivered';
  label: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
}

export function getOrderStageIndex(status: OrderStatus): { stageIndex: number; isCancelled: boolean; isDefect: boolean } {
  switch (status) {
    case 'PENDING':
    case 'TRANSACTION_PENDING':
    case 'PAYMENT_PENDING':
      return { stageIndex: 1, isCancelled: false, isDefect: false };

    case 'RUNNER_ASSIGNED':
    case 'VERIFIED_READY':
    case 'READY_FOR_RIDER':
      return { stageIndex: 2, isCancelled: false, isDefect: false };

    case 'RIDER_DISPATCHED':
    case 'RIDER_ACCEPTED':
    case 'IN_TRANSIT':
    case 'PICKED_UP':
      return { stageIndex: 3, isCancelled: false, isDefect: false };

    case 'DELIVERED':
    case 'RATED':
      return { stageIndex: 4, isCancelled: false, isDefect: false };

    case 'DEFECT_REJECTED':
      return { stageIndex: 2, isCancelled: false, isDefect: true };

    case 'CANCELLED':
    case 'DECLINED':
      return { stageIndex: 1, isCancelled: true, isDefect: false };

    default:
      return { stageIndex: 1, isCancelled: false, isDefect: false };
  }
}

export const OrderProgressStepper: React.FC<OrderProgressStepperProps> = ({
  order,
  variant = 'expanded',
  className = '',
  showDescriptions = true,
}) => {
  const { stageIndex, isCancelled, isDefect } = getOrderStageIndex(order.status);

  const stages: ProgressStage[] = [
    {
      step: 1,
      key: 'pending',
      label: 'Pending',
      subtitle: 'Order received & queued',
      icon: Clock,
    },
    {
      step: 2,
      key: 'runner',
      label: 'Runner',
      subtitle: order.runnerName 
        ? `${order.runnerName} inspecting at store` 
        : 'Store inspection & sealing',
      icon: ShoppingBag,
    },
    {
      step: 3,
      key: 'rider',
      label: 'Rider',
      subtitle: order.riderName 
        ? `${order.riderName} in transit` 
        : 'Handed over & en route',
      icon: Bike,
    },
    {
      step: 4,
      key: 'delivered',
      label: 'Delivered',
      subtitle: 'Verified doorstep delivery',
      icon: CheckCircle2,
    },
  ];

  // If order was cancelled or defect-rejected, show intuitive alert alongside the stopped step
  if (isCancelled || isDefect) {
    return (
      <div className={`p-4 rounded-2xl border ${
        isDefect 
          ? 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-950 dark:text-rose-200' 
          : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-300'
      } ${className}`}>
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            {isDefect ? (
              <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
            ) : (
              <XCircle className="w-5 h-5 text-slate-500 shrink-0" />
            )}
            <div>
              <span className="font-bold text-sm block">
                {isDefect ? 'Order Declined on Quality Inspection' : 'Order Cancelled'}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {isDefect 
                  ? order.defectReason || 'Failed verification checks at Mamila store' 
                  : 'This order was stopped and will not proceed.'}
              </span>
            </div>
          </div>
          <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
            {order.status}
          </span>
        </div>

        {/* Grayed-out stopped progress line */}
        <div className="grid grid-cols-4 gap-2 text-center pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-xs">
          {stages.map((st) => (
            <div key={st.key} className="flex flex-col items-center opacity-50">
              <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 flex items-center justify-center text-[10px] font-bold">
                {st.step}
              </div>
              <span className="text-[11px] text-slate-500 mt-1">{st.label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // COMPACT VARIANT: Used in scrollable lists and cards
  if (variant === 'compact') {
    return (
      <div className={`space-y-2 ${className}`}>
        {/* Progress Rail and Icons */}
        <div className="relative flex items-center justify-between px-1">
          {/* Background Connecting Rail */}
          <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 h-1 bg-slate-100 dark:bg-slate-800 rounded-full" />
          
          {/* Active Fill Rail */}
          <div 
            className="absolute left-4 top-1/2 -translate-y-1/2 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500 rounded-full transition-all duration-500 ease-out"
            style={{ 
              width: stageIndex === 1 
                ? '0%' 
                : stageIndex === 2 
                ? '33%' 
                : stageIndex === 3 
                ? '66%' 
                : 'calc(100% - 2rem)' 
            }}
          />

          {stages.map((st) => {
            const isCompleted = stageIndex > st.step;
            const isCurrent = stageIndex === st.step;
            const Icon = st.icon;

            return (
              <div key={st.key} className="relative z-10 flex flex-col items-center">
                <div 
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isCompleted
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : isCurrent
                      ? 'bg-blue-600 text-white ring-3 ring-blue-100 dark:ring-blue-950 scale-110 shadow-xs'
                      : 'bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-400'
                  }`}
                  title={`${st.label}: ${st.subtitle}`}
                >
                  {isCompleted ? (
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  ) : (
                    <Icon className="w-3.5 h-3.5" />
                  )}
                </div>

                <span className={`text-[11px] mt-1.5 font-semibold transition-colors ${
                  isCurrent
                    ? 'text-blue-600 dark:text-blue-400 font-bold'
                    : isCompleted
                    ? 'text-slate-800 dark:text-slate-200'
                    : 'text-slate-400 dark:text-slate-500'
                }`}>
                  {st.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // EXPANDED VARIANT: High-fidelity visual stepper for Live Tracking Card
  return (
    <div className={`p-4 md:p-6 bg-gradient-to-b from-slate-50/80 to-white dark:from-slate-800/50 dark:to-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-6 ${className}`}>
      {/* Current Stage Indicator Headline */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200/70 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            {stageIndex < 4 && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            )}
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
              stageIndex === 4 ? 'bg-emerald-500' : 'bg-blue-600'
            }`}></span>
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Fulfillment Pipeline:
          </span>
          <span className="px-2.5 py-0.5 rounded-lg text-xs font-extrabold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            Stage {stageIndex} of 4: {stages[stageIndex - 1]?.label}
          </span>
        </div>

        {/* Dynamic Context Tag (Runner Tag, ETA, or Completion Confirmation) */}
        <div className="text-xs text-slate-600 dark:text-slate-300 font-medium">
          {stageIndex === 1 && (
            <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1 font-semibold">
              <Clock className="w-3.5 h-3.5" /> Awaiting courier acceptance...
            </span>
          )}
          {stageIndex === 2 && (
            <span className="text-sky-600 dark:text-sky-400 flex items-center gap-1 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" /> 
              {order.runnerTagId ? `Tag Verified: #${order.runnerTagId}` : 'Runner at vendor inspecting'}
            </span>
          )}
          {stageIndex === 3 && (
            <span className="text-indigo-600 dark:text-indigo-400 flex items-center gap-1 font-semibold">
              <Bike className="w-3.5 h-3.5" /> 
              {order.etaMinutes ? `Estimated Arrival: ~${order.etaMinutes} mins` : 'Rider actively in transit'}
            </span>
          )}
          {stageIndex === 4 && (
            <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
              <Sparkles className="w-3.5 h-3.5" /> Order Completed & Handed Over
            </span>
          )}
        </div>
      </div>

      {/* 4-STAGE STEPPER VISUAL */}
      <div className="relative px-2 md:px-6">
        {/* Connecting Background Line */}
        <div className="absolute left-8 right-8 top-6 -translate-y-1/2 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full" />

        {/* Dynamic Gradient Filled Progress Line */}
        <div 
          className="absolute left-8 top-6 -translate-y-1/2 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 rounded-full transition-all duration-700 ease-in-out shadow-2xs"
          style={{ 
            width: stageIndex === 1 
              ? '0%' 
              : stageIndex === 2 
              ? '33%' 
              : stageIndex === 3 
              ? '66%' 
              : 'calc(100% - 4rem)' 
          }}
        />

        {/* 4 Steps Container */}
        <div className="relative grid grid-cols-4 gap-2">
          {stages.map((st) => {
            const isCompleted = stageIndex > st.step;
            const isCurrent = stageIndex === st.step;
            const Icon = st.icon;

            return (
              <div key={st.key} className="flex flex-col items-center text-center">
                {/* Step Circle Node */}
                <div 
                  className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center transition-all duration-500 ${
                    isCompleted
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                      : isCurrent
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 ring-4 ring-blue-100 dark:ring-blue-950 scale-105'
                      : 'bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-400'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-6 h-6 stroke-[3]" />
                  ) : (
                    <Icon className="w-6 h-6" />
                  )}
                </div>

                {/* Step Stage Title */}
                <span className={`text-xs md:text-sm font-bold mt-2.5 transition-colors ${
                  isCurrent
                    ? 'text-blue-600 dark:text-blue-400'
                    : isCompleted
                    ? 'text-slate-900 dark:text-white'
                    : 'text-slate-400 dark:text-slate-500'
                }`}>
                  {st.label}
                </span>

                {/* Subtitle / Context description */}
                {showDescriptions && (
                  <span className={`text-[10px] md:text-[11px] max-w-[110px] leading-tight mt-0.5 line-clamp-2 transition-colors ${
                    isCurrent
                      ? 'text-slate-700 dark:text-slate-300 font-medium'
                      : isCompleted
                      ? 'text-slate-500 dark:text-slate-400'
                      : 'text-slate-400 dark:text-slate-600'
                  }`}>
                    {st.subtitle}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
