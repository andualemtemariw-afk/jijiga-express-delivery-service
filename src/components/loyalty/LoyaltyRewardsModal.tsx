import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Award, 
  Sparkles, 
  Gift, 
  CheckCircle2, 
  X, 
  ArrowRight, 
  ShieldCheck, 
  Zap, 
  Star,
  Clock,
  TrendingUp,
  Tag
} from 'lucide-react';
import { LoyaltyAccount, LoyaltyReward, AppUserProfile } from '../../types';

interface LoyaltyRewardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: any;
  customerProfile?: AppUserProfile | null;
  onRedeemReward?: (reward: LoyaltyReward) => void;
}

const AVAILABLE_REWARDS: LoyaltyReward[] = [
  {
    id: 'rew_25_off',
    title: '25 ETB Instant Order Discount',
    pointsCost: 250,
    discountEtb: 25,
    minOrderEtb: 200,
    description: 'Valid across Food, Groceries, Parcels, or Khat'
  },
  {
    id: 'rew_50_off',
    title: '50 ETB Instant Order Discount',
    pointsCost: 500,
    discountEtb: 50,
    minOrderEtb: 400,
    description: 'Applies automatically to your order subtotal'
  },
  {
    id: 'rew_free_delivery',
    title: 'Free Express Courier Delivery (150 ETB)',
    pointsCost: 750,
    discountEtb: 150,
    description: '100% waiver of local intra-city delivery fee'
  },
  {
    id: 'rew_hotel_voucher',
    title: '200 ETB Regional Hotel Stay Voucher',
    pointsCost: 1200,
    discountEtb: 200,
    description: 'Valid for Hassan Wali, Crown, or Mansoor Hotel stays'
  }
];

export function LoyaltyRewardsModal({
  isOpen,
  onClose,
  currentUser,
  customerProfile,
  onRedeemReward,
}: LoyaltyRewardsModalProps) {
  // Load or initialize loyalty state from localStorage
  const userId = currentUser?.uid || 'guest';
  const storageKey = `jijiga_loyalty_${userId}`;

  const [loyalty, setLoyalty] = useState<LoyaltyAccount>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch {}

    return {
      userId,
      pointsBalance: 480,
      lifetimePoints: 1250,
      tier: 'SILVER',
      tierLabel: 'Silver Habesha Member',
      discountPct: 5,
      perks: [
        '10 Points earned per 100 ETB spent',
        'Redeem points for instant cash discounts',
        'Priority 10-minute runner allocation',
        'Dedicated WhatsApp concierge dispatch'
      ],
      history: [
        {
          id: 'hist_1',
          type: 'EARNED',
          points: 85,
          description: 'Abo Mismar Prime Khat delivery completed',
          timestamp: 'Yesterday, 2:15 PM'
        },
        {
          id: 'hist_2',
          type: 'EARNED',
          points: 45,
          description: 'Fresh Farm Produce bundle delivered',
          timestamp: '3 days ago'
        },
        {
          id: 'hist_3',
          type: 'BONUS',
          points: 150,
          description: 'Welcome bonus & profile verification',
          timestamp: 'Initial Signup'
        }
      ]
    };
  });

  const [redeemNotice, setRedeemNotice] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(loyalty));
    } catch {}
  }, [loyalty, storageKey]);

  if (!isOpen) return null;

  // Next tier threshold calculations
  const nextTierPoints = loyalty.tier === 'BRONZE' ? 500 : loyalty.tier === 'SILVER' ? 1500 : 5000;
  const progressPct = Math.min(100, Math.round((loyalty.pointsBalance / nextTierPoints) * 100));

  const handleRedeem = (reward: LoyaltyReward) => {
    if (loyalty.pointsBalance < reward.pointsCost) {
      alert(`You need ${reward.pointsCost - loyalty.pointsBalance} more points to redeem this reward.`);
      return;
    }

    const updated: LoyaltyAccount = {
      ...loyalty,
      pointsBalance: loyalty.pointsBalance - reward.pointsCost,
      history: [
        {
          id: `hist_${Date.now()}`,
          type: 'REDEEMED',
          points: -reward.pointsCost,
          description: `Redeemed: ${reward.title}`,
          timestamp: 'Just now'
        },
        ...loyalty.history
      ]
    };

    setLoyalty(updated);
    setRedeemNotice(`Redeemed "${reward.title}"! Applied ${reward.discountEtb} ETB credit.`);
    onRedeemReward?.(reward);
    setTimeout(() => setRedeemNotice(null), 3500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-amber-900 via-slate-900 to-amber-950 text-white flex items-center justify-between border-b border-amber-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold">Jijiga Express Loyalty & Rewards</h2>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-200">
                  {loyalty.tier}
                </span>
              </div>
              <p className="text-xs text-amber-200/80">
                Earn points automatically with every order across Ethiopia and Somaliland
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {redeemNotice && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{redeemNotice}</span>
            </div>
          )}

          {/* Membership Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-700 via-amber-800 to-slate-900 text-white shadow-lg relative overflow-hidden">
            <div className="flex items-start justify-between relative z-10">
              <div>
                <div className="text-xs text-amber-200 font-medium tracking-wide">
                  JIJIGA EXPRESS REWARDS CLUB
                </div>
                <div className="text-xl sm:text-2xl font-black mt-1">
                  {loyalty.tierLabel}
                </div>
                <div className="text-xs text-amber-100/80 mt-0.5">
                  Member: {customerProfile?.displayName || currentUser?.displayName || 'Customer'}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-amber-200">Available Balance</div>
                <div className="text-2xl sm:text-3xl font-black text-amber-300">
                  {loyalty.pointsBalance} <span className="text-sm font-normal text-amber-200">Pts</span>
                </div>
                <div className="text-[11px] text-amber-200/80 mt-0.5">
                  ≈ {(loyalty.pointsBalance / 10).toFixed(0)} ETB in cash discounts
                </div>
              </div>
            </div>

            {/* Progress to Next Tier */}
            <div className="mt-4 pt-3 border-t border-amber-600/50 relative z-10">
              <div className="flex items-center justify-between text-xs text-amber-200 mb-1.5">
                <span>Progress to {loyalty.tier === 'BRONZE' ? 'Silver' : loyalty.tier === 'SILVER' ? 'Gold VIP' : 'Diamond'}</span>
                <span>{loyalty.pointsBalance} / {nextTierPoints} Pts ({progressPct}%)</span>
              </div>
              <div className="w-full h-2 bg-black/30 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-amber-300 to-amber-100 rounded-full transition-all duration-500" 
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Tier Benefits */}
          <div>
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Your Unlocked Tier Perks
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {loyalty.perks.map((perk, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <Star className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>{perk}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Rewards Catalog */}
          <div>
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Redeemable Vouchers & Discounts
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {AVAILABLE_REWARDS.map((reward) => {
                const canAfford = loyalty.pointsBalance >= reward.pointsCost;
                return (
                  <div
                    key={reward.id}
                    className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
                      canAfford
                        ? 'border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/50 opacity-75'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                          {reward.title}
                        </h4>
                        <span className="text-xs font-black text-amber-600 dark:text-amber-400 shrink-0">
                          {reward.pointsCost} Pts
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mb-3">{reward.description}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRedeem(reward)}
                      disabled={!canAfford}
                      className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        canAfford
                          ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      <span>{canAfford ? 'Redeem Voucher' : `Need ${reward.pointsCost - loyalty.pointsBalance} more pts`}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Points History */}
          <div>
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Recent Points Activity
            </h3>
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {loyalty.history.map((item) => (
                <div
                  key={item.id}
                  className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-medium text-slate-800 dark:text-slate-200">{item.description}</div>
                    <div className="text-[10px] text-slate-400">{item.timestamp}</div>
                  </div>
                  <span className={`font-mono font-bold ${
                    item.points > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  }`}>
                    {item.points > 0 ? `+${item.points}` : item.points} Pts
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
