import React, { useEffect, useRef, useState } from 'react';
import { backupStats, daysSinceBackup, downloadBackup, parseBackup, restoreBackup } from '../../services/backupService';
import { AppSettings } from '../../types';
import { storageService } from '../../services/storageService';
import { notificationService } from '../../services/notificationService';
import { Modal } from '../common/Modal';
import { sessionService, type BackendStatus } from '../../services/sessionService';
import { syncService } from '../../services/sync/syncService';
import { installPrompt } from '../../services/installPrompt';
import {
  CheckCircle2,
  CircleAlert,
  CircleDashed,
  Download,
  MonitorDown,
  Upload
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResetAllData: () => void;
  onSeedDemoData: () => void;
  isDemoLoaded: boolean;
  /** Chamado depois de restaurar um backup (recarregar a interface). */
  onRestored?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onResetAllData,
  onSeedDemoData,
  isDemoLoaded,
  onRestored
}) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [backupDays, setBackupDays] = useState<number | null>(() => daysSinceBackup());

  const handleDownload = () => {
    const file = downloadBackup();
    setBackupDays(0);
    notificationService.showToast(`Backup baixado (${backupStats(file).total} registros).`, 'success');
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try {
      const file = parseBackup(await f.text());
      const { total } = backupStats(file);
      const when = new Date(file.exportedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' });
      if (!window.confirm(`Restaurar o backup de ${when} (${total} registros)? Os dados atuais deste navegador serão substituídos.`)) return;
      restoreBackup(file);
      notificationService.showToast('Backup restaurado.', 'success');
      onRestored?.();
      onClose();
    } catch (err) {
      notificationService.showToast(err instanceof Error ? err.message : 'Não foi possível ler o backup.', 'error');
    }
  };
  const [settings, setSettings] = useState<AppSettings>(storageService.settings.get());

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    storageService.settings.update(settings);
    notificationService.showToast('Configurações salvas.', 'success');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Configurações da Agência"
      subtitle="Parâmetros globais do sistema Gabriel Speratti Social Intelligence"
      maxWidth="lg"
    >
      <form onSubmit={handleSave} className="space-y-5 text-xs tabular-nums">
        {/* Identificação da Agência */}
        <div className="space-y-3">
          <div className="text-[11px] text-amber-400 font-semibold border-b border-white/[0.06] pb-1">
            01. Identidade da Agência
          </div>

          <div>
            <label htmlFor="settings-agency" className="block text-neutral-400 mb-1">Nome da Agência</label>
            <input
              id="settings-agency"
              type="text"
              value={settings.agencyName}
              onChange={(e) => setSettings({ ...settings, agencyName: e.target.value })}
              className="w-full bg-white/[0.04] border border-white/[0.06] focus:border-amber-500 rounded-2xl p-2 text-neutral-100 font-bold"
            />
          </div>

          <div>
            <label htmlFor="settings-owner" className="block text-neutral-400 mb-1">Estrategista Responsável</label>
            <input
              id="settings-owner"
              type="text"
              value={settings.ownerName}
              onChange={(e) => setSettings({ ...settings, ownerName: e.target.value })}
              className="w-full bg-white/[0.04] border border-white/[0.06] focus:border-amber-500 rounded-2xl p-2 text-neutral-100 font-bold"
            />
          </div>
        </div>

        {/* Integrações: estado real lido do servidor */}
        <div className="space-y-3">
          <div className="text-[11px] text-amber-400 font-semibold border-b border-white/[0.06] pb-1">
            02. Status das integrações
          </div>
          <IntegrationStatus />
        </div>

        {/* Aplicativo */}
        <div className="space-y-3">
          <div className="text-[11px] text-amber-400 font-semibold border-b border-white/[0.06] pb-1">
            03. Aplicativo e abrir ao ligar o computador
          </div>
          <AppInstallSection />
        </div>

        {/* Gerenciamento de Dados & Demo */}
        <div className="space-y-3">
          <div className="text-[11px] text-amber-400 font-semibold border-b border-white/[0.06] pb-1">
            04. Dados de Demonstração e Reset
          </div>

          <div className="flex items-center justify-between p-3 bg-white/[0.03] border border-white/[0.06] rounded-2xl">
            <div>
              <div className="text-neutral-200 font-semibold">Cliente de demonstração (Clínica Aurora)</div>
              <div className="text-[11px] text-neutral-500 mt-0.5">
                {isDemoLoaded ? 'Dados fictícios de demonstração ativos' : 'Carregar base completa de demonstração'}
              </div>
            </div>

            {isDemoLoaded ? (
              <button
                type="button"
                onClick={onResetAllData}
                className="px-3 py-1.5 bg-rose-950/40 border border-rose-500/30 text-rose-400 hover:bg-rose-900/50 rounded-full transition-colors text-[11px]"
              >
                Limpar Demo
              </button>
            ) : (
              <button
                type="button"
                onClick={onSeedDemoData}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-full transition-colors text-[11px]"
              >
                Ativar demonstração
              </button>
            )}
          </div>
        </div>

        {/* Backup */}
        <div className="space-y-3">
          <div className="text-[11px] text-amber-400 font-semibold border-b border-white/[0.06] pb-1">
            05. Backup dos dados
          </div>
          <p className="text-[11px] text-neutral-400 font-sans leading-relaxed">
            Com login, tudo (posts, métricas, ideias, calendário, tarefas, biblioteca, financeiro) fica salvo neste navegador e na nuvem.
            O backup é uma cópia extra em arquivo, para guardar fora do sistema.
          </p>
          <div className="flex flex-wrap items-center gap-2 font-sans">
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 rounded-full bg-amber-500 px-4 py-2 text-xs font-semibold text-neutral-950 hover:bg-amber-400"
            >
              <Download className="h-3.5 w-3.5" />
              Baixar backup
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-4 py-2 text-xs font-semibold text-neutral-200 hover:bg-white/[0.1]"
            >
              <Upload className="h-3.5 w-3.5" />
              Restaurar backup
            </button>
            <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" aria-label="Arquivo de backup" onChange={handleRestore} />
            <span className="text-[11px] text-neutral-500">
              {backupDays === null ? 'Nenhum backup feito neste navegador.' : backupDays === 0 ? 'Último backup: hoje.' : `Último backup: há ${backupDays} dia${backupDays > 1 ? 's' : ''}.`}
            </span>
          </div>
        </div>

        <div className="pt-3 border-t border-white/[0.06] flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white/[0.06] text-neutral-300 rounded-full hover:bg-white/[0.1]"
          >
            Fechar
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-amber-500 text-neutral-950 font-bold rounded-full hover:bg-amber-400"
          >
            Salvar Configurações
          </button>
        </div>
      </form>
    </Modal>
  );
};

const Row: React.FC<{ label: string; ok: boolean | null; value: string; hint?: string }> = ({ label, ok, value, hint }) => (
  <div className="p-3 bg-white/[0.03] border border-white/[0.06] rounded-2xl">
    <div className="flex items-center justify-between gap-3">
      <span className="text-neutral-300 font-medium">{label}</span>
      <span className={`flex items-center gap-1 text-right ${ok === true ? 'text-emerald-400' : ok === false ? 'text-amber-300' : 'text-neutral-400'}`}>
        {ok === true ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : ok === false ? <CircleAlert className="w-3.5 h-3.5 shrink-0" /> : <CircleDashed className="w-3.5 h-3.5 shrink-0" />}
        {value}
      </span>
    </div>
    {hint && <div className="mt-1 text-[11px] text-neutral-500 font-sans">{hint}</div>}
  </div>
);

/** Estado real das integrações (servidor + sincronização), sem nada inventado. */
const IntegrationStatus: React.FC = () => {
  const [status, setStatus] = useState<BackendStatus | null | undefined>(undefined);
  const sync = syncService.getStatus();
  useEffect(() => {
    let alive = true;
    sessionService.getStatus().then((st) => alive && setStatus(st));
    return () => {
      alive = false;
    };
  }, []);
  if (status === undefined) return <p className="text-[11px] text-neutral-500">Verificando o servidor...</p>;
  if (status === null) return <Row label="Servidor" ok={false} value="Sem resposta" hint="Verifique a conexão. Os dados continuam salvos neste navegador." />;
  const i = status.integrations;
  const syncLabel = { saved: 'Salvo', syncing: 'Sincronizando', pending: 'Salvando', offline: 'Offline', error: 'Erro', disabled: 'Desligada' }[sync.state];
  return (
    <div className="space-y-2">
      <Row label="Banco de dados" ok={i.database.reachable === true} value={i.database.reachable ? 'Conectado' : i.database.configured ? 'Sem conexão' : 'Não configurado'} />
      <Row
        label="Sincronização na nuvem"
        ok={sync.state === 'saved' ? true : sync.state === 'disabled' || sync.state === 'error' ? false : null}
        value={syncLabel}
        hint={sync.state === 'disabled' ? 'Ativa quando você entra com login (fora da demonstração).' : sync.message ?? undefined}
      />
      <Row label="Instagram (API oficial)" ok={i.instagram.configured} value={i.instagram.configured ? 'Configurada' : 'Não configurada'} hint={i.instagram.configured ? undefined : 'As métricas vêm do CSV do Meta Business Suite (aba Métricas).'} />
      <Row label="Inteligência artificial" ok={null} value={i.gemini.configured ? `Gemini configurado (${i.gemini.model ?? 'modelo padrão'})` : 'Fluxo manual'} hint="Diagnóstico, ideias e piloto usam o prompt para copiar e colar na IA de sua preferência." />
      <Row label="Pesquisa externa" ok={i.research.configured} value={i.research.configured ? 'Configurada' : 'Não configurada'} hint={i.research.configured ? undefined : 'Opcional (SERPAPI_KEY). Sem ela, cadastre concorrentes e insights manualmente.'} />
    </div>
  );
};

/** Instalar como aplicativo e abrir junto com o Windows. */
const AppInstallSection: React.FC = () => {
  const [, force] = useState(0);
  useEffect(() => installPrompt.subscribe(() => force((n) => n + 1)), []);
  const installed = installPrompt.isInstalled();
  return (
    <div className="p-3 bg-white/[0.03] border border-white/[0.06] rounded-2xl space-y-3 font-sans">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-neutral-200 font-medium text-xs">
          {installed ? 'Aberto como aplicativo instalado.' : 'Instale para abrir em janela própria, com ícone na barra de tarefas.'}
        </span>
        {installPrompt.canInstall() && (
          <button
            type="button"
            onClick={async () => {
              const ok = await installPrompt.install();
              notificationService.showToast(ok ? 'Aplicativo instalado.' : 'Instalação cancelada.', ok ? 'success' : 'info');
            }}
            className="inline-flex items-center gap-1.5 rounded-full bg-amber-500 px-4 py-2 text-xs font-semibold text-neutral-950 hover:bg-amber-400"
          >
            <MonitorDown className="h-3.5 w-3.5" /> Instalar aplicativo
          </button>
        )}
      </div>
      {!installed && !installPrompt.canInstall() && (
        <p className="text-[11px] text-neutral-500">No Chrome ou no Edge, use o ícone de instalar na barra de endereço (ou menu ⋮ → Transmitir, salvar e compartilhar → Instalar página como app).</p>
      )}
      <ol className="list-decimal space-y-1 pl-4 text-[11px] text-neutral-400">
        <li>Depois de instalar, aperte <kbd className="rounded bg-white/[0.08] px-1">Windows + R</kbd>, digite <code className="rounded bg-white/[0.08] px-1">shell:startup</code> e confirme.</li>
        <li>Na pasta que abrir, cole o atalho do aplicativo (copie o ícone "Speratti" da área de trabalho ou do menu Iniciar).</li>
        <li>Pronto: ao ligar o computador o sistema abre sozinho, no modo em que você parou (Agência ou Administração).</li>
        <li>No Edge também dá para marcar "Iniciar automaticamente ao entrar no dispositivo" em edge://apps.</li>
      </ol>
    </div>
  );
};
