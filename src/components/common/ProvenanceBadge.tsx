/**
 * GABRIEL SPERATTI | SOCIAL INTELLIGENCE
 * ProvenanceBadge - Shows origin of data (REAL, CALCULATED, AI, HYPOTHESIS, DEMO)
 */

import React from 'react';
import { DataProvenanceType, getProvenanceConfig } from '../../utils/provenance';
import { DemoProvider } from '../../services/demo/DemoProvider';

interface ProvenanceBadgeProps {
  type: DataProvenanceType;
  showSublabel?: boolean;
  className?: string;
}

export const ProvenanceBadge: React.FC<ProvenanceBadgeProps> = ({
  type,
  showSublabel = false,
  className = ''
}) => {
  // Em modo demonstração, dados nunca são apresentados como reais ou calculados de fontes reais.
  const effective: DataProvenanceType = DemoProvider.isDemoActive() && (type === 'REAL_DATA' || type === 'CALCULATED_DATA') ? 'MOCK_DATA' : type;
  const config = getProvenanceConfig(effective);

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] ${config.badgeClass} ${className}`}
      title={config.sublabel}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      <span className="font-semibold">{config.label}</span>
      {showSublabel && config.sublabel && (
        <span className="opacity-70 normal-case font-normal hidden sm:inline">
          · {config.sublabel}
        </span>
      )}
    </span>
  );
};
