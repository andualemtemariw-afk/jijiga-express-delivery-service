import { useState } from 'react';
import { PaymentMethod, ParcelDetails, Order } from '../../types';
import { 
  X, 
  Package, 
  MapPin, 
  Phone, 
  User, 
  ShieldCheck, 
  Truck, 
  FileText, 
  CheckCircle2, 
  CreditCard,
  AlertCircle,
  ArrowRight
} from 'lucide-react';

interface BookParcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBookParcel: (order: Partial<Order>) => void;
  senderProfile: {
    name: string;
    phone: string;
    city: string;
    address: string;
    plusCode: string;
  };
}

export function BookParcelModal({
  isOpen,
  onClose,
  onBookParcel,
  senderProfile,
}: BookParcelModalProps) {
  const senderCity = 'Jijiga';
  const [senderName, setSenderName] = useState(senderProfile.name);
  const [senderPhone, setSenderPhone] = useState(senderProfile.phone);
  const [senderAddress, setSenderAddress] = useState(senderProfile.address);

  const receiverCity = 'Jijiga';
  const [receiverName, setReceiverName] = useState('Mustafa Farah Omer');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [receiverAddress, setReceiverAddress] = useState('');

  const [category, setCategory] = useState<ParcelDetails['parcelCategory']>('DOCUMENTS');
  const [weight, setWeight] = useState<ParcelDetails['weightCategory']>('< 1 kg');
  const [description, setDescription] = useState('Important legal clearance certificates and documents');
  const [isFragile, setIsFragile] = useState(false);
  const [tamperSeal, setTamperSeal] = useState(true);
  const [specialNote, setSpecialNote] = useState('Handle with care, expedited courier delivery.');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('TELEBIRR');

  if (!isOpen) return null;

  // Jijiga-only parcel delivery: local dispatch rate.
  const isIntercity = false;
  const baseRate = 120;
  const weightAddon = weight === '< 1 kg' ? 50 : weight === '1 - 3 kg' ? 100 : weight === '3 - 5 kg' ? 180 : 250;
  const sealAddon = tamperSeal ? 30 : 0;
  const deliveryFee = baseRate;
  const itemPrice = weightAddon + sealAddon;
  const totalPrice = itemPrice + deliveryFee;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trackingTag = 'PARCEL-JJ-' + Math.floor(1000 + Math.random() * 9000);

    const parcelDetails: ParcelDetails = {
      senderName,
      senderPhone,
      senderCity,
      senderAddress,
      receiverName,
      receiverPhone,
      receiverCity,
      receiverAddress,
      parcelCategory: category,
      weightCategory: weight,
      description,
      isFragile,
      tamperSealRequested: tamperSeal,
      trackingCode: trackingTag,
    };

    const generatedId = 'ord-pcl-' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);

    const newOrder: Partial<Order> = {
      id: generatedId,
      serviceType: 'PARCEL',
      batchId: 'parcel-dispatch',
      batchName: `Express Parcel (${category.replace('_', ' ')}): ${senderCity} → ${receiverCity}`,
      mamilaId: 'm1',
      mamilaName: 'Jijiga Express Delivery Service Hub',
      mamilaLocation: `${senderCity} Central Dispatch Terminal`,
      price: itemPrice,
      quantity: 1,
      deliveryFee,
      totalPrice,
      status: 'PENDING',
      paymentMethod,
      paymentStatus: paymentMethod === 'COD' ? 'UNPAID' : 'PAYMENT_PENDING',
      customerId: (senderProfile as any)?.uid,
      customerName: senderName,
      customerPhone: senderPhone,
      customerCity: 'Jijiga',
      customerPlusCode: senderProfile.plusCode || '',
      customerAddress: receiverAddress,
      specialInstructions: specialNote || '',
      parcelDetails,
      distanceKm: 6.5,
      etaMinutes: 35,
      createdAt: new Date(),
    };

    onBookParcel(newOrder);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div 
        className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Book Express Parcel Service</h3>
              <p className="text-xs text-slate-400">Local parcels & documents within Jijiga</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Sender & Receiver Dual Column Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Sender Details */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wide">
                <User className="w-3.5 h-3.5 text-blue-600" />
                <span>Sender Information (Origin)</span>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Origin City</label>
                <div className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-slate-100 font-medium text-slate-700">
                  Jijiga (local delivery area)
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Sender Name</label>
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Sender Phone</label>
                <input
                  type="text"
                  value={senderPhone}
                  onChange={(e) => setSenderPhone(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white font-mono"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Pickup Address</label>
                <input
                  type="text"
                  value={senderAddress}
                  onChange={(e) => setSenderAddress(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                  required
                />
              </div>
            </div>

            {/* Receiver Details */}
            <div className="p-4 bg-blue-50/50 border border-blue-200/80 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-900 uppercase tracking-wide">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                <span>Receiver Information (Destination)</span>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Destination City</label>
                <div className="w-full text-xs p-2 rounded-lg border border-blue-300 bg-blue-50 font-medium text-slate-700">
                  Jijiga (local delivery area)
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Receiver Name</label>
                <input
                  type="text"
                  value={receiverName}
                  onChange={(e) => setReceiverName(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Receiver Phone</label>
                <input
                  type="text"
                  value={receiverPhone}
                  onChange={(e) => setReceiverPhone(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white font-mono"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Dropoff Address / Landmark</label>
                <input
                  type="text"
                  value={receiverAddress}
                  onChange={(e) => setReceiverAddress(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                  required
                />
              </div>
            </div>
          </div>

          {/* Parcel Specifications */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Package Details</h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Parcel Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                >
                  <option value="DOCUMENTS">Official Documents & Papers</option>
                  <option value="PERISHABLE_FOOD">Fresh Food & Produce</option>
                  <option value="ELECTRONICS">Electronics & Mobile Gadgets</option>
                  <option value="CLOTHING">Clothing & Personal Apparel</option>
                  <option value="FRAGILE">Fragile / Glass Goods</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Weight Estimate</label>
                <select
                  value={weight}
                  onChange={(e) => setWeight(e.target.value as any)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                >
                  <option value="< 1 kg">Under 1 kg (+50 ETB)</option>
                  <option value="1 - 3 kg">1 - 3 kg (+100 ETB)</option>
                  <option value="3 - 5 kg">3 - 5 kg (+180 ETB)</option>
                  <option value="5 - 10 kg">5 - 10 kg (+250 ETB)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">Package Contents Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Legal contracts, passport photo cards, or dried spices"
                className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                required
              />
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-1">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isFragile}
                  onChange={(e) => setIsFragile(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600"
                />
                <span>Fragile item (Requires soft cushioning)</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={tamperSeal}
                  onChange={(e) => setTamperSeal(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600"
                />
                <span>Tamper-evident security seal barcode (+30 ETB)</span>
              </label>
            </div>
          </div>

          {/* Regional Payment Methods */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wide block">
              Horn of Africa Payment Method
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'TELEBIRR', label: 'Telebirr', sub: 'Online payment' },
                { id: 'COD', label: 'Cash (COD)', sub: 'Pay Courier' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaymentMethod(m.id as PaymentMethod)}
                  className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                    paymentMethod === m.id
                      ? 'border-blue-600 bg-blue-50/80 font-bold text-blue-900 ring-2 ring-blue-500/20'
                      : 'border-slate-200 bg-white hover:bg-slate-100/80 text-slate-700'
                  }`}
                >
                  <div className="font-semibold">{m.label}</div>
                  <div className="text-[10px] text-slate-500">{m.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Fare Summary & Confirmation */}
          <div className="p-4 bg-slate-900 text-white rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs text-slate-400">Total Courier Dispatch Fee</div>
              <div className="text-2xl font-extrabold font-mono text-emerald-400">
                {totalPrice} ETB
                <span className="text-xs font-normal text-slate-400 ml-2">
                  (Rate: {itemPrice} + Courier {deliveryFee} ETB)
                </span>
              </div>
              <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                <span>{senderCity}</span>
                <ArrowRight className="w-3 h-3 text-emerald-400" />
                <span>{receiverCity}</span>
                <span>• ~6 km intra-city</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <CheckCircle2 className="w-4 h-4" />
                Confirm & Dispatch Parcel
              </button>
            </div>
          </div>
          <div className="bg-slate-950/80 px-6 py-2 border-t border-slate-800 text-center">
            <p className="text-[11px] text-slate-400 font-medium">
              To request custom delivery features, ask support.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
