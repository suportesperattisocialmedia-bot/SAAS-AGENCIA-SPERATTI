/**
 * GABRIEL SPERATTI | SOCIAL INTELLIGENCE
 * DADOS MOCK / DEMONSTRAÇÃO EXCLUSIVA DO CLIENTE "RAVI"
 * 
 * ATENÇÃO: Estes dados são fictícios e identificados explicitamente como MOCK
 * para visualização de dashboards, benchmarking e fluxos de trabalho.
 */

import {
  Client,
  InstagramAccount,
  MetricSnapshot,
  Content,
  Competitor,
  AudienceInsight,
  ContentIdea,
  CalendarItem,
  Alert
} from '../types';

export const DEMO_CLIENT_ID = 'client-ravi-demo';

export const DEMO_CLIENT_RAVI: Client = {
  id: DEMO_CLIENT_ID,
  name: 'Dr. Ravi Alencar',
  company: 'Instituto Ravi de Cirurgia Plástica e Longevidade',
  instagram: '@dr.ravialencar',
  website: 'https://institutoravi.com.br',
  whatsapp: '+55 11 98842-1920',
  city: 'São Paulo - SP (Jardins)',
  segment: 'Saúde e Alta Performance',
  subsegment: 'Cirurgia Plástica Facial & Longevidade Saudável',
  targetAudience: 'Homens e mulheres de 35 a 60 anos, classe A/B+, com foco em rejuvenescimento natural, discrição, segurança técnica e alta estética.',
  persona: 'Juliana, 44 anos, empresária em SP, valoriza discrição absoluta, teme o efeito "plastificado", busca um cirurgião com sólida formação acadêmica e refinamento artístico.',
  averageTicket: 'R$ 38.000,00',
  products: 'Procedimentos cirúrgicos de face (Deep Plane Facelift, Blefaroplastia Estruturada, Rinoplastia Preservadora).',
  services: 'Consultoria estética facial de longo prazo, acompanhamento pré e pós-operatório integrado com fisioterapia dermatofuncional.',
  objectives: ['Autoridade', 'Posicionamento', 'Leads', 'Vendas'],
  pillars: ['Educação', 'Autoridade', 'Prova social', 'Bastidores'],
  formats: ['Reels', 'Carrossel', 'Stories'],
  toneOfVoice: 'Elegante, clínico, sofisticado, sóbrio, empático e com rigor científico sem jargões herméticos.',
  differentiators: 'Pioneiro em Deep Plane Facelift com anestesia sem intubação traumática, ambiente privativo tipo hotel boutique no Jardins, foco em "rejuvenescimento invisível".',
  notes: 'Cliente premium com grande receio de mercantilização da medicina. O foco não é volume de seguidores vazios, mas qualificação e captação de pacientes particulares para procedimentos de alto ticket.',
  competitors: ['@dr.lucasrocha_face', '@dramarinafacelift', '@drfernando.jardins'],
  createdAt: '2026-08-01T10:00:00.000Z',
  updatedAt: '2026-09-23T07:30:00.000Z',
  status: 'active',
  onboardingStep: 10
};

export const DEMO_INSTAGRAM_ACCOUNT: InstagramAccount = {
  clientId: DEMO_CLIENT_ID,
  handle: '@dr.ravialencar',
  isConnected: true,
  connectedAt: '2026-08-02T14:15:00.000Z',
  lastSyncAt: '2026-09-23T07:15:00.000Z',
  nextSyncScheduled: '2026-09-24T06:00:00.000Z',
  appId: 'meta-app-gs-intelligence',
  accountId: 'act_ravi_instagram_official',
  permissions: ['instagram_basic', 'instagram_manage_insights', 'pages_read_engagement'],
  errorStatus: null,
  syncState: 'synced'
};

/**
 * Snapshots diários dos últimos 30 dias (até 23/09/2026)
 * Permite cálculo real de 7 dias, 14 dias, 30 dias e comparações período anterior
 */
export function generateDemoSnapshots(): MetricSnapshot[] {
  const snapshots: MetricSnapshot[] = [];
  const baseDate = new Date('2026-09-23T00:00:00Z');
  
  // Base numbers 30 days ago
  let followers = 17550;
  let baseViews = 28000;
  let baseReach = 21000;

  for (let i = 29; i >= 0; i--) {
    const d = new Date(baseDate);
    d.setUTCDate(d.getUTCDate() - i);
    const dateStr = d.toISOString().split('T')[0];

    // Progressive growth with weekend variance
    const isWeekend = d.getUTCDay() === 0 || d.getUTCDay() === 6;
    const dailyGrowth = Math.floor(Math.random() * 25) + (isWeekend ? 15 : 35);
    followers += dailyGrowth;

    const views = Math.floor(baseViews + (30 - i) * 550 + (Math.sin(i) * 3200));
    const reach = Math.floor(baseReach + (30 - i) * 380 + (Math.sin(i) * 2100));
    const likes = Math.floor(views * 0.042);
    const comments = Math.floor(views * 0.005);
    const shares = Math.floor(views * 0.012);
    const saves = Math.floor(views * 0.015);
    const profileVisits = Math.floor(views * 0.038);
    const postsCount = (i % 2 === 0 || i % 5 === 0) ? 1 : 0;
    const engagementRate = Number((((likes + comments + shares + saves) / reach) * 100).toFixed(2));

    snapshots.push({
      id: `snap-${dateStr}`,
      clientId: DEMO_CLIENT_ID,
      timestamp: dateStr,
      followers,
      reach,
      views,
      likes,
      comments,
      shares,
      saves,
      profileVisits,
      postsCount,
      engagementRate
    });
  }

  return snapshots;
}

export const DEMO_CONTENTS: Content[] = [
  {
    id: 'cnt-01',
    clientId: DEMO_CLIENT_ID,
    instagramPostId: 'ig_post_88921',
    title: 'Por que o facelift moderno não estica a pele',
    caption: 'Durante décadas, o estigma da cirurgia plástica facial foi o aspecto repuxado ou paralisado. A técnica moderna do Deep Plane atua na musculatura profunda, restaurando o suporte natural sem tensão cutânea. Entenda a anatomia do rejuvenescimento invisível.',
    publishedAt: '2026-09-21T18:30:00.000Z',
    format: 'Reels',
    pillar: 'Educação',
    objective: 'Autoridade',
    hook: 'Existe um motivo pelo qual os maiores cirurgiões do mundo abandonaram a técnica tradicional de esticar a pele.',
    hookCategory: 'Curiosidade',
    cta: 'Envie uma mensagem direta com a palavra FACELIFT para receber o guia clínico comparativo.',
    tone: 'Científico e elegante',
    intent: 'Desmistificar receio de resultado artificial e posicionar o médico como referência técnica avançada',
    metrics: {
      views: 42800,
      likes: 1890,
      comments: 245,
      shares: 612,
      saves: 540,
      reach: 36200,
      engagementRate: 9.08
    },
    aiAnalysis: {
      summary: 'Conteúdo de alta performance focado na desconstrução do principal medo da persona (aspecto esticado e artificial).',
      whyItWorked: 'Gancho direto que toca na maior objeção da mulher de 40+ anos. Linguagem simples explicando anatomia muscular com animação 3D clara.',
      whyItMayHaveUnderperformed: 'Não aplicável (conteúdo superou a média do perfil em +184% de visualizações).',
      strengths: ['Retenção alta nos primeiros 3 segundos', 'Taxa de salvamento elevada (1,49% do alcance)', 'CTA alinhado à qualificação de leads'],
      weaknesses: ['Legenda ligeiramente longa para leitura rápida em mobile'],
      opportunity: 'Transformar esta explicação em uma série de 3 episódios abordando terço médio, terço inferior e pescoço.',
      hypothesisNote: 'Hipótese baseada no comportamento de compartilhamento nos DMs.'
    }
  },
  {
    id: 'cnt-02',
    clientId: DEMO_CLIENT_ID,
    instagramPostId: 'ig_post_88914',
    title: '3 sinais de que o terço médio da face perdeu sustentação',
    caption: 'O envelhecimento facial não acontece de repente. Ele começa com a descida suave dos coxins de gordura malar, aprofundando o sulco nasogeniano (bigode chinês). Aqui está o que observar no espelho antes de preencher sem critério.',
    publishedAt: '2026-09-17T12:00:00.000Z',
    format: 'Carrossel',
    pillar: 'Educação',
    objective: 'Leads',
    hook: 'Se você tem mais de 38 anos e sente que seu rosto começou a "derreter", pare de preencher sem ver isto.',
    hookCategory: 'Dor',
    cta: 'Comente SUSTENTAÇÃO para agendar sua avaliação facial detalhada.',
    tone: 'Didático e acolhedor',
    intent: 'Evitar preenchimentos excessivos e direcionar para diagnóstico estruturado',
    metrics: {
      views: 29400,
      likes: 1120,
      comments: 138,
      shares: 340,
      saves: 720,
      reach: 22800,
      engagementRate: 10.16
    },
    aiAnalysis: {
      summary: 'Carrossel com pico de salvamentos, demonstrando grande valor utilitário para a audiência.',
      whyItWorked: 'O gancho de dor ressoou diretamente com mulheres que já fizeram ácido hialurônico e ficaram com a face pesada.',
      whyItMayHaveUnderperformed: 'Alcance em não-seguidores foi menor do que no formato Reels.',
      strengths: ['Taxa de salvamento muito acima da média (+210%)', 'Comentários com alta intenção de agendamento'],
      weaknesses: ['Design do slide 5 tem texto denso demais'],
      opportunity: 'Fazer um Reels reagindo a uma simulação fotográfica deste mesmo caso.',
      hypothesisNote: 'Hipótese da IA para explicar alta retenção dos slides.'
    }
  },
  {
    id: 'cnt-03',
    clientId: DEMO_CLIENT_ID,
    instagramPostId: 'ig_post_88892',
    title: 'Bastidores: Por que operamos em hospital boutique?',
    caption: 'Muitos pacientes perguntam por que não operamos em clínicas ambulatoriais comuns. Para cirurgias de face que demandam 5 a 6 horas de extrema precisão, a segurança anestésica e o conforto de internação privativa são inegociáveis.',
    publishedAt: '2026-09-13T19:00:00.000Z',
    format: 'Carrossel',
    pillar: 'Bastidores',
    objective: 'Posicionamento',
    hook: 'O detalhe que ninguém mostra sobre a cirurgia plástica de alto padrão.',
    hookCategory: 'Curiosidade',
    cta: 'Qual elemento você considera mais importante ao escolher seu cirurgião?',
    tone: 'Institucional sóbrio',
    intent: 'Justificar o ticket médio elevado e reforçar a segurança do procedimento',
    metrics: {
      views: 14200,
      likes: 540,
      comments: 42,
      shares: 88,
      saves: 110,
      reach: 12100,
      engagementRate: 6.44
    },
    aiAnalysis: {
      summary: 'Conteúdo institucional com engajamento moderado, mas forte valor de ancoragem de valor.',
      whyItWorked: 'Fotos reais do centro cirúrgico geram autoridade e segurança tangível.',
      whyItMayHaveUnderperformed: 'Não teve apelo viral por ser mais institucional, o que é esperado para o pilar de bastidores.',
      strengths: ['Ancoragem de ticket médio', 'Excelente aceitação pelos pacientes já em negociação'],
      weaknesses: ['Baixo volume de compartilhamento'],
      opportunity: 'Adicionar depoimento do médico anestesista chefe para humanizar o protocolo de segurança.',
      hypothesisNote: 'Inferência qualitativa de posicionamento.'
    }
  },
  {
    id: 'cnt-04',
    clientId: DEMO_CLIENT_ID,
    instagramPostId: 'ig_post_88840',
    title: 'Blefaroplastia: Quando operar a pálpebra superior?',
    caption: 'O peso nos olhos ao final do dia muitas vezes é atribuído ao cansaço, mas trata-se de sobra de pele e hipertrofia de bolsas palpebrais. Veja como uma incisão camuflada de 45 minutos renova o olhar.',
    publishedAt: '2026-09-08T17:45:00.000Z',
    format: 'Reels',
    pillar: 'Educação',
    objective: 'Autoridade',
    hook: 'Você acorda sentindo que seus olhos continuam com ar cansado? O problema pode não ser sono.',
    hookCategory: 'Pergunta',
    cta: 'Clique no link da bio para conferir os artigos clínicos completos.',
    tone: 'Clínico empático',
    intent: 'Educação sobre queixa funcional e estética de pálpebra',
    metrics: {
      views: 31200,
      likes: 1240,
      comments: 112,
      shares: 410,
      saves: 480,
      reach: 25900,
      engagementRate: 8.65
    },
    aiAnalysis: {
      summary: 'Reels dinâmico de 35 segundos com excelente retenção.',
      whyItWorked: 'Mostrou a marcação cirúrgica no próprio médico explicando o vetor anatômico.',
      whyItMayHaveUnderperformed: 'CTA fraco direcionando para link da bio ao invés de direct.',
      strengths: ['Clareza didática', 'Retenção média de 78%'],
      weaknesses: ['Perda de conversão no CTA final'],
      opportunity: 'Testar CTA direto: "Envie PALPEBRA no direct".',
      hypothesisNote: 'Hipótese sobre conversão de CTA.'
    }
  },
  {
    id: 'cnt-05',
    clientId: DEMO_CLIENT_ID,
    instagramPostId: 'ig_post_88791',
    title: 'Foto Institucional da Equipe de Enfermagem',
    caption: 'Nossa equipe de enfermagem especializada em pós-operatório imediato. Cuidado humano em cada detalhe.',
    publishedAt: '2026-09-03T11:00:00.000Z',
    format: 'Foto',
    pillar: 'Bastidores',
    objective: 'Reconhecimento',
    hook: 'Cuidado e dedicação em cada detalhe da nossa equipe.',
    hookCategory: 'Autoridade',
    cta: 'Deixe seu carinho nos comentários para quem cuida de você.',
    tone: 'Emotivo',
    intent: 'Homenagem interna',
    metrics: {
      views: 7800,
      likes: 310,
      comments: 28,
      shares: 14,
      saves: 18,
      reach: 6900,
      engagementRate: 5.36
    },
    aiAnalysis: {
      summary: 'Foto estática tradicional com menor entrega orgânica pelo algoritmo do Instagram.',
      whyItWorked: 'Gerou carinho e comentários afetuosos de ex-pacientes.',
      whyItMayHaveUnderperformed: 'Formato foto estática sem gancho provocativo tem alcance restrito no Instagram atual.',
      strengths: ['Humanização de marca'],
      weaknesses: ['Alcance e salvamentos muito baixos (-65% em relação à média)'],
      opportunity: 'Transformar apresentações de equipe em Reels com formato "Dia na vida" ou "O que a enfermeira checa antes de você acordar".',
      hypothesisNote: 'Hipótese de formato e algoritmo.'
    }
  }
];

export const DEMO_COMPETITORS: Competitor[] = [
  {
    id: 'comp-01',
    clientId: DEMO_CLIENT_ID,
    name: 'Dr. Lucas Rocha - Face Surgery',
    instagram: '@dr.lucasrocha_face',
    website: 'https://drlucasrocha.med.br',
    segment: 'Cirurgia Plástica Facial',
    similarityScore: 94,
    followers: 46200,
    postingFrequencyWeekly: 4.5,
    topFormats: ['Reels', 'Carrossel'],
    avgViews: 38500,
    avgEngagementRate: 4.8,
    recentThemes: ['Recuperação de Deep Plane', 'Mitos sobre inchaço pós-cirúrgico', 'Lifting cervical antes dos 50'],
    notes: 'Concorrente direto no Jardins. Foco em produção visual cinematográfica com câmera de cinema, porém com legendas muito curtas e poucos CTAs claros para direct.',
    status: 'approved',
    createdAt: '2026-08-05T12:00:00.000Z',
    updatedAt: '2026-09-20T15:00:00.000Z'
  },
  {
    id: 'comp-02',
    clientId: DEMO_CLIENT_ID,
    name: 'Dra. Marina Facelift',
    instagram: '@dramarinafacelift',
    website: 'https://marinafacelift.com',
    segment: 'Rejuvenescimento Facial Cirúrgico',
    similarityScore: 88,
    followers: 82400,
    postingFrequencyWeekly: 6.0,
    topFormats: ['Reels', 'Stories'],
    avgViews: 52000,
    avgEngagementRate: 3.9,
    recentThemes: ['Pós-operatório dia a dia', 'Depoimentos de pacientes 60+', 'Mini lifting vs Deep Plane'],
    notes: 'Forte presença em stories diários e lives semanais. Muito conteúdo focado na mulher de 60 anos. Oportunidade para Dr. Ravi: posicionar-se mais forte na faixa de 38 a 52 anos que busca prevenção de envelhecimento grave.',
    status: 'approved',
    createdAt: '2026-08-05T12:00:00.000Z',
    updatedAt: '2026-09-20T15:00:00.000Z'
  },
  {
    id: 'comp-03',
    clientId: DEMO_CLIENT_ID,
    name: 'Dr. Fernando Jardins',
    instagram: '@drfernando.jardins',
    website: 'https://fernandojardins.com.br',
    segment: 'Cirurgia Plástica Geral & Face',
    similarityScore: 76,
    followers: 31000,
    postingFrequencyWeekly: 2.0,
    topFormats: ['Foto', 'Carrossel'],
    avgViews: 12400,
    avgEngagementRate: 3.2,
    recentThemes: ['Lipoaspiração + Mama', 'Face combinada', 'Apresentação de simpósio'],
    notes: 'Não tem foco 100% exclusivo em face. Perde autoridade comparado a quem é especialista cirúrgico dedicado.',
    status: 'approved',
    createdAt: '2026-08-05T12:00:00.000Z',
    updatedAt: '2026-09-20T15:00:00.000Z'
  },
  {
    id: 'comp-04',
    clientId: DEMO_CLIENT_ID,
    name: 'Dr. Thiago Esteves Facial',
    instagram: '@drthiagoesteves',
    website: 'https://thiagoestevesface.com.br',
    segment: 'Cirurgia Facial & Rinoplastia',
    similarityScore: 82,
    followers: 27800,
    postingFrequencyWeekly: 3.5,
    topFormats: ['Reels', 'Carrossel'],
    avgViews: 24000,
    avgEngagementRate: 4.1,
    recentThemes: ['Rinoplastia estruturada', 'Cicatriz invisível atrás da orelha', 'Checklist pré-operatório'],
    notes: 'Identificado via pesquisa de mercado automática. Forte em rinoplastia funcional.',
    status: 'candidate',
    candidateReason: 'Atua no mesmo raio geográfico (Jardins / Itaim Bibi) com procedimentos de face e público de alta renda.',
    createdAt: '2026-09-22T08:00:00.000Z',
    updatedAt: '2026-09-22T08:00:00.000Z'
  }
];

export const DEMO_AUDIENCE_INSIGHTS: AudienceInsight[] = [
  {
    id: 'aud-01',
    clientId: DEMO_CLIENT_ID,
    category: 'Medos',
    title: 'Medo visceral de ficar com a face artificial ou com o estigma da cirurgia plástica',
    description: 'A persona teme que amigas ou familiares percebam que ela fez uma intervenção cirúrgica e a julguem por ter ficado com traços alterados ou "boca de coringa".',
    source: 'Entrevistas de qualificação na recepção da clínica + comentários em posts do Dr. Ravi',
    sourceDate: '15/09/2026',
    context: '8 em cada 10 pacientes particulares mencionam explicitamente a expressão "não quero que ninguém note que operei".',
    interpretation: 'A comunicação deve enfatizar "rejuvenescimento indetectável" e recuperação da fisionomia jovem original, nunca "mudança de traços".',
    isHypothesis: false,
    createdAt: '2026-09-16T10:00:00.000Z'
  },
  {
    id: 'aud-02',
    clientId: DEMO_CLIENT_ID,
    category: 'Dores',
    title: 'Cansaço de tratamentos dermatológicos caros que não sustentam a flacidez',
    description: 'Pacientes que já gastaram mais de R$ 50 mil em bioestimuladores, fios de sustentação e ultrassom microfocado e perceberam que o resultado durou menos de 6 meses.',
    source: 'Histórico de prontuários clínicos dos últimos 60 dias',
    sourceDate: '10/09/2026',
    context: 'Fadiga de consultório dermatológico com expectativas frustradas sobre tração de pele pesada.',
    interpretation: 'Criar comparativo honesto: o limite real dos procedimentos não-invasivos versus o momento onde apenas a cirurgia estruturada resolve.',
    isHypothesis: false,
    createdAt: '2026-09-12T14:00:00.000Z'
  },
  {
    id: 'aud-03',
    clientId: DEMO_CLIENT_ID,
    category: 'Objeções',
    title: 'Tempo de recuperação e afastamento dos compromissos sociais/profissionais',
    description: 'A mulher executiva ou profissional liberal não pode ficar 45 dias trancada em casa com manchas roxas ou inchaço evidente.',
    source: 'Mensagens diretas no Instagram do cliente (DM comercial)',
    sourceDate: '18/09/2026',
    context: 'Perguntas frequentes no direct: "com quantos dias posso voltar a comparecer a reuniões presenciais?".',
    interpretation: 'Conteúdos explicativos sobre o protocolo de recuperação acelerada com laser no pós-operatório e fisioterapia drenante.',
    isHypothesis: false,
    createdAt: '2026-09-19T09:30:00.000Z'
  },
  {
    id: 'aud-04',
    clientId: DEMO_CLIENT_ID,
    category: 'Desejos',
    title: 'Olhar no espelho e reconhecer a energia interior sem o peso dos anos',
    description: 'A persona sente-se com a vitalidade dos 30 anos mentalmente, mas o reflexo no espelho transmite cansaço crônico e apatia que ela não sente por dentro.',
    source: 'Depoimentos de pacientes em vídeos de pós-operatório de 6 meses',
    sourceDate: '05/09/2026',
    context: 'Frase recorrente: "Eu só queria que o meu rosto refletisse a disposição e a alegria que sinto por dentro".',
    interpretation: 'Campanhas emocionais focadas em coerência entre espírito ativo e estética preservada.',
    isHypothesis: false,
    createdAt: '2026-09-06T11:00:00.000Z'
  },
  {
    id: 'aud-05',
    clientId: DEMO_CLIENT_ID,
    category: 'Tendências',
    title: 'Crescimento de cirurgias preventivas em pacientes de 38 a 46 anos (Early Facelift)',
    description: 'Tendência global observada nos simpósios internacionais de cirurgia plástica facial: intervir antes da perda de elasticidade extrema para resultados mais duradouros.',
    source: 'Google Trends Brasil + Sociedade Brasileira de Cirurgia Plástica',
    sourceDate: '20/09/2026',
    context: 'Buscas por "deep plane antes dos 45" cresceram +64% nos últimos 12 meses.',
    interpretation: 'Hipótese estratégica da IA: antecipar a demanda desse público educando sobre a anatomia do envelhecimento inicial.',
    isHypothesis: true,
    createdAt: '2026-09-21T16:00:00.000Z'
  },
  {
    id: 'aud-06',
    clientId: DEMO_CLIENT_ID,
    category: 'Dúvidas',
    title: 'Qual a diferença exata entre Deep Plane, SMAS plication e Minilifting?',
    description: 'Confusão terminológica comum criada pelo marketing agressivo de médicos concorrentes na internet.',
    source: 'Caixas de perguntas abertas nos stories de Dr. Ravi',
    sourceDate: '12/09/2026',
    context: 'Mais de 32 perguntas na mesma caixa perguntando sobre nomenclaturas cirúrgicas.',
    interpretation: 'Oportunidade para Carrossel didático com ilustrações anatômicas simplificadas sem imagens chocantes de sangue.',
    isHypothesis: false,
    createdAt: '2026-09-13T10:00:00.000Z'
  }
];

export const DEMO_IDEAS: ContentIdea[] = [
  {
    id: 'idea-01',
    clientId: DEMO_CLIENT_ID,
    title: 'Por que o Deep Plane dura mais que o minilifting clássico',
    description: 'Comparativo anatômico mostrando que reposicionar o músculo por baixo do ligamento retentor evita que a gravidade puxe o tecido rapidamente.',
    pillar: 'Educação',
    objective: 'Autoridade',
    format: 'Carrossel',
    hook: 'Todo mundo quer saber quanto tempo dura um lifting facial. Aqui está a verdade biológica que quase ninguém explica.',
    hookCategory: 'Curiosidade',
    cta: 'Salve este post para consultar quando for planejar sua cirurgia facial.',
    source: 'Histórico de alta retenção no post sobre sustentação + dúvidas da caixinha',
    potential: 'Muito Alto',
    whyDoThis: 'Responde à dúvida principal de retorno financeiro e longevidade do investimento cirúrgico da paciente de classe A.',
    targetAudienceSnippet: 'Mulheres de 42 a 58 anos decidindo entre procedimentos menos invasivos ou cirurgia definitiva.',
    status: 'PLANEJADO',
    notes: 'Usar ilustrações com paleta neutra e elegante do Instituto Ravi.',
    calendarDay: 'Terça',
    scheduledTime: '12:00',
    createdAt: '2026-09-20T11:00:00.000Z',
    updatedAt: '2026-09-22T09:00:00.000Z'
  },
  {
    id: 'idea-02',
    clientId: DEMO_CLIENT_ID,
    title: 'Onde fica a cicatriz do Facelift e como ela desaparece',
    description: 'Gravação em macro mostrando o contorno anatômico pré e retroauricular e a evolução da linha aos 3, 6 e 12 meses.',
    pillar: 'Prova social',
    objective: 'Leads',
    format: 'Reels',
    hook: 'Você tem medo de fazer plástica no rosto e ficar com uma cicatriz visível atrás da orelha? Olhe isto bem de perto.',
    hookCategory: 'Dor',
    cta: 'Envie CICATRIZ no direct para ver a evolução fotográfica de casos reais.',
    source: 'Mapeamento de medos da persona na central de inteligência de público',
    potential: 'Muito Alto',
    whyDoThis: 'A cicatriz é a segunda maior objeção de conversão em cirurgia facial. Desmistificar com zoom óptico gera confiança máxima.',
    targetAudienceSnippet: 'Pacientes em estágio final de tomada de decisão.',
    status: 'ROTEIRO',
    notes: 'Dr. Ravi deve estar com jaleco institucional e postura acolhedora.',
    calendarDay: 'Quinta',
    scheduledTime: '18:30',
    createdAt: '2026-09-21T14:30:00.000Z',
    updatedAt: '2026-09-22T10:00:00.000Z'
  },
  {
    id: 'idea-03',
    clientId: DEMO_CLIENT_ID,
    title: '3 coisas que Dr. Ravi nunca faz em um centro cirúrgico facial',
    description: 'Posicionamento contrarian sobre práticas arriscadas ou excessivas de outros profissionais (ex: tração excessiva, lipo de papada agressiva sem avaliar platisma).',
    pillar: 'Autoridade',
    objective: 'Posicionamento',
    format: 'Reels',
    hook: 'Como cirurgião com mais de 15 anos dedicado exclusivamente à face, estas são 3 coisas que você NUNCA vai me ver fazer.',
    hookCategory: 'Contrarian',
    cta: 'Você concorda com essa postura conservadora e segura? Deixe sua opinião.',
    source: 'Monitor de concorrentes (concorrentes apelando para técnicas milagrosas)',
    potential: 'Alto',
    whyDoThis: 'Separa o especialista ético dos aventureiros da medicina estética rápida.',
    targetAudienceSnippet: 'Público que busca segurança clínica em primeiro lugar.',
    status: 'IDEIA',
    notes: 'Alinhar o tom para não soar arrogante, mas firme e pautado na literatura.',
    calendarDay: 'Sexta',
    scheduledTime: '19:00',
    createdAt: '2026-09-22T15:00:00.000Z',
    updatedAt: '2026-09-22T15:00:00.000Z'
  },
  {
    id: 'idea-04',
    clientId: DEMO_CLIENT_ID,
    title: 'A rotina da manhã no dia de uma cirurgia de 6 horas',
    description: 'Vlog silencioso e estético mostrando o preparo mental, o briefing com a equipe anestésica e o ambiente do hospital.',
    pillar: 'Bastidores',
    objective: 'Reconhecimento',
    format: 'Reels',
    hook: 'São 5h45 da manhã. Veja como começa o dia em que transformamos o olhar e a autoestima de uma paciente.',
    hookCategory: 'História',
    cta: 'Compartilhe com quem também ama ver a seriedade dos bastidores da medicina.',
    source: 'Excelente recepção dos posts de humanização',
    potential: 'Médio',
    whyDoThis: 'Cria conexão afetiva e humaniza a figura do cirurgião de alto escalão.',
    targetAudienceSnippet: 'Seguidores que acompanham a rotina e valorizam disciplina.',
    status: 'EM PRODUÇÃO',
    notes: 'Trilha sonora clássica suave, iluminação natural, sem música pop.',
    calendarDay: 'Segunda',
    scheduledTime: '07:30',
    createdAt: '2026-09-18T10:00:00.000Z',
    updatedAt: '2026-09-21T18:00:00.000Z'
  }
];

export const DEMO_CALENDAR_ITEMS: CalendarItem[] = [
  {
    id: 'cal-01',
    clientId: DEMO_CLIENT_ID,
    ideaId: 'idea-04',
    dayOfWeek: 'Segunda',
    timeSlot: '07:30',
    title: 'A rotina da manhã no dia de uma cirurgia de 6 horas',
    format: 'Reels',
    pillar: 'Bastidores',
    objective: 'Reconhecimento',
    hook: 'São 5h45 da manhã. Veja como começa o dia de cirurgia no Jardins.',
    cta: 'Compartilhe com quem valoriza a medicina séria.',
    status: 'EM PRODUÇÃO',
    notes: 'Vídeo gravado, aguardando edição final de cor.',
    orderIndex: 0
  },
  {
    id: 'cal-02',
    clientId: DEMO_CLIENT_ID,
    ideaId: 'idea-01',
    dayOfWeek: 'Terça',
    timeSlot: '12:00',
    title: 'Por que o Deep Plane dura mais que o minilifting clássico',
    format: 'Carrossel',
    pillar: 'Educação',
    objective: 'Autoridade',
    hook: 'A verdade biológica sobre a longevidade do lifting facial.',
    cta: 'Salve para consultar no futuro.',
    status: 'PLANEJADO',
    notes: 'Slides 1 a 6 estruturados no Figma da agência.',
    orderIndex: 0
  },
  {
    id: 'cal-03',
    clientId: DEMO_CLIENT_ID,
    dayOfWeek: 'Quarta',
    timeSlot: '17:00',
    title: 'Stories Interativos: Enquete sobre medos estéticos',
    format: 'Stories',
    pillar: 'Educação',
    objective: 'Engajamento',
    hook: 'O que mais te impede de fazer um procedimento facial?',
    cta: 'Vote na enquete dos stories.',
    status: 'AGENDADO',
    notes: 'Sequência de 5 stories com sticker de enquete e caixinha de perguntas.',
    orderIndex: 0
  },
  {
    id: 'cal-04',
    clientId: DEMO_CLIENT_ID,
    ideaId: 'idea-02',
    dayOfWeek: 'Quinta',
    timeSlot: '18:30',
    title: 'Onde fica a cicatriz do Facelift e como ela desaparece',
    format: 'Reels',
    pillar: 'Prova social',
    objective: 'Leads',
    hook: 'Você tem medo de cicatriz no rosto? Olhe isto bem de perto.',
    cta: 'Envie CICATRIZ no direct para guia completo.',
    status: 'ROTEIRO',
    notes: 'Aprovação de roteiro com Gabriel Speratti.',
    orderIndex: 0
  },
  {
    id: 'cal-05',
    clientId: DEMO_CLIENT_ID,
    ideaId: 'idea-03',
    dayOfWeek: 'Sexta',
    timeSlot: '19:00',
    title: '3 coisas que Dr. Ravi nunca faz em um centro cirúrgico facial',
    format: 'Reels',
    pillar: 'Autoridade',
    objective: 'Posicionamento',
    hook: '3 coisas que você NUNCA vai me ver fazer com o rosto de um paciente.',
    cta: 'Deixe sua opinião nos comentários.',
    status: 'IDEIA',
    notes: 'Agendado para gravação no próximo bloco de estúdio.',
    orderIndex: 0
  }
];

export const DEMO_ALERTS: Alert[] = [
  {
    id: 'alert-01',
    clientId: DEMO_CLIENT_ID,
    clientName: 'Dr. Ravi Alencar',
    type: 'CONTEÚDO ACIMA DA MÉDIA',
    severity: 'medium',
    title: 'Reels "Facelift Moderno" atingiu +184% acima da média',
    message: 'O Reels publicado em 21/09 superou a média dos últimos 30 dias em retenção e gerou 245 comentários com 48 intenções de agendamento no direct.',
    calculatedMetricComparison: '42.800 views vs média do perfil de 15.080 views (+183,8%)',
    status: 'NOVO',
    createdAt: '2026-09-22T08:15:00.000Z'
  },
  {
    id: 'alert-02',
    clientId: DEMO_CLIENT_ID,
    clientName: 'Dr. Ravi Alencar',
    type: 'CRESCIMENTO',
    severity: 'low',
    title: 'Crescimento consistente de seguidores qualificados (+4,8%)',
    message: 'Ganho líquido de 880 seguidores nos últimos 14 dias com perfil de São Paulo capital e idade de 35 a 54 anos.',
    calculatedMetricComparison: '+880 novos seguidores vs período anterior de +510 (+72,5%)',
    status: 'NOVO',
    createdAt: '2026-09-22T09:00:00.000Z'
  },
  {
    id: 'alert-03',
    clientId: DEMO_CLIENT_ID,
    clientName: 'Dr. Ravi Alencar',
    type: 'OPORTUNIDADE',
    severity: 'medium',
    title: 'Alta demanda por "recuperação rápida" não atendida nos posts',
    message: 'A análise de público detectou que 4 concorrentes estão abordando tempo de afastamento e o perfil do Dr. Ravi ainda não tem post específico sobre retorno às atividades em 14 dias.',
    calculatedMetricComparison: 'Gap temático identificado: 0 conteúdos publicados nos últimos 45 dias.',
    status: 'NOVO',
    createdAt: '2026-09-21T14:20:00.000Z'
  },
  {
    id: 'alert-04',
    clientId: DEMO_CLIENT_ID,
    clientName: 'Dr. Ravi Alencar',
    type: 'CONCORRENTE',
    severity: 'low',
    title: 'Dra. Marina Facelift aumentou frequência para 6 posts/semana',
    message: 'A concorrente intensificou a cobertura de depoimentos diários em stories e vídeos curtos de pacientes de 60+ anos.',
    calculatedMetricComparison: '+33% na frequência de postagem nos últimos 14 dias.',
    status: 'VISUALIZADO',
    createdAt: '2026-09-19T11:00:00.000Z'
  }
];
