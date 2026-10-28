import { 
  Home, 
  LayoutGrid, 
  Package, 
  ShoppingBag, 
  HelpCircle, 
  User 
} from 'lucide-react';
import { getLocale } from '../../locales';

export type CustomerNavTab = 'home' | 'services' | 'orders' | 'help' | 'profile';

interface BottomNavProps {
  activeTab: CustomerNavTab;
  onSelectTab: (tab: CustomerNavTab) => void;
  cartItemCount?: number;
  onOpenCart?: () => void;
  activeOrdersCount?: number;
}

export function BottomNav({
  activeTab,
  onSelectTab,
  cartItemCount = 0,
  onOpenCart,
  activeOrdersCount = 0,
}: BottomNavProps) {
  const currentLocale = getLocale();

  return (
    <nav 
      aria-label="Mobile Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-lg px-2 py-1.5 md:hidden"
    >
      <div className="max-w-md mx-auto flex items-center justify-around">
        {/* Home */}
        <button
          type="button"
          onClick={() => onSelectTab('home')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition ${
            activeTab === 'home'
              ? 'text-emerald-700 font-bold'
              : 'text-slate-500 hover:text-slate-800 font-medium'
          }`}
        >
          <Home className={`w-5 h-5 ${activeTab === 'home' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] mt-0.5 tracking-tight">{currentLocale.navigation?.home || 'Home'}</span>
        </button>

        {/* Services */}
        <button
          type="button"
          onClick={() => onSelectTab('services')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition ${
            activeTab === 'services'
              ? 'text-emerald-700 font-bold'
              : 'text-slate-500 hover:text-slate-800 font-medium'
          }`}
        >
          <LayoutGrid className={`w-5 h-5 ${activeTab === 'services' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] mt-0.5 tracking-tight">{currentLocale.navigation?.services || 'Services'}</span>
        </button>

        {/* Cart Button (prominent in bottom center) */}
        {onOpenCart && (
          <button
            type="button"
            onClick={onOpenCart}
            aria-label={`Open Cart (${cartItemCount} items)`}
            className="relative -mt-4 p-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full shadow-md transition transform active:scale-95 border-2 border-white"
          >
            <ShoppingBag className="w-5 h-5" />
            {cartItemCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-amber-500 text-slate-950 text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-xs">
                {cartItemCount > 9 ? '9+' : cartItemCount}
              </span>
            )}
          </button>
        )}

        {/* Orders / History */}
        <button
          type="button"
          onClick={() => onSelectTab('orders')}
          className={`relative flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition ${
            activeTab === 'orders'
              ? 'text-emerald-700 font-bold'
              : 'text-slate-500 hover:text-slate-800 font-medium'
          }`}
        >
          <div className="relative">
            <Package className={`w-5 h-5 ${activeTab === 'orders' ? 'stroke-[2.5]' : 'stroke-2'}`} />
            {activeOrdersCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-emerald-600 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full">
                {activeOrdersCount}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">{currentLocale.navigation?.orders || 'Orders'}</span>
        </button>

        {/* Help Center */}
        <button
          type="button"
          onClick={() => onSelectTab('help')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition ${
            activeTab === 'help'
              ? 'text-emerald-700 font-bold'
              : 'text-slate-500 hover:text-slate-800 font-medium'
          }`}
        >
          <HelpCircle className={`w-5 h-5 ${activeTab === 'help' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] mt-0.5 tracking-tight">{currentLocale.navigation?.help || 'Help'}</span>
        </button>

        {/* Profile */}
        <button
          type="button"
          onClick={() => onSelectTab('profile')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition ${
            activeTab === 'profile'
              ? 'text-emerald-700 font-bold'
              : 'text-slate-500 hover:text-slate-800 font-medium'
          }`}
        >
          <User className={`w-5 h-5 ${activeTab === 'profile' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] mt-0.5 tracking-tight">{currentLocale.navigation?.profile || 'Profile'}</span>
        </button>
      </div>
    </nav>
  );
}
