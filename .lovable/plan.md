

## Enquetes via UazapiGO + Templates de Enquete

### Pesquisa realizada

A API do UazapiGO, sendo baseada na mesma stack de bibliotecas WhatsApp multi-device (whatsmeow/Baileys), suporta o envio de enquetes (polls). O endpoint padrao e `POST /message/send-poll` com o seguinte payload:

```text
{
  "phone": "groupJid@g.us",
  "poll": {
    "name": "Texto da pergunta",
    "options": ["Opcao 1", "Opcao 2", "Opcao 3"],
    "selectableCount": 1
  }
}
```

Onde `selectableCount` define quantas opcoes o usuario pode selecionar (1 = selecao unica, N = multipla escolha).

---

### O que sera implementado

**1. Novo tipo de template: POLL (Enquete)**

Adicionar a categoria `POLL` ao sistema de templates existente. O template de enquete tera:
- Titulo (como todo template)
- Pergunta da enquete (campo `body` existente)
- Opcoes de resposta (array de strings, armazenado no campo `constraints_json` ja existente)
- Selecao unica ou multipla (`selectableCount`)
- Suporte a Variante A/B (pergunta alternativa com opcoes diferentes)

**2. UI do formulario de template**

Quando a categoria `POLL` for selecionada no formulario de criacao/edicao:
- O campo "Mensagem" se torna "Pergunta da Enquete"
- Aparece um bloco de opcoes (minimo 2, maximo 12) com botoes de adicionar/remover
- Toggle para "Multipla Escolha" (selectableCount > 1)
- Preview no estilo WhatsApp mostrando como a enquete aparecera

**3. Preview WhatsApp para enquetes**

O mini-preview e o modal de preview exibirao um mockup visual da enquete no estilo nativo do WhatsApp, com a pergunta e as opcoes de voto.

**4. Envio via Edge Function**

Atualizar a `groupops-campaign-cron` para detectar templates do tipo POLL e usar o endpoint `/message/send-poll` em vez de `/message/send-text`.

---

### Detalhes tecnicos

**Banco de dados**: Nenhuma alteracao de schema necessaria. O campo `constraints_json` (jsonb) ja existe na tabela `groupops_templates` e sera usado para armazenar:
```text
{
  "poll_options": ["Opcao 1", "Opcao 2", "Opcao 3"],
  "selectable_count": 1
}
```

**Arquivos a modificar**:

| Arquivo | Alteracao |
|---|---|
| `src/hooks/useGroupOpsTemplates.ts` | Adicionar `POLL` a `TEMPLATE_CATEGORIES` |
| `src/components/groupops/GroupOpsTemplatesList.tsx` | Formulario condicional para enquetes (opcoes, selectableCount), preview de enquete |
| `supabase/functions/groupops-campaign-cron/index.ts` | Logica de envio: se template.category === 'POLL', usar `/message/send-poll` com payload adequado |

**Fluxo de envio na edge function**:
```text
if (template.category === "POLL") {
  const pollData = template.constraints_json;
  await fetch(`${endpoint}/message/send-poll`, {
    method: "POST",
    headers: { "Content-Type": "application/json", token },
    body: JSON.stringify({
      phone: groupJid,
      poll: {
        name: messageBody,  // pergunta com placeholders preenchidos
        options: pollData.poll_options,
        selectableCount: pollData.selectable_count || 1
      }
    })
  });
}
```

**Nota importante**: O endpoint exato (`/message/send-poll`) precisara ser validado contra sua instancia UazapiGO. Caso o path seja diferente (ex: `/chat/sendPoll`), sera necessario apenas ajustar a URL na edge function.

