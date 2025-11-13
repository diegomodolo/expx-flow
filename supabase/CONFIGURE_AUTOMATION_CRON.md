# Como Configurar Cron Jobs para Automações

## O que são Cron Jobs?

Cron jobs são tarefas agendadas que executam automaticamente em horários específicos. Para as automações de campanhas funcionarem nos horários programados, você precisa configurar cron jobs no Supabase que chamarão a edge function `scheduled-automation-execution`.

## Por que preciso configurar manualmente?

Por questões de segurança, o Supabase não permite que edge functions criem cron jobs automaticamente. Isso precisa ser feito manualmente através do SQL Editor.

## Como Configurar

### 1. Acesse o SQL Editor do Supabase

Acesse: https://supabase.com/dashboard/project/ejwpfztkspbvmuwwiwmk/sql/new

### 2. Execute o SQL de Configuração

Para cada cliente que tiver automações agendadas ativas, você precisa criar cron jobs baseado nos horários configurados.

**Exemplo:** Se um cliente tem agendamento de **3 execuções por dia**, os horários serão:
- 00:00 (0h)
- 08:00 (8h)
- 16:00 (16h)

Execute o seguinte SQL (ajustando o `client_id` e horários conforme necessário):

```sql
-- Habilitar extensões necessárias (execute apenas uma vez)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Para um cliente específico com 3 execuções por dia
-- Substitua CLIENT_ID_AQUI pelo ID real do cliente

-- Execução 1: 00:00 (0h UTC)
SELECT cron.schedule(
  'automation-client-CLIENT_ID_AQUI-0',
  '0 0 * * *',
  $$
  SELECT net.http_post(
    url := 'https://ejwpfztkspbvmuwwiwmk.supabase.co/functions/v1/scheduled-automation-execution',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqd3BmenRrc3Bidm11d3dpd21rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwNTU3MDMsImV4cCI6MjA2OTYzMTcwM30.ffDBwGCtpR0h8oWp9dxk4PbznNzf7h-vnyhbAUyxFOQ'
    ),
    body := jsonb_build_object('client_id', 'CLIENT_ID_AQUI')
  ) as request_id;
  $$
);

-- Execução 2: 08:00 (8h UTC)
SELECT cron.schedule(
  'automation-client-CLIENT_ID_AQUI-1',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := 'https://ejwpfztkspbvmuwwiwmk.supabase.co/functions/v1/scheduled-automation-execution',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqd3BmenRrc3Bidm11d3dpd21rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwNTU3MDMsImV4cCI6MjA2OTYzMTcwM30.ffDBwGCtpR0h8oWp9dxk4PbznNzf7h-vnyhbAUyxFOQ'
    ),
    body := jsonb_build_object('client_id', 'CLIENT_ID_AQUI')
  ) as request_id;
  $$
);

-- Execução 3: 16:00 (16h UTC)
SELECT cron.schedule(
  'automation-client-CLIENT_ID_AQUI-2',
  '0 16 * * *',
  $$
  SELECT net.http_post(
    url := 'https://ejwpfztkspbvmuwwiwmk.supabase.co/functions/v1/scheduled-automation-execution',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqd3BmenRrc3Bidm11d3dpd21rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwNTU3MDMsImV4cCI6MjA2OTYzMTcwM30.ffDBwGCtpR0h8oWp9dxk4PbznNzf7h-vnyhbAUyxFOQ'
    ),
    body := jsonb_build_object('client_id', 'CLIENT_ID_AQUI')
  ) as request_id;
  $$
);
```

### 3. Formato do Cron Expression

O formato `'minute hour * * *'` define quando o job executa:
- `'0 0 * * *'` = 00:00 (meia-noite)
- `'0 8 * * *'` = 08:00 (8h da manhã)
- `'0 16 * * *'` = 16:00 (4h da tarde)
- `'30 14 * * *'` = 14:30 (2h30 da tarde)

### 4. Conversão de Horários

Os horários exibidos na interface estão em **horário local (BRT - Brasília)**, mas os cron jobs no Supabase usam **UTC**.

**Conversão BRT → UTC:**
- BRT é UTC-3
- Subtraia 3 horas do horário BRT para obter UTC

**Exemplos:**
- 00:00 BRT = 03:00 UTC → `'0 3 * * *'`
- 08:00 BRT = 11:00 UTC → `'0 11 * * *'`
- 16:00 BRT = 19:00 UTC → `'0 19 * * *'`

### 5. Verificar Cron Jobs Criados

Para ver todos os cron jobs configurados:

```sql
SELECT 
  jobid,
  jobname,
  schedule,
  active,
  database
FROM cron.job
WHERE jobname LIKE 'automation-client-%'
ORDER BY jobname;
```

### 6. Remover um Cron Job

Se precisar remover um cron job:

```sql
SELECT cron.unschedule('automation-client-CLIENT_ID_AQUI-0');
```

### 7. Ver Histórico de Execuções

Para verificar se os cron jobs estão executando corretamente:

```sql
SELECT 
  j.jobname,
  r.start_time,
  r.end_time,
  r.status,
  r.return_message
FROM cron.job_run_details r
JOIN cron.job j ON j.jobid = r.jobid
WHERE j.jobname LIKE 'automation-client-%'
ORDER BY r.start_time DESC
LIMIT 20;
```

## Exemplo Completo

Se você ativou agendamento para o cliente com ID `8b96af23-d6e6-4fa8-9d66-f2e416c01c76` com **2 execuções por dia** (00:00 e 12:00 BRT):

```sql
-- Horários em UTC (BRT - 3h):
-- 00:00 BRT = 03:00 UTC
-- 12:00 BRT = 15:00 UTC

-- Execução 1: 03:00 UTC
SELECT cron.schedule(
  'automation-client-8b96af23-d6e6-4fa8-9d66-f2e416c01c76-0',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://ejwpfztkspbvmuwwiwmk.supabase.co/functions/v1/scheduled-automation-execution',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqd3BmenRrc3Bidm11d3dpd21rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwNTU3MDMsImV4cCI6MjA2OTYzMTcwM30.ffDBwGCtpR0h8oWp9dxk4PbznNzf7h-vnyhbAUyxFOQ'
    ),
    body := jsonb_build_object('client_id', '8b96af23-d6e6-4fa8-9d66-f2e416c01c76')
  ) as request_id;
  $$
);

-- Execução 2: 15:00 UTC
SELECT cron.schedule(
  'automation-client-8b96af23-d6e6-4fa8-9d66-f2e416c01c76-1',
  '0 15 * * *',
  $$
  SELECT net.http_post(
    url := 'https://ejwpfztkspbvmuwwiwmk.supabase.co/functions/v1/scheduled-automation-execution',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqd3BmenRrc3Bidm11d3dpd21rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwNTU3MDMsImV4cCI6MjA2OTYzMTcwM30.ffDBwGCtpR0h8oWp9dxk4PbznNzf7h-vnyhbAUyxFOQ'
    ),
    body := jsonb_build_object('client_id', '8b96af23-d6e6-4fa8-9d66-f2e416c01c76')
  ) as request_id;
  $$
);
```

## Troubleshooting

### Cron jobs não estão executando?

1. Verifique se as extensões `pg_cron` e `pg_net` estão habilitadas
2. Confirme que o `jobname` está correto e único
3. Verifique os logs da edge function: https://supabase.com/dashboard/project/ejwpfztkspbvmuwwiwmk/functions/scheduled-automation-execution/logs
4. Confira o histórico de execuções do cron (comando acima)

### Como testar manualmente?

Você pode chamar a edge function diretamente para testar:

```bash
curl -X POST \
  'https://ejwpfztkspbvmuwwiwmk.supabase.co/functions/v1/scheduled-automation-execution' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqd3BmenRrc3Bidm11d3dpd21rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwNTU3MDMsImV4cCI6MjA2OTYzMTcwM30.ffDBwGCtpR0h8oWp9dxk4PbznNzf7h-vnyhbAUyxFOQ' \
  -d '{"client_id": "CLIENT_ID_AQUI"}'
```

## Importante

⚠️ **Atenção:** Os cron jobs precisam ser criados **para cada cliente** que tiver automações agendadas ativas. Se você desabilitar o agendamento de um cliente, lembre-se de remover os cron jobs correspondentes usando `cron.unschedule()`.
