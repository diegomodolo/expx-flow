

# Fabrica de Skills - Central de Gerenciamento de Skills dos Agentes

## Resumo

Criar uma nova seção "Skills" dentro da area de Inteligencia Artificial (`/ia/skills`) onde voce podera visualizar, criar, editar e configurar todas as skills disponíveis para os agentes. Cada skill tera campos configuráveis (como modelo de IA, parametros, prompts) para ajuste fino sem precisar mexer no código.

---

## O que sera construido

### 1. Nova pagina: Lista de Skills (`/ia/skills`)

Uma pagina com todas as skills organizadas por categoria, com:
- Busca e filtros por categoria
- Contagem de agentes usando cada skill
- Botao para criar nova skill
- Acesso rapido para editar cada skill

### 2. Pagina de Edicao/Criacao de Skill (`/ia/skills/:skillId/edit` e `/ia/skills/new`)

Formulario completo com abas:

**Aba "Geral":**
- Nome, descricao, categoria (dropdown)
- ID unico (slug, gerado automaticamente ou manual)
- Requer cliente (toggle)

**Aba "Execucao":**
- Edge Function associada (dropdown ou texto)
- Modelo de IA (dropdown: gemini-3-pro-image-preview, gemini-3-flash-preview, gemini-2.5-flash, gpt-5, etc.)
- Temperatura, max tokens
- System prompt customizado (textarea grande)

**Aba "Parametros":**
- Editor visual do JSON Schema de `tool_parameters` (adicionar/remover campos, tipo, descricao)
- Preview do JSON gerado

**Aba "Teste":**
- Playground para testar a skill isoladamente com parametros manuais

### 3. Alteracoes no banco de dados

Adicionar colunas na tabela `ia_agent_skills`:
- `model` (TEXT) - modelo de IA padrao (ex: "google/gemini-3-pro-image-preview")
- `system_prompt` (TEXT) - prompt de sistema customizado
- `temperature` (NUMERIC) - temperatura do modelo
- `max_tokens` (INTEGER) - limite de tokens
- `config` (JSONB) - configuracoes extras flexiveis
- `is_active` (BOOLEAN DEFAULT true) - para desativar skills globalmente
- `updated_at` (TIMESTAMPTZ)

Adicionar RLS policies para INSERT e UPDATE (apenas usuarios autenticados com permissao).

### 4. Integracao com a sidebar

Adicionar item "Skills" no menu de Inteligencia Artificial da sidebar, ao lado de "Agentes de IA" e "IA".

### 5. Edge functions leem configuracoes do banco

As edge functions (como `generate-image-ai`) passarao a buscar o modelo e configuracoes da tabela `ia_agent_skills` em vez de usar valores hardcoded. Exemplo: o campo `model` da skill `generate_image_ai` define qual modelo usar.

---

## Detalhes Tecnicos

### Novas rotas no App.tsx
```
/ia/skills         -> SkillsPage (lista)
/ia/skills/new     -> SkillEditPage (criacao)
/ia/skills/:id/edit -> SkillEditPage (edicao)
```

### Novos arquivos
- `src/pages/SkillsPage.tsx` - Listagem de skills
- `src/pages/SkillEditPage.tsx` - Formulario de edicao/criacao
- `src/hooks/useSkills.ts` - Hook para CRUD de skills
- `src/components/skills/SkillForm.tsx` - Componente do formulario
- `src/components/skills/SkillParametersEditor.tsx` - Editor visual de parametros JSON
- `src/components/skills/SkillTestPlayground.tsx` - Playground de teste

### Migracao SQL
```sql
ALTER TABLE public.ia_agent_skills
  ADD COLUMN model TEXT,
  ADD COLUMN system_prompt TEXT,
  ADD COLUMN temperature NUMERIC DEFAULT 0.7,
  ADD COLUMN max_tokens INTEGER DEFAULT 2048,
  ADD COLUMN config JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN is_active BOOLEAN DEFAULT true,
  ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();

-- Preencher modelo para skill de imagem
UPDATE public.ia_agent_skills
  SET model = 'google/gemini-3-pro-image-preview'
  WHERE id = 'generate_image_ai';

-- Policies para INSERT/UPDATE
CREATE POLICY "Authenticated users can create skills"
  ON public.ia_agent_skills FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update skills"
  ON public.ia_agent_skills FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete skills"
  ON public.ia_agent_skills FOR DELETE
  USING (auth.role() = 'authenticated');
```

### Atualizacao das edge functions
As edge functions que hoje tem modelo hardcoded (como `generate-image-ai`) passarao a receber o `skill_id` e buscar as configuracoes no banco, usando o valor do campo `model` da tabela. Fallback para o valor atual caso nao exista configuracao.

