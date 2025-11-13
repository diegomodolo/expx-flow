# ⏰ Configuração do Cron Master de Automações

## 🎯 O que é o Cron Master?

O Cron Master é um sistema automático que gerencia a execução de todas as automações agendadas. Ao invés de configurar cron jobs individuais para cada cliente, você configura **um único cron job** que monitora todos os agendamentos e os executa automaticamente.

## ✨ Vantagens

- ✅ **Configuração única**: Execute apenas uma vez
- ✅ **Totalmente automático**: Novos clientes não precisam de configuração adicional
- ✅ **Escalável**: Funciona para qualquer número de clientes
- ✅ **Centralizado**: Todos os logs em um único lugar

---

## 📝 Configuração Única (Execute Uma Vez)

### 1. Acesse o SQL Editor do Supabase

Acesse: https://supabase.com/dashboard/project/ejwpfztkspbvmuwwiwmk/sql/new

### 2. Execute o SQL de Configuração

Execute o seguinte SQL **uma única vez** para configurar o Cron Master:

```sql
-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Criar o Cron Master (executa a cada 15 minutos)
SELECT cron.schedule(
  'master-automation-scheduler',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://ejwpfztkspbvmuwwiwmk.supabase.co/functions/v1/master-automation-scheduler',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqd3BmenRrc3Bidm11d3dpd21rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwNTU3MDMsImV4cCI6MjA2OTYzMTcwM30.ffDBwGCtpR0h8oWp9dxk4PbznNzf7h-vnyhbAUyxFOQ'
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);
```

### 3. Pronto! ✅

Após executar o SQL acima, o sistema está configurado. O Cron Master irá:

1. **Verificar** a cada 15 minutos se há agendamentos prontos para executar
2. **Executar** as automações dos clientes cujo horário programado chegou
3. **Calcular** automaticamente o próximo horário de execução
4. **Atualizar** os registros com informações de última e próxima execução

---

## 🔍 Como Funciona?

### Fluxo Automático

```
┌─────────────────────────────────────────────────────────────┐
│  1. Você configura agendamento na interface (ex: 2x/dia)   │
│     ↓                                                        │
│  2. Sistema calcula horários: 00:00 e 12:00                │
│     ↓                                                        │
│  3. Define next_execution_at = próximo horário              │
│     ↓                                                        │
│  4. Cron Master verifica a cada 15 minutos                  │
│     ↓                                                        │
│  5. Se next_execution_at <= agora, executa automações       │
│     ↓                                                        │
│  6. Recalcula next_execution_at para próximo horário        │
│     ↓                                                        │
│  7. Repete automaticamente ♻️                                │
└─────────────────────────────────────────────────────────────┘
```

### Exemplo Prático

**Configuração na Interface:**
- Cliente: "Minha Empresa"
- Execuções por dia: 3
- Horários calculados automaticamente: 00:00, 08:00, 16:00 (UTC)

**O que acontece:**
- `next_execution_at` = 00:00 (próximo horário disponível)
- Cron Master executa às 00:00
- Automações do cliente são processadas
- `last_execution_at` = 00:00
- `next_execution_at` = 08:00 (próximo da lista)
- Processo se repete automaticamente

---

## 📊 Monitoramento

### Verificar Status do Cron Master

```sql
-- Ver o cron job configurado
SELECT 
  jobid,
  jobname,
  schedule,
  active,
  database,
  nodename
FROM cron.job 
WHERE jobname = 'master-automation-scheduler';
```

### Ver Histórico de Execuções

```sql
-- Ver últimas execuções do Cron Master
SELECT 
  j.jobname,
  r.runid,
  r.start_time,
  r.end_time,
  r.status,
  r.return_message,
  EXTRACT(EPOCH FROM (r.end_time - r.start_time)) as duration_seconds
FROM cron.job_run_details r
JOIN cron.job j ON j.jobid = r.jobid
WHERE j.jobname = 'master-automation-scheduler'
ORDER BY r.start_time DESC
LIMIT 20;
```

### Ver Logs da Edge Function

Acesse os logs detalhados em:
https://supabase.com/dashboard/project/ejwpfztkspbvmuwwiwmk/functions/master-automation-scheduler/logs

---

## 🔧 Manutenção

### Ajustar Frequência do Cron Master

Se quiser que o Cron Master verifique com maior ou menor frequência:

```sql
-- Desabilitar o cron atual
SELECT cron.unschedule('master-automation-scheduler');

-- Criar com nova frequência (exemplo: a cada 5 minutos)
SELECT cron.schedule(
  'master-automation-scheduler',
  '*/5 * * * *',  -- Mudou de */15 para */5
  $$
  SELECT net.http_post(
    url := 'https://ejwpfztkspbvmuwwiwmk.supabase.co/functions/v1/master-automation-scheduler',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqd3BmenRrc3Bidm11d3dpd21rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwNTU3MDMsImV4cCI6MjA2OTYzMTcwM30.ffDBwGCtpR0h8oWp9dxk4PbznNzf7h-vnyhbAUyxFOQ'
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);
```

**Recomendações de Frequência:**
- `*/5 * * * *` - A cada 5 minutos (mais preciso, mais recursos)
- `*/15 * * * *` - A cada 15 minutos (padrão, bom equilíbrio)
- `*/30 * * * *` - A cada 30 minutos (menos recursos, menos preciso)

### Desabilitar Temporariamente

```sql
-- Desabilitar
UPDATE cron.job 
SET active = false 
WHERE jobname = 'master-automation-scheduler';

-- Reabilitar
UPDATE cron.job 
SET active = true 
WHERE jobname = 'master-automation-scheduler';
```

### Remover Completamente

```sql
SELECT cron.unschedule('master-automation-scheduler');
```

---

## 🧪 Testes

### Testar Manualmente

Você pode chamar o Cron Master manualmente para testar:

```bash
curl -X POST \
  'https://ejwpfztkspbvmuwwiwmk.supabase.co/functions/v1/master-automation-scheduler' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqd3BmenRrc3Bidm11d3dpd21rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwNTU3MDMsImV4cCI6MjA2OTYzMTcwM30.ffDBwGCtpR0h8oWp9dxk4PbznNzf7h-vnyhbAUyxFOQ'
```

### Forçar Execução Imediata de um Cliente

```sql
-- Ajustar next_execution_at para agora (forçar execução imediata)
UPDATE automation_schedules 
SET next_execution_at = NOW() 
WHERE client_id = 'SEU_CLIENT_ID_AQUI';
```

---

## ❓ Troubleshooting

### Problema: Cron Master não está executando

**Verificações:**
1. Confirme que o cron job está ativo:
   ```sql
   SELECT active FROM cron.job WHERE jobname = 'master-automation-scheduler';
   ```

2. Verifique se há erros no histórico:
   ```sql
   SELECT status, return_message 
   FROM cron.job_run_details r
   JOIN cron.job j ON j.jobid = r.jobid
   WHERE j.jobname = 'master-automation-scheduler'
   ORDER BY start_time DESC LIMIT 5;
   ```

3. Confira os logs da edge function (link acima)

### Problema: Automações não estão sendo executadas

**Verificações:**
1. Confirme que o agendamento está ativo:
   ```sql
   SELECT * FROM automation_schedules 
   WHERE client_id = 'SEU_CLIENT_ID' 
   AND is_enabled = true;
   ```

2. Verifique se `next_execution_at` está no passado:
   ```sql
   SELECT 
     client_id,
     next_execution_at,
     next_execution_at <= NOW() as should_execute
   FROM automation_schedules
   WHERE is_enabled = true;
   ```

3. Veja se há regras de automação ativas:
   ```sql
   SELECT COUNT(*) 
   FROM automation_rules 
   WHERE client_id = 'SEU_CLIENT_ID' 
   AND is_active = true;
   ```

---

## 📌 Notas Importantes

⚠️ **Precisão de Horário**: As execuções podem ter até 15 minutos de atraso (dependendo da frequência do cron). Isso é aceitável para a maioria dos casos de automação de campanhas.

⏰ **Fuso Horário**: Todos os horários são armazenados e processados em UTC. A interface converte automaticamente para o horário local do usuário.

🔒 **Segurança**: A edge function `master-automation-scheduler` é pública (`verify_jwt = false`), mas não aceita parâmetros externos, apenas busca dados do banco de dados.

📈 **Escalabilidade**: O sistema processa clientes sequencialmente. Para grandes volumes (>100 clientes), considere ajustar a lógica para processamento em lote.

---

## ✅ Checklist de Configuração

- [ ] Executei o SQL de criação do Cron Master
- [ ] Verifiquei que o cron job está ativo (`SELECT * FROM cron.job`)
- [ ] Configurei pelo menos um cliente com agendamento ativo na interface
- [ ] Verifiquei os logs após 15 minutos para confirmar execução
- [ ] Testei manualmente com `curl` (opcional)

---

## 🎉 Conclusão

Com o Cron Master configurado, você não precisa mais se preocupar com configurações manuais de cron jobs para cada cliente. O sistema gerencia tudo automaticamente! 🚀
