import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, 
  MapPin, 
  Calendar, 
  Users, 
  Star, 
  CheckCircle2, 
  X, 
  Phone, 
  CreditCard, 
  Sparkles, 
  ShieldCheck, 
  ArrowRight,
  Wifi,
  Coffee,
  Car
} from 'lucide-react';
import { Order, PaymentMethod, AppUserProfile } from '../../types';
import { REGIONAL_HOTELS, RegionalHotel } from '../../data';

interface BookHotelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBookHotel: (order: Partial<Order>) => void;
  currentUser?: any;
  customerProfile?: AppUserProfile | null;
}

export function BookHotelModal({
  isOpen,
  onClose,
  onBookHotel,
  currentUser,
  customerProfile,
}: BookHotelModalProps) {
  const [selectedHotel, setSelectedHotel] = useState<RegionalHotel>(REGIONAL_HOTELS[0]);
  const [selectedRoomIndex, setSelectedRoomIndex] = useState(0);
  
  // Dates: default checkIn tomorrow, checkOut 2 days later
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const dayAfter = new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0];
  
  const [checkInDate, setCheckInDate] = useState(tomorrow);
  const [checkOutDate, setCheckOutDate] = useState(dayAfter);
  const [guests, setGuests] = useState(2);
  const [guestName, setGuestName] = useState(customerProfile?.displayName || currentUser?.displayName || 'VIP Guest');
  const [guestPhone, setGuestPhone] = useState(customerProfile?.phone || '+251 91 123 4567');
  const [specialRequests, setSpecialRequests] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('COD');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const selectedRoom = selectedHotel.roomTypes[selectedRoomIndex] || selectedHotel.roomTypes[0];

  // Calculate nights
  const d1 = new Date(checkInDate);
  const d2 = new Date(checkOutDate);
  const diffTime = Math.max(d2.getTime() - d1.getTime(), 86400000);
  const nights = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)));
  const totalStayAmount = selectedRoom.pricePerNight * nights;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const bookingRef = `JJG-HTL-${Math.floor(1000 + Math.random() * 9000)}`;

    const orderPayload: Partial<Order> = {
      serviceType: 'HOTEL',
      batchId: `hotel_${selectedHotel.id}`,
      batchName: `${selectedHotel.name} — ${selectedRoom.type}`,
      mamilaId: selectedHotel.id,
      mamilaName: selectedHotel.name,
      mamilaLocation: `${selectedHotel.location}, ${selectedHotel.city}`,
      price: totalStayAmount,
      quantity: nights,
      deliveryFee: 0,
      totalPrice: totalStayAmount,
      paymentMethod,
      paymentStatus: 'UNPAID',
      hotelDetails: {
        hotelId: selectedHotel.id,
        hotelName: selectedHotel.name,
        hotelCity: selectedHotel.city,
        roomType: selectedRoom.type,
        checkInDate,
        checkOutDate,
        nights,
        guests,
        guestName: guestName.trim() || 'Guest',
        guestPhone: guestPhone.trim(),
        specialRequests: specialRequests.trim() || undefined,
        bookingReference: bookingRef,
        dailyRate: selectedRoom.pricePerNight,
        totalAmount: totalStayAmount,
      },
      specialInstructions: `[HOTEL_RESERVATION] ${selectedHotel.name} (${selectedRoom.type}) | Check-in: ${checkInDate} to ${checkOutDate} (${nights} nights) | ${guests} Guests | Ref: ${bookingRef} | Guest: ${guestName} (${guestPhone}) ${specialRequests ? '· Notes: ' + specialRequests : ''}`,
    };

    try {
      await onBookHotel(orderPayload);
      setBookingSuccess(bookingRef);
      setTimeout(() => {
        setBookingSuccess(null);
        onClose();
      }, 2500);
    } catch (err) {
      console.error('Hotel booking error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-indigo-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold">Regional Hotel Reservations</h2>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200">
                  Instant Confirmation
                </span>
              </div>
              <p className="text-xs text-indigo-200/80">
                Premium stays across Jijiga, Hargeisa, Harar, & Dire Dawa
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {bookingSuccess ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Reservation Confirmed!</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto">
              Your room at <strong className="text-slate-900 dark:text-white">{selectedHotel.name}</strong> is booked.
              Booking Reference: <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{bookingSuccess}</span>.
            </p>
            <p className="text-xs text-slate-500">
              A voucher has been saved to your active orders. Pay on arrival or via mobile money.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Step 1: Hotel Selector Grid */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                1. Select Verified Regional Hotel
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {REGIONAL_HOTELS.map((hotel) => (
                  <div
                    key={hotel.id}
                    onClick={() => {
                      setSelectedHotel(hotel);
                      setSelectedRoomIndex(0);
                    }}
                    className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between ${
                      selectedHotel.id === hotel.id
                        ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white leading-tight">
                          {hotel.name}
                        </h4>
                        <div className="flex items-center gap-1 text-amber-500 text-xs shrink-0 font-bold">
                          <Star className="w-3.5 h-3.5 fill-amber-400" />
                          <span>{hotel.rating}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-2">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{hotel.city} · {hotel.location}</span>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-400">From</span>
                      <span className="font-bold text-indigo-700 dark:text-indigo-400">
                        {hotel.roomTypes[0].pricePerNight} ETB / night
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Step 2: Room Type & Amenities for Selected Hotel */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{selectedHotel.name}</span>
                    <span className="text-xs text-slate-500">({selectedHotel.city})</span>
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 flex-wrap">
                    {selectedHotel.amenities.slice(0, 3).map((amenity, idx) => (
                      <span key={idx} className="flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        <span>{amenity}</span>
                        {idx < 2 && <span aria-hidden="true">·</span>}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                  Choose Room Category:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {selectedHotel.roomTypes.map((room, idx) => (
                    <button
                      type="button"
                      key={room.type}
                      onClick={() => setSelectedRoomIndex(idx)}
                      className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                        selectedRoomIndex === idx
                          ? 'border-indigo-600 bg-white dark:bg-slate-900 shadow-xs ring-1 ring-indigo-500'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-100/60 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="font-bold text-xs text-slate-900 dark:text-white">{room.type}</div>
                      <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{room.description}</div>
                      <div className="mt-2 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                        {room.pricePerNight} ETB <span className="text-[10px] font-normal text-slate-400">/ night</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Step 3: Dates, Guests & Guest Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Check-In Date
                </label>
                <input
                  type="date"
                  value={checkInDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setCheckInDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Check-Out Date
                </label>
                <input
                  type="date"
                  value={checkOutDate}
                  min={checkInDate}
                  onChange={(e) => setCheckOutDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Guests Count
                </label>
                <select
                  value={guests}
                  onChange={(e) => setGuests(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  <option value={1}>1 Guest (Solo)</option>
                  <option value={2}>2 Guests (Couple / Pair)</option>
                  <option value={3}>3 Guests</option>
                  <option value={4}>4 Guests (Family / Delegation)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="COD">Pay on Arrival (Cash / Hotel Reception)</option>
                  <option value="TELEBIRR">Telebirr Mobile Money</option>
                  <option value="CBE_BIRR">CBE Birr Express</option>
                  <option value="ZAAD">Zaad Service (Telesom)</option>
                  <option value="E_DAHAB">E-Dahab (Somtel)</option>
                </select>
              </div>
            </div>

            {/* Guest Contact Details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Primary Guest Name
                </label>
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Full name as on ID"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  placeholder="e.g. +251 91 234 5678"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Special Notes / Requests (Optional)
                </label>
                <input
                  type="text"
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  placeholder="e.g. Late airport arrival, quiet high floor"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Price Summary & Submit Bar */}
            <div className="p-4 bg-indigo-50/80 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="text-xs text-indigo-900 dark:text-indigo-200">
                  <span>{selectedRoom.type}</span>
                  <span className="mx-1.5" aria-hidden="true">·</span>
                  <span>{nights} {nights === 1 ? 'Night' : 'Nights'}</span>
                  <span className="mx-1.5" aria-hidden="true">·</span>
                  <span>{guests} {guests === 1 ? 'Guest' : 'Guests'}</span>
                </div>
                <div className="text-lg font-black text-indigo-950 dark:text-white mt-0.5">
                  Total: {totalStayAmount.toLocaleString()} ETB
                  <span className="text-xs font-normal text-slate-500 ml-1.5">
                    ({selectedRoom.pricePerNight} ETB × {nights})
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-1/2 sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-1/2 sm:w-auto px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>Confirming...</span>
                  ) : (
                    <>
                      <span>Confirm Reservation</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}
