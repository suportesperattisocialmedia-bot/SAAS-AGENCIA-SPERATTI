/**
 * GABRIEL SPERATTI | SOCIAL INTELLIGENCE
 * Content Classification Prompt - Versioned
 */

export const CONTENT_CLASSIFICATION_VERSION = 'CONTENT_CLASSIFICATION_V1';

export interface ContentClassificationInput {
  caption: string;
  format: string;
  metrics: {
    views: number | null;
    reach: number | null;
    likes: number | null;
    comments: number | null;
    shares: number | null;
    saves: number | null;
    engagementRate: number | null;
  };
  clientPillars: string[];
}

const show = (value: number | null, suffix = ''): string => (value === null ? 'indisponível' : `${value}${suffix}`);

export function buildContentClassificationPrompt(input: ContentClassificationInput): string {
  return `Você é um analista de performance e semiótica da agência Gabriel Speratti.
Classifique este conteúdo com base estrita no texto e nas métricas reais observadas:

LEGENDA/TEXTO:
"""
${input.caption.slice(0, 800)}
"""

FORMATO: ${input.format}
MÉTRICAS:
- Visualizações: ${show(input.metrics.views)}
- Alcance: ${show(input.metrics.reach)}
- Curtidas: ${show(input.metrics.likes)}
- Comentários: ${show(input.metrics.comments)}
- Compartilhamentos: ${show(input.metrics.shares)}
- Salvamentos: ${show(input.metrics.saves)}
- Taxa de Engajamento: ${show(input.metrics.engagementRate, '%')}

PILARES ESTRATÉGICOS DISPONÍVEIS:
${input.clientPillars.join(', ') || 'Autoridade, Conexão, Conversão, Educativo'}

INSTRUÇÕES:
- Identifique o pilar mais condizente com a mensagem.
- Identifique a categoria de gancho (ex: Curiosidade, Dor, Autoridade, Contrarian, Pergunta, Resultado).
- Formule uma hipótese de por que o conteúdo performou neste nível (sempre sinalizando como hipótese técnica).`;
}
