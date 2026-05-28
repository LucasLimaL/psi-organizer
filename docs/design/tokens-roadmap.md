# Roadmap de Tokens

Especificação dos tokens propostos pelo audit. Cada seção tem nome, valor para
as 4 paletas atuais, regra de derivação para paletas futuras e onde aplicar.

## Status — `PaletteTokens.status`  🔴 PR #2

Cores semânticas de domínio para status de consulta.

```ts
type StatusToken = { bg: string; fg: string; border: string }

status: {
  agendada:   StatusToken  // informativo — espera confirmação
  confirmada: StatusToken  // cor de marca — pronto
  realizada:  StatusToken  // sucesso — concluída
  falta:      StatusToken  // erro tonal — não compareceu
}
```

### Regra de derivação por paleta

| Status | bg | fg | border |
|---|---|---|---|
| agendada | `info` | `primaryContrast` | `alpha(info, 0.3)` |
| confirmada | `primary` | `primaryContrast` | `alpha(primary, 0.3)` |
| realizada | `success` | `#FFFFFF` | `alpha(success, 0.3)` |
| falta | `alpha(error, 0.12)` | `error` | `alpha(error, 0.3)` |

A regra é determinística: dado um `PaletteTokens` base, `status` é computado.
Implementação: função `derivarStatus(p)` chamada na fábrica.

### Aplicação

- `frontend/src/pages/AgendaPage.tsx:23-30` — substitui `corStatus()` por leitura do theme.

### Dark mode

Mesmo formato; `bg` deriva de `darken(cor, 0.3)`, `fg` mantém.

---

## Motion — `globalTokens.motion`  🔴 PR #2

```ts
motion: {
  duration: {
    instant: 0,
    fast: 120,    // micro: toggle, ripple
    short: 200,   // hover, focus
    medium: 280,  // drawer slide, dialog
    long: 400,    // page transition
  },
  easing: {
    standard:   'cubic-bezier(0.2, 0, 0, 1)',
    emphasized: 'cubic-bezier(0.3, 0, 0, 1)',
    decelerate: 'cubic-bezier(0, 0, 0, 1)',
    accelerate: 'cubic-bezier(0.3, 0, 1, 1)',
  },
}
```

### prefers-reduced-motion

`createAppTheme` lê `window.matchMedia('(prefers-reduced-motion: reduce)')` e
zera as durations se reduzido. Easings permanecem (irrelevantes a 0ms).

### Aplicação

- `createAppTheme.ts` — substitui `theme.transitions.duration` por `globalTokens.motion.duration`.
- Componentes customizados usam `theme.transitions.create(...)` ou `theme.transitions.duration.short` etc.

---

## Surface tonal — `PaletteTokens.surfaceContainer*`  ✅ entregue

```ts
surfaceContainerLow:     string  // cards em background — 5% mix com primary
surfaceContainer:        string  // = surface atual
surfaceContainerHigh:    string  // sidebar items hover, headers — 11% mix
surfaceContainerHighest: string  // modal, popover — 14% mix
```

### Regra de derivação

`mix(surface, primary, n%)` onde n ∈ {5, 8, 11, 14}. Algoritmo MD3.

### Aplicação

- `Paper` (cards em background).
- `Drawer` item hover.
- `Dialog`, `Menu`, `Popover`.

---

## Elevation + Z-index — `globalTokens.elevation` / `globalTokens.zIndex`  ✅ entregue

```ts
elevation: { none: 0, sm: 1, md: 2, lg: 3, xl: 4 }
zIndex: {
  base: 0,
  drawer: 1100,
  appBar: 1200,
  modal: 1300,
  snackbar: 1400,
  tooltip: 1500,
}
```

Sem mudança visual imediata — apenas explicita o que hoje é MUI default.

---

## Density — `AppThemeContext.density`  🟢 PR #5

```ts
type Density = 'compact' | 'comfortable' | 'spacious'
```

Multiplicadores em `createAppTheme`:

| Density | spacing | TableRow | TextField | Button paddingBlock |
|---|---|---|---|---|
| compact | × 0.75 | 36px | 36px | 4 |
| comfortable | × 1.0 | 52px | 40px | 8 |
| spacious | × 1.25 | 64px | 48px | 12 |

UI: switcher no rodapé do Drawer.

---

## Dark mode  🟢 PR #6

Cada paleta light ganha um `darkVariant: PaletteTokens`.
`AppThemeContext.modo: 'light' | 'dark' | 'auto'`. Em `auto`, escuta
`prefers-color-scheme`. Tokens semânticos (`status`, `surfaceContainer*`)
permanecem — só hex muda.

---

## CI — validação de contraste  🟢 PR #7

Script Node que itera todas as paletas e roda axe-core/chroma-js para validar
contraste WCAG AA entre todos os pares relevantes (`textPrimary` × `surface`,
`primaryContrast` × `primary`, etc). Falha o CI se algum par cair abaixo de
4.5:1.
