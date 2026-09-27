import React from 'react';

export interface BarDataPoint {
  label: string;
  value: number | null;
  secondaryValue?: number;
  sublabel?: string;
  color?: string;
}

interface ChartBarProps {
  data: BarDataPoint[];
  title?: string;
  subtitle?: string;
  height?: number;
  valueFormatter?: (val: number) => string;
  defaultColor?: string;
}

export const ChartBar: React.FC<ChartBarProps> = ({
  data: rawData,
  title,
  subtitle,
  height = 200,
  valueFormatter = (v) => v.toLocaleString('pt-BR'),
  defaultColor = '#f59e0b'
}) => {
  const data = (rawData || []).filter((d): d is BarDataPoint & { value: number } => typeof d.value === 'number');
  if (data.length === 0) {
    return (
      <div className="bg-[#161618] border border-white/[0.06] rounded-[24px] p-6 flex flex-col items-center justify-center text-neutral-500 text-sm h-48">
        Sem dados para gráfico de barras.
      </div>
    );
  }

  const maxVal = Math.max(...data.map(d => d.value)) || 1;

  return (
    <div className="bg-[#161618] border border-white/[0.06] rounded-[24px] p-4 flex flex-col">
      {(title || subtitle) && (
        <div className="mb-4">
          {title && <h4 className="text-sm font-semibold text-neutral-200">{title}</h4>}
          {subtitle && <p className="text-xs text-neutral-400 mt-0.5">{subtitle}</p>}
        </div>
      )}

      <div className="flex flex-col gap-3 justify-center" style={{ minHeight: height }}>
        {data.map((item, idx) => {
          const pct = Math.max(4, Math.round((item.value / maxVal) * 100));
          const barColor = item.color || defaultColor;

          return (
            <div key={idx} className="group">
              <div className="flex items-center justify-between text-xs mb-1 tabular-nums">
                <span className="text-neutral-300 font-medium truncate max-w-[200px]">
                  {item.label}
                </span>
                <span className="text-neutral-400 tabular-nums">
                  {valueFormatter(item.value)}
                  {item.sublabel && <span className="text-neutral-500 text-[11px] ml-1.5">{item.sublabel}</span>}
                </span>
              </div>

              <div className="w-full bg-neutral-800/80 rounded-full h-2.5 overflow-hidden flex">
                <div
                  className="h-full rounded-full transition-all duration-500 group-hover:brightness-110"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: barColor
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
