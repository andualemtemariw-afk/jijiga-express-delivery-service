import { useState, FormEvent } from 'react';
import { Batch, Order } from '../types';
import { Package, Clock, ShoppingBag, MessageSquare, Plus, DollarSign, TrendingUp, XCircle, CheckCircle, Tag, Camera, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MamilaGallery, MamilaGalleryItem } from '../components/mamila/MamilaGallery';

interface Props {
  inventory: Batch[];
  orders: Order[];
  onAddBatch?: (batch: Omit<Batch, 'id'>) => void;
  onUpdateBatch?: (batchId: string, updates: Partial<Batch>) => void;
}

export function MamilaView({ inventory, orders, onAddBatch, onUpdateBatch }: Props) {
  const [activeTab, setActiveTab] = useState<'gallery' | 'inventory'>('gallery');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBatchName, setNewBatchName] = useState('');
  const [newBatchDesc, setNewBatchDesc] = useState('');
  const [newBatchPrice, setNewBatchPrice] = useState(400);
  const [newBatchQty, setNewBatchQty] = useState(10);
  const [newBatchExpiry, setNewBatchExpiry] = useState('Today, 7:00 PM');
  const [newBatchCategory, setNewBatchCategory] = useState('Fresh Farm Produce');
  const [newBatchUnit, setNewBatchUnit] = useState('1 bundle (~3 kg)');

  const totalStoreRevenue = orders
    .filter(o => o.status !== 'CANCELLED' && o.status !== 'DEFECT_REJECTED')
    .reduce((sum, o) => sum + o.price, 0);

  const activeOrdersCount = orders.filter(
    o => o.status !== 'DELIVERED' && o.status !== 'RATED' && o.status !== 'CANCELLED' && o.status !== 'DEFECT_REJECTED'
  ).length;

  const handleSelectGalleryBatch = (item: MamilaGalleryItem) => {
    if (onAddBatch) {
      onAddBatch({
        mamilaId: item.mamilaId,
        name: item.batchName,
        description: `${item.grade} · ${item.notes}`,
        price: item.pricePerUnit,
        available: item.availableUnits,
        expiry: `Today (Vault stamped ${item.timestamp})`,
        category: item.category,
        unit: item.unitLabel,
        harvestTime: `Harvested ${item.timestamp} (${item.dateKey})`,
        imageUrl: item.imageUrl,
      });
      setActiveTab('inventory');
    }
  };

  const handleCreateBatch = (e: FormEvent) => {
    e.preventDefault();
    if (!newBatchName.trim() || !onAddBatch) return;

    onAddBatch({
      mamilaId: 'm1',
      name: newBatchName.trim(),
      description: newBatchDesc.trim() || 'Freshly prepared batch ready for runner verification.',
      price: Number(newBatchPrice) || 300,
      available: Number(newBatchQty) || 5,
      expiry: newBatchExpiry,
      category: newBatchCategory,
      unit: newBatchUnit,
      harvestTime: 'Harvested just now',
      imageUrl: '/src/assets/images/fresh_produce_bundle_1790430925858.jpg',
    });

    setShowAddModal(false);
    setNewBatchName('');
    setNewBatchDesc('');
  };

  return (
    <div className="space-y-8">
      {/* Producer Overview Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Fresh Morning Farms (Store m1)</h2>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
              Verified Producer
            </span>
          </div>
          <p className="text-slate-500 text-xs mt-1">
            Bole Facility, Addis Ababa · Operating with real-time atomic inventory locking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab(activeTab === 'gallery' ? 'inventory' : 'gallery')}
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-xl transition cursor-pointer flex items-center gap-1.5"
          >
            {activeTab === 'gallery' ? (
              <>
                <Package className="w-4 h-4 text-blue-600" />
                Manage Stock ({inventory.length})
              </>
            ) : (
              <>
                <Camera className="w-4 h-4 text-emerald-600" />
                Live Proof Vault
              </>
            )}
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 bg-slate-900 text-white font-semibold text-xs md:text-sm rounded-xl hover:bg-slate-800 transition-colors shadow-xs flex items-center gap-2 cursor-pointer w-fit"
          >
            <Plus className="w-4 h-4" />
            Create New Batch
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            <span>Store Gross Sales</span>
          </div>
          <p className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
            {totalStoreRevenue.toLocaleString()} ETB
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">Net payout disbursed via Telebirr</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1">
            <ShoppingBag className="w-4 h-4 text-blue-600" />
            <span>Active Fulfillments</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{activeOrdersCount}</p>
          <span className="text-[11px] text-slate-400 mt-1 block">Pending Runner pickup & tagging</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1">
            <Package className="w-4 h-4 text-amber-600" />
            <span>Units Available</span>
          </div>
          <p className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
            {inventory.reduce((acc, b) => acc + b.available, 0)}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">Across {inventory.length} active batch offerings</span>
        </div>
      </div>

      {/* Primary Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab('gallery')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
            activeTab === 'gallery'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
          }`}
        >
          <Camera className="w-4 h-4 text-emerald-400" />
          <span>Live Daily Batch Gallery</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
            24h Vault
          </span>
        </button>

        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
            activeTab === 'inventory'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
          }`}
        >
          <Package className="w-4 h-4 text-blue-400" />
          <span>Active Batches & Orders</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700 text-slate-200 font-mono">
            {inventory.length} Batches · {orders.length} Orders
          </span>
        </button>
      </div>

      {/* Tab 1: Live Daily Timestamped Batch Gallery */}
      {activeTab === 'gallery' && (
        <MamilaGallery 
          currentMamilaId="m1"
          allowUpload={true}
          onBatchSelected={handleSelectGalleryBatch}
        />
      )}

      {/* Tab 2: Inventory & Orders Manager */}
      {activeTab === 'inventory' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Inventory Manager */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" /> 
              My Active Inventory Batches
            </h3>
            <span className="text-xs text-slate-500 font-mono">{inventory.length} batches</span>
          </div>

          <div className="space-y-4">
            {inventory.length === 0 && (
              <div className="p-8 text-center text-slate-500 text-sm">
                No active batches listed. Click "Create New Batch" to add fresh produce.
              </div>
            )}
            {inventory.map(batch => (
              <div key={batch.id} className="p-4 border border-slate-200 rounded-xl bg-slate-50/70 hover:bg-slate-50 transition-colors space-y-3">
                <div className="flex gap-4 items-start">
                  <img 
                    src={batch.imageUrl} 
                    className="w-20 h-20 rounded-xl object-cover border border-slate-200" 
                    alt={batch.name}
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-slate-900 text-base truncate">{batch.name}</h4>
                      <span className="font-bold font-mono text-blue-600 tabular-nums">{batch.price} ETB</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{batch.description}</p>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-2">
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                      <span>{batch.expiry}</span>
                      {batch.unit && <span className="text-slate-400">· {batch.unit}</span>}
                    </div>
                  </div>
                </div>

                {/* Stock Controls */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-medium">Stock:</span>
                    <span className="font-bold font-mono text-slate-900 bg-white border border-slate-200 px-2 py-0.5 rounded text-sm tabular-nums">
                      {batch.available}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onUpdateBatch?.(batch.id, { available: Math.max(0, batch.available - 1) })}
                      className="px-2.5 py-1 bg-white border border-slate-300 rounded text-slate-700 font-bold hover:bg-slate-100 cursor-pointer"
                      title="Decrease by 1"
                    >
                      -1
                    </button>
                    <button
                      onClick={() => onUpdateBatch?.(batch.id, { available: batch.available + 5 })}
                      className="px-2.5 py-1 bg-white border border-slate-300 rounded text-slate-700 font-bold hover:bg-slate-100 cursor-pointer"
                      title="Restock +5"
                    >
                      +5 Restock
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Orders from My Store */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-emerald-600" /> 
              Orders to Prepare
            </h3>
            <span className="text-xs text-slate-500 font-mono">{orders.length} total</span>
          </div>

          <div className="space-y-4 max-h-[560px] overflow-y-auto pr-1">
            {orders.length === 0 && (
              <div className="text-center py-12 text-slate-500 text-sm">
                No orders have been placed for your store yet today.
              </div>
            )}
            {orders.map(order => (
              <div key={order.id} className="p-4 border border-slate-200 rounded-xl bg-slate-50 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{order.batchName}</h4>
                    <p className="text-xs font-mono text-slate-400 mt-0.5">Order #{order.id}</p>
                  </div>
                  <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${
                    order.status === 'CANCELLED' || order.status === 'DEFECT_REJECTED'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : order.status === 'DELIVERED' || order.status === 'RATED'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-blue-50 text-blue-700 border-blue-200'
                  }`}>
                    {order.status.replace(/_/g, ' ')}
                  </span>
                </div>

                {order.specialInstructions && (
                  <div className="text-xs bg-amber-50/90 border border-amber-200 p-2.5 rounded-lg flex items-start gap-1.5 text-amber-950">
                    <MessageSquare className="w-3.5 h-3.5 text-amber-700 mt-0.5 flex-shrink-0" />
                    <span><strong>Customer Prep Note:</strong> "{order.specialInstructions}"</span>
                  </div>
                )}

                <div className="flex justify-between items-center pt-2 border-t border-slate-200/60 text-xs">
                  <span className="text-slate-600">
                    {order.customerName} ({order.customerCity || 'Jijiga'}) · Qty: {order.quantity || 1}
                  </span>
                  <span className="font-bold font-mono text-slate-900 tabular-nums">
                    {order.price} ETB
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      )}

      {/* CREATE BATCH MODAL */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4"
            >
              <div className="flex justify-between items-start pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-lg text-slate-900">List New Fresh Harvest Batch</h3>
                  <p className="text-xs text-slate-500">Atomic inventory locking will activate immediately.</p>
                </div>
                <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateBatch} className="space-y-3.5 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Batch Title</label>
                  <input
                    type="text"
                    required
                    value={newBatchName}
                    onChange={(e) => setNewBatchName(e.target.value)}
                    placeholder="e.g. Crisp Highland Apples Box"
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                  />
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
                      className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Quantity Available</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={newBatchQty}
                      onChange={(e) => setNewBatchQty(Number(e.target.value))}
                      className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
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

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Packaging Description</label>
                  <input
                    type="text"
                    value={newBatchUnit}
                    onChange={(e) => setNewBatchUnit(e.target.value)}
                    placeholder="e.g. 1 basket (~3.5 kg)"
                    className="w-full p-2.5 rounded-xl border border-slate-200"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Expiry / Best Before</label>
                  <input
                    type="text"
                    value={newBatchExpiry}
                    onChange={(e) => setNewBatchExpiry(e.target.value)}
                    placeholder="Today, 8:00 PM"
                    className="w-full p-2.5 rounded-xl border border-slate-200"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs cursor-pointer"
                  >
                    Publish Batch to Marketplace
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
