import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { Contract, Expense, Invoice, InvoiceItem, PaymentMethod, Project } from '../../types';
import { Modal } from '../common/Modal';
import { EXPENSE_CATEGORIES, PAYMENT_METHODS, PROJECT_STAGES, addDaysISO, brl, invoiceTotal, todayBR } from '../../services/finance';
import { generateUUID } from '../../utils/uuid';
import { FIELD, Field, MoneyInput, firstIssue } from './ui';
import { financeActions } from './useFinance';
import { storageService } from '../../services/storageService';

export interface ClientOption {
  id: string;
  name: string;
}

const Footer: React.FC<{ onCancel: () => void; submitLabel: string; left?: React.ReactNode }> = ({ onCancel, submitLabel, left }) => (
  <div className="flex items-center justify-between gap-2 border-t border-white/[0.06] pt-4">
    {left ?? <span />}
    <div className="flex gap-2">
      <button type="button" onClick={onCancel} className="rounded-full px-4 py-2 text-sm text-neutral-300 hover:bg-white/[0.06]">
        Cancelar
      </button>
      <button type="submit" className="rounded-full bg-amber-500 px-5 py-2 text-sm font-semibold text-neutral-950 hover:bg-amber-400 active:scale-[0.98]">
        {submitLabel}
      </button>
    </div>
  </div>
);

const ClientSelect: React.FC<{ id: string; value: string; clients: ClientOption[]; onChange: (id: string) => void }> = ({ id, value, clients, onChange }) => (
  <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={FIELD}>
    <option value="">Escolha o cliente</option>
    {clients.map((c) => (
      <option key={c.id} value={c.id}>
        {c.name}
      </option>
    ))}
  </select>
);

const MethodSelect: React.FC<{ id: string; value: PaymentMethod; onChange: (m: PaymentMethod) => void }> = ({ id, value, onChange }) => (
  <select id={id} value={value} onChange={(e) => onChange(e.target.value as PaymentMethod)} className={FIELD}>
    {PAYMENT_METHODS.map((m) => (
      <option key={m.id} value={m.id}>
        {m.label}
      </option>
    ))}
  </select>
);

const nameOf = (clients: ClientOption[], id: string, fallback = '') => clients.find((c) => c.id === id)?.name ?? fallback;

/* ------------------------------------------------------------------ */
/* Cobrança                                                             */
/* ------------------------------------------------------------------ */

export const InvoiceModal: React.FC<{ initial?: Invoice; clients: ClientOption[]; defaultClientId?: string; onClose: () => void; onSaved: (inv: Invoice) => void }> = ({
  initial,
  clients,
  defaultClientId,
  onClose,
  onSaved
}) => {
  const today = todayBR();
  const [clientId, setClientId] = useState(initial?.clientId ?? defaultClientId ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [items, setItems] = useState<Array<InvoiceItem & { cents: number | null }>>(
    initial?.items.map((i) => ({ ...i, cents: i.unitCents })) ?? [{ id: generateUUID(), description: '', quantity: 1, unitCents: 0, cents: null }]
  );
  const [discount, setDiscount] = useState<number | null>(initial?.discountCents ?? 0);
  const [issueDate, setIssueDate] = useState(initial?.issueDate ?? today);
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? addDaysISO(today, 7));
  const [method, setMethod] = useState<PaymentMethod>(initial?.paymentMethod ?? 'pix');
  const [fiscalNumber, setFiscalNumber] = useState(initial?.fiscalNumber ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [error, setError] = useState<string | null>(null);

  const cleanItems = items.map(({ cents, ...i }) => ({ ...i, unitCents: cents ?? 0 }));
  const total = invoiceTotal({ items: cleanItems, discountCents: discount ?? 0 });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) return setError('Escolha o cliente.');
    if (items.some((i) => i.cents === null || i.cents <= 0)) return setError('Informe o valor de cada item.');
    if (dueDate < issueDate) return setError('O vencimento não pode ser antes da emissão.');
    try {
      const saved = financeActions.saveInvoice({
        ...(initial ?? {}),
        id: initial?.id,
        clientId,
        clientName: nameOf(clients, clientId, initial?.clientName),
        description: description.trim() || cleanItems[0]?.description || '',
        items: cleanItems.map((i) => ({ ...i, description: i.description.trim() || description.trim() })),
        discountCents: discount ?? 0,
        issueDate,
        dueDate,
        status: initial?.status ?? 'aberta',
        paymentMethod: method,
        fiscalNumber: fiscalNumber.trim() || undefined,
        notes: notes.trim() || undefined
      });
      onSaved(saved);
    } catch (err) {
      setError(firstIssue(err));
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={initial ? 'Editar cobrança' : 'Nova cobrança'} subtitle="Registro interno do recebimento (a nota fiscal, se houver, é emitida à parte)." maxWidth="2xl">
      <form onSubmit={submit} noValidate className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="inv-client" label="Cliente">
            <ClientSelect id="inv-client" value={clientId} clients={clients} onChange={setClientId} />
          </Field>
          <Field id="inv-desc" label="Descrição">
            <input id="inv-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex.: Gestão de redes · outubro" className={FIELD} />
          </Field>
        </div>

        <div>
          <span className="mb-1.5 block text-xs font-medium text-neutral-300">Itens</span>
          <div className="space-y-2">
            {items.map((it, idx) => (
              <div key={it.id} className="grid grid-cols-[1fr_70px_140px_32px] items-center gap-2">
                <input
                  aria-label={`Item ${idx + 1}: descrição`}
                  value={it.description}
                  onChange={(e) => setItems(items.map((x) => (x.id === it.id ? { ...x, description: e.target.value } : x)))}
                  placeholder="Ex.: 12 posts + 4 reels"
                  className={FIELD}
                />
                <input
                  aria-label={`Item ${idx + 1}: quantidade`}
                  type="number"
                  min={1}
                  step="1"
                  value={it.quantity}
                  onChange={(e) => setItems(items.map((x) => (x.id === it.id ? { ...x, quantity: Math.max(1, Number(e.target.value) || 1) } : x)))}
                  className={`${FIELD} text-center`}
                />
                <MoneyInput
                  id={`inv-item-${idx}`}
                  ariaLabel={`Item ${idx + 1}: valor unitário`}
                  cents={it.cents}
                  onChange={(c) => setItems(items.map((x) => (x.id === it.id ? { ...x, cents: c } : x)))}
                />
                <button
                  type="button"
                  aria-label={`Remover item ${idx + 1}`}
                  disabled={items.length === 1}
                  onClick={() => setItems(items.filter((x) => x.id !== it.id))}
                  className="grid h-8 w-8 place-items-center rounded-full text-neutral-500 hover:bg-white/[0.06] hover:text-rose-300 disabled:opacity-30"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setItems([...items, { id: generateUUID(), description: '', quantity: 1, unitCents: 0, cents: null }])}
            className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/[0.05] px-3 py-1.5 text-xs text-neutral-300 hover:bg-white/[0.09]"
          >
            <Plus className="h-3.5 w-3.5" /> Adicionar item
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          <Field id="inv-discount" label="Desconto">
            <MoneyInput id="inv-discount" cents={discount} onChange={setDiscount} />
          </Field>
          <Field id="inv-issue" label="Emissão">
            <input id="inv-issue" type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className={`${FIELD} [color-scheme:dark]`} />
          </Field>
          <Field id="inv-due" label="Vencimento">
            <input id="inv-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={`${FIELD} [color-scheme:dark]`} />
          </Field>
          <Field id="inv-method" label="Forma de pagamento">
            <MethodSelect id="inv-method" value={method} onChange={setMethod} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
          <Field id="inv-nf" label="Nº da nota fiscal" hint="Opcional, se emitir NF.">
            <input id="inv-nf" value={fiscalNumber} onChange={(e) => setFiscalNumber(e.target.value)} className={FIELD} />
          </Field>
          <Field id="inv-notes" label="Observações">
            <input id="inv-notes" value={notes} onChange={(e) => setNotes(e.target.value)} className={FIELD} />
          </Field>
        </div>

        <div className="flex items-center justify-between rounded-2xl bg-white/[0.03] px-4 py-3">
          <span className="text-sm text-neutral-400">Total da cobrança</span>
          <span className="text-xl font-semibold tabular-nums text-neutral-50">{brl(total)}</span>
        </div>
        {error && (
          <p role="alert" className="rounded-2xl bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
            {error}
          </p>
        )}
        <Footer onCancel={onClose} submitLabel={initial ? 'Salvar cobrança' : 'Criar cobrança'} />
      </form>
    </Modal>
  );
};

/* ------------------------------------------------------------------ */
/* Pagamento                                                            */
/* ------------------------------------------------------------------ */

export const PayModal: React.FC<{ invoice: Invoice; onClose: () => void; onPaid: (inv: Invoice) => void }> = ({ invoice, onClose, onPaid }) => {
  const [paidAt, setPaidAt] = useState(todayBR());
  const [cents, setCents] = useState<number | null>(invoiceTotal(invoice));
  const [method, setMethod] = useState<PaymentMethod>(invoice.paymentMethod);
  const [error, setError] = useState<string | null>(null);
  return (
    <Modal isOpen onClose={onClose} title="Registrar pagamento" subtitle={`${invoice.clientName} · ${invoice.description}`} maxWidth="md">
      <form
        noValidate
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!cents || cents <= 0) return setError('Informe o valor recebido.');
          if (paidAt > todayBR()) return setError('A data do pagamento não pode ser no futuro.');
          onPaid(financeActions.markPaid(invoice, { paidAt, paidCents: cents, paymentMethod: method }));
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="pay-date" label="Data do pagamento">
            <input id="pay-date" type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} className={`${FIELD} [color-scheme:dark]`} />
          </Field>
          <Field id="pay-amount" label="Valor recebido" hint={`Cobrado: ${brl(invoiceTotal(invoice))}`}>
            <MoneyInput id="pay-amount" cents={cents} onChange={setCents} />
          </Field>
        </div>
        <Field id="pay-method" label="Forma de pagamento">
          <MethodSelect id="pay-method" value={method} onChange={setMethod} />
        </Field>
        {error && (
          <p role="alert" className="text-xs text-rose-400">
            {error}
          </p>
        )}
        <Footer onCancel={onClose} submitLabel="Confirmar pagamento" />
      </form>
    </Modal>
  );
};

/* ------------------------------------------------------------------ */
/* Contrato                                                             */
/* ------------------------------------------------------------------ */

export const ContractModal: React.FC<{ initial?: Contract; clients: ClientOption[]; onClose: () => void; onSaved: (c: Contract) => void; onDelete?: () => void }> = ({
  initial,
  clients,
  onClose,
  onSaved,
  onDelete
}) => {
  const [clientId, setClientId] = useState(initial?.clientId ?? '');
  const [title, setTitle] = useState(initial?.title ?? '');
  const [kind, setKind] = useState<Contract['kind']>(initial?.kind ?? 'recorrente');
  const [amount, setAmount] = useState<number | null>(initial?.amountCents ?? null);
  const [billingDay, setBillingDay] = useState(initial?.billingDay ?? 10);
  const [startDate, setStartDate] = useState(initial?.startDate ?? todayBR());
  const [endDate, setEndDate] = useState(initial?.endDate ?? '');
  const [status, setStatus] = useState<Contract['status']>(initial?.status ?? 'ativo');
  const [method, setMethod] = useState<PaymentMethod>(initial?.paymentMethod ?? 'pix');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) return setError('Escolha o cliente.');
    if (!amount) return setError('Informe o valor.');
    if (endDate && endDate < startDate) return setError('O fim não pode ser antes do início.');
    try {
      onSaved(
        storageService.finance.contracts.save({
          id: initial?.id,
          clientId,
          clientName: nameOf(clients, clientId, initial?.clientName),
          title,
          kind,
          amountCents: amount,
          billingDay: kind === 'recorrente' ? billingDay : undefined,
          startDate,
          endDate: endDate || undefined,
          status,
          paymentMethod: method,
          notes: notes.trim() || undefined
        })
      );
    } catch (err) {
      setError(firstIssue(err));
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={initial ? 'Editar contrato' : 'Novo contrato'} subtitle="Contratos recorrentes geram a cobrança de cada mês." maxWidth="xl">
      <form onSubmit={submit} noValidate className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="ctr-client" label="Cliente">
            <ClientSelect id="ctr-client" value={clientId} clients={clients} onChange={setClientId} />
          </Field>
          <Field id="ctr-title" label="Serviço">
            <input id="ctr-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Gestão de Instagram" className={FIELD} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field id="ctr-kind" label="Tipo">
            <select id="ctr-kind" value={kind} onChange={(e) => setKind(e.target.value as Contract['kind'])} className={FIELD}>
              <option value="recorrente">Recorrente (mensal)</option>
              <option value="avulso">Avulso (projeto fechado)</option>
            </select>
          </Field>
          <Field id="ctr-amount" label={kind === 'recorrente' ? 'Valor mensal' : 'Valor total'}>
            <MoneyInput id="ctr-amount" cents={amount} onChange={setAmount} />
          </Field>
          {kind === 'recorrente' ? (
            <Field id="ctr-day" label="Dia do vencimento">
              <input id="ctr-day" type="number" min={1} max={28} value={billingDay} onChange={(e) => setBillingDay(Math.min(28, Math.max(1, Number(e.target.value) || 1)))} className={FIELD} />
            </Field>
          ) : (
            <Field id="ctr-method-a" label="Forma de pagamento">
              <MethodSelect id="ctr-method-a" value={method} onChange={setMethod} />
            </Field>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field id="ctr-start" label="Início">
            <input id="ctr-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={`${FIELD} [color-scheme:dark]`} />
          </Field>
          <Field id="ctr-end" label="Fim (opcional)">
            <input id="ctr-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={`${FIELD} [color-scheme:dark]`} />
          </Field>
          <Field id="ctr-status" label="Situação">
            <select id="ctr-status" value={status} onChange={(e) => setStatus(e.target.value as Contract['status'])} className={FIELD}>
              <option value="ativo">Ativo</option>
              <option value="pausado">Pausado</option>
              <option value="encerrado">Encerrado</option>
            </select>
          </Field>
        </div>
        {kind === 'recorrente' && (
          <Field id="ctr-method" label="Forma de pagamento">
            <MethodSelect id="ctr-method" value={method} onChange={setMethod} />
          </Field>
        )}
        <Field id="ctr-notes" label="Observações">
          <textarea id="ctr-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={`${FIELD} resize-y`} />
        </Field>
        {error && (
          <p role="alert" className="rounded-2xl bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
            {error}
          </p>
        )}
        <Footer
          onCancel={onClose}
          submitLabel="Salvar contrato"
          left={
            initial && onDelete ? (
              <button type="button" onClick={onDelete} className="rounded-full px-3 py-2 text-xs text-rose-300 hover:bg-rose-500/10">
                Excluir
              </button>
            ) : undefined
          }
        />
      </form>
    </Modal>
  );
};

/* ------------------------------------------------------------------ */
/* Projeto                                                              */
/* ------------------------------------------------------------------ */

export const ProjectModal: React.FC<{ initial?: Project; defaultStage?: Project['stage']; clients: ClientOption[]; contracts: Contract[]; onClose: () => void; onSaved: (p: Project) => void; onDelete?: () => void }> = ({
  initial,
  defaultStage,
  clients,
  contracts,
  onClose,
  onSaved,
  onDelete
}) => {
  const [clientId, setClientId] = useState(initial?.clientId ?? '');
  const [title, setTitle] = useState(initial?.title ?? '');
  const [kind, setKind] = useState<Project['kind']>(initial?.kind ?? 'avulso');
  const [value, setValue] = useState<number | null>(initial?.valueCents ?? null);
  const [stage, setStage] = useState<Project['stage']>(initial?.stage ?? defaultStage ?? 'proposta');
  const [contractId, setContractId] = useState(initial?.contractId ?? '');
  const [startDate, setStartDate] = useState(initial?.startDate ?? '');
  const [deadline, setDeadline] = useState(initial?.deadline ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [error, setError] = useState<string | null>(null);
  const clientContracts = contracts.filter((c) => c.clientId === clientId);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) return setError('Escolha o cliente.');
    if (value === null) return setError('Informe o valor (0 se não for cobrado à parte).');
    try {
      const history = initial?.stageHistory ?? [];
      onSaved(
        storageService.finance.projects.save({
          id: initial?.id,
          clientId,
          clientName: nameOf(clients, clientId, initial?.clientName),
          title,
          kind,
          valueCents: value,
          stage,
          contractId: contractId || undefined,
          startDate: startDate || undefined,
          deadline: deadline || undefined,
          notes: notes.trim() || undefined,
          stageHistory: initial?.stage === stage ? history : [...history, { stage, at: new Date().toISOString() }]
        })
      );
    } catch (err) {
      setError(firstIssue(err));
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={initial ? 'Editar projeto' : 'Novo projeto'} subtitle="Acompanhe da proposta ao dinheiro na conta." maxWidth="xl">
      <form onSubmit={submit} noValidate className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="prj-client" label="Cliente">
            <ClientSelect id="prj-client" value={clientId} clients={clients} onChange={setClientId} />
          </Field>
          <Field id="prj-title" label="Projeto">
            <input id="prj-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Identidade visual + lançamento" className={FIELD} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field id="prj-kind" label="Tipo">
            <select id="prj-kind" value={kind} onChange={(e) => setKind(e.target.value as Project['kind'])} className={FIELD}>
              <option value="avulso">Avulso</option>
              <option value="recorrente">Recorrente</option>
            </select>
          </Field>
          <Field id="prj-value" label="Valor">
            <MoneyInput id="prj-value" cents={value} onChange={setValue} />
          </Field>
          <Field id="prj-stage" label="Etapa">
            <select id="prj-stage" value={stage} onChange={(e) => setStage(e.target.value as Project['stage'])} className={FIELD}>
              {PROJECT_STAGES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field id="prj-start" label="Início">
            <input id="prj-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={`${FIELD} [color-scheme:dark]`} />
          </Field>
          <Field id="prj-deadline" label="Prazo de entrega">
            <input id="prj-deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={`${FIELD} [color-scheme:dark]`} />
          </Field>
          <Field id="prj-contract" label="Contrato (opcional)">
            <select id="prj-contract" value={contractId} onChange={(e) => setContractId(e.target.value)} className={FIELD} disabled={!clientId}>
              <option value="">Nenhum</option>
              {clientContracts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field id="prj-notes" label="Escopo e observações">
          <textarea id="prj-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className={`${FIELD} resize-y`} />
        </Field>
        {initial && initial.stageHistory.length > 0 && (
          <div className="text-[11px] text-neutral-500">
            Histórico:{' '}
            {initial.stageHistory
              .slice(-5)
              .map((h) => `${PROJECT_STAGES.find((s) => s.id === h.stage)?.label} (${new Date(h.at).toLocaleDateString('pt-BR')})`)
              .join(' → ')}
          </div>
        )}
        {error && (
          <p role="alert" className="rounded-2xl bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
            {error}
          </p>
        )}
        <Footer
          onCancel={onClose}
          submitLabel="Salvar projeto"
          left={
            initial && onDelete ? (
              <button type="button" onClick={onDelete} className="rounded-full px-3 py-2 text-xs text-rose-300 hover:bg-rose-500/10">
                Excluir
              </button>
            ) : undefined
          }
        />
      </form>
    </Modal>
  );
};

/* ------------------------------------------------------------------ */
/* Despesa                                                              */
/* ------------------------------------------------------------------ */

export const ExpenseModal: React.FC<{ initial?: Expense; clients: ClientOption[]; onClose: () => void; onSaved: (e: Expense) => void; onDelete?: () => void }> = ({
  initial,
  clients,
  onClose,
  onSaved,
  onDelete
}) => {
  const [description, setDescription] = useState(initial?.description ?? '');
  const [category, setCategory] = useState<Expense['category']>(initial?.category ?? 'ferramentas');
  const [amount, setAmount] = useState<number | null>(initial?.amountCents ?? null);
  const [date, setDate] = useState(initial?.date ?? todayBR());
  const [paid, setPaid] = useState(initial?.paid ?? false);
  const [recurring, setRecurring] = useState(initial?.recurring ?? false);
  const [clientId, setClientId] = useState(initial?.clientId ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return setError('Informe o valor.');
    try {
      onSaved(
        storageService.finance.expenses.save({
          id: initial?.id,
          description,
          category,
          amountCents: amount,
          date,
          paid,
          paidAt: paid ? (initial?.paid ? initial.paidAt ?? date : date <= todayBR() ? date : todayBR()) : undefined,
          recurring,
          clientId: clientId || undefined,
          notes: notes.trim() || undefined
        })
      );
    } catch (err) {
      setError(firstIssue(err));
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={initial ? 'Editar despesa' : 'Nova despesa'} maxWidth="lg">
      <form onSubmit={submit} noValidate className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="exp-desc" label="Descrição">
            <input id="exp-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex.: Canva Pro, editor freelancer" className={FIELD} />
          </Field>
          <Field id="exp-cat" label="Categoria">
            <select id="exp-cat" value={category} onChange={(e) => setCategory(e.target.value as Expense['category'])} className={FIELD}>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field id="exp-amount" label="Valor">
            <MoneyInput id="exp-amount" cents={amount} onChange={setAmount} />
          </Field>
          <Field id="exp-date" label="Vencimento">
            <input id="exp-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`${FIELD} [color-scheme:dark]`} />
          </Field>
          <Field id="exp-client" label="Cliente (opcional)" hint="Custo ligado a um cliente.">
            <select id="exp-client" value={clientId} onChange={(e) => setClientId(e.target.value)} className={FIELD}>
              <option value="">Agência (geral)</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="flex flex-wrap gap-6 text-sm text-neutral-300">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} className="h-4 w-4 accent-amber-500" /> Já foi paga
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} className="h-4 w-4 accent-amber-500" /> Repete todo mês
          </label>
        </div>
        <Field id="exp-notes" label="Observações">
          <input id="exp-notes" value={notes} onChange={(e) => setNotes(e.target.value)} className={FIELD} />
        </Field>
        {error && (
          <p role="alert" className="rounded-2xl bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
            {error}
          </p>
        )}
        <Footer
          onCancel={onClose}
          submitLabel="Salvar despesa"
          left={
            initial && onDelete ? (
              <button type="button" onClick={onDelete} className="rounded-full px-3 py-2 text-xs text-rose-300 hover:bg-rose-500/10">
                Excluir
              </button>
            ) : undefined
          }
        />
      </form>
    </Modal>
  );
};
