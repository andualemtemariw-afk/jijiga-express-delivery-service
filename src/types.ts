export type Role = 'CUSTOMER' | 'MAMILA' | 'RUNNER' | 'RIDER' | 'ADMIN';

export type ServiceType = 'FOOD' | 'PARCEL' | 'RIDE' | 'EEU_RECHARGE' | 'KHAT';

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
  custodyPhase: EeuCustodyPhase;
  custodyLabel: 'WITH_CUSTOMER' | 'WITH_RIDER' | 'AT_EEU_HUB' | 'RETURNED';
  custodyTimeline: Array<{
    phase: EeuCustodyPhase;
    label: string;
    timestamp: string;
    note: string;
    actor: string;
  }>;
  tokenCode?: string; // 20-digit STS prepaid code
  receiptImageUrl?: string; // Mandatory camera snapshot of EEU terminal paper receipt
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
  rideStatus: 'SEARCHING' | 'DRIVER_ASSIGNED' | 'ARRIVED_PICKUP' | 'ON_TRIP' | 'COMPLETED' | 'CANCELLED';
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
  runnerId?: string;
  runnerName?: string;
  runnerTagId?: string;
  runnerPhotoUrl?: string;
  riderId?: string;
  riderName?: string;
  riderProofUrl?: string;
  distanceKm?: number;
  etaMinutes?: number;
  rating?: number;
  reviewComment?: string;
  dispute?: Dispute;
  defectReason?: string;
  createdAt: Date;
}

export type MessageSenderRole = 'CUSTOMER' | 'RUNNER' | 'RIDER' | 'SYSTEM';
export type CommunicationChannel = 'CHAT' | 'VOICE_NOTE' | 'SMS' | 'USSD' | 'CALL';

export interface ChatMessage {
  id: string;
  orderId: string;
  senderRole: MessageSenderRole;
  senderId?: string;
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

