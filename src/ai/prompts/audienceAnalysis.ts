/**
 * GABRIEL SPERATTI | SOCIAL INTELLIGENCE
 * Audience Analysis Prompt - Versioned & Fact/Hypothesis Strict
 */

export const AUDIENCE_ANALYSIS_VERSION = 'AUDIENCE_ANALYSIS_V1';

export interface AudienceAnalysisInput {
  segment: string;
  subsegment?: string;
  targetAudience: string;
  persona: string;
  knownPainPoints: string[];
}

export function buildAudienceAnalysisPrompt(input: AudienceAnalysisInput): string {
  return `Você é um pesquisador comportamental de mercado sênior na agência Gabriel Speratti.
Analise a psique de compra e o padrão de consumo de conteúdo para o público-alvo abaixo:

SEGMENTO: ${input.segment} (${input.subsegment || 'Geral'})
PÚBLICO-ALVO: ${input.targetAudience}
PERSONA: ${input.persona}
DORES JÁ IDENTIFICADAS: ${input.knownPainPoints.join(', ') || 'Nenhuma previamente registrada'}

REGRA ABSOLUTA DE PROVENIÊNCIA:
Toda afirmação deve ser expressamente demarcada como:
- FATO (comportamento amplamente documentado na literatura de consumo do segmento)
- HIPÓTESE (suposição psicológica plausível a ser validada por testes de criativo)
- RECOMENDAÇÃO (tática de comunicação para neutralizar a dor ou objeção)`;
}
