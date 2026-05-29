# Design System — psi-organizer

Documentação viva do design system. Cada vez que um audit roda ou um componente é documentado, a saída cai aqui versionada.

## Estrutura

```
docs/design/
├── README.md                 ← este arquivo
├── audit-2026-05-28.md       ← snapshot do audit inicial
├── tokens-roadmap.md         ← roadmap de tokens a implementar
└── components/
    └── button.md             ← documentação do Button (template)
```

## Princípios

1. **Consistência sobre criatividade.** O sistema existe para que telas não reinventem padrões.
2. **Flexibilidade dentro de restrições.** Componentes compõem; não rigidam.
3. **Documente tudo.** Se não está documentado, não existe.
4. **Versione e migre.** Mudanças quebradoras precisam de caminho de migração.

## Fluxo de evolução

1. **Audit** periódico (`/design:design-system audit`) → identifica gaps.
2. **Roadmap** atualizado em `tokens-roadmap.md` com prioridades.
3. **Implementação** em PRs pequenas, uma prioridade por vez.
4. **Documentação** dos componentes em `components/` à medida que estabilizam.

## Histórico

| Data | Evento | PR |
|---|---|---|
| 2026-05-28 | Fundação: tokens, paletas, fábrica de tema, AppShell | #1 |
| 2026-05-28 | Audit inicial → identificadas 5 prioridades | — |
| 2026-05-28 | Tokens `statusConsulta` + `motion` + AgendaPage refatorada | #3 |
| 2026-05-28 | Tokens `surfaceContainer` + `elevation` + `zIndex` | #4 |
| 2026-05-28 | Reskin Agenda desktop (toolbar pills, stripe nos blocos, indicador "agora") | #5 |
| 2026-05-28 | Agenda mobile com week-strip + drill-down por dia (estilo Google Calendar) | #6 |
| 2026-05-28 | Reskin Pacientes (desktop tabela + mobile cards + empty state ilustrado + busca tri-modal) | #7 |
| 2026-05-28 | Reskin Login + Signup com `AuthShell`, ViaCEP autofill, `EnderecoForm` extraído | #8 |
| 2026-05-28 | Reskin PacienteDetalhe (header com avatar + ações inline + skeleton) | #9 |
| 2026-05-28 | Perfil completo (backend `PUT /me` + tela editável com `EnderecoForm` reusado) | #10 |
| 2026-05-29 | Dashboard com sistema de widgets configuráveis + drag/drop (`@dnd-kit`) + 1s hover preview | #11 |
| 2026-05-29 | PacienteDetalhe ganha tabs (Dados / Próximas / Histórico) com paginação estilo extrato | #12 |
| 2026-05-29 | **Documentação consolidada** (CLAUDE.md, ARCHITECTURE, BUSINESS_RULES, API, DEVELOPMENT) | esta PR |

## Prioridades pendentes (do audit inicial)

Status detalhado no `audit-2026-05-28.md`. Resumo:

- 🟢 **#1 statusConsulta tokens** — entregue na PR #3
- 🟢 **#2 motion + prefers-reduced-motion** — entregue na PR #3
- 🟢 **#3 surfaceContainer + elevation + zIndex** — entregue na PR #4
- ⏳ **#4 estados completos do Button** (loading, ghost, danger) + TextField error refinado — não iniciado
- ⏳ **#5 density toggle + dark mode + CI de contraste** — não iniciado
