# Button

Acionador de uma ação primária ou secundária. Usado em formulários, diálogos,
headers de seção e CTAs. Para navegação, usar `<Link>` (não `<Button onClick={navigate}>`).

## Variantes

| Variante | Quando usar | Exemplo |
|---|---|---|
| `contained` (primary) | Ação principal de um contexto (1 por tela/seção) | "Salvar", "Criar paciente" |
| `outlined` | Ação secundária, alternativa visível | "Cancelar", "Voltar" |
| `text` (ghost) | Ação terciária, dentro de listas/cards | "Editar", "Ver detalhes" |
| `contained color="error"` | Destrutiva: requer confirmação ou é irreversível | "Inativar paciente", "Remover consulta" |

## Props

| Prop | Tipo | Default | Descrição |
|---|---|---|---|
| `variant` | `'contained' \| 'outlined' \| 'text'` | `'text'` | Hierarquia visual |
| `color` | `'primary' \| 'secondary' \| 'error'` | `'primary'` | Semântica da ação |
| `size` | `'small' \| 'medium' \| 'large'` | `'medium'` | 32 / 40 / 48 px |
| `loading` | `boolean` | `false` | Mostra spinner e desabilita |
| `disabled` | `boolean` | `false` | Ação indisponível por contexto |
| `startIcon` / `endIcon` | `ReactNode` | — | Ícone de apoio (não substitui label) |

## Estados

| Estado | Visual | Comportamento |
|---|---|---|
| Default | Cor `primary.main`, texto `primary.contrastText` | Clicável |
| Hover | `filter: brightness(1.08)` sobre primary | Indica clicabilidade |
| Focus-visible | Outline 2px `primary.main`, offset 2px | Teclado vê foco |
| Active | `filter: brightness(0.92)` | Feedback do clique |
| Disabled | `alpha(primary, 0.38)` bg, cursor `not-allowed` | Não clicável, sem hover |
| Loading | Spinner sobre o label, `aria-busy="true"` | Não clicável, mantém largura |
| Error (`color="error"`) | Vermelho | Confirma intenção destrutiva antes |

## Acessibilidade

- **Role:** `button` (implícito quando `<button>`).
- **Teclado:** Enter e Space disparam. Tab/Shift+Tab navega.
- **Screen reader:** Anuncia "Botão, [label]". Loading: "ocupado". Disabled: "indisponível".
- **Touch:** mínimo 44×44px em superfície clicável — `small` precisa de padding extra em mobile.
- **Label:** verbo de ação ("Salvar", não "OK"). Específico ao contexto.

## Do's & Don'ts

| ✅ Do | ❌ Don't |
|---|---|
| 1 botão `contained` primário por contexto | Vários `contained` competindo na mesma tela |
| Verbos: `Salvar`, `Cancelar`, `Remover` | Ambíguos: `OK`, `Sim`, `Não` |
| `loading={true}` durante chamada assíncrona | Trocar o label pra "Salvando..." manualmente |
| `color="error"` apenas pra destrutivas | `color="error"` pra "Cancelar" |
| Confirmar destrutivas com dialog | "Apagar tudo" sem confirmação |

## Exemplo

```tsx
import { Button } from '@mui/material'
import SaveIcon from '@mui/icons-material/Save'
import DeleteIcon from '@mui/icons-material/Delete'

// Primário
<Button variant="contained" startIcon={<SaveIcon />} loading={salvando}>
  Salvar
</Button>

// Secundário lado a lado
<Button variant="outlined" onClick={onFechar}>
  Cancelar
</Button>

// Destrutivo com confirmação
<Button
  variant="contained"
  color="error"
  startIcon={<DeleteIcon />}
  onClick={() => confirmar('Inativar paciente?', inativar)}
>
  Inativar
</Button>

// Terciário em lista
<Button variant="text" size="small">
  Ver detalhes
</Button>
```

## Open questions

- A prop nativa `loading` da MUI v9 está estável?
- Faz sentido uma variante "danger outlined"?
- `large` aparece em mobile? Garantir touch ≥48px se sim.
