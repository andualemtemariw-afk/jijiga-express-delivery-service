import { Award, Sparkles, Check, ChevronRight } from 'lucide-react';
import { LoyaltyProfile, LoyaltyTier } from '../../types';

interface LoyaltyCardProps {
  loyalty?: LoyaltyProfile;
  className?: string;
}

const DEFAULT_LOYALTY: LoyaltyProfile = {
  pointsBalance: 320,
  lifetimePoints: 1240,
  tier: 'SILVER',
  nextTierPointsNeeded: 260,
  tierPerks: [
    'Priority dispatch queue during morning market peak',
    'Free tamper-evident security seal on all parcels',
    'Dedicated customer support hotline',
  ],
};

const TIER_COLORS: Record<LoyaltyTier, { badge: string; bg: string; text: string }> = {
  BRONZE: { badge: 'Bronze Member', bg: 'from-amber-700/20 to-amber-900/10 border-amber-300', text: 'text-amber-800' },
  SILVER: { badge: 'Silver Tier', bg: 'from-slate-200 to-slate-100 border-slate-300', text: 'text-slate-800' },
  GOLD: { badge: 'Gold VIP', bg: 'from-yellow-400/20 to-amber-500/10 border-amber-300', text: 'text-amber-900' },
  PLATINUM: { badge: 'Platinum Elite', bg: 'from-indigo-600/20 to-purple-600/10 border-indigo-300', text: 'text-indigo-950' },
};

export function LoyaltyCard({ loyalty = DEFAULT_LOYALTY, className = '' }: LoyaltyCardProps) {
  const currentTier = TIER_COLORS[loyalty.tier] || TIER_COLORS.SILVER;
  const progressPercent = Math.min(100, Math.round((loyalty.pointsBalance / (loyalty.pointsBalance + loyalty.nextTierPointsNeeded)) * 100));

  return (
    <div className={`rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white via-slate-50 to-emerald-50/30 p-4 shadow-2xs space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-xs">
            <Award className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                Jijiga Express Rewards
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.2 rounded-md border ${currentTier.bg} ${currentTier.text}`}>
                {currentTier.badge}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">Earn 1 pt per 50 ETB spent on orders & rides</p>
          </div>
        </div>

        <div className="text-right">
          <div className="text-xl font-black font-mono text-emerald-800 tabular-nums">
            {loyalty.pointsBalance}
          </div>
          <div className="text-[10px] text-slate-500 font-medium">Available Points</div>
        </div>
      </div>

      {/* Progress Bar to Next Tier */}
      <div className="space-y-1">
        <div className="flex justify-between text-[11px] text-slate-600">
          <span className="font-semibold">{loyalty.tier} Tier</span>
          <span>{loyalty.nextTierPointsNeeded} pts to next tier ({progressPercent}%)</span>
        </div>
        <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-emerald-600 rounded-full transition-all duration-500" 
            style={{ width: `${progressPercent}%` }} 
          />
        </div>
      </div>

      {/* Active Tier Perks */}
      <div className="pt-2 border-t border-slate-100 space-y-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Your Tier Privileges:</span>
        <div className="grid grid-cols-1 gap-1">
          {loyalty.tierPerks.map((perk, idx) => (
            <div key={idx} className="flex items-center gap-1.5 text-xs text-slate-700">
              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="line-clamp-1">{perk}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
