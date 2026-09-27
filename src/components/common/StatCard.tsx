import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { DemoProvider } from '../../services/demo/DemoProvider';

export type MetricTypeTag = 'DADO REAL' | 'DADO CALCULADO' | 'INSIGHT DA IA' | 'RECOMENDAÇÃO' | 'DADO FICTÍCIO';

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
      case 'DADO FICTÍCIO':
        return 'text-rose-300 border-rose-500/30 bg-rose-950/30';
    }
  };

  // Valor indisponível: exibido esmaecido e sem selo de proveniência (não há dado a classificar).
  // No modo demonstração nenhum número é rotulado como real.
  const shownTag: MetricTypeTag | undefined = typeTag && DemoProvider.isDemoActive() ? 'DADO FICTÍCIO' : typeTag;
  const unavailable = typeof value === 'string' && /^(n\/d|sem dados)/i.test(value.trim());

  return (
    <div className="bg-[#161618] border border-white/[0.06] rounded-[24px] p-4 sm:p-5 flex flex-col justify-between gap-3 sm:gap-4 min-w-0 transition-colors hover:border-white/[0.14]">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <span className="text-sm font-medium text-neutral-400 leading-snug">{label}</span>
          {icon && <span className="shrink-0 mt-0.5">{icon}</span>}
        </div>
        <div className={`text-2xl sm:text-[1.75rem] leading-none font-semibold tabular-nums tracking-tight ${unavailable ? 'text-neutral-500 text-xl' : 'text-neutral-50'}`}>
          {value}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        {isDiffDefined ? (
          <div className="flex items-center gap-1 tabular-nums">
            {isPositive && <ArrowUpRight className={`w-3.5 h-3.5 ${isGood ? 'text-emerald-400' : 'text-rose-400'}`} />}
            {isNegative && <ArrowDownRight className={`w-3.5 h-3.5 ${isBad ? 'text-rose-400' : 'text-emerald-400'}`} />}
            {isNeutral && <Minus className="w-3.5 h-3.5 text-neutral-500" />}
            <span className={isGood ? 'text-emerald-400 font-semibold' : isBad ? 'text-rose-400 font-semibold' : 'text-neutral-400'}>
              {diffPercent > 0 ? `+${diffPercent}%` : `${diffPercent}%`}
            </span>
            <span className="text-neutral-500 ml-1 hidden sm:inline">vs anterior</span>
          </div>
        ) : (
          <span className="text-neutral-500">{diffText || subtext || periodLabel || ''}</span>
        )}
        {shownTag && !unavailable && (
          <span className={`shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${getTagColor(shownTag)}`}>{shownTag}</span>
        )}
      </div>
    </div>
  );
};
