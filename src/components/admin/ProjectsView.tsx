import React, { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight, CalendarClock, Plus, Receipt } from 'lucide-react';
import type { PaymentMethod, Project, ProjectStage } from '../../types';
import { storageService } from '../../services/storageService';
import { notificationService } from '../../services/notificationService';
import { PAYMENT_METHODS, PROJECT_STAGES, addDaysISO, brl, formatInvoiceNumber, nextStage, pipelineTotals, todayBR } from '../../services/finance';
import { Modal } from '../common/Modal';
import { EmptyState, FIELD, Field, PageHeader, PrimaryButton } from './ui';
import { ProjectModal, type ClientOption } from './forms';
import { financeActions, type FinanceData } from './useFinance';

const br = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;

export const ProjectsView: React.FC<FinanceData & { clients: ClientOption[]; reload: () => void }> = ({ projects, contracts, invoices, clients, reload }) => {
  const reduce = useReducedMotion();
  const today = todayBR();
  const [editing, setEditing] = useState<Project | { stage: ProjectStage } | null>(null);
  const [billing, setBilling] = useState<Project | null>(null);
  const [over, setOver] = useState<ProjectStage | null>(null);
  const totals = pipelineTotals(projects);
  const open = projects.filter((p) => p.stage !== 'recebido');

  const move = (p: Project, stage: ProjectStage) => {
    if (p.stage === stage) return;
    // Ir para "Faturado" sem cobrança: abre a cobrança primeiro.
    if (stage === 'faturado' && !invoices.some((i) => i.projectId === p.id && i.status !== 'cancelada')) {
      setBilling(p);
      return;
    }
    financeActions.moveProject(p.id, stage);
    reload();
  };

  const remove = (p: Project) => {
    storageService.finance.projects.delete(p.id);
    setEditing(null);
    reload();
    notificationService.undoable(`Projeto "${p.title}" excluído.`, () => {
      storageService.finance.projects.restore(p);
      reload();
    });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Projetos"
        subtitle={
          <>
            {open.length} em andamento · em produção <span className="tabular-nums text-neutral-200">{brl(totals.producao.cents + totals.revisao.cents)}</span> · entregue sem faturar{' '}
            <span className="tabular-nums text-amber-300">{brl(totals.entregue.cents)}</span>
          </>
        }
        actions={
          <PrimaryButton onClick={() => setEditing({ stage: 'proposta' })}>
            <Plus className="h-4 w-4" /> Novo projeto
          </PrimaryButton>
        }
      />

      {projects.length === 0 ? (
        <EmptyState
          title="Nenhum projeto ainda"
          text="Cadastre cada trabalho (site, identidade visual, campanha, mês de gestão) e acompanhe as etapas: proposta, aprovado, produção, revisão, entregue, faturado e recebido."
          action={
            <PrimaryButton onClick={() => setEditing({ stage: 'proposta' })}>
              <Plus className="h-4 w-4" /> Novo projeto
            </PrimaryButton>
          }
        />
      ) : (
        <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
          <div className="grid min-w-[1400px] grid-cols-7 gap-3">
            {PROJECT_STAGES.map((s) => {
              const col = projects.filter((p) => p.stage === s.id).sort((a, b) => (a.deadline ?? '9999').localeCompare(b.deadline ?? '9999'));
              return (
                <section
                  key={s.id}
                  aria-label={s.label}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setOver(s.id);
                  }}
                  onDragLeave={() => setOver((o) => (o === s.id ? null : o))}
                  onDrop={(e) => {
                    e.preventDefault();
                    setOver(null);
                    const p = projects.find((x) => x.id === e.dataTransfer.getData('text/project'));
                    if (p) move(p, s.id);
                  }}
                  className={`flex min-h-[360px] flex-col rounded-[24px] bg-[#161618] p-3 transition-colors ${over === s.id ? 'ring-2 ring-amber-500/40' : ''}`}
                >
                  <header className="mb-3 px-1.5 pt-1">
                    <span className="flex items-center gap-2 text-sm font-semibold text-neutral-100">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                      {s.label}
                      <span className="text-xs font-normal tabular-nums text-neutral-500">{col.length}</span>
                    </span>
                    <span className="mt-0.5 block text-[11px] tabular-nums text-neutral-500">{brl(totals[s.id].cents)}</span>
                  </header>
                  <div className="flex flex-1 flex-col gap-2">
                    {col.map((p) => {
                      const next = nextStage(p.stage);
                      const late = p.deadline && p.deadline < today && ['proposta', 'aprovado', 'producao', 'revisao'].includes(p.stage);
                      const inv = invoices.find((i) => i.projectId === p.id && i.status !== 'cancelada');
                      return (
                        <motion.div key={p.id} layout={!reduce} layoutId={reduce ? undefined : `project-${p.id}`} transition={{ type: 'spring', stiffness: 420, damping: 34 }}>
                          <div
                            draggable
                            onDragStart={(e) => e.dataTransfer.setData('text/project', p.id)}
                            className="group rounded-2xl border border-white/[0.05] bg-[#1d1d20] p-3 transition-colors hover:border-white/[0.12]"
                          >
                            <button type="button" onClick={() => setEditing(p)} className="block w-full text-left">
                              <span className="block truncate text-[11px] text-neutral-500">{p.clientName}</span>
                              <span className="mt-1 block text-sm leading-snug text-neutral-100">{p.title}</span>
                              <span className="mt-2 block text-sm font-semibold tabular-nums text-neutral-50">{brl(p.valueCents)}</span>
                            </button>
                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                              <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-neutral-300">{p.kind}</span>
                              {p.deadline && (
                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] ${late ? 'bg-rose-500/15 text-rose-300' : 'bg-white/[0.04] text-neutral-400'}`}>
                                  <CalendarClock className="h-3 w-3" /> {br(p.deadline)}
                                </span>
                              )}
                              {inv && <span className="rounded-full bg-violet-400/15 px-2 py-0.5 text-[10px] text-violet-300">{formatInvoiceNumber(inv.number)}</span>}
                              {p.stage === 'entregue' && !inv ? (
                                <button
                                  type="button"
                                  onClick={() => setBilling(p)}
                                  className="ml-auto inline-flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-1 text-[11px] font-semibold text-neutral-950 hover:bg-amber-400"
                                >
                                  <Receipt className="h-3 w-3" /> Faturar
                                </button>
                              ) : (
                                next && (
                                  <button
                                    type="button"
                                    onClick={() => move(p, next)}
                                    aria-label={`Mover "${p.title}" para ${PROJECT_STAGES.find((x) => x.id === next)?.label}`}
                                    title={`Mover para ${PROJECT_STAGES.find((x) => x.id === next)?.label}`}
                                    className="ml-auto grid h-7 w-7 place-items-center rounded-full bg-white/[0.06] text-neutral-300 transition hover:bg-neutral-50 hover:text-neutral-950 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100"
                                  >
                                    <ArrowRight className="h-3.5 w-3.5" />
                                  </button>
                                )
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => setEditing({ stage: s.id })}
                      aria-label={`Novo projeto em ${s.label}`}
                      className="rounded-2xl border border-dashed border-white/[0.06] px-3 py-2 text-[11px] text-neutral-600 hover:text-neutral-300"
                    >
                      + Adicionar
                    </button>
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      )}

      {editing && (
        <ProjectModal
          initial={'id' in editing ? editing : undefined}
          defaultStage={editing.stage}
          clients={clients}
          contracts={contracts}
          onClose={() => setEditing(null)}
          onDelete={'id' in editing ? () => remove(editing) : undefined}
          onSaved={(p) => {
            setEditing(null);
            reload();
            notificationService.showToast(`Projeto "${p.title}" salvo.`, 'success');
          }}
        />
      )}
      {billing && <BillProjectModal project={billing} onClose={() => setBilling(null)} onDone={() => { setBilling(null); reload(); }} />}
    </div>
  );
};

const BillProjectModal: React.FC<{ project: Project; onClose: () => void; onDone: () => void }> = ({ project, onClose, onDone }) => {
  const [due, setDue] = useState(addDaysISO(todayBR(), 7));
  const [method, setMethod] = useState<PaymentMethod>('pix');
  return (
    <Modal isOpen onClose={onClose} title="Faturar projeto" subtitle={`${project.clientName} · ${project.title} · ${brl(project.valueCents)}`} maxWidth="md">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          const inv = financeActions.invoiceProject(project, due, method);
          notificationService.showToast(`Cobrança ${formatInvoiceNumber(inv.number)} criada e projeto movido para Faturado.`, 'success');
          onDone();
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="bill-due" label="Vencimento">
            <input id="bill-due" type="date" value={due} onChange={(e) => setDue(e.target.value)} className={`${FIELD} [color-scheme:dark]`} />
          </Field>
          <Field id="bill-method" label="Forma de pagamento">
            <select id="bill-method" value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)} className={FIELD}>
              {PAYMENT_METHODS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="flex justify-end gap-2 border-t border-white/[0.06] pt-4">
          <button type="button" onClick={onClose} className="rounded-full px-4 py-2 text-sm text-neutral-300 hover:bg-white/[0.06]">
            Cancelar
          </button>
          <button type="submit" className="rounded-full bg-amber-500 px-5 py-2 text-sm font-semibold text-neutral-950 hover:bg-amber-400">
            Criar cobrança
          </button>
        </div>
      </form>
    </Modal>
  );
};
