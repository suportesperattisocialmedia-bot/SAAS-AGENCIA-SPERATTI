import { describe, expect, it } from 'vitest';
import { buildDiagnosticPrompt, buildIdeasPrompt, extractJson, parseDiagnosticResponse, parseDiagnosticResponseDetailed, parseIdeasResponse, postsBlock } from '../src/ai/manualPrompts';
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

  it('avisa que a resposta volta para o sistema e pede textos curtos numa linha só', () => {
    expect(prompt).toContain('colada num sistema de gestão');
    expect(prompt).toContain('sem quebras de linha dentro do texto');
    expect(prompt).toContain('aspas simples');
  });

  it('usa "DADOS DO PERFIL" quando é o perfil próprio', () => {
    const own = buildDiagnosticPrompt({ client: { ...client, isOwnProfile: true }, contents: [post], snapshots: [], competitors: [], audienceInsights: [] });
    expect(own).toContain('## DADOS DO PERFIL (marca própria)');
    expect(own).toContain('PERFIL PRÓPRIO');
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

describe('lista de publicações no prompt', () => {
  const many = Array.from({ length: 35 }, (_, i): Content => ({
    ...post,
    id: `p${i}`,
    publishedAt: `2026-08-${String((i % 28) + 1).padStart(2, '0')}T12:00:00.000Z`,
    pillar: 'Geral'
  }));

  it('inclui até 30 posts e diz quantos ficaram de fora', () => {
    const block = postsBlock(many);
    expect(block).toContain('30. [');
    expect(block).not.toContain('31. [');
    expect(block).toContain('Mostrando as 30 mais recentes de 35 publicações');
  });

  it('não repete "pilar: Geral" e explica que os posts não foram classificados', () => {
    const block = postsBlock(many);
    expect(block).not.toMatch(/pilar:? Geral/);
    expect(block).toContain('ainda não foram classificadas por pilar');
    expect(postsBlock([post])).toContain('· pilar Antes e depois');
  });

  it('encurta legendas longas no fim de uma palavra e marca o corte', () => {
    const longCaption = 'palavra '.repeat(120).trim();
    const block = postsBlock([{ ...post, caption: longCaption }]);
    expect(block).toMatch(/palavra \[…\]"/);
    expect(block).toContain('foram encurtadas aqui');
  });

  it('troca o título genérico do import por "sem legenda nos dados"', () => {
    expect(postsBlock([{ ...post, caption: '', title: 'Publicação (Reels)' }])).toContain('Legenda: sem legenda nos dados');
  });
});

describe('conserto de JSON copiado da IA', () => {
  const pretty = JSON.stringify(validDiagnostic, null, 2);

  it('aceita quebras de linha e aspas duplas dentro do texto', () => {
    const broken = pretty.replace('"b"', '"Linha um\nLinha com "citação" no meio"');
    const { data } = parseDiagnosticResponseDetailed(broken);
    expect(data.profileSection.bioClarity).toBe('Linha um\nLinha com "citação" no meio');
  });

  it('aceita vírgula sobrando e aspas tipográficas usadas como delimitador', () => {
    const trailing = pretty.replace('"Gravar série de antes e depois"', '"Gravar série de antes e depois",');
    expect(parseDiagnosticResponse(trailing).nextActions).toHaveLength(1);
    const curly = pretty.replace(/"/g, (_, i: number) => (i % 2 ? '“' : '”'));
    expect(() => extractJson(curly)).not.toThrow();
  });

  it('mantém aspas tipográficas dentro do texto quando o JSON já é válido', () => {
    const withCurly = pretty.replace('"b"', '"a bio diz “ajudo empresários”"');
    expect(parseDiagnosticResponse(withCurly).profileSection.bioClarity).toBe('a bio diz “ajudo empresários”');
  });

  it('fecha textos cortados no fim da linha e informa quantos foram fechados', () => {
    const cut = pretty.replace('"a",\n    "bioClarity"', '"texto que foi cortado no meio da fra\n    "bioClarity"').replace('"c",\n    "perceivedAuthority"', '"outro corte\n    "perceivedAuthority"');
    const { data, closedLines } = parseDiagnosticResponseDetailed(cut);
    expect(closedLines).toBe(2);
    expect(data.profileSection.photoAnalysis).toBe('texto que foi cortado no meio da fra');
    expect(data.profileSection.bioClarity).toBe('b');
    expect(data.profileSection.valueProposition).toBe('outro corte');
  });

  it('continua recusando JSON cortado no final (faltariam seções)', () => {
    expect(() => parseDiagnosticResponse(pretty.slice(0, pretty.length / 2))).toThrow();
  });
});
