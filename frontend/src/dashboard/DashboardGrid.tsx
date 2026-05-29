import { useEffect, useRef, useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Box, Paper, IconButton, Tooltip } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import type { DashboardData } from '../api/dashboard'
import type { WidgetId } from './types'
import { WIDGETS_POR_ID } from './widgets'

const HOVER_PARA_SWAP_MS = 1000

type Props = {
  dados: DashboardData
  ordem: WidgetId[]
  onReorder: (novaOrdem: WidgetId[]) => void
}

function swapArray<T>(arr: T[], idA: T, idB: T): T[] {
  const i = arr.indexOf(idA)
  const j = arr.indexOf(idB)
  if (i === -1 || j === -1) return arr
  const copia = [...arr]
  copia[i] = arr[j]
  copia[j] = arr[i]
  return copia
}

/**
 * Item arrastável. O drag handle (ícone) é o único spot que inicia drag —
 * permite clicar/interagir dentro do widget sem disparar o drag.
 */
function WidgetSortavel({ id, dados }: { id: WidgetId; dados: DashboardData }) {
  const theme = useTheme()
  const widget = WIDGETS_POR_ID.get(id)
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging, setActivatorNodeRef,
  } = useSortable({ id })

  if (!widget) return null
  const { Render } = widget

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 10 : 'auto',
  }

  return (
    <Box ref={setNodeRef} style={style} sx={{ position: 'relative', minWidth: 0 }}>
      <Paper
        variant="outlined"
        sx={{
          p: 2, boxShadow: 'none',
          border: `1px solid ${theme.palette.divider}`,
          height: 200,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          transition: 'box-shadow 150ms',
          '&:hover .drag-handle': { opacity: 1 },
          ...(isDragging && {
            boxShadow: theme.shadows[6],
            borderColor: theme.palette.primary.main,
          }),
        }}
      >
        <Tooltip title="Arraste para mover" placement="top">
          <IconButton
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            size="small"
            className="drag-handle"
            sx={{
              position: 'absolute', top: 4, right: 4,
              opacity: 0,
              cursor: 'grab',
              '&:active': { cursor: 'grabbing' },
              transition: 'opacity 150ms',
              touchAction: 'none',
            }}
            aria-label={`Mover widget ${widget.titulo}`}
          >
            <DragIndicatorIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Render dados={dados} />
      </Paper>
    </Box>
  )
}

export default function DashboardGrid({ dados, ordem, onReorder }: Props) {
  const [ordemAtual, setOrdemAtual] = useState<WidgetId[]>(ordem)
  const ordemOriginalRef = useRef<WidgetId[]>(ordem)
  const swapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastOverIdRef = useRef<string | null>(null)
  const swapJaFeitoRef = useRef(false)

  // Sincroniza quando a prop muda (ex: settings drawer adiciona/remove widget)
  useEffect(() => {
    setOrdemAtual(ordem)
  }, [ordem])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function limparTimer() {
    if (swapTimerRef.current) {
      clearTimeout(swapTimerRef.current)
      swapTimerRef.current = null
    }
  }

  function onDragStart() {
    ordemOriginalRef.current = ordemAtual
    swapJaFeitoRef.current = false
    lastOverIdRef.current = null
    limparTimer()
  }

  function onDragOver(e: DragOverEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) {
      lastOverIdRef.current = null
      limparTimer()
      return
    }
    const overId = String(over.id)
    if (overId === lastOverIdRef.current) return // mesmo target — timer já roda

    // Novo target: reseta swap flag e dispara novo timer
    lastOverIdRef.current = overId
    swapJaFeitoRef.current = false
    limparTimer()
    swapTimerRef.current = setTimeout(() => {
      setOrdemAtual(prev => swapArray(prev, active.id as WidgetId, over.id as WidgetId))
      swapJaFeitoRef.current = true
      swapTimerRef.current = null
    }, HOVER_PARA_SWAP_MS)
  }

  function onDragEnd(e: DragEndEvent) {
    limparTimer()
    const { active, over } = e
    if (over && active.id !== over.id && !swapJaFeitoRef.current) {
      // Drop antes do timer disparar — faz o swap imediato
      setOrdemAtual(prev => {
        const novo = swapArray(prev, active.id as WidgetId, over.id as WidgetId)
        onReorder(novo)
        return novo
      })
    } else {
      onReorder(ordemAtual)
    }
    swapJaFeitoRef.current = false
    lastOverIdRef.current = null
  }

  function onDragCancel() {
    limparTimer()
    setOrdemAtual(ordemOriginalRef.current)
    swapJaFeitoRef.current = false
    lastOverIdRef.current = null
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
    >
      <SortableContext items={ordemAtual} strategy={rectSortingStrategy}>
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(3, 1fr)',
            lg: 'repeat(4, 1fr)',
          },
          gap: 2,
        }}>
          {ordemAtual.map(id => (
            <WidgetSortavel key={id} id={id} dados={dados} />
          ))}
        </Box>
      </SortableContext>
    </DndContext>
  )
}
