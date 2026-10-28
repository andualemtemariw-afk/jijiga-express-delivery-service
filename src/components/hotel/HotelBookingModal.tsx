import { useState } from 'react';
import { 
  X, 
  Hotel as HotelIcon, 
  MapPin, 
  Star, 
  Wifi, 
  Tv, 
  ShieldCheck, 
  Calendar, 
  Users, 
  CheckCircle2, 
  Building2, 
  Sparkles,
  Phone,
  Clock
} from 'lucide-react';
import { HOTELS_DATA } from '../../data';
import { Hotel, RoomType, HotelReservation } from '../../types';

interface HotelBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerProfile: {
    name: string;
    phone: string;
    city: string;
  };
  onConfirmReservation?: (reservation: HotelReservation) => void;
}

export function HotelBookingModal({
  isOpen,
  onClose,
  customerProfile,
  onConfirmReservation,
}: HotelBookingModalProps) {
  const [selectedCity, setSelectedCity] = useState(customerProfile.city || 'Jijiga');
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<RoomType | null>(null);
  const [checkInDate, setCheckInDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [nightsCount, setNightsCount] = useState(1);
  const [guestName, setGuestName] = useState(customerProfile.name || '');
  const [guestPhone, setGuestPhone] = useState(customerProfile.phone || '');
  const [reservationSuccess, setReservationSuccess] = useState<HotelReservation | null>(null);

  if (!isOpen) return null;

  const cityHotels = HOTELS_DATA.filter(
    h => h.city.toLowerCase() === selectedCity.toLowerCase()
  );

  const handleBookRoom = (hotel: Hotel, room: RoomType) => {
    setSelectedHotel(hotel);
    setSelectedRoom(room);
  };

  const handleConfirmBooking = () => {
    if (!selectedHotel || !selectedRoom) return;
    if (!guestName.trim() || !guestPhone.trim()) return;

    const reservationId = 'htl-res-' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    const checkOut = new Date(checkInDate);
    checkOut.setDate(checkOut.getDate() + nightsCount);

    const reservation: HotelReservation = {
      id: reservationId,
      hotelId: selectedHotel.id,
      hotelName: selectedHotel.name,
      city: selectedHotel.city,
      roomTypeId: selectedRoom.id,
      roomTypeName: selectedRoom.name,
      guestName: guestName.trim(),
      guestPhone: guestPhone.trim(),
      checkInDate,
      checkOutDate: checkOut.toISOString().split('T')[0],
      nightsCount,
      roomsCount: 1,
      pricePerNight: selectedRoom.pricePerNight,
      totalPrice: selectedRoom.pricePerNight * nightsCount,
      status: 'CONFIRMED',
      paymentMethod: 'COD',
      paymentStatus: 'UNPAID',
      createdAt: new Date().toISOString(),
    };

    if (onConfirmReservation) {
      onConfirmReservation(reservation);
    }
    setReservationSuccess(reservation);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              <HotelIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg">Jijiga Express Hotel Booking</h3>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Verified Rooms
                </span>
              </div>
              <p className="text-xs text-indigo-200/80">Direct verified hotel suites & rooms with check-in payment</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-indigo-200 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success View */}
        {reservationSuccess ? (
          <div className="p-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <h4 className="text-xl font-black text-slate-900">Hotel Reservation Confirmed!</h4>
            <div className="max-w-md mx-auto p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-2 text-xs">
              <div className="flex justify-between font-bold text-slate-900">
                <span>{reservationSuccess.hotelName}</span>
                <span className="text-emerald-700">{reservationSuccess.totalPrice} ETB Total</span>
              </div>
              <div className="text-slate-600">Room: {reservationSuccess.roomTypeName}</div>
              <div className="text-slate-600">Check-in: {reservationSuccess.checkInDate} • {reservationSuccess.nightsCount} Night(s)</div>
              <div className="text-slate-600">Guest: {reservationSuccess.guestName} ({reservationSuccess.guestPhone})</div>
              <div className="text-[11px] text-amber-700 font-semibold pt-1">
                Payment due upon hotel check-in at front desk (Cash / Telebirr).
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setReservationSuccess(null);
                setSelectedHotel(null);
                setSelectedRoom(null);
                onClose();
              }}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-500"
            >
              Done
            </button>
          </div>
        ) : selectedRoom && selectedHotel ? (
          /* Room Checkout Form */
          <div className="p-5 flex-1 overflow-y-auto space-y-4">
            <button
              type="button"
              onClick={() => setSelectedRoom(null)}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1"
            >
              ← Back to hotel rooms
            </button>

            <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100">
              <h4 className="font-bold text-sm text-indigo-950">{selectedHotel.name}</h4>
              <p className="text-xs text-indigo-800/80">{selectedRoom.name} • {selectedRoom.bedType}</p>
              <div className="mt-2 text-xs font-mono font-bold text-indigo-900">
                {selectedRoom.pricePerNight} ETB / night
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 mb-1 block">Check-in Date</label>
                <input
                  type="date"
                  value={checkInDate}
                  onChange={(e) => setCheckInDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 font-medium"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 mb-1 block">Nights Count</label>
                <select
                  value={nightsCount}
                  onChange={(e) => setNightsCount(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 font-medium"
                >
                  <option value={1}>1 Night</option>
                  <option value={2}>2 Nights</option>
                  <option value={3}>3 Nights</option>
                  <option value={5}>5 Nights</option>
                  <option value={7}>7 Nights</option>
                </select>
              </div>
              <div>
                <label className="font-bold text-slate-700 mb-1 block">Primary Guest Name</label>
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Full name as on ID"
                  className="w-full p-2.5 rounded-xl border border-slate-200 outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 mb-1 block">Contact Telephone Number</label>
                <input
                  type="tel"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  placeholder="+251 9... or +252 6..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 font-mono"
                />
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Room Rate ({nightsCount} night{nightsCount > 1 ? 's' : ''})</span>
                <span className="font-mono font-bold text-slate-900">{selectedRoom.pricePerNight * nightsCount} ETB</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Reservation Fee</span>
                <span className="text-emerald-600 font-bold">FREE (Complimentary)</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between font-black text-sm text-slate-900">
                <span>Total Due at Check-in</span>
                <span className="font-mono text-indigo-700">{selectedRoom.pricePerNight * nightsCount} ETB</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleConfirmBooking}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm shadow-sm transition"
            >
              Confirm Room Reservation
            </button>
          </div>
        ) : (
          /* Hotels Discovery View */
          <div className="p-5 flex-1 overflow-y-auto space-y-4">
            {/* City Selector */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {['Jijiga', 'Hargeisa', 'Dire Dawa', 'Harar'].map(city => (
                <button
                  key={city}
                  type="button"
                  onClick={() => setSelectedCity(city)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                    selectedCity.toLowerCase() === city.toLowerCase()
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {city}
                </button>
              ))}
            </div>

            {/* Hotels List */}
            <div className="space-y-4">
              {cityHotels.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No verified partner hotels listed in {selectedCity} yet.
                </div>
              ) : (
                cityHotels.map(hotel => (
                  <div
                    key={hotel.id}
                    className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs hover:border-indigo-300 transition"
                  >
                    <div className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-extrabold text-sm text-slate-900">{hotel.name}</h4>
                            {hotel.featured && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-200">
                                VIP Partner
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            <span>{hotel.location}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 text-amber-800 text-xs font-bold border border-amber-200">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span>{hotel.rating}</span>
                        </div>
                      </div>

                      {/* Amenities Pills */}
                      <div className="flex flex-wrap gap-1.5">
                        {hotel.amenities.slice(0, 4).map((amenity, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700"
                          >
                            {amenity}
                          </span>
                        ))}
                      </div>

                      {/* Available Room Types */}
                      <div className="pt-2 border-t border-slate-100 space-y-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Available Room Options
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {hotel.roomTypes.map(room => (
                            <div
                              key={room.id}
                              className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between gap-2"
                            >
                              <div>
                                <div className="text-xs font-bold text-slate-900">{room.name}</div>
                                <div className="text-[11px] font-mono text-indigo-700 font-bold">
                                  {room.pricePerNight} ETB <span className="text-slate-400 font-normal">/ night</span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleBookRoom(hotel, room)}
                                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition"
                              >
                                Reserve
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
