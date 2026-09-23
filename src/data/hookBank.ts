/**
 * Banco de Ganchos Estratégicos (Hook Bank)
 * Categorias mapeadas para criação e roteirização orientada por dados
 */
import { HookCategory, HookTemplate } from '../types';

export const HOOK_CATEGORIES: HookCategory[] = [
  'Curiosidade',
  'Polêmica',
  'Contrarian',
  'Erro',
  'História',
  'Resultado',
  'Autoridade',
  'Dor',
  'Desejo',
  'Comparação',
  'Lista',
  'Caso real',
  'Pergunta',
  'Quebra de crença'
];

export const HOOK_TEMPLATES: HookTemplate[] = [
  {
    id: 'hook-1',
    category: 'Curiosidade',
    title: 'O segredo que quase ninguém revela',
    formula: 'Existe um motivo pelo qual [grupo relevante] nunca fala sobre [assunto]',
    example: 'Existe um motivo pelo qual os maiores restaurantes de SP nunca postam foto de comida no feed.',
    bestForPillars: ['Educação', 'Autoridade'],
    historicalAvgViewsDiff: '+34%',
    recommendedFormat: 'Reels',
    psychologicalTrigger: 'Gatilho de Informação Privilegiada'
  },
  {
    id: 'hook-2',
    category: 'Polêmica',
    title: 'Desafiando a prática comum do mercado',
    formula: 'Se você ainda faz [prática comum], você está literalmente perdendo [recurso/tempo/dinheiro]',
    example: 'Se você ainda usa 30 hashtags e faz sorteio no Instagram, você está jogando dinheiro no lixo.',
    bestForPillars: ['Autoridade', 'Posicionamento'],
    historicalAvgViewsDiff: '+58%',
    recommendedFormat: 'Carrossel',
    psychologicalTrigger: 'Quebra de Paradigma'
  },
  {
    id: 'hook-3',
    category: 'Contrarian',
    title: 'Visão contrária ao senso comum',
    formula: 'Todo mundo diz que você precisa de [X]. Aqui está o porquê de você fazer exatamente o oposto.',
    example: 'Todo mundo diz que você precisa postar 3 Reels por dia. Aqui está por que reduzir para 3 por semana triplicou nosso faturamento.',
    bestForPillars: ['Autoridade', 'Educação'],
    historicalAvgViewsDiff: '+47%',
    recommendedFormat: 'Reels',
    psychologicalTrigger: 'Subversão de Consenso'
  },
  {
    id: 'hook-4',
    category: 'Erro',
    title: 'O erro invisível que custa caro',
    formula: '3 erros graves que você comete ao [ação] e nem percebe',
    example: '3 erros graves que médicos cometem no Instagram e que afastam pacientes particulares.',
    bestForPillars: ['Educação', 'Venda'],
    historicalAvgViewsDiff: '+29%',
    recommendedFormat: 'Carrossel',
    psychologicalTrigger: 'Aversão à Perda'
  },
  {
    id: 'hook-5',
    category: 'História',
    title: 'A narrativa de ponto de virada',
    formula: 'Em [ano/momento], nós tomamos uma decisão que quase quebrou a empresa...',
    example: 'Em 2024, nós decidimos demitir 40% da carteira de clientes. O que aconteceu nos 6 meses seguintes mudou tudo.',
    bestForPillars: ['Conexão', 'Bastidores'],
    historicalAvgViewsDiff: '+21%',
    recommendedFormat: 'Reels',
    psychologicalTrigger: 'Vulnerabilidade Controlada'
  },
  {
    id: 'hook-6',
    category: 'Resultado',
    title: 'Demonstração irrefutável de métricas',
    formula: 'Como nós fomos de [ponto A] para [ponto B] em apenas [período de tempo]',
    example: 'Como o Dr. Ravi gerou 48 novos agendamentos particulares em 21 dias com apenas 4 Carrosséis.',
    bestForPillars: ['Prova social', 'Venda'],
    historicalAvgViewsDiff: '+62%',
    recommendedFormat: 'Carrossel',
    psychologicalTrigger: 'Prova Social Irrefutável'
  },
  {
    id: 'hook-7',
    category: 'Autoridade',
    title: 'Chancela e posicionamento de especialista',
    formula: 'Depois de analisar mais de [número expressivo] de [objeto de estudo], eu notei um único padrão.',
    example: 'Depois de analisar mais de 1.200 campanhas de captação de pacientes, eu notei um padrão que define quem escala.',
    bestForPillars: ['Autoridade', 'Educação'],
    historicalAvgViewsDiff: '+41%',
    recommendedFormat: 'Reels',
    psychologicalTrigger: 'Volume de Horas de Voo'
  },
  {
    id: 'hook-8',
    category: 'Dor',
    title: 'Toque na ferida real e urgente',
    formula: 'Você trabalha 14 horas por dia, mas no final do mês sente que [consequência dolorosa]?',
    example: 'Você lota a agenda de consultas, mas no final do mês sente que trabalha apenas para pagar impostos e clínica?',
    bestForPillars: ['Conexão', 'Venda'],
    historicalAvgViewsDiff: '+38%',
    recommendedFormat: 'Reels',
    psychologicalTrigger: 'Identificação Empática Imediata'
  },
  {
    id: 'hook-9',
    category: 'Desejo',
    title: 'Ponte para a transformação aspiracional',
    formula: 'Como seria se você pudesse [resultado dos sonhos] sem ter que [maior sacrifício]?',
    example: 'Como seria ter a agenda fechada com 3 meses de antecedência sem precisar fazer dancinha no TikTok?',
    bestForPillars: ['Venda', 'Desejo'],
    historicalAvgViewsDiff: '+33%',
    recommendedFormat: 'Reels',
    psychologicalTrigger: 'Visualização de Estado Futuro'
  },
  {
    id: 'hook-10',
    category: 'Comparação',
    title: 'Contraste entre amador vs profissional',
    formula: 'A diferença entre quem fatura [baixo valor] e quem fatura [alto valor] com [ferramenta]',
    example: 'A diferença real entre uma clínica que cobra R$ 250 e uma que cobra R$ 1.500 na consulta.',
    bestForPillars: ['Educação', 'Posicionamento'],
    historicalAvgViewsDiff: '+44%',
    recommendedFormat: 'Carrossel',
    psychologicalTrigger: 'Contraste de Status'
  },
  {
    id: 'hook-11',
    category: 'Lista',
    title: 'Framework escaneável em tópicos',
    formula: '[Número] coisas que eu gostaria de ter aprendido antes de começar a [área]',
    example: '5 checklists práticos que todo gestor de clínica precisa checar toda segunda-feira de manhã.',
    bestForPillars: ['Educação'],
    historicalAvgViewsDiff: '+19%',
    recommendedFormat: 'Carrossel',
    psychologicalTrigger: 'Economia Cognitiva'
  },
  {
    id: 'hook-12',
    category: 'Caso real',
    title: 'Desconstrução de um caso concreto de campo',
    formula: 'Estudo de caso: como o cliente [nome/perfil] faturou [resultado] em [prazo]',
    example: 'Estudo de caso: por que essa campanha simples de R$ 30/dia gerou 14 cirurgias de alta complexidade.',
    bestForPillars: ['Prova social', 'Autoridade'],
    historicalAvgViewsDiff: '+51%',
    recommendedFormat: 'Carrossel',
    psychologicalTrigger: 'Caso de Sucesso Estruturado'
  },
  {
    id: 'hook-13',
    category: 'Pergunta',
    title: 'Pergunta reflexiva que gera parada de scroll',
    formula: 'Por que [público] ainda insiste em [hábito prejudicial]?',
    example: 'Por que empresários inteligentes ainda contratam estagiários para cuidar da reputação digital da empresa?',
    bestForPillars: ['Posicionamento', 'Educação'],
    historicalAvgViewsDiff: '+26%',
    recommendedFormat: 'Reels',
    psychologicalTrigger: 'Interrupção de Padrão'
  },
  {
    id: 'hook-14',
    category: 'Quebra de crença',
    title: 'Demolição de mito consolidado',
    formula: 'Você não precisa de [crença limitante] para conseguir [grande objetivo]. Você precisa disto:',
    example: 'Você não precisa de 100 mil seguidores para faturar 6 dígitos com marketing médico. Você só precisa disto:',
    bestForPillars: ['Educação', 'Autoridade'],
    historicalAvgViewsDiff: '+49%',
    recommendedFormat: 'Reels',
    psychologicalTrigger: 'Alívio e Simplificação'
  }
];
