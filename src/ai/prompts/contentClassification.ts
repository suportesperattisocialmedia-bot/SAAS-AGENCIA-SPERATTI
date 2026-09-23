/**
 * GABRIEL SPERATTI | SOCIAL INTELLIGENCE
 * Content Classification Prompt - Versioned
 */

export const CONTENT_CLASSIFICATION_VERSION = 'CONTENT_CLASSIFICATION_V1';

export interface ContentClassificationInput {
  caption: string;
  format: string;
  metrics: {
    views: number;
    reach: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    engagementRate: number;
  };
  clientPillars: string[];
}

export function buildContentClassificationPrompt(input: ContentClassificationInput): string {
  return `Você é um analista de performance e semiótica da agência Gabriel Speratti.
Classifique este conteúdo com base estrita no texto e nas métricas reais observadas:

LEGENDA/TEXTO:
"""
${input.caption.slice(0, 800)}
"""

FORMATO: ${input.format}
MÉTRICAS:
- Visualizações: ${input.metrics.views}
- Alcance: ${input.metrics.reach}
- Curtidas: ${input.metrics.likes}
- Comentários: ${input.metrics.comments}
- Compartilhamentos: ${input.metrics.shares}
- Salvamentos: ${input.metrics.saves}
- Taxa de Engajamento: ${input.metrics.engagementRate}%

PILARES ESTRATÉGICOS DISPONÍVEIS:
${input.clientPillars.join(', ') || 'Autoridade, Conexão, Conversão, Educativo'}

INSTRUÇÕES:
- Identifique o pilar mais condizente com a mensagem.
- Identifique a categoria de gancho (ex: Curiosidade, Dor, Autoridade, Contrarian, Pergunta, Resultado).
- Formule uma hipótese de por que o conteúdo performou neste nível (sempre sinalizando como hipótese técnica).`;
}
