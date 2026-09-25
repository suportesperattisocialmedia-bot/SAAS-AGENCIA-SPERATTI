# Gabriel Speratti | Social Intelligence

Sistema interno da agência para inteligência de conteúdo no Instagram: métricas reais via Meta Graph API, diagnóstico e ideias com Gemini, pesquisa de público, concorrentes, calendário e relatórios.

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
| `GEMINI_API_KEY`, `GEMINI_MODEL` | IA (padrão `gemini-2.5-flash`) |

Opcionais: `ADMIN_EMAIL`/`ADMIN_PASSWORD` (primeiro usuário), `TOKEN_ENCRYPTION_KEY`, `META_GRAPH_VERSION`, `SERPAPI_KEY`, `DATABASE_SSL`.

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
