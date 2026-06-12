-- Preferência por psicóloga: consultas com status FALTA entram (ou não) na
-- cobrança. Default true preserva o comportamento histórico (no-show cobrado).
alter table psicologa
    add column cobrar_faltas boolean not null default true;
