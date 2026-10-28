import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingBag, 
  MapPin, 
  Plus, 
  Minus, 
  CheckCircle2, 
  X, 
  Truck, 
  Store, 
  Sparkles, 
  ShieldCheck, 
  ArrowRight,
  Filter,
  CreditCard,
  Scale
} from 'lucide-react';
import { Order, PaymentMethod, AppUserProfile } from '../../types';
import { GROCERY_MARKET_ITEMS, GroceryMarketItem } from '../../data';

interface GroceryMarketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBookGrocery: (order: Partial<Order>) => void;
  currentUser?: any;
  customerProfile?: AppUserProfile | null;
}

export function GroceryMarketModal({
  isOpen,
  onClose,
  onBookGrocery,
  currentUser,
  customerProfile,
}: GroceryMarketModalProps) {
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [selectedItem, setSelectedItem] = useState<GroceryMarketItem>(GROCERY_MARKET_ITEMS[0]);
  const [quantity, setQuantity] = useState(1);
  const [deliveryAddress, setDeliveryAddress] = useState(customerProfile?.address || 'Kebele 04, Taiwan Market Sector');
  const [customerPhone, setCustomerPhone] = useState(customerProfile?.phone || '+251 91 123 4567');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('COD');
  const [specialNote, setSpecialNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const categories = ['ALL', 'Camel Milk & Dairy', 'Spices & Berbere', 'Grains & Staples', 'Produce', 'Cooking Oils'];

  const filteredItems = activeCategory === 'ALL'
    ? GROCERY_MARKET_ITEMS
    : GROCERY_MARKET_ITEMS.filter(item => item.category === activeCategory);

  const deliveryFee = 150;
  const itemsSubtotal = selectedItem.price * quantity;
  const totalAmount = itemsSubtotal + deliveryFee;

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const orderDocId = `JJG-GROC-${Math.floor(1000 + Math.random() * 9000)}`;

    const orderPayload: Partial<Order> = {
      serviceType: 'GROCERY',
      batchId: selectedItem.id,
      batchName: `${selectedItem.name} (${quantity} × ${selectedItem.unit})`,
      mamilaId: `vendor_${selectedItem.stallNumber.replace(/\s+/g, '_')}`,
      mamilaName: `${selectedItem.vendorName} (${selectedItem.marketName})`,
      mamilaLocation: `${selectedItem.marketName}, ${selectedItem.stallNumber}`,
      price: itemsSubtotal,
      quantity,
      deliveryFee,
      totalPrice: totalAmount,
      paymentMethod,
      paymentStatus: 'UNPAID',
      customerAddress: deliveryAddress,
      customerPhone,
      groceryDetails: {
        marketName: selectedItem.marketName,
        stallNumber: selectedItem.stallNumber,
        category: selectedItem.category as any,
        weightKg: selectedItem.weightKg * quantity,
        unitLabel: selectedItem.unit,
        farmOrigin: selectedItem.origin,
        freshnessTimestamp: selectedItem.freshnessGuarantee,
      },
      specialInstructions: `[GROCERY_MARKET] ${selectedItem.name} | Qty: ${quantity} × ${selectedItem.unit} (~${selectedItem.weightKg * quantity} kg) | Vendor: ${selectedItem.vendorName} (${selectedItem.stallNumber}) | Market: ${selectedItem.marketName} ${specialNote ? '· Note: ' + specialNote : ''}`,
    };

    try {
      await onBookGrocery(orderPayload);
      setOrderSuccess(orderDocId);
      setTimeout(() => {
        setOrderSuccess(null);
        onClose();
      }, 2500);
    } catch (err) {
      console.error('Grocery dispatch error:', err);
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
        <div className="px-6 py-4 bg-gradient-to-r from-teal-900 via-slate-900 to-emerald-950 text-white flex items-center justify-between border-b border-teal-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold">Taiwan Market & Local Groceries</h2>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-500/30 text-teal-200">
                  Direct Stall Dispatch
                </span>
              </div>
              <p className="text-xs text-teal-200/80">
                Fresh camel milk, stone-ground berbere, staples & oils delivered in 30 mins
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

        {orderSuccess ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-teal-100 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Grocery Order Placed!</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto">
              Your runner at <strong className="text-slate-900 dark:text-white">{selectedItem.marketName}</strong> ({selectedItem.stallNumber}) is packaging your fresh items.
            </p>
            <p className="text-xs text-slate-500 font-mono">Order Tracking ID: #{orderSuccess}</p>
          </div>
        ) : (
          <form onSubmit={handleCheckout} className="p-6 space-y-6">
            {/* Category Segmented Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
              {categories.map((cat) => (
                <button
                  type="button"
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl border font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    activeCategory === cat
                      ? 'bg-teal-700 text-white border-transparent shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {cat === 'ALL' ? 'All Market Goods' : cat}
                </button>
              ))}
            </div>

            {/* Grocery Items Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    setSelectedItem(item);
                    setQuantity(1);
                  }}
                  className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between ${
                    selectedItem.id === item.id
                      ? 'border-teal-600 bg-teal-50/50 dark:bg-teal-950/30 ring-2 ring-teal-500/20 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white leading-tight">
                        {item.name}
                      </h4>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2 mb-2">{item.description}</p>
                    
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-2">
                      <Store className="w-3 h-3 text-teal-600 shrink-0" />
                      <span className="truncate">{item.marketName} · {item.stallNumber}</span>
                    </div>

                    <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium line-clamp-1 mb-2">
                      🌿 {item.freshnessGuarantee}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400">{item.unit}</span>
                    <span className="font-bold text-teal-800 dark:text-teal-300 text-sm">
                      {item.price} ETB
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Selected Item Detail & Quantity Adjustment */}
            <div className="p-4 bg-teal-50/60 dark:bg-teal-950/20 rounded-xl border border-teal-200 dark:border-teal-900/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="font-bold text-sm text-slate-900 dark:text-white">
                  {selectedItem.name}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                  <span>Vendor: {selectedItem.vendorName}</span>
                  <span aria-hidden="true">·</span>
                  <span>Origin: {selectedItem.origin}</span>
                </div>
              </div>

              {/* Quantity Counter */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Quantity:</span>
                <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-1">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-600 disabled:opacity-30 cursor-pointer"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-8 text-center text-xs font-bold text-slate-900 dark:text-white">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.min(selectedItem.stock, quantity + 1))}
                    disabled={quantity >= selectedItem.stock}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-600 disabled:opacity-30 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <span className="text-xs font-bold text-teal-800 dark:text-teal-300">
                  = {itemsSubtotal} ETB
                </span>
              </div>
            </div>

            {/* Delivery & Payment Form */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Delivery Address / Kebele
                </label>
                <input
                  type="text"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="e.g. Kebele 04, near Taiwan Mosque"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="e.g. +251 91 234 5678"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                >
                  <option value="COD">Cash on Delivery (Courier Handover)</option>
                  <option value="TELEBIRR">Telebirr Wallet</option>
                  <option value="CBE_BIRR">CBE Birr Express</option>
                  <option value="ZAAD">Zaad Service (Telesom)</option>
                  <option value="E_DAHAB">E-Dahab (Somtel)</option>
                </select>
              </div>
            </div>

            {/* Price Summary & Checkout Bar */}
            <div className="p-4 bg-teal-50/80 dark:bg-teal-950/40 rounded-xl border border-teal-200 dark:border-teal-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="text-xs text-teal-900 dark:text-teal-200">
                  <span>Item Subtotal: {itemsSubtotal} ETB</span>
                  <span className="mx-1.5" aria-hidden="true">·</span>
                  <span>Direct Stall Runner: {deliveryFee} ETB</span>
                </div>
                <div className="text-lg font-black text-teal-950 dark:text-white mt-0.5">
                  Total: {totalAmount.toLocaleString()} ETB
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
                  className="w-1/2 sm:w-auto px-6 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>Dispatching Runner...</span>
                  ) : (
                    <>
                      <span>Order from Market</span>
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
