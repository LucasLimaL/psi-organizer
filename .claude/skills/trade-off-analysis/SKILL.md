---
name: trade-off-analysis
description: Força apresentação explícita de trade-offs antes de recomendar uma decisão arquitetural ou de produto. Útil quando há 2-4 opções viáveis e o usuário pede "o que acha?". Produz tabela de prós/contras/quando-usar/custo-de-migrar + recomendação opinada com critério.
disable-model-invocation: true
---

# trade_off_analysis

Objetivo: trocar respostas "eu acho que X" por análises com **critério explícito**, no formato de mini-ADR (Architecture Decision Record). Reduz arrependimento futuro porque a decisão fica documentável.

## Argumentos

| Arg | Obrigatório? | Descrição |
|---|---|---|
| `problema` | sim | 1 frase: o que precisa decidir e qual é o contexto |
| `opcoes` | sim | 2 a 4 opções viáveis (texto livre, separadas por `|` ou enumeradas) |
| `eixos` | não | Eixos de comparação adicionais. Default: complexidade, custo de migração, reversibilidade, performance, segurança |

## Quando usar

✅ Usar quando:
- Você está prestes a recomendar uma arquitetura/biblioteca/abordagem com efeito de longo prazo
- O user pergunta "o que acha?" ou "pros e contras de X?"
- Há ambiguidade real (não decisão óbvia)
- A decisão será replicada (ex: padrão de pasta, escolha de stack)

❌ Não usar pra:
- Decisões reversíveis sem custo (nome de variável, ordem de campos)
- Quando a resposta é objetivamente conhecida (ex: "qual versão estável do MUI?")
- Quando o user já decidiu e só pediu execução

## Estrutura de saída

```markdown
## Decisão: <problema em 1 frase>

### Opções avaliadas

#### Opção A — <nome>
- **Prós** (3-5 bullets):
- **Contras** (3-5 bullets):
- **Quando usar**: <1 frase de cenário ideal>
- **Custo de migrar pra outra opção depois**: <baixo | médio | alto> — <razão>

#### Opção B — <nome>
...

[3-4 opções no máximo]

### Eixos de comparação

| Eixo | A | B | C |
|---|---|---|---|
| Complexidade de implementar | <baixa/média/alta> | ... | ... |
| Custo de migrar depois | ... | ... | ... |
| Reversibilidade | ... | ... | ... |
| Performance | ... | ... | ... |
| Segurança | ... | ... | ... |
[+ eixos custom passados em `eixos`]

### Recomendação

**<opção> porque <critério-chave>.**

<1-2 parágrafos explicando o tradeoff aceito e o que **não** ganhamos com essa escolha.>

### Se a recomendação estiver errada…

<O que mudaria se eu reavaliasse em 6 meses? Quais sinais indicariam que precisamos rever?>

### Registrar?

Quer que eu adicione esta decisão em `docs/SPEC.md` §10 como linha numa tabela?
```

## Diretrizes

- **Honestidade brutal**: se uma opção é claramente pior, marca como tal — não force equilíbrio artificial. Mas explique o motivo (não "é pior", e sim "viola princípio X").
- **Não inventar contras**: se uma opção tem 5 prós e 1 contra, está OK ter 1 contra. Não preenche tabela por simetria.
- **Custo de migrar depois é o eixo mais importante** — destaque-o. "Errar pra opção mais reversível" é frequentemente o jogo certo.
- **Citar fonte** quando souber: "Padrão usado em [projeto]/[ADR popular]/[livro]". Se for opinião pessoal, marcar como tal.
- **Recomendação sempre opinada**, não "depende". Se realmente depende de algo que o user não disse, perguntar — não falar "depende".
- **"Se estiver errada"**: essa seção é o que separa análise de palpite. Sempre incluir.

## Restrições

- Saída em pt-BR.
- Manter 3-4 opções no máximo (5+ vira ruído).
- Não usar pra decisão já tomada — só pra decisão **aberta** no momento.
- Não modificar arquivo nenhum sem aprovação. A pergunta final ("Quer que eu registre?") é só pra registrar a decisão; sem confirmação, não toca em SPEC.
