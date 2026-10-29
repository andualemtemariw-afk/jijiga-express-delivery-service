import { Check } from 'lucide-react';
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

const TIER_LABELS: Record<LoyaltyTier, string> = {
  BRONZE: 'Bronze member',
  SILVER: 'Silver tier',
  GOLD: 'Gold VIP',
  PLATINUM: 'Platinum elite',
};

export function LoyaltyCard({ loyalty = DEFAULT_LOYALTY, className = '' }: LoyaltyCardProps) {
  const tierLabel = TIER_LABELS[loyalty.tier] || TIER_LABELS.SILVER;
  const progressPercent = Math.min(
    100,
    Math.round((loyalty.pointsBalance / (loyalty.pointsBalance + loyalty.nextTierPointsNeeded)) * 100)
  );

  return (
    <section
      aria-label="Jijiga Express Rewards"
      className={`space-y-4 rounded-2xl border border-slate-200 bg-white p-4 ${className}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="font-display text-lg font-bold leading-tight text-slate-900">Jijiga Express Rewards</h3>
          <p className="mt-1 text-[13px] leading-snug text-slate-600">Earn 1 point for every 50 ETB you spend on orders and rides.</p>
        </div>
        <div className="shrink-0 text-right">
          <div className="font-display text-3xl font-bold leading-none tabular-nums text-emerald-800">{loyalty.pointsBalance}</div>
          <div className="mt-1 text-xs text-slate-600">points</div>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between gap-3 text-xs text-slate-600">
          <span className="font-semibold text-slate-800">{tierLabel}</span>
          <span>{loyalty.nextTierPointsNeeded} points to the next tier</span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Progress to next tier"
          className="h-2 w-full overflow-hidden rounded-full bg-slate-200"
        >
          <div className="h-full rounded-full bg-emerald-600 transition-[width] duration-500" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      <div className="space-y-2 border-t border-slate-200 pt-3">
        <h4 className="text-sm font-semibold text-slate-800">Your perks</h4>
        <ul className="space-y-1.5">
          {loyalty.tierPerks.map((perk, idx) => (
            <li key={idx} className="flex items-start gap-2 text-[13px] leading-snug text-slate-700">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-700" aria-hidden="true" />
              <span>{perk}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
