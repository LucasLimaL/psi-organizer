import { driver, type DriveStep } from 'driver.js'
import 'driver.js/dist/driver.css'

/**
 * Tour de primeiro acesso — apresenta as principais áreas do sistema com
 * spotlight (tela escurecida, recorte no elemento em destaque).
 *
 * Auto-inicia uma única vez por usuário (flag em localStorage); pode ser
 * revisto a qualquer momento pelo botão de ajuda na barra superior
 * (#botao-tour), que é justamente o destaque do passo final.
 */

const PREFIXO_VISTO = 'psi.tour.visto.'

// Mesmo breakpoint `md` do MUI: abaixo dele o menu lateral vira drawer fechado,
// então o tour destaca o botão de abrir menu em vez de cada item.
const MEDIA_DESKTOP = '(min-width: 900px)'

export function tourJaVisto(psicologaId: string): boolean {
  return localStorage.getItem(PREFIXO_VISTO + psicologaId) === '1'
}

export function marcarTourVisto(psicologaId: string) {
  localStorage.setItem(PREFIXO_VISTO + psicologaId, '1')
}

const PASSO_BOAS_VINDAS: DriveStep = {
  popover: {
    title: 'Boas-vindas ao psi-organizer! 👋',
    description: 'Vamos fazer um passeio rápido pelas principais áreas do sistema. '
      + 'Leva menos de um minuto — e você pode rever quando quiser.',
  },
}

// Em telas grandes o menu lateral fica sempre visível — cada área ganha um passo.
const PASSOS_MENU_DESKTOP: DriveStep[] = [
  {
    element: 'nav a[href="/"]',
    popover: {
      title: 'Início',
      description: 'Seu painel do dia: consultas de hoje, faturamento do mês, '
        + 'pendências e atalhos. Os widgets são personalizáveis — arraste pra '
        + 'reordenar e escolha quais aparecem.',
      side: 'right',
    },
  },
  {
    element: 'nav a[href="/agenda"]',
    popover: {
      title: 'Agenda',
      description: 'Sua semana de consultas. Clique num horário vago pra agendar '
        + '(inclusive consultas recorrentes) e numa consulta pra editar. Consultas '
        + 'passadas sem desfecho aparecem num aviso pra você resolver rapidinho.',
      side: 'right',
    },
  },
  {
    element: 'nav a[href="/pacientes"]',
    popover: {
      title: 'Pacientes',
      description: 'Cadastro completo dos seus pacientes: dados, valor da sessão, '
        + 'histórico e próximas consultas de cada um.',
      side: 'right',
    },
  },
  {
    element: 'nav a[href="/financeiro"]',
    popover: {
      title: 'Financeiro',
      description: 'Quem pagou, quem deve e o que vem por aí — por mês ou ano. '
        + 'Pagamentos pendentes agrupados por paciente, com baixa em um clique.',
      side: 'right',
    },
  },
  {
    element: 'nav a[href="/assinatura"]',
    popover: {
      title: 'Assinatura',
      description: 'Seu plano de uso do sistema: contratos e faturas, com fechamento '
        + 'no dia que você escolheu no cadastro.',
      side: 'right',
    },
  },
  {
    element: 'nav a[href="/perfil"]',
    popover: {
      title: 'Perfil',
      description: 'Seus dados profissionais e de contato: nome, CRP, endereço '
        + 'do consultório e e-mail de acesso.',
      side: 'right',
    },
  },
  {
    element: 'nav a[href="/configuracoes"]',
    popover: {
      title: 'Configurações',
      description: 'Suas preferências num só lugar: se consultas com falta entram na '
        + 'cobrança e os lembretes por WhatsApp — que avisam a paciente um dia antes, '
        + 'com confirmação pelo próprio WhatsApp.',
      side: 'right',
    },
  },
]

// No mobile o menu fica recolhido atrás do hambúrguer — um passo único o apresenta.
const PASSO_MENU_MOBILE: DriveStep = {
  element: '#botao-abrir-menu',
  popover: {
    title: 'Menu principal',
    description: 'Tudo mora aqui: Início (seu painel do dia), Agenda, Pacientes, '
      + 'Financeiro, Assinatura, seu Perfil e os lembretes automáticos por WhatsApp.',
    side: 'bottom',
  },
}

const PASSOS_FINAIS: DriveStep[] = [
  {
    element: '#sino-notificacoes',
    popover: {
      title: 'Notificações',
      description: 'Quando uma paciente cancela pelo WhatsApp (ou algo pedir sua '
        + 'atenção), o aviso chega aqui.',
      side: 'bottom',
    },
  },
  {
    element: '#seletor-paleta',
    popover: {
      title: 'Paleta de cores',
      description: 'O sistema combina com você: escolha aqui a paleta de cores '
        + 'da sua preferência.',
      side: 'bottom',
    },
  },
  {
    element: '#botao-tour',
    popover: {
      title: 'Quer rever este tour?',
      description: 'É só clicar neste botão a qualquer momento. Bom trabalho! 🌱',
      side: 'bottom',
    },
  },
]

export function iniciarTour() {
  const desktop = window.matchMedia(MEDIA_DESKTOP).matches
  const d = driver({
    showProgress: true,
    progressText: '{{current}} de {{total}}',
    nextBtnText: 'Próximo →',
    prevBtnText: '← Anterior',
    doneBtnText: 'Concluir',
    overlayOpacity: 0.75,
    stagePadding: 6,
    // Sair só pelo X (ou Concluir no fim): clique na área escura não faz nada,
    // e Esc/cliques que pediriam destroy são ignorados no meio do tour.
    overlayClickBehavior: () => {},
    onDestroyStarted: () => {
      if (!d.hasNextStep()) d.destroy()
    },
    onCloseClick: () => d.destroy(),
    steps: [
      PASSO_BOAS_VINDAS,
      ...(desktop ? PASSOS_MENU_DESKTOP : [PASSO_MENU_MOBILE]),
      ...PASSOS_FINAIS,
    ],
  })
  d.drive()
}
