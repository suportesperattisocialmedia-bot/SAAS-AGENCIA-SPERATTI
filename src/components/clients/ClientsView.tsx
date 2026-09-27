import React, { useDeferredValue, useMemo, useState } from 'react';
import { Plus, Search, Users } from 'lucide-react';
import type { AccountSnapshot, Client, Content } from '../../types';
import { analyticsService } from '../../services/analyticsService';
import { ClientCard } from './ClientCard';

/** Página "Clientes": lista com busca e acesso ao workspace de cada um. */
export const ClientsView: React.FC<{
  clients: Client[];
  snapshots: AccountSnapshot[];
  contents: Content[];
  onOpenWorkspace: (client: Client) => void;
  onOpenNewClient: () => void;
  onEditClient: (client: Client) => void;
  onDuplicateClient: (client: Client) => void;
  onDeleteClient: (client: Client) => void;
}> = ({ clients, snapshots, contents, onOpenWorkspace, onOpenNewClient, onEditClient, onDuplicateClient, onDeleteClient }) => {
  const [query, setQuery] = useState('');
  const q = useDeferredValue(query).trim().toLowerCase();

  const visible = useMemo(
    () =>
      clients.filter(
        (c) => !q || `${c.name} ${c.company ?? ''} ${c.instagram ?? ''} ${c.segment ?? ''} ${c.city ?? ''}`.toLowerCase().includes(q)
      ),
    [clients, q]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-semibold tracking-tight text-neutral-50">
            Clientes
            <span className="rounded-full bg-white/[0.06] px-2.5 py-0.5 text-sm font-medium tabular-nums text-neutral-400">{clients.length}</span>
          </h1>
          <p className="mt-1 text-sm text-neutral-400">Abra um cliente para ver métricas, conteúdo, pesquisa e planejamento.</p>
        </div>
        <button
          type="button"
          onClick={onOpenNewClient}
          className="inline-flex items-center gap-2 self-start rounded-full bg-amber-500 px-4 py-2.5 text-sm font-semibold text-neutral-950 hover:bg-amber-400 active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" /> Novo cliente
        </button>
      </div>

      {clients.length > 3 && (
        <label className="relative block max-w-md">
          <span className="sr-only">Buscar clientes</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome, empresa, @, segmento ou cidade..."
            className="w-full rounded-full border border-white/[0.06] bg-[#161618] py-2.5 pl-10 pr-4 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-amber-500/60 focus:outline-none"
          />
        </label>
      )}

      {clients.length === 0 ? (
        <div className="rounded-[28px] border border-white/[0.04] bg-[#161618] p-10 text-center">
          <Users className="mx-auto h-8 w-8 text-amber-400" />
          <p className="mt-3 text-sm text-neutral-200">Nenhum cliente cadastrado ainda.</p>
          <button type="button" onClick={onOpenNewClient} className="mt-4 rounded-full bg-amber-500 px-5 py-2.5 text-sm font-semibold text-neutral-950 hover:bg-amber-400">
            Cadastrar primeiro cliente
          </button>
        </div>
      ) : visible.length === 0 ? (
        <p className="rounded-[24px] bg-[#161618] p-8 text-center text-sm text-neutral-500">Nenhum cliente encontrado para "{query}".</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((client) => {
            const mySnaps = snapshots.filter((s) => s.clientId === client.id);
            const period = analyticsService.calculatePeriod(mySnaps, 30, undefined, contents.filter((ct) => ct.clientId === client.id));
            return (
              <ClientCard
                key={client.id}
                client={client}
                latestSnapshot={[...mySnaps].sort((a, b) => a.date.localeCompare(b.date)).at(-1)}
                period30={{ views: period.totalViews.current, engagementRate: period.avgEngagementRate.current }}
                onOpenWorkspace={onOpenWorkspace}
                onEdit={onEditClient}
                onDuplicate={onDuplicateClient}
                onDelete={onDeleteClient}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
