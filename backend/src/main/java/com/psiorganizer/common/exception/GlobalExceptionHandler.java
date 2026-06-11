package com.psiorganizer.common.exception;

import java.util.HashMap;
import java.util.Map;

import jakarta.servlet.http.HttpServletRequest;

import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

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
        return ResponseEntity.status(ex.getStatus()).body(new ErrorBody(ex.getMessage(), null));
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

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorBody> handleGeneric(Exception ex, HttpServletRequest request) {
        MDC.put(LogFields.ERROR_CLASS, ex.getClass().getSimpleName());
        MDC.put(LogFields.ERROR_MESSAGE, String.valueOf(ex.getMessage()));
        // Atribui pro RequestLog logar com stack — política em docs/OBSERVABILITY.md
        request.setAttribute(LogFields.UNHANDLED_EXCEPTION_ATTR, ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorBody("Erro interno: " + ex.getMessage(), null));
    }
}
