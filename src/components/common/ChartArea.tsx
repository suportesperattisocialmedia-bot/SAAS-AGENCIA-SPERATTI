import React, { useState, useId } from 'react';

export interface ChartDataPoint {
  date: string;
  label?: string;
  /** null = dado indisponível naquela data (o ponto é omitido, nunca desenhado como zero). */
  value: number | null;
  secondaryValue?: number;
}

type PlottedPoint = ChartDataPoint & { value: number };

interface ChartAreaProps {
  data: ChartDataPoint[];
  title?: string;
  subtitle?: string;
  height?: number;
  valueFormatter?: (val: number) => string;
  lineColor?: string;
  fillColor?: string;
  secondaryLabel?: string;
  primaryLabel?: string;
}

export const ChartArea: React.FC<ChartAreaProps> = ({
  data: rawData,
  title,
  subtitle,
  height = 240,
  valueFormatter = (v) => v.toLocaleString('pt-BR'),
  lineColor = '#f59e0b', // amber-500
  primaryLabel = 'Métrica',
  secondaryLabel
}) => {
  const gradientId = useId();
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const data: PlottedPoint[] = (rawData || []).filter((d): d is PlottedPoint => typeof d.value === 'number');

  if (!data || data.length === 0) {
    return (
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 flex flex-col items-center justify-center text-neutral-500 text-sm h-60">
        Dados históricos insuficientes.
      </div>
    );
  }

  const width = 800;
  const paddingX = 88; // espaço para rótulos como "12.345 seg."
  const paddingTop = 25;
  const paddingBottom = 40;

  const values = data.map(d => d.value);
  const minVal = Math.min(...values) * 0.95;
  const maxVal = Math.max(...values) * 1.05 || 100;
  const range = maxVal - minVal || 1;

  const getX = (index: number) => {
    if (data.length <= 1) return width / 2;
    return paddingX + (index / (data.length - 1)) * (width - paddingX * 2);
  };

  const getY = (val: number) => {
    const usableHeight = height - paddingTop - paddingBottom;
    const normalized = (val - minVal) / range;
    return height - paddingBottom - normalized * usableHeight;
  };

  // Generate SVG path points
  const points = data.map((d, i) => ({
    x: getX(i),
    y: getY(d.value),
    data: d
  }));

  // Create smooth path using cubic bezier segments
  let linePath = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const current = points[i];
    const next = points[i + 1];
    const controlX = (current.x + next.x) / 2;
    linePath += ` C ${controlX} ${current.y}, ${controlX} ${next.y}, ${next.x} ${next.y}`;
  }

  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z`;

  const hoveredPoint = hoveredIdx !== null ? points[hoveredIdx] : null;

  return (
    <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-4 flex flex-col">
      {(title || subtitle) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-4">
          <div>
            {title && <h4 className="text-sm font-semibold text-neutral-200">{title}</h4>}
            {subtitle && <p className="text-xs text-neutral-400 mt-0.5">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-3 text-xs text-neutral-400 font-mono">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: lineColor }} />
              {primaryLabel}
            </span>
            {secondaryLabel && (
              <span className="flex items-center gap-1.5 text-neutral-500">
                <span className="w-2.5 h-2.5 rounded-full bg-neutral-600" />
                {secondaryLabel}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible select-none"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lineColor} stopOpacity="0.32" />
              <stop offset="85%" stopColor={lineColor} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.33, 0.66, 1].map((ratio, i) => {
            const y = paddingTop + ratio * (height - paddingTop - paddingBottom);
            const val = maxVal - ratio * range;
            return (
              <g key={i}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={width - paddingX}
                  y2={y}
                  stroke="rgba(255, 255, 255, 0.05)"
                  strokeDasharray="4 4"
                />
                <text
                  x={paddingX - 8}
                  y={y + 3}
                  textAnchor="end"
                  className="text-[10px] font-mono fill-neutral-500"
                >
                  {valueFormatter(Math.round(val))}
                </text>
              </g>
            );
          })}

          {/* Com um único registro não há linha: mostra o ponto e o valor. */}
          {points.length === 1 && (
            <g>
              <circle cx={points[0].x} cy={points[0].y} r={5} fill={lineColor} />
              <text x={points[0].x} y={points[0].y - 12} textAnchor="middle" className="text-[11px] font-mono fill-neutral-300">
                {valueFormatter(points[0].data.value)}
              </text>
            </g>
          )}

          {/* Area under curve */}
          <path d={areaPath} fill={`url(#${gradientId})`} />

          {/* Main curve */}
          <path
            d={linePath}
            fill="none"
            stroke={lineColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Interactive vertical hover indicator and dots */}
          {hoveredPoint && (
            <g>
              <line
                x1={hoveredPoint.x}
                y1={paddingTop}
                x2={hoveredPoint.x}
                y2={height - paddingBottom}
                stroke="rgba(255,255,255,0.25)"
                strokeDasharray="2 2"
              />
              <circle
                cx={hoveredPoint.x}
                cy={hoveredPoint.y}
                r="5"
                fill={lineColor}
                stroke="#171717"
                strokeWidth="2"
              />
            </g>
          )}

          {/* Invisible interactive hover rects */}
          {points.map((pt, i) => {
            const barW = (width - paddingX * 2) / points.length;
            return (
              <rect
                key={i}
                x={pt.x - barW / 2}
                y={paddingTop}
                width={barW}
                height={height - paddingTop - paddingBottom}
                fill="transparent"
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                className="cursor-crosshair"
              />
            );
          })}

          {/* X Axis Labels */}
          {points.map((pt, i) => {
            // Show every Nth label to avoid overlap
            const step = Math.ceil(points.length / 6);
            if (i % step !== 0 && i !== points.length - 1) return null;
            return (
              <text
                key={i}
                x={pt.x}
                y={height - 12}
                textAnchor="middle"
                className="text-[10px] font-mono fill-neutral-500"
              >
                {pt.data.label || pt.data.date.split('-').slice(1).reverse().join('/')}
              </text>
            );
          })}
        </svg>

        {/* Floating Tooltip */}
        {hoveredPoint && (
          <div
            className="absolute z-20 pointer-events-none transform -translate-x-1/2 -translate-y-full bg-neutral-950 border border-neutral-700 rounded-lg p-2.5 shadow-xl text-xs font-mono"
            style={{
              left: `${(hoveredPoint.x / width) * 100}%`,
              top: `${(hoveredPoint.y / height) * 100}%`,
              marginTop: '-10px'
            }}
          >
            <div className="text-neutral-400 text-[10px] mb-1">
              {hoveredPoint.data.date}
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: lineColor }} />
              <span className="text-neutral-200 font-semibold tabular-nums">
                {valueFormatter(hoveredPoint.data.value)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
