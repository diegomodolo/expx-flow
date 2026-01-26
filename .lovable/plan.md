
# Plano: Garantir que a Imagem Finalizada Seja Salva Corretamente

## Problema Identificado

Quando o usuário finaliza a edição no `ImageEditorModal`, o sistema tenta exportar o canvas HTML visualmente, mas a lógica atual tem uma falha:

1. **Edições via IA**: Quando a IA gera uma nova imagem, ela já está salva no storage e a URL está em `state.images[currentImageIndex]`
2. **Edições manuais (texto/shapes)**: Estas requerem exportar o canvas para criar uma nova imagem combinada

O código atual só exporta a imagem do índice atual e mantém as outras originais, o que pode perder edições.

## Solução Proposta

Modificar a função `handleFinalize` no `ImageEditorModal` para:

1. **Verificar se há elementos de overlay** em cada imagem (textos, shapes, etc.)
2. **Se não houver elementos**: Usar diretamente a URL da imagem do estado (que já pode ter sido atualizada pela IA)
3. **Se houver elementos**: Exportar o canvas com os overlays aplicados
4. **Retornar as imagens corretas** para o componente pai via `onSave()`

## Mudanças Técnicas

### Arquivo: `src/components/image-editor/ImageEditorModal.tsx`

Atualizar a função `handleFinalize`:

```text
handleFinalize atual:
- Para cada imagem, exporta apenas a imagem do índice atual
- Mantém URLs originais para outras imagens

handleFinalize corrigido:
- Para cada imagem, verificar se há elementos de overlay
- Se há elementos: exportar canvas combinando imagem + overlays
- Se não há elementos: usar state.images[i] diretamente (que já contém a imagem editada pela IA)
- Garantir que todas as imagens são processadas corretamente
```

Lógica simplificada:

```text
Para cada imagem no array:
  1. Se a imagem tem elementos (texto, shapes, etc.):
     - Temporariamente mudar para esse slide
     - Renderizar canvas com a imagem + elementos
     - Exportar e fazer upload
     - Usar a nova URL
  2. Se a imagem NÃO tem elementos:
     - Usar diretamente state.images[i]
       (já contém a URL atualizada se foi editada via IA)
```

Para simplificar a implementação inicial, podemos:
- Verificar se a imagem atual (sendo visualizada) tem elementos
- Se tiver: exportar o canvas
- Se não tiver: usar a URL do estado diretamente

Isso resolve o caso mais comum onde o usuário edita via IA e quer salvar.

## Resultado Esperado

1. Usuário abre o editor com uma imagem do criativo
2. Faz edições via IA (gerando novas versões da imagem)
3. Ao clicar em "Finalizar":
   - A última versão da imagem (após todas as edições IA) é capturada
   - Se há textos/shapes adicionados, eles são "queimados" na imagem final
   - A imagem final é retornada ao `MediaUploader` via `onSave()`
4. O `MediaUploader` recebe as novas URLs e atualiza o campo de mídia do criativo

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/image-editor/ImageEditorModal.tsx` | Atualizar `handleFinalize` para usar `state.images` quando não há elementos, e exportar canvas apenas quando há overlays |
