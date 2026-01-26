

# Plano: Biblioteca de Elementos com Geração via IA

## Resumo

Criar uma **Biblioteca de Elementos** no editor de imagem que permite:
1. Visualizar uma coleção de elementos pré-definidos e personalizados (computador, tablet, ícones, etc.)
2. Pedir para a IA gerar novos elementos isolados (fundo transparente)
3. Arrastar elementos da biblioteca para o canvas
4. Salvar os elementos gerados para uso futuro

---

## Arquitetura da Solução

### 1. Banco de Dados

Criar uma nova tabela `editor_element_library` para armazenar os elementos:

```sql
CREATE TABLE editor_element_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  category VARCHAR(50) DEFAULT 'custom',
  tags TEXT[],
  is_default BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_element_library_company ON editor_element_library(company_id);
CREATE INDEX idx_element_library_category ON editor_element_library(category);

-- RLS
ALTER TABLE editor_element_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view elements from their company"
  ON editor_element_library FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert elements for their company"
  ON editor_element_library FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own elements"
  ON editor_element_library FOR DELETE
  USING (
    created_by = auth.uid() OR
    company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
```

### 2. Edge Function: Geração de Elementos Isolados

Criar uma nova edge function `generate-element` que gera elementos com fundo transparente:

**Arquivo: `supabase/functions/generate-element/index.ts`**

```text
Funcionalidade:
- Recebe: prompt descrevendo o elemento, companyId
- Usa Gemini 3 Pro para gerar imagem com fundo transparente
- Faz upload para bucket 'ai-generated-images' na pasta 'elements/'
- Salva referência na tabela editor_element_library
- Retorna: URL da imagem e ID do elemento

Prompt especial para elementos isolados:
- Instrução para gerar com fundo TRANSPARENTE (PNG alpha)
- Objeto centralizado e bem definido
- Alta qualidade, sem sombras no fundo
- Estilo consistente para composição
```

### 3. Componentes de Interface

#### 3.1. Aumentar Largura do Toolbar

**Arquivo: `src/components/image-editor/EditorToolbar.tsx`**
- Alterar largura de `w-[240px]` para `w-[280px]`

#### 3.2. Novo Componente: ElementLibrary

**Arquivo: `src/components/image-editor/ElementLibrary.tsx`**

```text
Estrutura do componente:
- Seção "Biblioteca de Elementos" com ícone de pasta
- Tabs: "Padrões" | "Meus Elementos"
- Grid de thumbnails dos elementos (clicáveis)
- Botão "+ Gerar com IA" para criar novos
- Modal de geração com:
  - Input de texto para descrever o elemento
  - Botão "Gerar"
  - Preview do elemento gerado
  - Campo para nomear o elemento
  - Botão "Salvar na Biblioteca"

Funcionalidades:
- Clique em elemento: adiciona ao canvas como tipo 'image'
- Drag and drop (futuro): arrasta para posicionar
- Hover: mostra preview maior
- Delete: remove elementos personalizados
```

#### 3.3. Categorias Pré-definidas

```text
Categorias sugeridas:
- Dispositivos: smartphone, tablet, laptop, monitor
- Ícones: setas, checkmarks, estrelas
- Decorativos: linhas, molduras, badges
- Objetos: caneta, xícara, planta
- Personalizados: elementos gerados pelo usuário
```

### 4. Fluxo de Uso

```text
1. Usuário abre o editor de imagem
2. No menu lateral esquerdo, vê seção "Biblioteca"
3. Pode:
   a) Clicar em elemento existente → adiciona ao canvas
   b) Clicar em "Gerar com IA":
      - Modal abre
      - Usuário digita "tablet moderno estilo flat"
      - Clica "Gerar"
      - IA gera elemento com fundo transparente
      - Preview aparece
      - Usuário nomeia e salva
      - Elemento aparece na biblioteca "Meus Elementos"
4. O elemento fica disponível para uso futuro
```

---

## Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `supabase/migrations/XXXXXXX_create_editor_element_library.sql` | Criar | Tabela para armazenar elementos |
| `supabase/functions/generate-element/index.ts` | Criar | Edge function para gerar elementos isolados |
| `supabase/config.toml` | Editar | Adicionar configuração da nova função |
| `src/components/image-editor/ElementLibrary.tsx` | Criar | Componente da biblioteca de elementos |
| `src/components/image-editor/GenerateElementModal.tsx` | Criar | Modal para gerar elementos com IA |
| `src/components/image-editor/EditorToolbar.tsx` | Editar | Aumentar largura e integrar biblioteca |
| `src/integrations/supabase/types.ts` | Editar | Tipos TypeScript da nova tabela |

---

## Detalhes Técnicos

### Edge Function - Prompt para Geração de Elementos

```text
Generate a high-quality isolated element for graphic design composition:

ELEMENT DESCRIPTION:
[user prompt here]

CRITICAL REQUIREMENTS:
- TRANSPARENT BACKGROUND (PNG with alpha channel)
- Object must be CENTERED and COMPLETE
- NO shadows cast on the background
- Clean, crisp edges suitable for compositing
- High resolution for marketing use
- Modern, professional style
- The element should work well when placed over any background

OUTPUT:
- Single isolated object
- Ready for drag-and-drop into designs
- Professional quality suitable for marketing materials

Generate the element now.
```

### Integração com Canvas

Quando o usuário clica em um elemento da biblioteca:

```typescript
onAddElement('image', {
  content: elementUrl, // URL do elemento
  width: 150,
  height: 150,
  x: 200, // Posição inicial
  y: 200,
});
```

---

## Resultado Esperado

1. **Menu lateral mais largo** (280px) com nova seção "Biblioteca"
2. **Grid de elementos** com thumbnails clicáveis
3. **Botão "Gerar com IA"** que abre modal de geração
4. **Elementos salvos** por empresa, disponíveis para toda equipe
5. **Geração com IA** produz elementos PNG com fundo transparente
6. **Clique para adicionar** elemento diretamente no canvas

