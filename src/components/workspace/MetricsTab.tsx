import { formatDateTimeBR } from '../../utils/dates';
import React, { useMemo, useRef, useState } from 'react';
import { CheckCircle2, Circle, Download, ExternalLink, FileUp, Info, Loader2, UserPlus } from 'lucide-react';
import type { AccountSnapshot, Client, Content } from '../../types';
import { storageService } from '../../services/storageService';
import { notificationService } from '../../services/notificationService';
import {
  buildPreview,
  FIELD_LABELS,
  importPosts,
  TEMPLATE_CSV,
  type ColumnMapping,
  type ImportField,
  type ImportPreview
} from '../../services/metricsImport';
import { formatMetric, isMetric } from '../../utils/metrics';
import type { WorkspaceSubTab } from './WorkspaceHeader';

interface MetricsTabProps {
  client: Client;
  contents: Content[];
  snapshots: AccountSnapshot[];
  hasDiagnostic: boolean;
  ideasCount: number;
  calendarCount: number;
  onRefresh: () => void;
  onNavigateTab: (tab: WorkspaceSubTab) => void;
}

const DAY_MS = 24 * 60 * 60 * 1000;

const META_STEPS: Array<{ title: string; detail: string }> = [
  {
    title: 'Abra o Meta Business Suite',
    detail: 'Acesse business.facebook.com com a conta do Facebook que administra a Página e o Instagram do cliente.'
  },
  {
    title: 'Escolha a conta do cliente',
    detail: 'No canto superior esquerdo, clique no nome da conta e selecione a Página/Instagram do cliente (se você gerencia mais de uma).'
  },
  {
    title: 'Entre em Insights',
    detail: 'No menu lateral, clique em "Insights" (em algumas contas aparece como "Estatísticas"). Se não aparecer, clique em "Todas as ferramentas" e procure por Insights.'
  },
  {
    title: 'Abra a aba Conteúdo',
    detail: 'Dentro de Insights, clique em "Conteúdo". Selecione a plataforma "Instagram" e o período (recomendado: últimos 90 dias).'
  },
  {
    title: 'Exporte os dados',
    detail: 'Clique em "Exportar dados" (canto superior direito). Escolha exportar as publicações/conteúdo em formato CSV e confirme em "Gerar" ou "Exportar".'
  },
  {
    title: 'Importe aqui',
    detail: 'O arquivo .csv vai para a pasta Downloads. Volte a esta tela e clique em "Selecionar arquivo CSV" logo abaixo.'
  }
];

function daysAgo(iso: string | null): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / DAY_MS);
}

export const MetricsTab: React.FC<MetricsTabProps> = ({ client, contents, snapshots, hasDiagnostic, ideasCount, calendarCount, onRefresh, onNavigateTab }) => {
  const fileInput = useRef<HTMLInputElement>(null);
  const [sourceText, setSourceText] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping | undefined>(undefined);
  const [pasted, setPasted] = useState('');
  const [importing, setImporting] = useState(false);
  const [followersDate, setFollowersDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [followersValue, setFollowersValue] = useState('');

  const preview: ImportPreview | null = useMemo(() => (sourceText ? buildPreview(sourceText, mapping) : null), [sourceText, mapping]);

  const followerSnapshots = snapshots.filter((s) => isMetric(s.followers)).sort((a, b) => a.date.localeCompare(b.date));
  const latestFollowers = followerSnapshots.at(-1) ?? null;
  const lastUpdate = [
    ...contents.map((c) => c.updatedAt ?? c.createdAt ?? null),
    ...snapshots.map((s) => s.sourceTimestamp)
  ]
    .filter((v): v is string => Boolean(v))
    .sort()
    .at(-1) ?? null;
  const staleDays = daysAgo(lastUpdate);

  const checklist = [
    { label: 'Cadastro com público e pilares', done: Boolean(client.targetAudience && client.pillars.length > 0), hint: 'Edite o cliente e preencha público-alvo e pilares.' },
    { label: 'Posts e métricas importados', done: contents.length > 0, hint: 'Importe o CSV do Meta Business Suite abaixo.' },
    { label: 'Seguidores registrados', done: followerSnapshots.length > 0, hint: 'Registre o número de seguidores abaixo.' },
    { label: 'Análise completa feita', done: hasDiagnostic, hint: 'Use "Gerar análise completa".', tab: 'diagnostic' as WorkspaceSubTab },
    { label: 'Ideias no banco', done: ideasCount > 0, hint: 'Gere ideias pelo prompt.', tab: 'ideas' as WorkspaceSubTab },
    { label: 'Calendário da semana', done: calendarCount > 0, hint: 'Monte o calendário editorial.', tab: 'calendar' as WorkspaceSubTab },
    { label: 'Métricas atualizadas nos últimos 7 dias', done: staleDays !== null && staleDays <= 7, hint: 'Rotina semanal: reimporte o CSV e registre os seguidores.' }
  ];
  const doneCount = checklist.filter((c) => c.done).length;

  const loadText = (text: string, name: string | null) => {
    setMapping(undefined);
    setSourceText(text);
    setFileName(name);
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      notificationService.showToast('Arquivo muito grande (máximo 5 MB).', 'error');
      return;
    }
    loadText(await file.text(), file.name);
  };

  const handleImport = () => {
    if (!preview || preview.posts.length === 0) return;
    setImporting(true);
    try {
      const { created, updated } = importPosts(client, preview.posts);
      notificationService.showToast(`${created} post(s) novo(s) e ${updated} atualizado(s).`, 'success');
      setSourceText(null);
      setFileName(null);
      setPasted('');
      onRefresh();
    } catch {
      notificationService.showToast('Não foi possível importar. Confira o arquivo.', 'error');
    } finally {
      setImporting(false);
    }
  };

  const handleSaveFollowers = (e: React.FormEvent) => {
    e.preventDefault();
    const value = Number(followersValue.replace(/\D/g, ''));
    if (!followersValue.trim() || !Number.isFinite(value)) return;
    const existing = storageService.history.getByClient(client.id).find((s) => s.date === followersDate);
    storageService.history.saveSnapshot({
      clientId: client.id,
      date: followersDate,
      followers: value,
      reach: existing?.reach ?? null,
      views: existing?.views ?? null,
      likes: existing?.likes ?? null,
      comments: existing?.comments ?? null,
      shares: existing?.shares ?? null,
      saves: existing?.saves ?? null,
      profileVisits: existing?.profileVisits ?? null,
      websiteClicks: existing?.websiteClicks ?? null,
      postsPublished: existing?.postsPublished ?? null,
      engagementRate: existing?.engagementRate ?? null,
      source: 'MANUAL',
      sourceTimestamp: new Date().toISOString()
    });
    setFollowersValue('');
    notificationService.showToast('Seguidores registrados.', 'success');
    onRefresh();
  };

  const downloadTemplate = () => {
    const blob = new Blob(['﻿' + TEMPLATE_CSV], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'planilha-modelo-metricas.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Resumo + frescor dos dados */}
      <section className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-neutral-100">Métricas de {client.name}</h3>
          <p className="text-sm text-neutral-400 mt-1">
            {contents.length} post(s) registrados · Seguidores: {latestFollowers ? `${formatMetric(latestFollowers.followers)} em ${new Date(`${latestFollowers.date}T12:00:00`).toLocaleDateString('pt-BR')}` : 'não registrado'}
          </p>
        </div>
        <span
          className={`text-sm px-3 py-1.5 rounded-lg border self-start md:self-center ${
            staleDays === null
              ? 'text-neutral-400 border-neutral-700'
              : staleDays <= 7
                ? 'text-emerald-300 border-emerald-500/30 bg-emerald-950/30'
                : 'text-amber-300 border-amber-500/30 bg-amber-950/30'
          }`}
        >
          {staleDays === null ? 'Nenhuma métrica registrada ainda' : staleDays === 0 ? 'Atualizado hoje' : `Última atualização há ${staleDays} dia(s)`}
        </span>
      </section>

      {/* Checklist do onboarding */}
      <section className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold text-neutral-100">Onboarding do cliente</h4>
          <span className="text-xs text-neutral-400">
            {doneCount} de {checklist.length} etapas
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-neutral-800 mb-4 overflow-hidden">
          <div className="h-full bg-amber-500 transition-all" style={{ width: `${(doneCount / checklist.length) * 100}%` }} />
        </div>
        <ul className="grid gap-2 sm:grid-cols-2">
          {checklist.map((item) => (
            <li key={item.label} className="flex items-start gap-2.5 text-sm">
              {item.done ? <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" /> : <Circle className="w-4 h-4 text-neutral-600 mt-0.5 shrink-0" />}
              <div>
                <span className={item.done ? 'text-neutral-300' : 'text-neutral-100'}>{item.label}</span>
                {!item.done && (
                  <div className="text-xs text-neutral-500">
                    {item.hint}{' '}
                    {item.tab && (
                      <button onClick={() => onNavigateTab(item.tab as WorkspaceSubTab)} className="text-amber-400 hover:text-amber-300">
                        Abrir
                      </button>
                    )}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Passo a passo Meta Business Suite */}
      <details className="group bg-neutral-900/60 border border-neutral-800 rounded-2xl p-5" open={contents.length === 0}>
        <summary className="cursor-pointer list-none flex items-center justify-between gap-3">
          <span className="text-sm font-semibold text-neutral-100">Como exportar as métricas do Meta Business Suite</span>
          <span className="text-xs text-neutral-500 group-open:hidden">Mostrar passo a passo</span>
          <span className="text-xs text-neutral-500 hidden group-open:inline">Ocultar</span>
        </summary>
        <ol className="mt-4 space-y-3">
          {META_STEPS.map((step, i) => (
            <li key={step.title} className="flex gap-3 text-sm">
              <span className="w-6 h-6 rounded-full bg-amber-500/15 text-amber-300 text-xs font-semibold flex items-center justify-center shrink-0">{i + 1}</span>
              <div>
                <div className="font-medium text-neutral-100">{step.title}</div>
                <div className="text-neutral-400">{step.detail}</div>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <a
            href="https://business.facebook.com/latest/insights/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-neutral-700 text-neutral-200 hover:bg-neutral-800 text-sm"
          >
            Abrir Meta Business Suite <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
        <p className="mt-4 text-xs text-neutral-500 flex gap-2">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          Requisitos: Instagram profissional (Empresa ou Criador) conectado a uma Página, e você com acesso a ela. Se não tiver acesso, peça ao cliente para exportar e te enviar o arquivo. Os nomes dos menus podem mudar um pouco conforme a atualização da Meta.
        </p>
      </details>

      {/* Importação */}
      <section className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-5 space-y-4">
        <div>
          <h4 className="text-sm font-semibold text-neutral-100">Importar posts e métricas</h4>
          <p className="text-sm text-neutral-400 mt-1">Arquivo CSV do Meta Business Suite, da planilha-modelo, ou linhas copiadas do Excel/Google Sheets.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input ref={fileInput} type="file" accept=".csv,text/csv,text/plain" className="hidden" onChange={(e) => {
              const file = e.target.files?.[0];
              // Limpa o valor para permitir selecionar o mesmo arquivo de novo (rotina semanal).
              e.target.value = '';
              void handleFile(file);
            }}
          />
          <button onClick={() => fileInput.current?.click()} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 text-sm font-semibold">
            <FileUp className="w-4 h-4" /> Selecionar arquivo CSV
          </button>
          <button onClick={downloadTemplate} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-neutral-700 text-neutral-300 hover:bg-neutral-800 text-sm">
            <Download className="w-4 h-4" /> Baixar planilha-modelo
          </button>
        </div>

        {!preview && (
          <div className="space-y-2">
            <label htmlFor="metrics-paste" className="block text-xs text-neutral-400">
              Ou cole as linhas aqui (com a linha de cabeçalho)
            </label>
            <textarea
              id="metrics-paste"
              rows={4}
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              placeholder={'Data\tLink\tVisualizações\tAlcance\tCurtidas...'}
              className="w-full rounded-xl bg-neutral-950 border border-neutral-800 focus:border-amber-500 outline-none p-3 text-xs text-neutral-200 font-mono placeholder:text-neutral-600"
            />
            <button
              onClick={() => loadText(pasted, null)}
              disabled={!pasted.trim()}
              className="px-4 py-2 rounded-lg border border-neutral-700 text-neutral-200 hover:bg-neutral-800 text-sm disabled:opacity-40"
            >
              Ler dados colados
            </button>
          </div>
        )}

        {preview && (
          <div className="space-y-4">
            <div className="text-sm text-neutral-300">
              {fileName ? <span className="font-medium">{fileName}: </span> : null}
              {preview.posts.length} post(s) encontrados{preview.skipped ? `, ${preview.skipped} linha(s) ignorada(s)` : ''}.
            </div>
            {preview.warnings.map((w) => (
              <p key={w} className="text-sm text-amber-200 bg-amber-950/30 border border-amber-500/20 rounded-lg px-3 py-2">
                {w}
              </p>
            ))}

            <div>
              <div className="text-xs text-neutral-500 mb-2">Colunas reconhecidas (ajuste se necessário):</div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {(Object.keys(FIELD_LABELS) as ImportField[]).map((field) => (
                  <label key={field} className="flex items-center justify-between gap-2 text-xs bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1.5">
                    <span className="text-neutral-400">{FIELD_LABELS[field]}</span>
                    <select
                      value={preview.mapping[field] ?? ''}
                      onChange={(e) => {
                        const next = { ...preview.mapping };
                        if (e.target.value === '') delete next[field];
                        else next[field] = Number(e.target.value);
                        setMapping(next);
                      }}
                      className="bg-neutral-900 border border-neutral-700 rounded px-1.5 py-1 text-neutral-200 max-w-[55%]"
                    >
                      <option value="">(não usar)</option>
                      {preview.headers.map((h, i) => (
                        <option key={`${h}-${i}`} value={i}>
                          {h || `Coluna ${i + 1}`}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            </div>

            {preview.posts.length > 0 && (
              <div className="overflow-x-auto border border-neutral-800 rounded-xl">
                <table className="w-full text-xs">
                  <thead className="text-neutral-500 bg-neutral-950">
                    <tr>
                      {['Data', 'Formato', 'Legenda', 'Views', 'Alcance', 'Curtidas', 'Coment.', 'Salvos', 'Compart.'].map((h) => (
                        <th key={h} className="text-left font-medium px-3 py-2 whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800 text-neutral-300">
                    {preview.posts.slice(0, 8).map((p) => (
                      <tr key={p.key}>
                        <td className="px-3 py-2 whitespace-nowrap">{p.publishedAt ? formatDateTimeBR(p.publishedAt) : 'n/d'}</td>
                        <td className="px-3 py-2">{p.format}</td>
                        <td className="px-3 py-2 max-w-[220px] truncate">{p.caption || '(sem legenda)'}</td>
                        {[p.views, p.reach, p.likes, p.comments, p.saves, p.shares].map((v, i) => (
                          <td key={i} className="px-3 py-2 tabular-nums">
                            {formatMetric(v)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {preview.posts.length > 8 && <div className="px-3 py-2 text-xs text-neutral-500">e mais {preview.posts.length - 8} post(s)...</div>}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setSourceText(null);
                  setFileName(null);
                }}
                className="px-4 py-2 rounded-lg border border-neutral-700 text-neutral-300 hover:bg-neutral-800 text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleImport}
                disabled={importing || preview.posts.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 text-sm font-semibold disabled:opacity-50"
              >
                {importing && <Loader2 className="w-4 h-4 animate-spin" />}
                Importar {preview.posts.length} post(s)
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Seguidores */}
      <section className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-5 space-y-4">
        <div>
          <h4 className="text-sm font-semibold text-neutral-100">Registrar seguidores</h4>
          <p className="text-sm text-neutral-400 mt-1">
            Veja o número no perfil do Instagram ou em Meta Business Suite → Insights → Público. Registre uma vez por semana para acompanhar o crescimento.
          </p>
        </div>
        <form onSubmit={handleSaveFollowers} className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label htmlFor="followers-date" className="block text-xs text-neutral-400">
              Data
            </label>
            <input
              id="followers-date"
              type="date"
              value={followersDate}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setFollowersDate(e.target.value)}
              className="rounded-lg bg-neutral-950 border border-neutral-800 px-3 py-2 text-sm text-neutral-200"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="followers-value" className="block text-xs text-neutral-400">
              Seguidores
            </label>
            <input
              id="followers-value"
              inputMode="numeric"
              value={followersValue}
              onChange={(e) => setFollowersValue(e.target.value)}
              placeholder="Ex.: 12.480"
              className="rounded-lg bg-neutral-950 border border-neutral-800 focus:border-amber-500 outline-none px-3 py-2 text-sm text-neutral-200 w-40"
            />
          </div>
          <button type="submit" disabled={!followersValue.trim()} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 text-sm font-semibold disabled:opacity-40">
            <UserPlus className="w-4 h-4" /> Registrar
          </button>
        </form>
        {followerSnapshots.length > 0 && (
          <div className="flex flex-wrap gap-2 text-xs">
            {followerSnapshots.slice(-6).reverse().map((s) => (
              <span key={s.id} className="px-2.5 py-1 rounded-md bg-neutral-950 border border-neutral-800 text-neutral-300">
                {new Date(`${s.date}T12:00:00`).toLocaleDateString('pt-BR')}: <strong className="text-neutral-100">{formatMetric(s.followers)}</strong>
              </span>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
