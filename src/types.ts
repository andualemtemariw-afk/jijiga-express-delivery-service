export type Role = 'CUSTOMER' | 'MAMILA' | 'RUNNER' | 'RIDER' | 'ADMIN';

export type ServiceType = 'FOOD' | 'PARCEL' | 'RIDE' | 'EEU_RECHARGE' | 'KHAT' | 'GROCERY' | 'HOTEL' | 'NEARBY_SERVICE';

export type PaymentMethod = 
  | 'TELEBIRR' 
  | 'EBIRR' 
  | 'CBE_BIRR' 
  | 'COOP_PAY'
  | 'SAHAL' 
  | 'ZAAD' 
  | 'E_DAHAB' 
  | 'COD';

export type PaymentStatus = 
  | 'UNPAID'
  | 'PAYMENT_PENDING'
  | 'PAID_CONFIRMED'
  | 'COLLECTED_BY_RIDER'
  | 'REFUNDED'
  | 'FAILED';

export type OrderStatus =
  | 'PENDING'
  | 'TRANSACTION_PENDING'
  | 'RUNNER_ASSIGNED'
  | 'VERIFIED_READY'
  | 'READY_FOR_RIDER' // Tagged by runner
  | 'RIDER_DISPATCHED'
  | 'RIDER_ACCEPTED'
  | 'IN_TRANSIT'
  | 'PICKED_UP'
  | 'DELIVERED'
  | 'RATED'
  | 'CANCELLED'
  | 'DECLINED'
  | 'PAYMENT_PENDING'
  | 'DEFECT_REJECTED';

// EEU Prepaid Electricity Card Recharge Round-Trip Chain of Custody
export type EeuCustodyPhase = 
  | 'WITH_CUSTOMER'       // 1. Physical card with customer
  | 'WITH_RIDER_OUTBOUND' // 2. Rider collected card & cash, traveling to EEU
  | 'AT_EEU_HUB'          // 3. At EEU hub recharge terminal
  | 'WITH_RIDER_RETURN'   // 4. Card recharged, returning to customer
  | 'RETURNED';           // 5. Card + terminal receipt returned to customer

export interface EeuRechargeDetails {
  meterNumber: string; // 13-digit meter number string
  cardSerialNumber?: string; // Physical card identifier
  rechargeAmount: number; // Cash float amount in ETB
  serviceFee: number; // Delivery & errand service fee
  eeuHubName: string; // e.g. "EEU Jijiga Main District Office"
  customerAuthorized?: boolean; // Explicit customer authorization before physical-card collection
  receiptCaptured?: boolean; // Whether receipt snapshot has been recorded
  custodyPhase: EeuCustodyPhase;
  custodyLabel: 'WITH_CUSTOMER' | 'WITH_RIDER' | 'AT_EEU_HUB' | 'RETURNED';
  custodyTimeline: Array<{
    phase: EeuCustodyPhase;
    label: string;
    timestamp: string;
    note: string;
    actor: string;
  }>;
  receiptTimestamp?: string;
  kwhUnits?: number;
}

export interface Mamila {
  id: string;
  name: string;
  rating: number;
  location: string;
  plusCode: string;
  phone?: string;
  coordinates?: { lat: number; lng: number };
  category?: 'Farm & Grocer' | 'Hotel & Restaurant' | 'Bakery & Sweets' | 'Dairy' | 'Khat Vendor (Mamila)';
  khatSpecialty?: string;
  dailyArrivalTime?: string;
  trustedBadges?: string[];
  stallNumber?: string;
  verifiedDirectFarm?: boolean;
}

export interface Batch {
  id: string;
  mamilaId: string;
  name: string;
  description: string;
  price: number;
  available: number;
  expiry: string;
  imageUrl: string;
  category?: string;
  unit?: string;
  harvestTime?: string;
  khatGrade?: 'Abo Mismar (Prime)' | 'Urji Fresh Leaf' | 'Gelemso Special' | 'Harari Behati' | 'Gursum Gold';
  leafMoisture?: string;
  bundleWrapType?: 'Fresh Banana Leaf' | 'Traditional Palm Fiber' | 'Moist Burlap Wrap';
}

export interface KhatOrderDetails {
  mamilaId: string;
  mamilaName: string;
  grade: string;
  origin: string;
  arrivalBatchTime: string;
  bundlesCount: number;
  bundleWrapType: string;
  deliveryLandmark: string;
  preferredMamilaCustomerNote?: string;
}

export interface Dispute {
  reason: string;
  comment: string;
  filedAt: Date;
  status: 'PENDING' | 'RESOLVED' | 'REFUNDED';
  resolutionNote?: string;
}

export interface ParcelDetails {
  senderName: string;
  senderPhone: string;
  senderCity: string;
  senderAddress: string;
  receiverName: string;
  receiverPhone: string;
  receiverCity: string;
  receiverAddress: string;
  parcelCategory: 'DOCUMENTS' | 'PERISHABLE_FOOD' | 'ELECTRONICS' | 'CLOTHING' | 'FRAGILE';
  weightCategory: '< 1 kg' | '1 - 3 kg' | '3 - 5 kg' | '5 - 10 kg';
  description: string;
  isFragile: boolean;
  tamperSealRequested: boolean;
  trackingCode: string;
}

export interface RideDetails {
  vehicleType: 'MARHABA_TAXI' | 'MARHABA_MOTO';
  pickupLocation: string;
  dropoffLocation: string;
  city: string;
  driverName?: string;
  vehicleModel?: string;
  licensePlate?: string;
  driverRating?: number;
  driverPhone?: string;
  tripDistanceKm: number;
  tripDurationMins: number;
  rideStatus: 'REQUESTED' | 'SEARCHING' | 'DRIVER_ASSIGNED' | 'ARRIVED_PICKUP' | 'ON_TRIP' | 'COMPLETED' | 'CANCELLED';
}

export type NearbyServiceCategory = 
  | 'WATER_TANKER'
  | 'ELECTRIC_SOLAR'
  | 'PLUMBING'
  | 'ROADSIDE_RESCUE'
  | 'EMERGENCY_PHARMACY'
  | 'GAS_REFILL'
  | 'ERRAND_RUNNER';

export interface NearbyServiceProvider {
  id: string;
  name: string;
  phone: string;
  whatsapp?: string;
  category: NearbyServiceCategory;
  categoryLabel: string;
  city: string;
  location: string;
  plusCode: string;
  coordinates: { lat: number; lng: number };
  rating: number;
  reviewCount: number;
  completedJobs: number;
  baseDispatchFee: number; // in ETB
  estPriceRange: string;   // e.g. "250 - 600 ETB"
  avgResponseMins: number;
  availableNow: boolean;
  isEmergency247: boolean;
  badges: string[];
  description: string;
  servicesOffered: string[];
}

export interface NearbyServiceOrderDetails {
  providerId: string;
  providerName: string;
  providerPhone: string;
  category: NearbyServiceCategory;
  categoryLabel: string;
  serviceRequested: string;
  urgency: 'STANDARD' | 'URGENT_EMERGENCY';
  baseDispatchFee: number;
  estimatedLaborCost?: string;
  customerLandmark: string;
  issueDescription: string;
  preferredTime?: string;
}

export interface Order {
  id: string;
  serviceType?: ServiceType;
  batchId: string;
  batchName: string;
  mamilaId: string;
  mamilaName: string;
  mamilaLocation: string;
  price: number; // Subtotal for item(s) or base trip fare
  quantity: number;
  deliveryFee: number;
  totalPrice: number; // price * quantity + deliveryFee
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus?: PaymentStatus;
  paymentReference?: string;
  paymentConfirmedBy?: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  customerCity?: string;
  customerPlusCode: string;
  customerAddress?: string;
  customerCoordinates?: { lat: number; lng: number };
  mamilaCoordinates?: { lat: number; lng: number };
  riderCoordinates?: { lat: number; lng: number };
  specialInstructions?: string;
  cookingInstruction?: string; // Custom preparation / cooking note (e.g. "Please cook it well done, no pink inside")
  parcelDetails?: ParcelDetails;
  rideDetails?: RideDetails;
  eeuDetails?: EeuRechargeDetails;
  khatDetails?: KhatOrderDetails;
  groceryDetails?: {
    marketName: string;
    stallNumber: string;
    category?: any;
    weightKg: number;
    unitLabel: string;
    farmOrigin?: string;
    freshnessTimestamp?: string;
  };
  hotelDetails?: {
    hotelId: string;
    hotelName: string;
    hotelCity: string;
    roomType: string;
    checkInDate: string;
    checkOutDate: string;
    nights: number;
    guests: number;
    guestName: string;
    guestPhone: string;
    specialRequests?: string;
    bookingReference: string;
    dailyRate: number;
    totalAmount: number;
  };
  nearbyServiceDetails?: NearbyServiceOrderDetails;
  runnerId?: string;
  runnerName?: string;
  runnerPhone?: string;
  runnerTagId?: string;
  runnerPhotoUrl?: string;
  riderId?: string;
  riderName?: string;
  riderPhone?: string;
  riderProofUrl?: string;
  distanceKm?: number;
  etaMinutes?: number;
  rating?: number;
  reviewComment?: string;
  dispute?: Dispute;
  defectReason?: string;
  handoverToRiderAt?: string;
  courierDeliveryNote?: string;
  courierNoteUpdatedAt?: string;
  courierNoteAuthor?: string;
  createdAt: Date;
}

export type MessageSenderRole = 'CUSTOMER' | 'RUNNER' | 'RIDER' | 'SYSTEM';
export type CommunicationChannel = 'CHAT' | 'VOICE_NOTE' | 'SMS' | 'USSD' | 'CALL';

export interface ChatMessage {
  id: string;
  orderId: string;
  senderRole: MessageSenderRole;
  senderName: string;
  text: string;
  timestamp: string;
  isVoiceNote?: boolean;
  voiceDurationSeconds?: number;
  language?: 'so' | 'am' | 'en';
  status?: 'SENT' | 'DELIVERED' | 'READ';
  transcript?: string;
}

export interface VernacularPhrase {
  id: string;
  category: 'arrival' | 'payment' | 'instruction' | 'delay' | 'verification';
  targetRole: 'CUSTOMER' | 'RIDER' | 'RUNNER';
  so: string; // Af-Soomaali
  am: string; // አማርኛ
  en: string; // English
}

export type UserRole = 'customer' | 'mamila' | 'runner' | 'rider' | 'admin';

export interface AppUserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  phone?: string;
  city?: string;
  address?: string;
  plusCode?: string;
  role: UserRole;
  mamilaId?: string;
  active?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface DeliveryEvent {
  id: string;
  orderId: string;
  status: OrderStatus;
  timestamp: string;
  actorRole: Role;
  actorId?: string;
  actorName?: string;
  note?: string;
  proofUrl?: string;
  location?: { lat: number; lng: number };
}

// ----------------------------------------------------
// Super-App Upgrade Extensions
// ----------------------------------------------------

export interface CartItem {
  id: string;
  batchId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  category?: string;
  mamilaId: string;
  mamilaName: string;
  notes?: string;
}

export interface Cart {
  vendorId: string | null;
  vendorName: string | null;
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  total: number;
}

export interface RoomType {
  id: string;
  name: string;
  pricePerNight: number;
  bedType: string;
  maxGuests: number;
  availableRooms: number;
  amenities: string[];
  imageUrl?: string;
}

export interface Hotel {
  id: string;
  name: string;
  city: string;
  location: string;
  rating: number;
  reviewCount: number;
  priceRange: string;
  coverImage: string;
  amenities: string[];
  roomTypes: RoomType[];
  phone?: string;
  checkInTime: string;
  checkOutTime: string;
  featured?: boolean;
}

export interface HotelReservation {
  id: string;
  hotelId: string;
  hotelName: string;
  city: string;
  roomTypeId: string;
  roomTypeName: string;
  guestName: string;
  guestPhone: string;
  guestEmail?: string;
  checkInDate: string;
  checkOutDate: string;
  nightsCount: number;
  roomsCount: number;
  pricePerNight: number;
  totalPrice: number;
  status: 'CONFIRMED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'CANCELLED';
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  createdAt: string;
}

export type LoyaltyTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';

export interface LoyaltyProfile {
  pointsBalance: number;
  lifetimePoints: number;
  tier: LoyaltyTier;
  nextTierPointsNeeded: number;
  tierPerks: string[];
}

export interface LoyaltyReward {
  id: string;
  title: string;
  pointsCost: number;
  discountEtb: number;
  minOrderEtb?: number;
  description: string;
}

export interface LoyaltyAccount {
  userId?: string;
  pointsBalance: number;
  lifetimePoints: number;
  tier: LoyaltyTier;
  nextTierPointsNeeded?: number;
  tierLabel?: string;
  discountPct?: number;
  tierPerks?: string[];
  perks?: string[];
  redeemedRewards?: string[];
  history?: Array<{
    id: string;
    type: 'EARNED' | 'REDEEMED' | 'BONUS';
    points: number;
    description: string;
    timestamp: string;
  }>;
}

export type SupportServiceCategory = 'FOOD' | 'PARCEL' | 'RIDE' | 'HOTEL' | 'EEU_RECHARGE' | 'PAYMENT' | 'OTHER';
export type TicketStatus = 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'CLOSED';

export interface SupportTicket {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  serviceCategory: SupportServiceCategory;
  issueCategory: string;
  orderId?: string;
  description: string;
  evidenceUrl?: string;
  status: TicketStatus;
  createdAt: string;
  resolutionNote?: string;
}

export interface ServiceabilityZone {
  city: string;
  isServiceable: boolean;
  supportedServices: ServiceType[];
  zoneName: string;
  baseDeliveryFee: number;
  estMinutes: number;
  minOrderEtb: number;
  unsupportedMessage?: string;
}

/**
 * Maps internal operational order statuses to friendly customer labels and stepper indices.
 */
export function getCustomerFriendlyStatus(status: OrderStatus): { label: string; tone: string; step: number } {
  switch (status) {
    case 'PENDING':
    case 'TRANSACTION_PENDING':
    case 'PAYMENT_PENDING':
      return { label: 'Order placed', tone: 'bg-amber-100 text-amber-800 border-amber-300', step: 1 };
    case 'RUNNER_ASSIGNED':
      return { label: 'Assigned to runner', tone: 'bg-blue-100 text-blue-800 border-blue-300', step: 2 };
    case 'VERIFIED_READY':
    case 'READY_FOR_RIDER':
      return { label: 'Prepared & ready for courier', tone: 'bg-indigo-100 text-indigo-800 border-indigo-300', step: 3 };
    case 'RIDER_DISPATCHED':
    case 'RIDER_ACCEPTED':
      return { label: 'Courier on the way to pickup', tone: 'bg-sky-100 text-sky-800 border-sky-300', step: 3 };
    case 'PICKED_UP':
    case 'IN_TRANSIT':
      return { label: 'Out for delivery', tone: 'bg-teal-100 text-teal-800 border-teal-300', step: 4 };
    case 'DELIVERED':
    case 'RATED':
      return { label: 'Delivered', tone: 'bg-emerald-100 text-emerald-800 border-emerald-300', step: 5 };
    case 'CANCELLED':
    case 'DECLINED':
      return { label: 'Cancelled', tone: 'bg-slate-100 text-slate-700 border-slate-300', step: 0 };
    case 'DEFECT_REJECTED':
      return { label: 'Rejected at verification', tone: 'bg-rose-100 text-rose-800 border-rose-300', step: 0 };
    default:
      return { label: status, tone: 'bg-slate-100 text-slate-800 border-slate-300', step: 1 };
  }
}


