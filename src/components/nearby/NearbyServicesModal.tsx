import { useState, useMemo } from 'react';
import { 
  X, 
  Search, 
  MapPin, 
  Phone, 
  MessageCircle, 
  ShieldCheck, 
  Clock, 
  Star, 
  CheckCircle2, 
  AlertTriangle,
  Zap,
  Droplets,
  Wrench,
  Car,
  HeartPulse,
  Flame,
  Send,
  Navigation,
  Compass,
  ChevronRight,
  ArrowRight,
  Info
} from 'lucide-react';
import { NearbyServiceProvider, NearbyServiceCategory, PaymentMethod, Order } from '../../types';
import { NEARBY_SERVICES_PROVIDERS, CITIES } from '../../data';
import { calculateDistanceKm, DEFAULT_CUSTOMER_COORDINATES, CITY_COORDINATES } from '../../utils/geo';

interface NearbyServicesModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerProfile: {
    name: string;
    phone: string;
    city: string;
    address?: string;
    plusCode?: string;
    coordinates?: { lat: number; lng: number };
  };
  onConfirmOrder: (order: Partial<Order>) => void;
}

const CATEGORIES: { id: 'ALL' | NearbyServiceCategory; label: string; icon: any }[] = [
  { id: 'ALL', label: 'All Services', icon: Compass },
  { id: 'WATER_TANKER', label: 'Water Tanker & Refill', icon: Droplets },
  { id: 'ELECTRIC_SOLAR', label: 'Solar & Electrician', icon: Zap },
  { id: 'PLUMBING', label: 'Plumbing & Pumps', icon: Wrench },
  { id: 'ROADSIDE_RESCUE', label: 'Roadside & Bajaj', icon: Car },
  { id: 'GAS_REFILL', label: 'Cooking Gas (Butane)', icon: Flame },
  { id: 'EMERGENCY_PHARMACY', label: 'Pharmacy & Medical', icon: HeartPulse },
  { id: 'ERRAND_RUNNER', label: 'Errand Runner (Ergo)', icon: Navigation },
];

export function NearbyServicesModal({
  isOpen,
  onClose,
  customerProfile,
  onConfirmOrder,
}: NearbyServicesModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | NearbyServiceCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [maxDistanceKm, setMaxDistanceKm] = useState<number>(20);
  const [activeCity, setActiveCity] = useState(customerProfile.city || 'Jijiga');
  
  // Booking Drawer State
  const [bookingProvider, setBookingProvider] = useState<NearbyServiceProvider | null>(null);
  const [selectedService, setSelectedService] = useState<string>('');
  const [urgency, setUrgency] = useState<'STANDARD' | 'URGENT_EMERGENCY'>('STANDARD');
  const [landmark, setLandmark] = useState(customerProfile.address || customerProfile.plusCode || 'Taiwan Market Area, Jijiga');
  const [issueDescription, setIssueDescription] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('TELEBIRR');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Customer Coordinates
  const currentCoords = useMemo(() => {
    if (customerProfile.coordinates) return customerProfile.coordinates;
    const normalizedKey = Object.keys(CITY_COORDINATES).find(
      k => k.toLowerCase() === activeCity.toLowerCase()
    );
    if (normalizedKey && CITY_COORDINATES[normalizedKey]) {
      return CITY_COORDINATES[normalizedKey];
    }
    return DEFAULT_CUSTOMER_COORDINATES;
  }, [customerProfile.coordinates, activeCity]);

  // Compute distances and sort
  const providersWithDistance = useMemo(() => {
    return NEARBY_SERVICES_PROVIDERS.map(p => {
      const distance = calculateDistanceKm(currentCoords, p.coordinates);
      return {
        ...p,
        calculatedDistanceKm: distance,
      };
    });
  }, [currentCoords]);

  // Filtered providers
  const filteredProviders = useMemo(() => {
    return providersWithDistance
      .filter(p => {
        const matchesCategory = selectedCategory === 'ALL' || p.category === selectedCategory;
        const matchesSearch = 
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.servicesOffered.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesDistance = p.calculatedDistanceKm <= maxDistanceKm;
        return matchesCategory && matchesSearch && matchesDistance;
      })
      .sort((a, b) => a.calculatedDistanceKm - b.calculatedDistanceKm);
  }, [providersWithDistance, selectedCategory, searchQuery, maxDistanceKm]);

  if (!isOpen) return null;

  const handleStartBooking = (provider: NearbyServiceProvider) => {
    setBookingProvider(provider);
    setSelectedService(provider.servicesOffered[0] || 'On-Demand Service Inspection');
    setIssueDescription('');
    setUrgency('STANDARD');
  };

  const handleConfirmBooking = () => {
    if (!bookingProvider) return;
    setIsSubmitting(true);

    const urgencySurcharge = urgency === 'URGENT_EMERGENCY' ? 100 : 0;
    const baseFee = bookingProvider.baseDispatchFee + urgencySurcharge;

    const newOrder: Partial<Order> = {
      serviceType: 'NEARBY_SERVICE',
      batchId: `nearby_${bookingProvider.id}`,
      batchName: `${bookingProvider.categoryLabel}: ${selectedService}`,
      mamilaId: bookingProvider.id,
      mamilaName: bookingProvider.name,
      mamilaLocation: bookingProvider.location,
      price: baseFee,
      quantity: 1,
      deliveryFee: 0,
      totalPrice: baseFee,
      status: 'PENDING',
      paymentMethod: paymentMethod,
      paymentStatus: 'UNPAID',
      customerName: customerProfile.name || 'Customer',
      customerPhone: customerProfile.phone || '',
      customerCity: activeCity,
      customerAddress: landmark,
      customerPlusCode: customerProfile.plusCode || '8F2P+5H',
      customerCoordinates: currentCoords,
      specialInstructions: `${urgency === 'URGENT_EMERGENCY' ? '[URGENT ⚡] ' : ''}${issueDescription}`,
      nearbyServiceDetails: {
        providerId: bookingProvider.id,
        providerName: bookingProvider.name,
        providerPhone: bookingProvider.phone,
        category: bookingProvider.category,
        categoryLabel: bookingProvider.categoryLabel,
        serviceRequested: selectedService,
        urgency: urgency,
        baseDispatchFee: baseFee,
        estimatedLaborCost: bookingProvider.estPriceRange,
        customerLandmark: landmark,
        issueDescription: issueDescription || 'Standard on-demand service dispatch requested.',
        preferredTime: urgency === 'URGENT_EMERGENCY' ? 'Immediate Express (Within 20 mins)' : 'Today, Standard Dispatch',
      },
    };

    setTimeout(() => {
      onConfirmOrder(newOrder);
      setIsSubmitting(false);
      setBookingProvider(null);
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-md overflow-y-auto">
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="nearby-services-title"
        className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-4 flex flex-col max-h-[92vh]"
      >
        {/* HEADER ZONE */}
        <div className="px-5 sm:px-7 py-4.5 bg-linear-to-r from-emerald-900 via-slate-900 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="nearby-services-title" className="text-lg sm:text-xl font-bold tracking-tight">
                  Nearby Services Radar
                </h2>
                <span className="text-[11px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Somali Region
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Verified water tankers, solar technicians, master plumbers & emergency runners
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* City Selector */}
            <select
              value={activeCity}
              onChange={(e) => setActiveCity(e.target.value)}
              className="hidden sm:block text-xs font-semibold bg-white/10 hover:bg-white/15 border border-white/20 rounded-xl px-2.5 py-1.5 text-white transition focus:outline-hidden"
              aria-label="Select city for nearby radar"
            >
              {CITIES.map(c => (
                <option key={c.id} value={c.name} className="bg-slate-900 text-white">
                  {c.name}
                </option>
              ))}
            </select>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* HERO SHOWCASE STRIP (HIGH-FIDELITY ASSETS) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-slate-50 border-b border-slate-200">
          <div 
            onClick={() => setSelectedCategory('WATER_TANKER')}
            className="group relative h-28 rounded-2xl overflow-hidden cursor-pointer shadow-xs border border-slate-200 hover:border-emerald-500 transition-all"
          >
            <img 
              src="/src/assets/images/nearby_water_service_1793264616951.jpg" 
              alt="Clean Water Tanker" 
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-linear-to-t from-slate-950/85 via-slate-950/40 to-transparent" />
            <div className="absolute bottom-2.5 left-3 right-3 text-white">
              <div className="flex items-center gap-1.5 text-xs font-bold">
                <Droplets className="w-3.5 h-3.5 text-emerald-400" />
                <span>Clean Water Tankers</span>
              </div>
              <p className="text-[11px] text-slate-300 truncate">5,000L & 10,000L rapid dispatch</p>
            </div>
          </div>

          <div 
            onClick={() => setSelectedCategory('ELECTRIC_SOLAR')}
            className="group relative h-28 rounded-2xl overflow-hidden cursor-pointer shadow-xs border border-slate-200 hover:border-emerald-500 transition-all"
          >
            <img 
              src="/src/assets/images/nearby_solar_electric_1793264618531.jpg" 
              alt="Solar and Electrical Technician" 
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-linear-to-t from-slate-950/85 via-slate-950/40 to-transparent" />
            <div className="absolute bottom-2.5 left-3 right-3 text-white">
              <div className="flex items-center gap-1.5 text-xs font-bold">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Solar & Electricians</span>
              </div>
              <p className="text-[11px] text-slate-300 truncate">Inverter diagnostics & rewiring</p>
            </div>
          </div>

          <div 
            onClick={() => setSelectedCategory('ERRAND_RUNNER')}
            className="group relative h-28 rounded-2xl overflow-hidden cursor-pointer shadow-xs border border-slate-200 hover:border-emerald-500 transition-all"
          >
            <img 
              src="/src/assets/images/nearby_errand_dispatch_1793264618617.jpg" 
              alt="Express Errand Runner" 
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-linear-to-t from-slate-950/85 via-slate-950/40 to-transparent" />
            <div className="absolute bottom-2.5 left-3 right-3 text-white">
              <div className="flex items-center gap-1.5 text-xs font-bold">
                <Navigation className="w-3.5 h-3.5 text-sky-400" />
                <span>Express Errand Runners</span>
              </div>
              <p className="text-[11px] text-slate-300 truncate">Queue, stamps & urgent pickups</p>
            </div>
          </div>
        </div>

        {/* CONTROLS ZONE: SEARCH, DISTANCE RADIUS & CATEGORY TABS */}
        <div className="p-4 border-b border-slate-200 bg-white space-y-3 shrink-0">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search water, electrician, pump mechanic, tire rescue..."
                className="w-full pl-9.5 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Distance Filter Selector */}
            <div className="flex items-center gap-2 self-stretch sm:self-auto shrink-0">
              <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Radius:</span>
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                {[
                  { label: '< 3 km', val: 3 },
                  { label: '< 7 km', val: 7 },
                  { label: '< 15 km', val: 15 },
                  { label: 'All', val: 100 },
                ].map(r => (
                  <button
                    key={r.val}
                    type="button"
                    onClick={() => setMaxDistanceKm(r.val)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                      maxDistanceKm === r.val 
                        ? 'bg-emerald-700 text-white shadow-2xs' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            {CATEGORIES.map(cat => {
              const Icon = cat.icon;
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium transition whitespace-nowrap cursor-pointer shrink-0 ${
                    isActive
                      ? 'bg-slate-900 text-white font-semibold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* PROVIDER LIST */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/50">
          {filteredProviders.length === 0 ? (
            <div className="text-center py-12 px-4 bg-white rounded-2xl border border-slate-200">
              <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-800">No service providers found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                No active specialists match your filter within {maxDistanceKm === 100 ? 'any distance' : `${maxDistanceKm} km`} of {activeCity}. Try widening your distance radius.
              </p>
              <button
                onClick={() => {
                  setSelectedCategory('ALL');
                  setSearchQuery('');
                  setMaxDistanceKm(100);
                }}
                className="mt-4 px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-800 transition"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredProviders.map(provider => {
                return (
                  <div 
                    key={provider.id}
                    className="bg-white rounded-2xl border border-slate-200 hover:border-slate-300 p-4.5 flex flex-col justify-between shadow-2xs hover:shadow-xs transition"
                  >
                    <div>
                      {/* Top Row: Category & Proximity Distance */}
                      <div className="flex items-center justify-between gap-2 mb-2 text-xs">
                        <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                          {provider.categoryLabel}
                        </span>
                        
                        <div className="flex items-center gap-1 font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg">
                          <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{provider.calculatedDistanceKm.toFixed(1)} km away</span>
                        </div>
                      </div>

                      {/* Provider Title & Verified Badge */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm leading-snug">
                            {provider.name}
                          </h3>
                          <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                            <span className="flex items-center gap-0.5 text-amber-600 font-bold">
                              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                              <span>{provider.rating.toFixed(1)}</span>
                            </span>
                            <span>·</span>
                            <span>{provider.reviewCount} reviews</span>
                            <span>·</span>
                            <span>{provider.completedJobs}+ jobs</span>
                          </div>
                        </div>

                        {provider.isEmergency247 && (
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md uppercase tracking-wider shrink-0">
                            24/7 Fast
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">
                        {provider.description}
                      </p>

                      {/* Location & Response Time */}
                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-slate-500">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span className="truncate max-w-[180px]">{provider.location}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>~{provider.avgResponseMins} min arrival</span>
                        </div>
                      </div>

                      {/* Services Chips */}
                      <div className="mt-2.5 flex flex-wrap gap-1">
                        {provider.servicesOffered.slice(0, 3).map((svc, idx) => (
                          <span 
                            key={idx}
                            className="text-[11px] text-slate-600 bg-slate-50 border border-slate-200/60 px-2 py-0.5 rounded-md"
                          >
                            {svc}
                          </span>
                        ))}
                        {provider.servicesOffered.length > 3 && (
                          <span className="text-[11px] text-slate-400 self-center">
                            +{provider.servicesOffered.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bottom Pricing & Actions */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div>
                        <div className="text-[11px] text-slate-400 font-medium">Base Dispatch</div>
                        <div className="text-sm font-bold font-mono text-slate-900">
                          {provider.baseDispatchFee} ETB
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {/* Direct Call Trigger */}
                        <a
                          href={`tel:${provider.phone}`}
                          className="w-8.5 h-8.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 flex items-center justify-center transition"
                          title="Call directly"
                          aria-label={`Call ${provider.name}`}
                        >
                          <Phone className="w-4 h-4" />
                        </a>

                        {/* WhatsApp Trigger */}
                        {provider.whatsapp && (
                          <a
                            href={`https://wa.me/${provider.whatsapp.replace(/[^0-9]/g, '')}?text=Hello%20${encodeURIComponent(provider.name)},%20I%20am%20contacting%20you%20via%20Jijiga%20Express%20Nearby%20Services.`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-8.5 h-8.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 flex items-center justify-center transition"
                            title="Chat on WhatsApp"
                            aria-label={`Chat with ${provider.name} on WhatsApp`}
                          >
                            <MessageCircle className="w-4 h-4" />
                          </a>
                        )}

                        {/* Book Dispatch */}
                        <button
                          type="button"
                          onClick={() => handleStartBooking(provider)}
                          className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                        >
                          <span>Book Dispatch</span>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* BOOKING DRAWER / OVERLAY */}
        {bookingProvider && (
          <div className="absolute inset-0 z-20 bg-slate-950/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
              {/* Drawer Header */}
              <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm sm:text-base">
                    Dispatch {bookingProvider.name}
                  </h3>
                  <div className="text-xs text-slate-300">
                    {bookingProvider.categoryLabel} · {(bookingProvider as any).calculatedDistanceKm !== undefined ? `${(bookingProvider as any).calculatedDistanceKm.toFixed(1)} km away` : 'Fast Dispatch'}
                  </div>
                </div>
                <button
                  onClick={() => setBookingProvider(null)}
                  className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="p-5 overflow-y-auto space-y-4 text-xs">
                {/* Service Selection */}
                <div>
                  <label className="block font-bold text-slate-800 mb-1.5">
                    Select Specific Service
                  </label>
                  <select
                    value={selectedService}
                    onChange={(e) => setSelectedService(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    {bookingProvider.servicesOffered.map((svc, i) => (
                      <option key={i} value={svc}>{svc}</option>
                    ))}
                    <option value="Custom Urgent Request">Other Custom Request</option>
                  </select>
                </div>

                {/* Urgency Level */}
                <div>
                  <label className="block font-bold text-slate-800 mb-1.5">
                    Dispatch Urgency
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setUrgency('STANDARD')}
                      className={`p-2.5 rounded-xl border text-left transition ${
                        urgency === 'STANDARD'
                          ? 'border-emerald-600 bg-emerald-50/50 text-emerald-950 font-bold'
                          : 'border-slate-200 bg-white text-slate-600'
                      }`}
                    >
                      <div className="font-bold">Standard Dispatch</div>
                      <div className="text-[11px] text-slate-500">Within {bookingProvider.avgResponseMins} mins · Base Fee</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setUrgency('URGENT_EMERGENCY')}
                      className={`p-2.5 rounded-xl border text-left transition ${
                        urgency === 'URGENT_EMERGENCY'
                          ? 'border-amber-600 bg-amber-50/50 text-amber-950 font-bold'
                          : 'border-slate-200 bg-white text-slate-600'
                      }`}
                    >
                      <div className="font-bold flex items-center gap-1 text-amber-700">
                        <Zap className="w-3.5 h-3.5" />
                        <span>⚡ Emergency Express</span>
                      </div>
                      <div className="text-[11px] text-slate-500">Immediate (+100 ETB priority)</div>
                    </button>
                  </div>
                </div>

                {/* Location / Landmark */}
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Your Address / Landmark in {activeCity}
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={landmark}
                      onChange={(e) => setLandmark(e.target.value)}
                      placeholder="e.g. Near Taiwan Market Gate 2, Jijiga"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-hidden focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Issue / Description Note */}
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Job Details or Symptoms
                  </label>
                  <textarea
                    rows={2}
                    value={issueDescription}
                    onChange={(e) => setIssueDescription(e.target.value)}
                    placeholder="Describe problem (e.g. pipe leaking under bathroom sink, water pump tripping circuit breaker)..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-hidden focus:border-emerald-500"
                  />
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block font-bold text-slate-800 mb-1.5">
                    Payment Method
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'TELEBIRR', label: 'Telebirr' },
                      { id: 'CBE_BIRR', label: 'CBE Birr' },
                      { id: 'ZAAD', label: 'Zaad' },
                      { id: 'SAHAL', label: 'Sahal' },
                      { id: 'COD', label: 'Cash / COD' },
                      { id: 'EBIRR', label: 'eBirr' },
                    ].map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPaymentMethod(p.id as PaymentMethod)}
                        className={`py-1.5 px-2 rounded-lg border text-center font-bold transition text-[11px] ${
                          paymentMethod === p.id 
                            ? 'bg-slate-900 text-white border-slate-900' 
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Fee Breakdown Card */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="flex justify-between text-slate-600">
                    <span>Base Dispatch Fee:</span>
                    <span className="font-mono font-bold">{bookingProvider.baseDispatchFee} ETB</span>
                  </div>
                  {urgency === 'URGENT_EMERGENCY' && (
                    <div className="flex justify-between text-amber-700 font-semibold">
                      <span>Emergency Priority Surcharge:</span>
                      <span className="font-mono font-bold">+100 ETB</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-600">
                    <span>Estimated Labor / Scope:</span>
                    <span className="font-mono text-slate-500">{bookingProvider.estPriceRange}</span>
                  </div>
                  <div className="pt-1.5 border-t border-slate-200 flex justify-between font-bold text-slate-900 text-sm">
                    <span>Total Initial Dispatch:</span>
                    <span className="font-mono text-emerald-800">
                      {bookingProvider.baseDispatchFee + (urgency === 'URGENT_EMERGENCY' ? 100 : 0)} ETB
                    </span>
                  </div>
                </div>
              </div>

              {/* Drawer Actions */}
              <div className="p-4 bg-white border-t border-slate-200 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setBookingProvider(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold transition text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmBooking}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold transition text-xs flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Confirming Dispatch...' : 'Confirm & Dispatch Specialist'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
