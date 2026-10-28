import { useState, useId } from 'react';
import { 
  X, 
  ShoppingBag, 
  Trash2, 
  Plus, 
  Minus, 
  ArrowRight, 
  ShieldCheck, 
  Store, 
  AlertCircle,
  Banknote,
  CheckCircle2
} from 'lucide-react';
import { Cart, CartItem, Order, Batch } from '../../types';
import { getLocale } from '../../locales';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: Cart;
  inventory: Batch[];
  onUpdateQuantity: (batchId: string, quantity: number) => void;
  onRemoveItem: (batchId: string) => void;
  onClearCart: () => void;
  onCheckout: (orders: Partial<Order>[]) => Promise<void> | void;
  customerProfile: {
    uid?: string;
    id?: string;
    name: string;
    phone: string;
    city: string;
    address?: string;
    plusCode?: string;
  };
}

export function CartDrawer({
  isOpen,
  onClose,
  cart,
  inventory,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onCheckout,
  customerProfile,
}: CartDrawerProps) {
  const currentLocale = getLocale();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [deliveryNotes, setDeliveryNotes] = useState('');

  if (!isOpen) return null;

  const totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  // Validate live stock before checkout
  const handleProceedToCheckout = async () => {
    if (cart.items.length === 0) return;
    if (isSubmitting) return;

    setErrorNotice(null);

    // Verify stock availability
    for (const item of cart.items) {
      const liveBatch = inventory.find(b => b.id === item.batchId);
      if (!liveBatch) {
        setErrorNotice(`Item "${item.name}" is no longer in catalog.`);
        return;
      }
      if (liveBatch.available < item.quantity) {
        setErrorNotice(`Only ${liveBatch.available} unit(s) of "${item.name}" remain in stock.`);
        return;
      }
    }

    if (!customerProfile.phone) {
      setErrorNotice('Please provide a valid contact telephone number before checkout.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Create order payloads (each vendor item converted to compliant order object)
      const orderPayloads: Partial<Order>[] = cart.items.map(item => {
        const orderId = 'ord-' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
        return {
          id: orderId,
          serviceType: 'FOOD',
          batchId: item.batchId,
          batchName: item.name,
          mamilaId: item.mamilaId,
          mamilaName: item.mamilaName,
          mamilaLocation: `${customerProfile.city || 'Jijiga'} Central Market`,
          price: item.price,
          quantity: item.quantity,
          deliveryFee: Math.round(cart.deliveryFee / cart.items.length),
          totalPrice: (item.price * item.quantity) + Math.round(cart.deliveryFee / cart.items.length),
          status: 'PENDING',
          paymentMethod: 'COD',
          paymentStatus: 'UNPAID',
          customerId: customerProfile.uid || customerProfile.id || '',
          customerName: customerProfile.name || 'Customer',
          customerPhone: customerProfile.phone || '',
          customerCity: customerProfile.city || 'Jijiga',
          customerAddress: customerProfile.address || 'Kebele 04, Central Plaza',
          customerPlusCode: customerProfile.plusCode || '8F2P+5H Jijiga',
          specialInstructions: deliveryNotes ? `Note: ${deliveryNotes}` : 'Standard doorstep delivery',
          createdAt: new Date(),
        };
      });

      await onCheckout(orderPayloads);
      setSuccessNotice('Order placed successfully! Cash on delivery upon courier arrival.');
      setTimeout(() => {
        onClearCart();
        setSuccessNotice(null);
        setIsSubmitting(false);
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorNotice(err?.message || 'Checkout failed. Please review stock and retry.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-xs">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                {currentLocale.cart?.title || 'Your Order Cart'}
              </h2>
              <span className="text-xs text-slate-500 font-medium">
                {totalItems} {currentLocale.cart?.itemsCount || 'items'} {cart.vendorName && `• ${cart.vendorName}`}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Alerts & Errors */}
        {errorNotice && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorNotice}</span>
          </div>
        )}
        {successNotice && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successNotice}</span>
          </div>
        )}

        {/* Content / Items List */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
          {cart.items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
              <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
                <ShoppingBag className="w-8 h-8 stroke-1" />
              </div>
              <h3 className="text-base font-bold text-slate-800">
                {currentLocale.cart?.emptyCartTitle || 'Your cart is empty'}
              </h3>
              <p className="text-xs text-slate-500 max-w-xs">
                {currentLocale.cart?.emptyCartDesc || 'Explore fresh food, groceries, or local batches to add items to your cart.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.vendorName && (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100 text-xs text-emerald-900">
                  <div className="flex items-center gap-2 font-bold">
                    <Store className="w-4 h-4 text-emerald-700" />
                    <span>Vendor: {cart.vendorName}</span>
                  </div>
                  <button
                    type="button"
                    onClick={onClearCart}
                    className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" /> Clear
                  </button>
                </div>
              )}

              {cart.items.map((item) => (
                <div 
                  key={item.batchId}
                  className="flex items-start justify-between gap-3 p-3 rounded-xl border border-slate-200/80 bg-white hover:border-slate-300 transition shadow-2xs"
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 truncate">{item.name}</h4>
                    <div className="text-[11px] font-mono text-emerald-700 font-semibold mt-0.5">
                      {item.price} ETB <span className="text-slate-400 font-normal">/ unit</span>
                    </div>
                    <div className="text-[11px] font-bold text-slate-700 mt-1">
                      Total: {item.price * item.quantity} ETB
                    </div>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onUpdateQuantity(item.batchId, item.quantity - 1)}
                      className="p-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs font-bold font-mono px-1 min-w-5 text-center">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => onUpdateQuantity(item.batchId, item.quantity + 1)}
                      className="p-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition"
                      aria-label="Increase quantity"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveItem(item.batchId)}
                      className="p-1 text-slate-400 hover:text-rose-600 transition ml-1"
                      aria-label="Remove item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Delivery Instructions */}
              <div className="pt-2">
                <label className="text-[11px] font-semibold text-slate-600 mb-1 block">
                  Delivery instructions (optional)
                </label>
                <input
                  type="text"
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  placeholder="e.g. Leave with gate keeper, call upon arrival"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Summary & Checkout Footer */}
        {cart.items.length > 0 && (
          <div className="p-4 border-t border-slate-200 bg-slate-50/90 space-y-3">
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>{currentLocale.cart?.subtotal || 'Items Subtotal'}</span>
                <span className="font-mono font-bold text-slate-800">{cart.subtotal} ETB</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>{currentLocale.cart?.deliveryFee || 'Delivery Fee'}</span>
                <span className="font-mono font-bold text-slate-800">{cart.deliveryFee} ETB</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>{currentLocale.cart?.serviceFee || 'Platform Fee'}</span>
                <span className="font-mono font-bold text-slate-800">{cart.serviceFee} ETB</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-black text-slate-900">
                <span>{currentLocale.cart?.total || 'Total to Pay (COD)'}</span>
                <span className="font-mono text-emerald-700 text-base">{cart.total} ETB</span>
              </div>
            </div>

            {/* Payment Badge */}
            <div className="flex items-center gap-2 p-2 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-900 text-[11px]">
              <Banknote className="w-4 h-4 text-amber-700 shrink-0" />
              <span><strong>Cash on Delivery (COD)</strong> • Verified driver collection at your door.</span>
            </div>

            {/* Checkout Action Button */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleProceedToCheckout}
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition active:scale-98"
            >
              {isSubmitting ? (
                <span>Confirming Order...</span>
              ) : (
                <>
                  <span>{currentLocale.cart?.checkoutCod || 'Place Order (Cash on Delivery)'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
