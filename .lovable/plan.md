
# Plano: Modo de Análise em Tempo Real do Assistente de IA

## Visão Geral

Implementar um novo modo no Assistente de IA do WhatsApp que analisa automaticamente cada nova mensagem (enviada ou recebida) da conversa, fornecendo feedback em tempo real sobre:

- **Contexto e Interpretação**: O que o cliente está querendo dizer
- **Temperatura da Conversa**: Se está indo bem, neutro ou negativo
- **Sugestões de Resposta**: O que você deveria falar a seguir
- **Insights Específicos**: Baseados no tipo de departamento configurado (vendas, pós-venda, suporte, etc.)

---

## Como Vai Funcionar

1. **Toggle para Ativar/Desativar**: Um switch no painel do Assistente IA para ligar o modo "Análise em Tempo Real"

2. **Análise Automática**: Quando ativado, toda nova mensagem (recebida ou enviada) dispara automaticamente uma análise da IA

3. **Feedback Estruturado**: A IA retorna cards de análise com:
   - Temperatura (emoji + cor indicativa)
   - Interpretação do cliente
   - Sugestões contextuais
   - Alertas se necessário

4. **Contexto por Departamento**: A análise é adaptada ao tipo de atendimento configurado:
   - **Vendas**: Foco em sinais de compra, objeções, oportunidades de fechamento
   - **Pós-Venda**: Satisfação, retenção, upsell
   - **Suporte Técnico**: Urgência, complexidade do problema
   - **Financeiro**: Inadimplência, negociação
   - **Atendimento Geral**: Resolutividade, cordialidade

---

## Fluxo Visual

```text
┌─────────────────────────────────────────────────────────────────┐
│                    Painel do Assistente IA                       │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  ⚡ Análise em Tempo Real    [═══════○] Ativado        │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 🟢 TEMPERATURA: Positiva                                │    │
│  │ ─────────────────────────────────────────────────────── │    │
│  │ 📋 INTERPRETAÇÃO:                                       │    │
│  │ O cliente demonstrou interesse no produto e está        │    │
│  │ buscando informações sobre preço e condições.           │    │
│  │ ─────────────────────────────────────────────────────── │    │
│  │ 💡 SUGESTÃO:                                            │    │
│  │ Apresente as opções de pagamento e destaque os          │    │
│  │ benefícios exclusivos. Bom momento para avançar.        │    │
│  │ ─────────────────────────────────────────────────────── │    │
│  │ 🎯 INSIGHT (VENDAS):                                    │    │
│  │ Cliente em fase de consideração. Sinal de compra        │    │
│  │ detectado. Evite prolongar - apresente proposta.        │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  [Chat normal continua abaixo...]                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Componentes a Serem Criados/Modificados

### 1. Novo Componente: Card de Análise em Tempo Real
Exibe a análise estruturada com temperatura, interpretação, sugestões e insights.

### 2. Modificar: Painel do Assistente IA
Adicionar:
- Toggle para ativar/desativar modo análise
- Área para exibir o card de análise
- Indicador de "analisando..." durante processamento

### 3. Modificar: Hook de Mensagens
Detectar novas mensagens em tempo real e disparar a análise automaticamente.

### 4. Modificar: Edge Function
Adicionar modo de análise com prompt especializado que retorna dados estruturados.

### 5. Novo Hook: useRealtimeAnalysis
Gerenciar o estado do modo de análise e processar mensagens.

---

## Detalhes Técnicos

### Estrutura do Prompt de Análise

O sistema montará um prompt dinâmico baseado no departamento configurado:

```
Para um agente de VENDAS:
- Foco em: identificar sinais de compra, objeções, interesse, urgência
- Métricas: probabilidade de conversão, estágio do funil

Para SUPORTE TÉCNICO:
- Foco em: gravidade do problema, frustração do cliente, complexidade
- Métricas: SLA, necessidade de escalação

Para PÓS-VENDA:
- Foco em: satisfação, risco de churn, oportunidades de upsell
- Métricas: NPS implícito, fidelização
```

### Resposta Estruturada da IA

A Edge Function retornará JSON estruturado:

```json
{
  "temperature": "positive" | "neutral" | "negative",
  "interpretation": "O cliente está...",
  "suggestion": "Você deveria...",
  "departmentInsight": {
    "type": "vendas",
    "insight": "Sinal de compra detectado...",
    "actionItems": ["Apresentar proposta", "Não demorar"]
  },
  "alerts": ["Cliente mencionou prazo urgente"]
}
```

### Fluxo de Dados

1. Nova mensagem chega (via Realtime do Supabase)
2. Se modo análise ativo, dispara chamada à Edge Function
3. Edge Function monta prompt com:
   - Últimas N mensagens da conversa
   - Configuração do agente (departamento, objetivos)
   - Instrução para análise estruturada
4. Retorna análise em JSON
5. Frontend renderiza card de análise

### Persistência (Opcional)

O estado "modo análise ativo" pode ser:
- Apenas em memória (resetado ao fechar)
- Salvo por conversa no banco

---

## Arquivos a Serem Modificados

| Arquivo | Ação |
|---------|------|
| `src/components/whatsapp/WhatsAppAIAssistant.tsx` | Adicionar toggle e área de análise |
| `src/hooks/useWhatsAppAIAgentConfig.tsx` | Buscar config do departamento |
| `supabase/functions/whatsapp-ai-assistant/index.ts` | Adicionar modo "analyze" |
| Novo: `src/components/whatsapp/WhatsAppRealtimeAnalysisCard.tsx` | Card de análise |
| Novo: `src/hooks/useWhatsAppRealtimeAnalysis.tsx` | Lógica do modo análise |

---

## Benefícios

- **Para Vendas**: Identifica oportunidades e evita perder timing de fechamento
- **Para Suporte**: Alerta sobre clientes frustrados que precisam de atenção especial
- **Para Pós-Venda**: Detecta riscos de churn e oportunidades de fidelização
- **Para Financeiro**: Auxilia em negociações sensíveis
- **Geral**: Funciona como um "gestor virtual" acompanhando o atendimento

---

## Resultado Esperado

O atendente terá um painel inteligente que funciona como um coach em tempo real, dando feedback instantâneo sobre cada interação e orientando as melhores ações baseado no contexto e no tipo de atendimento configurado.
