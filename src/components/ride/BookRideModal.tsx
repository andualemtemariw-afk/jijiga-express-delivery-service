import { useState } from 'react';
import { RideDetails, Order } from '../../types';
import {
  X,
  Navigation,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  LoaderCircle
} from 'lucide-react';

interface BookRideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBookRide: (order: Partial<Order>) => Promise<void> | void;
  customerProfile: {
    name: string;
    phone: string;
    city: string;
  };
}

export function BookRideModal({
  isOpen,
  onClose,
  onBookRide,
  customerProfile,
}: BookRideModalProps) {
  const selectedCity = 'Jijiga';
  const [vehicleType, setVehicleType] = useState<'MARHABA_TAXI' | 'MARHABA_MOTO'>('MARHABA_TAXI');
  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  if (!isOpen) return null;

  // Tariffs match validRideOrder() in firestore.rules. No route distance or ETA is fabricated.
  const tripPrice = vehicleType === 'MARHABA_TAXI' ? 283 : 136;

  const handleRequestRide = async () => {
    if (!pickup.trim() || !dropoff.trim()) {
      setSubmitError('Enter both a pickup point and a destination.');
      return;
    }
    if (pickup.trim().toLocaleLowerCase() === dropoff.trim().toLocaleLowerCase()) {
      setSubmitError('Pickup and destination must be different.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    const rideDetails: RideDetails = {
      vehicleType,
      pickupLocation: pickup.trim(),
      dropoffLocation: dropoff.trim(),
      city: selectedCity,
      rideStatus: 'REQUESTED',
    };

    const newOrder: Partial<Order> = {
      serviceType: 'RIDE',
      batchId: vehicleType === 'MARHABA_TAXI' ? 'ride-marhaba-taxi' : 'ride-marhaba-moto',
      batchName: (vehicleType === 'MARHABA_TAXI' ? 'Jijiga Express Taxi: ' : 'Jijiga Express Moto / Bajaj: ')
        + pickup.trim() + ' → ' + dropoff.trim(),
      mamilaId: 'm4',
      mamilaName: 'Jijiga Express Fleet Dispatch',
      mamilaLocation: 'Jijiga',
      price: tripPrice,
      quantity: 1,
      deliveryFee: 0,
      totalPrice: tripPrice,
      status: 'PENDING',
      paymentMethod: 'COD',
      paymentStatus: 'UNPAID',
      customerName: customerProfile.name,
      customerPhone: customerProfile.phone,
      customerCity: selectedCity,
      customerPlusCode: '',
      customerAddress: pickup.trim(),
      specialInstructions: 'Pickup: ' + pickup.trim() + '. Destination: ' + dropoff.trim()
        + '. Waiting for dispatcher assignment; no driver has been assigned yet.',
      rideDetails,
      createdAt: new Date(),
    };

    try {
      await onBookRide(newOrder);
      onClose();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Could not submit the ride request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-xl">
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Book Ride • Jijiga Express Delivery Service</h3>
              <p className="text-xs text-slate-400">On-demand Taxi & Moto in Jijiga</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSubmitting ? (
          <div className="p-10 flex flex-col items-center justify-center text-center space-y-4" role="status" aria-live="polite">
            <LoaderCircle className="w-10 h-10 text-blue-600 animate-spin" />
            <div>
              <h4 className="text-base font-bold text-slate-900">Saving your ride request…</h4>
              <p className="text-xs text-slate-500 max-w-xs mt-1">
                This does not mean a driver has been assigned. Dispatch must confirm an available driver.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-5 space-y-5">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <label className="text-xs font-bold text-slate-700 block mb-1">Service Area</label>
              <p className="text-sm font-semibold text-slate-900">Jijiga, Somali Region, Ethiopia</p>
              <p className="text-[11px] text-slate-500 mt-1">Ride requests are currently limited to Jijiga.</p>
            </div>

            {/* Vehicle Mode Tabs (Marhaba Taxi vs Marhaba Moto) */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">Select Vehicle Class</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setVehicleType('MARHABA_TAXI')}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    vehicleType === 'MARHABA_TAXI'
                      ? 'border-blue-600 bg-blue-50/70 shadow-xs ring-2 ring-blue-500/20'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">🚖</span>
                    <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                      Comfort 4-Seat
                    </span>
                  </div>
                  <div className="font-bold text-slate-900 text-sm mt-2">Jijiga Express Taxi</div>
                  <div className="text-[11px] text-slate-500">Air-conditioned Sedan</div>
                  <div className="font-mono font-bold text-blue-700 text-xs mt-1">~{tripPrice} ETB</div>
                </button>

                <button
                  type="button"
                  onClick={() => setVehicleType('MARHABA_MOTO')}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    vehicleType === 'MARHABA_MOTO'
                      ? 'border-emerald-600 bg-emerald-50/70 shadow-xs ring-2 ring-emerald-500/20'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">🛵</span>
                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                      Quick & Agile
                    </span>
                  </div>
                  <div className="font-bold text-slate-900 text-sm mt-2">Jijiga Express Moto / Bajaj</div>
                  <div className="text-[11px] text-slate-500">Fast city express ride</div>
                  <div className="font-mono font-bold text-emerald-700 text-xs mt-1">{tripPrice} ETB</div>
                </button>
              </div>
            </div>

            {/* Route Points */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Pickup Point
                </label>
                <input
                  type="text"
                  value={pickup}
                  onChange={(e) => setPickup(e.target.value)}
                  className="w-full text-xs p-2 mt-1 rounded-lg border border-slate-300 bg-white"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  Destination Point
                </label>
                <input
                  type="text"
                  value={dropoff}
                  onChange={(e) => setDropoff(e.target.value)}
                  className="w-full text-xs p-2 mt-1 rounded-lg border border-slate-300 bg-white"
                />
              </div>

              <p className="text-[11px] text-slate-500 pt-1">
                Live route distance and arrival-time estimates are not available in this booking flow. Dispatch will confirm availability separately.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 p-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Payment: Cash on delivery (COD)
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Online wallet checkout is currently disabled. Pay only after the ride is completed and the fare is confirmed.
              </p>
            </div>

            {/* Confirm button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleRequestRide}
                disabled={isSubmitting}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <span>Request {vehicleType === 'MARHABA_TAXI' ? 'Jijiga Express Taxi' : 'Jijiga Express Moto'}</span>
                <span className="text-emerald-400 font-mono font-bold">
                  ({tripPrice} ETB)
                </span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>
              <p className="text-[11px] text-slate-500 text-center mt-2 font-medium">
                Your request will be saved as pending until dispatch assigns a real driver.
              </p>
              {submitError && (
                <p role="alert" className="text-[11px] text-rose-700 text-center mt-2 flex items-center justify-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {submitError}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
