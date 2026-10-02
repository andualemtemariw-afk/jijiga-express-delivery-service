import React from 'react';
import { 
  Search, 
  Filter, 
  Calendar, 
  MapPin, 
  RotateCcw, 
  X, 
  CheckCircle2, 
  Clock, 
  Truck, 
  XCircle,
  AlertCircle
} from 'lucide-react';

export interface OrderFilterState {
  searchQuery: string;
  status: string; // 'ALL' | 'ACTIVE' | 'DELIVERED' | 'CANCELLED' | 'DEFECT_REJECTED' | 'TRANSACTION_PENDING' | 'PICKED_UP'
  city: string; // 'ALL' | specific city name
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

interface OrderSearchFilterBarProps {
  filters: OrderFilterState;
  onFilterChange: (newFilters: Partial<OrderFilterState>) => void;
  onReset: () => void;
  availableCities: string[];
  totalOrders: number;
  filteredOrdersCount: number;
  title?: string;
  className?: string;
}

export const OrderSearchFilterBar: React.FC<OrderSearchFilterBarProps> = ({
  filters,
  onFilterChange,
  onReset,
  availableCities,
  totalOrders,
  filteredOrdersCount,
  title = 'Search & Filter Orders',
  className = '',
}) => {
  const isAnyFilterActive = 
    Boolean(filters.searchQuery.trim()) ||
    filters.status !== 'ALL' ||
    filters.city !== 'ALL' ||
    Boolean(filters.startDate) ||
    Boolean(filters.endDate);

  const handleQuickPreset = (preset: 'all' | 'today' | '7days' | '30days') => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (preset === 'all') {
      onFilterChange({ startDate: '', endDate: '' });
    } else if (preset === 'today') {
      onFilterChange({ startDate: todayStr, endDate: todayStr });
    } else if (preset === '7days') {
      const past = new Date(today);
      past.setDate(today.getDate() - 7);
      onFilterChange({ startDate: past.toISOString().split('T')[0], endDate: todayStr });
    } else if (preset === '30days') {
      const past = new Date(today);
      past.setDate(today.getDate() - 30);
      onFilterChange({ startDate: past.toISOString().split('T')[0], endDate: todayStr });
    }
  };

  return (
    <div className={`p-4 sm:p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 transition-colors ${className}`}>
      {/* Header bar: Title & Match Counter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60">
            <Filter className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>{title}</span>
              {isAnyFilterActive && (
                <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 animate-pulse" />
              )}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Filter by tracking ID, status, calendar date range, or delivery destination
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            Showing <strong className="mx-1 text-blue-600 dark:text-blue-400">{filteredOrdersCount}</strong> of {totalOrders}
          </span>
          {isAnyFilterActive && (
            <button
              type="button"
              onClick={onReset}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer border border-rose-200/60 dark:border-rose-800/60"
              title="Reset all search filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Row 1: Search Keyword and Quick Presets */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        {/* Search input */}
        <div className="md:col-span-7 relative">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={filters.searchQuery}
            onChange={(e) => onFilterChange({ searchQuery: e.target.value })}
            placeholder="Search by Order #, Item, Customer, Mamila, Address..."
            className="w-full text-xs pl-9 pr-8 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/70 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
          {filters.searchQuery && (
            <button
              type="button"
              onClick={() => onFilterChange({ searchQuery: '' })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md transition-colors"
              title="Clear search query"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Quick Date Range Presets */}
        <div className="md:col-span-5 flex items-center gap-1.5 overflow-x-auto pb-0.5">
          <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-1 flex-shrink-0">
            <Calendar className="w-3.5 h-3.5" />
            <span>Preset:</span>
          </span>
          {[
            { id: 'all', label: 'All Time' },
            { id: 'today', label: 'Today' },
            { id: '7days', label: '7 Days' },
            { id: '30days', label: '30 Days' },
          ].map((preset) => {
            const isSelected = 
              (preset.id === 'all' && !filters.startDate && !filters.endDate) ||
              (preset.id === 'today' && filters.startDate === new Date().toISOString().split('T')[0] && filters.endDate === new Date().toISOString().split('T')[0]);
            
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleQuickPreset(preset.id as any)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer border ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Row 2: Status, Delivery City, and Date Range Pickers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
        {/* Status Dropdown */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            <span>Order Status</span>
          </label>
          <select
            value={filters.status}
            onChange={(e) => onFilterChange({ status: e.target.value })}
            className="w-full text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 font-medium cursor-pointer"
          >
            <option value="ALL">All Statuses (Any)</option>
            <option value="ACTIVE">🚚 In Transit / Active</option>
            <option value="DELIVERED">✅ Delivered & Completed</option>
            <option value="TRANSACTION_PENDING">⏳ Transaction Pending</option>
            <option value="RUNNER_ASSIGNED">🏃 Runner Assigned</option>
            <option value="READY_FOR_RIDER">🏷️ Verified & Ready</option>
            <option value="RIDER_ACCEPTED">🛵 Rider Dispatched</option>
            <option value="PICKED_UP">📦 Out for Delivery</option>
            <option value="CANCELLED">❌ Cancelled</option>
            <option value="DEFECT_REJECTED">⚠️ Declined / Rejected</option>
          </select>
        </div>

        {/* Delivery City Dropdown */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
            <MapPin className="w-3 h-3 text-blue-500" />
            <span>Delivery City</span>
          </label>
          <select
            value={filters.city}
            onChange={(e) => onFilterChange({ city: e.target.value })}
            className="w-full text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 font-medium cursor-pointer"
          >
            <option value="ALL">All Cities & Regions</option>
            {availableCities.map((cityName) => (
              <option key={cityName} value={cityName}>
                📍 {cityName}
              </option>
            ))}
          </select>
        </div>

        {/* Date From */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-amber-500" />
            <span>Start Date</span>
          </label>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => onFilterChange({ startDate: e.target.value })}
            className="w-full text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 font-mono cursor-pointer"
          />
        </div>

        {/* Date To */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-amber-500" />
            <span>End Date</span>
          </label>
          <input
            type="date"
            value={filters.endDate}
            min={filters.startDate || undefined}
            onChange={(e) => onFilterChange({ endDate: e.target.value })}
            className="w-full text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 font-mono cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};
