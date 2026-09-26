# Pesquisa de referências e melhorias (setembro/2026)

Comparativo com sistemas open source parecidos e práticas atuais de desempenho, design e animação.
Objetivo: trazer o que faz sentido para o uso real (uma agência, uso simples, sem IA integrada).

## Sistemas analisados

| Projeto | Foco | O que aproveitamos |
|---|---|---|
| [Postiz](https://github.com/gitroomhq/postiz-app) | Agendamento multi-rede, colaboração, aprovação | Paleta de ações, ideia de templates |
| [BrightBean Studio](https://github.com/brightbeanxyz/brightbean-studio) | Gestão por workspaces, aprovação com portal do cliente, analytics 7/30/90 dias | Tabela ordenável de todos os posts |
| [Social Stats](https://github.com/cbsshekhawat18-lab/social-stats-social-media-manager) | Agências: dashboards por cliente, relatórios mensais | Validou o painel por cliente e relatórios |
| [Mixpost](https://github.com/inovector/mixpost) | Calendário, templates, grupos de hashtags | Roadmap: biblioteca de legendas/hashtags |
| [Postline](https://github.com/adeel1608/social-media-scheduler) | Histórico de métricas com valores indisponíveis honestos | Mesma regra: n/d, nunca 0 inventado |
| [Fuorix / agency-ops](https://github.com/ahmadshahzadl/agency-ops) | Operação de agência: kanban com revisão, portal do cliente | Validou o CRM de entregas por etapas |
| [AgencyCRM](https://github.com/qaptures-creator/agencycrm) | Entregas (reels, posts) contra pacotes mensais | **Pacote mensal por cliente** |

## Práticas pesquisadas

- Desempenho (INP, listas grandes, valores adiados): [TurboDocx](https://www.turbodocx.com/blog/react-performance-optimization), [Softaims](https://softaims.com/blog/react-performance-optimization-advanced-2026)
- Animação (Motion, View Transitions, reduzir movimento): [Motion layout animations](https://motion.dev/docs/react-layout-animations), [Motion + View Transitions](https://themotiondesign.com/writing/motion-for-react-view-transitions)
- UX SaaS (desfazer, paleta de comandos, estados vazios): [SaaSUI](https://www.saasui.design/blog/saas-drag-and-drop-reordering-ux-patterns), [Command palette](https://uxpatterns.dev/patterns/advanced/command-palette)

## Implementado nesta rodada

1. **Desfazer** em exclusões (tarefas, calendário, insights), no lugar da caixa de confirmação.
2. **Paleta de comandos** (Ctrl+K): ações rápidas + busca, navegação por setas e Enter.
3. **Pacote mensal por cliente** com progresso e ritmo esperado do mês.
4. **Mapa de calor** dia x horário nos padrões vencedores.
5. **Tabela ordenável** de posts na aba Conteúdo.
6. **Animações** com propósito: indicadores deslizantes (menu, abas, Resumo/Tarefas), cards do kanban entre colunas, modais e avisos com entrada/saída, KPIs contando, transição de aba. Tudo desligado com "reduzir movimento".
7. **Desempenho**: busca global e busca de tarefas com `useDeferredValue` (digitação não trava).
8. Removida notificação inicial fictícia ("sistema inicializado").

## Roadmap sugerido (depende de sincronizar dados na nuvem)

- Portal de aprovação do cliente por link (sem conta), como BrightBean/Fuorix.
- Calendário com datas reais (mês/semana) e arrastar para reagendar.
- Biblioteca de legendas, templates e grupos de hashtags por cliente (Mixpost).
- Sincronização de tarefas, métricas, ideias e calendário com o banco (acesso de qualquer aparelho).
