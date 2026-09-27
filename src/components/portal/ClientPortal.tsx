import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { CalendarClock, Check, CircleAlert, ExternalLink, Loader2, MessageSquareWarning, ThumbsUp } from 'lucide-react';
import { portalService, type PortalTask, type PortalView } from '../../services/portalService';
import { ApiError } from '../../services/api/apiClient';
import { formatDateBR, formatDateTimeBR } from '../../utils/dates';

type LoadState = { kind: 'loading' } | { kind: 'error'; title: string; message: string } | { kind: 'ready'; view: PortalView };

function explain(err: unknown): { title: string; message: string } {
  if (err instanceof ApiError) {
    if (err.status === 410) return { title: 'Este link expirou', message: 'Peça um novo link para a agência.' };
    if (err.status === 404 || err.status === 400) return { title: 'Link inválido', message: 'Este link não existe mais ou foi substituído por um novo. Confira com a agência.' };
    if (err.status === 429) return { title: 'Muitas tentativas', message: 'Aguarde um minuto e recarregue a página.' };
  }
  return { title: 'Não foi possível carregar', message: 'Verifique sua conexão e tente de novo.' };
}

const dueText = (d: string | null) => (d ? `Prazo ${d.slice(8, 10)}/${d.slice(5, 7)}` : null);

/** Página pública (sem login) em /aprovar/<token>. */
export const ClientPortal: React.FC<{ token: string }> = ({ token }) => {
  const reduce = useReducedMotion();
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  useEffect(() => {
    document.title = 'Aprovação de conteúdo';
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    portalService
      .view(token)
      .then((view) => setState({ kind: 'ready', view }))
      .catch((err) => setState({ kind: 'error', ...explain(err) }));
    return () => meta.remove();
  }, [token]);

  const replaceTask = (task: PortalTask) =>
    setState((s) => (s.kind === 'ready' ? { kind: 'ready', view: { ...s.view, tasks: s.view.tasks.map((t) => (t.id === task.id ? task : t)) } } : s));

  return (
    <div className="min-h-[100dvh] bg-neutral-950 font-sans text-neutral-100 antialiased">
      <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-14">
        {state.kind === 'loading' && (
          <div className="space-y-4" aria-busy="true" aria-label="Carregando">
            <div className="h-5 w-40 animate-pulse rounded-full bg-white/[0.06] motion-reduce:animate-none" />
            <div className="h-9 w-72 animate-pulse rounded-full bg-white/[0.06] motion-reduce:animate-none" />
            {[0, 1].map((i) => (
              <div key={i} className="h-48 animate-pulse rounded-[28px] bg-[#161618] motion-reduce:animate-none" />
            ))}
          </div>
        )}

        {state.kind === 'error' && (
          <div className="rounded-[28px] border border-white/[0.06] bg-[#161618] p-8 text-center">
            <CircleAlert className="mx-auto h-8 w-8 text-amber-400" />
            <h1 className="mt-4 text-xl font-semibold">{state.title}</h1>
            <p className="mx-auto mt-2 max-w-sm text-sm text-neutral-400">{state.message}</p>
          </div>
        )}

        {state.kind === 'ready' && <PortalBody view={state.view} token={token} onDecided={replaceTask} reduce={!!reduce} />}
      </main>
    </div>
  );
};

const PortalBody: React.FC<{ view: PortalView; token: string; onDecided: (t: PortalTask) => void; reduce: boolean }> = ({ view, token, onDecided, reduce }) => {
  const pending = view.tasks.filter((t) => t.status === 'review');
  const decided = view.tasks.filter((t) => t.status === 'decided');
  return (
    <>
      <header className="mb-8">
        {view.agencyName && <p className="text-xs text-amber-400">{view.agencyName}</p>}
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Aprovação de conteúdo</h1>
        <p className="mt-2 text-sm text-neutral-400">
          {view.clientName} ·{' '}
          {pending.length === 0 ? 'nada aguardando sua aprovação agora' : `${pending.length} ${pending.length === 1 ? 'item aguardando' : 'itens aguardando'} sua aprovação`}
        </p>
      </header>

      {pending.length === 0 && (
        <div className="rounded-[28px] border border-white/[0.06] bg-[#161618] p-8 text-center">
          <Check className="mx-auto h-8 w-8 text-emerald-400" />
          <p className="mt-3 text-sm text-neutral-300">Tudo em dia. Quando a agência enviar algo novo, aparece aqui neste mesmo link.</p>
        </div>
      )}

      <ul className="space-y-4">
        <AnimatePresence initial={false}>
          {pending.map((t) => (
            <motion.li key={t.id} layout={!reduce} exit={reduce ? undefined : { opacity: 0, scale: 0.97 }}>
              <PendingCard task={t} token={token} onDecided={onDecided} />
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      {decided.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-sm font-medium text-neutral-400">Respondidos recentemente</h2>
          <ul className="divide-y divide-white/[0.05] rounded-[24px] border border-white/[0.06] bg-[#161618]">
            {decided.map((t) => (
              <motion.li key={t.id} layout={!reduce} className="flex items-start gap-3 px-5 py-4">
                {t.lastDecision?.decision === 'approved' ? (
                  <ThumbsUp className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                ) : (
                  <MessageSquareWarning className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                )}
                <div className="min-w-0">
                  <p className="text-sm text-neutral-100">{t.title}</p>
                  <p className="text-xs text-neutral-500">
                    {t.lastDecision?.decision === 'approved' ? 'Aprovado' : 'Ajuste pedido'}
                    {t.lastDecision && ` em ${formatDateTimeBR(t.lastDecision.at)}`}
                  </p>
                  {t.lastDecision?.comment && <p className="mt-1 whitespace-pre-wrap text-xs text-neutral-400">"{t.lastDecision.comment}"</p>}
                </div>
              </motion.li>
            ))}
          </ul>
        </section>
      )}

      <footer className="mt-12 text-center text-[11px] text-neutral-600">Link pessoal válido até {formatDateBR(view.expiresAt)}. Não compartilhe.</footer>
    </>
  );
};

const PendingCard: React.FC<{ task: PortalTask; token: string; onDecided: (t: PortalTask) => void }> = ({ task, token, onDecided }) => {
  const [mode, setMode] = useState<'idle' | 'changes'>('idle');
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState<'approved' | 'changes' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const decide = async (decision: 'approved' | 'changes') => {
    if (decision === 'changes' && !comment.trim()) {
      setError('Conte o que precisa mudar.');
      return;
    }
    setBusy(decision);
    setError(null);
    try {
      onDecided(await portalService.decide(token, task.id, decision, decision === 'changes' ? comment.trim() : undefined));
    } catch (err) {
      setError(err instanceof ApiError && err.status === 409 ? 'Este item já foi respondido. Recarregue a página.' : err instanceof Error ? err.message : 'Não foi possível enviar.');
      setBusy(null);
    }
  };

  return (
    <article className="rounded-[28px] border border-white/[0.06] bg-[#161618] p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        {task.type && <span className="rounded-full bg-white/[0.06] px-2.5 py-0.5 text-neutral-300">{task.type}</span>}
        {dueText(task.dueDate) && (
          <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.04] px-2.5 py-0.5 text-neutral-400">
            <CalendarClock className="h-3 w-3" /> {dueText(task.dueDate)}
          </span>
        )}
        {task.lastDecision?.decision === 'changes' && <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-amber-300">Nova versão após seu ajuste</span>}
      </div>
      <h3 className="mt-3 text-lg font-semibold leading-snug text-neutral-50">{task.title}</h3>

      {task.clientCopy && (
        <div className="mt-4 rounded-2xl bg-neutral-950/60 p-4">
          <p className="mb-1.5 text-[11px] text-neutral-500">Texto para aprovar</p>
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-neutral-200">{task.clientCopy}</p>
        </div>
      )}
      {task.previewUrl && (
        <a
          href={task.previewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-4 py-2 text-sm text-neutral-100 hover:bg-white/[0.1]"
        >
          Ver arte ou vídeo <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}

      {mode === 'changes' && (
        <div className="mt-5">
          <label htmlFor={`comment-${task.id}`} className="mb-1.5 block text-xs text-neutral-400">
            O que precisa mudar?
          </label>
          <textarea
            id={`comment-${task.id}`}
            autoFocus
            rows={3}
            maxLength={2000}
            value={comment}
            onChange={(e) => {
              setComment(e.target.value);
              setError(null);
            }}
            placeholder="Ex.: trocar a música e deixar o logo maior no final"
            className="w-full resize-y rounded-2xl border border-white/[0.08] bg-neutral-950 px-3.5 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-amber-500/60 focus:outline-none"
          />
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 text-xs text-rose-300">
          {error}
        </p>
      )}

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        {mode === 'idle' ? (
          <>
            <button
              type="button"
              onClick={() => void decide('approved')}
              disabled={busy !== null}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-400 px-5 py-2.5 text-sm font-semibold text-emerald-950 hover:bg-emerald-300 disabled:opacity-60 active:scale-[0.98]"
            >
              {busy === 'approved' ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : <ThumbsUp className="h-4 w-4" />}
              Aprovar
            </button>
            <button
              type="button"
              onClick={() => setMode('changes')}
              disabled={busy !== null}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white/[0.06] px-5 py-2.5 text-sm text-neutral-100 hover:bg-white/[0.1] disabled:opacity-60"
            >
              <MessageSquareWarning className="h-4 w-4" /> Pedir ajuste
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => void decide('changes')}
              disabled={busy !== null}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-amber-500 px-5 py-2.5 text-sm font-semibold text-neutral-950 hover:bg-amber-400 disabled:opacity-60 active:scale-[0.98]"
            >
              {busy === 'changes' && <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />}
              Enviar ajuste
            </button>
            <button type="button" onClick={() => setMode('idle')} disabled={busy !== null} className="rounded-full px-5 py-2.5 text-sm text-neutral-400 hover:bg-white/[0.05]">
              Cancelar
            </button>
          </>
        )}
      </div>
    </article>
  );
};
