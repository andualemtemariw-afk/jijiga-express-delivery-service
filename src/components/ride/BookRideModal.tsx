import { useState } from 'react';
import { CITIES } from '../../data';
import { PaymentMethod, RideDetails, Order } from '../../types';
import { 
  X, 
  Bike, 
  MapPin, 
  Navigation, 
  CheckCircle2, 
  Star, 
  ShieldCheck, 
  Radio, 
  Phone, 
  Clock,
  ArrowRight,
  Sparkles
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
  const [selectedCity, setSelectedCity] = useState(customerProfile.city || 'Hargeisa');
  const [vehicleType, setVehicleType] = useState<'MARHABA_TAXI' | 'MARHABA_MOTO'>('MARHABA_TAXI');
  const [pickup, setPickup] = useState(
    selectedCity === 'Hargeisa' ? 'Egal International Airport Terminal 1' : 'Kebele 04, Central Plaza'
  );
  const [dropoff, setDropoff] = useState(
    selectedCity === 'Hargeisa' ? 'Mansoor Hotel & Conference Hall' : 'Taiwan Commercial Market'
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    selectedCity === 'Hargeisa' ? 'ZAAD' : 'TELEBIRR'
  );
  const [isSearching, setIsSearching] = useState(false);
  const [searchStep, setSearchStep] = useState(0);

  if (!isOpen) return null;

  // Rate calculations
  const distanceKm = vehicleType === 'MARHABA_TAXI' ? 6.8 : 5.4;
  const baseFare = vehicleType === 'MARHABA_TAXI' ? 120 : 60;
  const perKmRate = vehicleType === 'MARHABA_TAXI' ? 24 : 14;
  const tripPrice = Math.round(baseFare + distanceKm * perKmRate);
  const etaMinutes = Math.round(distanceKm * 2.2 + 3);

  const handleStartSearchAndBook = () => {
    setIsSearching(true);
    setSearchStep(1);

    setTimeout(() => {
      setSearchStep(2);
      setTimeout(() => {
        const driverName = vehicleType === 'MARHABA_TAXI' ? 'Abdirahman Gulaid' : 'Kenenisa Bedada';
        const vehicleModel = vehicleType === 'MARHABA_TAXI' ? 'Toyota Corolla Sedan (Silver)' : 'TVS King Bajaj 3-Wheeler (Blue)';
        const licensePlate = selectedCity === 'Hargeisa' ? 'SL-88492' : 'ET-AA-91823';

        const rideDetails: RideDetails = {
          vehicleType,
          pickupLocation: pickup,
          dropoffLocation: dropoff,
          city: selectedCity,
          driverName,
          vehicleModel,
          licensePlate,
          driverRating: 4.9,
          driverPhone: '+252 63 998 7766',
          tripDistanceKm: distanceKm,
          tripDurationMins: etaMinutes,
          rideStatus: 'DRIVER_ASSIGNED',
        };

        const newOrder: Partial<Order> = {
          id: 'ord-ride-' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36),
          serviceType: 'RIDE',
          batchId: 'ride-' + vehicleType.toLowerCase(),
          batchName: `${vehicleType === 'MARHABA_TAXI' ? 'Jijiga Express Taxi' : 'Jijiga Express Moto / Bajaj'}: ${pickup.split(',')[0]} → ${dropoff.split(',')[0]}`,
          mamilaId: 'm4',
          mamilaName: 'Jijiga Express Delivery Service Fleet Dispatch',
          mamilaLocation: `${selectedCity} Fleet Hub`,
          price: tripPrice,
          quantity: 1,
          deliveryFee: 0,
          totalPrice: tripPrice,
          status: 'PENDING',
          paymentMethod,
          paymentStatus: paymentMethod === 'COD' ? 'UNPAID' : 'PAYMENT_PENDING',
          customerId: (customerProfile as any)?.uid || (customerProfile as any)?.id || 'c1',
          customerName: customerProfile.name,
          customerPhone: customerProfile.phone,
          customerCity: selectedCity,
          customerPlusCode: selectedCity === 'Hargeisa' ? 'H654+7G Hargeisa' : '8F2P+5H Jijiga',
          customerAddress: dropoff,
          specialInstructions: `Passenger pickup at ${pickup}. Please call upon arrival.`,
          rideDetails,
          distanceKm,
          etaMinutes: 4, // 4 mins to arrive at pickup
          createdAt: new Date(),
        };

        onBookRide(newOrder);
        setIsSearching(false);
        onClose();
      }, 1500);
    }, 1500);
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
              <p className="text-xs text-slate-400">On-demand Taxi & Moto in {selectedCity} • Fast Dispatch</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSearching ? (
          <div className="p-10 flex flex-col items-center justify-center text-center space-y-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center animate-ping" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg">
                  <Radio className="w-6 h-6 animate-pulse" />
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-base font-bold text-slate-900">
                {searchStep === 1 ? 'Locating Nearby Drivers...' : 'Driver Found! Connecting...'}
              </h4>
              <p className="text-xs text-slate-500 max-w-xs mt-1">
                Scanning verified {vehicleType === 'MARHABA_TAXI' ? 'Jijiga Express Taxis' : 'Jijiga Express Motos'} in {selectedCity}.
              </p>
            </div>
          </div>
        ) : (
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
                    setPaymentMethod('ZAAD');
                  } else {
                    setPickup('Kebele 04, Central Plaza');
                    setDropoff('Taiwan Commercial Market');
                    setPaymentMethod('TELEBIRR');
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
                  <div className="font-mono font-bold text-emerald-700 text-xs mt-1">~{Math.round(tripPrice * 0.65)} ETB</div>
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

            {/* Payment Method */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Payment Method</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'ZAAD', label: 'Zaad' },
                  { id: 'TELEBIRR', label: 'Telebirr' },
                  { id: 'SAHAL', label: 'Sahal' },
                  { id: 'EBIRR', label: 'eBIRR' },
                  { id: 'COOP_PAY', label: 'Coop Pay' },
                  { id: 'COD', label: 'Cash' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id as PaymentMethod)}
                    className={`py-2 px-2.5 rounded-lg border text-xs font-semibold text-center cursor-pointer transition-colors ${
                      paymentMethod === m.id
                        ? 'border-blue-600 bg-blue-50 text-blue-800'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Confirm button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleStartSearchAndBook}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <span>Request {vehicleType === 'MARHABA_TAXI' ? 'Jijiga Express Taxi' : 'Jijiga Express Moto'}</span>
                <span className="text-emerald-400 font-mono font-bold">
                  ({vehicleType === 'MARHABA_TAXI' ? tripPrice : Math.round(tripPrice * 0.65)} ETB)
                </span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>
              <p className="text-[11px] text-slate-500 text-center mt-2 font-medium">
                To request custom delivery features, ask support.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
