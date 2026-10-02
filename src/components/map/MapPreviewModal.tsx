import { Order } from '../../types';
import { OrderMapPreview } from './OrderMapPreview';
import { X, Navigation, Phone, MapPin, Store, Bike, ShieldCheck } from 'lucide-react';

interface MapPreviewModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
}

export function MapPreviewModal({ order, isOpen, onClose }: MapPreviewModalProps) {
  if (!isOpen || !order) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-base sm:text-lg">
                  Order Dispatch Map Preview
                </h3>
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                  #{order.id}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Batch: <span className="font-semibold text-slate-700">{order.batchName}</span> · {order.customerCity || 'Jijiga'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close map preview"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Interactive Map Preview */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          <OrderMapPreview 
            order={order} 
            heightClass="h-[440px] sm:h-[480px]" 
            showControls={true}
          />

          {/* Quick Route Context Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Pickup Mamila
              </span>
              <div className="flex items-center gap-2 mt-1">
                <Store className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span className="font-bold text-slate-900 truncate">{order.mamilaName}</span>
              </div>
              <p className="text-slate-500 text-[11px] truncate mt-0.5">{order.mamilaLocation}</p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Doorstep Dropoff
              </span>
              <div className="flex items-center gap-2 mt-1">
                <MapPin className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span className="font-bold text-slate-900 truncate">{order.customerName}</span>
              </div>
              <p className="text-slate-500 text-[11px] truncate mt-0.5 font-mono">{order.customerPlusCode}</p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Assigned Personnel
              </span>
              <div className="flex items-center gap-2 mt-1">
                <Bike className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span className="font-bold text-slate-900 truncate">
                  {order.riderName || order.runnerName || 'Assigned Courier'}
                </span>
              </div>
              <p className="text-slate-500 text-[11px] truncate mt-0.5 flex items-center gap-1 font-mono">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                {order.runnerTagId || 'Verified Transit'}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Powered by Google Maps Platform • Real-time telemetry simulation
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Close Map Preview
          </button>
        </div>
      </div>
    </div>
  );
}
