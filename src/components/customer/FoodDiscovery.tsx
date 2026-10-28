import { Coffee, Croissant, Flame, GlassWater, Leaf, Pizza, Search, Sparkles, Store, Utensils } from 'lucide-react';
import { Batch, Mamila } from '../../types';

interface FoodDiscoveryProps {
  inventory: Batch[];
  mamilas: Mamila[];
  onCategorySelect: (category: string) => void;
  onSearch: (query: string) => void;
}

const CATEGORY_CARDS = [
  { label: 'Restaurant & Drinks', title: 'Meals & Drinks', icon: Utensils, tone: 'from-amber-500 to-orange-600' },
  { label: 'Bakery & Pastries', title: 'Bakery & Sweets', icon: Croissant, tone: 'from-rose-500 to-pink-600' },
  { label: 'Fresh Farm Produce', title: 'Fresh Produce', icon: Leaf, tone: 'from-emerald-500 to-teal-600' },
  { label: 'Dairy & Eggs', title: 'Dairy & Essentials', icon: Coffee, tone: 'from-sky-500 to-blue-600' },
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
    <section className="space-y-4" aria-labelledby="food-discovery-heading">
      <div className="rounded-3xl bg-gradient-to-br from-emerald-950 via-emerald-800 to-teal-700 p-5 md:p-6 text-white overflow-hidden relative">
        <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-emerald-300/15" />
        <div className="absolute right-20 -bottom-16 h-40 w-40 rounded-full bg-amber-300/10" />
        <div className="relative max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-100">
            <Sparkles className="h-3.5 w-3.5" /> Curated for your area
          </div>
          <h2 id="food-discovery-heading" className="text-2xl md:text-3xl font-black tracking-tight">
            Good food, fresh goods, delivered with confidence.
          </h2>
          <p className="max-w-xl text-sm leading-relaxed text-emerald-50/85">
            Discover local kitchens and trusted producers, then follow every handoff from order to doorstep.
          </p>
          <div className="relative max-w-md pt-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-900/55" />
            <input
              aria-label="Search food and restaurants"
              onChange={(event) => onSearch(event.target.value)}
              placeholder="Search food, drinks, or a restaurant"
              className="w-full rounded-2xl border-0 bg-white px-10 py-3 text-sm text-slate-900 shadow-lg outline-none ring-0 placeholder:text-slate-400"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between px-1">
        <div>
          <h3 className="text-base font-black text-slate-900">Browse by category</h3>
          <p className="text-xs text-slate-500">Start with what you are craving today.</p>
        </div>
        <button onClick={() => onCategorySelect('ALL')} className="text-xs font-bold text-emerald-700 hover:text-emerald-900">
          View all
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {CATEGORY_CARDS.map(({ label, title, icon: Icon, tone }) => (
          <button
            key={label}
            type="button"
            onClick={() => onCategorySelect(label)}
            className="group overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
          >
            <div className={`flex h-20 items-center justify-center bg-gradient-to-br ${tone} text-white`}>
              <Icon className="h-8 w-8 transition group-hover:scale-110" />
            </div>
            <div className="p-3">
              <div className="text-xs font-extrabold text-slate-900">{title}</div>
              <div className="mt-1 text-[10px] font-medium text-slate-500">Explore local picks</div>
            </div>
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.25fr_1fr]">
        <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="flex items-center gap-1.5 text-base font-black text-slate-900"><Flame className="h-4 w-4 text-orange-600" /> Featured today</h3>
              <p className="text-xs text-slate-600">Freshly available items worth discovering.</p>
            </div>
            <Pizza className="h-6 w-6 text-orange-500" />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {featured.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSearch(item.name)}
                className="overflow-hidden rounded-xl border border-amber-100 bg-white text-left transition hover:border-orange-300 hover:shadow-sm"
              >
                <img src={item.imageUrl} alt="" className="h-24 w-full object-cover" referrerPolicy="no-referrer" />
                <div className="p-2.5">
                  <div className="line-clamp-1 text-xs font-bold text-slate-900">{item.name}</div>
                  <div className="mt-1 text-xs font-black text-emerald-700">{item.price} ETB</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="flex items-center gap-1.5 text-base font-black text-slate-900"><Store className="h-4 w-4 text-emerald-600" /> Popular local vendors</h3>
              <p className="text-xs text-slate-500">Trusted by nearby customers.</p>
            </div>
            <GlassWater className="h-5 w-5 text-sky-500" />
          </div>
          <div className="space-y-2">
            {popularVendors.map((vendor) => (
              <button key={vendor.id} type="button" onClick={() => onSearch(vendor.name)} className="flex w-full items-center justify-between rounded-xl border border-slate-100 p-2.5 text-left transition hover:border-emerald-200 hover:bg-emerald-50/40">
                <span className="min-w-0">
                  <span className="block truncate text-xs font-bold text-slate-900">{vendor.name}</span>
                  <span className="block truncate text-[10px] text-slate-500">{vendor.category || 'Local vendor'}</span>
                </span>
                <span className="ml-3 shrink-0 rounded-full bg-amber-50 px-2 py-1 text-[10px] font-black text-amber-700">★ {vendor.rating.toFixed(1)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
