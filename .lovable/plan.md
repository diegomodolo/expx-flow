

# Plano: Editor de Criativos com Canvas e Chat de IA

## Visao Geral

Criar um editor de imagens completo e reutilizavel em formato de modal (90% da tela) que permita:
- Editar imagens com elementos canvas (texto, formas, imagens)
- Chat conversacional com IA para alteracoes
- Suporte a carrosseis (multiplas imagens)
- Exportar e substituir imagem original

---

## Arquitetura do Componente

```text
src/components/image-editor/
├── ImageEditorModal.tsx          # Modal principal (90vh/90vw)
├── EditorCanvas.tsx              # Area central com canvas
├── EditorToolbar.tsx             # Sidebar esquerda (ferramentas)
├── EditorAIChat.tsx              # Sidebar direita (chat IA)
├── EditorHeader.tsx              # Header (voltar, exportar, finalizar)
├── elements/
│   ├── TextElement.tsx           # Elemento de texto arrastravel
│   ├── ShapeElement.tsx          # Formas (retangulos, circulos)
│   ├── ImageElement.tsx          # Imagens sobrepostas
│   └── ElementWrapper.tsx        # Wrapper para drag/resize
├── hooks/
│   └── useImageEditor.tsx        # Estado do editor
└── utils/
    └── canvasExport.ts           # Exportar canvas para imagem
```

---

## Componentes Principais

### 1. ImageEditorModal (Modal Principal)

**Responsabilidades:**
- Modal fullscreen (90% largura/altura)
- Layout de 3 colunas: Toolbar (200px) | Canvas (flex) | Chat IA (350px)
- Gerenciar estado global do editor

**Props:**
```typescript
interface ImageEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  images: string[];                    // URLs das imagens (suporte carrossel)
  onSave: (newImages: string[]) => void; // Callback ao finalizar
  clientId: string;
  companyId: string;
}
```

### 2. EditorToolbar (Sidebar Esquerda)

**Funcionalidades:**
- Botoes Desfazer/Refazer
- Secao "Adicionar ao canvas":
  - **Texto**: Titulo, Subtitulo, Corpo, Citacao
  - **Elementos**: Retangulo, Circulo, Linha, Seta
  - **Imagens**: Upload de imagem para sobrepor

**Estrutura Visual:**
```text
┌─────────────────┐
│ Ferramentas     │
├─────────────────┤
│ ↶ Undo  ↷ Redo  │
├─────────────────┤
│ Adicionar:      │
│ ┌─────────────┐ │
│ │ T  Texto    │ │
│ │ △  Elementos│ │
│ │ 🖼 Imagens  │ │
│ └─────────────┘ │
└─────────────────┘
```

### 3. EditorCanvas (Area Central)

**Funcionalidades:**
- Exibir imagem base centralizada
- Elementos sobrepostos (drag & drop, resize)
- Controles de zoom (slider ou botoes +/-)
- Navegacao de slides para carrosseis
- Selecao de elementos para edicao

**Bibliotecas a usar:**
- `html2canvas` (ja instalado): Exportar canvas final
- CSS transforms para drag/resize (sem dependencias extras)

**Controles de Zoom:**
```text
┌──────────────────────────────┐
│                              │
│      [IMAGEM + ELEMENTOS]    │
│                              │
├──────────────────────────────┤
│  < [1] [2] [3] + 📋 >        │  (navegacao slides)
├──────────────────────────────┤
│  🔍- ─────●───── 🔍+ (100%)  │  (zoom)
└──────────────────────────────┘
```

### 4. EditorAIChat (Sidebar Direita)

**Funcionalidades:**
- Identificador do assistente (nome, avatar)
- Historico de mensagens do editor
- Botoes de acao rapida: "Mudar cores", "Mudar fundo", "Adicionar elemento", "Melhorar layout"
- Input de texto + upload de imagem para mesclar
- Enviar comandos para IA editar a imagem

**Integracao:**
- Usar edge function `generate-visual-creative` com `extraPrompt` e `additionalImageToMerge`
- Passar imagem atual como referencia

### 5. ElementWrapper (Elementos Arrastaveis)

**Funcionalidades:**
- Mover elemento com drag
- Redimensionar com handles nas bordas
- Rotacionar (opcional)
- Excluir elemento
- Selecao visual (borda roxa como na referencia)

**Implementacao:**
```typescript
interface CanvasElement {
  id: string;
  type: 'text' | 'shape' | 'image';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  content: string | object;
  styles: Record<string, any>;
}
```

---

## Hook useImageEditor

**Estado gerenciado:**
```typescript
interface ImageEditorState {
  images: string[];           // Imagens base
  currentImageIndex: number;  // Slide atual
  elements: CanvasElement[]; // Elementos no canvas
  selectedElementId: string | null;
  zoom: number;              // 0.5 a 2.0
  history: CanvasElement[][]; // Para undo/redo
  historyIndex: number;
  aiChatMessages: Message[];
  isProcessingAI: boolean;
}
```

**Acoes:**
- `addElement(type, config)`
- `updateElement(id, updates)`
- `removeElement(id)`
- `selectElement(id)`
- `undo() / redo()`
- `setZoom(level)`
- `setCurrentImage(index)`
- `sendAICommand(prompt, additionalImage?)`

---

## Integracao com IA

### Fluxo de Edicao por Chat:

1. Usuario digita comando (ex: "mude a cor de fundo para azul")
2. Opcional: Upload de imagem para mesclar
3. Chama `generate-visual-creative` com:
   - `references`: [imagem atual do canvas exportada]
   - `extraPrompt`: comando do usuario
   - `additionalImageToMerge`: imagem adicional (se houver)
4. Recebe nova imagem gerada
5. Atualiza canvas com nova imagem base
6. Adiciona mensagem ao historico do chat

### Acoes Rapidas (Quick Actions):

| Botao | Prompt Enviado |
|-------|----------------|
| Mudar cores | "Altere o esquema de cores da imagem mantendo o layout" |
| Mudar fundo | "Substitua o fundo da imagem por algo mais adequado" |
| Adicionar elemento | "Sugira e adicione um elemento visual complementar" |
| Melhorar layout | "Melhore a composicao e balanceamento visual" |

---

## Exportacao da Imagem Final

### Processo:

1. Usuario clica "Finalizar"
2. Usa `html2canvas` para capturar o canvas completo
3. Converte para base64
4. Faz upload para Supabase Storage
5. Retorna URL publica
6. Chama callback `onSave` com nova URL

```typescript
async function exportCanvas(): Promise<string> {
  const canvasElement = document.getElementById('editor-canvas');
  const canvas = await html2canvas(canvasElement, {
    scale: 2, // Alta resolucao
    useCORS: true,
    allowTaint: true
  });
  
  const blob = await new Promise<Blob>((resolve) => 
    canvas.toBlob(resolve, 'image/png', 1.0)
  );
  
  // Upload para Supabase
  const path = `edited-creatives/${Date.now()}.png`;
  await supabase.storage.from('visual-creatives').upload(path, blob);
  
  return supabase.storage.from('visual-creatives').getPublicUrl(path).data.publicUrl;
}
```

---

## Ponto de Entrada no Sistema

### Adicionar botao no MediaUploader:

Adicionar botao "Editar Criativo" ao lado de "Gerar outra imagem com IA":

```typescript
// Em MediaUploader.tsx
<Button variant="outline" size="sm" onClick={() => setShowImageEditor(true)}>
  <Pencil className="h-4 w-4 mr-2" />
  Editar Criativo
</Button>

<ImageEditorModal
  open={showImageEditor}
  onOpenChange={setShowImageEditor}
  images={mediaUrls}
  clientId={clientId}
  companyId={companyId}
  onSave={(newUrls) => {
    onChange(newUrls);
    setShowImageEditor(false);
  }}
/>
```

---

## Arquivos a Criar/Modificar

### Novos Arquivos:
1. `src/components/image-editor/ImageEditorModal.tsx`
2. `src/components/image-editor/EditorCanvas.tsx`
3. `src/components/image-editor/EditorToolbar.tsx`
4. `src/components/image-editor/EditorAIChat.tsx`
5. `src/components/image-editor/EditorHeader.tsx`
6. `src/components/image-editor/elements/TextElement.tsx`
7. `src/components/image-editor/elements/ShapeElement.tsx`
8. `src/components/image-editor/elements/ImageElement.tsx`
9. `src/components/image-editor/elements/ElementWrapper.tsx`
10. `src/components/image-editor/hooks/useImageEditor.tsx`
11. `src/components/image-editor/utils/canvasExport.ts`

### Arquivos a Modificar:
1. `src/components/campaigns/builder/MediaUploader.tsx` - Adicionar botao "Editar Criativo"

---

## Secao Tecnica

### Dependencias Existentes Utilizadas:
- `html2canvas` - Exportar canvas
- `react-resizable-panels` - Layout com paineis redimensionaveis
- `@radix-ui/react-slider` - Controle de zoom
- Supabase Storage - Upload de imagens

### Drag and Resize sem Bibliotecas Extras:

Implementar usando eventos nativos do React:
- `onMouseDown/Move/Up` para drag
- Handles de resize nos cantos
- `transform: translate() scale() rotate()`

### Persistencia de Estado:

O estado do editor sera mantido apenas em memoria durante a sessao de edicao. Ao "Finalizar", apenas a imagem final exportada sera salva.

---

## Resumo das Etapas de Implementacao

1. Criar estrutura de pastas e componente modal base
2. Implementar `useImageEditor` hook com estado completo
3. Criar `EditorToolbar` com botoes de ferramentas
4. Criar `EditorCanvas` com zoom e navegacao
5. Criar `ElementWrapper` para drag/resize
6. Implementar elementos (Text, Shape, Image)
7. Criar `EditorAIChat` com integracao a edge function
8. Criar `EditorHeader` com exportacao
9. Implementar logica de `html2canvas` para exportar
10. Integrar no `MediaUploader` com botao "Editar Criativo"

