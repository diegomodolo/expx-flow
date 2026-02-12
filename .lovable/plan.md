

# Ajustar IA para Distinguir Problemas Internos vs. Externos

## Problema

Quando o cliente reclama de um problema que nao e responsabilidade da sua empresa (ex: bug de um parceiro/fornecedor), a IA interpreta como atendimento ruim e da nota baixa. A IA precisa ser inteligente o suficiente para entender o contexto e so penalizar a nota quando o problema for de responsabilidade da sua empresa.

## Solucao

Ajustar o prompt de analise na edge function `whatsapp-ai-assistant` para incluir instrucoes claras sobre como diferenciar problemas internos de externos, adicionando um novo campo no JSON de resposta e ajustando os criterios de nota.

## Mudancas

### 1. Edge Function `whatsapp-ai-assistant/index.ts`

Alterar a funcao `buildAnalysisPrompt` para:

**Adicionar instrucao de contexto de responsabilidade** no prompt, antes dos criterios de nota:

```
IMPORTANTE - CONTEXTO DE RESPONSABILIDADE:
Antes de avaliar, identifique se o problema mencionado pelo cliente:
a) E de responsabilidade da NOSSA empresa (nosso produto, nosso servico, nosso atendimento)
b) E de responsabilidade de TERCEIROS (parceiros, fornecedores, outras empresas, problemas pessoais do cliente)

Se o cliente estiver desabafando ou reclamando de problemas de TERCEIROS/PARCEIROS/FORNECEDORES que NAO sao da nossa empresa:
- A nota NAO deve ser penalizada por isso
- A temperature deve refletir o tom do ATENDIMENTO prestado, nao a frustacao do cliente com terceiros
- O atendente deve ser avaliado pela forma como acolheu e respondeu, nao pelo problema externo
```

**Adicionar novo campo no JSON de resposta**:
```
"issueContext": {
  "isOurResponsibility": true | false,
  "source": "interno" | "externo" | "misto",
  "explanation": "Breve explicacao de por que o problema e ou nao da nossa empresa (1 frase)"
}
```

**Ajustar criterios de nota** para incluir:
```
Criterios para a nota (score):
- A nota avalia EXCLUSIVAMENTE a qualidade do atendimento prestado pela NOSSA equipe
- Se o cliente reclama de problema de terceiro/parceiro/fornecedor, avalie apenas como o atendente lidou com a situacao (acolhimento, empatia, encaminhamento)
- NAO penalize a nota por problemas que nao sao de responsabilidade da empresa
- 0-3: Atendimento ruim (rude, confuso, nao resolve o que esta ao nosso alcance)
- 4-6: Atendimento regular (basico, pode melhorar)
- 7-8: Bom atendimento (cordial, claro, encaminha bem)
- 9-10: Excelente (supera expectativas, empatico, resolve rapido o que pode)
```

### Arquivo modificado
- `supabase/functions/whatsapp-ai-assistant/index.ts` - Prompt de analise atualizado

### Resultado esperado
Quando um cliente desabafar sobre problemas de parceiros ou terceiros, a IA vai:
1. Identificar que o problema nao e da sua empresa (`isOurResponsibility: false`)
2. Manter a nota baseada apenas na qualidade do atendimento prestado
3. Sugerir ao atendente como acolher o cliente sem assumir culpa

