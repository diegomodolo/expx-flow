# Squads — Skill de Contexto do Modulo

## Visao Geral

O modulo de Squads gerencia equipes de trabalho (squads). Cada squad tem membros, um lider, um responsavel pelo WhatsApp e um autorizador. As squads sao a base organizacional que conecta o Backlog Center, Command Center e Kanban individual.

**Rota:** `/squad` — protegida por `PermissionProtectedRoute` com permissao `squad`.

### Relacao com Outros Modulos

```
Squads (/squad) — define equipes e membros
  → Command Center (/squad-command-center) — lider distribui tarefas da squad
  → Backlog Center (/backlog-command-center) — backlog filtrado por squad
  → Kanban (/tarefas) — colaborador ve tarefas atribuidas a ele
  → Dashboard Squad (/squad-dashboard) — metricas da squad
  → Reunioes (/reunioes) — reunioes da squad
```

---

## Arquivos-Chave

### Pagina e Componentes

| Arquivo                                        | Responsabilidade                                                                         |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `src/pages/Squad.tsx`                          | Pagina principal. Tabela de squads com acoes (editar, membros, excluir)                  |
| `src/components/squads/SquadMembersDialog.tsx` | Modal de gestao de membros: checkboxes de selecao, selects de lider/whatsapp/autorizador |
| `src/components/squads/CreateSquadDialog.tsx`  | Dialog para criar/editar squad (nome, cor, descricao)                                    |

### Hooks

| Arquivo                  | Responsabilidade                                                                                                      |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `src/hooks/useTeams.tsx` | CRUD de squads (teams table). Inclui `addTeamMember`/`removeTeamMember` (usam `team_members` table — ver nota abaixo) |

---

## Modelo de Dados

### Tabelas

| Tabela      | Campos-chave                                                                                | Notas                      |
| ----------- | ------------------------------------------------------------------------------------------- | -------------------------- |
| `teams`     | id, name, color, description, company_id, leader_id, whatsapp_responsible_id, authorizer_id | Squad principal            |
| `employees` | id, user_id, name, email, role, avatar, team_id, status, company_id                         | `team_id` vincula ao squad |

### Como Membros sao Gerenciados

O `SquadMembersDialog` gerencia membros via campo `employees.team_id`:

- **Adicionar membro**: `UPDATE employees SET team_id = squad.id WHERE id IN (...)`
- **Remover membro**: `UPDATE employees SET team_id = NULL WHERE id IN (...)`
- **Lider/WhatsApp/Autorizador**: `UPDATE teams SET leader_id, whatsapp_responsible_id, authorizer_id`

### Papeis Especiais da Squad

| Papel                | Campo em `teams`          | Descricao                                                          |
| -------------------- | ------------------------- | ------------------------------------------------------------------ |
| Lider                | `leader_id`               | Gestor responsavel pela squad. Distribui tarefas no Command Center |
| Responsavel WhatsApp | `whatsapp_responsible_id` | CS responsavel pelo atendimento via WhatsApp                       |
| Autorizador          | `authorizer_id`           | Membro responsavel por aprovar tarefas                             |

---

## Padroes Estabelecidos

### 1. Membros via employees.team_id (NAO team_members)

O `SquadMembersDialog` usa `employees.team_id` para vincular membros a squads. O hook `useTeams` tem funcoes `addTeamMember`/`removeTeamMember` que usam uma tabela `team_members`, mas o dialog NAO usa essas funcoes — faz UPDATE direto na tabela `employees`.

**Padrao correto**: Usar `employees.team_id` para gestao de membros de squad.

### 2. Filtragem de Membros

- Busca todos os `employees` ativos da empresa
- Membros ja em outro squad aparecem com `opacity-60` e label "Em outro squad"
- Selects de lider/whatsapp/autorizador so mostram membros selecionados (da squad atual)

### 3. Save Atomico

O `handleSave` faz 3 operacoes sequenciais:

1. Remove membros desmarcados (`UPDATE employees SET team_id = null`)
2. Adiciona membros marcados (`UPDATE employees SET team_id = squad.id`)
3. Atualiza papeis da squad (`UPDATE teams SET leader_id, ...`)

Se qualquer etapa falha, as anteriores ja foram aplicadas (nao ha rollback). Aceitavel como trade-off.

---

## Armadilhas e Bugs Resolvidos

### 1. Nao conseguia alterar membros das squads (CRITICO)

**Sintoma**: Ao tentar salvar alteracoes de membros no modal, nada acontecia (update silencioso) ou aparecia erro.

**Causa raiz**: A RLS policy de UPDATE na tabela `employees` era restritiva demais:

```sql
-- ERRADA: so permitia owner/admin
CREATE POLICY "Company admins can update employees"
ON public.employees FOR UPDATE
USING (company_id IN (
  SELECT company_id FROM company_members
  WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
));
```

O usuario tinha permissao `squad` no frontend (podia acessar `/squad`), mas a policy do banco exigia `owner` ou `admin` para fazer UPDATE em `employees`. O Supabase retornava sucesso com 0 rows affected (falha silenciosa).

**Solucao**: Alterar policy para permitir qualquer membro da empresa:

```sql
-- CORRETA: qualquer membro pode atualizar
CREATE POLICY "Company members can update employees"
ON public.employees FOR UPDATE
USING (company_id IN (
  SELECT company_id FROM company_members
  WHERE user_id = auth.uid()
));
```

O controle de acesso a funcionalidade de squads e feito pela permissao no frontend (`PermissionProtectedRoute`).

**Licao**: Quando uma acao do frontend requer UPDATE em tabela compartilhada (como `employees`), a RLS policy nao deve ser mais restritiva que a permissao do frontend. Se o frontend ja controla quem acessa a feature, a RLS so precisa garantir isolamento por empresa.

---

## Contexto Nao-Obvio

### 1. Duas formas de vincular membros (confuso)

Existem DUAS mecanicas no codigo:

- **`employees.team_id`** — usado pelo `SquadMembersDialog` (metodo ATIVO)
- **`team_members` table** — referenciada pelo `useTeams` hook (funcoes `addTeamMember`/`removeTeamMember`)

Na pratica, o **`employees.team_id`** e o que importa. As funcoes `addTeamMember`/`removeTeamMember` do hook podem ser codigo legado ou para outro proposito.

### 2. Um colaborador so pertence a uma squad

O campo `employees.team_id` e um UUID simples (nao array). Um colaborador so pode estar em uma squad por vez. Ao adiciona-lo a outra, o `team_id` anterior e sobrescrito.

### 3. employees vs company_members

Nao confundir:

- **`employees`**: Registro do colaborador na empresa (nome, cargo, avatar, team_id). Usado para gestao de squads e tarefas.
- **`company_members`**: Vinculo de autenticacao (user_id ↔ company_id, role: owner/admin/member). Usado para RLS e permissoes de acesso.

Um usuario pode existir em `company_members` sem ter registro em `employees` (ex: owner que nao e colaborador operacional).

### 4. leader_id, whatsapp_responsible_id e authorizer_id referenciam employees.id

Esses campos na tabela `teams` guardam o `id` do employee (nao o `user_id`). O select no dialog filtra apenas membros atualmente selecionados na squad.

### 5. Squads alimentam o filtro do Command Center

O `useCommandCenter` usa `useTeams()` para listar squads e auto-selecionar a primeira. Os membros da squad selecionada aparecem como linhas na timeline. Se a squad nao tem membros (nenhum employee com `team_id` correspondente), a timeline fica vazia.

### 6. Permissao squad vs roles do banco

A permissao `squad` no frontend (`employee_permissions`) controla acesso a rota `/squad`. Mas as operacoes no banco dependem das RLS policies. Apos a correcao, qualquer membro da empresa pode fazer UPDATE em employees — o frontend garante que so quem tem permissao `squad` acessa a UI.
