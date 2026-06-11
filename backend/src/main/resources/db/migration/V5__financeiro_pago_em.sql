-- Financeiro: data em que a consulta foi marcada como paga.
-- NULL para consultas pagas antes desta migração (data real desconhecida)
-- e para consultas não pagas. A aba financeiro opera por competência
-- (mês da consulta); pago_em fica registrado pra viabilizar visão de
-- caixa no futuro sem buraco no histórico daqui pra frente.
ALTER TABLE consulta ADD COLUMN pago_em TIMESTAMP;
