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

## Sincronização na nuvem

Com login, tarefas, métricas importadas, ideias, calendário, biblioteca, diagnósticos e relatórios ficam também no banco (`/api/workspace`), um documento por coleção com versão.
Abrir em outro computador ou celular traz tudo. O navegador continua sendo a cópia rápida: cada alteração sobe em ~1,5s; sem internet fica pendente e sobe quando a conexão volta.
Se dois aparelhos gravarem ao mesmo tempo, o servidor responde 409 e o app mescla por item (o mais recente vence; exclusões não voltam).
O ícone de nuvem no cabeçalho mostra o estado (salvo, sincronizando, offline, erro) e sincroniza ao clicar. O modo demonstração nunca vai para a nuvem.

Código: `src/services/sync/`, `api/workspace.ts`, `server/repositories/workspaceRepository.ts`.

## Backup

Configurações → **Backup dos dados**: baixa um `.json` com tudo que fica no navegador (posts, métricas, ideias, calendário, tarefas, biblioteca, diagnósticos, relatórios) e restaura em qualquer computador. O dashboard só lembra do backup quando a sincronização na nuvem não está ativa.

Código: `src/services/backupService.ts`.

## Dashboard: resumo por cliente e Minhas tarefas

- Seletor no topo do dashboard: **Todos os clientes** ou um cliente específico (todo o resumo passa a mostrar só ele).
- Alternância **Resumo | Tarefas**. Tarefas é um CRM de entregas em quadro: A fazer, Em produção, Aprovação do cliente, Aprovado, Entregue.
  Cada tarefa tem cliente (ou "Geral"), tipo, prazo, prioridade, notas e checklist; arrastar entre colunas, seta para avançar, visão em lista, filtros (atrasadas, hoje, 7 dias, prioridade alta) e busca.
- As tarefas ficam no navegador e na nuvem (ver Sincronização). Excluir um cliente exclui as tarefas dele.

## Portal de aprovação do cliente

Tarefas → **Link de aprovação**: gera um link por cliente (`/aprovar/<token>`, válido 30 dias, um ativo por cliente). O cliente abre sem conta e vê só as entregas em "Aprovação do cliente", com o **texto para aprovação** e o **link da arte** preenchidos na tarefa; as notas internas nunca aparecem.
Ele aprova (a tarefa vai para Aprovado) ou pede ajuste com comentário (volta para Em produção com o pedido). A agência recebe aviso e o histórico fica na tarefa.
O token é guardado só como hash (busca) e criptografado (para copiar de novo); dá para gerar outro ou revogar a qualquer momento.

Código: `api/portal.ts`, `server/services/portalService.ts`, `src/components/portal/`, `src/components/tasks/ApprovalLinkModal.tsx`.

## Meu perfil (sua marca pessoal)

Atalho **Meu perfil** no menu: um workspace igual ao dos clientes (métricas por CSV, diagnóstico, ideias, calendário, biblioteca, piloto da semana, tarefas) para o seu próprio Instagram.
Ele fica fora da carteira: não conta como cliente, não entra no consolidado "Todos os clientes" do dashboard (dá para escolhê-lo no seletor), não aparece no financeiro nem no link de aprovação.
Os prompts de IA avisam que é o perfil do dono da agência (autoridade e captação de clientes), e o piloto da semana não cria etapa de "aprovação do cliente".

## Administração (financeiro)

Alternância **Agência | Administração** no topo do menu (dono ou administrador, fora do modo demonstração). O sistema lembra o modo em que você parou.

- **Visão geral**: recebido no mês (pela data do pagamento), a receber, vencido, receita recorrente (MRR), despesas pagas e resultado; últimos 12 meses; próximos vencimentos; entregas do mês x pacote e faturamento por cliente; receita por cliente; contas a receber por atraso; previsão de 3 meses; projetos por etapa; **fechamento do mês** em CSV.
- **Cobranças**: número sequencial (#0001), itens com quantidade, desconto, emissão, vencimento, forma de pagamento e nº da nota fiscal (quando emitida à parte). Registrar pagamento (data, valor, forma), cancelar/reabrir, excluir com desfazer, **recibo/cobrança em PDF**, CSV com filtros. "Vencida" é calculado pela data.
- **Contratos**: recorrentes (valor mensal e dia do vencimento) ou avulsos. As mensalidades do mês são geradas com um clique, sem duplicar.
- **Projetos**: etapas Proposta → Aprovado → Em produção → Revisão → Entregue → Faturado → Recebido. "Faturar" cria a cobrança; o pagamento move o projeto para Recebido.
- **Despesas**: por mês e categoria, pagas e a pagar, recorrentes (lançar as do mês anterior), CSV.

Valores em centavos (sem erro de arredondamento), validados, sincronizados na nuvem e incluídos no backup. Excluir um cliente **não** apaga o histórico financeiro.
Os recibos são documentos internos de controle: o sistema **não emite nota fiscal eletrônica**.

Código: `src/services/finance.ts` (regras, com testes), `src/components/admin/`, `src/services/receiptPdf.ts`.

## Aplicativo (abrir ao ligar o computador)

O site é instalável (Chrome/Edge): Configurações → **Instalar aplicativo**, ou o ícone de instalar na barra de endereço. Clique com o botão direito no ícone do app para os atalhos Financeiro, Cobranças e Minhas tarefas.
Para abrir junto com o Windows: `Windows + R` → `shell:startup` → cole ali o atalho do aplicativo.

## Calendário e Biblioteca

- **Calendário** com datas reais: visão Mês (agenda em lista no celular) e Semana, arrastar para reagendar, clicar num dia para agendar, formulário para mudar a data pelo teclado. Itens antigos sem data ficam numa bandeja. O Piloto da Semana e o Banco de Ideias já agendam com data.
- **Biblioteca** (aba do cliente): legendas, grupos de hashtags, CTAs e ganchos para copiar com um clique, com contagem de uso e aviso dos limites do Instagram (30 hashtags, 2.200 caracteres). Textos "gerais" aparecem em todos os clientes.

Código: `src/components/agency/`, `src/components/tasks/`, `src/services/dashboardInsights.ts`, `src/services/taskInsights.ts`.

## IA sem chave de API (fluxo manual)

Diagnóstico ("Gerar análise completa") e Banco de Ideias ("Gerar prompt de ideias") funcionam assim:
1. O sistema monta um prompt completo com os dados reais do cliente (cadastro, métricas, posts, concorrentes, público).
2. Você copia e cola em qualquer IA (ChatGPT, Gemini, Claude).
3. Cola a resposta de volta no sistema; ela é validada e salva.

Código: `src/ai/manualPrompts.ts` e `src/components/common/ManualAiModal.tsx`. A rota `/api/ai?action=...` com Gemini continuam no backend como opção, mas a interface não depende delas.

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
| POST | `/api/ai?action=analyze-profile\|generate-ideas\|classify-content` | IA opcional (Gemini) |
| GET/PUT | `/api/workspace` | Sincronização das coleções do app (tarefas, métricas, ideias, calendário...) com versão; 409 em conflito |
| GET/POST | `/api/portal` | Links de aprovação do cliente (agência) e portal público por token (`/aprovar/<token>`) |
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

Opcionais: `GEMINI_API_KEY`/`GEMINI_MODEL` (só para a rota `/api/ai`), `ADMIN_EMAIL`/`ADMIN_PASSWORD` (primeiro usuário), `TOKEN_ENCRYPTION_KEY`, `META_GRAPH_VERSION`, `SERPAPI_KEY`, `DATABASE_SSL`.

> Trocar `SESSION_SECRET` invalida sessões e torna ilegíveis os tokens já salvos (será preciso reconectar o Instagram), a menos que `TOKEN_ENCRYPTION_KEY` esteja definida.

## Configuração

### Supabase
1. Use a connection string **Transaction pooler** (Project Settings > Database) em `DATABASE_URL`.
2. Aplique o schema: `DATABASE_URL=... npm run db:migrate` (ou cole os arquivos de `db/migrations/` em ordem no SQL Editor). É idempotente.
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
