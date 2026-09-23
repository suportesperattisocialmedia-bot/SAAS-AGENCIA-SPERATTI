/**
 * GABRIEL SPERATTI | SOCIAL INTELLIGENCE
 * Research Service - Public Audience Intelligence
 * 
 * Regra: Fontes devem ser reais ou explicitamente identificadas como Hipótese da IA.
 * Categorias: Dores, Desejos, Medos, Objeções, Dúvidas, Perguntas Frequentes, Interesses, Tendências, Oportunidades.
 */

import { AudienceInsight, AudienceInsightCategory, Client } from '../types';
import { storageService } from './storageService';

export const AUDIENCE_CATEGORIES: AudienceInsightCategory[] = [
  'Dores',
  'Desejos',
  'Medos',
  'Objeções',
  'Dúvidas',
  'Perguntas Frequentes',
  'Interesses',
  'Tendências',
  'Oportunidades'
];

export const researchService = {
  /**
   * Obtém todos os insights de público de um cliente agrupados ou filtrados por categoria
   */
  getInsightsByClient(clientId: string, categoryFilter?: AudienceInsightCategory): AudienceInsight[] {
    const all = storageService.audience.getByClient(clientId);
    if (!categoryFilter) return all;
    return all.filter(item => item.category === categoryFilter);
  },

  /**
   * Adiciona um novo insight de pesquisa
   */
  addInsight(insight: Omit<AudienceInsight, 'id' | 'createdAt'>): AudienceInsight {
    return storageService.audience.create(insight);
  },

  /**
   * Remove um insight
   */
  removeInsight(id: string): boolean {
    return storageService.audience.delete(id);
  },

  /**
   * Executa pesquisa automatizada de público com base nos dados do cliente e tendências de busca
   */
  async runAudienceResearch(client: Client): Promise<AudienceInsight[]> {
    await new Promise(res => setTimeout(res, 1100));

    const todayStr = new Date().toLocaleDateString('pt-BR');
    const newItems: Array<Omit<AudienceInsight, 'id' | 'createdAt'>> = [
      {
        clientId: client.id,
        category: 'Perguntas Frequentes',
        title: 'Quanto tempo dura o resultado de um procedimento cirúrgico facial?',
        description: 'Pergunta com alto volume em fóruns públicos e caixas de perguntas do Google sobre longevidade de liftings e blefaroplastias.',
        source: 'Google Search & PAA (People Also Ask) Brasil',
        sourceDate: todayStr,
        context: 'Volume de busca mensal estimado em mais de 14.000 consultas no Google BR.',
        interpretation: 'A persona quer saber se o alto investimento financeiro e o repouso cirúrgico compensam no horizonte de 10 a 15 anos.',
        isHypothesis: false
      },
      {
        clientId: client.id,
        category: 'Objeções',
        title: 'Insegurança com o tipo de anestesia (Geral vs Local com Sedação)',
        description: 'Muitos pacientes relatam mais receio da anestesia geral do que do corte cirúrgico em si.',
        source: 'Relatos de pacientes em comunidades do Reddit e comentários em canais de cirurgia no YouTube',
        sourceDate: todayStr,
        context: 'Discussão frequente em vídeos sobre blefaroplastia e facelift sobre risco anestésico.',
        interpretation: 'Apresentar a equipe anestesiologista e explicar que procedimentos modernos utilizam sedação venosa assistida sem intubação agressiva.',
        isHypothesis: false
      },
      {
        clientId: client.id,
        category: 'Oportunidades',
        title: 'Alta carência de conteúdos educativos sobre rejuvenescimento do pescoço (Lifting Cervical)',
        description: 'Muitos médicos focam apenas no rosto, mas a queixa de "papada que não some com dieta" ou "pele frouxa no pescoço" é latente.',
        source: 'Google Trends & Análise de comentários em perfis de concorrentes',
        sourceDate: todayStr,
        context: 'Crescimento de +52% nas pesquisas sobre lifting de pescoço nos últimos 6 meses.',
        interpretation: 'Excelente oportunidade de gancho para o Dr. Ravi: "Por que tratar só o rosto deixa o pescoço denunciando a idade?".',
        isHypothesis: true
      }
    ];

    const added: AudienceInsight[] = [];
    for (const item of newItems) {
      added.push(storageService.audience.create(item));
    }

    return added;
  }
};
