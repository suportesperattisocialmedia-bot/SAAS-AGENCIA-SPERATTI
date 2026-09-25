import { describe, expect, it } from 'vitest';
import { buildDiagnosticPrompt, buildIdeasPrompt, extractJson, parseDiagnosticResponse, parseIdeasResponse } from '../src/ai/manualPrompts';
import type { Client, Content } from '../src/types';

const client: Client = {
  id: 'client-1',
  name: 'Estúdio Lumen',
  company: 'Lumen Arquitetura',
  instagram: '@estudiolumen',
  website: '',
  whatsapp: '',
  city: 'Curitiba',
  segment: 'Arquitetura',
  subsegment: 'Interiores',
  targetAudience: 'Casais 30-45 reformando apartamento',
  persona: '',
  averageTicket: '',
  products: '',
  services: '',
  objectives: ['Autoridade'],
  pillars: ['Bastidores', 'Antes e depois'],
  formats: ['Reels', 'Carrossel'],
  toneOfVoice: 'Próximo e técnico',
  differentiators: '',
  notes: '',
  status: 'active',
  onboardingStep: 1,
  healthStatus: 'not_connected',
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z'
};

const post: Content = {
  id: 'c1',
  clientId: 'client-1',
  title: 'Antes e depois da sala',
  caption: 'Antes e depois da sala integrada',
  publishedAt: '2026-09-10T12:00:00.000Z',
  format: 'Reels',
  pillar: 'Antes e depois',
  objective: 'Engajamento',
  hook: '',
  cta: '',
  metrics: { views: 1200, reach: 900, likes: 80, comments: 5, shares: null, saves: 30, engagementRate: 12.78 }
};

const validDiagnostic = {
  profileSection: { photoAnalysis: 'a', bioClarity: 'b', valueProposition: 'c', perceivedAuthority: 'd' },
  contentSection: { publishingFrequency: 'a', editorialPillars: 'b', captionQuality: 'c', hookUsage: 'd', ctaEffectiveness: 'e' },
  performanceSection: { engagementAnalysis: 'a', savesAndShares: 'b', bestContentObservations: 'c' },
  strategySection: { strengths: ['x'], vulnerabilities: ['y'], immediateOpportunities: ['z'], recommendedFormats: ['Reels'] },
  nextActions: ['Gravar série de antes e depois']
};

describe('prompt de análise completa', () => {
  const prompt = buildDiagnosticPrompt({ client, contents: [post], snapshots: [], competitors: [], audienceInsights: [] });

  it('inclui os dados reais do cliente e das publicações', () => {
    expect(prompt).toContain('Estúdio Lumen');
    expect(prompt).toContain('@estudiolumen');
    expect(prompt).toContain('Antes e depois da sala integrada');
    expect(prompt).toContain('views 1.200');
  });

  it('marca dados ausentes como indisponíveis em vez de inventar', () => {
    expect(prompt).toContain('Seguidores: não disponível');
    expect(prompt).toContain('compart. n/d');
    expect(prompt).toContain('Não invente números');
  });

  it('pede resposta em JSON com a estrutura esperada', () => {
    expect(prompt).toContain('"profileSection"');
    expect(prompt).toContain('"nextActions"');
  });

  it('prompt de ideias pede a quantidade solicitada', () => {
    expect(buildIdeasPrompt({ client, contents: [post], snapshots: [], competitors: [], audienceInsights: [] }, 5)).toContain('Crie 5 ideias');
  });
});

describe('importação da resposta', () => {
  it('aceita JSON puro, em bloco ```json e com texto em volta', () => {
    const json = JSON.stringify(validDiagnostic);
    expect(parseDiagnosticResponse(json).nextActions).toEqual(['Gravar série de antes e depois']);
    expect(parseDiagnosticResponse('```json\n' + json + '\n```').strategySection.strengths).toEqual(['x']);
    expect(parseDiagnosticResponse(`Aqui está a análise:\n${json}\nEspero ter ajudado!`).profileSection.bioClarity).toBe('b');
  });

  it('rejeita respostas fora do formato com mensagem clara', () => {
    expect(() => parseDiagnosticResponse('a análise está ótima')).toThrow(/Não encontrei um JSON/);
    expect(() => parseDiagnosticResponse('{"profileSection": "texto"}')).toThrow(/formato esperado/);
    expect(() => extractJson('{"a": 1,')).toThrow();
  });

  it('importa ideias normalizando variações de escrita', () => {
    const ideas = parseIdeasResponse(
      JSON.stringify([
        {
          title: 'Tour pela obra',
          description: 'Mostrar a obra em andamento',
          pillar: 'Bastidores',
          objective: 'Autoridade',
          format: 'reels',
          hook: 'Isso aqui era uma parede',
          cta: 'Salve para a sua reforma',
          potential: 'medio',
          whyDoThis: 'Bastidores geram confiança'
        }
      ]),
      'client-1'
    );
    expect(ideas).toHaveLength(1);
    expect(ideas[0]).toMatchObject({ clientId: 'client-1', format: 'Reels', potential: 'Médio', status: 'IDEIA', source: 'IA externa (prompt manual)' });
  });

  it('aceita objeto { ideas: [...] } e rejeita lista vazia', () => {
    expect(() => parseIdeasResponse('[]', 'c')).toThrow();
    expect(() => parseIdeasResponse('{"ideas": [{"title": "x"}]}', 'c')).toThrow(/formato esperado/);
  });
});
