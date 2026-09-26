# Gabriel Speratti | Social Intelligence

Sistema interno da agência para inteligência de conteúdo no Instagram: métricas reais via Meta Graph API, diagnóstico e ideias com IA, pesquisa de público, concorrentes, calendário e relatórios.

## Métricas sem API (aba Métricas)

Cada cliente tem a aba **Métricas** com:
- checklist de onboarding (cadastro, posts, seguidores, análise, ideias, calendário, rotina semanal de 7 dias);
- passo a passo para exportar o CSV em **Meta Business Suite → Insights → Conteúdo → Exportar dados**;
- importação do CSV (português ou inglês, `,` `;` ou tab), prévia e ajuste de colunas; reimportar atualiza sem duplicar;
- planilha-modelo e colagem direta do Excel/Google Sheets;
- registro semanal de seguidores.

Código: `src/services/metricsImport.ts` e `src/components/workspace/MetricsTab.tsx`. Células vazias viram `n/d` (nunca 0).

## Piloto da Semana

Botão **Piloto da semana** no dashboard (ou "Planejar a próxima semana" com um cliente selecionado):
1. Calcula os **padrões vencedores** do cliente com os posts importados (últimos 90 dias): melhor dia, faixa de horário, formato campeão e ritmo. Amostra pequena é sinalizada; CSV sem horário não gera "melhor horário".
2. Gera o prompt da semana (padrões + melhores posts + banco de ideias + público) para colar em qualquer IA.
3. A resposta é validada e revisada; os posts escolhidos viram itens no **Calendário** e tarefas de produção em **Minhas tarefas** (prazo na véspera, checklist do formato, roteiro e legenda nas notas).

Código: `src/services/winningPatterns.ts`, `src/ai/weeklyPilot.ts`, `src/components/pilot/WeeklyPilotModal.tsx`.

## Backup

Configurações → **Backup dos dados**: baixa um `.json` com tudo que fica no navegador (posts, métricas, ideias, calendário, tarefas, diagnósticos, relatórios) e restaura em qualquer computador. O dashboard avisa quando o último backup tem mais de 7 dias.

Código: `src/services/backupService.ts`.

## Dashboard: resumo por cliente e Minhas tarefas

- Seletor no topo do dashboard: **Todos os clientes** ou um cliente específico (todo o resumo passa a mostrar só ele).
- Alternância **Resumo | Tarefas**. Tarefas é um CRM de entregas em quadro: A fazer, Em produção, Aprovação do cliente, Aprovado, Entregue.
  Cada tarefa tem cliente (ou "Geral"), tipo, prazo, prioridade, notas e checklist; arrastar entre colunas, seta para avançar, visão em lista, filtros (atrasadas, hoje, 7 dias, prioridade alta) e busca.
- As tarefas ficam no armazenamento local do navegador, como ideias e calendário. Excluir um cliente exclui as tarefas dele.

Código: `src/components/agency/`, `src/components/tasks/`, `src/services/dashboardInsights.ts`, `src/services/taskInsights.ts`.

## IA sem chave de API (fluxo manual)

Diagnóstico ("Gerar análise completa") e Banco de Ideias ("Gerar prompt de ideias") funcionam assim:
1. O sistema monta um prompt completo com os dados reais do cliente (cadastro, métricas, posts, concorrentes, público).
2. Você copia e cola em qualquer IA (ChatGPT, Gemini, Claude).
3. Cola a resposta de volta no sistema; ela é validada e salva.

Código: `src/ai/manualPrompts.ts` e `src/components/common/ManualAiModal.tsx`. As rotas `/api/ai/*` com Gemini continuam no backend como opção, mas a interface não depende delas.

Produção: https://saas-agencia-speratti.vercel.app

## Arquitetura

```
React (Vite, /src) ──fetch same-origin──▶ Vercel Functions (/api/*.ts)
                                              │
                                              ▼
                             server/ (serviços, repositórios, providers)
                               │            │              │
                        PostgreSQL     Meta Graph API    Gemini
                        (Supabase)     (InstagramProvider) (geminiService)
```

- **`/api`**: uma Vercel Function por arquivo (assinatura Web `Request -> Response`). Só valida, autentica, chama serviços e responde.
- **`server/`**: regras de negócio. `config/env.ts` (variáveis), `http/` (wrapper com requestId, headers de segurança, CSRF same-origin, rate limit, erros), `db/database.ts` (pool singleton serverless), `security/crypto.ts` (AES-256-GCM, scrypt, HMAC), `auth/session.ts` (cookie HttpOnly assinado), `repositories/*`, `providers/InstagramProvider.ts`, `services/*`.
- **`server.ts`**: servidor de **desenvolvimento local** que monta os mesmos handlers de `/api` + Vite. Não é usado na Vercel.
- **Frontend**: dados de trabalho (ideias, calendário, relatórios) continuam no armazenamento local (IndexedDB/localStorage) pela abstração `storageService`; clientes, conexões Instagram, conteúdos sincronizados, snapshots e logs vivem no PostgreSQL.
- **Demo**: `src/demo/` + `DemoProvider`. Dados fictícios, rotulados como tal e nunca misturados com clientes de produção.

## Rotas da API

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/status` | Health check (sem secrets) |
| GET/POST/DELETE | `/api/session` | Sessão atual / login / logout |
| GET/POST/DELETE | `/api/clients` | Clientes da agência (isolados por `agency_id`) |
| GET | `/api/auth/instagram/start?clientId=` | Inicia OAuth (`&mode=json` devolve a URL) |
| GET | `/api/auth/instagram/callback` | Callback OAuth (destino do `META_REDIRECT_URI`) |
| GET/DELETE | `/api/instagram/connection?clientId=` | Estado real da conexão / desconectar |
| POST | `/api/instagram/sync` | Sincroniza mídia e métricas (idempotente) |
| GET | `/api/instagram/sync?clientId=` | Conteúdos, snapshots e logs persistidos |
| POST | `/api/ai/analyze-profile` | Diagnóstico (Gemini) |
| POST | `/api/ai/generate-ideas` | Ideias (Gemini) |
| POST | `/api/ai/classify-content` | Classificação (Gemini) |
| POST | `/api/research` | Pesquisa de público/concorrentes (SerpAPI, opcional) |

Erros seguem sempre `{ "ok": false, "error": { "code", "message", "requestId" } }`.

## Variáveis de ambiente

Veja `.env.example`. Obrigatórias em produção:

| Variável | Uso |
|---|---|
| `DATABASE_URL` | PostgreSQL do Supabase (pooler, porta 6543) |
| `SESSION_SECRET` | ≥ 32 caracteres; assina a sessão e deriva a chave de criptografia dos tokens |
| `META_APP_ID`, `META_APP_SECRET` | App da Meta |
| `META_REDIRECT_URI` | `https://saas-agencia-speratti.vercel.app/api/auth/instagram/callback` |

Opcionais: `GEMINI_API_KEY`/`GEMINI_MODEL` (só para as rotas `/api/ai/*`), `ADMIN_EMAIL`/`ADMIN_PASSWORD` (primeiro usuário), `TOKEN_ENCRYPTION_KEY`, `META_GRAPH_VERSION`, `SERPAPI_KEY`, `DATABASE_SSL`.

> Trocar `SESSION_SECRET` invalida sessões e torna ilegíveis os tokens já salvos (será preciso reconectar o Instagram), a menos que `TOKEN_ENCRYPTION_KEY` esteja definida.

## Configuração

### Supabase
1. Use a connection string **Transaction pooler** (Project Settings > Database) em `DATABASE_URL`.
2. Aplique o schema: `DATABASE_URL=... npm run db:migrate` (ou cole `db/migrations/001_initial_schema.sql` no SQL Editor). É idempotente.
3. As tabelas têm RLS habilitado sem policies: a API REST pública do Supabase não acessa nada; só o backend (dono das tabelas).

### Primeiro usuário
- `DATABASE_URL=... npm run user:create -- --email voce@agencia.com --name "Seu Nome" --password "senha-forte"`, **ou**
- defina `ADMIN_EMAIL` e `ADMIN_PASSWORD` na Vercel e faça login uma vez (só funciona com o banco sem usuários). Depois remova as variáveis.

### Meta Developers
1. App do tipo Business com o produto **Facebook Login for Business**.
2. Em *Valid OAuth Redirect URIs*: `https://saas-agencia-speratti.vercel.app/api/auth/instagram/callback` (exatamente, sem barra final).
3. Permissões: `instagram_basic`, `instagram_manage_insights`, `pages_show_list`, `pages_read_engagement`, `business_management`.
4. A conta Instagram precisa ser profissional e vinculada a uma Página do Facebook.

## Desenvolvimento

```bash
npm install
cp .env.example .env      # preencha
npm run db:migrate
npm run dev               # http://localhost:3000 (Vite + /api)
npm run lint              # TypeScript strict
npm test                  # Vitest (testes de banco usam TEST_DATABASE_URL ou postgres local)
npm run build             # build de produção (dist/)
npm run preview           # build + servidor local servindo dist/ e /api
```

Localmente use `META_REDIRECT_URI=http://localhost:3000/api/auth/instagram/callback` (cadastrado também na Meta, se quiser testar OAuth local).

## Segurança

- Tokens OAuth só no backend, criptografados (AES-256-GCM); o navegador recebe apenas status.
- OAuth `state` aleatório (32 bytes), salvo como hash, expira em 10 min, uso único (atômico).
- Sessão por cookie `HttpOnly; SameSite=Lax; Secure`; senhas com scrypt.
- CSRF: requisições com efeito colateral exigem mesma origem.
- Headers de segurança e CSP (`vercel.json` para o site, wrapper HTTP para a API).
- Logs estruturados com redação de tokens, secrets e connection strings.
- Métricas indisponíveis são `null` (exibidas como "n/d"), nunca 0 inventado.
