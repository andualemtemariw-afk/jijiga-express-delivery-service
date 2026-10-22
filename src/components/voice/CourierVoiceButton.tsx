import React from 'react';
import { Mic, FileAudio, Edit2, Volume2 } from 'lucide-react';
import { Order } from '../../types';

interface CourierVoiceButtonProps {
  order: Order;
  courierRole: 'RUNNER' | 'RIDER';
  onOpenVoiceModal: (order: Order) => void;
  className?: string;
  variant?: 'button' | 'full';
}

export function CourierVoiceButton({
  order,
  courierRole,
  onOpenVoiceModal,
  className = '',
  variant = 'full'
}: CourierVoiceButtonProps) {
  const hasNote = Boolean(order.courierDeliveryNote);

  if (variant === 'button' && !hasNote) {
    return (
      <button
        type="button"
        onClick={() => onOpenVoiceModal(order)}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-bold transition-all shadow-2xs active:scale-95 duration-150 cursor-pointer ${className}`}
        title="Dictate voice note via Speech Recognition"
      >
        <Mic className="w-3.5 h-3.5 text-indigo-600" />
        <span>Voice Note</span>
      </button>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {hasNote ? (
        <div className="p-3.5 bg-gradient-to-r from-indigo-50/90 via-blue-50/80 to-slate-50 border border-indigo-200/90 rounded-2xl text-xs space-y-1.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-indigo-900 font-bold text-[11px] uppercase tracking-wider">
              <span className="p-1 rounded-md bg-indigo-600 text-white shadow-2xs">
                <Mic className="w-3 h-3" />
              </span>
              <span>Courier Voice Note ({order.courierNoteAuthor || courierRole})</span>
            </div>

            <div className="flex items-center gap-2">
              {order.courierNoteUpdatedAt && (
                <span className="text-[10px] text-slate-500 font-mono">
                  {new Date(order.courierNoteUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              <button
                type="button"
                onClick={() => onOpenVoiceModal(order)}
                className="text-indigo-700 hover:text-indigo-950 font-bold flex items-center gap-1 text-[11px] hover:underline cursor-pointer"
              >
                <Edit2 className="w-3 h-3" />
                <span>Edit / Re-dictate</span>
              </button>
            </div>
          </div>

          <p className="text-slate-800 italic pl-1 leading-relaxed">
            "{order.courierDeliveryNote}"
          </p>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => onOpenVoiceModal(order)}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200/90 hover:border-indigo-400 text-indigo-800 rounded-xl text-xs font-bold transition-all shadow-2xs active:scale-95 duration-150 cursor-pointer"
          title="Dictate voice delivery note using speech recognition"
        >
          <div className="p-1 rounded-md bg-indigo-600 text-white">
            <Mic className="w-3.5 h-3.5" />
          </div>
          <span>Dictate Audio Delivery Note / Status Update</span>
        </button>
      )}
    </div>
  );
}

export default CourierVoiceButton;
