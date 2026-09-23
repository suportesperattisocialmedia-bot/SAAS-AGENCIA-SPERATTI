import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

export type MetricTypeTag = 'DADO REAL' | 'DADO CALCULADO' | 'INSIGHT DA IA' | 'RECOMENDAÇÃO';

interface StatCardProps {
  label: string;
  value: string | number;
  typeTag?: MetricTypeTag;
  diffPercent?: number;
  diffText?: string;
  subtext?: string;
  periodLabel?: string;
  icon?: React.ReactNode;
  isPositiveGood?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  typeTag = 'DADO REAL',
  diffPercent,
  diffText,
  subtext,
  periodLabel,
  icon,
  isPositiveGood = true
}) => {
  const isDiffDefined = diffPercent !== undefined && !Number.isNaN(diffPercent);
  const isPositive = isDiffDefined && diffPercent > 0;
  const isNegative = isDiffDefined && diffPercent < 0;
  const isNeutral = isDiffDefined && diffPercent === 0;

  const isGood = isPositiveGood ? isPositive : isNegative;
  const isBad = isPositiveGood ? isNegative : isPositive;

  const getTagColor = (tag: MetricTypeTag) => {
    switch (tag) {
      case 'DADO REAL':
        return 'text-sky-400/90 border-sky-500/20 bg-sky-950/30';
      case 'DADO CALCULADO':
        return 'text-amber-400/90 border-amber-500/20 bg-amber-950/30';
      case 'INSIGHT DA IA':
        return 'text-purple-400/90 border-purple-500/20 bg-purple-950/30';
      case 'RECOMENDAÇÃO':
        return 'text-emerald-400/90 border-emerald-500/20 bg-emerald-950/30';
    }
  };

  return (
    <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between transition-colors hover:border-neutral-700">
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider truncate">
            {label}
          </span>
          <div className="flex items-center gap-1.5">
            {typeTag && (
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${getTagColor(typeTag)}`}>
                {typeTag}
              </span>
            )}
            {icon && <span className="text-neutral-500">{icon}</span>}
          </div>
        </div>

        <div className="flex items-baseline gap-2">
          <div className="text-2xl font-bold font-mono tabular-nums text-neutral-100 tracking-tight">
            {value}
          </div>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-neutral-800/80 flex items-center justify-between text-xs">
        {isDiffDefined ? (
          <div className="flex items-center gap-1 font-mono tabular-nums">
            {isPositive && <ArrowUpRight className={`w-3.5 h-3.5 ${isGood ? 'text-emerald-400' : 'text-rose-400'}`} />}
            {isNegative && <ArrowDownRight className={`w-3.5 h-3.5 ${isBad ? 'text-rose-400' : 'text-emerald-400'}`} />}
            {isNeutral && <Minus className="w-3.5 h-3.5 text-neutral-500" />}
            <span className={isGood ? 'text-emerald-400 font-semibold' : isBad ? 'text-rose-400 font-semibold' : 'text-neutral-400'}>
              {diffPercent > 0 ? `+${diffPercent}%` : `${diffPercent}%`}
            </span>
            <span className="text-neutral-500 text-[11px] ml-1">vs anterior</span>
          </div>
        ) : diffText ? (
          <span className="text-neutral-400 font-mono text-[11px]">{diffText}</span>
        ) : (
          <span className="text-neutral-500 text-[11px]">{subtext || 'Histórico consolidado'}</span>
        )}

        {periodLabel && (
          <span className="text-[11px] text-neutral-500 font-mono">{periodLabel}</span>
        )}
      </div>
    </div>
  );
};
