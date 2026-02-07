
# Plano: Gerador de Thumbnails para YouTube Content Lab

## Visão Geral

Implementar um sistema completo de geração de thumbnails para vídeos do YouTube, integrado aos roteiros existentes no YouTube Content Lab. O fluxo será:

1. **Configurar** → Fotos do modelo/pessoa + thumbnails de referência (aba Thumbnails)
2. **Gerar** → Botão no roteiro analisa tudo e gera a thumb
3. **Editar** → Abre no ImageEditorModal para ajustes finos
4. **Salvar** → Associa a thumbnail ao roteiro automaticamente

---

## Componentes da Solução

### 1. Nova Aba "Thumbnails" no Content Lab

Uma nova aba entre "Roteiros" e a UI atual para configurar:

- **Fotos do Modelo/Pessoa**: Upload de até 5 fotos da pessoa que aparecerá nas thumbnails
- **Thumbnails de Referência**: Upload de thumbnails de outros vídeos como inspiração visual
- **Preview**: Visualização das imagens configuradas

### 2. Botão "Gerar Thumb" no Script Builder

No header do `YouTubeScriptBuilder`, ao lado de "Copiar" e "Salvar":

- Botão com ícone de imagem + texto "Gerar Thumb"
- Abre modal de progresso durante geração
- Ao finalizar, abre o `ImageEditorModal` com a thumb gerada

### 3. Fluxo de Geração

```text
┌─────────────────────────────────────────────────────────┐
│  Clique em "Gerar Thumb"                                │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│  Modal "Gerando Thumbnail..."                           │
│  - Coletando informações do roteiro                     │
│  - Analisando fotos do modelo                           │
│  - Processando referências visuais                      │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│  Edge Function: generate-youtube-thumbnail              │
│  - Analisa: título, headlines do roteiro                │
│  - Usa: fotos do modelo como referência                 │
│  - Aplica: estilo das thumbnails de referência          │
│  - Gera: imagem 1280x720 (16:9)                         │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│  ImageEditorModal abre automaticamente                  │
│  - Thumb gerada pronta para edição                      │
│  - Pode adicionar texto, ajustar cores, etc.            │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│  Ao finalizar no editor                                 │
│  - Salva no Storage                                     │
│  - Atualiza youtube_scripts.thumbnail_url               │
└─────────────────────────────────────────────────────────┘
```

---

## Detalhes Técnicos

### Banco de Dados

**Nova tabela: `youtube_thumbnail_configs`**

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid | Chave primária |
| client_id | uuid | FK para clients |
| company_id | uuid | FK para companies |
| model_photos | jsonb | Array com URLs das fotos do modelo |
| reference_thumbnails | jsonb | Array com URLs das thumbs de referência |
| style_notes | text | Notas sobre estilo visual (opcional) |
| created_at | timestamp | Data de criação |
| updated_at | timestamp | Data de atualização |

### Arquivos a Criar

1. **`src/components/youtube-content-lab/YouTubeThumbnailConfig.tsx`**
   - Interface para configurar fotos do modelo e referências
   - Upload de imagens para Storage
   - Preview das imagens configuradas

2. **`src/hooks/useYouTubeThumbnails.tsx`**
   - CRUD para youtube_thumbnail_configs
   - Função para gerar thumbnail
   - Integração com o hook de scripts

3. **`supabase/functions/generate-youtube-thumbnail/index.ts`**
   - Edge function dedicada para thumbnails
   - Prompt especializado para YouTube thumbnails
   - Usa modelo Gemini 3 Pro Image

4. **`src/components/youtube-content-lab/GenerateThumbnailModal.tsx`**
   - Modal de progresso durante geração
   - Estados: preparando, gerando, concluído

### Arquivos a Modificar

1. **`src/pages/cliente/ClienteYouTubeContentLab.tsx`**
   - Adicionar 5ª aba "Thumbnails" 
   - Integrar novo componente de configuração

2. **`src/components/youtube-content-lab/YouTubeScriptBuilder.tsx`**
   - Adicionar botão "Gerar Thumb" no header
   - Integrar modal de geração
   - Integrar ImageEditorModal
   - Handler para salvar thumbnail no script

3. **`src/hooks/useYouTubeScripts.tsx`**
   - Adicionar função generateThumbnail
   - Handler para atualizar thumbnail_url

### Edge Function: generate-youtube-thumbnail

Prompt especializado que considera:
- Título do vídeo e títulos sugeridos
- Conteúdo/tema do roteiro
- Fotos do modelo para manter consistência facial
- Thumbnails de referência para estilo visual
- Aspectos como:
  - Expressões faciais impactantes
  - Texto grande e legível
  - Contraste e cores vibrantes
  - Composição típica de YouTube

### Migração SQL

```sql
-- Criar tabela de configurações de thumbnails
CREATE TABLE youtube_thumbnail_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  model_photos JSONB DEFAULT '[]'::jsonb,
  reference_thumbnails JSONB DEFAULT '[]'::jsonb,
  style_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, company_id)
);

-- Habilitar RLS
ALTER TABLE youtube_thumbnail_configs ENABLE ROW LEVEL SECURITY;

-- Políticas RLS (padrão do projeto)
CREATE POLICY "Users can view their company thumbnail configs"
  ON youtube_thumbnail_configs FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM company_employees WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert thumbnail configs for their company"
  ON youtube_thumbnail_configs FOR INSERT
  WITH CHECK (company_id IN (
    SELECT company_id FROM company_employees WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update thumbnail configs for their company"
  ON youtube_thumbnail_configs FOR UPDATE
  USING (company_id IN (
    SELECT company_id FROM company_employees WHERE user_id = auth.uid()
  ));
```

---

## Interface do Usuário

### Aba Thumbnails (Configuração)

```text
┌────────────────────────────────────────────────────────────┐
│ ⚙️ Configuração de Thumbnails                              │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ 📸 Fotos do Modelo                                         │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ Adicione fotos da pessoa que aparecerá nas thumbnails  ││
│ │                                                         ││
│ │  ┌─────┐  ┌─────┐  ┌─────┐  ┌───────┐                  ││
│ │  │ 📷  │  │ 📷  │  │ 📷  │  │  +    │                  ││
│ │  │foto1│  │foto2│  │foto3│  │Adicionar│                ││
│ │  └─────┘  └─────┘  └─────┘  └───────┘                  ││
│ └─────────────────────────────────────────────────────────┘│
│                                                            │
│ 🎨 Thumbnails de Referência                                │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ Adicione thumbnails de outros vídeos como referência   ││
│ │                                                         ││
│ │  ┌─────────┐  ┌─────────┐  ┌───────────┐               ││
│ │  │  thumb1 │  │  thumb2 │  │    +      │               ││
│ │  │  16:9   │  │  16:9   │  │ Adicionar │               ││
│ │  └─────────┘  └─────────┘  └───────────┘               ││
│ └─────────────────────────────────────────────────────────┘│
│                                                            │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ 💾 Salvar Configurações                                │ │
│ └────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

### Botão no Script Builder

No header, ao lado dos botões existentes:

```text
[ Copiar ]  [ 🖼️ Gerar Thumb ]  [ Salvar ]
```

### Modal de Geração

```text
┌────────────────────────────────────────────┐
│          Gerando Thumbnail...              │
│                                            │
│    ⏳ Analisando roteiro e referências     │
│    ✅ Processando fotos do modelo          │
│    ⏳ Gerando imagem com IA...             │
│                                            │
│    [████████████░░░░░░░░░░░] 60%           │
└────────────────────────────────────────────┘
```

---

## Resultado Esperado

Após implementação, o usuário poderá:

1. Acessar a aba **Thumbnails** e configurar:
   - Fotos do modelo/pessoa (rosto visível)
   - Thumbnails de referência de outros canais

2. Ao editar um roteiro, clicar em **"Gerar Thumb"** que irá:
   - Analisar o título e conteúdo do roteiro
   - Usar as fotos do modelo como referência
   - Aplicar o estilo das thumbnails de referência
   - Gerar uma thumbnail 1280x720 otimizada para YouTube

3. A thumbnail gerada abrirá automaticamente no **Editor de Imagem** para:
   - Ajustar textos
   - Modificar cores
   - Adicionar elementos
   - Fazer correções finas

4. Ao salvar no editor, a thumbnail será:
   - Armazenada no Storage
   - Vinculada ao roteiro (`thumbnail_url`)
   - Visível na lista de roteiros
