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
