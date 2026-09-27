import React, { useEffect, useState } from 'react';
import { Check, ClipboardCopy, ClipboardPaste, ExternalLink, Loader2 } from 'lucide-react';
import { Modal } from './Modal';

interface ManualAiModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  prompt: string;
  /** Recebe a resposta colada. Deve lançar Error com mensagem amigável se estiver inválida. */
  onImport: (response: string) => void | Promise<void>;
  importLabel?: string;
}

const AI_LINKS = [
  { label: 'ChatGPT', url: 'https://chatgpt.com/' },
  { label: 'Gemini', url: 'https://gemini.google.com/app' },
  { label: 'Claude', url: 'https://claude.ai/new' }
];

/**
 * Fluxo de IA manual em 3 passos: copiar o prompt, usar em qualquer IA, colar a resposta.
 */
export const ManualAiModal: React.FC<ManualAiModalProps> = ({ isOpen, onClose, title, prompt, onImport, importLabel = 'Importar resposta' }) => {
  const [copied, setCopied] = useState(false);
  const [response, setResponse] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCopied(false);
      setResponse('');
      setError(null);
      setImporting(false);
    }
  }, [isOpen]);

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
    } catch {
      // Fallback para navegadores sem permissão de clipboard.
      const area = document.createElement('textarea');
      area.value = prompt;
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      area.remove();
    }
    setCopied(true);
  };

  const handleImport = async () => {
    setError(null);
    setImporting(true);
    try {
      await onImport(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível importar a resposta.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} subtitle="Use a IA que preferir. Nenhuma chave de API é necessária." maxWidth="2xl">
      <div className="space-y-6 text-sm">
        <section className="space-y-2.5">
          <div className="flex items-center justify-between gap-3">
            <h4 className="font-semibold text-neutral-100">1. Copie o prompt</h4>
            <span className="text-xs text-neutral-500">{prompt.length.toLocaleString('pt-BR')} caracteres</span>
          </div>
          <textarea
            readOnly
            value={prompt}
            rows={7}
            className="w-full rounded-2xl bg-white/[0.03] border border-white/[0.06] p-3 text-xs text-neutral-300 tabular-nums leading-relaxed resize-y"
            aria-label="Prompt gerado"
          />
          <button
            onClick={copyPrompt}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-neutral-950 font-semibold transition"
          >
            {copied ? <Check className="w-4 h-4" /> : <ClipboardCopy className="w-4 h-4" />}
            {copied ? 'Prompt copiado' : 'Copiar prompt'}
          </button>
        </section>

        <section className="space-y-2">
          <h4 className="font-semibold text-neutral-100">2. Cole numa IA e envie</h4>
          <div className="flex flex-wrap gap-2">
            {AI_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/[0.1] text-neutral-300 hover:bg-white/[0.07] transition"
              >
                {link.label}
                <ExternalLink className="w-3.5 h-3.5 text-neutral-500" />
              </a>
            ))}
          </div>
          <p className="text-xs text-neutral-500">A IA vai responder com um bloco de código (JSON). Copie a resposta inteira.</p>
        </section>

        <section className="space-y-2.5">
          <h4 className="font-semibold text-neutral-100">3. Cole a resposta aqui</h4>
          <textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            rows={7}
            placeholder="Cole aqui a resposta completa da IA..."
            className="w-full rounded-2xl bg-white/[0.04] border border-white/[0.06] focus:border-amber-500 outline-none p-3 text-xs text-neutral-200 tabular-nums leading-relaxed resize-y placeholder:text-neutral-600"
            aria-label="Resposta da IA"
          />
          {error && (
            <p role="alert" className="text-sm text-rose-300 bg-rose-950/30 border border-rose-500/20 rounded-2xl px-3 py-2">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={onClose} className="px-4 py-2 rounded-full border border-white/[0.1] text-neutral-300 hover:bg-white/[0.07] transition">
              Cancelar
            </button>
            <button
              onClick={handleImport}
              disabled={!response.trim() || importing}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-neutral-950 font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardPaste className="w-4 h-4" />}
              {importLabel}
            </button>
          </div>
        </section>
      </div>
    </Modal>
  );
};
