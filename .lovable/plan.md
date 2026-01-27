
# Plano: Detectar Conteúdo Suspeito em URLs

## Problema
Páginas de destino podem ser hackeadas ou ter seu conteúdo alterado sem que o gestor perceba. A URL retorna código 200 (OK), mas o conteúdo não tem nada a ver com o cliente/produto.

Exemplo real: `https://mkt.jamsoft.com.br/` mostra conteúdo completamente diferente do esperado para o cliente.

## Solução Proposta
Adicionar um novo status de validação **"suspicious"** (suspeito) que usa IA para comparar o conteúdo da página com o briefing/perfil do cliente.

---

## Resumo das Alterações

| Componente | Alteração |
|------------|-----------|
| Banco de Dados | Novos campos para análise de conteúdo |
| Edge Function | Análise via Firecrawl + OpenAI |
| Hook useRadarUrls | Suporte ao novo status |
| UI (KPI, Cards, Tabela) | Exibição de URLs suspeitas |

---

## 1. Alterações no Banco de Dados

Novos campos na tabela `client_urls`:

```sql
ALTER TABLE client_urls ADD COLUMN IF NOT EXISTS content_match_score numeric;
ALTER TABLE client_urls ADD COLUMN IF NOT EXISTS content_analysis_summary text;
ALTER TABLE client_urls ADD COLUMN IF NOT EXISTS content_analyzed_at timestamptz;
```

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `content_match_score` | numeric | Score de 0-100 de compatibilidade com o briefing |
| `content_analysis_summary` | text | Resumo da análise da IA |
| `content_analyzed_at` | timestamptz | Quando foi analisado |

---

## 2. Nova Edge Function: `analyze-url-content`

Função separada da validação básica (mais lenta e consome créditos de IA).

### Fluxo:
1. Recebe URL + client_id
2. Busca o `ai_briefing` do cliente
3. Usa Firecrawl para extrair conteúdo em markdown (formato limpo)
4. Envia para OpenAI comparar com o briefing
5. Retorna score (0-100) e resumo

### Critérios de Análise:
- **Score 80-100**: Conteúdo compatível (OK)
- **Score 50-79**: Conteúdo parcialmente compatível (aviso)
- **Score 0-49**: Conteúdo suspeito/incompatível (alerta)

### Prompt para OpenAI:
```text
Você é um analista de segurança de marketing digital.

BRIEFING DO CLIENTE:
{ai_briefing}

CONTEÚDO DA PÁGINA:
{page_content}

Analise se o conteúdo da página é compatível com o briefing do cliente.
Considere:
1. O conteúdo fala sobre o mesmo produto/serviço?
2. A linguagem/tom está adequada ao cliente?
3. Há sinais de hacking (conteúdo de apostas, farmácias, spam)?
4. Os elementos visuais descritos fazem sentido para o negócio?

Responda em JSON:
{
  "score": 0-100,
  "compatible": true/false,
  "summary": "Resumo em 1-2 frases",
  "issues": ["lista de problemas encontrados"]
}
```

---

## 3. Atualização do Hook `useRadarUrls`

### Novo tipo de status:
```typescript
export type ValidationStatus = 'ok' | 'error' | 'timeout' | 'redirect' | 'pending' | 'empty' | 'suspicious' | null;
```

### Novos campos na interface:
```typescript
export interface RadarUrl {
  // ... campos existentes
  content_match_score: number | null;
  content_analysis_summary: string | null;
  content_analyzed_at: string | null;
}
```

### Novas estatísticas:
```typescript
export interface UrlStats {
  // ... existentes
  suspicious: number;
}
```

### Nova mutation para análise de conteúdo:
```typescript
analyzeContent: (urlId: string) => void
analyzeAllContent: () => void
```

---

## 4. Atualizações de UI

### KPI Header
Novo card "Suspeitas" com ícone `ShieldAlert` em cor laranja/vermelho.

### Novo Card: `SuspiciousUrlsCard.tsx`
Similar ao ProblematicUrlsCard, mas para URLs suspeitas:
- Mostra cliente + URL
- Score de compatibilidade
- Resumo da análise
- Botão para reanalisar

### Badge na Tabela
```typescript
case 'suspicious':
  return (
    <Badge variant="outline" className="text-orange-600 border-orange-600">
      <ShieldAlert className="h-2.5 w-2.5 mr-0.5" />
      Suspeito
    </Badge>
  );
```

### Tooltip com Detalhes
Ao passar o mouse no badge, mostrar:
- Score de compatibilidade
- Resumo da análise
- Data da última análise

### Novo Filtro
Adicionar "Suspeito" no dropdown de filtros de status.

---

## 5. Botão de Ação Manual

Como a análise de conteúdo consome créditos (Firecrawl + OpenAI), não será automática. Adicionar:

1. **Botão individual** em cada URL: "Analisar Conteúdo"
2. **Botão global** no dashboard: "Analisar Conteúdo de Todas"
3. **Indicador** de quais URLs nunca foram analisadas

---

## 6. Dependências Necessárias

1. **Firecrawl** - Já configurado (FIRECRAWL_API_KEY)
2. **OpenAI** - Precisa verificar/adicionar OPENAI_API_KEY

---

## Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `supabase/functions/analyze-url-content/index.ts` | Criar |
| `src/hooks/useRadarUrls.tsx` | Modificar |
| `src/components/radar/UrlsKPIHeader.tsx` | Modificar |
| `src/components/radar/SuspiciousUrlsCard.tsx` | Criar |
| `src/components/radar/UrlsTable.tsx` | Modificar |
| `src/pages/radar/RadarUrlsDashboard.tsx` | Modificar |
| `supabase/config.toml` | Adicionar função |
| Migration SQL | Adicionar colunas |

---

## Fluxo Visual

```text
┌─────────────────────────────────────────────────────────────┐
│                    ANÁLISE DE CONTEÚDO                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  1. Buscar ai_briefing do cliente                           │
│     (tabela clients)                                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  2. Scrape da URL via Firecrawl                             │
│     (formato: markdown)                                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  3. Enviar para OpenAI                                       │
│     briefing + conteúdo → análise                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  4. Atualizar client_urls                                    │
│     - content_match_score                                    │
│     - content_analysis_summary                               │
│     - validation_status = 'suspicious' se score < 50        │
└─────────────────────────────────────────────────────────────┘
```

---

## Considerações de Custo

| Serviço | Consumo por URL |
|---------|-----------------|
| Firecrawl | 1 crédito (scrape) |
| OpenAI GPT-4o-mini | ~500-1000 tokens |

Recomendação: Analisar apenas URLs que:
- Já passaram na validação básica (status = 'ok')
- Têm cliente com `ai_briefing` preenchido
- Não foram analisadas nos últimos 7 dias

---

## Benefícios

- Detecta páginas hackeadas/comprometidas automaticamente
- Alerta proativo antes de gastar verba em landing pages incorretas
- Histórico de análises para auditoria
- Score numérico permite priorização
