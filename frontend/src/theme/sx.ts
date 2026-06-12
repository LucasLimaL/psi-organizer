import type { SxProps } from '@mui/material/styles'

/**
 * Esconde as setas de incremento/decremento de inputs `type="number"`.
 * Usado nos campos de valor monetário (R$), onde o spinner não faz sentido.
 */
export const sxInputSemSpinner: SxProps = {
  '& input[type=number]': {
    MozAppearance: 'textfield',
  },
  '& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button': {
    WebkitAppearance: 'none',
    margin: 0,
  },
}
