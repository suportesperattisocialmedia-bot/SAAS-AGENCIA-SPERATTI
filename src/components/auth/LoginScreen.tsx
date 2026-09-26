import React, { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight, Eye, EyeOff, Loader2, LockKeyhole, PlayCircle } from 'lucide-react';
import { ASSETS } from '../../data/assets';
import type { BackendStatus } from '../../services/sessionService';

interface LoginScreenProps {
  status: BackendStatus | null;
  onLogin: (email: string, password: string) => Promise<void>;
  onExploreDemo: () => void;
}

function backendNotice(status: BackendStatus | null): string | null {
  if (!status) return 'Não foi possível contatar o servidor. Verifique sua conexão ou tente novamente em instantes.';
  const { database, session } = status.integrations;
  if (!database.configured) return 'Banco de dados não configurado no servidor (DATABASE_URL). O login ficará disponível após a configuração.';
  if (database.reachable === false) return 'O servidor não conseguiu acessar o banco de dados. Verifique a DATABASE_URL e o Supabase.';
  if (database.migrated === false) return 'O banco ainda não possui as tabelas do sistema. Execute as migrations (npm run db:migrate).';
  if (!session.configured) return 'SESSION_SECRET ausente ou curto demais no servidor (mínimo 32 caracteres).';
  return null;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ status, onLogin, onExploreDemo }) => {
  const reduceMotion = useReducedMotion();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const notice = backendNotice(status);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onLogin(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível entrar.');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-white/[0.03] text-neutral-100 grid lg:grid-cols-[1.1fr_1fr]">
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden border-r border-white/[0.04] p-12">
        <img
          src={ASSETS.agencyHero}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover grayscale contrast-125 opacity-35"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/70 to-neutral-950/30" />
        <div className="relative flex items-center gap-3">
          <img src={ASSETS.gabrielPortrait} alt="Gabriel Speratti" className="w-10 h-10 rounded-full object-cover border border-amber-500/40" />
          <span className="text-sm font-semibold tracking-tight">Gabriel Speratti</span>
        </div>
        <motion.div
          className="relative max-w-lg space-y-4"
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <h1 className="text-4xl xl:text-5xl font-bold tracking-tight leading-[1.05]">
            Estratégia de conteúdo guiada por dados reais.
          </h1>
          <p className="text-base text-neutral-300 leading-relaxed max-w-[46ch]">
            Métricas do Instagram, pesquisa de público e planejamento editorial de cada cliente em um só lugar.
          </p>
        </motion.div>
      </aside>

      <main className="flex items-center justify-center px-4 py-12 sm:px-8">
        <motion.div
          className="w-full max-w-sm space-y-8"
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="space-y-2">
            <div className="lg:hidden flex items-center gap-2.5 mb-6">
              <img src={ASSETS.gabrielPortrait} alt="Gabriel Speratti" className="w-9 h-9 rounded-full object-cover border border-amber-500/40" />
              <span className="text-sm font-semibold">Gabriel Speratti</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Entrar no Social Intelligence</h2>
            <p className="text-sm text-neutral-400">Acesso restrito à equipe da agência.</p>
          </div>

          {notice && (
            <div role="status" className="text-sm text-amber-200 bg-amber-950/30 border border-amber-500/25 rounded-2xl px-4 py-3 leading-relaxed">
              {notice}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-2">
              <label htmlFor="login-email" className="block text-sm font-medium text-neutral-300">
                E-mail
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-[24px] bg-[#161618] border border-white/[0.06] px-3.5 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-500 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
                placeholder="voce@agencia.com"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="login-password" className="block text-sm font-medium text-neutral-300">
                Senha
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-[24px] bg-[#161618] border border-white/[0.06] px-3.5 py-2.5 pr-11 text-sm text-neutral-100 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-neutral-500 hover:text-neutral-300 rounded-2xl"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p role="alert" className="text-sm text-rose-300">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting || !email || !password}
              className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-neutral-950 px-4 py-2.5 text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <LockKeyhole className="w-4 h-4" />}
              {submitting ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <div className="pt-6 border-t border-white/[0.04]">
            <button
              type="button"
              onClick={onExploreDemo}
              className="group w-full flex items-center justify-between gap-3 rounded-full border border-white/[0.06] hover:border-white/[0.14] hover:bg-white/[0.04] px-4 py-3 text-left transition"
            >
              <span className="flex items-center gap-3">
                <PlayCircle className="w-5 h-5 text-amber-400 shrink-0" />
                <span>
                  <span className="block text-sm font-medium text-neutral-200">Explorar a demonstração</span>
                  <span className="block text-xs text-neutral-500">Dados fictícios, sem acesso ao servidor</span>
                </span>
              </span>
              <ArrowRight className="w-4 h-4 text-neutral-500 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </motion.div>
      </main>
    </div>
  );
};
