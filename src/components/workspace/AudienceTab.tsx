import React, { useState } from 'react';
import { Client, AudienceInsight, AudienceInsightCategory } from '../../types';
import { AUDIENCE_CATEGORIES, researchService } from '../../services/researchService';
import { notificationService } from '../../services/notificationService';
import { Modal } from '../common/Modal';
import {
  Search,
  Sparkles,
  Plus,
  Globe,
  CheckCircle2,
  HelpCircle,
  TrendingUp,
  AlertCircle,
  ExternalLink,
  Filter
} from 'lucide-react';

interface AudienceTabProps {
  client: Client;
  insights: AudienceInsight[];
  onRefresh: () => void;
}

export const AudienceTab: React.FC<AudienceTabProps> = ({
  client,
  insights,
  onRefresh
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isSearching, setIsSearching] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const [form, setForm] = useState({
    category: 'Dores' as AudienceInsightCategory,
    title: '',
    description: '',
    source: 'Observação da equipe',
    context: '',
    interpretation: '',
    isHypothesis: false
  });

  const filteredInsights = insights.filter(
    item => selectedCategory === 'all' || item.category === selectedCategory
  );

  const handleRunSearch = async () => {
    setIsSearching(true);
    try {
      const category = selectedCategory === 'all' ? 'Dores' : (selectedCategory as AudienceInsightCategory);
      const result = await researchService.runAudienceDiscovery(client, category);
      if (!result.configured) {
        notificationService.showToast(result.message || 'Pesquisa externa não configurada.', 'info');
      } else if (!result.success) {
        notificationService.showToast(result.message || 'Falha na pesquisa externa.', 'error');
      } else {
        notificationService.addNotification(
          'Pesquisa de público concluída',
          `${result.newInsights.length} fonte(s) nova(s) salva(s) como hipótese para validação.`,
          'success'
        );
      }
      onRefresh();
    } catch {
      notificationService.showToast('Erro ao realizar pesquisa de público.', 'error');
    } finally {
      setIsSearching(false);
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title) return;

    researchService.addInsight({
      clientId: client.id,
      category: form.category,
      title: form.title,
      description: form.description,
      source: form.source,
      sourceDate: new Date().toISOString(),
      context: form.context,
      interpretation: form.interpretation,
      confidence: form.isHypothesis ? 'LOW' : 'HIGH',
      isHypothesis: form.isHypothesis
    });

    notificationService.showToast('Insight de pesquisa adicionado.', 'success');
    setShowAddModal(false);
    onRefresh();
  };

  const handleDelete = (id: string) => {
    researchService.removeInsight(id);
    onRefresh();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner & Search Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-neutral-900/90 border border-neutral-800 rounded-xl p-4">
        <div>
          <h3 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
            <span>Public Audience Intelligence</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-neutral-700 text-neutral-400 bg-neutral-950">
              {insights.length} insights mapeados
            </span>
          </h3>
          <p className="text-xs text-neutral-400 mt-0.5">
            Mapeamento de intenção de busca, dúvidas reais e comportamento da audiência
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            onClick={handleRunSearch}
            disabled={isSearching}
            className="flex items-center gap-2 px-3.5 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 rounded-lg text-xs transition-colors disabled:opacity-50"
          >
            <Search className={`w-3.5 h-3.5 ${isSearching ? 'animate-spin text-amber-400' : ''}`} />
            <span>{isSearching ? 'Pesquisando Fontes...' : 'Pesquisar Público'}</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 rounded-lg text-xs font-semibold transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Novo Insight</span>
          </button>
        </div>
      </div>

      {/* Category Pills Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap transition-colors border ${
            selectedCategory === 'all'
              ? 'bg-amber-500 text-neutral-950 font-bold border-amber-500'
              : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Todas as Categorias ({insights.length})
        </button>

        {AUDIENCE_CATEGORIES.map(cat => {
          const count = insights.filter(i => i.category === cat).length;
          const isSelected = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap transition-colors border ${
                isSelected
                  ? 'bg-amber-500 text-neutral-950 font-bold border-amber-500'
                  : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {cat} ({count})
            </button>
          );
        })}
      </div>

      {/* Insights Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredInsights.map(item => (
          <div
            key={item.id}
            className="bg-neutral-900/90 border border-neutral-800 hover:border-neutral-700 rounded-xl p-4 flex flex-col justify-between transition-colors space-y-3"
          >
            <div>
              {/* Category & Status */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/40 text-amber-300 border border-amber-500/30">
                  {item.category}
                </span>

                {item.isHypothesis ? (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded border border-purple-500/30 text-purple-400 bg-purple-950/20">
                    HIPÓTESE IA
                  </span>
                ) : (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded border border-emerald-500/30 text-emerald-400 bg-emerald-950/20 flex items-center gap-1">
                    <CheckCircle2 className="w-2.5 h-2.5" /> FONTE VERIFICADA
                  </span>
                )}
              </div>

              {/* Title & Description */}
              <h4 className="text-xs font-bold text-neutral-100 leading-snug">
                {item.title}
              </h4>
              <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed">
                {item.description}
              </p>

              {/* Context */}
              {item.context && (
                <div className="mt-3 p-2 bg-neutral-950/70 border border-neutral-800/80 rounded text-[11px] text-neutral-400">
                  <span className="text-[10px] font-mono uppercase text-neutral-500 block mb-0.5">Contexto Observado</span>
                  {item.context}
                </div>
              )}

              {/* Interpretation */}
              <div className="mt-2 p-2.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs">
                <span className="text-[10px] font-mono uppercase text-amber-400 font-semibold block mb-0.5">
                  Interpretação Estratégica Gabriel Speratti
                </span>
                <p className="text-neutral-300 text-[11px] leading-relaxed">
                  {item.interpretation}
                </p>
              </div>
            </div>

            {/* Source & Date Footer */}
            <div className="pt-2 border-t border-neutral-800 flex items-center justify-between text-[10px] font-mono text-neutral-500">
              <span className="truncate max-w-[180px] flex items-center gap-1">
                <Globe className="w-3 h-3 text-neutral-400 shrink-0" />
                {item.source}
              </span>
              <span>{item.sourceDate}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Manual Insight Modal */}
      {showAddModal && (
        <Modal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          title="Adicionar Insight de Pesquisa de Público"
          subtitle={`Registrar dado qualitativo para ${client.name}`}
        >
          <form onSubmit={handleCreate} className="space-y-4 text-xs font-mono">
            <div>
              <label className="block text-neutral-400 mb-1">Categoria de Insight *</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as any })}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded p-2 text-neutral-100"
              >
                {AUDIENCE_CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-neutral-400 mb-1">Título do Insight / Dúvida *</label>
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Ex: Medo de ficar com a boca torta após cirurgia"
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded p-2 text-neutral-100"
              />
            </div>

            <div>
              <label className="block text-neutral-400 mb-1">Descrição Detalhada</label>
              <textarea
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="O que o público diz nas caixas de perguntas e comentários..."
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded p-2 text-neutral-100"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-neutral-400 mb-1">Fonte Verificável</label>
                <input
                  type="text"
                  value={form.source}
                  onChange={(e) => setForm({ ...form, source: e.target.value })}
                  placeholder="Ex: Directs da clínica / Reddit"
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded p-2 text-neutral-100"
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">Tipo de Dado</label>
                <select
                  value={form.isHypothesis ? 'hipotese' : 'real'}
                  onChange={(e) => setForm({ ...form, isHypothesis: e.target.value === 'hipotese' })}
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded p-2 text-neutral-100"
                >
                  <option value="real">Fonte Real Verificada</option>
                  <option value="hipotese">Hipótese / Inferência da IA</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-neutral-400 mb-1">Interpretação Estratégica</label>
              <textarea
                rows={2}
                value={form.interpretation}
                onChange={(e) => setForm({ ...form, interpretation: e.target.value })}
                placeholder="Como a agência deve responder a essa dor com conteúdo..."
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded p-2 text-neutral-100"
              />
            </div>

            <div className="pt-3 border-t border-neutral-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 bg-neutral-800 text-neutral-300 rounded hover:bg-neutral-700"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-amber-500 text-neutral-950 font-bold rounded hover:bg-amber-400"
              >
                Salvar Insight
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
