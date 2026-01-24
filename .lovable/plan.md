
# Plano: Adicionar Criação de Conjuntos e Criativos em Campanhas/Ad Sets Existentes

## Visão Geral

Implementar botões para criar **novos conjuntos de anúncios dentro de campanhas existentes** e **novos criativos dentro de ad sets existentes**, além de alterar o modo de visualização padrão dos criativos de grid para lista/tabela.

---

## Alterações Resumidas

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/pages/cliente/ClienteCriativos.tsx` | Modificar | Default de viewMode para "table" + botão "Novo Criativo" |
| `src/pages/cliente/ClienteConjuntos.tsx` | Modificar | Adicionar botão "Novo Conjunto" |
| `src/components/campaigns/AdSetBuilderModal.tsx` | Criar | Modal para criar ad set em campanha existente |
| `src/components/campaigns/CreativeBuilderModal.tsx` | Criar | Modal para criar criativo em ad set existente |
| `src/hooks/useAdSetBuilder.tsx` | Criar | Hook para gerenciar estado/submissão de ad set |
| `src/hooks/useCreativeBuilder.tsx` | Criar | Hook para gerenciar estado/submissão de criativo |
| `supabase/functions/create-meta-adset/index.ts` | Criar | Edge function para criar ad set no Meta |
| `supabase/functions/create-meta-ad/index.ts` | Criar | Edge function para criar criativo/anúncio no Meta |

---

## Detalhes de Implementação

### 1. Alterar Visualização Padrão dos Criativos

No arquivo `src/pages/cliente/ClienteCriativos.tsx`, linha 64:

```typescript
// Antes
const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

// Depois
const [viewMode, setViewMode] = useState<"grid" | "table">("table");
```

---

### 2. Botão "Novo Conjunto" na Página de Conjuntos

No `ClienteConjuntos.tsx`, adicionar:
- Estado para controlar modal: `const [showAdSetModal, setShowAdSetModal] = useState(false)`
- Botão junto aos filtros existentes:

```typescript
<Button
  variant="default"
  size="sm"
  onClick={() => setShowAdSetModal(true)}
>
  <Plus className="w-4 h-4 mr-1" />
  Novo Conjunto
</Button>
```

- Importar e renderizar `AdSetBuilderModal`

---

### 3. Botão "Novo Criativo" na Página de Criativos

No `ClienteCriativos.tsx`, adicionar:
- Estado para controlar modal: `const [showCreativeModal, setShowCreativeModal] = useState(false)`
- Botão junto aos filtros existentes:

```typescript
<Button
  variant="default"
  size="sm"
  onClick={() => setShowCreativeModal(true)}
>
  <Plus className="w-4 h-4 mr-1" />
  Novo Criativo
</Button>
```

- Importar e renderizar `CreativeBuilderModal`

---

### 4. AdSetBuilderModal - Novo Componente

Modal que permite criar um conjunto de anúncios dentro de uma campanha existente.

```text
┌──────────────────────────────────────────────────┐
│  Novo Conjunto de Anúncios                    X  │
├──────────────────────────────────────────────────┤
│                                                  │
│  Campanha *                                      │
│  [▼ Selecionar campanha existente...]           │
│                                                  │
│  Nome do Conjunto *                              │
│  [_________________________________]             │
│                                                  │
│  ─── Segmentação ───                            │
│  Públicos de inclusão: [Multi-select]           │
│  Públicos de exclusão: [Multi-select]           │
│                                                  │
│  ─── Demografia ───                             │
│  Idade: [18] ─────○───── [65]                   │
│  Gênero: [▼ Todos]                              │
│                                                  │
│  ─── Conversão (opcional) ───                   │
│  Pixel: [▼ Selecionar...]                       │
│  Evento: [▼ Selecionar...]                      │
│                                                  │
├──────────────────────────────────────────────────┤
│                    [Cancelar]  [Criar Conjunto]  │
└──────────────────────────────────────────────────┘
```

**Props:**
- `isOpen: boolean`
- `onClose: () => void`
- `clientId: string`
- `companyId: string`
- `preSelectedCampaignId?: string` (opcional, para pré-selecionar)
- `onSuccess?: () => void`

**Comportamento:**
- Dropdown lista campanhas ativas do cliente (usando `useUnifiedCampaigns`)
- Reutiliza componentes existentes: `AudienceMultiSelect`, `PixelSelector`, `ConversionEventSelector`, `Slider`
- Chama edge function `create-meta-adset` ao submeter

---

### 5. CreativeBuilderModal - Novo Componente

Modal que permite criar um criativo/anúncio dentro de um ad set existente.

```text
┌──────────────────────────────────────────────────┐
│  Novo Criativo                                X  │
├──────────────────────────────────────────────────┤
│                                                  │
│  Campanha *                                      │
│  [▼ Selecionar campanha...]                     │
│                                                  │
│  Conjunto de Anúncios *                          │
│  [▼ Selecionar conjunto...] (filtra por camp.)  │
│                                                  │
│  ─── Criativo ───                               │
│  Tipo: [Imagem] [Vídeo] [Carrossel]             │
│                                                  │
│  Mídia: [Upload / URL]                          │
│                                                  │
│  Texto principal *                               │
│  [_________________________________]             │
│                                                  │
│  Título                                          │
│  [_________________________________]             │
│                                                  │
│  URL de destino *                                │
│  [_________________________________]             │
│                                                  │
│  Call to Action: [▼ Saiba mais]                 │
│                                                  │
│  ─── Preview ───                                │
│  [Mockup do criativo no feed]                   │
│                                                  │
├──────────────────────────────────────────────────┤
│                    [Cancelar]  [Criar Criativo]  │
└──────────────────────────────────────────────────┘
```

**Props:**
- `isOpen: boolean`
- `onClose: () => void`
- `clientId: string`
- `companyId: string`
- `clientName?: string`
- `preSelectedCampaignId?: string`
- `preSelectedAdSetId?: string`
- `onSuccess?: () => void`

**Comportamento:**
- Dropdown de campanha lista campanhas ativas
- Dropdown de ad set filtra por campanha selecionada (usando `useUnifiedAdGroups`)
- Reutiliza o componente `CreativeEditor` existente para edição do criativo
- Chama edge function `create-meta-ad` ao submeter

---

### 6. Hook useAdSetBuilder

Gerencia o estado e submissão do ad set:

```typescript
interface AdSetBuilderState {
  campaignId: string;
  name: string;
  includedAudiences: string[];
  excludedAudiences: string[];
  ageMin: number;
  ageMax: number;
  genders: number[];
  pixelId?: string;
  conversionEvent?: string;
  isSubmitting: boolean;
}
```

---

### 7. Hook useCreativeBuilder

Gerencia o estado e submissão do criativo:

```typescript
interface CreativeBuilderState {
  campaignId: string;
  adSetId: string;
  type: 'IMAGE' | 'VIDEO' | 'CAROUSEL';
  mediaUrls: string[];
  body: string;
  title: string;
  description: string;
  linkUrl: string;
  callToAction: string;
  urlParameters: UrlParameters;
  isSubmitting: boolean;
}
```

---

### 8. Edge Function create-meta-adset

Nova função que cria apenas um ad set dentro de uma campanha existente no Meta:

**Endpoint:** `create-meta-adset`

**Request Body:**
```typescript
{
  clientId: string;
  campaignId: string;        // ID local da campanha
  metaCampaignId: string;    // ID no Meta (facebook_id)
  adSet: {
    name: string;
    pixel_id?: string;
    conversion_event?: string;
    targeting: {
      custom_audiences?: string[];
      excluded_audiences?: string[];
      age_min?: number;
      age_max?: number;
      genders?: number[];
    };
  };
}
```

**Lógica:**
1. Buscar cliente e access token do Facebook
2. Determinar optimization_goal baseado no objetivo da campanha
3. Criar ad set via Meta Graph API (`/act_xxx/adsets`)
4. Salvar no banco de dados local (tabela `ad_sets`)
5. Retornar IDs criados

---

### 9. Edge Function create-meta-ad

Nova função que cria um criativo + anúncio dentro de um ad set existente:

**Endpoint:** `create-meta-ad`

**Request Body:**
```typescript
{
  clientId: string;
  adSetId: string;           // ID local do ad set
  metaAdSetId: string;       // ID no Meta (facebook_id)
  creative: {
    type: 'IMAGE' | 'VIDEO' | 'CAROUSEL';
    media_urls: string[];
    body: string;
    title: string;
    description?: string;
    link_url: string;
    call_to_action: string;
    url_parameters?: UrlParameters;
  };
}
```

**Lógica:**
1. Buscar cliente, ad set e access token
2. Criar ad creative via Meta Graph API
3. Criar ad vinculado ao ad set
4. Salvar no banco local (tabela `ads`)
5. Retornar IDs criados

---

## Fluxo de Uso

### Criar Conjunto em Campanha Existente:
1. Usuário acessa "Conjuntos de Anúncios"
2. Clica em "Novo Conjunto"
3. Modal abre, seleciona campanha no dropdown
4. Preenche nome, segmentação, demographics
5. Clica "Criar Conjunto"
6. Sistema cria no Meta e salva localmente
7. Lista atualiza automaticamente

### Criar Criativo em Ad Set Existente:
1. Usuário acessa "Criativos"
2. Clica em "Novo Criativo"
3. Modal abre, seleciona campanha e depois ad set
4. Preenche mídia, textos, URL, CTA
5. Visualiza preview
6. Clica "Criar Criativo"
7. Sistema cria no Meta e salva localmente
8. Lista atualiza automaticamente

---

## Reutilização de Componentes

Componentes existentes que serão reutilizados:
- `AudienceMultiSelect` - Seleção de públicos
- `PixelSelector` - Seleção de pixel
- `ConversionEventSelector` - Seleção de evento
- `CreativeEditor` - Editor completo do criativo
- `MediaUploader` - Upload de mídia
- `FeedPreview` - Preview do anúncio

---

## Ordem de Implementação

1. **Alteração simples:** Default de viewMode para "table" em `ClienteCriativos.tsx`
2. **Edge functions:** `create-meta-adset` e `create-meta-ad`
3. **Hooks:** `useAdSetBuilder` e `useCreativeBuilder`
4. **Modals:** `AdSetBuilderModal` e `CreativeBuilderModal`
5. **Integração:** Adicionar botões e modals nas páginas
