import React from 'react';
import { Client, MetricSnapshot } from '../../types';
import { MoreVertical, ArrowRight, Copy, Trash2, Edit3 } from 'lucide-react';
import { storageService } from '../../services/storageService';
import { formatMetric } from '../../utils/metrics';
import { ConnectionBadge } from '../common/ConnectionBadge';

interface ClientCardProps {
  client: Client;
  latestSnapshot?: MetricSnapshot;
  /** Totais dos últimos 30 dias (snapshots ou posts importados). */
  period30?: { views: number | null; engagementRate: number | null };
  onOpenWorkspace: (client: Client) => void;
  onEdit: (client: Client) => void;
  onDuplicate: (client: Client) => void;
  onDelete: (client: Client) => void;
}

export const ClientCard: React.FC<ClientCardProps> = ({
  client,
  latestSnapshot,
  period30,
  onOpenWorkspace,
  onEdit,
  onDuplicate,
  onDelete
}) => {
  const [menuOpen, setMenuOpen] = React.useState(false);

  const avatarUrl = client.avatarUrl;
  // Sem snapshot real = "n/d". Nunca exibir números de exemplo como se fossem do cliente.
  const followers = latestSnapshot?.followers ?? null;
  const views = period30?.views ?? latestSnapshot?.views ?? null;
  const engRate = period30?.engagementRate ?? latestSnapshot?.engagementRate ?? null;
  const connectionStatus = storageService.instagram.getByClientId(client.id)?.status ?? 'DISCONNECTED';

  return (
    <div className="bg-[#161618] border border-white/[0.04] hover:border-white/[0.1] rounded-[28px] p-5 flex flex-col justify-between transition-colors duration-200 group relative">
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
              <div className="w-11 h-11 rounded-full bg-amber-500 flex items-center justify-center text-sm font-semibold text-neutral-950 shrink-0">
                {client.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
              </div>
            )}

            <div className="min-w-0">
              <h3 className="text-base font-semibold text-neutral-50 truncate">
                {client.name}
              </h3>
              <div className="text-xs text-neutral-400 truncate">
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
              className="grid h-9 w-9 place-items-center text-neutral-400 hover:text-neutral-100 rounded-full bg-white/[0.05] hover:bg-white/[0.1] transition-colors"
              aria-label="Opções do cliente"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-11 z-30 w-40 bg-neutral-900 border border-white/[0.08] rounded-2xl shadow-xl p-1.5 text-xs animate-in fade-in duration-100">
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onEdit(client);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-neutral-200 hover:bg-white/[0.06]"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Editar
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onDuplicate(client);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-neutral-200 hover:bg-white/[0.06]"
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
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-rose-400 hover:bg-rose-500/10"
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
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-neutral-400 mb-4">
          <span className="px-2.5 py-0.5 rounded-full bg-white/[0.06] text-neutral-300">
            {client.segment}
          </span>
          {client.city && (
            <span className="text-neutral-500">
              {client.city}
            </span>
          )}
        </div>

        {/* Numerical KPIs */}
        <div className="grid grid-cols-3 gap-2 py-3.5 px-4 rounded-2xl bg-white/[0.03] mb-4">
          <div>
            <div className="text-[11px] text-neutral-500">Seguidores</div>
            <div className="text-lg font-semibold text-neutral-50 tabular-nums">
              {formatMetric(followers)}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-neutral-500">Views 30 dias</div>
            <div className="text-lg font-semibold text-neutral-50 tabular-nums">
              {formatMetric(views)}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-neutral-500">Engajamento</div>
            <div className="text-lg font-semibold text-neutral-50 tabular-nums">
              {formatMetric(engRate, { suffix: '%' })}
            </div>
          </div>
        </div>
      </div>

      {/* Footer & Action */}
      <div className="pt-1 flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <ConnectionBadge status={connectionStatus} />
          <span className="text-[11px] text-neutral-500">
            {latestSnapshot ? `Último dado: ${new Date(`${latestSnapshot.date}T12:00:00`).toLocaleDateString('pt-BR')}` : 'Sem dados sincronizados'}
          </span>
        </div>

        <button
          onClick={() => onOpenWorkspace(client)}
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-neutral-50 px-3.5 py-2 text-xs font-semibold text-neutral-950 hover:bg-white transition-transform active:scale-[0.97]"
        >
          <span>Abrir Workspace</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
