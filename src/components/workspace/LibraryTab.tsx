import React, { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Check, Copy, Hash, Megaphone, MessageSquareQuote, Pencil, Plus, Search, Trash2, Type } from 'lucide-react';
import type { Client, Snippet, SnippetKind } from '../../types';
import { storageService } from '../../services/storageService';
import { notificationService } from '../../services/notificationService';
import { Modal } from '../common/Modal';
import { syncService } from '../../services/sync/syncService';

const KINDS: Array<{ id: SnippetKind; label: string; plural: string; icon: React.ElementType; hint: string }> = [
  { id: 'legenda', label: 'Legenda', plural: 'Legendas', icon: Type, hint: 'Legenda completa ou modelo com [colchetes] para trocar.' },
  { id: 'hashtags', label: 'Hashtags', plural: 'Hashtags', icon: Hash, hint: 'Grupo de hashtags separadas por espaço. O Instagram aceita até 30.' },
  { id: 'cta', label: 'CTA', plural: 'CTAs', icon: Megaphone, hint: 'Chamada para ação de fechamento (salvar, comentar, chamar no direct...).' },
  { id: 'gancho', label: 'Gancho', plural: 'Ganchos', icon: MessageSquareQuote, hint: 'Primeira frase do vídeo ou do carrossel.' }
];

const kindOf = (id: SnippetKind) => KINDS.find((k) => k.id === id) ?? KINDS[0];

export function countHashtags(text: string): number {
  return (text.match(/#[\p{L}\p{N}_]+/gu) ?? []).length;
}

/** Limites do Instagram: 2.200 caracteres na legenda e 30 hashtags. */
function limitsOf(text: string): { chars: number; tags: number; warn: string | null } {
  const chars = text.length;
  const tags = countHashtags(text);
  const warn = tags > 30 ? `${tags} hashtags: o Instagram aceita no máximo 30.` : chars > 2200 ? `${chars} caracteres: o limite da legenda é 2.200.` : null;
  return { chars, tags, warn };
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

interface Draft {
  id?: string;
  kind: SnippetKind;
  title: string;
  text: string;
  general: boolean;
}

export const LibraryTab: React.FC<{ client: Client }> = ({ client }) => {
  const [all, setAll] = useState<Snippet[]>(() => storageService.snippets.getAll());
  const reload = () => setAll(storageService.snippets.getAll());
  useEffect(() => syncService.onRemoteChange((keys) => keys.includes('gs_intel_snippets') && setAll(storageService.snippets.getAll())), []);
  const [kind, setKind] = useState<SnippetKind | 'all'>('all');
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Do cliente + gerais (valem para todos).
  const mine = useMemo(() => all.filter((s) => !s.clientId || s.clientId === client.id), [all, client.id]);
  const list = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    return mine
      .filter((s) => kind === 'all' || s.kind === kind)
      .filter((s) => !q || `${s.title} ${s.text}`.toLowerCase().includes(q))
      .sort((a, b) => b.uses - a.uses || b.updatedAt.localeCompare(a.updatedAt));
  }, [mine, kind, deferredQuery]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: mine.length };
    mine.forEach((s) => (c[s.kind] = (c[s.kind] ?? 0) + 1));
    return c;
  }, [mine]);

  const openNew = () => {
    setError(null);
    setDraft({ kind: kind === 'all' ? 'legenda' : kind, title: '', text: '', general: false });
  };

  const save = () => {
    if (!draft) return;
    try {
      storageService.snippets.save({
        id: draft.id,
        kind: draft.kind,
        title: draft.title,
        text: draft.text,
        clientId: draft.general ? undefined : client.id
      });
      notificationService.showToast(draft.id ? 'Texto atualizado.' : 'Texto salvo na biblioteca.', 'success');
      setDraft(null);
      reload();
    } catch (err) {
      const issue = (err as { issues?: Array<{ message: string }> }).issues?.[0]?.message;
      setError(issue ?? 'Não foi possível salvar.');
    }
  };

  const copy = async (s: Snippet) => {
    if (!(await copyText(s.text))) {
      notificationService.showToast('O navegador bloqueou a cópia. Selecione o texto e copie manualmente.', 'warning');
      return;
    }
    storageService.snippets.markUsed(s.id);
    reload();
    setCopiedId(s.id);
    setTimeout(() => setCopiedId((c) => (c === s.id ? null : c)), 1600);
  };

  const remove = (s: Snippet) => {
    storageService.snippets.delete(s.id);
    reload();
    notificationService.undoable(`"${s.title}" excluído.`, () => {
      storageService.snippets.restore(s);
      reload();
    });
  };

  const draftLimits = draft ? limitsOf(draft.text) : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-neutral-50">Biblioteca</h3>
          <p className="mt-1 max-w-[60ch] text-sm text-neutral-400">
            Legendas, grupos de hashtags, CTAs e ganchos prontos para copiar. Os marcados como gerais aparecem em todos os clientes.
          </p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="inline-flex shrink-0 items-center gap-2 self-start rounded-full bg-white px-4 py-2 text-sm font-semibold text-neutral-950 transition-transform hover:bg-neutral-200 active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" /> Novo texto
        </button>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <label className="relative flex-1">
          <span className="sr-only">Buscar na biblioteca</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome ou texto..."
            className="w-full rounded-full border border-white/[0.06] bg-[#161618] py-2.5 pl-10 pr-4 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-amber-500/60 focus:outline-none"
          />
        </label>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por tipo">
          {[{ id: 'all' as const, plural: 'Todos' }, ...KINDS].map((k) => (
            <button
              key={k.id}
              type="button"
              aria-pressed={kind === k.id}
              onClick={() => setKind(k.id)}
              className={`rounded-full px-3.5 py-1.5 text-xs transition-colors ${
                kind === k.id ? 'bg-amber-500 font-semibold text-neutral-950' : 'bg-white/[0.05] text-neutral-300 hover:bg-white/[0.09]'
              }`}
            >
              {k.plural} <span className="tabular-nums opacity-70">{counts[k.id] ?? 0}</span>
            </button>
          ))}
        </div>
      </div>

      {list.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-white/[0.08] bg-[#161618] px-6 py-12 text-center">
          <p className="text-sm text-neutral-200">{mine.length === 0 ? 'A biblioteca está vazia.' : 'Nada encontrado com esse filtro.'}</p>
          <p className="mx-auto mt-1 max-w-[52ch] text-xs text-neutral-500">
            {mine.length === 0
              ? 'Salve aqui a legenda que funcionou, o grupo de hashtags do nicho e os CTAs que o cliente aprovou. Um clique copia.'
              : 'Tente outro tipo ou limpe a busca.'}
          </p>
          {mine.length === 0 && (
            <button type="button" onClick={openNew} className="mt-4 rounded-full bg-amber-500 px-4 py-2 text-xs font-semibold text-neutral-950 hover:bg-amber-400">
              Criar o primeiro texto
            </button>
          )}
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((s) => {
            const k = kindOf(s.kind);
            const lim = limitsOf(s.text);
            return (
              <li key={s.id} className="group flex flex-col rounded-[24px] border border-white/[0.06] bg-[#161618] p-4 transition-colors hover:border-white/[0.12]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-[11px] text-neutral-500">
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] px-2 py-0.5 text-neutral-300">
                        <k.icon className="h-3 w-3" /> {k.label}
                      </span>
                      {!s.clientId && <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-amber-300">Geral</span>}
                    </div>
                    <h4 className="mt-2 truncate text-sm font-semibold text-neutral-100">{s.title}</h4>
                  </div>
                  <div className="flex shrink-0 gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
                    <button
                      type="button"
                      aria-label={`Editar ${s.title}`}
                      onClick={() => {
                        setError(null);
                        setDraft({ id: s.id, kind: s.kind, title: s.title, text: s.text, general: !s.clientId });
                      }}
                      className="grid h-8 w-8 place-items-center rounded-full text-neutral-400 hover:bg-white/[0.06] hover:text-neutral-100"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Excluir ${s.title}`}
                      onClick={() => remove(s)}
                      className="grid h-8 w-8 place-items-center rounded-full text-neutral-400 hover:bg-rose-500/10 hover:text-rose-300"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <p className="mt-3 line-clamp-6 flex-1 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-neutral-300">{s.text}</p>
                {lim.warn && <p className="mt-2 text-[11px] text-rose-300">{lim.warn}</p>}
                <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/[0.05] pt-3">
                  <span className="text-[11px] tabular-nums text-neutral-500">
                    {s.kind === 'hashtags' ? `${lim.tags} hashtags` : `${lim.chars} caracteres`} · {s.uses === 1 ? 'usado 1 vez' : `usado ${s.uses} vezes`}
                  </span>
                  <button
                    type="button"
                    onClick={() => void copy(s)}
                    aria-label={`Copiar ${s.title}`}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors active:scale-[0.98] ${
                      copiedId === s.id ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/[0.06] text-neutral-200 hover:bg-white/[0.1]'
                    }`}
                  >
                    {copiedId === s.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copiedId === s.id ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Modal
        isOpen={draft !== null}
        onClose={() => setDraft(null)}
        title={draft?.id ? 'Editar texto' : 'Novo texto'}
        subtitle={draft ? kindOf(draft.kind).hint : undefined}
        maxWidth="lg"
      >
        {draft && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Tipo">
              {KINDS.map((k) => (
                <button
                  key={k.id}
                  type="button"
                  role="radio"
                  aria-checked={draft.kind === k.id}
                  onClick={() => setDraft({ ...draft, kind: k.id })}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-colors ${
                    draft.kind === k.id ? 'bg-amber-500 font-semibold text-neutral-950' : 'bg-white/[0.05] text-neutral-300 hover:bg-white/[0.09]'
                  }`}
                >
                  <k.icon className="h-3.5 w-3.5" /> {k.label}
                </button>
              ))}
            </div>
            <div>
              <label htmlFor="snippet-title" className="mb-1.5 block text-xs text-neutral-400">
                Nome
              </label>
              <input
                id="snippet-title"
                value={draft.title}
                maxLength={80}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="Ex.: Hashtags de arquitetura residencial"
                className="w-full rounded-2xl border border-white/[0.08] bg-neutral-950 px-3.5 py-2.5 text-sm text-neutral-100 focus:border-amber-500/60 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="snippet-text" className="mb-1.5 flex items-center justify-between text-xs text-neutral-400">
                <span>Texto</span>
                {draftLimits && (
                  <span className={`tabular-nums ${draftLimits.warn ? 'text-rose-300' : 'text-neutral-500'}`}>
                    {draft.kind === 'hashtags' ? `${draftLimits.tags}/30 hashtags` : `${draftLimits.chars}/2200`}
                  </span>
                )}
              </label>
              <textarea
                id="snippet-text"
                value={draft.text}
                rows={draft.kind === 'legenda' ? 9 : 5}
                onChange={(e) => setDraft({ ...draft, text: e.target.value })}
                className="w-full resize-y rounded-2xl border border-white/[0.08] bg-neutral-950 px-3.5 py-2.5 text-sm leading-relaxed text-neutral-100 focus:border-amber-500/60 focus:outline-none"
              />
              {draftLimits?.warn && <p className="mt-1 text-[11px] text-rose-300">{draftLimits.warn}</p>}
            </div>
            <label className="flex items-center gap-2.5 text-sm text-neutral-300">
              <input
                type="checkbox"
                checked={draft.general}
                onChange={(e) => setDraft({ ...draft, general: e.target.checked })}
                className="h-4 w-4 accent-amber-500"
              />
              Geral: mostrar em todos os clientes
            </label>
            {error && (
              <p role="alert" className="rounded-2xl bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setDraft(null)} className="rounded-full px-4 py-2 text-sm text-neutral-300 hover:bg-white/[0.05]">
                Cancelar
              </button>
              <button type="submit" className="rounded-full bg-amber-500 px-5 py-2 text-sm font-semibold text-neutral-950 hover:bg-amber-400 active:scale-[0.98]">
                Salvar texto
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
