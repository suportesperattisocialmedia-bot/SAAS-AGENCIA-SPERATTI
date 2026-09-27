import React, { useCallback, useEffect, useState } from 'react';
import { Check, Copy, ExternalLink, Link2, Loader2, RefreshCw, ShieldOff } from 'lucide-react';
import type { Client, DeliveryTask } from '../../types';
import { Modal } from '../common/Modal';
import { portalService, portalUrl, type ApprovalLink } from '../../services/portalService';
import { syncService } from '../../services/sync/syncService';
import { describeApiError } from '../../services/api/apiClient';
import { notificationService } from '../../services/notificationService';
import { formatDateBR, formatDateTimeBR } from '../../utils/dates';

/** Gera, copia e revoga o link de aprovação de um cliente (sem conta para o cliente). */
export const ApprovalLinkModal: React.FC<{
  open: boolean;
  onClose: () => void;
  clients: Client[];
  tasks: DeliveryTask[];
  initialClientId?: string;
}> = ({ open, onClose, clients, tasks, initialClientId }) => {
  const [clientId, setClientId] = useState(initialClientId || clients[0]?.id || '');
  const [link, setLink] = useState<ApprovalLink | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const cloudOff = syncService.getStatus().state === 'disabled';

  const client = clients.find((c) => c.id === clientId);
  const inReview = tasks.filter((t) => t.clientId === clientId && t.status === 'review');
  const missingCopy = inReview.filter((t) => !t.clientCopy && !t.previewUrl).length;

  const load = useCallback(async () => {
    if (!clientId || cloudOff) return;
    setLoading(true);
    setError(null);
    try {
      const links = await portalService.listLinks(clientId);
      setLink(links[0] ?? null);
    } catch (err) {
      setError(describeApiError(err));
    } finally {
      setLoading(false);
    }
  }, [clientId, cloudOff]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const create = async () => {
    if (!client) return;
    setLoading(true);
    setError(null);
    try {
      // As tarefas precisam estar na nuvem para o cliente enxergar.
      await syncService.flush();
      setLink(await portalService.createLink(client.id, client.name));
      notificationService.showToast(link ? 'Novo link gerado. O anterior deixou de funcionar.' : 'Link de aprovação criado.', 'success');
    } catch (err) {
      setError(describeApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const revoke = async () => {
    if (!link) return;
    setLoading(true);
    try {
      await portalService.revokeLink(link.id);
      setLink(null);
      notificationService.showToast('Link revogado. Quem tiver o endereço não acessa mais.', 'info');
    } catch (err) {
      setError(describeApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(portalUrl(link.token));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      notificationService.showToast('O navegador bloqueou a cópia. Selecione o link e copie manualmente.', 'warning');
    }
  };

  return (
    <Modal isOpen={open} onClose={onClose} title="Link de aprovação do cliente" subtitle="O cliente abre sem login, vê só o que está em Aprovação do cliente e aprova ou pede ajuste." maxWidth="lg">
      <div className="space-y-4 text-sm">
        <div>
          <label htmlFor="approval-client" className="mb-1.5 block text-xs font-medium text-neutral-300">
            Cliente
          </label>
          <select
            id="approval-client"
            value={clientId}
            onChange={(e) => {
              if (e.target.value === clientId) return;
              setClientId(e.target.value);
              setLink(null);
            }}
            className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-2.5 text-sm text-neutral-100"
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-2xl bg-white/[0.03] px-4 py-3 text-xs text-neutral-400">
          <span className="text-neutral-100 tabular-nums">{inReview.length}</span> {inReview.length === 1 ? 'entrega aguardando' : 'entregas aguardando'} aprovação deste cliente.
          {missingCopy > 0 && <span className="mt-1 block text-amber-300">{missingCopy} sem legenda nem link da arte: o cliente verá só o título.</span>}
        </div>

        {cloudOff ? (
          <p className="rounded-2xl bg-amber-500/10 px-4 py-3 text-xs text-amber-200">O portal precisa da sincronização na nuvem, que só funciona com login (fora do modo demonstração).</p>
        ) : loading && !link ? (
          <div className="flex items-center gap-2 py-4 text-xs text-neutral-400">
            <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" /> Carregando...
          </div>
        ) : link ? (
          <div className="space-y-3">
            <div className="flex gap-2">
              <input readOnly value={portalUrl(link.token)} aria-label="Endereço do link de aprovação" onFocus={(e) => e.currentTarget.select()} className="min-w-0 flex-1 rounded-2xl border border-white/[0.08] bg-neutral-950 px-3.5 py-2.5 font-mono text-xs text-neutral-200" />
              <button
                type="button"
                onClick={() => void copy()}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 text-xs font-semibold transition-colors ${copied ? 'bg-emerald-500 text-emerald-950' : 'bg-amber-500 text-neutral-950 hover:bg-amber-400'}`}
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copiado' : 'Copiar'}
              </button>
            </div>
            <p className="text-[11px] text-neutral-500">
              Válido até {formatDateBR(link.expiresAt)}. {link.lastOpenedAt ? `Aberto pela última vez em ${formatDateTimeBR(link.lastOpenedAt)}.` : 'Ainda não foi aberto.'}
            </p>
            <div className="flex flex-wrap gap-2">
              <a href={portalUrl(link.token)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3.5 py-2 text-xs text-neutral-200 hover:bg-white/[0.1]">
                <ExternalLink className="h-3.5 w-3.5" /> Ver como o cliente
              </a>
              <button type="button" onClick={() => void create()} disabled={loading} className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3.5 py-2 text-xs text-neutral-200 hover:bg-white/[0.1] disabled:opacity-50">
                <RefreshCw className="h-3.5 w-3.5" /> Gerar novo link
              </button>
              <button type="button" onClick={() => void revoke()} disabled={loading} className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs text-rose-300 hover:bg-rose-500/10 disabled:opacity-50">
                <ShieldOff className="h-3.5 w-3.5" /> Revogar
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => void create()}
            disabled={loading || !client}
            className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-5 py-2.5 text-sm font-semibold text-neutral-950 hover:bg-amber-400 disabled:opacity-50 active:scale-[0.98]"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : <Link2 className="h-4 w-4" />}
            Criar link de aprovação
          </button>
        )}
        {error && (
          <p role="alert" className="rounded-2xl bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
};
