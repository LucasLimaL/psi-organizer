import { useState } from 'react'
import {
  IconButton, Menu, MenuItem, ListItemIcon, ListItemText, Box, Tooltip,
} from '@mui/material'
import PaletteIcon from '@mui/icons-material/Palette'
import CheckIcon from '@mui/icons-material/Check'
import { useAppTheme } from '../theme/appThemeContext'

export default function PaletteSwitcher() {
  const { paleta, trocarPaleta, paletasDisponiveis } = useAppTheme()
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)

  return (
    <>
      <Tooltip title="Trocar paleta de cores">
        <IconButton
          id="seletor-paleta"
          aria-label="Trocar paleta de cores"
          onClick={e => setAnchorEl(e.currentTarget)}
          size="small"
        >
          <PaletteIcon />
        </IconButton>
      </Tooltip>
      <Menu
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        slotProps={{ paper: { sx: { minWidth: 200 } } }}
      >
        {paletasDisponiveis.map(p => (
          <MenuItem
            key={p.id}
            selected={p.id === paleta.id}
            onClick={() => {
              trocarPaleta(p.id)
              setAnchorEl(null)
            }}
          >
            <ListItemIcon sx={{ minWidth: 32 }}>
              <Box
                aria-hidden
                sx={{
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  bgcolor: p.primary,
                  border: theme => `1px solid ${theme.palette.divider}`,
                }}
              />
            </ListItemIcon>
            <ListItemText>{p.nome}</ListItemText>
            {p.id === paleta.id && <CheckIcon fontSize="small" />}
          </MenuItem>
        ))}
      </Menu>
    </>
  )
}
