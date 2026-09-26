import { PIPELINE_LABELS } from '../../utils/labels';
import React, { useState, useEffect, useMemo } from 'react';
import { Search, X, Users, FileText, Lightbulb, Swords, ArrowRight, ListChecks } from 'lucide-react';
import { Client, Content, ContentIdea, Competitor, Report, DeliveryTask } from '../../types';
import { TASK_STATUSES, dueLabel } from '../../services/taskInsights';
import { formatMetric } from '../../utils/metrics';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Client[];
  contents: Content[];
  ideas: ContentIdea[];
  competitors: Competitor[];
  reports: Report[];
  tasks?: DeliveryTask[];
  onOpenTask?: (task: DeliveryTask) => void;
  onSelectClient: (client: Client) => void;
  onNavigateSection: (section: any) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  clients,
  contents,
  ideas,
  competitors,
  reports,
  tasks = [],
  onOpenTask,
  onSelectClient,
  onNavigateSection
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        // Handled by parent or toggled
      }
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const results = useMemo(() => {
    if (!query.trim()) return null;
    const q = query.toLowerCase();

    const matchedClients = clients.filter(
      c => c.name.toLowerCase().includes(q) || c.instagram.toLowerCase().includes(q) || c.segment.toLowerCase().includes(q)
    );

    const matchedContents = contents.filter(
      c => c.title.toLowerCase().includes(q) || c.hook.toLowerCase().includes(q) || c.pillar.toLowerCase().includes(q)
    );

    const matchedIdeas = ideas.filter(
      i => i.title.toLowerCase().includes(q) || i.hook.toLowerCase().includes(q) || i.pillar.toLowerCase().includes(q)
    );

    const matchedCompetitors = competitors.filter(
      c => c.name.toLowerCase().includes(q) || c.instagram.toLowerCase().includes(q)
    );

    const matchedReports = reports.filter(
      r => r.title.toLowerCase().includes(q) || r.clientName.toLowerCase().includes(q)
    );

    const clientName = new Map(clients.map((c) => [c.id, c.name.toLowerCase()]));
    const matchedTasks = tasks.filter(
      (t) => t.title.toLowerCase().includes(q) || (t.notes ?? '').toLowerCase().includes(q) || (t.clientId ? clientName.get(t.clientId) ?? '' : 'geral').includes(q)
    ).slice(0, 8);

    return {
      tasks: matchedTasks,
      clients: matchedClients,
      contents: matchedContents,
      ideas: matchedIdeas,
      competitors: matchedCompetitors,
      reports: matchedReports,
      total: matchedTasks.length + matchedClients.length + matchedContents.length + matchedIdeas.length + matchedCompetitors.length + matchedReports.length
    };
  }, [query, clients, contents, ideas, competitors, reports, tasks]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      <div role="dialog" aria-modal="true" aria-label="Busca global" className="relative z-10 w-full max-w-xl bg-[#161618] border border-white/[0.06] rounded-[24px] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.06] bg-white/[0.03]">
          <Search className="w-4 h-4 text-neutral-400 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Digite para buscar em toda a agência..."
            autoFocus
            className="w-full bg-transparent text-sm text-neutral-100 placeholder-neutral-500 focus:outline-hidden tabular-nums"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-neutral-500 hover:text-neutral-300 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <kbd className="text-[10px] tabular-nums text-neutral-500 bg-white/[0.06] px-1.5 py-0.5 rounded-full border border-white/[0.1]">
            ESC
          </kbd>
        </div>

        {/* Search Results Area */}
        <div className="p-4 overflow-y-auto custom-scrollbar space-y-4">
          {!results ? (
            <div className="py-8 text-center text-xs text-neutral-500 tabular-nums">
              Pesquise por clientes, temas de conteúdo, ganchos ou concorrentes.
            </div>
          ) : results.total === 0 ? (
            <div className="py-8 text-center text-xs text-neutral-400">
              Nenhum resultado encontrado para &quot;<span className="text-amber-300">{query}</span>&quot;.
            </div>
          ) : (
            <>
              {/* Clients */}
              {results.clients.length > 0 && (
                <div>
                  <div className="text-[11px] text-neutral-500 mb-2 flex items-center gap-1.5">
                    <Users className="w-3 h-3" />
                    Clientes ({results.clients.length})
                  </div>
                  <div className="space-y-1">
                    {results.clients.map(c => (
                      <button
                        key={c.id}
                        onClick={() => {
                          onSelectClient(c);
                          onNavigateSection('dashboard');
                          onClose();
                        }}
                        className="w-full flex items-center justify-between p-2.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.05] text-left transition-colors group"
                      >
                        <div>
                          <div className="text-xs font-semibold text-neutral-200 group-hover:text-amber-300">
                            {c.name}
                          </div>
                          <div className="text-[11px] tabular-nums text-neutral-400">
                            {c.instagram} · {c.segment}
                          </div>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-neutral-600 group-hover:text-amber-400" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Contents */}
              {results.contents.length > 0 && (
                <div>
                  <div className="text-[11px] text-neutral-500 mb-2 flex items-center gap-1.5">
                    <FileText className="w-3 h-3" />
                    Conteúdos Publicados ({results.contents.length})
                  </div>
                  <div className="space-y-1">
                    {results.contents.map(c => (
                      <button
                        key={c.id}
                        onClick={() => {
                          const client = clients.find(cl => cl.id === c.clientId);
                          if (client) onSelectClient(client);
                          onNavigateSection('content');
                          onClose();
                        }}
                        className="w-full flex items-center justify-between p-2.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.05] text-left transition-colors group"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="text-xs font-medium text-neutral-200 truncate group-hover:text-amber-300">
                            {c.title}
                          </div>
                          <div className="text-[11px] tabular-nums text-neutral-400 flex items-center gap-2">
                            <span>{c.format}</span>
                            <span>·</span>
                            <span>{c.pillar}</span>
                            <span>·</span>
                            <span>{formatMetric(c.metrics.views)} views</span>
                          </div>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-neutral-600 group-hover:text-amber-400 shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Ideas */}
              {results.ideas.length > 0 && (
                <div>
                  <div className="text-[11px] text-neutral-500 mb-2 flex items-center gap-1.5">
                    <Lightbulb className="w-3 h-3" />
                    Banco de Ideias ({results.ideas.length})
                  </div>
                  <div className="space-y-1">
                    {results.ideas.map(i => (
                      <button
                        key={i.id}
                        onClick={() => {
                          const client = clients.find(cl => cl.id === i.clientId);
                          if (client) onSelectClient(client);
                          onNavigateSection('ideas');
                          onClose();
                        }}
                        className="w-full flex items-center justify-between p-2.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.05] text-left transition-colors group"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="text-xs font-medium text-neutral-200 truncate group-hover:text-amber-300">
                            {i.title}
                          </div>
                          <div className="text-[11px] tabular-nums text-neutral-400">
                            Status: {PIPELINE_LABELS[i.status]} · {i.format} · Potencial {i.potential}
                          </div>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-neutral-600 group-hover:text-amber-400 shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Competitors */}
              {results.tasks.length > 0 && (
                <div>
                  <div className="mb-2 flex items-center gap-1.5 text-[11px] text-neutral-500">
                    <ListChecks className="h-3 w-3" />
                    Tarefas ({results.tasks.length})
                  </div>
                  <div className="space-y-1">
                    {results.tasks.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          onOpenTask?.(t);
                          onClose();
                        }}
                        className="group flex w-full items-center justify-between rounded-2xl border border-white/[0.05] bg-white/[0.03] p-2.5 text-left transition-colors hover:bg-white/[0.07]"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="truncate text-xs font-medium text-neutral-200 group-hover:text-amber-300">{t.title}</div>
                          <div className="text-[11px] text-neutral-400">
                            {(t.clientId && clients.find((c) => c.id === t.clientId)?.name) || 'Geral'} · {TASK_STATUSES.find((st) => st.id === t.status)?.label}
                            {dueLabel(t) ? ` · ${dueLabel(t)}` : ''}
                          </div>
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-neutral-600 group-hover:text-amber-400" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {results.competitors.length > 0 && (
                <div>
                  <div className="text-[11px] text-neutral-500 mb-2 flex items-center gap-1.5">
                    <Swords className="w-3 h-3" />
                    Concorrentes ({results.competitors.length})
                  </div>
                  <div className="space-y-1">
                    {results.competitors.map(comp => (
                      <button
                        key={comp.id}
                        onClick={() => {
                          const client = clients.find(cl => cl.id === comp.clientId);
                          if (client) onSelectClient(client);
                          onNavigateSection('competitors');
                          onClose();
                        }}
                        className="w-full flex items-center justify-between p-2.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.05] text-left transition-colors group"
                      >
                        <div>
                          <div className="text-xs font-medium text-neutral-200 group-hover:text-amber-300">
                            {comp.name}
                          </div>
                          <div className="text-[11px] tabular-nums text-neutral-400">
                            {comp.instagram} · {formatMetric(comp.followers)} seg.
                          </div>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-neutral-600 group-hover:text-amber-400 shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
