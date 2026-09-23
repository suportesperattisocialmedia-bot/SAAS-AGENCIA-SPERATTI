/**
 * GABRIEL SPERATTI | SOCIAL INTELLIGENCE
 * Strategy Recommendation Prompt - Versioned
 */

export const STRATEGY_RECOMMENDATION_VERSION = 'STRATEGY_RECOMMENDATION_V1';

export interface StrategyRecommendationInput {
  clientName: string;
  segment: string;
  monthlyCadence: number;
  recentThemes: string[];
  bestFormat: string;
  bottlenecks: string[];
}

export function buildStrategyRecommendationPrompt(input: StrategyRecommendationInput): string {
  return `Você é o diretor de estratégia da agência Gabriel Speratti.
Elabore diretrizes táticas executáveis para o cliente ${input.clientName} (${input.segment}):

CONTEXTO OPERACIONAL:
- Cadência semanal planejada: ${input.monthlyCadence} posts/semana
- Temas recentes abordados: ${input.recentThemes.join(', ') || 'Nenhum'}
- Formato com maior tração: ${input.bestFormat || 'Aguardando sincronização'}
- Gargalos observados: ${input.bottlenecks.join(', ') || 'Nenhum'}

REQUISITOS:
- Apresentar recomendações estruturadas e prioritárias (Impacto vs Esforço).
- NUNCA inventar dados de concorrentes ou pesquisas externas que não foram fornecidas.`;
}
