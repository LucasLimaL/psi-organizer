package com.psiorganizer.whatsapp;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.google.i18n.phonenumbers.NumberParseException;
import com.google.i18n.phonenumbers.PhoneNumberUtil;
import com.google.i18n.phonenumbers.Phonenumber.PhoneNumber;
import com.psiorganizer.consulta.Consulta;
import com.psiorganizer.paciente.Paciente;
import com.psiorganizer.paciente.PacienteRepository;
import com.psiorganizer.psicologa.Psicologa;
import com.psiorganizer.psicologa.PsicologaRepository;
import com.psiorganizer.whatsapp.client.EnvioResultado;
import com.psiorganizer.whatsapp.client.WhatsappClient;
import com.psiorganizer.whatsapp.client.WhatsappException;
import com.psiorganizer.whatsapp.client.WhatsappProperties;

/**
 * Disparo de lembrete de 1 consulta. Encapsula:
 *   - Skip rules (opt-in, telefone E.164 válido, paciente ativo)
 *   - Insert idempotente via UNIQUE(consulta_id) + ON CONFLICT DO NOTHING
 *   - Render dos 4 parâmetros do template aprovado pela Meta
 *   - Chamada Meta + atualização de status_entrega / mensagem_id_externa
 *   - Logs estruturados por evento
 *
 * NÃO faz scheduling — quem chama é o LembreteScheduler (cron horário) e, no futuro,
 * podemos disparar manualmente via outro endpoint pra testes.
 */
@Service
public class LembreteEnvioService {

    private static final Logger log = LoggerFactory.getLogger(LembreteEnvioService.class);

    private static final ZoneId ZONA_BR = ZoneId.of("America/Sao_Paulo");
    private static final DateTimeFormatter DATA_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter HORA_FMT = DateTimeFormatter.ofPattern("HH:mm");

    private static final PhoneNumberUtil PHONE_UTIL = PhoneNumberUtil.getInstance();

    private final LembreteEnviadoRepository lembreteRepo;
    private final PacienteRepository pacienteRepo;
    private final PsicologaRepository psicologaRepo;
    private final WhatsappClient whatsappClient;
    private final WhatsappProperties props;

    public LembreteEnvioService(LembreteEnviadoRepository lembreteRepo,
                                PacienteRepository pacienteRepo,
                                PsicologaRepository psicologaRepo,
                                WhatsappClient whatsappClient,
                                WhatsappProperties props) {
        this.lembreteRepo = lembreteRepo;
        this.pacienteRepo = pacienteRepo;
        this.psicologaRepo = psicologaRepo;
        this.whatsappClient = whatsappClient;
        this.props = props;
    }

    /**
     * Tenta enviar lembrete da consulta. Aplica skip rules antes da inserção e da
     * chamada Meta. Retorna o LembreteEnviado persistido (com status_entrega final)
     * ou Optional.empty se pulou — seja por skip rule ou por idempotência (outro
     * worker já criou).
     */
    @Transactional
    public Optional<LembreteEnviado> enviar(Consulta consulta) {
        Paciente paciente = pacienteRepo.findById(consulta.getPacienteId()).orElse(null);
        if (paciente == null) {
            log.warn("[lembrete] paciente sumiu consulta={} pacienteId={}",
                    consulta.getId(), consulta.getPacienteId());
            return Optional.empty();
        }
        if (!paciente.isAtivo()) {
            log.info("[lembrete-pulado] motivo=paciente_inativo consulta={} paciente={} psi={}",
                    consulta.getId(), paciente.getId(), consulta.getPsicologaId());
            return Optional.empty();
        }
        if (!paciente.isOptInWhatsapp()) {
            log.info("[lembrete-pulado] motivo=opt_in_ausente consulta={} paciente={} psi={}",
                    consulta.getId(), paciente.getId(), consulta.getPsicologaId());
            return Optional.empty();
        }
        String telefoneE164 = normalizarE164(paciente.getTelefone());
        if (telefoneE164 == null) {
            log.info(
                    "[lembrete-pulado] motivo=telefone_invalido consulta={} paciente={} psi={} telefone={}",
                    consulta.getId(), paciente.getId(), consulta.getPsicologaId(),
                    paciente.getTelefone());
            return Optional.empty();
        }

        // Insert idempotente. Se outro worker já criou, desistimos sem chamar Meta.
        UUID lembreteId = UUID.randomUUID();
        int inseridas = lembreteRepo.inserirSeNaoExiste(
                lembreteId, consulta.getId(), consulta.getPsicologaId());
        if (inseridas == 0) {
            log.debug("[lembrete] já existia pra consulta={}, pulando", consulta.getId());
            return Optional.empty();
        }

        LembreteEnviado le = lembreteRepo.findByConsultaId(consulta.getId()).orElseThrow();

        Psicologa psi = psicologaRepo.findById(consulta.getPsicologaId()).orElseThrow();
        List<String> parametros = renderParametros(paciente, psi, consulta);

        try {
            EnvioResultado r = whatsappClient.enviarTemplate(
                    telefoneE164,
                    props.templateLembreteNome(),
                    props.templateLembreteIdioma(),
                    parametros);
            le.setMensagemIdExterna(r.mensagemIdExterna());
            le.setStatusEntrega(StatusEntrega.ENVIADO);
            le.setEnviadoEm(Instant.now());
            log.info(
                    "[lembrete-enviado] consulta={} paciente={} psi={} wamid={} template={}",
                    consulta.getId(), paciente.getId(), psi.getId(),
                    r.mensagemIdExterna(), props.templateLembreteNome());
        } catch (WhatsappException e) {
            le.setStatusEntrega(StatusEntrega.FALHOU);
            le.setErroCodigo(e.getCodigo());
            le.setErroDescricao(truncar(e.getMessage(), 1000));
            log.warn(
                    "[lembrete-falhou] consulta={} paciente={} psi={} codigo={} transitorio={}",
                    consulta.getId(), paciente.getId(), psi.getId(),
                    e.getCodigo(), e.isTransitorio());
        }

        return Optional.of(lembreteRepo.save(le));
    }

    /**
     * Renderiza os 4 parâmetros do template aprovado pela Meta:
     *   {{1}} = primeiro nome da paciente (mais natural na saudação)
     *   {{2}} = nome completo da psi (normalmente já vem com "Dra.")
     *   {{3}} = data dd/MM/yyyy em SP
     *   {{4}} = hora HH:mm em SP
     */
    private List<String> renderParametros(Paciente paciente, Psicologa psi, Consulta consulta) {
        LocalDateTime inicioSp = LocalDateTime.ofInstant(consulta.getInicio(), ZONA_BR);
        return List.of(
                primeiroNome(paciente.getNome()),
                psi.getNomeCompleto(),
                inicioSp.format(DATA_FMT),
                inicioSp.format(HORA_FMT));
    }

    private String primeiroNome(String completo) {
        if (completo == null) return "";
        String[] partes = completo.trim().split("\\s+");
        return partes.length > 0 ? partes[0] : completo;
    }

    /**
     * Aceita telefone em E.164 ou em formato livre BR e devolve E.164 com '+'.
     * Retorna null se libphonenumber não considerar válido (igual à @TelefoneE164
     * usada no PacienteRequest, mas aqui sem lançar exceção — porque o spec manda
     * pular pacientes inválidas silenciosamente, com log).
     */
    private String normalizarE164(String entrada) {
        if (entrada == null || entrada.isBlank()) return null;
        try {
            PhoneNumber n = PHONE_UTIL.parse(entrada, "BR");
            if (!PHONE_UTIL.isValidNumber(n)) return null;
            return PHONE_UTIL.format(n, PhoneNumberUtil.PhoneNumberFormat.E164);
        } catch (NumberParseException e) {
            return null;
        }
    }

    private String truncar(String s, int max) {
        if (s == null) return null;
        return s.length() <= max ? s : s.substring(0, max);
    }
}
