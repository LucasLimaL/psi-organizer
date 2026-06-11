-- O template do lembrete é registrado e aprovado na plataforma da Meta (HSM) —
-- não é editável pela psicóloga. A coluna era vestigial: o envio real sempre usou
-- psi.whatsapp.template-lembrete-nome + parâmetros {{1}}..{{4}} renderizados.
ALTER TABLE configuracao_whatsapp DROP COLUMN template_mensagem;
