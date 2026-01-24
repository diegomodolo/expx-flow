
# Plano: Modal de Edição Completa para Criativos (Ads)

## Situação Atual

Atualmente, quando você clica em um criativo/anúncio no Editor de Campanhas, abre apenas o `InspectorPanel` (painel lateral) que mostra informações de métricas, mas não permite edição completa. Você solicitou um modal completo igual ao do Conjunto de Anúncios (`AdSetEditModal`), com todos os campos editáveis.

---

## Solução Proposta

Criar um novo componente `AdEditModal` similar ao `AdSetEditModal`, permitindo edição completa do criativo:
- Nome do anúncio
- Status (ativo/pausado)
- Tipo de criativo (Imagem/Vídeo/Carrossel)
- Mídia (upload de imagem/vídeo, importar do Instagram, gerar com IA)
- Texto principal (body)
- Título e descrição
- URL de destino
- Call to Action
- Parâmetros UTM

---

## Arquitetura

```text
AdEditModal (Dialog)
├── Header (nome, status badge, plataforma)
├── ScrollArea
│   ├── Nome do Anúncio
│   ├── Status (Switch ativo/pausado)
│   ├── Tipo de Criativo (ToggleGroup)
│   ├── MediaUploader (upload/Instagram/IA)
│   ├── Textos (body, title, description)
│   ├── URL de Destino
│   ├── Call to Action (Select)
│   ├── Parâmetros UTM (opcional)
│   └── Métricas Atuais (read-only)
└── Footer (Cancelar / Salvar)
```

---

## Campos Editáveis

| Campo | Editável Local | Editável Meta |
|-------|----------------|---------------|
| Nome | Sim | Sim (rename) |
| Status | Sim | Sim (toggle) |
| Tipo Criativo | Sim | Requer novo criativo |
| Mídia | Sim | Requer novo criativo |
| Texto Principal | Sim | Requer novo criativo |
| Título | Sim | Requer novo criativo |
| Descrição | Sim | Requer novo criativo |
| URL de Destino | Sim | Requer novo criativo |
| Call to Action | Sim | Requer novo criativo |
| UTMs | Sim | Requer novo criativo |

Nota: No Meta, apenas nome e status podem ser atualizados diretamente. Para alterar o criativo (mídia, textos, URL), é necessário criar um novo ad creative. O modal permitirá edição local imediata, mas mostrará um aviso quando campos do criativo forem alterados.

---

## Edge Function para Atualização

Criar `update-meta-ad` para:
1. Atualizar nome e status diretamente via API Meta
2. Quando o criativo mudar, criar novo ad creative e atualizar o anúncio para usá-lo
3. Sincronizar alterações no banco local

### Campos na tabela `ads`

A tabela já possui todos os campos necessários:
- `name`, `status`, `is_active`
- `creative_type`, `creative_body`, `creative_title`, `creative_description`
- `image_url`, `video_url`, `link_url`, `call_to_action`

---

## Componentes a Criar/Modificar

### 1. Criar AdEditModal.tsx

Novo componente com:
- Estado local para todos os campos editáveis
- Integração com `MediaUploader` existente
- Seletor de CTA (opções já definidas em `CreativeBuilderModal`)
- Campos de UTM (utm_source, utm_medium, utm_campaign)
- Seção de métricas (read-only)
- Lógica de detecção de mudanças no criativo vs nome/status
- Botão de salvar com loading state

### 2. Criar Edge Function update-meta-ad

- Recebe: `adId`, `facebookId`, `clientId`, `updates`
- Se apenas nome/status mudou: PATCH direto na API Meta
- Se criativo mudou: Criar novo `adcreative` e atualizar o ad
- Atualizar registro local na tabela `ads`

### 3. Modificar CampaignEditorPage.tsx

- Adicionar estado `adModalOpen`
- Modificar `handleSelectNode` para abrir `AdEditModal` quando tipo é 'ad'
- Passar props necessárias ao modal

---

## Fluxo de Edição

```text
1. Usuário clica em criativo na árvore
2. AdEditModal abre com dados do criativo
3. Usuário edita campos desejados
4. Usuário clica "Salvar Alterações"
5. Sistema detecta tipo de alteração:
   a. Apenas nome/status → PATCH simples no Meta
   b. Criativo mudou → Cria novo ad creative + atualiza ad
6. Atualiza banco local
7. Mostra toast de sucesso
8. Invalida queries para atualizar a árvore
9. Fecha modal
```

---

## Interface Visual do Modal

- Header com ícone, nome atual, badges de status e plataforma
- Campos organizados em seções claras:
  - Identificação (nome, status)
  - Criativo (tipo, mídia, textos)
  - Destino (URL, CTA, UTMs)
  - Métricas (read-only)
- Aviso quando alterações no criativo exigem recriação
- Botão salvar desabilitado se não houver alterações

---

## Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `src/components/campaign-editor/AdEditModal.tsx` | Criar (novo modal de edição) |
| `supabase/functions/update-meta-ad/index.ts` | Criar (edge function para atualização) |
| `supabase/config.toml` | Adicionar função update-meta-ad |
| `src/pages/cliente/CampaignEditorPage.tsx` | Modificar (integrar AdEditModal) |

---

## Validações

1. Nome não pode ser vazio
2. Pelo menos uma mídia é obrigatória
3. URL de destino deve ser válida (começar com http/https)
4. Texto principal (body) é obrigatório
5. Mostrar aviso visual para campanhas Google (edição apenas local)
6. Indicar quando alterações no criativo exigirão recriação no Meta

---

## Notas Técnicas

- Reutilizar `MediaUploader` existente (suporta upload, Instagram, IA)
- Reutilizar `CTA_OPTIONS` do `CreativeBuilderModal`
- O `TreeNode` já possui: `creativeUrl`, `creativeBody`, `creativeTitle`, `creativeType`, `callToAction`, `linkUrl`
- A lógica de criação de ad creative já existe em `create-meta-ad/index.ts` e pode ser reutilizada
