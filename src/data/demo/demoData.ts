/**
 * GABRIEL SPERATTI | SOCIAL INTELLIGENCE
 * Demo Data Package - ONLY accessible through DemoProvider in DEMO MODE
 * Clearly marked with source: 'DEMO' to strictly prevent mixing with production.
 */

import {
  Client,
  InstagramAccount,
  AccountSnapshot,
  Content,
  Competitor,
  AudienceInsight,
  ContentIdea,
  CalendarItem,
  Alert
} from '../../types';

export const DEMO_CLIENT_ID = 'client-ravi-demo';

export const DEMO_CLIENT_RAVI: Client = {
  id: DEMO_CLIENT_ID,
  name: 'Dr. Ravi Alencar (DEMO)',
  company: 'Instituto Ravi de Cirurgia Plástica e Longevidade',
  instagram: '@dr.ravialencar',
  website: 'https://institutoravi.com.br',
  whatsapp: '+55 11 98842-1920',
  city: 'São Paulo - SP (Jardins)',
  segment: 'Saúde e Alta Performance',
  subsegment: 'Cirurgia Plástica Facial & Longevidade Saudável',
  targetAudience: 'Homens e mulheres de 35 a 60 anos, classe A/B+, com foco em rejuvenescimento natural, discrição, segurança técnica e alta estética.',
  persona: 'Juliana, 44 anos, empresária em SP, valoriza discrição absoluta, teme o efeito plastificado, busca um cirurgião com sólida formação acadêmica.',
  averageTicket: 'R$ 38.000,00',
  products: 'Procedimentos cirúrgicos de face (Deep Plane Facelift, Blefaroplastia Estruturada, Rinoplastia Preservadora).',
  services: 'Consultoria estética facial de longo prazo, acompanhamento integrado.',
  objectives: ['Autoridade', 'Posicionamento', 'Leads', 'Vendas'],
  pillars: ['Educação', 'Autoridade', 'Prova social', 'Bastidores'],
  formats: ['Reels', 'Carrossel', 'Stories'],
  toneOfVoice: 'Elegante, clínico, sofisticado, sóbrio, empático e com rigor científico sem jargões herméticos.',
  differentiators: 'Pioneiro em Deep Plane Facelift com anestesia sem intubação traumática, ambiente privativo no Jardins.',
  notes: 'Cliente modelo para demonstração de recursos didáticos do sistema Gabriel Speratti.',
  status: 'active',
  onboardingStep: 10,
  avatarUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?q=80&w=400&auto=format&fit=crop',
  healthStatus: 'healthy',
  createdAt: '2026-08-01T10:00:00.000Z',
  updatedAt: '2026-09-23T07:30:00.000Z'
};

export const DEMO_INSTAGRAM_ACCOUNT: InstagramAccount = {
  clientId: DEMO_CLIENT_ID,
  handle: '@dr.ravialencar',
  status: 'CONNECTED',
  isConnected: true,
  connectedAt: '2026-08-02T14:15:00.000Z',
  lastSyncAt: '2026-09-23T07:15:00.000Z',
  nextSyncScheduled: '2026-09-24T06:00:00.000Z',
  appId: 'meta-app-gs-intelligence',
  accountId: 'act_ravi_instagram_official',
  permissions: ['instagram_basic', 'instagram_manage_insights', 'pages_read_engagement']
};

export function generateDemoSnapshots(): AccountSnapshot[] {
  const snapshots: AccountSnapshot[] = [];
  const baseDate = new Date('2026-08-24T00:00:00.000Z');
  
  let currentFollowers = 16200;
  
  for (let i = 0; i < 30; i++) {
    const d = new Date(baseDate);
    d.setUTCDate(baseDate.getUTCDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    
    const dailyGain = 70 + (i % 7) * 15;
    currentFollowers += dailyGain;
    
    const reach = 22000 + (i % 5) * 2100;
    const views = 34000 + (i % 4) * 3200;
    const likes = 1200 + (i % 6) * 180;
    const comments = 85 + (i % 5) * 16;
    const shares = 140 + (i % 7) * 32;
    const saves = 310 + (i % 5) * 45;
    const profileVisits = 480 + (i % 6) * 55;
    const websiteClicks = 38 + (i % 3) * 12;
    const postsPublished = (i % 3 === 0) ? 1 : 0;
    
    const interactions = likes + comments + shares + saves;
    const engagementRate = Number(((interactions / reach) * 100).toFixed(2));
    
    snapshots.push({
      id: `demo-snap-${i + 1}`,
      clientId: DEMO_CLIENT_ID,
      date: dateStr,
      followers: currentFollowers,
      reach,
      views,
      likes,
      comments,
      shares,
      saves,
      profileVisits,
      websiteClicks,
      postsPublished,
      engagementRate,
      source: 'DEMO',
      sourceTimestamp: d.toISOString()
    });
  }
  
  return snapshots;
}

export const DEMO_CONTENTS: Content[] = [
  {
    id: 'demo-c1',
    clientId: DEMO_CLIENT_ID,
    instagramMediaId: 'meta_demo_17928374921',
    title: 'Por que o Facelift moderno não estica a pele',
    caption: 'Durante décadas a cirurgia plástica facial puxava a pele... Hoje atuamos no sistema SMAS profundo.',
    publishedAt: '2026-09-20T18:30:00.000Z',
    format: 'Carrossel',
    pillar: 'Educação',
    objective: 'Autoridade',
    hook: 'Se você tem medo de ficar com o rosto repuxado, você precisa entender o SMAS.',
    hookCategory: 'Quebra de crença',
    cta: 'Envie uma mensagem direta para receber o guia sobre envelhecimento anatômico.',
    tone: 'Clínico e esclarecedor',
    intent: 'Desmistificar procedimento de alto valor',
    metrics: {
      views: 48200,
      reach: 34100,
      likes: 2140,
      comments: 184,
      shares: 412,
      saves: 890,
      engagementRate: 10.63
    },
    aiAnalysis: {
      summary: 'Conteúdo topo de funil com quebra de objeção anatômica.',
      whyItWorked: 'Gera alívio imediato no medo universal da face esticada.',
      strengths: ['Didatismo visual nos slides', 'Alívio de objeção central'],
      weaknesses: ['Slide 4 com excesso de texto'],
      opportunity: 'Transformar cada lâmina anatômica em um Reels individual.',
      hypothesisNote: 'O volume atípico de salvamentos sugere que o público consulta antes de agendar.',
      isHypothesis: true,
      confidence: 'HIGH',
      evidence: ['Taxa de salvamento 2.6% do alcance', '890 salvamentos registrados']
    }
  },
  {
    id: 'demo-c2',
    clientId: DEMO_CLIENT_ID,
    instagramMediaId: 'meta_demo_17928374922',
    title: 'A diferença entre preenchimento e reposicionamento estrutural',
    caption: 'Preencher não é rejuvenescer. Quando você preenche uma estrutura caída, o resultado é o volume exagerado.',
    publishedAt: '2026-09-17T12:15:00.000Z',
    format: 'Reels',
    pillar: 'Posicionamento',
    objective: 'Autoridade',
    hook: 'Por que pacientes de 45 anos estão parando de fazer preenchimento?',
    hookCategory: 'Pergunta',
    cta: 'Comente "ESTRUTURA" para receber nossa aula gravada.',
    tone: 'Crítico e técnico',
    intent: 'Combater "Pillow Face" e valorizar cirurgia estruturada',
    metrics: {
      views: 62400,
      reach: 41200,
      likes: 2980,
      comments: 310,
      shares: 640,
      saves: 1120,
      engagementRate: 12.26
    },
    aiAnalysis: {
      summary: 'Reels de posicionamento crítico contra procedimentos temporários.',
      whyItWorked: 'Toca na dor e arrependimento de excesso de ácido hialurônico.',
      strengths: ['Hook com alta parada de scroll', 'Áudio claro com microfone de lapela'],
      weaknesses: ['CTA complexo demais'],
      opportunity: 'Fazer live tirando dúvidas sobre dissolução de preenchedores antigos.',
      hypothesisNote: 'A retenção nos primeiros 4 segundos atingiu pico de 78%.',
      isHypothesis: true,
      confidence: 'HIGH',
      evidence: ['1.120 salvamentos', 'Compartilhado com amigas em grupos de WhatsApp']
    }
  }
];

export const DEMO_COMPETITORS: Competitor[] = [
  {
    id: 'demo-comp-1',
    clientId: DEMO_CLIENT_ID,
    name: 'Dr. Lucas Rocha Facial',
    instagram: '@dr.lucasrocha_face',
    website: 'https://drlucasrocha.com.br',
    segment: 'Cirurgia Plástica Facial',
    similarityScore: 82,
    similarityCriteria: ['Mesmo subsegmento (Deep Plane)', 'Mesma cidade (São Paulo)', 'Público A/B+'],
    followers: 48500,
    postingFrequencyWeekly: 5,
    topFormats: ['Reels', 'Carrossel'],
    avgViews: 28400,
    avgEngagementRate: 3.4,
    recentThemes: ['Recuperação sem dor', 'Marcação cirúrgica ao vivo', 'Vlog de centro cirúrgico'],
    notes: 'Usa formato muito dinâmico de Reels com cortes rápidos. Foco forte em bastidores.',
    status: 'approved',
    candidateReason: 'Concorrente direto na região dos Jardins / Itaim Bibi',
    evidenceUrl: 'https://instagram.com/dr.lucasrocha_face',
    createdAt: '2026-08-10T11:00:00.000Z',
    updatedAt: '2026-09-23T07:00:00.000Z'
  }
];

export const DEMO_AUDIENCE_INSIGHTS: AudienceInsight[] = [
  {
    id: 'demo-aud-1',
    clientId: DEMO_CLIENT_ID,
    category: 'Medos',
    title: 'Medo de ficar com a face repuxada ou artificial (boca de coringa)',
    description: 'Pacientes de 40-55 anos temem que familiares ou colegas notem que foi feita uma cirurgia invasiva.',
    source: 'Comentários de Reels de pré-operatório',
    sourceUrl: 'https://instagram.com/dr.ravialencar/p/demo1',
    sourceDate: '2026-09-18',
    evidence: '14 comentários explícitos perguntando: "o resultado fica natural ou esticado?"',
    context: 'Dúvida recorrente em mulheres executivas e de cargos de liderança.',
    interpretation: 'A barreira não é o preço (R$ 38k+), mas o risco reputacional de um resultado inautêntico.',
    isHypothesis: false,
    confidence: 'HIGH',
    createdAt: '2026-09-18T10:00:00.000Z'
  },
  {
    id: 'demo-aud-2',
    clientId: DEMO_CLIENT_ID,
    category: 'Dores',
    title: 'Cansaço com a esteira infinita de preenchimentos anuais',
    description: 'Sensação de que o rosto está pesando e ficando arredondado após sucessivas sessões de bioestimuladores.',
    source: 'Directs recebidos na clínica',
    sourceDate: '2026-09-15',
    evidence: 'Relatos de pacientes na primeira consulta de avaliação.',
    interpretation: 'Oportunidade de apresentar a cirurgia estruturada como solução definitiva e elegante.',
    isHypothesis: false,
    confidence: 'HIGH',
    createdAt: '2026-09-15T14:30:00.000Z'
  }
];

export const DEMO_IDEAS: ContentIdea[] = [
  {
    id: 'demo-idea-1',
    clientId: DEMO_CLIENT_ID,
    title: 'Quanto tempo dura um Deep Plane vs Fios de PDO',
    description: 'Comparativo honesto de durabilidade e custo-benefício anatômico.',
    pillar: 'Educação',
    objective: 'Autoridade',
    format: 'Carrossel',
    hook: 'A verdade sobre colocar fios no rosto todo ano vs uma cirurgia estruturada.',
    hookCategory: 'Comparação',
    cta: 'Salve este carrossel para consultar na sua próxima consulta estética.',
    source: 'Pesquisa de Público: Dor do cansaço de procedimentos temporários',
    potential: 'Muito Alto',
    whyDoThis: 'Converte quem já gasta R$ 15k/ano em procedimentos paliativos sem resultado.',
    targetAudienceSnippet: 'Mulheres de 42 a 58 anos buscando custo-benefício de longo prazo.',
    status: 'PLANEJADO',
    notes: 'Usar ilustrações anatômicas sofisticadas em tons neutros.',
    calendarDay: 'terca',
    scheduledTime: '18:00',
    createdAt: '2026-09-21T09:00:00.000Z',
    updatedAt: '2026-09-22T10:00:00.000Z'
  }
];

export const DEMO_CALENDAR_ITEMS: CalendarItem[] = [
  {
    id: 'demo-cal-1',
    clientId: DEMO_CLIENT_ID,
    ideaId: 'demo-idea-1',
    dayOfWeek: 'terca',
    timeSlot: '18:00',
    title: 'Quanto tempo dura um Deep Plane vs Fios de PDO',
    format: 'Carrossel',
    pillar: 'Educação',
    objective: 'Autoridade',
    hook: 'A verdade sobre colocar fios no rosto todo ano vs cirurgia estruturada.',
    cta: 'Salve este carrossel',
    status: 'PLANEJADO',
    notes: 'Post carrossel técnico',
    orderIndex: 0
  }
];

export const DEMO_ALERTS: Alert[] = [
  {
    id: 'demo-alert-1',
    clientId: DEMO_CLIENT_ID,
    clientName: 'Dr. Ravi Alencar (DEMO)',
    type: 'CONTEÚDO ACIMA DA MÉDIA',
    severity: 'high',
    title: 'Reels com 62.4k visualizações superou a média em +84%',
    message: 'O conteúdo "A diferença entre preenchimento e reposicionamento" teve taxa de salvamento recorde.',
    evidence: '1.120 salvamentos vs média histórica de 320 salvamentos por Reels.',
    calculatedMetricComparison: '12.26% de engajamento vs 8.1% da conta',
    status: 'NEW',
    createdAt: '2026-09-22T08:00:00.000Z'
  }
];
