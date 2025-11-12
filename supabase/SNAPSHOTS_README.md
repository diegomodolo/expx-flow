# Sistema de Snapshots Diários de Performance

## 📋 Visão Geral

Sistema implementado para coletar dados históricos diários de performance de campanhas, conjuntos de anúncios e anúncios do Facebook/Meta Ads. Isso permite que as automações avaliem métricas baseadas em janelas de tempo específicas (ex: últimos 30 dias) com dados precisos, ao invés de usar apenas dados acumulados.

## 🎯 Problema Resolvido

**Antes**: As automações usavam dados acumulados totais das tabelas `campaigns`, `ad_sets` e `ads`. Quando uma regra tinha uma janela de tempo de 30 dias, não havia como calcular métricas específicas desse período.

**Depois**: Dados diários são coletados automaticamente e armazenados em `performance_snapshots`. As automações agora podem calcular métricas agregadas de qualquer janela de tempo com precisão.

## 🏗️ Arquitetura

### 1. Tabela de Snapshots

**Tabela**: `performance_snapshots`

Armazena métricas diárias de performance:
- `entity_type`: 'campaign', 'ad_set', ou 'ad'
- `entity_id`: ID da entidade no banco
- `snapshot_date`: Data do snapshot (YYYY-MM-DD)
- `snapshot_period`: Sempre 'daily'
- Métricas: `spend`, `impressions`, `clicks`, `conversions`, `reach`, `ctr`, `cpc`, `cpa`, `frequency`

### 2. Edge Function: `daily-performance-snapshot`

**Localização**: `supabase/functions/daily-performance-snapshot/index.ts`

**Execução**: Diariamente às 0h (horário de Brasília)

**Processo**:
1. Calcula a data de "ontem" (dia anterior)
2. Busca todos os clientes ativos com `ad_account_id` e `access_token`
3. Para cada cliente:
   - Chama Facebook Graph API para campanhas do dia anterior
   - Chama Facebook Graph API para ad sets do dia anterior
   - Chama Facebook Graph API para ads do dia anterior
4. Para cada entidade:
   - Calcula métricas (CPA, CTR, CPC, etc.)
   - Insere snapshot na tabela `performance_snapshots`
5. Registra execução na tabela `snapshot_execution_log`

**Rate Limiting**:
- 100ms de delay entre inserções de snapshots
- 500ms de delay entre tipos de entidade
- 1000ms de delay entre clientes
- Tratamento de erros com retry

### 3. Automações Modificadas

**Arquivo**: `supabase/functions/execute-campaign-automations/index.ts`

**Mudança**: Função `evaluateConditionsWithTimeWindow` agora:
1. Detecta automaticamente o tipo de entidade (campaign, ad_set, ad)
2. Se `time_window_days > 1`:
   - Busca snapshots dos últimos X dias
   - Agrega métricas corretamente:
     - **Soma**: spend, conversions, clicks, impressions
     - **Média**: frequency
     - **Cálculo**: CPA = totalSpend / totalConversions
     - **Cálculo**: CTR = (totalClicks / totalImpressions) * 100
     - **Cálculo**: CPC = totalSpend / totalClicks
3. Se não houver snapshots, usa dados atuais (fallback)

### 4. Tabela de Log

**Tabela**: `snapshot_execution_log`

Registra cada execução do cron:
- Data de execução
- Status (running, completed, failed, partial)
- Contadores (clientes processados, snapshots criados, erros)
- Lista de mensagens de erro

## 📅 Cron Job

**Configuração**: `supabase/CONFIGURE_CRON.sql`

**Horário**: 3h UTC (0h horário de Brasília)

**Comando**:
```sql
SELECT cron.schedule(
  'daily-performance-snapshot',
  '0 3 * * *',
  $$ ... $$
);
```

## 🚀 Como Testar

### 1. Executar Manualmente a Função

```bash
# Via curl
curl -X POST \
  'https://ejwpfztkspbvmuwwiwmk.supabase.co/functions/v1/daily-performance-snapshot' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqd3BmenRrc3Bidm11d3dpd21rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwNTU3MDMsImV4cCI6MjA2OTYzMTcwM30.ffDBwGCtpR0h8oWp9dxk4PbznNzf7h-vnyhbAUyxFOQ' \
  -H 'Content-Type: application/json' \
  -d '{}'
```

### 2. Verificar Logs da Função

Acesse: https://supabase.com/dashboard/project/ejwpfztkspbvmuwwiwmk/functions/daily-performance-snapshot/logs

### 3. Consultar Snapshots Criados

```sql
-- Ver snapshots do dia de ontem
SELECT 
  entity_type,
  entity_name,
  snapshot_date,
  cpa,
  conversions,
  spend
FROM performance_snapshots
WHERE snapshot_date = CURRENT_DATE - INTERVAL '1 day'
ORDER BY entity_type, entity_name;

-- Ver log de execução
SELECT * 
FROM snapshot_execution_log 
ORDER BY started_at DESC 
LIMIT 5;
```

### 4. Testar Automação com Janela de Tempo

1. Acesse uma página de automações de cliente
2. Localize uma automação com `time_window_days > 1` (ex: 30 dias)
3. Clique em "Executar Agora"
4. Verifique os logs da edge function `execute-campaign-automations`
5. Procure por: `"📊 Using X days of snapshot data for..."`

## 📊 Exemplo de Uso

### Cenário: CPA Alto nos Últimos 30 Dias

**Regra de Automação**:
```json
{
  "rule_name": "Pausar Criativos - CPA Alto",
  "entity_type": "ad",
  "time_window_days": 30,
  "conditions": {
    "logic": "AND",
    "conditions": [
      { "field": "cpa", "operator": ">", "value": 30 }
    ]
  },
  "action_type": "pause_ad"
}
```

**Fluxo**:
1. Sistema busca snapshots dos últimos 30 dias do criativo
2. Soma `spend` e `conversions` de todos os 30 dias
3. Calcula: `CPA = totalSpend / totalConversions`
4. Compara: `CPA > 30?`
5. Se sim, pausa o criativo

**Antes (Incorreto)**:
- Usava CPA acumulado total desde o início da campanha
- Não refletia performance recente

**Depois (Correto)**:
- Usa CPA calculado apenas dos últimos 30 dias
- Reflete performance atual com precisão

## ⚙️ Configuração Inicial

### 1. Configurar Cron Job

Execute o SQL em: https://supabase.com/dashboard/project/ejwpfztkspbvmuwwiwmk/sql/new

```sql
-- Ver arquivo supabase/CONFIGURE_CRON.sql
```

### 2. Verificar Permissões

Certifique-se de que todos os clientes têm:
- `ad_account_id` preenchido
- `access_token` válido e ativo
- Token com permissões: `ads_read`, `ads_management`

### 3. Popular Dados Históricos (Opcional)

Para ter dados históricos anteriores ao deploy:

```javascript
// Executar manualmente para cada dia retroativo
// Modificar a edge function temporariamente para aceitar data como parâmetro
// Não recomendado fazer muito retroativo devido a rate limits do Facebook
```

## 🔧 Manutenção

### Monitorar Execuções

```sql
-- Ver status das últimas execuções
SELECT 
  execution_date,
  status,
  clients_processed,
  snapshots_created,
  errors_count,
  finished_at - started_at as duration
FROM snapshot_execution_log
ORDER BY execution_date DESC
LIMIT 10;

-- Ver erros recentes
SELECT 
  execution_date,
  error_messages
FROM snapshot_execution_log
WHERE errors_count > 0
ORDER BY execution_date DESC
LIMIT 5;
```

### Limpar Snapshots Antigos

```sql
-- Manter apenas últimos 90 dias
DELETE FROM performance_snapshots
WHERE snapshot_date < CURRENT_DATE - INTERVAL '90 days';
```

### Pausar/Reativar Cron

```sql
-- Pausar (mantém configuração)
UPDATE cron.job 
SET active = false 
WHERE jobname = 'daily-performance-snapshot';

-- Reativar
UPDATE cron.job 
SET active = true 
WHERE jobname = 'daily-performance-snapshot';
```

## ⚠️ Considerações Importantes

### Rate Limits do Facebook

- A função respeita delays entre requisições
- Em caso de rate limit (erro 17 ou 80004), a função:
  - Registra o erro
  - Continua processando outros clientes
  - Status final: 'partial'

### Dados Retroativos

- Snapshots começam apenas a partir da data de implementação
- Para janela de 30 dias funcionar plenamente, aguarde 30 dias após o deploy
- Até lá, automações usarão dados atuais como fallback

### Timezone

- Função usa UTC-3 (horário de Brasília) para calcular "ontem"
- Snapshots são salvos com data no formato YYYY-MM-DD
- Cron configurado para 3h UTC = 0h Brasília

### Performance

- Cada execução pode levar 5-15 minutos dependendo do volume de dados
- Consultas em `performance_snapshots` são otimizadas com índices
- Snapshots ocupam ~1KB por entidade por dia

## 📈 Métricas e KPIs

### Monitorar

1. **Taxa de Sucesso**: % de execuções com status 'completed'
2. **Tempo de Execução**: Duração média das execuções
3. **Volume de Dados**: Snapshots criados por dia
4. **Taxa de Erro**: Erros por cliente/execução

### Alertas Recomendados

- Status 'failed' por 2+ dias consecutivos
- Tempo de execução > 30 minutos
- Taxa de erro > 20%
- Nenhum snapshot criado em 24h

## 🔗 Links Úteis

- **SQL Editor**: https://supabase.com/dashboard/project/ejwpfztkspbvmuwwiwmk/sql/new
- **Function Logs**: https://supabase.com/dashboard/project/ejwpfztkspbvmuwwiwmk/functions/daily-performance-snapshot/logs
- **Cron Jobs**: Visualizar via SQL (`SELECT * FROM cron.job`)
- **Facebook Graph API Docs**: https://developers.facebook.com/docs/marketing-api/insights

## 🤝 Suporte

Em caso de problemas:

1. Verificar logs da edge function
2. Consultar `snapshot_execution_log` para erros
3. Validar tokens de acesso dos clientes
4. Verificar status do cron job (`SELECT * FROM cron.job`)
