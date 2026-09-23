/**
 * GABRIEL SPERATTI | SOCIAL INTELLIGENCE
 * Data Provenance & Honesty Utilities
 * 
 * Principle: The system must be honest about data.
 * Never transform simulation into real, hypothesis into fact, or estimate into metric.
 */

export type DataProvenanceType = 
  | 'REAL_DATA'
  | 'CALCULATED_DATA'
  | 'AI_INSIGHT'
  | 'AI_HYPOTHESIS'
  | 'RECOMMENDATION'
  | 'MOCK_DATA'
  | 'MANUAL_ENTRY';

export interface ProvenanceBadgeConfig {
  label: string;
  sublabel?: string;
  badgeClass: string;
  textClass: string;
}

export function getProvenanceConfig(type: DataProvenanceType): ProvenanceBadgeConfig {
  switch (type) {
    case 'REAL_DATA':
      return {
        label: 'DADO REAL',
        sublabel: 'Meta Graph API / Verificado',
        badgeClass: 'border-emerald-500/30 bg-emerald-950/40 text-emerald-300',
        textClass: 'text-emerald-400'
      };
    case 'CALCULATED_DATA':
      return {
        label: 'DADO CALCULADO',
        sublabel: 'Fórmula Determinística',
        badgeClass: 'border-sky-500/30 bg-sky-950/40 text-sky-300',
        textClass: 'text-sky-400'
      };
    case 'AI_INSIGHT':
      return {
        label: 'INSIGHT IA',
        sublabel: 'Análise Estruturada',
        badgeClass: 'border-purple-500/30 bg-purple-950/40 text-purple-300',
        textClass: 'text-purple-400'
      };
    case 'AI_HYPOTHESIS':
      return {
        label: 'HIPÓTESE IA',
        sublabel: 'Sem Causalidade Verificada',
        badgeClass: 'border-amber-500/30 bg-amber-950/40 text-amber-300',
        textClass: 'text-amber-400'
      };
    case 'RECOMMENDATION':
      return {
        label: 'RECOMENDAÇÃO',
        sublabel: 'Ação Sugerida',
        badgeClass: 'border-neutral-700 bg-neutral-900 text-neutral-300',
        textClass: 'text-neutral-200'
      };
    case 'MOCK_DATA':
      return {
        label: 'MODO DEMO',
        sublabel: 'Simulação Didática',
        badgeClass: 'border-rose-500/40 bg-rose-950/40 text-rose-300',
        textClass: 'text-rose-400'
      };
    case 'MANUAL_ENTRY':
      return {
        label: 'MANUAL',
        sublabel: 'Entrada por Estrategista',
        badgeClass: 'border-neutral-700 bg-neutral-900 text-neutral-300',
        textClass: 'text-neutral-300'
      };
  }
}

/**
 * Format metric value or display honest message if data is absent.
 */
export function formatMetricHonest(
  value: number | null | undefined,
  fallback = 'Dados insuficientes'
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return fallback;
  }
  return value.toLocaleString('pt-BR');
}

/**
 * Format percentage or display honest message.
 */
export function formatPercentHonest(
  value: number | null | undefined,
  fallback = 'Sem base comparativa suficiente'
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return fallback;
  }
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${value.toFixed(1)}%`;
}
