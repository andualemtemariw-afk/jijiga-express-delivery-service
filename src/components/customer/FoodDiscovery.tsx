import { Coffee, Croissant, Leaf, Search, Utensils } from 'lucide-react';
import { Batch, Mamila } from '../../types';

interface FoodDiscoveryProps {
  inventory: Batch[];
  mamilas: Mamila[];
  onCategorySelect: (category: string) => void;
  onSearch: (query: string) => void;
}

const CATEGORY_CHIPS = [
  { label: 'Restaurant & Drinks', title: 'Meals & drinks', icon: Utensils },
  { label: 'Bakery & Pastries', title: 'Bakery & sweets', icon: Croissant },
  { label: 'Fresh Farm Produce', title: 'Fresh produce', icon: Leaf },
  { label: 'Dairy & Eggs', title: 'Dairy & essentials', icon: Coffee },
];

export function FoodDiscovery({ inventory, mamilas, onCategorySelect, onSearch }: FoodDiscoveryProps) {
  const featured = inventory
    .filter(item => item.available > 0 && item.category !== 'Khat Marketplace')
    .slice(0, 3);

  const popularVendors = mamilas
    .filter(vendor => vendor.category !== 'Khat Vendor (Mamila)')
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 4);

  return (
    <section className="space-y-5" aria-labelledby="food-discovery-heading">
      <div className="space-y-3">
        <div>
          <h2 id="food-discovery-heading" className="font-display text-2xl font-bold leading-tight tracking-tight text-slate-900">
            Food and fresh goods
          </h2>
          <p className="mt-1 text-sm text-slate-600">Order from local kitchens and producers, and follow every handoff to your door.</p>
        </div>

        <div className="relative max-w-xl">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
          <input
            type="search"
            aria-label="Search food and restaurants"
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Search food, drinks or a restaurant"
            className="min-h-12 w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-4 text-base text-slate-900 placeholder:text-slate-500 sm:text-sm"
          />
        </div>

        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0">
          <button
            type="button"
            onClick={() => onCategorySelect('ALL')}
            className="inline-flex min-h-11 shrink-0 items-center rounded-full bg-emerald-800 px-4 text-sm font-semibold text-white"
          >
            All
          </button>
          {CATEGORY_CHIPS.map(({ label, title, icon: Icon }) => (
            <button
              key={label}
              type="button"
              onClick={() => onCategorySelect(label)}
              className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 transition-colors hover:border-emerald-500 hover:bg-emerald-50"
            >
              <Icon className="h-4 w-4 text-emerald-700" aria-hidden="true" />
              {title}
            </button>
          ))}
        </div>
      </div>

      {featured.length > 0 && (
        <div>
          <h3 className="mb-2 font-display text-lg font-bold text-slate-900">Available today</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {featured.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSearch(item.name)}
                className="group overflow-hidden rounded-2xl border border-slate-200 bg-white text-left transition-colors hover:border-emerald-500"
              >
                <img
                  src={item.imageUrl}
                  alt=""
                  className="aspect-[16/10] w-full object-cover sm:aspect-[4/3]"
                  referrerPolicy="no-referrer"
                />
                <div className="flex items-baseline justify-between gap-3 p-3">
                  <span className="line-clamp-1 text-sm font-semibold text-slate-900">{item.name}</span>
                  <span className="shrink-0 font-display text-base font-bold tabular-nums text-emerald-800">
                    {item.price} <span className="text-xs font-semibold text-slate-600">ETB</span>
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {popularVendors.length > 0 && (
        <div>
          <h3 className="mb-2 font-display text-lg font-bold text-slate-900">Popular local vendors</h3>
          <ul className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:divide-slate-800">
            {popularVendors.map((vendor) => (
              <li key={vendor.id}>
                <button
                  type="button"
                  onClick={() => onSearch(vendor.name)}
                  className="flex min-h-14 w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-slate-50 active:bg-slate-100"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-slate-900">{vendor.name}</span>
                    <span className="block truncate text-[13px] text-slate-600">{vendor.category || 'Local vendor'}</span>
                  </span>
                  <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold tabular-nums text-amber-900 dark:bg-amber-400/15 dark:text-amber-300">
                    <span aria-hidden="true">★</span> {vendor.rating.toFixed(1)}
                    <span className="sr-only"> out of 5</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
