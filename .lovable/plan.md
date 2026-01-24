
# Plano: Ativar Botões de Ação no Carrossel Gerado

## Visão Geral

Implementar a funcionalidade completa dos três botões de ação para o carrossel gerado:
1. **Agendar Publicação** - Enviar para o agendador de posts
2. **Enviar para Planejamento** - Adicionar ao planejamento de conteúdo do cliente  
3. **Enviar para Apresentação** - Adicionar à apresentação de conteúdo do cliente

Os três botões ficarão na mesma linha horizontal.

---

## Alterações Planejadas

### 1. Criar Modal de Agendamento para Carrossel

Criar um componente `SendCarouselToScheduleModal` específico para carrosséis, pois o existente (`SendToScheduleModal`) é para criativos individuais.

| Arquivo | Ação |
|---------|------|
| `src/components/carousel-generator/SendCarouselToScheduleModal.tsx` | Criar novo |

**Funcionalidade:**
- Selecionar plataformas (Instagram, Facebook)
- Escolher data e hora
- Enviar todas as imagens do carrossel como `media_urls`
- Inserir na tabela `scheduled_posts` com `content_type: 'carousel'`

### 2. Criar Modal de Envio para Planejamento

Criar `SendCarouselToPlanModal` para adicionar o carrossel a um planejamento de conteúdo.

| Arquivo | Ação |
|---------|------|
| `src/components/carousel-generator/SendCarouselToPlanModal.tsx` | Criar novo |

**Funcionalidade:**
- Listar planejamentos existentes do cliente
- Opção de criar novo planejamento
- Inserir na tabela `content_plan_posts` com `post_type: 'carrossel'`
- Inserir slides na tabela `content_plan_slides`

### 3. Criar Modal de Envio para Apresentação

Criar `SendCarouselToPresentationModal` para adicionar o carrossel a uma apresentação.

| Arquivo | Ação |
|---------|------|
| `src/components/carousel-generator/SendCarouselToPresentationModal.tsx` | Criar novo |

**Funcionalidade:**
- Listar apresentações existentes do cliente
- Opção de criar nova apresentação
- Inserir na tabela `presentation_creatives` com `creative_type: 'carrossel'`
- Inserir mídia na tabela `creative_media`

### 4. Atualizar GeneratedCarouselPreview

Modificar o componente para:
- Adicionar estados para controle dos modais
- Conectar os callbacks dos botões aos modais
- Reorganizar layout dos botões em linha única

| Arquivo | Ação |
|---------|------|
| `src/components/carousel-generator/GeneratedCarouselPreview.tsx` | Modificar |

---

## Detalhes Técnicos

### Interface do Carrossel Gerado

```typescript
interface GeneratedCarousel {
  id: string;
  client_id: string;     // Precisa buscar da tabela
  company_id: string;    // Precisa buscar da tabela
  carousel_type: string;
  theme: string;
  slides: CarouselSlide[];
  caption: string;
  hashtags: string;
}
```

### Novo Layout dos Botões (3 em linha)

```text
┌─────────────────┬─────────────────┬─────────────────┐
│ 📅 Agendar      │ 📋 Planejamento │ 📑 Apresentação │
│ Publicação      │                 │                 │
└─────────────────┴─────────────────┴─────────────────┘
```

### SendCarouselToScheduleModal

```typescript
interface Props {
  carousel: GeneratedCarousel;
  clientId: string;
  companyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

// Inserção no banco
await supabase.from('scheduled_posts').insert({
  client_id: clientId,
  company_id: companyId,
  caption: carousel.caption,
  media_urls: carousel.slides.map(s => s.image_url).filter(Boolean),
  content_type: 'carousel',
  platforms: selectedPlatforms,
  scheduled_at: scheduledDateTime,
  status: 'scheduled',
  created_by: userId,
  // ... contas de instagram/facebook
});
```

### SendCarouselToPlanModal

```typescript
interface Props {
  carousel: GeneratedCarousel;
  clientId: string;
  companyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

// Fluxo:
// 1. Listar content_plans do cliente
// 2. Selecionar ou criar novo
// 3. Inserir content_plan_posts com post_type: 'carrossel'
// 4. Inserir cada slide em content_plan_slides
```

### SendCarouselToPresentationModal

```typescript
interface Props {
  carousel: GeneratedCarousel;
  clientId: string;
  companyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

// Fluxo:
// 1. Listar content_presentations do cliente
// 2. Selecionar ou criar nova
// 3. Inserir presentation_creatives
// 4. Inserir cada imagem em creative_media
```

### Atualização do GeneratedCarouselPreview

```typescript
// Novos estados
const [showScheduleModal, setShowScheduleModal] = useState(false);
const [showPlanModal, setShowPlanModal] = useState(false);
const [showPresentationModal, setShowPresentationModal] = useState(false);

// Novo layout dos botões
<div className="grid grid-cols-3 gap-2">
  <Button onClick={() => setShowScheduleModal(true)} size="sm">
    <CalendarPlus className="w-3.5 h-3.5 mr-1.5" />
    Agendar
  </Button>
  <Button onClick={() => setShowPlanModal(true)} size="sm" variant="outline">
    <FileText className="w-3.5 h-3.5 mr-1.5" />
    Planejamento
  </Button>
  <Button onClick={() => setShowPresentationModal(true)} size="sm" variant="outline">
    <Presentation className="w-3.5 h-3.5 mr-1.5" />
    Apresentação
  </Button>
</div>
```

---

## Resumo de Arquivos

| # | Arquivo | Ação | Descrição |
|---|---------|------|-----------|
| 1 | `src/components/carousel-generator/SendCarouselToScheduleModal.tsx` | Criar | Modal para agendar publicação do carrossel |
| 2 | `src/components/carousel-generator/SendCarouselToPlanModal.tsx` | Criar | Modal para enviar ao planejamento |
| 3 | `src/components/carousel-generator/SendCarouselToPresentationModal.tsx` | Criar | Modal para enviar à apresentação |
| 4 | `src/components/carousel-generator/GeneratedCarouselPreview.tsx` | Modificar | Integrar modais e reorganizar botões em linha |

---

## Fluxo do Usuário

```text
Carrossel é gerado e exibido na tela
            ↓
┌───────────────────────────────────────────────────┐
│    [Agendar]    [Planejamento]    [Apresentação]  │
└───────────────────────────────────────────────────┘
            ↓ (clique em qualquer um)
     Modal correspondente abre
            ↓
   Usuário configura e confirma
            ↓
   Dados salvos no banco
            ↓
   Toast de sucesso + modal fecha
```
