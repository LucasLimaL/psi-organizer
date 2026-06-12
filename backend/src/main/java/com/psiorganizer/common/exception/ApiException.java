package com.psiorganizer.common.exception;

import org.springframework.http.HttpStatus;

public class ApiException extends RuntimeException {
    private final HttpStatus status;
    /** Payload extra em `detalhes` no envelope de erro (ex.: motivo estruturado). */
    private final transient Object detalhes;

    public ApiException(HttpStatus status, String mensagem) {
        this(status, mensagem, null);
    }

    public ApiException(HttpStatus status, String mensagem, Object detalhes) {
        super(mensagem);
        this.status = status;
        this.detalhes = detalhes;
    }

    public HttpStatus getStatus() { return status; }

    public Object getDetalhes() { return detalhes; }

    public static ApiException naoAutorizado(String mensagem, Object detalhes) {
        return new ApiException(HttpStatus.UNAUTHORIZED, mensagem, detalhes);
    }

    public static ApiException naoEncontrado(String mensagem) {
        return new ApiException(HttpStatus.NOT_FOUND, mensagem);
    }

    public static ApiException conflito(String mensagem) {
        return new ApiException(HttpStatus.CONFLICT, mensagem);
    }

    public static ApiException naoAutorizado(String mensagem) {
        return new ApiException(HttpStatus.UNAUTHORIZED, mensagem);
    }

    public static ApiException proibido(String mensagem) {
        return new ApiException(HttpStatus.FORBIDDEN, mensagem);
    }

    public static ApiException requisicaoInvalida(String mensagem) {
        return new ApiException(HttpStatus.BAD_REQUEST, mensagem);
    }
}
