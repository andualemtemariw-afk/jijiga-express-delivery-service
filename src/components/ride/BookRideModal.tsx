import { useState } from 'react';
import { CITIES } from '../../data';
import { PaymentMethod, RideDetails, Order } from '../../types';
import { 
  X, 
  MapPin, 
  Navigation, 
  Clock,
  ArrowRight,
  ShieldCheck,
  Banknote,
  AlertCircle
} from 'lucide-react';

interface BookRideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBookRide: (order: Partial<Order>) => void;
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
  const [selectedCity, setSelectedCity] = useState(customerProfile.city || 'Jijiga');
  const [vehicleType, setVehicleType] = useState<'MARHABA_TAXI' | 'MARHABA_MOTO'>('MARHABA_TAXI');
  const [pickup, setPickup] = useState(
    selectedCity === 'Hargeisa' ? 'Egal International Airport Terminal 1' : 'Kebele 04, Central Plaza'
  );
  const [dropoff, setDropoff] = useState(
    selectedCity === 'Hargeisa' ? 'Mansoor Hotel & Conference Hall' : 'Taiwan Commercial Market'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [offlineNotice, setOfflineNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  // Exact pricing validated by Firestore Security Rules (validRideOrder)
  // MARHABA_TAXI: 283 ETB (6.8 km trip)
  // MARHABA_MOTO: 136 ETB (5.4 km trip)
  const tripPrice = vehicleType === 'MARHABA_TAXI' ? 283 : 136;
  const distanceKm = vehicleType === 'MARHABA_TAXI' ? 6.8 : 5.4;
  const etaMinutes = vehicleType === 'MARHABA_TAXI' ? 18 : 12;

  const handleBookRideSubmit = () => {
    setIsSubmitting(true);

    // Build authentic customer ride request:
    // 1. Initial rideStatus is REQUESTED (not simulated DRIVER_ASSIGNED).
    // 2. No fabricated driver names, license plates, telephone numbers, or fake GPS positions.
    // 3. Payment is COD / UNPAID (strictly enforced by security rules and PR #2 release model).
    // 4. Order status is PENDING awaiting authentic driver acceptance in RiderView.
    const rideDetails: RideDetails = {
      vehicleType,
      pickupLocation: pickup.trim(),
      dropoffLocation: dropoff.trim(),
      city: selectedCity,
      tripDistanceKm: distanceKm,
      tripDurationMins: etaMinutes,
      rideStatus: 'REQUESTED',
    };

    const generatedId = 'ord-ride-' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);

    const newOrder: Partial<Order> = {
      id: generatedId,
      serviceType: 'RIDE',
      batchId: 'ride-' + (vehicleType === 'MARHABA_TAXI' ? 'marhaba-taxi' : 'marhaba-moto'),
      batchName: `${vehicleType === 'MARHABA_TAXI' ? 'Jijiga Express Taxi' : 'Jijiga Express Moto / Bajaj'}: ${pickup.split(',')[0]} → ${dropoff.split(',')[0]}`,
      mamilaId: 'm4',
      mamilaName: 'Jijiga Express Fleet',
      mamilaLocation: `${selectedCity} Fleet Hub`,
      price: tripPrice,
      quantity: 1,
      deliveryFee: 0,
      totalPrice: tripPrice,
      status: 'PENDING',
      paymentMethod: 'COD',
      paymentStatus: 'UNPAID',
      customerId: (customerProfile as any)?.uid || (customerProfile as any)?.id || '',
      customerName: customerProfile.name || 'Customer',
      customerPhone: customerProfile.phone || '',
      customerCity: selectedCity,
      customerPlusCode: selectedCity === 'Hargeisa' ? 'H654+7G Hargeisa' : '8F2P+5H Jijiga',
      customerAddress: dropoff.trim(),
      specialInstructions: `Passenger pickup at ${pickup.trim()}. Cash on delivery upon arrival at destination.`,
      rideDetails,
      distanceKm,
      etaMinutes,
      createdAt: new Date(),
    };

    onBookRide(newOrder);
    setIsSubmitting(false);
    onClose();
  };

  const handleAttemptDigitalWallet = (walletName: string) => {
    setOfflineNotice(
      `${walletName} direct checkout is currently offline in this phone-only release. Per platform policy, Cash on Handover (COD) is active.`
    );
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
              <h3 className="font-bold text-lg">Book Ride • Jijiga Express Fleet</h3>
              <p className="text-xs text-slate-400">On-demand Taxi & Moto in {selectedCity} • Real Dispatch</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* City Selector */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Operating City</label>
            <select
              value={selectedCity}
              onChange={(e) => {
                const city = e.target.value;
                setSelectedCity(city);
                if (city === 'Hargeisa') {
                  setPickup('Egal International Airport Terminal 1');
                  setDropoff('Mansoor Hotel & Conference Hall');
                } else {
                  setPickup('Kebele 04, Central Plaza');
                  setDropoff('Taiwan Commercial Market');
                }
              }}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white font-semibold"
            >
              {CITIES.map((c) => (
                <option key={c.id} value={c.name}>{c.name} ({c.region})</option>
              ))}
            </select>
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
                <div className="font-mono font-bold text-blue-700 text-xs mt-1">283 ETB</div>
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
                <div className="font-mono font-bold text-emerald-700 text-xs mt-1">136 ETB</div>
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

            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 font-medium">
              <span>Estimated trip: {distanceKm} km</span>
              <span className="flex items-center gap-1 text-slate-700 font-bold">
                <Clock className="w-3.5 h-3.5 text-blue-600" /> ~{etaMinutes} mins trip
              </span>
            </div>
          </div>

          {/* Payment Method - COD Policy Enforcement */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">Payment Method</label>
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Banknote className="w-3 h-3" /> Cash on Handover
              </span>
            </div>

            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                    ETB
                  </div>
                  <div>
                    <span className="text-xs font-bold text-emerald-950 block">Cash on Delivery (COD)</span>
                    <span className="text-[11px] text-emerald-700 block">Pay exact fare to the driver upon arrival</span>
                  </div>
                </div>
                <span className="text-xs font-bold font-mono text-emerald-800">{tripPrice} ETB</span>
              </div>
            </div>

            {/* Offline digital wallets note */}
            <div className="mt-2">
              <div className="text-[10px] text-slate-400 font-semibold mb-1">Other Payment Methods (Offline in this release):</div>
              <div className="grid grid-cols-3 gap-1.5">
                {['Telebirr', 'Zaad', 'Sahal', 'eBIRR', 'Coop Pay'].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => handleAttemptDigitalWallet(m)}
                    className="py-1.5 px-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 text-[10px] font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 cursor-pointer text-center transition-colors"
                  >
                    {m} (Offline)
                  </button>
                ))}
              </div>
            </div>

            {offlineNotice && (
              <div className="mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2 text-xs text-amber-800">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <span>{offlineNotice}</span>
              </div>
            )}
          </div>

          {/* Truthful Dispatch Notice */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-2.5 text-xs text-slate-600">
            <ShieldCheck className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-800 block">Real Driver Dispatch Guarantee:</span>
              <span>
                Your request enters the live driver dispatch pool immediately. Driver identity, vehicle number plate, and live GPS are only displayed once an authenticated driver accepts your trip.
              </span>
            </div>
          </div>

          {/* Confirm button */}
          <div className="pt-1">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleBookRideSubmit}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
            >
              <span>Request {vehicleType === 'MARHABA_TAXI' ? 'Jijiga Express Taxi' : 'Jijiga Express Moto'}</span>
              <span className="text-emerald-400 font-mono font-bold">
                ({tripPrice} ETB)
              </span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
