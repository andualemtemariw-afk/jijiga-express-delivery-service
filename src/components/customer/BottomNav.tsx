import type { LucideIcon } from 'lucide-react';
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

interface NavItemProps {
  icon: LucideIcon;
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: number;
}

/** One tab: the active tab gets a filled pill behind its icon, so state never relies on colour alone. */
function NavItem({ icon: Icon, label, active, onClick, badge = 0 }: NavItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className="flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-slate-600"
    >
      <span
        className={`relative flex h-7 w-12 items-center justify-center rounded-full transition-colors ${
          active ? 'bg-emerald-100 text-emerald-950 dark:text-emerald-50' : ''
        }`}
      >
        <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} aria-hidden="true" />
        {badge > 0 && (
          <span className="absolute -right-0.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-700 px-1 text-[10px] font-bold leading-none text-white">
            <span aria-hidden="true">{badge > 9 ? '9+' : badge}</span>
            <span className="sr-only">{badge} active</span>
          </span>
        )}
      </span>
      <span className={`text-[11px] leading-none ${active ? 'font-bold text-emerald-950 dark:text-emerald-100' : 'font-medium'}`}>
        {label}
      </span>
    </button>
  );
}

export function BottomNav({
  activeTab,
  onSelectTab,
  cartItemCount = 0,
  onOpenCart,
  activeOrdersCount = 0,
}: BottomNavProps) {
  const nav = getLocale().navigation;

  return (
    <nav
      aria-label="Mobile Navigation"
      className="pb-safe fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 px-1 pt-1 backdrop-blur-md dark:bg-slate-900/95 md:hidden"
    >
      <div className="mx-auto flex max-w-md items-end">
        <NavItem icon={Home} label={nav?.home || 'Home'} active={activeTab === 'home'} onClick={() => onSelectTab('home')} />
        <NavItem icon={LayoutGrid} label={nav?.services || 'Services'} active={activeTab === 'services'} onClick={() => onSelectTab('services')} />

        {/* Cart: the one accent on the screen, because it is the one thing you tap to finish */}
        {onOpenCart && (
          <div className="flex flex-1 justify-center">
            <button
              type="button"
              onClick={onOpenCart}
              aria-label={`Open cart (${cartItemCount} items)`}
              className="relative -mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-marigold-500 text-slate-950 shadow-lg shadow-black/20 transition-transform active:scale-95"
            >
              <ShoppingBag className="h-6 w-6" strokeWidth={2.25} aria-hidden="true" />
              {cartItemCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-950 px-1 text-[11px] font-bold leading-none text-white">
                  {cartItemCount > 9 ? '9+' : cartItemCount}
                </span>
              )}
            </button>
          </div>
        )}

        <NavItem icon={Package} label={nav?.orders || 'Orders'} active={activeTab === 'orders'} onClick={() => onSelectTab('orders')} badge={activeOrdersCount} />
        <NavItem icon={HelpCircle} label={nav?.help || 'Help'} active={activeTab === 'help'} onClick={() => onSelectTab('help')} />
        <NavItem icon={User} label={nav?.profile || 'Profile'} active={activeTab === 'profile'} onClick={() => onSelectTab('profile')} />
      </div>
    </nav>
  );
}
