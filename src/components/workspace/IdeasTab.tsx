import React, { useState } from 'react';
import { Client, ContentIdea, ContentIdeaStatus, Content, HookTemplate } from '../../types';
import { HOOK_CATEGORIES, HOOK_TEMPLATES } from '../../data/hookBank';
import { aiService } from '../../services/aiService';
import { storageService } from '../../services/storageService';
import { notificationService } from '../../services/notificationService';
import { Modal } from '../common/Modal';
import {
  Lightbulb,
  Sparkles,
  Plus,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Copy,
  Clock,
  Calendar,
  Layers,
  Target
} from 'lucide-react';

interface IdeasTabProps {
  client: Client;
  ideas: ContentIdea[];
  contents: Content[];
  onRefresh: () => void;
}

const PIPELINE_STATUSES: ContentIdeaStatus[] = [
  'IDEIA',
  'PLANEJADO',
  'ROTEIRO',
  'PRODUÇÃO',
  'EDITANDO',
  'APROVAÇÃO',
  'AGENDADO',
  'PUBLICADO',
  'ANALISADO'
];

export const IdeasTab: React.FC<IdeasTabProps> = ({
  client,
  ideas,
  contents,
  onRefresh
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showHookBankModal, setShowHookBankModal] = useState(false);
  const [selectedHookCategory, setSelectedHookCategory] = useState<string>('all');
  const [activeIdeaModal, setActiveIdeaModal] = useState<ContentIdea | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filteredIdeas = ideas.filter(
    i => filterStatus === 'all' || i.status === filterStatus
  );

  const handleGenerateAiIdeas = async () => {
    setIsGenerating(true);
    try {
      const topContents = contents.slice(0, 3);
      const audienceInsights = storageService.audience.getByClient(client.id);
      const competitors = storageService.competitors.getByClient(client.id);
      const snapshots = storageService.history.getByClient(client.id);

      const generated = await aiService.generateContentIdeas({
        client,
        topContents,
        audienceInsights,
        competitors,
        snapshots
      }, 3);

      for (const item of generated) {
        storageService.ideas.create(item);
      }

      notificationService.addNotification(
        'Novas Ideias Geradas',
        `A IA gerou 3 ideias de conteúdo hiper-personalizadas para ${client.name}.`,
        'success'
      );
      onRefresh();
    } catch {
      notificationService.showToast('Erro ao gerar ideias.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpdateStatus = (id: string, newStatus: ContentIdeaStatus) => {
    storageService.ideas.update(id, { status: newStatus });
    notificationService.showToast(`Status atualizado para ${newStatus}.`, 'info');
    onRefresh();
  };

  const handleScheduleToCalendar = (idea: ContentIdea, day: string) => {
    storageService.ideas.update(idea.id, {
      status: 'PLANEJADO',
      calendarDay: day
    });

    storageService.calendar.addItem({
      clientId: client.id,
      title: idea.title,
      format: idea.format,
      dayOfWeek: day,
      pillar: idea.pillar,
      status: 'PLANEJADO',
      hook: idea.hook,
      contentIdeaId: idea.id
    });

    notificationService.addNotification(
      'Conteúdo Agendado no Calendário',
      `"${idea.title}" agendado para ${day} no planejamento semanal.`,
      'success'
    );
    onRefresh();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner with AI Generator and Hook Bank buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-neutral-900/90 border border-neutral-800 rounded-xl p-4">
        <div>
          <h3 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
            <span>Banco de Ideias & Pipeline de Produção</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-neutral-700 text-neutral-400 bg-neutral-950">
              {ideas.length} ideias no pipeline
            </span>
          </h3>
          <p className="text-xs text-neutral-400 mt-0.5">
            Ideias geradas com base no histórico real, dores da audiência e ganchos validados
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-center">
          <button
            onClick={() => setShowHookBankModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 rounded-lg text-xs font-mono transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            <span>Banco de Ganchos (14)</span>
          </button>

          <button
            onClick={handleGenerateAiIdeas}
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 rounded-lg text-xs font-semibold transition-colors shadow-xs disabled:opacity-50"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
            <span>{isGenerating ? 'Criando Ideias...' : 'Gerar Ideias com IA'}</span>
          </button>
        </div>
      </div>

      {/* Filter Pipeline Stage Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
        <button
          onClick={() => setFilterStatus('all')}
          className={`px-3 py-1 rounded text-xs font-mono whitespace-nowrap transition-colors border ${
            filterStatus === 'all'
              ? 'bg-amber-500 text-neutral-950 font-bold border-amber-500'
              : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Todos os Estágios ({ideas.length})
        </button>

        {PIPELINE_STATUSES.map(st => {
          const count = ideas.filter(i => i.status === st).length;
          const isSelected = filterStatus === st;
          return (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-2.5 py-1 rounded text-xs font-mono whitespace-nowrap transition-colors border ${
                isSelected
                  ? 'bg-amber-500 text-neutral-950 font-bold border-amber-500'
                  : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {st} {count > 0 ? `(${count})` : ''}
            </button>
          );
        })}
      </div>

      {/* Ideas Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredIdeas.map(idea => (
          <div
            key={idea.id}
            className="bg-neutral-900/90 border border-neutral-800 hover:border-neutral-700 rounded-xl p-4 flex flex-col justify-between transition-colors space-y-3"
          >
            <div>
              {/* Header tags */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/40 text-amber-400 border border-amber-500/30">
                  {idea.format} · {idea.pillar}
                </span>

                <select
                  value={idea.status}
                  onChange={(e) => handleUpdateStatus(idea.id, e.target.value as ContentIdeaStatus)}
                  className="bg-neutral-950 border border-neutral-800 text-amber-300 text-[10px] font-mono px-1.5 py-0.5 rounded focus:outline-hidden cursor-pointer"
                >
                  {PIPELINE_STATUSES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Title & Description */}
              <h4 className="text-xs font-bold text-neutral-100 leading-snug">
                {idea.title}
              </h4>
              <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                {idea.description}
              </p>

              {/* Hook snippet */}
              <div className="mt-3 p-2.5 bg-neutral-950/70 border border-neutral-800 rounded-lg text-xs">
                <div className="text-[9px] font-mono text-neutral-500 uppercase mb-0.5 flex items-center justify-between">
                  <span>Gancho ({idea.hookCategory || 'Fórmula'})</span>
                  <span className="text-amber-400 font-bold">Potencial {idea.potential}</span>
                </div>
                <p className="text-neutral-200 text-[11px] italic">
                  &quot;{idea.hook}&quot;
                </p>
              </div>

              {/* Why Do This / Strategic Rationale */}
              <div className="mt-2 text-[11px] text-neutral-400">
                <span className="font-semibold text-neutral-300">Por que fazer: </span>
                {idea.whyDoThis}
              </div>
            </div>

            {/* Actions Footer */}
            <div className="pt-3 border-t border-neutral-800 flex items-center justify-between text-xs font-mono">
              <span className="text-neutral-500 text-[11px]">
                {idea.calendarDay ? `Agendado: ${idea.calendarDay}` : 'Não agendado'}
              </span>

              <div className="flex items-center gap-2">
                {!idea.calendarDay && (
                  <select
                    onChange={(e) => {
                      if (e.target.value) handleScheduleToCalendar(idea, e.target.value);
                    }}
                    defaultValue=""
                    className="bg-neutral-950 border border-neutral-800 text-amber-400 text-[11px] px-2 py-1 rounded cursor-pointer"
                  >
                    <option value="" disabled>+ Agendar dia</option>
                    <option value="Segunda-feira">Segunda-feira</option>
                    <option value="Terça-feira">Terça-feira</option>
                    <option value="Quarta-feira">Quarta-feira</option>
                    <option value="Quinta-feira">Quinta-feira</option>
                    <option value="Sexta-feira">Sexta-feira</option>
                    <option value="Sábado">Sábado</option>
                    <option value="Domingo">Domingo</option>
                  </select>
                )}

                <button
                  onClick={() => setActiveIdeaModal(idea)}
                  className="text-amber-400 hover:text-amber-300 text-xs font-medium"
                >
                  Detalhes →
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Idea Detail Modal */}
      {activeIdeaModal && (
        <Modal
          isOpen={Boolean(activeIdeaModal)}
          onClose={() => setActiveIdeaModal(null)}
          title={`Ideia Estratégica: "${activeIdeaModal.title}"`}
          subtitle={`Planejamento de Produção · ${activeIdeaModal.format} · ${activeIdeaModal.pillar}`}
        >
          <div className="space-y-4 text-xs font-mono">
            <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg">
              <span className="text-[10px] text-neutral-500 uppercase block mb-1">Gancho de Entrada</span>
              <p className="text-amber-300 font-semibold italic text-sm">&quot;{activeIdeaModal.hook}&quot;</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg">
                <span className="text-[10px] text-neutral-500 uppercase block mb-1">Formato</span>
                <span className="text-neutral-200 font-bold">{activeIdeaModal.format}</span>
              </div>
              <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg">
                <span className="text-[10px] text-neutral-500 uppercase block mb-1">Pilar</span>
                <span className="text-neutral-200 font-bold">{activeIdeaModal.pillar}</span>
              </div>
            </div>

            <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg">
              <span className="text-[10px] text-neutral-500 uppercase block mb-1">Por que produzir este conteúdo?</span>
              <p className="text-neutral-300 leading-relaxed font-sans">{activeIdeaModal.whyDoThis}</p>
            </div>

            <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg">
              <span className="text-[10px] text-neutral-500 uppercase block mb-1">Chamada para Ação (CTA Recomendado)</span>
              <p className="text-neutral-200 font-mono">{activeIdeaModal.cta}</p>
            </div>

            <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg">
              <span className="text-[10px] text-neutral-500 uppercase block mb-1">Público e Persona</span>
              <p className="text-neutral-400 font-sans">{activeIdeaModal.targetAudienceSnippet}</p>
            </div>
          </div>
        </Modal>
      )}

      {/* Hook Bank Modal */}
      {showHookBankModal && (
        <Modal
          isOpen={showHookBankModal}
          onClose={() => setShowHookBankModal(false)}
          title="Banco Estratégico de Ganchos (14 Categorias)"
          subtitle="Modelos de retenção validados para primeiros 3 segundos"
          maxWidth="2xl"
        >
          <div className="space-y-4">
            {/* Category selection */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
              <button
                onClick={() => setSelectedHookCategory('all')}
                className={`px-2.5 py-1 rounded text-xs font-mono whitespace-nowrap border ${
                  selectedHookCategory === 'all'
                    ? 'bg-amber-500 text-neutral-950 font-bold border-amber-500'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-400'
                }`}
              >
                Todas ({HOOK_TEMPLATES.length})
              </button>
              {HOOK_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedHookCategory(cat)}
                  className={`px-2.5 py-1 rounded text-xs font-mono whitespace-nowrap border ${
                    selectedHookCategory === cat
                      ? 'bg-amber-500 text-neutral-950 font-bold border-amber-500'
                      : 'bg-neutral-900 border-neutral-800 text-neutral-400'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Hooks list */}
            <div className="space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar pr-1">
              {HOOK_TEMPLATES.filter(
                h => selectedHookCategory === 'all' || h.category === selectedHookCategory
              ).map(hook => (
                <div
                  key={hook.id}
                  className="p-3 bg-neutral-950/80 border border-neutral-800 rounded-lg flex flex-col justify-between gap-2"
                >
                  <div>
                    <div className="flex items-center justify-between text-[10px] font-mono uppercase mb-1">
                      <span className="text-amber-400 font-semibold">{hook.category}</span>
                      <span className="text-neutral-500">{hook.recommendedFormat}</span>
                    </div>
                    <div className="text-xs font-bold text-neutral-200">
                      &quot;{hook.formula}&quot;
                    </div>
                    <div className="text-xs text-neutral-400 mt-1 italic">
                      Exemplo: &quot;{hook.example}&quot;
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-neutral-800/60 text-[11px] text-neutral-500 font-mono">
                    <span>{hook.psychologicalTrigger}</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(hook.example);
                        notificationService.showToast('Exemplo de gancho copiado!', 'success');
                      }}
                      className="flex items-center gap-1 text-amber-400 hover:text-amber-300"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copiar</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
