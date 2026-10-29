import type { LucideIcon } from 'lucide-react';
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
  Compass,
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
  | 'BUSINESS'
  | 'NEARBY_SERVICES';

interface ServiceGridProps {
  onSelectService: (service: ServiceTarget) => void;
  activeOrdersCount?: number;
}

interface ServiceItem {
  id: ServiceTarget;
  title: string;
  desc: string;
  icon: LucideIcon;
  popular?: boolean;
  isNew?: boolean;
}

interface ServiceGroup {
  id: string;
  title: string;
  items: ServiceItem[];
}

export function ServiceGrid({ onSelectService }: ServiceGridProps) {
  const currentLocale = getLocale();

  const GROUPS: ServiceGroup[] = [
    {
      id: 'move',
      title: currentLocale.superApp?.move || 'Move',
      items: [
        { id: 'RIDE_TAXI', title: currentLocale.superApp?.taxi || 'Taxi & Bajaj', desc: 'Air-conditioned city rides', icon: Car, popular: true },
        { id: 'RIDE_MOTO', title: currentLocale.superApp?.moto || 'Moto Express', desc: 'Beat the traffic on a moto', icon: Bike },
      ],
    },
    {
      id: 'deliver',
      title: currentLocale.superApp?.deliver || 'Deliver',
      items: [
        { id: 'FOOD', title: currentLocale.superApp?.food || 'Food Delivery', desc: 'Local kitchens and restaurants', icon: UtensilsCrossed, popular: true },
        { id: 'PARCEL', title: currentLocale.superApp?.parcel || 'Express Parcel', desc: 'Same-day, tamper-sealed courier', icon: Package },
        { id: 'GROCERY', title: currentLocale.superApp?.grocery || 'Market Grocery', desc: 'Fresh dairy, farm veg and pantry', icon: ShoppingBag },
      ],
    },
    {
      id: 'local',
      title: 'Local Services & Artisans',
      items: [
        { id: 'NEARBY_SERVICES', title: 'Nearby Services Radar', desc: 'Water tankers, solar tech, plumbers, roadside & errando', icon: Compass, popular: true, isNew: true },
        { id: 'EEU', title: currentLocale.superApp?.electricity || 'EEU Electricity', desc: '13-digit meter top-up', icon: Zap, popular: true },
      ],
    },
    {
      id: 'stay',
      title: currentLocale.superApp?.stay || 'Stay & Biz',
      items: [
        { id: 'HOTEL', title: currentLocale.superApp?.hotel || 'Hotel Booking', desc: 'Suites and business rooms', icon: Hotel, isNew: true },
        { id: 'BUSINESS', title: 'Corporate Logistics', desc: 'Scheduled bulk dispatch', icon: Briefcase },
      ],
    },
    {
      id: 'more',
      title: currentLocale.superApp?.more || 'More',
      items: [
        { id: 'KHAT', title: currentLocale.superApp?.khat || 'Khat Marketplace', desc: 'Harar and Aweday mamilas', icon: Leaf },
        { id: 'SUPPORT', title: currentLocale.superApp?.helpCenter || 'Help Center', desc: 'Disputes and tickets, 24/7', icon: Headphones },
      ],
    },
  ];

  return (
    <section aria-labelledby="services-heading" className="space-y-5">
      <header>
        <h2
          id="services-heading"
          className="font-display text-[1.75rem] font-bold leading-[1.1] tracking-tight text-slate-900 sm:text-3xl"
        >
          What do you need today?
        </h2>
        <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-slate-600">
          Food, parcels, rides, rooms and bills, delivered across Jijiga and the Somali Region.
        </p>
      </header>

      <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
        {GROUPS.map((group) => (
          <div key={group.id}>
            <h3 className="mb-1.5 px-1 text-sm font-semibold text-slate-600">{group.title}</h3>
            <ul className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:divide-slate-800">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => onSelectService(item.id)}
                      className="group flex min-h-16 w-full items-center gap-3.5 px-3.5 py-3 text-left transition-colors hover:bg-slate-50 active:bg-slate-100"
                    >
                      {/* Filled tile = most-used service. Quiet tile = everything else. */}
                      <span
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                          item.popular ? 'bg-emerald-700 text-white' : 'bg-emerald-50 text-emerald-800'
                        }`}
                      >
                        <Icon className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span className="text-[15px] font-semibold leading-snug text-slate-900">{item.title}</span>
                          {item.popular && (
                            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-amber-900 dark:bg-amber-400/15 dark:text-amber-300">
                              Popular
                            </span>
                          )}
                          {item.isNew && (
                            <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-emerald-900">
                              New
                            </span>
                          )}
                        </span>
                        <span className="mt-0.5 line-clamp-2 block text-[13px] leading-snug text-slate-600">{item.desc}</span>
                      </span>

                      <ChevronRight
                        className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
