# Configuração do CRON Job para Notificações WhatsApp

Este documento explica como configurar o CRON job que processa automaticamente as notificações WhatsApp agendadas.

## O que faz?

O CRON job executa a cada **5 minutos** e:

1. Busca todos os triggers ativos em `whatsapp_notification_triggers`
2. Verifica os agendamentos em `whatsapp_trigger_schedules`
3. Se `next_execution_at <= agora`, processa o trigger
4. Respeita configurações de "quiet hours"
5. Envia mensagens via Z-API
6. Atualiza `next_execution_at` para próxima execução
7. Registra logs em `whatsapp_execution_log`

## Como configurar

### Passo 1: Acessar o SQL Editor

Acesse: https://supabase.com/dashboard/project/ejwpfztkspbvmuwwiwmk/sql/new

### Passo 2: Executar o SQL

Cole e execute o conteúdo do arquivo `CONFIGURE_WHATSAPP_CRON.sql`:

```sql
-- Habilitar extensões
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remover job existente (se houver)
SELECT cron.unschedule('whatsapp-notifications-scheduler');

-- Criar CRON job
SELECT cron.schedule(
  'whatsapp-notifications-scheduler',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://ejwpfztkspbvmuwwiwmk.supabase.co/functions/v1/process-whatsapp-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqd3BmenRrc3Bidm11d3dpd21rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwNTU3MDMsImV4cCI6MjA2OTYzMTcwM30.ffDBwGCtpR0h8oWp9dxk4PbznNzf7h-vnyhbAUyxFOQ'
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);
```

### Passo 3: Verificar

```sql
SELECT * FROM cron.job WHERE jobname = 'whatsapp-notifications-scheduler';
```

## Comandos de Manutenção

### Ver todos os jobs agendados
```sql
SELECT * FROM cron.job;
```

### Ver histórico de execuções
```sql
SELECT * FROM cron.job_run_details 
ORDER BY start_time DESC 
LIMIT 20;
```

### Pausar temporariamente
```sql
UPDATE cron.job 
SET active = false 
WHERE jobname = 'whatsapp-notifications-scheduler';
```

### Reativar
```sql
UPDATE cron.job 
SET active = true 
WHERE jobname = 'whatsapp-notifications-scheduler';
```

### Remover completamente
```sql
SELECT cron.unschedule('whatsapp-notifications-scheduler');
```

## Troubleshooting

### Job não está executando

1. Verifique se o job está ativo:
```sql
SELECT jobname, active FROM cron.job 
WHERE jobname = 'whatsapp-notifications-scheduler';
```

2. Verifique erros recentes:
```sql
SELECT * FROM cron.job_run_details 
WHERE jobname = 'whatsapp-notifications-scheduler' 
ORDER BY start_time DESC 
LIMIT 5;
```

### Mensagens não estão sendo enviadas

1. Verifique os logs da edge function:
   https://supabase.com/dashboard/project/ejwpfztkspbvmuwwiwmk/functions/process-whatsapp-notifications/logs

2. Verifique a tabela de execuções:
```sql
SELECT * FROM whatsapp_execution_log 
ORDER BY executed_at DESC 
LIMIT 10;
```

3. Verifique se existem triggers ativos:
```sql
SELECT t.*, s.next_execution_at 
FROM whatsapp_notification_triggers t
JOIN whatsapp_trigger_schedules s ON s.trigger_id = t.id
WHERE t.is_active = true;
```

## Fluxo de Execução

```
┌─────────────────────────────────────────────────────────────┐
│  1. CRON executa a cada 5 minutos                           │
│     ↓                                                        │
│  2. Chama process-whatsapp-notifications                    │
│     ↓                                                        │
│  3. Busca triggers ativos em whatsapp_notification_triggers │
│     ↓                                                        │
│  4. Verifica schedules em whatsapp_trigger_schedules        │
│     ↓                                                        │
│  5. Se next_execution_at <= agora, processa                 │
│     ↓                                                        │
│  6. Busca contatos e templates                              │
│     ↓                                                        │
│  7. Envia mensagens via Z-API                               │
│     ↓                                                        │
│  8. Atualiza next_execution_at                              │
│     ↓                                                        │
│  9. Registra log em whatsapp_execution_log                  │
└─────────────────────────────────────────────────────────────┘
```
