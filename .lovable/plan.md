
## Objetivo
Garantir que, no CS-TV Dashboard, o ranking **“Performance por Atendente”** (e qualquer lugar que exiba “atendente”) mostre **somente usuários que sejam atendentes oficiais** de instâncias **CS** (ou seja, `whatsapp_instance_users.is_attendant = true` em instâncias com `whatsapp_instances.instance_type = 'cs'`).  
Ou seja: mesmo que exista assignment/mensagem/análise associada à Suely, **ela não pode aparecer** se não for atendente oficial de nenhuma instância CS.

---

## Diagnóstico (por que ainda aparece)
Hoje o ranking é montado assim:

1) Pega `whatsapp_conversation_assignments` (status active)  
2) Filtra para `csConversationIds`  
3) Cria `attendantConversations` agrupando por `assigned_to_user_id`

Como existem assignments de conversas CS apontando para a Suely, ela entra no ranking **antes** do fallback por instância.  
O fallback “por instância” só roda quando `attendantConversations.size === 0`, então na prática ele quase nunca corrige esse caso.

---

## Estratégia de correção (robusta)
Implementar um “gate” único de quem **pode** aparecer no ranking:

### 1) Definir `allowedAttendantUserIds`
Criar um Set com os usuários que são atendentes oficiais de instâncias CS:

- Buscar (já existe): `whatsapp_instance_users (instance_id, user_id, is_attendant)`
- Escopo: apenas `instance_id` pertencentes a `csInstanceIds`
- Regra: `is_attendant === true`

Resultado:
- `allowedAttendantUserIds = Set(user_id)` apenas de CS + `is_attendant = true`.

### 2) Resolver “quem é o atendente responsável” por conversa CS
Criar uma função utilitária local na edge function, algo como:

- `resolveAttendantForConversation(conversationId, instanceId): string | null`
  - Se existir assignment ativo **e** `assigned_to_user_id` estiver em `allowedAttendantUserIds`, usar esse usuário
  - Caso contrário: cair para “atendente oficial da instância” (somente `is_attendant = true`)
  - Se ainda não houver: retornar `null` (e a conversa não contribui para ranking)

Isso impede que um assignment “errado” (usuário não-oficial) polua o ranking.

### 3) Reescrever a montagem do ranking
Em vez de “ranking = assignments agrupados”, mudar para “ranking = conversas CS atribuídas a um atendente permitido”:

- Criar `assignmentByConversationId` (Map) com os assignments ativos
- Iterar por `conversations` (já filtradas para CS) e:
  - `attendantId = resolveAttendantForConversation(conv.id, conv.instance_id)`
  - Se `attendantId` existir: push `conv.id` no `attendantConversations.get(attendantId)`

Com isso:
- Suely não entra porque não está em `allowedAttendantUserIds`
- As conversas que estavam “indevidamente” atribuídas à Suely passam a ser atribuídas ao atendente oficial da instância (ou ficam sem atendente, dependendo da configuração)

### 4) Tornar consistente em outras listas (para não “vazar” atendente)
Hoje existem trechos que fazem:
- “pega assignment; se não tiver, usa findInstanceAttendant()”

Vamos padronizar para usar a mesma regra `resolveAttendantForConversation()` em:
- `criticalConversationsList` (attendantId/attendantName)
- `recentCriticalAlerts`
- `recentCelebrationAlerts`
- Qualquer outro ponto no arquivo que apareça `assigned_to_user_id` + fallback

Assim Suely não aparece em lugar nenhum como atendente do CS-TV se não for atendente oficial de instância CS.

---

## Arquivo que será alterado
- `supabase/functions/cs-tv-dashboard-data/index.ts`

---

## Passo a passo de implementação
1) Ler e mapear:
   - `csInstanceIds`
   - `instanceUsersForCompany` (já existe)
   - Criar `allowedAttendantUserIds` (somente `is_attendant = true`)
2) Criar helper `findOfficialInstanceAttendant(instanceId)` (sem fallback “qualquer user”) e/ou adaptar o helper existente para suportar modo “somente oficial”.
3) Criar helper `resolveAttendantForConversation(conversationId, instanceId)`:
   - Usa assignment se permitido
   - Senão usa atendente oficial da instância
4) Refatorar bloco `// ========== ATTENDANT PERFORMANCE ==========`:
   - Construir `attendantConversations` iterando conversas CS e resolvendo atendente permitido
5) Refatorar pontos que exibem `attendantId/attendantName` (críticas/celebrações) para a mesma regra.
6) Adicionar logs curtos para auditoria (temporários ou mínimos), por exemplo:
   - quantidade de attendants permitidos
   - quantos assignments foram ignorados por não estarem em `allowedAttendantUserIds`
7) Deploy automático da Edge Function.
8) Teste end-to-end no dashboard:
   - Hard refresh (Ctrl+Shift+R)
   - Confirmar que Suely não aparece no ranking
   - Confirmar que números de conversas/alertas continuam coerentes

---

## Critérios de aceite (o que vai ficar garantido)
- Suely (ou qualquer usuário) só aparece no ranking se:
  - estiver em alguma instância CS **com** `is_attendant = true`
- Assignments para usuários fora dessa lista não fazem o usuário aparecer.
- O “atendente mostrado” em listas (críticas/celebrações) respeita a mesma regra.

---

## Observações técnicas (para evitar regressões)
- Hoje o fallback do ranking só roda quando não existe nenhum assignment; isso não é suficiente. A correção proposta remove essa fragilidade.
- Se alguma instância CS não tiver ninguém com `is_attendant = true`, o ranking pode ficar incompleto para aquelas conversas. Isso é esperado dado o requisito (“só responsáveis”), mas podemos ajustar depois se você quiser uma coluna/linha “Sem atendente” como fallback visual.
