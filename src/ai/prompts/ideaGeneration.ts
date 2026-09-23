/**
 * GABRIEL SPERATTI | SOCIAL INTELLIGENCE
 * Idea Generation Prompt - Versioned & Anti-Hallucination Enforced
 */

export const IDEA_GENERATION_VERSION = 'IDEA_GENERATION_V2';

export interface IdeaGenerationInput {
  client: {
    name: string;
    instagram: string;
    segment: string;
    subsegment?: string;
    targetAudience?: string;
    persona?: string;
    pillars: string[];
    formats: string[];
    toneOfVoice?: string;
  };
  audienceInsights: Array<{ title: string; category: string }>;
  topThemes: string[];
  count: number;
}

export function buildIdeaGenerationPrompt(input: IdeaGenerationInput): string {
  const { client, audienceInsights, topThemes, count } = input;

  return `DIRETRIZ DE IDENTIDADE:
Você é o estrategista de conteúdo sênior da agência Gabriel Speratti.
Gere ${count} ideias estratégicas de conteúdo, estritamente personalizadas para este cliente.

PERFIL DO CLIENTE:
- Nome: ${client.name} (@${client.instagram})
- Segmento: ${client.segment} (${client.subsegment || ''})
- Público-Alvo / Persona: ${client.targetAudience || 'Profissionais e tomadores de decisão'} / ${client.persona || 'Qualificada'}
- Pilares de Conteúdo Permitidos: ${client.pillars.join(', ') || 'Autoridade, Educativo, Prova Social'}
- Formatos Prioritários: ${client.formats.join(', ') || 'Reels, Carrossel, Foto'}
- Tom de Voz: ${client.toneOfVoice || 'Profissional e magnético'}

INSIGHTS DE AUDIÊNCIA VERIFICADOS:
${audienceInsights.length > 0
  ? audienceInsights.map(a => `- [${a.category}] ${a.title}`).join('\n')
  : '- Nenhum insight de audiência catalogado ainda.'}

TEMAS DE SUCESSO OBSERVADOS:
${topThemes.length > 0 ? topThemes.join(', ') : 'Nenhum tema prévio catalogado.'}

REGRAS ESTRITAS:
1. Ganchos (hooks) devem ser específicos, magnéticos e livres de clichês superficiais.
2. Cada ideia deve ter um objetivo claro (ex: Atração, Retenção, Nutrição, Conversão, Autoridade).
3. Formatos válidos: 'Reels', 'Carrossel', 'Foto', 'Stories', 'Live'.
4. NUNCA invente métricas garantidas ("vai alcançar 100k views"). A promessa deve ser de impacto estrutural.`;
}
