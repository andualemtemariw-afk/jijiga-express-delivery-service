import { 
  Car, 
  Bike, 
  UtensilsCrossed, 
  Package, 
  ShoppingBag, 
  Hotel, 
  Zap, 
  Leaf, 
  Headphones,
  Briefcase,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { getLocale } from '../../locales';

export type ServiceTarget = 
  | 'RIDE_TAXI'
  | 'RIDE_MOTO'
  | 'FOOD'
  | 'PARCEL'
  | 'GROCERY'
  | 'HOTEL'
  | 'EEU'
  | 'KHAT'
  | 'SUPPORT'
  | 'BUSINESS';

interface ServiceGridProps {
  onSelectService: (service: ServiceTarget) => void;
  activeOrdersCount?: number;
}

export function ServiceGrid({ onSelectService, activeOrdersCount = 0 }: ServiceGridProps) {
  const currentLocale = getLocale();

  const GROUPS = [
    {
      id: 'move',
      title: currentLocale.superApp?.move || 'Move',
      badge: 'Fast transit',
      color: 'from-amber-500/10 to-orange-500/10 text-amber-700 border-amber-200/80',
      items: [
        {
          id: 'RIDE_TAXI' as ServiceTarget,
          title: currentLocale.superApp?.taxi || 'Taxi & Bajaj',
          desc: 'Air-conditioned city rides',
          icon: Car,
          iconBg: 'bg-amber-500 text-white shadow-amber-500/30',
          popular: true,
        },
        {
          id: 'RIDE_MOTO' as ServiceTarget,
          title: currentLocale.superApp?.moto || 'Moto Express',
          desc: 'Traffic-beating courier/commute',
          icon: Bike,
          iconBg: 'bg-orange-500 text-white shadow-orange-500/30',
        },
      ],
    },
    {
      id: 'deliver',
      title: currentLocale.superApp?.deliver || 'Deliver',
      badge: 'Doorstep',
      color: 'from-emerald-500/10 to-teal-500/10 text-emerald-700 border-emerald-200/80',
      items: [
        {
          id: 'FOOD' as ServiceTarget,
          title: currentLocale.superApp?.food || 'Food Delivery',
          desc: 'Local kitchens & restaurants',
          icon: UtensilsCrossed,
          iconBg: 'bg-emerald-600 text-white shadow-emerald-600/30',
          popular: true,
        },
        {
          id: 'PARCEL' as ServiceTarget,
          title: currentLocale.superApp?.parcel || 'Express Parcel',
          desc: 'Same-day tamper-sealed courier',
          icon: Package,
          iconBg: 'bg-blue-600 text-white shadow-blue-600/30',
        },
        {
          id: 'GROCERY' as ServiceTarget,
          title: currentLocale.superApp?.grocery || 'Market Grocery',
          desc: 'Fresh dairy, farm veg & pantry',
          icon: ShoppingBag,
          iconBg: 'bg-teal-600 text-white shadow-teal-600/30',
        },
      ],
    },
    {
      id: 'stay',
      title: currentLocale.superApp?.stay || 'Stay & Biz',
      badge: 'Verified',
      color: 'from-indigo-500/10 to-violet-500/10 text-indigo-700 border-indigo-200/80',
      items: [
        {
          id: 'HOTEL' as ServiceTarget,
          title: currentLocale.superApp?.hotel || 'Hotel Booking',
          desc: 'VIP suites & business rooms',
          icon: Hotel,
          iconBg: 'bg-indigo-600 text-white shadow-indigo-600/30',
          badge: 'New',
        },
        {
          id: 'BUSINESS' as ServiceTarget,
          title: 'Corporate Logistics',
          desc: 'Scheduled bulk dispatch',
          icon: Briefcase,
          iconBg: 'bg-slate-700 text-white shadow-slate-700/30',
        },
      ],
    },
    {
      id: 'more',
      title: currentLocale.superApp?.more || 'More',
      badge: 'Essential',
      color: 'from-purple-500/10 to-pink-500/10 text-purple-700 border-purple-200/80',
      items: [
        {
          id: 'EEU' as ServiceTarget,
          title: currentLocale.superApp?.electricity || 'EEU Electricity',
          desc: '13-digit meter top-up & custody',
          icon: Zap,
          iconBg: 'bg-purple-600 text-white shadow-purple-600/30',
          popular: true,
        },
        {
          id: 'KHAT' as ServiceTarget,
          title: currentLocale.superApp?.khat || 'Khat Marketplace',
          desc: 'Prime Harar & Aweday Mamilas',
          icon: Leaf,
          iconBg: 'bg-lime-600 text-white shadow-lime-600/30',
        },
        {
          id: 'SUPPORT' as ServiceTarget,
          title: currentLocale.superApp?.helpCenter || 'Help Center',
          desc: '24/7 disputes & ticket desk',
          icon: Headphones,
          iconBg: 'bg-rose-600 text-white shadow-rose-600/30',
        },
      ],
    },
  ];

  return (
    <div className="space-y-4">
      {/* Service Grid Section Header */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>Super-App Services</span>
            <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
              <Sparkles className="w-3 h-3 text-emerald-600" /> All-in-One
            </span>
          </h2>
          <p className="text-xs text-slate-500">Pick any service for instant hyperlocal fulfillment in Jijiga & Somali Region</p>
        </div>
      </div>

      {/* Grid of 4 Service Clusters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {GROUPS.map((group) => (
          <div 
            key={group.id} 
            className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-3.5 sm:p-4 space-y-2.5 transition hover:border-slate-300"
          >
            {/* Cluster Header */}
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                {group.title}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border bg-gradient-to-r ${group.color}`}>
                {group.badge}
              </span>
            </div>

            {/* Individual Services */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {group.items.map((item) => {
                const IconComponent = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectService(item.id)}
                    className="group relative flex flex-col items-start p-2.5 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-white hover:border-emerald-300 hover:shadow-xs transition-all text-left"
                  >
                    {item.popular && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Popular" />
                    )}
                    {item.badge && (
                      <span className="absolute top-1.5 right-1.5 text-[9px] font-bold px-1 rounded bg-indigo-100 text-indigo-700 border border-indigo-200">
                        {item.badge}
                      </span>
                    )}

                    <div className={`p-2 rounded-xl shadow-xs transition group-hover:scale-105 ${item.iconBg}`}>
                      <IconComponent className="w-4 h-4" />
                    </div>

                    <div className="mt-2 w-full">
                      <div className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 line-clamp-1">
                        {item.title}
                      </div>
                      <div className="text-[10px] text-slate-500 line-clamp-1 mt-0.5 font-normal">
                        {item.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
