import React from 'react';
import { Client, MetricSnapshot } from '../../types';
import { MoreVertical, ArrowRight, Copy, Trash2, Edit3 } from 'lucide-react';
import { storageService } from '../../services/storageService';
import { formatMetric } from '../../utils/metrics';
import { ConnectionBadge } from '../common/ConnectionBadge';

interface ClientCardProps {
  client: Client;
  latestSnapshot?: MetricSnapshot;
  onOpenWorkspace: (client: Client) => void;
  onEdit: (client: Client) => void;
  onDuplicate: (client: Client) => void;
  onDelete: (client: Client) => void;
}

export const ClientCard: React.FC<ClientCardProps> = ({
  client,
  latestSnapshot,
  onOpenWorkspace,
  onEdit,
  onDuplicate,
  onDelete
}) => {
  const [menuOpen, setMenuOpen] = React.useState(false);

  const avatarUrl = client.avatarUrl;
  // Sem snapshot real = "n/d". Nunca exibir números de exemplo como se fossem do cliente.
  const followers = latestSnapshot?.followers ?? null;
  const views = latestSnapshot?.views ?? null;
  const engRate = latestSnapshot?.engagementRate ?? null;
  const connectionStatus = storageService.instagram.getByClientId(client.id)?.status ?? 'DISCONNECTED';

  return (
    <div className="bg-neutral-900/90 border border-neutral-800 hover:border-neutral-700 rounded-xl p-5 flex flex-col justify-between transition-all duration-200 group relative">
      <div>
        {/* Header with avatar & actions menu */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={client.name}
                referrerPolicy="no-referrer"
                className="w-11 h-11 rounded-full object-cover border border-amber-500/30 shrink-0"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-sm font-bold font-mono text-amber-400 shrink-0">
                {client.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
              </div>
            )}

            <div className="min-w-0">
              <h3 className="text-sm font-bold text-neutral-100 truncate group-hover:text-amber-300 transition-colors">
                {client.name}
              </h3>
              <div className="text-xs font-mono text-amber-400/90 truncate">
                {client.instagram}
              </div>
              <div className="text-[11px] text-neutral-500 truncate mt-0.5">
                {client.company}
              </div>
            </div>
          </div>

          {/* Context Dropdown Menu */}
          <div className="relative shrink-0">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              aria-expanded={menuOpen}
              className="p-1 text-neutral-500 hover:text-neutral-300 rounded hover:bg-neutral-800 transition-colors"
              aria-label="Opções do cliente"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-6 z-30 w-36 bg-neutral-950 border border-neutral-800 rounded-lg shadow-xl py-1 text-xs font-mono animate-in fade-in duration-100">
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onEdit(client);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-neutral-300 hover:bg-neutral-800 hover:text-amber-300"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Editar
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onDuplicate(client);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-neutral-300 hover:bg-neutral-800 hover:text-amber-300"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Duplicar
                  </button>
                  <div className="h-px bg-neutral-800 my-1" />
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onDelete(client);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-rose-400 hover:bg-rose-950/30"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Excluir
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Segment & City Metadata */}
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-neutral-400 font-mono mb-4">
          <span className="px-2 py-0.5 rounded bg-neutral-800 border border-neutral-700/60 text-neutral-300">
            {client.segment}
          </span>
          {client.city && (
            <span className="text-neutral-500">
              {client.city}
            </span>
          )}
        </div>

        {/* Numerical KPIs */}
        <div className="grid grid-cols-3 gap-2 py-3 px-3 rounded-lg bg-neutral-950/60 border border-neutral-800/80 mb-4">
          <div>
            <div className="text-[10px] uppercase font-mono text-neutral-500">Seguidores</div>
            <div className="text-sm font-bold font-mono text-neutral-200 tabular-nums">
              {formatMetric(followers)}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-mono text-neutral-500">Views</div>
            <div className="text-sm font-bold font-mono text-neutral-200 tabular-nums">
              {formatMetric(views)}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-mono text-neutral-500">Engajamento</div>
            <div className="text-sm font-bold font-mono text-emerald-400 tabular-nums">
              {formatMetric(engRate, { suffix: '%' })}
            </div>
          </div>
        </div>
      </div>

      {/* Footer & Action */}
      <div className="pt-3 border-t border-neutral-800 flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <ConnectionBadge status={connectionStatus} />
          <span className="text-[10px] font-mono text-neutral-500">
            {latestSnapshot ? `Último dado: ${new Date(`${latestSnapshot.date}T12:00:00`).toLocaleDateString('pt-BR')}` : 'Sem dados sincronizados'}
          </span>
        </div>

        <button
          onClick={() => onOpenWorkspace(client)}
          className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors group-hover:translate-x-0.5 duration-150"
        >
          <span>Abrir Workspace</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
