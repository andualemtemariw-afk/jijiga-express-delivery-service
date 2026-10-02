import React, { useState, useEffect, useMemo } from 'react';
import { 
  Camera, 
  Clock, 
  Calendar, 
  ShieldCheck, 
  Upload, 
  RefreshCw, 
  Sparkles, 
  Eye, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  ExternalLink,
  X,
  Filter,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface MamilaGalleryItem {
  id: string;
  mamilaId: string;
  mamilaName: string;
  batchName: string;
  category: string;
  grade: string;
  dateKey: string; // YYYY-MM-DD
  timestamp: string; // e.g. 06:45 AM
  fullTimestamp: string;
  storageUrl: string; // Cloud storage bucket path
  imageUrl: string;
  qcStatus: 'VERIFIED' | 'PENDING_REVIEW' | 'RUNNER_CONFIRMED';
  inspectorName?: string;
  hoursRemaining: number; // 24-hr expiration window
  pricePerUnit: number;
  availableUnits: number;
  unitLabel: string;
  notes: string;
}

// Mock dataset categorized by YYYY-MM-DD keys
const MOCK_STORAGE_GALLERY: Record<string, MamilaGalleryItem[]> = {
  // Current / Today
  '2026-09-30': [
    {
      id: 'gal-30-01',
      mamilaId: 'm1',
      mamilaName: 'Fresh Morning Farms',
      batchName: 'Morning Crisp Highland Greens & Herbs',
      category: 'Fresh Farm Produce',
      grade: 'Grade A+ (Prime Sunrise Pick)',
      dateKey: '2026-09-30',
      timestamp: '06:15 AM',
      fullTimestamp: '2026-09-30T06:15:22+03:00',
      storageUrl: 'gs://jijiga-mamila-vault/2026-09-30/m1/batch_0615_prime.jpg',
      imageUrl: '/src/assets/images/fresh_produce_bundle_1790430925858.jpg',
      qcStatus: 'VERIFIED',
      inspectorName: 'Runner Tariq (Badge #402)',
      hoursRemaining: 19,
      pricePerUnit: 350,
      availableUnits: 14,
      unitLabel: '1 bundle (~3 kg)',
      notes: 'Harvested directly from North Greenbelt field before sunrise. Crisp foliage, zero discoloration.'
    },
    {
      id: 'gal-30-02',
      mamilaId: 'm1',
      mamilaName: 'Fresh Morning Farms',
      batchName: 'Highland Ripe Red Tomato Crates',
      category: 'Fresh Farm Produce',
      grade: 'Grade A (Market Firm)',
      dateKey: '2026-09-30',
      timestamp: '07:30 AM',
      fullTimestamp: '2026-09-30T07:30:10+03:00',
      storageUrl: 'gs://jijiga-mamila-vault/2026-09-30/m1/batch_0730_tomatoes.jpg',
      imageUrl: '/src/assets/images/fresh_produce_bundle_1790430925858.jpg',
      qcStatus: 'RUNNER_CONFIRMED',
      inspectorName: 'Quality Lead Amina',
      hoursRemaining: 21,
      pricePerUnit: 480,
      availableUnits: 8,
      unitLabel: '1 crate (~5 kg)',
      notes: 'Stem-on vine tomatoes. Inspected for transit firmness, 5% standard market weight tolerance applied.'
    },
    {
      id: 'gal-30-03',
      mamilaId: 'm2',
      mamilaName: 'Arada Bakery',
      batchName: 'Golden Honey Glazed Sourdough Pastries',
      category: 'Bakery & Pastries',
      grade: 'Artisan Oven Batch #1',
      dateKey: '2026-09-30',
      timestamp: '05:45 AM',
      fullTimestamp: '2026-09-30T05:45:00+03:00',
      storageUrl: 'gs://jijiga-mamila-vault/2026-09-30/m2/batch_0545_pastry.jpg',
      imageUrl: '/src/assets/images/artisan_pastry_box_1790430934857.jpg',
      qcStatus: 'VERIFIED',
      inspectorName: 'Chef Dawit',
      hoursRemaining: 18,
      pricePerUnit: 420,
      availableUnits: 20,
      unitLabel: '1 box (6 pieces)',
      notes: 'Freshly baked at 4:30 AM. Sealed in eco-friendly steam-vented boxes.'
    },
    {
      id: 'gal-30-04',
      mamilaId: 'm3',
      mamilaName: 'Sheger Dairy',
      batchName: 'Unpasteurized Raw Farm Milk & Butter',
      category: 'Dairy & Eggs',
      grade: 'First Morning Milking',
      dateKey: '2026-09-30',
      timestamp: '06:00 AM',
      fullTimestamp: '2026-09-30T06:00:30+03:00',
      storageUrl: 'gs://jijiga-mamila-vault/2026-09-30/m3/batch_0600_dairy.jpg',
      imageUrl: '/src/assets/images/dairy_farm_essentials_1790430944133.jpg',
      qcStatus: 'VERIFIED',
      inspectorName: 'Sanitation Officer Nur',
      hoursRemaining: 18,
      pricePerUnit: 290,
      availableUnits: 15,
      unitLabel: '1 glass jar (2 Liters)',
      notes: 'Chilled immediately at 4°C. Certified grass-fed livestock origins.'
    }
  ],
  // Yesterday
  '2026-09-29': [
    {
      id: 'gal-29-01',
      mamilaId: 'm1',
      mamilaName: 'Fresh Morning Farms',
      batchName: 'Day-Prior Organic Baby Spinach',
      category: 'Fresh Farm Produce',
      grade: 'Grade B+ (Standard Leaf)',
      dateKey: '2026-09-29',
      timestamp: '06:50 AM',
      fullTimestamp: '2026-09-29T06:50:00+03:00',
      storageUrl: 'gs://jijiga-mamila-vault/2026-09-29/m1/batch_0650_spinach.jpg',
      imageUrl: '/src/assets/images/fresh_produce_bundle_1790430925858.jpg',
      qcStatus: 'VERIFIED',
      inspectorName: 'Quality Lead Amina',
      hoursRemaining: 0,
      pricePerUnit: 280,
      availableUnits: 0,
      unitLabel: '1 bundle (~2.5 kg)',
      notes: 'Batch archived. 24-hour freshness TTL expired; all orders fulfilled.'
    },
    {
      id: 'gal-29-02',
      mamilaId: 'm2',
      mamilaName: 'Arada Bakery',
      batchName: 'Yesterday Savory Brioche Buns',
      category: 'Bakery & Pastries',
      grade: 'Afternoon Bake',
      dateKey: '2026-09-29',
      timestamp: '02:15 PM',
      fullTimestamp: '2026-09-29T14:15:00+03:00',
      storageUrl: 'gs://jijiga-mamila-vault/2026-09-29/m2/batch_1415_brioche.jpg',
      imageUrl: '/src/assets/images/artisan_pastry_box_1790430934857.jpg',
      qcStatus: 'VERIFIED',
      inspectorName: 'Runner Tariq',
      hoursRemaining: 0,
      pricePerUnit: 360,
      availableUnits: 0,
      unitLabel: '1 box (4 pieces)',
      notes: 'Archived batch record.'
    }
  ]
};

/**
 * Mock fetcher function querying by YYYY-MM-DD keys with simulated network latency.
 */
export async function fetchDailyMamilaBatchGallery(
  dateKey: string, 
  filterMamilaId?: string
): Promise<MamilaGalleryItem[]> {
  // Simulate cloud storage API latency (250ms)
  await new Promise(res => setTimeout(res, 260));

  const items = MOCK_STORAGE_GALLERY[dateKey] || [];
  if (filterMamilaId) {
    return items.filter(item => item.mamilaId === filterMamilaId);
  }
  return items;
}

interface MamilaGalleryProps {
  currentMamilaId?: string; // If provided, highlights or filters to this specific Mamila
  allowUpload?: boolean;
  onBatchSelected?: (batch: MamilaGalleryItem) => void;
}

export const MamilaGallery: React.FC<MamilaGalleryProps> = ({
  currentMamilaId = 'm1',
  allowUpload = true,
  onBatchSelected
}) => {
  // Default to today's date formatted as YYYY-MM-DD
  const [selectedDate, setSelectedDate] = useState<string>('2026-09-30');
  const [galleryItems, setGalleryItems] = useState<MamilaGalleryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [filterOnlyMine, setFilterOnlyMine] = useState<boolean>(false);
  const [activeItem, setActiveItem] = useState<MamilaGalleryItem | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // New Live Batch Upload Modal State
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [newBatchTitle, setNewBatchTitle] = useState<string>('');
  const [newBatchGrade, setNewBatchGrade] = useState<string>('Grade A+ (Prime Sunrise Pick)');
  const [newBatchCategory, setNewBatchCategory] = useState<string>('Fresh Farm Produce');
  const [newBatchPrice, setNewBatchPrice] = useState<number>(380);
  const [newBatchUnits, setNewBatchUnits] = useState<number>(12);
  const [newBatchNotes, setNewBatchNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [uploadSuccessToast, setUploadSuccessToast] = useState<string | null>(null);

  // Load items on date change or manual refresh
  const loadGallery = async (dateKey: string) => {
    setLoading(true);
    try {
      const data = await fetchDailyMamilaBatchGallery(dateKey);
      setGalleryItems(data);
    } catch (err) {
      console.error('Failed to fetch daily Mamila batch gallery', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadGallery(selectedDate);
  }, [selectedDate]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadGallery(selectedDate);
  };

  // Filtered list
  const filteredItems = useMemo(() => {
    return galleryItems.filter(item => {
      const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
      const matchesMamila = !filterOnlyMine || item.mamilaId === currentMamilaId;
      return matchesCategory && matchesMamila;
    });
  }, [galleryItems, selectedCategory, filterOnlyMine, currentMamilaId]);

  // Handle mock batch upload
  const handleLiveBatchUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBatchTitle.trim()) return;

    setIsSubmitting(true);
    setTimeout(() => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      const newEntry: MamilaGalleryItem = {
        id: `gal-live-${Date.now()}`,
        mamilaId: currentMamilaId,
        mamilaName: currentMamilaId === 'm1' ? 'Fresh Morning Farms' : 'Mamila Partner Store',
        batchName: newBatchTitle.trim(),
        category: newBatchCategory,
        grade: newBatchGrade,
        dateKey: selectedDate,
        timestamp: timeStr,
        fullTimestamp: now.toISOString(),
        storageUrl: `gs://jijiga-mamila-vault/${selectedDate}/${currentMamilaId}/batch_${Date.now()}.jpg`,
        imageUrl: '/src/assets/images/fresh_produce_bundle_1790430925858.jpg',
        qcStatus: 'VERIFIED',
        inspectorName: 'Mamila Verified Self-Seal',
        hoursRemaining: 24,
        pricePerUnit: Number(newBatchPrice) || 350,
        availableUnits: Number(newBatchUnits) || 10,
        unitLabel: '1 bundle (~3 kg)',
        notes: newBatchNotes.trim() || 'Uploaded to live cloud vault with cryptographic timestamp.'
      };

      // Add to mock collection
      if (!MOCK_STORAGE_GALLERY[selectedDate]) {
        MOCK_STORAGE_GALLERY[selectedDate] = [];
      }
      MOCK_STORAGE_GALLERY[selectedDate].unshift(newEntry);
      setGalleryItems([newEntry, ...galleryItems]);

      setIsSubmitting(false);
      setShowUploadModal(false);
      setNewBatchTitle('');
      setNewBatchNotes('');
      setUploadSuccessToast('Live Batch published & synced to Cloud Vault!');
      setTimeout(() => setUploadSuccessToast(null), 4000);
    }, 600);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Header section with Live Batch Banner */}
      <div className="p-5 sm:p-6 border-b border-slate-200 bg-linear-to-r from-emerald-950 via-slate-900 to-slate-950 text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-bold tracking-wider uppercase text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-500/30">
                24-Hour Automated Freshness Vault
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                Key: {selectedDate}
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Camera className="w-5 h-5 text-emerald-400" />
              Mamila Live Batch Proof Gallery
            </h3>
            <p className="text-xs text-slate-300 max-w-xl">
              High-resolution daily timestamped photographs of fresh harvests, leaf grades, and batch preparation. 
              Automatically rotates every 24 hours to ensure verifiable harvest freshness.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-xl text-slate-200 border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
              title="Refresh cloud gallery"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
              Sync
            </button>

            {allowUpload && (
              <button
                onClick={() => setShowUploadModal(true)}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-xs font-bold rounded-xl text-white shadow-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                Upload Live Batch Photo
              </button>
            )}
          </div>
        </div>

        {/* Date Selector Pills */}
        <div className="flex items-center gap-2 mt-5 pt-4 border-t border-slate-800/80 overflow-x-auto text-xs">
          <span className="text-slate-400 flex items-center gap-1 mr-1 text-[11px] font-medium">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            Archive Date:
          </span>
          <button
            onClick={() => setSelectedDate('2026-09-30')}
            className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer flex items-center gap-1.5 ${
              selectedDate === '2026-09-30'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <span>Today (2026-09-30)</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
          </button>

          <button
            onClick={() => setSelectedDate('2026-09-29')}
            className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
              selectedDate === '2026-09-29'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
            }`}
          >
            Yesterday (2026-09-29)
          </button>

          <div className="ml-auto text-[11px] text-emerald-300 font-mono hidden sm:flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            Cloud Storage Retention Policy: 24h Active TTL
          </div>
        </div>
      </div>

      {/* Filter and View Control Bar */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-slate-500 font-medium flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            Category:
          </span>
          {['ALL', 'Fresh Farm Produce', 'Bakery & Pastries', 'Dairy & Eggs'].map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-lg text-xs transition cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-white font-semibold shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {cat === 'ALL' ? 'All Batches' : cat}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-slate-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={filterOnlyMine}
              onChange={(e) => setFilterOnlyMine(e.target.checked)}
              className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
            />
            <span className="text-xs font-medium">Show only My Store (m1)</span>
          </label>
        </div>
      </div>

      {/* Toast Notification */}
      <AnimatePresence>
        {uploadSuccessToast && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="m-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2 shadow-xs"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{uploadSuccessToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Grid View */}
      <div className="p-5 sm:p-6">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="h-44 bg-slate-200 rounded-xl w-full" />
                <div className="h-4 bg-slate-200 rounded-md w-3/4" />
                <div className="h-3 bg-slate-200 rounded-md w-1/2" />
                <div className="h-8 bg-slate-100 rounded-lg w-full" />
              </div>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-16 px-4 space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Camera className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-800 text-base">No Batch Captures for {selectedDate}</h4>
            <p className="text-slate-500 text-xs max-w-sm mx-auto">
              No live proof uploads found matching your filter criteria. Produce batches expire from the public listing after 24 hours.
            </p>
            {allowUpload && (
              <button
                onClick={() => setShowUploadModal(true)}
                className="mt-2 px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-800 transition inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                Upload Proof for {selectedDate}
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredItems.map(item => {
              const isExpired = item.hoursRemaining <= 0;
              return (
                <div
                  key={item.id}
                  className="group border border-slate-200 hover:border-emerald-300 rounded-2xl overflow-hidden bg-white shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Image with timestamp watermark & QC tag */}
                    <div className="relative aspect-4/3 bg-slate-100 overflow-hidden">
                      <img
                        src={item.imageUrl}
                        alt={item.batchName}
                        className="w-full h-full object-cover group-hover:scale-103 transition duration-300"
                        referrerPolicy="no-referrer"
                      />

                      {/* Freshness TTL badge */}
                      <div className="absolute top-2.5 left-2.5">
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md flex items-center gap-1 backdrop-blur-md shadow-xs ${
                            isExpired
                              ? 'bg-rose-950/80 text-rose-300 border border-rose-500/40'
                              : 'bg-slate-950/80 text-emerald-400 border border-emerald-500/40'
                          }`}
                        >
                          <Clock className="w-3 h-3 text-emerald-400" />
                          {isExpired ? 'TTL EXPIRED' : `${item.hoursRemaining}h Freshness Window`}
                        </span>
                      </div>

                      {/* Verified Badge */}
                      <div className="absolute top-2.5 right-2.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500 text-slate-950 flex items-center gap-1 shadow-xs">
                          <CheckCircle2 className="w-3 h-3" />
                          {item.qcStatus}
                        </span>
                      </div>

                      {/* Live Cryptographic Timestamp Watermark */}
                      <div className="absolute bottom-2.5 left-2.5 right-2.5 bg-slate-950/85 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-white/10 text-white flex items-center justify-between text-[10px] font-mono">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-300 font-bold">{item.timestamp}</span>
                          <span className="text-slate-400">· {item.dateKey}</span>
                        </div>
                        <span className="text-slate-400 text-[9px] truncate max-w-[100px]">
                          {item.storageUrl.split('/').pop()}
                        </span>
                      </div>
                    </div>

                    {/* Metadata body */}
                    <div className="p-4 space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-600 tracking-wider">
                            {item.category}
                          </span>
                          <h4 className="font-bold text-slate-900 text-sm leading-snug group-hover:text-emerald-700 transition">
                            {item.batchName}
                          </h4>
                          <p className="text-[11px] text-slate-500 font-medium">
                            Store: {item.mamilaName}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="font-bold font-mono text-emerald-700 text-sm tabular-nums">
                            {item.pricePerUnit} ETB
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {item.unitLabel}
                          </span>
                        </div>
                      </div>

                      {/* Grade tag */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                          {item.grade}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium">
                          Stock: <strong className="text-slate-800">{item.availableUnits} left</strong>
                        </span>
                      </div>

                      {/* Notes / Inspector verification */}
                      <p className="text-xs text-slate-600 line-clamp-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                        {item.notes}
                      </p>
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="p-4 pt-0 flex items-center gap-2">
                    <button
                      onClick={() => setActiveItem(item)}
                      className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-600" />
                      View Full Proof
                    </button>

                    {onBatchSelected && !isExpired && (
                      <button
                        onClick={() => onBatchSelected(item)}
                        className="py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1 transition cursor-pointer shadow-xs"
                        title="Use this batch for active inventory order"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Select
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FOOTER AUDIT NOTICE */}
      <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>
            Tamper-proof storage validation enabled for Jijiga regional delivery network.
          </span>
        </div>
        <div className="font-mono text-[11px] text-slate-400">
          Bucket URI: gs://jijiga-mamila-vault/{selectedDate}/*
        </div>
      </div>

      {/* FULL-IMAGE PREVIEW MODAL */}
      <AnimatePresence>
        {activeItem && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
                <div>
                  <h3 className="font-bold text-base">{activeItem.batchName}</h3>
                  <p className="text-xs text-emerald-400 font-mono">
                    Captured: {activeItem.dateKey} at {activeItem.timestamp}
                  </p>
                </div>
                <button
                  onClick={() => setActiveItem(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="overflow-y-auto p-5 space-y-4">
                <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100 aspect-16/10">
                  <img
                    src={activeItem.imageUrl}
                    alt={activeItem.batchName}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-3 left-3 bg-slate-950/90 text-white text-[11px] px-3 py-1.5 rounded-lg font-mono flex items-center gap-2 border border-slate-700">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Cryptographic Stamp: {activeItem.fullTimestamp}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <span className="text-slate-400 text-[10px] block font-medium">Quality Grade</span>
                    <strong className="text-slate-900 font-semibold">{activeItem.grade}</strong>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <span className="text-slate-400 text-[10px] block font-medium">Category</span>
                    <strong className="text-slate-900 font-semibold">{activeItem.category}</strong>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <span className="text-slate-400 text-[10px] block font-medium">Freshness Window</span>
                    <strong className="text-emerald-700 font-semibold">{activeItem.hoursRemaining} Hours Left</strong>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <span className="text-slate-400 text-[10px] block font-medium">Batch Unit Price</span>
                    <strong className="text-blue-700 font-bold">{activeItem.pricePerUnit} ETB</strong>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1.5">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    Producer Inspection & Farm Sourcing Notes
                  </div>
                  <p className="text-slate-600">{activeItem.notes}</p>
                  {activeItem.inspectorName && (
                    <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-200">
                      Sign-off Verification: <strong>{activeItem.inspectorName}</strong>
                    </div>
                  )}
                </div>

                <div className="bg-slate-900 text-slate-300 p-3 rounded-xl text-xs font-mono break-all space-y-1">
                  <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                    Cloud Storage Object Reference
                  </div>
                  <div className="text-emerald-400">{activeItem.storageUrl}</div>
                </div>
              </div>

              <div className="p-4 border-t border-slate-200 flex justify-end gap-2 bg-slate-50">
                <button
                  onClick={() => setActiveItem(null)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Close Proof
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* UPLOAD LIVE BATCH MODAL */}
      <AnimatePresence>
        {showUploadModal && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden"
            >
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-slate-900">Upload Live Batch Proof</h3>
                  <p className="text-xs text-slate-500">Sync fresh harvest photo to today's cloud vault</p>
                </div>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleLiveBatchUpload} className="p-5 space-y-4 text-xs">
                {/* Simulated Camera viewfinder */}
                <div className="border-2 border-dashed border-emerald-300 bg-emerald-50/60 rounded-xl p-4 text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-bold text-emerald-950 block">Live Timestamp Camera Triggered</span>
                    <span className="text-[11px] text-emerald-700">Photo will be stamped with: {selectedDate} · {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Target URI: gs://jijiga-mamila-vault/{selectedDate}/{currentMamilaId}/live_snap.jpg
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Batch Name / Produce Title</label>
                  <input
                    type="text"
                    required
                    value={newBatchTitle}
                    onChange={(e) => setNewBatchTitle(e.target.value)}
                    placeholder="e.g. Crisp Highland Mint & Herb Selection"
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Leaf / Harvest Grade</label>
                    <select
                      value={newBatchGrade}
                      onChange={(e) => setNewBatchGrade(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-white"
                    >
                      <option value="Grade A+ (Prime Sunrise Pick)">Grade A+ (Prime Sunrise)</option>
                      <option value="Grade A (First Flush Standard)">Grade A (First Flush)</option>
                      <option value="Export Quality Inspected">Export Quality</option>
                      <option value="Fresh Daily Standard">Fresh Daily Standard</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Category</label>
                    <select
                      value={newBatchCategory}
                      onChange={(e) => setNewBatchCategory(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-white"
                    >
                      <option value="Fresh Farm Produce">Fresh Farm Produce</option>
                      <option value="Bakery & Pastries">Bakery & Pastries</option>
                      <option value="Dairy & Eggs">Dairy & Eggs</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Price (ETB)</label>
                    <input
                      type="number"
                      required
                      min={50}
                      value={newBatchPrice}
                      onChange={(e) => setNewBatchPrice(Number(e.target.value))}
                      className="w-full p-2.5 rounded-xl border border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Available Units</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={newBatchUnits}
                      onChange={(e) => setNewBatchUnits(Number(e.target.value))}
                      className="w-full p-2.5 rounded-xl border border-slate-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Harvest / Proof Inspection Notes</label>
                  <textarea
                    rows={2}
                    value={newBatchNotes}
                    onChange={(e) => setNewBatchNotes(e.target.value)}
                    placeholder="e.g. Crisp foliage, zero bruising, plucked 30 mins prior to upload."
                    className="w-full p-2.5 rounded-xl border border-slate-200"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(false)}
                    className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Uploading to Vault...
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Publish Live Batch Proof
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
