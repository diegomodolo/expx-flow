# Carousel Studio — Templates por Cliente — Plano de Implementação

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir salvar carrosseis como templates visuais por cliente e aplicá-los ao criar novos carrosseis no wizard.

**Architecture:** Nova tabela `carousel_studio_templates` com JSONB para configs visuais dos slides. Botão "Template" na TopBar abre modal de salvar. Etapa 4 do wizard exibe templates do cliente selecionado e aplica suas configs ao `WizardConfig`. Após criar slides, `CarouselStudio.tsx` aplica os campos visuais do template slide a slide.

**Tech Stack:** React 18, TypeScript, Supabase (PostgreSQL + RLS), TanStack React Query, shadcn/ui, Tailwind CSS

**Spec:** `docs/superpowers/specs/2026-04-15-carousel-studio-templates-design.md`

---

## Chunk 1: Banco de Dados e Tipos

### Task 1: Migration — tabela `carousel_studio_templates`

**Files:**

- Create: `supabase/migrations/20260415000000_carousel_studio_templates.sql`

- [ ] **Step 1: Criar o arquivo de migration**

```sql
-- supabase/migrations/20260415000000_carousel_studio_templates.sql

CREATE TABLE IF NOT EXISTS public.carousel_studio_templates (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  client_id        uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name             text NOT NULL,
  -- campos de projeto
  style            text NOT NULL DEFAULT 'minimalist',
  font_pair        text NOT NULL DEFAULT 'space_inter',
  accent_color     text NOT NULL DEFAULT '#FFD700',
  instagram_handle text,
  image_mode       text NOT NULL DEFAULT 'grid',
  slides_count     int NOT NULL DEFAULT 6,
  -- config visual dos slides (array JSONB, um objeto por slide)
  slides_config    jsonb NOT NULL DEFAULT '[]',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.carousel_studio_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "carousel_studio_templates: company members" ON public.carousel_studio_templates
  FOR ALL USING (company_id IN (SELECT get_user_company_ids()));

-- updated_at trigger
CREATE TRIGGER set_carousel_studio_templates_updated_at
  BEFORE UPDATE ON public.carousel_studio_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- GRANT
GRANT SELECT, INSERT, UPDATE, DELETE ON public.carousel_studio_templates TO authenticated;
```

- [ ] **Step 2: Verificar se a função `set_updated_at` existe**

```bash
grep -r "set_updated_at" supabase/migrations/ | head -5
```

Se não existir, usar trigger inline:

```sql
-- substitui o CREATE TRIGGER acima por:
CREATE OR REPLACE FUNCTION public.set_carousel_studio_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_carousel_studio_templates_updated_at
  BEFORE UPDATE ON public.carousel_studio_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_carousel_studio_templates_updated_at();
```

- [ ] **Step 3: Verificar se `get_user_company_ids` existe**

```bash
grep -r "get_user_company_ids" supabase/migrations/ | head -3
```

Deve existir (usada em várias policies do projeto). Se não existir, consultar a CLAUDE.md — é uma função SECURITY DEFINER já definida no projeto.

- [ ] **Step 4: Aplicar a migration via Supabase MCP**

Usar `mcp__plugin_supabase_supabase__apply_migration` com o conteúdo SQL acima.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260415000000_carousel_studio_templates.sql
git commit -m "feat: migration carousel_studio_templates com RLS e GRANT"
```

---

### Task 2: Tipos TypeScript

**Files:**

- Modify: `src/components/carousel-studio/types.ts`

Os tipos `CarouselTemplate`, `TemplateSlideConfig` são adicionados e `WizardConfig` recebe `selectedTemplate`.

- [ ] **Step 1: Adicionar `TemplateSlideConfig` após a interface `StudioSlide` (linha ~200)**

Inserir após o fechamento de `StudioSlide`:

```typescript
/**
 * Campos visuais de um slide salvos no template.
 * Exclui conteúdo textual, imagens e metadados.
 */
export type TemplateSlideConfig = Omit<
  StudioSlide,
  | "id"
  | "project_id"
  | "headline"
  | "subtitle"
  | "visual_description"
  | "bg_image_url"
  | "bg_position_x"
  | "bg_position_y"
  | "bg_zoom"
  | "content_image_urls"
  | "badge_photo_url"
  | "badge_name_text"
  | "exported_image_url"
  | "created_at"
  | "updated_at"
>;

export interface CarouselTemplate {
  id: string;
  company_id: string;
  client_id: string;
  name: string;
  style: CarouselStyle;
  font_pair: FontPair;
  accent_color: string;
  instagram_handle: string | null;
  image_mode: ImageMode;
  slides_count: number;
  slides_config: TemplateSlideConfig[];
  created_at: string;
  updated_at: string;
}
```

- [ ] **Step 2: Adicionar `selectedTemplate` ao `WizardConfig`**

No final da interface `WizardConfig` (após `clientId: string | null;`), adicionar:

```typescript
  /** Config visual dos slides do template selecionado. Null = sem template. */
  selectedTemplate: TemplateSlideConfig[] | null;
```

- [ ] **Step 3: Adicionar `selectedTemplate: null` ao `DEFAULT_CONFIG` em `StudioWizardModal.tsx`**

No arquivo `src/components/carousel-studio/StudioWizardModal.tsx`, no objeto `DEFAULT_CONFIG` (linha ~52), adicionar:

```typescript
  selectedTemplate: null,
```

- [ ] **Step 4: Verificar compilação TypeScript**

```bash
npm run build 2>&1 | grep -E "error TS" | head -20
```

Não deve haver erros de tipo relacionados aos novos campos.

- [ ] **Step 5: Commit**

```bash
git add src/components/carousel-studio/types.ts src/components/carousel-studio/StudioWizardModal.tsx
git commit -m "feat: tipos CarouselTemplate, TemplateSlideConfig e selectedTemplate no WizardConfig"
```

---

## Chunk 2: Hook e Modal de Salvar

### Task 3: Hook `useCarouselStudioTemplates`

**Files:**

- Create: `src/hooks/useCarouselStudioTemplates.ts`

- [ ] **Step 1: Criar o arquivo do hook**

```typescript
// src/hooks/useCarouselStudioTemplates.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  CarouselTemplate,
  TemplateSlideConfig,
} from "@/components/carousel-studio/types";

/** Lista os templates de um cliente específico */
export function useClientTemplates(clientId: string | null | undefined) {
  return useQuery({
    queryKey: ["carousel-studio-templates", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("carousel_studio_templates")
        .select("*")
        .eq("client_id", clientId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CarouselTemplate[];
    },
    enabled: !!clientId,
  });
}

/** Lista todos os templates da empresa */
export function useCompanyTemplates(companyId: string | undefined) {
  return useQuery({
    queryKey: ["carousel-studio-templates-company", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("carousel_studio_templates")
        .select("*")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CarouselTemplate[];
    },
    enabled: !!companyId,
  });
}

export interface CreateTemplatePayload {
  companyId: string;
  clientId: string;
  name: string;
  style: string;
  fontPair: string;
  accentColor: string;
  instagramHandle: string | null;
  imageMode: string;
  slidesCount: number;
  slidesConfig: TemplateSlideConfig[];
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateTemplatePayload) => {
      const { data, error } = await supabase
        .from("carousel_studio_templates")
        .insert({
          company_id: payload.companyId,
          client_id: payload.clientId,
          name: payload.name,
          style: payload.style,
          font_pair: payload.fontPair,
          accent_color: payload.accentColor,
          instagram_handle: payload.instagramHandle,
          image_mode: payload.imageMode,
          slides_count: payload.slidesCount,
          slides_config: payload.slidesConfig,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (_, payload) => {
      queryClient.invalidateQueries({
        queryKey: ["carousel-studio-templates", payload.clientId],
      });
      queryClient.invalidateQueries({
        queryKey: ["carousel-studio-templates-company", payload.companyId],
      });
    },
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      templateId,
      clientId,
      companyId,
    }: {
      templateId: string;
      clientId: string;
      companyId: string;
    }) => {
      const { error } = await supabase
        .from("carousel_studio_templates")
        .delete()
        .eq("id", templateId);
      if (error) throw error;
    },
    onSuccess: (_, { clientId, companyId }) => {
      queryClient.invalidateQueries({
        queryKey: ["carousel-studio-templates", clientId],
      });
      queryClient.invalidateQueries({
        queryKey: ["carousel-studio-templates-company", companyId],
      });
    },
  });
}
```

- [ ] **Step 2: Verificar tipagem**

```bash
npm run build 2>&1 | grep -E "error TS.*useCarouselStudioTemplates" | head -10
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useCarouselStudioTemplates.ts
git commit -m "feat: hook useCarouselStudioTemplates (list, create, delete)"
```

---

### Task 4: Modal `SaveTemplateModal`

**Files:**

- Create: `src/components/carousel-studio/SaveTemplateModal.tsx`

O modal recebe o projeto atual e os slides atuais. Extrai os campos visuais dos slides (excluindo texto/imagens) e salva via `useCreateTemplate`.

- [ ] **Step 1: Criar o componente**

```typescript
// src/components/carousel-studio/SaveTemplateModal.tsx
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useClients } from "@/hooks/useClients";
import { useCreateTemplate } from "@/hooks/useCarouselStudioTemplates";
import { StudioProject, StudioSlide, TemplateSlideConfig } from "./types";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  project: StudioProject;
  slides: StudioSlide[];
}

/** Campos de StudioSlide a excluir ao gerar a config do template */
const EXCLUDED_SLIDE_FIELDS = new Set([
  "id", "project_id", "headline", "subtitle", "visual_description",
  "bg_image_url", "bg_position_x", "bg_position_y", "bg_zoom",
  "content_image_urls", "badge_photo_url", "badge_name_text",
  "exported_image_url", "created_at", "updated_at",
]);

function extractVisualConfig(slide: StudioSlide): TemplateSlideConfig {
  return Object.fromEntries(
    Object.entries(slide).filter(([key]) => !EXCLUDED_SLIDE_FIELDS.has(key))
  ) as TemplateSlideConfig;
}

export function SaveTemplateModal({ open, onOpenChange, project, slides }: Props) {
  const [name, setName] = useState(project.title.slice(0, 60));
  const [clientId, setClientId] = useState<string>(project.client_id ?? "");
  const [pickerOpen, setPickerOpen] = useState(false);
  const { clients, loading: loadingClients } = useClients();
  const createTemplate = useCreateTemplate();

  const handleSave = async () => {
    if (!clientId) {
      toast.error("Selecione um cliente para o template");
      return;
    }
    if (!name.trim()) {
      toast.error("Informe um nome para o template");
      return;
    }

    const slidesConfig = slides
      .slice()
      .sort((a, b) => a.slide_number - b.slide_number)
      .map(extractVisualConfig);

    try {
      await createTemplate.mutateAsync({
        companyId: project.company_id,
        clientId,
        name: name.trim(),
        style: project.style,
        fontPair: project.font_pair,
        accentColor: project.accent_color,
        instagramHandle: project.instagram_handle,
        imageMode: project.image_mode,
        slidesCount: slides.length,
        slidesConfig,
      });
      toast.success("Template salvo!");
      onOpenChange(false);
    } catch {
      toast.error("Erro ao salvar template");
    }
  };

  React.useEffect(() => {
    if (open) {
      setName(project.title.slice(0, 60));
      setClientId(project.client_id ?? "");
    }
  }, [open, project.title, project.client_id]);

  const selectedClient = clients.find((c) => c.id === clientId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Salvar como Template</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">NOME DO TEMPLATE</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Template Dark Minimalista"
              className="text-sm"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">CLIENTE (OBRIGATÓRIO)</Label>
            <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between text-sm h-9"
                  disabled={loadingClients}
                >
                  <span className="truncate">
                    {selectedClient ? selectedClient.name : "Selecionar cliente..."}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[280px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar cliente..." />
                  <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                  <CommandGroup className="max-h-48 overflow-y-auto">
                    {clients.map((client) => (
                      <CommandItem
                        key={client.id}
                        value={client.name}
                        onSelect={() => {
                          setClientId(client.id);
                          setPickerOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4 shrink-0",
                            clientId === client.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <span className="truncate">{client.name}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={createTemplate.isPending || !name.trim() || !clientId}
          >
            {createTemplate.isPending ? (
              <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Salvando...</>
            ) : (
              "Salvar Template"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Verificar compilação**

```bash
npm run build 2>&1 | grep -E "error TS.*SaveTemplateModal" | head -10
```

- [ ] **Step 3: Commit**

```bash
git add src/components/carousel-studio/SaveTemplateModal.tsx
git commit -m "feat: SaveTemplateModal — salvar carrossel como template por cliente"
```

---

## Chunk 3: Integração no Studio (TopBar + CarouselStudio)

### Task 5: Botão "Template" na `StudioTopBar`

**Files:**

- Modify: `src/components/carousel-studio/StudioTopBar.tsx`

- [ ] **Step 1: Adicionar prop `onOpenSaveTemplate` na interface `Props`**

Localizar a interface `Props` (linha ~17) e adicionar após `onSave`:

```typescript
  onOpenSaveTemplate: () => void;
```

- [ ] **Step 2: Adicionar o parâmetro na desestruturação da função**

Na desestruturação de `StudioTopBar` (linha ~45), adicionar `onOpenSaveTemplate`:

```typescript
export function StudioTopBar({
  style,
  onStyleChange,
  slideIndex,
  slidesTotal,
  onPrev,
  onNext,
  onOpenCaption,
  onOpenRegenerate,
  onOpenSendToPlan,
  onOpenPublish,
  isPreparingPublish,
  onSave,
  onOpenSaveTemplate,
}: Props) {
```

- [ ] **Step 3: Adicionar import do ícone `Bookmark`**

Na linha dos imports do lucide-react, adicionar `Bookmark`:

```typescript
import {
  FileText,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ArrowLeft,
  Save,
  CalendarPlus,
  Send,
  Bookmark,
} from "lucide-react";
```

- [ ] **Step 4: Adicionar o botão entre "Publicar" e o separador**

Localizar o botão "Publicar" (linha ~140) e adicionar o botão Template logo após:

```tsx
{
  /* botão Publicar existente */
}
<Button
  variant="ghost"
  size="sm"
  className="text-muted-foreground text-xs hover:text-foreground"
  onClick={onOpenPublish}
  disabled={isPreparingPublish}
>
  <Send className="w-4 h-4 mr-1" />
  {isPreparingPublish ? "Preparando..." : "Publicar"}
</Button>;

{
  /* NOVO: botão Template */
}
<Button
  variant="ghost"
  size="sm"
  className="text-muted-foreground text-xs hover:text-foreground"
  onClick={onOpenSaveTemplate}
>
  <Bookmark className="w-4 h-4 mr-1" />
  Template
</Button>;
```

- [ ] **Step 5: Verificar compilação**

```bash
npm run build 2>&1 | grep -E "error TS.*StudioTopBar" | head -10
```

- [ ] **Step 6: Commit**

```bash
git add src/components/carousel-studio/StudioTopBar.tsx
git commit -m "feat: botão Template na StudioTopBar"
```

---

### Task 6: Conectar `SaveTemplateModal` em `CarouselStudio.tsx`

**Files:**

- Modify: `src/pages/CarouselStudio.tsx`

- [ ] **Step 1: Importar `SaveTemplateModal`**

No bloco de imports, adicionar:

```typescript
import { SaveTemplateModal } from "@/components/carousel-studio/SaveTemplateModal";
```

- [ ] **Step 2: Adicionar estado `saveTemplateOpen`**

Junto aos outros estados `useState` (após `setPreparingPublish` por exemplo), adicionar:

```typescript
const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
```

- [ ] **Step 3: Passar `onOpenSaveTemplate` para `StudioTopBar`**

Localizar o componente `<StudioTopBar` no JSX e adicionar a prop:

```tsx
onOpenSaveTemplate={() => setSaveTemplateOpen(true)}
```

- [ ] **Step 4: Adicionar o `SaveTemplateModal` no JSX**

Logo antes do `</DashboardLayout>` de fechamento, adicionar (condicionalmente — só renderiza quando projeto e slides carregados):

```tsx
{
  project && slides && slides.length > 0 && (
    <SaveTemplateModal
      open={saveTemplateOpen}
      onOpenChange={setSaveTemplateOpen}
      project={project}
      slides={slides}
    />
  );
}
```

- [ ] **Step 5: Verificar compilação**

```bash
npm run build 2>&1 | grep -E "error TS" | head -20
```

- [ ] **Step 6: Commit**

```bash
git add src/pages/CarouselStudio.tsx
git commit -m "feat: integrar SaveTemplateModal no CarouselStudio"
```

---

## Chunk 4: Wizard — Seleção de Template (Etapa 4)

### Task 7: Seção de Templates na Etapa 4 do `StudioWizardModal`

> **Dependência:** Task 2 (tipos + `DEFAULT_CONFIG`) **deve** ser concluída antes desta task. O `WizardConfig` precisa ter `selectedTemplate` definido e `DEFAULT_CONFIG` precisa ter `selectedTemplate: null` para que o TypeScript não reclame ao chamar `setConfig(DEFAULT_CONFIG)` no `handleReset`.

**Files:**

- Modify: `src/components/carousel-studio/StudioWizardModal.tsx`

- [ ] **Step 1: Adicionar imports no topo do arquivo**

Adicionar imports necessários:

```typescript
import { useClientTemplates } from "@/hooks/useCarouselStudioTemplates";
import { CarouselTemplate } from "./types";
import { LayoutTemplate, Check as CheckIcon } from "lucide-react";
```

> Nota: `Check` já está importado no arquivo. Usar `CheckIcon` como alias se houver conflito, ou reutilizar o `Check` existente.

- [ ] **Step 2: Adicionar estado `selectedTemplateId`**

Junto aos outros `useState` no corpo do componente (após `clientPickerOpen`), adicionar:

```typescript
const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
  null,
);
```

- [ ] **Step 3: Adicionar chamada ao hook de templates**

Logo após `const { clients, loading: loadingClients } = useClients();`, adicionar:

```typescript
const { data: clientTemplates } = useClientTemplates(config.clientId);
```

- [ ] **Step 4: Criar função `handleSelectTemplate`**

Após a função `handleSelectClient`, adicionar:

```typescript
const handleSelectTemplate = (template: CarouselTemplate) => {
  if (selectedTemplateId === template.id) {
    // Deselecionar
    setSelectedTemplateId(null);
    update({ selectedTemplate: null });
    return;
  }
  setSelectedTemplateId(template.id);
  update({
    style: template.style,
    fontPair: template.font_pair as typeof config.fontPair,
    accentColor: template.accent_color,
    instagramHandle: template.instagram_handle ?? config.instagramHandle,
    imageMode: template.image_mode as typeof config.imageMode,
    slidesCount: template.slides_count,
    selectedTemplate: template.slides_config,
  });
};
```

- [ ] **Step 5: Resetar template selecionado no `handleReset`**

Na função `handleReset`, adicionar `setSelectedTemplateId(null);`:

```typescript
const handleReset = () => {
  setStep(1);
  setConfig(DEFAULT_CONFIG);
  setUrlInput("");
  setUrlRationale(null);
  setClientPickerOpen(false);
  setSelectedTemplateId(null); // NOVO
};
```

- [ ] **Step 6: Também resetar template ao mudar de cliente**

Na função `handleSelectClient`, após `update(patch);` adicionar:

```typescript
// Reset template ao trocar de cliente
setSelectedTemplateId(null);
update({ ...patch, selectedTemplate: null });
```

> Atenção: remover o `update(patch)` anterior para não chamar duas vezes. Substituir por um único `update({ ...patch, selectedTemplate: null })`.

- [ ] **Step 7: Adicionar seção de Templates no JSX da Etapa 4**

No JSX do `{step === 4 && ...}`, localizar o bloco do preview do cliente selecionado (o `{config.clientId && (() => { ... })()}`) e adicionar logo após ele a seção de templates:

```tsx
{
  /* Seção de Templates do Cliente */
}
{
  config.clientId && clientTemplates && clientTemplates.length > 0 && (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground flex items-center gap-1">
        <LayoutTemplate className="w-3 h-3" />
        TEMPLATES DO CLIENTE
      </Label>
      <div className="grid grid-cols-2 gap-2">
        {clientTemplates.map((template) => {
          const isSelected = selectedTemplateId === template.id;
          return (
            <button
              key={template.id}
              onClick={() => handleSelectTemplate(template)}
              className={`p-3 rounded-lg border-2 text-left transition-colors relative ${
                isSelected
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50"
              }`}
            >
              {isSelected && (
                <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                  <Check className="w-2.5 h-2.5" />
                </div>
              )}
              <div className="text-xs font-medium truncate pr-5">
                {template.name}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {template.slides_count} slides
              </div>
            </button>
          );
        })}
      </div>
      {selectedTemplateId && (
        <p className="text-xs text-primary flex items-center gap-1">
          <CheckIcon className="w-3 h-3" />
          Estilo, fontes e cores atualizados com o template
        </p>
      )}
    </div>
  );
}
```

> Atenção: `Check` já importado do lucide-react. Se `CheckIcon` causa conflito, usar o mesmo símbolo `Check` — são o mesmo componente.

- [ ] **Step 8: Verificar compilação**

```bash
npm run build 2>&1 | grep -E "error TS" | head -20
```

- [ ] **Step 9: Commit**

```bash
git add src/components/carousel-studio/StudioWizardModal.tsx
git commit -m "feat: seção de templates por cliente na Etapa 4 do wizard"
```

---

## Chunk 5: Aplicar Template ao Criar Carrossel

### Task 8: `applyTemplateConfig` em `GeradorCarrosseis.tsx` + guard no `generateAll`

O template é aplicado em dois lugares:

1. **`GeradorCarrosseis.tsx` (`handleWizardComplete`):** logo após o `INSERT` dos slides (antes do `navigate`), aplica os campos visuais do template direto no banco.
2. **`CarouselStudio.tsx` (`generateAll`):** o `generateAll` não deve sobrescrever campos visuais quando um template foi usado.

**Files:**

- Modify: `src/pages/GeradorCarrosseis.tsx`
- Modify: `src/pages/CarouselStudio.tsx`

---

#### Parte A — `GeradorCarrosseis.tsx`

- [ ] **Step 1: Adicionar import de `TemplateSlideConfig`**

No bloco de imports de `GeradorCarrosseis.tsx`, junto aos outros imports do carousel-studio:

```typescript
import {
  WizardConfig,
  TemplateSlideConfig,
} from "@/components/carousel-studio/types";
```

> `WizardConfig` já pode estar importado — verificar e não duplicar.

- [ ] **Step 2: Adicionar a função `applyTemplateConfig` dentro de `handleWizardComplete`**

Em `handleWizardComplete` (linha 320 de `GeradorCarrosseis.tsx`), **após** o `if (error) throw error;` da inserção dos slides (linha ~337) e **antes** do `setWizardOpen(false)`:

```typescript
// Buscar os IDs dos slides recém-criados
const { data: createdSlides, error: fetchError } = await supabase
  .from("carousel_studio_slides")
  .select("id, slide_number")
  .eq("project_id", projectId)
  .order("slide_number");
if (fetchError) throw fetchError;

// Aplicar config visual do template (se existir)
if (
  config.selectedTemplate &&
  config.selectedTemplate.length > 0 &&
  createdSlides
) {
  for (const slide of createdSlides) {
    const templateSlide = config.selectedTemplate.find(
      (t: TemplateSlideConfig) => t.slide_number === slide.slide_number,
    );
    if (!templateSlide) continue;
    await supabase
      .from("carousel_studio_slides")
      .update(templateSlide)
      .eq("id", slide.id);
  }
}
```

O código completo do `handleWizardComplete` após a edição:

```typescript
const handleWizardComplete = async (config: WizardConfig) => {
  if (!activeCompany?.company_id || !user?.id) return;
  try {
    const projectId = await createProject.mutateAsync({
      companyId: activeCompany.company_id,
      userId: user.id,
      config,
    });

    // Criar slides diretamente via supabase client
    const slideRows = Array.from({ length: config.slidesCount }, (_, i) => ({
      project_id: projectId,
      slide_number: i + 1,
    }));
    const { error } = await supabase
      .from("carousel_studio_slides")
      .insert(slideRows);
    if (error) throw error;

    // Buscar slides recém-criados para aplicar template
    const { data: createdSlides, error: fetchError } = await supabase
      .from("carousel_studio_slides")
      .select("id, slide_number")
      .eq("project_id", projectId)
      .order("slide_number");
    if (fetchError) throw fetchError;

    // Aplicar config visual do template (se existir)
    if (
      config.selectedTemplate &&
      config.selectedTemplate.length > 0 &&
      createdSlides
    ) {
      for (const slide of createdSlides) {
        const templateSlide = config.selectedTemplate.find(
          (t: TemplateSlideConfig) => t.slide_number === slide.slide_number,
        );
        if (!templateSlide) continue;
        await supabase
          .from("carousel_studio_slides")
          .update(templateSlide)
          .eq("id", slide.id);
      }
    }

    setWizardOpen(false);
    navigate(`/geradores/carrosseis/studio/${projectId}`, {
      state: { autoGenerate: config.useAI, config },
    });
  } catch (err) {
    console.error("Erro ao criar projeto no Studio:", err);
    toast.error("Erro ao criar projeto");
  }
};
```

- [ ] **Step 3: Confirmar que o `navigate` usa `config.useAI` (não `true`)**

O código original tinha `autoGenerate: true`, o que aciona `generateAll` mesmo no fluxo manual. O código mostrado acima já usa `config.useAI` — verificar que o arquivo final contém:

```typescript
navigate(`/geradores/carrosseis/studio/${projectId}`, {
  state: { autoGenerate: config.useAI, config },
});
```

- [ ] **Step 4: Commit GeradorCarrosseis**

```bash
git add src/pages/GeradorCarrosseis.tsx
git commit -m "feat: applyTemplateConfig em handleWizardComplete"
```

---

#### Parte B — `CarouselStudio.tsx` (guard no `generateAll`)

O `generateAll` (dentro do `useEffect` de `autoGenerate`) aplica defaults visuais nos slides após a geração de texto — isso **sobrescreveria** o template. O guard protege os campos visuais quando um template foi usado.

- [ ] **Step 4: Identificar o bloco de patch visual no `generateAll`**

No arquivo `src/pages/CarouselStudio.tsx`, dentro do `generateAll`, localizar o bloco que monta o `patch` para cada slide (~linhas 183-207). O bloco atual se parece com:

```typescript
const patch: Partial<StudioSlide> = {
  text_alignment: "left",
  text_position: textPosition,
};

// Margem vertical baseada na posição (padrão geral)
if (textPosition.startsWith("bottom_")) patch.text_padding_y = 150;
else if (textPosition.startsWith("top_")) patch.text_padding_y = 132;

// Slide 1 (capa): bottom_left 196px, fonte 80px, overlay base_strong 100%
if (idx === 0) {
  patch.font_size_title = 80;
  patch.text_padding_y = 196;
  patch.overlay_style = "base_strong";
  patch.overlay_opacity = 100;
}
if (s.headline != null) patch.headline = s.headline;
if (s.subtitle != null) patch.subtitle = s.subtitle;
updateSlide(s.id, patch);
```

- [ ] **Step 5: Adicionar o guard `if (!config.selectedTemplate)` em torno dos campos visuais**

Substituir o bloco acima por:

```typescript
const patch: Partial<StudioSlide> = {};

// Só aplica defaults de posição/estilo se NÃO veio de template
// (template já foi aplicado no banco antes do navigate)
if (!config.selectedTemplate) {
  patch.text_alignment = "left";
  patch.text_position = textPosition;

  if (textPosition.startsWith("bottom_")) patch.text_padding_y = 150;
  else if (textPosition.startsWith("top_")) patch.text_padding_y = 132;

  if (idx === 0) {
    patch.font_size_title = 80;
    patch.text_padding_y = 196;
    patch.overlay_style = "base_strong";
    patch.overlay_opacity = 100;
  }
}

// Headline e subtitle sempre aplicados (independente do template)
if (s.headline != null) patch.headline = s.headline;
if (s.subtitle != null) patch.subtitle = s.subtitle;
updateSlide(s.id, patch);
```

> `config` aqui é `navState.config` (lido de `location.state` na linha ~123). A referência é válida porque `config` é capturado no início do `useEffect` como variável estável.

- [ ] **Step 6: Verificar compilação completa**

```bash
npm run build 2>&1 | grep -E "error TS" | head -20
```

- [ ] **Step 7: Commit CarouselStudio**

```bash
git add src/pages/CarouselStudio.tsx
git commit -m "feat: guard no generateAll para preservar config do template"
```

---

## Verificação Final

- [ ] **Testar "Salvar como Template":**
  1. Abrir um carrossel existente no studio
  2. Clicar em "Template" na TopBar
  3. Modal abre com nome pré-preenchido e cliente pré-selecionado
  4. Confirmar — toast "Template salvo!" aparece

- [ ] **Testar template no wizard:**
  1. Ir para `/geradores/carrosseis` e clicar em "Novo Carrossel"
  2. Chegar na Etapa 4, selecionar o cliente que tem templates
  3. Seção "TEMPLATES DO CLIENTE" aparece com os cards
  4. Clicar num template — fontes, cores, slides_count atualizam
  5. Criar o carrossel — visual dos slides reflete o template

- [ ] **Verificar fluxo IA com template:**
  - Texto (headline/subtitle) gerado normalmente pela IA
  - Posicionamento/overlay/fontes do template preservados (não sobrescritos pelo `generateAll`)

- [ ] **Commit de verificação (se necessário ajuste)**

```bash
git add -p
git commit -m "fix: ajustes no fluxo de aplicação do template"
```
