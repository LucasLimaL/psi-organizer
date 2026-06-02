import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogContentText,
  DialogTitle, FormControlLabel, MenuItem, Paper, Snackbar, Stack,
  Switch, TextField, Typography,
} from '@mui/material'
import WhatsAppIcon from '@mui/icons-material/WhatsApp'
import {
  whatsappApi, HORARIOS_VALIDOS, renderizarTemplate,
  type ConfiguracaoWhatsapp,
} from '../api/whatsapp'
import { useAuth } from '../auth/authContext'
import { useDirty } from '../hooks/useDirty'
import { formatarTelefoneBr, paraE164Br } from '../utils/telefones'

const LIMITE_CARACTERES = 1024
const ALERTA_CARACTERES = 900

const TEMPLATE_DEFAULT =
  'Olá, {paciente}! Aqui é a {psicologa}.\n'
  + 'Lembrando da sua consulta amanhã, {data} às {hora}.\n'
  + 'Pode confirmar abaixo?'

const PLACEHOLDERS_EXEMPLO = {
  paciente: 'Maria',
  psicologa: 'Dra. Ana Silva',
  data: '30/05/2026',
  hora: '14:00',
}

export default function ConfiguracoesWhatsappPage() {
  const { psicologa } = useAuth()
  const [config, setConfig] = useState<ConfiguracaoWhatsapp | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState(false)
  const { dirty, setBaseline } = useDirty(config)

  // Dialog "Enviar teste"
  const [testeAberto, setTesteAberto] = useState(false)
  const [testeTelefone, setTesteTelefone] = useState('')
  const [testeEnviando, setTesteEnviando] = useState(false)
  const [testeErro, setTesteErro] = useState<string | null>(null)
  const [testeSucesso, setTesteSucesso] = useState<string | null>(null)
  const telefoneE164 = paraE164Br(testeTelefone)
  const erroFormatoTelefone = testeTelefone && !telefoneE164
    ? 'Use DDD + número (10 ou 11 dígitos)'
    : null

  function abrirTeste() {
    setTesteTelefone('')
    setTesteErro(null)
    setTesteAberto(true)
  }

  async function enviarTeste() {
    if (!telefoneE164) return
    setTesteErro(null)
    setTesteEnviando(true)
    try {
      const r = await whatsappApi.enviarTeste(telefoneE164)
      setTesteAberto(false)
      setTesteSucesso(`Mensagem despachada (id: ${r.mensagemIdExterna.slice(0, 40)}…)`)
    } catch (err) {
      const e = err as { erro?: string; detalhes?: Record<string, string> }
      const det = e?.detalhes ? ' — ' + Object.values(e.detalhes).join('; ') : ''
      setTesteErro((e?.erro ?? 'Falha ao enviar') + det)
    } finally {
      setTesteEnviando(false)
    }
  }

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      const atual = await whatsappApi.obter()
      setConfig(atual)
      setBaseline(atual)
    } catch (err) {
      const e = err as { erro?: string }
      setErro(e?.erro ?? 'Falha ao carregar configuração')
    } finally {
      setCarregando(false)
    }
  }, [setBaseline])

  useEffect(() => { void carregar() }, [carregar])

  const exemploRenderizado = useMemo(() => {
    if (!config) return ''
    return renderizarTemplate(config.templateMensagem, {
      ...PLACEHOLDERS_EXEMPLO,
      psicologa: psicologa?.nomeCompleto ?? PLACEHOLDERS_EXEMPLO.psicologa,
    })
  }, [config, psicologa])

  function setCampo<K extends keyof ConfiguracaoWhatsapp>(k: K, v: ConfiguracaoWhatsapp[K]) {
    setConfig(c => (c ? { ...c, [k]: v } : c))
  }

  async function salvar() {
    if (!config) return
    setErro(null)
    setSalvando(true)
    try {
      const atualizada = await whatsappApi.atualizar({
        ativo: config.ativo,
        templateMensagem: config.templateMensagem,
        horarioEnvioLembrete: config.horarioEnvioLembrete,
      })
      setConfig(atualizada)
      setBaseline(atualizada)
      setSucesso(true)
    } catch (err) {
      const e = err as { erro?: string; detalhes?: Record<string, string> }
      const det = e?.detalhes ? ' — ' + Object.values(e.detalhes).join('; ') : ''
      setErro((e?.erro ?? 'Falha ao salvar') + det)
    } finally {
      setSalvando(false)
    }
  }

  if (carregando) return <Typography>Carregando…</Typography>
  if (!config) return <Alert severity="error">{erro ?? 'Configuração indisponível'}</Alert>

  const numChars = config.templateMensagem.length
  const corContador =
    numChars >= LIMITE_CARACTERES ? 'error.main'
      : numChars > ALERTA_CARACTERES ? 'warning.main'
        : 'text.secondary'

  const desabilitado = !config.ativo

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="caption" color="text.secondary">Configurações</Typography>
        <Typography variant="h5" sx={{ fontWeight: 600, mt: 0.5 }}>
          Lembretes via WhatsApp
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Envio automático de lembrete 1 dia antes da consulta, com confirmação pela paciente.
        </Typography>
      </Box>

      {erro && <Alert severity="error" onClose={() => setErro(null)}>{erro}</Alert>}

      <Paper variant="outlined" sx={{ p: 3 }}>
        <FormControlLabel
          control={
            <Switch
              checked={config.ativo}
              onChange={e => setCampo('ativo', e.target.checked)}
            />
          }
          label={
            <Box>
              <Typography sx={{ fontWeight: 600 }}>Enviar lembretes 1 dia antes</Typography>
              <Typography variant="caption" color="text.secondary">
                Quando ativado, pacientes com opt-in e telefone válido recebem o lembrete no
                horário escolhido.
              </Typography>
            </Box>
          }
        />
      </Paper>

      <Paper variant="outlined" sx={{ p: 3, opacity: desabilitado ? 0.6 : 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
          Horário de envio
        </Typography>
        <TextField
          select
          fullWidth
          label="Horário"
          value={config.horarioEnvioLembrete}
          onChange={e => setCampo('horarioEnvioLembrete', e.target.value)}
          disabled={desabilitado}
          helperText="Horário em fuso de São Paulo. O cron roda a cada hora e dispara no horário escolhido."
          sx={{ maxWidth: 320 }}
        >
          {HORARIOS_VALIDOS.map(h => (
            <MenuItem key={h} value={h}>{h}</MenuItem>
          ))}
        </TextField>
      </Paper>

      <Paper variant="outlined" sx={{ p: 3, opacity: desabilitado ? 0.6 : 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          Template da mensagem
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
          Placeholders aceitos: <code>{'{paciente}'}</code>, <code>{'{psicologa}'}</code>,
          <code>{'{data}'}</code>, <code>{'{hora}'}</code>.
          O texto editado aqui orienta o tom do lembrete — variações que mantenham os
          placeholders respeitam o template aprovado pela Meta.
        </Typography>
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
          <Box>
            <TextField
              fullWidth
              multiline
              minRows={8}
              value={config.templateMensagem}
              onChange={e => setCampo('templateMensagem', e.target.value.slice(0, LIMITE_CARACTERES))}
              disabled={desabilitado}
              placeholder={TEMPLATE_DEFAULT}
            />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
              <Typography variant="caption" color={corContador}>
                {numChars} / {LIMITE_CARACTERES}
              </Typography>
              <Button
                size="small"
                onClick={() => setCampo('templateMensagem', TEMPLATE_DEFAULT)}
                disabled={desabilitado}
              >
                Restaurar default
              </Button>
            </Box>
          </Box>

          <Box>
            <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              Pré-visualização
            </Typography>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                bgcolor: 'surfaceContainer.high',
                borderRadius: 3,
                whiteSpace: 'pre-wrap',
                fontFamily: 'inherit',
                minHeight: 200,
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'success.main' }}>
                <WhatsAppIcon fontSize="small" />
                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                  Psi Organizer
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {exemploRenderizado || '(template vazio)'}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mt: 'auto' }}>
                <Button size="small" variant="outlined" disabled>Confirmar</Button>
                <Button size="small" variant="outlined" disabled>Cancelar</Button>
              </Box>
            </Paper>
          </Box>
        </Box>
      </Paper>

      <Paper variant="outlined" sx={{ p: 3 }}>
        <Box sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2,
        }}>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Enviar mensagem de teste
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Dispara o template <code>hello_world</code> da Meta pro número informado.
              Útil pra confirmar que o canal funciona antes de ativar lembretes pra paciente real.
            </Typography>
          </Box>
          <Button variant="outlined" onClick={abrirTeste}>Enviar teste</Button>
        </Box>
      </Paper>

      <Paper variant="outlined" sx={{ p: 3 }}>
        <Box sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2,
        }}>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Histórico de lembretes
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Auditoria de envios com status de entrega, etapa da máquina de estados
              e escolha final.
            </Typography>
          </Box>
          <Button component={RouterLink} to="/configuracoes/whatsapp/historico" variant="outlined">
            Ver histórico
          </Button>
        </Box>
      </Paper>

      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
        <Button variant="contained" onClick={() => void salvar()} disabled={salvando || !dirty}>
          {salvando ? 'Salvando…' : 'Salvar'}
        </Button>
      </Box>

      <Snackbar
        open={sucesso}
        autoHideDuration={3000}
        onClose={() => setSucesso(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" variant="filled" sx={{ width: '100%' }}>
          Configuração salva com sucesso
        </Alert>
      </Snackbar>

      <Snackbar
        open={testeSucesso !== null}
        autoHideDuration={5000}
        onClose={() => setTesteSucesso(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" variant="filled" sx={{ width: '100%' }}>
          {testeSucesso}
        </Alert>
      </Snackbar>

      <Dialog open={testeAberto} onClose={() => setTesteAberto(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Enviar mensagem de teste</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Vai disparar o template <code>hello_world</code> da Meta pro número abaixo.
            O número precisa estar verificado como destinatário permitido no painel
            Meta (modo dev).
          </DialogContentText>
          {testeErro && <Alert severity="error" sx={{ mb: 2 }}>{testeErro}</Alert>}
          <TextField
            fullWidth autoFocus
            label="Telefone"
            placeholder="(11) 96666-3333"
            value={testeTelefone}
            onChange={e => setTesteTelefone(formatarTelefoneBr(e.target.value))}
            error={!!erroFormatoTelefone}
            helperText={erroFormatoTelefone ?? (telefoneE164 ? `Será enviado como ${telefoneE164}` : 'Salvo como E.164 (+55…)')}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTesteAberto(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={() => void enviarTeste()}
            disabled={testeEnviando || !telefoneE164}
          >
            {testeEnviando ? 'Enviando…' : 'Enviar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
