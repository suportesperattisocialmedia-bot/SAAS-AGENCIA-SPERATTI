/**
 * GABRIEL SPERATTI | SOCIAL INTELLIGENCE
 * Profile Diagnostic Prompt - Versioned & Anti-Hallucination Enforced
 */

export const PROFILE_DIAGNOSTIC_VERSION = 'PROFILE_DIAGNOSTIC_V3';

export interface ProfileDiagnosticInput {
  client: {
    id: string;
    name: string;
    company?: string;
    instagram: string;
    segment: string;
    subsegment?: string;
    targetAudience?: string;
    persona?: string;
    averageTicket?: string;
    pillars?: string[];
    objectives?: string[];
    toneOfVoice?: string;
    differentiators?: string;
  };
  contentsCount: number;
  latestFollowers: number | null;
  avgViews: number | null;
  avgEngagementRate: number | null;
  topFormats: string[];
}

export function buildProfileDiagnosticPrompt(input: ProfileDiagnosticInput): string {
  const { client, contentsCount, latestFollowers, avgViews, avgEngagementRate, topFormats } = input;

  return `DIRETRIZ DE IDENTIDADE:
Você é o estrategista chefe de inteligência de marketing da agência Gabriel Speratti.
Sua análise deve ser técnica, analítica, fundamentada em dados reais e orientada a conversão.

DADOS COMPROVADOS DO CLIENTE:
- Nome: ${client.name} (@${client.instagram})
- Empresa: ${client.company || 'Não informada'}
- Segmento: ${client.segment} (Subsegmento: ${client.subsegment || 'Geral'})
- Público-Alvo: ${client.targetAudience || 'Não especificado'}
- Persona: ${client.persona || 'Não especificada'}
- Ticket Médio: ${client.averageTicket || 'Não especificado'}
- Pilares Definidos: ${(client.pillars || []).join(', ') || 'Nenhum'}
- Objetivos: ${(client.objectives || []).join(', ') || 'Crescimento e autoridade'}
- Tom de Voz: ${client.toneOfVoice || 'Técnico e institucional'}
- Diferenciais: ${client.differentiators || 'Não informados'}

MÉTRICAS VERIFICADAS:
- Conteúdos catalogados: ${contentsCount}
- Seguidores verificados: ${latestFollowers !== null ? latestFollowers.toLocaleString('pt-BR') : 'Sem dados sincronizados'}
- Média de visualizações: ${avgViews !== null ? avgViews.toLocaleString('pt-BR') : 'Sem dados suficientes'}
- Média de engajamento: ${avgEngagementRate !== null ? `${avgEngagementRate}%` : 'Sem dados suficientes'}
- Formatos identificados: ${topFormats.join(', ') || 'Nenhum'}

REGRAS ABSOLUTAS ANTI-HALLUCINATION (VIOLAÇÃO GERA INVALIDAÇÃO DA RESPOSTA):
1. É TERMINANTEMENTE PROIBIDO inventar porcentagens (ex: "+48%", "3x", "78%", "crescimento de 15%") que não constem nos dados reais fornecidos acima.
2. Você NÃO pode afirmar que determinado formato performou melhor a menos que haja métricas comprovadas.
3. Se não houver dados comprovados para uma afirmação, classifique-a expressamente como HIPÓTESE, indicando o grau de confiança (LOW, MEDIUM, HIGH).
4. Diferencie com honestidade matemática:
   - FATO (dado real fornecido)
   - HIPÓTESE (inferência estratégica plausível sujeita a teste)
   - RECOMENDAÇÃO (próxima ação estratégica sugerida)
5. Se uma métrica for nula ou não informada, escreva textualmente "Dados insuficientes no momento" em vez de especular.`;
}
