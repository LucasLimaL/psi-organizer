package com.psiorganizer.common.exception;

import java.util.HashMap;
import java.util.Map;

import jakarta.servlet.http.HttpServletRequest;

import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import com.psiorganizer.common.observability.LogFields;

/**
 * Enriquece o MDC com info de erro pro RequestLoggingFilter incluir no completion
 * log. NÃO emite log próprio — política "1 log por ação" descrita em
 * docs/OBSERVABILITY.md.
 *
 * Pra 5xx, atribui a exception ao request attribute UNHANDLED_EXCEPTION_ATTR — o
 * RequestLoggingFilter usa pra logar com stack trace.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    public record ErrorBody(String erro, Object detalhes) {}

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ErrorBody> handleApi(ApiException ex) {
        MDC.put(LogFields.ERROR_CLASS, ex.getClass().getSimpleName());
        MDC.put(LogFields.ERROR_MESSAGE, String.valueOf(ex.getMessage()));
        return ResponseEntity.status(ex.getStatus())
                .body(new ErrorBody(ex.getMessage(), ex.getDetalhes()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorBody> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> detalhes = new HashMap<>();
        ex.getBindingResult().getFieldErrors().forEach(fe ->
                detalhes.put(fe.getField(), fe.getDefaultMessage()));
        MDC.put(LogFields.ERROR_CLASS, "ValidationException");
        MDC.put(LogFields.VALIDATION_FIELDS, detalhes.keySet().toString());
        return ResponseEntity.badRequest().body(new ErrorBody("Requisição inválida", detalhes));
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ErrorBody> handleParametroAusente(MissingServletRequestParameterException ex) {
        MDC.put(LogFields.ERROR_CLASS, ex.getClass().getSimpleName());
        MDC.put(LogFields.ERROR_MESSAGE, "parâmetro ausente: " + ex.getParameterName());
        return ResponseEntity.badRequest()
                .body(new ErrorBody("Parâmetro obrigatório ausente: " + ex.getParameterName(), null));
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ErrorBody> handleParametroInvalido(MethodArgumentTypeMismatchException ex) {
        MDC.put(LogFields.ERROR_CLASS, ex.getClass().getSimpleName());
        MDC.put(LogFields.ERROR_MESSAGE, "parâmetro inválido: " + ex.getName());
        return ResponseEntity.badRequest()
                .body(new ErrorBody("Parâmetro inválido: " + ex.getName(), null));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorBody> handleBodyIlegivel(HttpMessageNotReadableException ex) {
        MDC.put(LogFields.ERROR_CLASS, ex.getClass().getSimpleName());
        MDC.put(LogFields.ERROR_MESSAGE, "body ilegível/malformado");
        return ResponseEntity.badRequest()
                .body(new ErrorBody("Corpo da requisição inválido ou malformado", null));
    }

    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<ErrorBody> handleMediaType(HttpMediaTypeNotSupportedException ex) {
        MDC.put(LogFields.ERROR_CLASS, ex.getClass().getSimpleName());
        MDC.put(LogFields.ERROR_MESSAGE, "content-type não suportado");
        return ResponseEntity.status(HttpStatus.UNSUPPORTED_MEDIA_TYPE)
                .body(new ErrorBody("Content-Type não suportado — use application/json", null));
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ErrorBody> handleAuth(AuthenticationException ex) {
        MDC.put(LogFields.ERROR_CLASS, ex.getClass().getSimpleName());
        MDC.put(LogFields.ERROR_MESSAGE, String.valueOf(ex.getMessage()));
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(new ErrorBody("Não autorizado", null));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorBody> handleAccessDenied(AccessDeniedException ex) {
        MDC.put(LogFields.ERROR_CLASS, ex.getClass().getSimpleName());
        MDC.put(LogFields.ERROR_MESSAGE, String.valueOf(ex.getMessage()));
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(new ErrorBody("Acesso negado", null));
    }

    /**
     * Catch-all de exceção não mapeada. O detalhe fica TODO no log (ERROR +
     * stack via RequestLoggingFilter) — o cliente recebe mensagem genérica
     * com o requestId pra correlação com os logs. Nunca devolver
     * ex.getMessage(): vaza detalhe interno (classe, SQL, mensagem do Spring).
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorBody> handleGeneric(Exception ex, HttpServletRequest request) {
        MDC.put(LogFields.ERROR_CLASS, ex.getClass().getSimpleName());
        MDC.put(LogFields.ERROR_MESSAGE, String.valueOf(ex.getMessage()));
        // Atribui pro RequestLog logar com stack — política em docs/OBSERVABILITY.md
        request.setAttribute(LogFields.UNHANDLED_EXCEPTION_ATTR, ex);
        String requestId = MDC.get(LogFields.REQUEST_ID);
        String mensagem = requestId == null
                ? "Erro interno inesperado. Tente novamente em instantes."
                : "Erro interno inesperado. Tente novamente em instantes; se persistir, "
                        + "informe o código " + requestId + " ao suporte.";
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorBody(mensagem,
                        requestId == null ? null : Map.of("requestId", requestId)));
    }
}
