
# Plano: Corrigir Botão "Editar" nos Slides do Carrossel

## Problema Identificado
O botão "Editar" dentro dos cards de slide do carrossel não está funcionando - o cursor não muda para "mãozinha" (pointer) e os cliques não são registrados, mesmo com `e.stopPropagation()` implementado.

## Análise Realizada
Comparei o botão "Editar" com os botões "Enviar" e "Gerar" que funcionam corretamente:

| Botão | Funciona? | Classes | onClick |
|-------|-----------|---------|---------|
| Enviar (ImageUploader) | Sim | `text-xs h-7 w-full gap-1` | Simples |
| Gerar | Sim | `flex-1 gap-1 text-xs h-7` | Simples, sem stopPropagation |
| Editar | Não | `gap-1 text-xs h-7` | Com stopPropagation e preventDefault |

## Causas Prováveis
1. O `e.preventDefault()` pode estar interferindo com o comportamento padrão do botão
2. O botão pode estar sendo sobreposto por algum elemento com z-index maior
3. Falta a classe `cursor-pointer` explícita para garantir o cursor correto

## Solução Proposta

Modificar o botão "Editar" no arquivo `src/components/content-planner/ContentPlanPostCard.tsx`:

**Mudanças:**
1. Remover `e.preventDefault()` - não é necessário para botões
2. Adicionar `relative z-10` às classes para garantir que o botão fique acima de outros elementos
3. Adicionar `cursor-pointer` explicitamente para garantir o cursor correto
4. Manter apenas `e.stopPropagation()` para evitar que o clique propague para o Card pai

**Código Atual (linhas 378-391):**
```tsx
{slide.image_url && clientId && activeCompany?.company_id && (
  <Button
    variant="outline"
    size="sm"
    className="gap-1 text-xs h-7"
    onClick={(e) => {
      e.stopPropagation();
      e.preventDefault();
      setShowImageEditor(true);
    }}
  >
    <Pencil className="w-3 h-3" />
    Editar
  </Button>
)}
```

**Código Corrigido:**
```tsx
{slide.image_url && clientId && activeCompany?.company_id && (
  <Button
    variant="outline"
    size="sm"
    className="gap-1 text-xs h-7 relative z-10 cursor-pointer"
    onClick={(e) => {
      e.stopPropagation();
      console.log("Edit button clicked"); // Para debug
      setShowImageEditor(true);
    }}
  >
    <Pencil className="w-3 h-3" />
    Editar
  </Button>
)}
```

## Arquivos a Modificar
- `src/components/content-planner/ContentPlanPostCard.tsx` (1 arquivo)

## Resultado Esperado
Após a correção:
- O cursor mudará para "mãozinha" ao passar sobre o botão "Editar"
- Clicar no botão abrirá o modal de edição de imagem
- O comportamento será consistente com os outros botões no mesmo container
