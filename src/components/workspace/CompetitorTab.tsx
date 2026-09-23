import React, { useState } from 'react';
import { Client, Competitor } from '../../types';
import { competitorService, CompetitorPatternInsight } from '../../services/competitorService';
import { storageService } from '../../services/storageService';
import { notificationService } from '../../services/notificationService';
import { Modal } from '../common/Modal';
import {
  Swords,
  Search,
  Plus,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Sparkles,
  TrendingUp,
  AlertCircle,
  Clock
} from 'lucide-react';

interface CompetitorTabProps {
  client: Client;
  competitors: Competitor[];
  onRefresh: () => void;
}

export const CompetitorTab: React.FC<CompetitorTabProps> = ({
  client,
  competitors,
  onRefresh
}) => {
  const [isSearching, setIsSearching] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCompForm, setNewCompForm] = useState({
    name: '',
    instagram: '',
    website: '',
    segment: client.segment,
    followers: 25000,
    postingFrequencyWeekly: 3,
    avgViews: 18000,
    avgEngagementRate: 4.5,
    topFormats: 'Reels, Carrossel',
    recentThemes: 'Procedimentos, Pós-operatório',
    notes: ''
  });

  const approvedCompetitors = competitors.filter(c => c.status === 'approved');
  const candidateCompetitors = competitors.filter(c => c.status === 'candidate');
  const benchmarkMatrix = competitorService.generateBenchmarkMatrix(client, approvedCompetitors);
  const patternInsights = competitorService.detectCompetitorPatterns(approvedCompetitors);

  const handleDiscover = async () => {
    setIsSearching(true);
    try {
      const candidates = await competitorService.discoverCandidateCompetitors(client);
      notificationService.addNotification(
        'Busca de Concorrentes Concluída',
        `${candidates.length} candidato(s) encontrados com base no segmento ${client.segment}.`,
        'info'
      );
      onRefresh();
    } catch {
      notificationService.showToast('Erro ao buscar concorrentes.', 'error');
    } finally {
      setIsSearching(false);
    }
  };

  const handleApprove = (id: string) => {
    competitorService.approveCandidate(id);
    notificationService.showToast('Concorrente aprovado para benchmarking.', 'success');
    onRefresh();
  };

  const handleIgnore = (id: string) => {
    competitorService.ignoreCandidate(id);
    notificationService.showToast('Concorrente ignorado.', 'info');
    onRefresh();
  };

  const handleCreateManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompForm.name || !newCompForm.instagram) return;

    storageService.competitors.create({
      clientId: client.id,
      name: newCompForm.name,
      instagram: newCompForm.instagram.startsWith('@') ? newCompForm.instagram : `@${newCompForm.instagram}`,
      website: newCompForm.website,
      segment: newCompForm.segment,
      similarityScore: 85,
      followers: Number(newCompForm.followers),
      postingFrequencyWeekly: Number(newCompForm.postingFrequencyWeekly),
      topFormats: newCompForm.topFormats.split(',').map(s => s.trim()),
      avgViews: Number(newCompForm.avgViews),
      avgEngagementRate: Number(newCompForm.avgEngagementRate),
      recentThemes: newCompForm.recentThemes.split(',').map(s => s.trim()),
      notes: newCompForm.notes,
      status: 'approved'
    });

    notificationService.addNotification(
      'Concorrente Cadastrado',
      `${newCompForm.name} adicionado ao monitoramento de ${client.name}.`,
      'success'
    );
    setShowAddModal(false);
    onRefresh();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-neutral-900/90 border border-neutral-800 rounded-xl p-4">
        <div>
          <h3 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
            <span>Inteligência Competitiva & Benchmarking</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-neutral-700 text-neutral-400 bg-neutral-950">
              {approvedCompetitors.length} monitorados
            </span>
          </h3>
          <p className="text-xs text-neutral-400 mt-0.5">
            Mapeamento analítico de players diretos no segmento de {client.segment}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            onClick={handleDiscover}
            disabled={isSearching}
            className="flex items-center gap-2 px-3.5 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 rounded-lg text-xs font-mono transition-colors disabled:opacity-50"
          >
            <Search className={`w-3.5 h-3.5 ${isSearching ? 'animate-spin text-amber-400' : ''}`} />
            <span>{isSearching ? 'Buscando...' : 'Encontrar Concorrentes'}</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 rounded-lg text-xs font-semibold transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar Concorrente</span>
          </button>
        </div>
      </div>

      {/* Candidate Competitors Queue (Review by Gabriel Speratti) */}
      {candidateCompetitors.length > 0 && (
        <div className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h4 className="text-xs font-bold font-mono uppercase text-amber-300">
                Novos Concorrentes Candidatos Identificados ({candidateCompetitors.length})
              </h4>
            </div>
            <span className="text-[10px] font-mono text-neutral-400">
              Aprovação necessária por Gabriel Speratti
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {candidateCompetitors.map(cand => (
              <div
                key={cand.id}
                className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h5 className="text-xs font-bold text-neutral-100">{cand.name}</h5>
                      <span className="text-[11px] font-mono text-amber-400">{cand.instagram}</span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                      {cand.similarityScore}% similar
                    </span>
                  </div>

                  <p className="text-xs text-neutral-400 mb-3">
                    {cand.candidateReason || cand.notes}
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-neutral-400 bg-neutral-950 p-2 rounded mb-3">
                    <div>Seguidores: <span className="text-neutral-200">{cand.followers.toLocaleString('pt-BR')}</span></div>
                    <div>Cadência: <span className="text-neutral-200">{cand.postingFrequencyWeekly}x / sem</span></div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800">
                  <button
                    onClick={() => handleIgnore(cand.id)}
                    className="px-3 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200 rounded text-xs transition-colors"
                  >
                    Ignorar
                  </button>
                  <button
                    onClick={() => handleApprove(cand.id)}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded text-xs transition-colors"
                  >
                    Aprovar Concorrente
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comparative Benchmarking Table */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2">
            <Swords className="w-4 h-4 text-amber-400" />
            <h4 className="text-xs font-bold font-mono uppercase text-neutral-200">
              Matriz Comparativa de Mercado (Cliente vs Concorrentes)
            </h4>
          </div>
          <span className="text-[10px] font-mono text-neutral-400">
            Dados Fatuais · Sem métricas arbitrariamente inventadas
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-neutral-800 text-neutral-500 uppercase text-[10px]">
                <th className="pb-3 font-semibold">Conta</th>
                <th className="pb-3 font-semibold text-right">Seguidores</th>
                <th className="pb-3 font-semibold text-center">Frequência Semanal</th>
                <th className="pb-3 font-semibold text-right">Views Médias</th>
                <th className="pb-3 font-semibold text-right">Engajamento</th>
                <th className="pb-3 font-semibold">Formatos Chave</th>
                <th className="pb-3 font-semibold">Temas Recentes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60 text-neutral-300">
              {benchmarkMatrix.map((row, idx) => (
                <tr
                  key={idx}
                  className={row.isClient ? 'bg-amber-950/20 font-semibold text-neutral-100' : 'hover:bg-neutral-850/50'}
                >
                  <td className="py-3 pr-3">
                    <div className="flex items-center gap-2">
                      {row.isClient && (
                        <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                      )}
                      <div>
                        <div className={row.isClient ? 'text-amber-300 font-bold' : 'text-neutral-200'}>
                          {row.name}
                        </div>
                        <div className="text-[11px] text-neutral-500">{row.instagram}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 text-right font-bold tabular-nums">
                    {row.followers.toLocaleString('pt-BR')}
                  </td>
                  <td className="py-3 text-center tabular-nums">
                    {row.weeklyFrequency}x / sem
                  </td>
                  <td className="py-3 text-right tabular-nums">
                    {row.avgViews.toLocaleString('pt-BR')}
                  </td>
                  <td className="py-3 text-right text-emerald-400 font-bold tabular-nums">
                    {row.avgEngagementRate}%
                  </td>
                  <td className="py-3">
                    <div className="flex flex-wrap gap-1">
                      {row.topFormats.map((f, i) => (
                        <span key={i} className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-800 border border-neutral-700 text-neutral-300">
                          {f}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 text-neutral-400 text-[11px]">
                    {row.mainThemes.join(', ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* "O QUE OS CONCORRENTES ESTÃO FAZENDO?" - Pattern Detector */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-neutral-800 pb-3">
          <TrendingUp className="w-4 h-4 text-purple-400" />
          <h4 className="text-xs font-bold font-mono uppercase text-neutral-200">
            Monitor de Tendências: O Que os Concorrentes Estão Fazendo?
          </h4>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-purple-500/30 text-purple-400 bg-purple-950/20">
            DETECTOR DE PADRÕES
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {patternInsights.map(insight => (
            <div
              key={insight.id}
              className="p-4 bg-neutral-950/60 border border-neutral-800 rounded-lg space-y-2.5 flex flex-col justify-between"
            >
              <div>
                <span className="text-[10px] font-mono uppercase text-amber-400 font-semibold">
                  {insight.type}
                </span>
                <h5 className="text-xs font-bold text-neutral-100 mt-1">
                  {insight.title}
                </h5>
                <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed">
                  {insight.description}
                </p>
              </div>

              <div className="p-2.5 bg-neutral-900 border border-neutral-800 rounded text-xs mt-2">
                <span className="text-[10px] font-mono uppercase text-neutral-500 block mb-1">
                  Implicação Estratégica
                </span>
                <p className="text-amber-200 text-[11px] leading-relaxed">
                  {insight.strategicImplication}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Manual Competitor Modal */}
      {showAddModal && (
        <Modal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          title="Cadastrar Concorrente Manualmente"
          subtitle={`Adicionar player de mercado para benchmarking de ${client.name}`}
        >
          <form onSubmit={handleCreateManual} className="space-y-4 text-xs font-mono">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-neutral-400 mb-1">Nome do Player *</label>
                <input
                  type="text"
                  required
                  value={newCompForm.name}
                  onChange={(e) => setNewCompForm({ ...newCompForm, name: e.target.value })}
                  placeholder="Ex: Dr. Fulano Facial"
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded p-2 text-neutral-100"
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">@ Instagram *</label>
                <input
                  type="text"
                  required
                  value={newCompForm.instagram}
                  onChange={(e) => setNewCompForm({ ...newCompForm, instagram: e.target.value })}
                  placeholder="Ex: @drfulanofacial"
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded p-2 text-amber-300"
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">Seguidores Observados</label>
                <input
                  type="number"
                  value={newCompForm.followers}
                  onChange={(e) => setNewCompForm({ ...newCompForm, followers: Number(e.target.value) })}
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded p-2 text-neutral-100"
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">Frequência Semanal</label>
                <input
                  type="number"
                  step="0.5"
                  value={newCompForm.postingFrequencyWeekly}
                  onChange={(e) => setNewCompForm({ ...newCompForm, postingFrequencyWeekly: Number(e.target.value) })}
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded p-2 text-neutral-100"
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">Views Médias Estimadas</label>
                <input
                  type="number"
                  value={newCompForm.avgViews}
                  onChange={(e) => setNewCompForm({ ...newCompForm, avgViews: Number(e.target.value) })}
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded p-2 text-neutral-100"
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">Engajamento Médio (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={newCompForm.avgEngagementRate}
                  onChange={(e) => setNewCompForm({ ...newCompForm, avgEngagementRate: Number(e.target.value) })}
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded p-2 text-neutral-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-neutral-400 mb-1">Formatos Chave (separados por vírgula)</label>
              <input
                type="text"
                value={newCompForm.topFormats}
                onChange={(e) => setNewCompForm({ ...newCompForm, topFormats: e.target.value })}
                placeholder="Reels, Carrossel"
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded p-2 text-neutral-100"
              />
            </div>

            <div>
              <label className="block text-neutral-400 mb-1">Temas Recentes</label>
              <input
                type="text"
                value={newCompForm.recentThemes}
                onChange={(e) => setNewCompForm({ ...newCompForm, recentThemes: e.target.value })}
                placeholder="Ex: Recuperação, Cicatriz, Lipoaspiração"
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded p-2 text-neutral-100"
              />
            </div>

            <div>
              <label className="block text-neutral-400 mb-1">Notas Estratégicas</label>
              <textarea
                rows={2}
                value={newCompForm.notes}
                onChange={(e) => setNewCompForm({ ...newCompForm, notes: e.target.value })}
                placeholder="Observações sobre posicionamento..."
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
                Salvar Concorrente
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
