# Copywriter por Cliente — Carousel Studio — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir configurar um "Copywriter" por cliente no Carousel Studio, para que quando um cliente com copywriter configurado for selecionado, a IA gere todos os textos e legendas do carrossel seguindo o tom, linguagem e regras de copy do cliente.

**Architecture:** Nova tabela `client_copywriters` (1:1 com `clients`) armazena as instruções. No wizard, o Passo 4 exibe um botão para abrir `ClientCopywriterModal`. Ao gerar o carrossel, o frontend serializa as instruções do copywriter e as passa para as Edge Functions de geração, que as injetam no `systemPrompt` da IA.

**Tech Stack:** React 18 + TypeScript, Supabase (PostgreSQL + Edge Functions), TanStack React Query, shadcn/ui, Deno (Edge Functions), Sonner (toasts)

---

## Chunk 1: Banco de Dados e Hook

### Task 1: Migration — tabela `client_copywriters`

**Files:**

- Create: `supabase/migrations/20260415300000_client_copywriters.sql`

> **IMPORTANTE:** A função `get_user_company_ids()` já existe no banco — NÃO recriar. Apenas criar a tabela, RLS e GRANT.

- [ ] **Step 1: Criar o arquivo de migration**

```sql
-- supabase/migrations/20260415300000_client_copywriters.sql

CREATE TABLE public.client_copywriters (
  client_id           uuid PRIMARY KEY REFERENCES public.clients(id) ON DELETE CASCADE,
  company_id          uuid NOT NULL REFERENCES public.companies(company_id) ON DELETE CASCADE,
  tom_de_voz          text,
  publico_alvo        text,
  persona_marca       text,
  regras_de_copy      text,
  exemplos_aprovados  text,
  palavras_evitar     text,
  palavras_preferidas text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_copywriters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company members can manage client_copywriters"
  ON public.client_copywriters
  FOR ALL
  USING (company_id = ANY(public.get_user_company_ids()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_copywriters TO authenticated;
```

- [ ] **Step 2: Aplicar a migration via MCP Supabase**

Use `mcp__plugin_supabase_supabase__apply_migration` com o conteúdo acima.

- [ ] **Step 3: Verificar que a tabela foi criada**

Use `mcp__plugin_supabase_supabase__execute_sql`:

```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'client_copywriters' ORDER BY ordinal_position;
```

Expected: 9 colunas (client_id, company_id, tom_de_voz, publico_alvo, persona_marca, regras_de_copy, exemplos_aprovados, palavras_evitar, palavras_preferidas) + created_at + updated_at.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260415300000_client_copywriters.sql
git commit -m "feat: add client_copywriters table with RLS"
```

---

### Task 2: Hook `useClientCopywriter`

**Files:**

- Create: `src/hooks/useClientCopywriter.ts`

- [ ] **Step 1: Criar o hook**

```typescript
// src/hooks/useClientCopywriter.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ClientCopywriter {
  client_id: string;
  company_id: string;
  tom_de_voz: string | null;
  publico_alvo: string | null;
  persona_marca: string | null;
  regras_de_copy: string | null;
  exemplos_aprovados: string | null;
  palavras_evitar: string | null;
  palavras_preferidas: string | null;
}

export type ClientCopywriterInput = Omit<ClientCopywriter, "company_id">;

export function useClientCopywriter(clientId: string | null | undefined) {
  return useQuery({
    queryKey: ["client-copywriter", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_copywriters")
        .select("*")
        .eq("client_id", clientId!)
        .maybeSingle();
      if (error) throw error;
      return data as ClientCopywriter | null;
    },
    enabled: !!clientId,
  });
}

export function useSaveClientCopywriter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: ClientCopywriterInput & { company_id: string },
    ) => {
      const { error } = await supabase
        .from("client_copywriters")
        .upsert(input, { onConflict: "client_id" });
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["client-copywriter", variables.client_id],
      });
      toast.success("Copywriter salvo com sucesso!");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Erro ao salvar copywriter");
    },
  });
}

/**
 * Serializa as instruções do copywriter em um bloco de texto para injetar no systemPrompt da IA.
 * Campos vazios/nulos são omitidos.
 */
export function serializeCopywriter(
  cw: ClientCopywriter | null | undefined,
): string | null {
  if (!cw) return null;

  const lines: string[] = [];

  if (cw.tom_de_voz?.trim()) lines.push(`Tom de voz: ${cw.tom_de_voz.trim()}`);
  if (cw.publico_alvo?.trim())
    lines.push(`Público-alvo: ${cw.publico_alvo.trim()}`);
  if (cw.persona_marca?.trim())
    lines.push(`Persona da marca: ${cw.persona_marca.trim()}`);
  if (cw.regras_de_copy?.trim())
    lines.push(`Regras de copy: ${cw.regras_de_copy.trim()}`);
  if (cw.palavras_preferidas?.trim())
    lines.push(`Palavras preferidas: ${cw.palavras_preferidas.trim()}`);
  if (cw.palavras_evitar?.trim())
    lines.push(`Palavras a evitar: ${cw.palavras_evitar.trim()}`);
  if (cw.exemplos_aprovados?.trim()) {
    lines.push(
      `Exemplos de copies aprovadas:\n${cw.exemplos_aprovados.trim()}`,
    );
  }

  if (lines.length === 0) return null;
  return lines.join("\n");
}
```

- [ ] **Step 2: Verificar que o arquivo compila sem erros**

```bash
npx tsc --noEmit
```

Expected: 0 erros relacionados ao novo arquivo.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useClientCopywriter.ts
git commit -m "feat: add useClientCopywriter hook with serialize utility"
```

---

## Chunk 2: Modal de Configuração do Copywriter

### Task 3: Componente `ClientCopywriterModal`

**Files:**

- Create: `src/components/carousel-studio/ClientCopywriterModal.tsx`

- [ ] **Step 1: Criar o modal**

```typescript
// src/components/carousel-studio/ClientCopywriterModal.tsx
import React, { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import {
  ClientCopywriter,
  useClientCopywriter,
  useSaveClientCopywriter,
} from "@/hooks/useClientCopywriter";
import { useCompany } from "@/contexts/CompanyContext";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clientId: string;
  clientName: string;
}

type FormValues = Omit<ClientCopywriter, "client_id" | "company_id">;

export function ClientCopywriterModal({
  open,
  onOpenChange,
  clientId,
  clientName,
}: Props) {
  const { activeCompany } = useCompany();
  const { data: existing, isLoading } = useClientCopywriter(clientId);
  const { mutate: save, isPending: isSaving } = useSaveClientCopywriter();

  const { register, handleSubmit, reset } = useForm<FormValues>({
    defaultValues: {
      tom_de_voz: "",
      publico_alvo: "",
      persona_marca: "",
      regras_de_copy: "",
      exemplos_aprovados: "",
      palavras_evitar: "",
      palavras_preferidas: "",
    },
  });

  useEffect(() => {
    if (existing) {
      reset({
        tom_de_voz: existing.tom_de_voz ?? "",
        publico_alvo: existing.publico_alvo ?? "",
        persona_marca: existing.persona_marca ?? "",
        regras_de_copy: existing.regras_de_copy ?? "",
        exemplos_aprovados: existing.exemplos_aprovados ?? "",
        palavras_evitar: existing.palavras_evitar ?? "",
        palavras_preferidas: existing.palavras_preferidas ?? "",
      });
    }
  }, [existing, reset]);

  const onSubmit = (values: FormValues) => {
    save(
      {
        client_id: clientId,
        company_id: activeCompany.company_id,
        ...values,
      },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Copywriter — {clientName}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">TOM DE VOZ</Label>
              <Input
                {...register("tom_de_voz")}
                placeholder="Ex: Informal, próximo, usa linguagem leve..."
                className="text-sm"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">PÚBLICO-ALVO</Label>
              <Input
                {...register("publico_alvo")}
                placeholder="Ex: Mulheres 25-40, interessadas em saúde..."
                className="text-sm"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">PERSONA DA MARCA</Label>
              <Input
                {...register("persona_marca")}
                placeholder="Ex: Marca humanizada, como uma amiga expert..."
                className="text-sm"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">REGRAS DE COPY</Label>
              <Textarea
                {...register("regras_de_copy")}
                placeholder="Ex: Sempre termine slides com pergunta, use técnica PAS..."
                className="min-h-[70px] resize-none text-sm"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">PALAVRAS/TERMOS PREFERIDOS</Label>
              <Input
                {...register("palavras_preferidas")}
                placeholder="Ex: transformação, resultado, jornada"
                className="text-sm"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">PALAVRAS/TERMOS A EVITAR</Label>
              <Input
                {...register("palavras_evitar")}
                placeholder="Ex: barato, promoção, compre agora"
                className="text-sm"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">EXEMPLOS DE COPIES APROVADAS</Label>
              <Textarea
                {...register("exemplos_aprovados")}
                placeholder="Cole aqui exemplos de textos que funcionaram bem para este cliente..."
                className="min-h-[100px] resize-none text-sm"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar Copywriter"
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Verificar compilação**

```bash
npx tsc --noEmit
```

Expected: 0 erros novos.

- [ ] **Step 3: Commit**

```bash
git add src/components/carousel-studio/ClientCopywriterModal.tsx
git commit -m "feat: add ClientCopywriterModal component"
```

---

## Chunk 3: Wizard — Passo 4 e WizardConfig

### Task 4: Atualizar `types.ts` — adicionar `copywriterInstructions` ao `WizardConfig`

**Files:**

- Modify: `src/components/carousel-studio/types.ts`

- [ ] **Step 1: Ler o arquivo atual**

Leia `src/components/carousel-studio/types.ts` e localize a interface `WizardConfig`.

- [ ] **Step 2: Adicionar o campo `copywriterInstructions`**

No bloco da interface `WizardConfig`, adicionar após o campo `selectedTemplate`:

```typescript
copywriterInstructions: string | null;
```

- [ ] **Step 3: Atualizar `DEFAULT_CONFIG` em `StudioWizardModal.tsx`**

No arquivo `src/components/carousel-studio/StudioWizardModal.tsx`, no objeto `DEFAULT_CONFIG`, adicionar:

```typescript
copywriterInstructions: null,
```

- [ ] **Step 4: Verificar compilação**

```bash
npx tsc --noEmit
```

Expected: 0 erros novos (pode aparecer aviso sobre campo não usado em GeradorCarrosseis — será resolvido na Task 6).

- [ ] **Step 5: Commit**

```bash
git add src/components/carousel-studio/types.ts src/components/carousel-studio/StudioWizardModal.tsx
git commit -m "feat: add copywriterInstructions to WizardConfig"
```

---

### Task 5: Atualizar `StudioWizardModal` — botão de copywriter no Passo 4

**Files:**

- Modify: `src/components/carousel-studio/StudioWizardModal.tsx`

- [ ] **Step 1: Adicionar imports necessários**

No topo do arquivo, adicionar aos imports existentes:

```typescript
import { ClientCopywriterModal } from "./ClientCopywriterModal";
import {
  useClientCopywriter,
  serializeCopywriter,
} from "@/hooks/useClientCopywriter";
import { PenSquare, CheckCircle2 } from "lucide-react";
```

- [ ] **Step 2: Adicionar estado e dados do copywriter**

Dentro do componente `StudioWizardModal`, após as linhas existentes de hooks, adicionar:

```typescript
const [copywriterModalOpen, setCopywriterModalOpen] = useState(false);
const { data: copywriter } = useClientCopywriter(config.clientId);
const hasCopywriter = !!(
  copywriter &&
  [
    copywriter.tom_de_voz,
    copywriter.publico_alvo,
    copywriter.persona_marca,
    copywriter.regras_de_copy,
    copywriter.exemplos_aprovados,
    copywriter.palavras_evitar,
    copywriter.palavras_preferidas,
  ].some((v) => v?.trim())
);
```

- [ ] **Step 3: Injetar o botão no Passo 4, após o preview do cliente**

No JSX do Passo 4, localizar o bloco que termina com o preview do cliente selecionado (o bloco `{config.clientId && (() => {...})()`), e logo após ele adicionar:

```tsx
{
  /* Botão de copywriter — aparece apenas quando há cliente selecionado */
}
{
  config.clientId && (
    <div>
      {hasCopywriter ? (
        <button
          type="button"
          onClick={() => setCopywriterModalOpen(true)}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg border border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-400 text-xs hover:bg-green-500/20 transition-colors"
        >
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span className="flex-1 text-left font-medium">
            Copywriter configurado
          </span>
          <span className="text-green-600/70 dark:text-green-500/70">
            Editar →
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setCopywriterModalOpen(true)}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg border border-dashed border-border text-muted-foreground text-xs hover:border-primary/50 hover:text-foreground transition-colors"
        >
          <PenSquare className="w-3.5 h-3.5 shrink-0" />
          <span>Configurar Copywriter</span>
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Adicionar o modal ao JSX**

Dentro do return do componente, antes do fechamento do `<Dialog>`, adicionar:

```tsx
{
  config.clientId && (
    <ClientCopywriterModal
      open={copywriterModalOpen}
      onOpenChange={setCopywriterModalOpen}
      clientId={config.clientId}
      clientName={
        clients.find((c) => c.id === config.clientId)?.name ?? "Cliente"
      }
    />
  );
}
```

- [ ] **Step 5: Popular `copywriterInstructions` ao confirmar**

Na função `handleNext`, localizar **somente** o branch `if (step === STEPS)` e modificar apenas ele. Não reescrever a função inteira — o resto da lógica (skip para step 4, incremento) deve permanecer intacto.

Antes:

```typescript
if (step === STEPS) {
  onComplete(config);
  return;
}
```

Depois:

```typescript
if (step === STEPS) {
  const instructions = serializeCopywriter(copywriter ?? null);
  onComplete({ ...config, copywriterInstructions: instructions });
  return;
}
```

- [ ] **Step 6: Verificar compilação**

```bash
npx tsc --noEmit
```

Expected: 0 erros novos.

- [ ] **Step 7: Commit**

```bash
git add src/components/carousel-studio/StudioWizardModal.tsx
git commit -m "feat: add copywriter button to wizard step 4"
```

---

## Chunk 4: Edge Functions — Injeção do Copywriter

### Task 6: Atualizar `regenerate-carousel-slides` para receber e usar `copywriter_instructions`

**Files:**

- Modify: `supabase/functions/regenerate-carousel-slides/index.ts`

- [ ] **Step 1: Ler o arquivo atual**

Leia o arquivo completo para entender a estrutura atual.

- [ ] **Step 2: Adicionar `copywriter_instructions` ao destructuring do body**

Na linha onde está:

```typescript
const { project_id, prompt, slides_count, company_id } = await req.json();
```

Alterar para:

```typescript
const {
  project_id,
  prompt,
  slides_count,
  company_id,
  copywriter_instructions,
} = await req.json();
```

- [ ] **Step 3: Montar o systemPrompt dinâmico**

Localizar a chamada `callAI` e modificar o `systemPrompt` para:

```typescript
const baseSystemPrompt =
  "Você é um especialista em criar conteúdo viral para Instagram. Cria carrosseis com ganchos fortes, conteúdo de valor e CTAs persuasivos. Retorna apenas JSON válido.";

const systemPrompt = copywriter_instructions?.trim()
  ? `${baseSystemPrompt}\n\nINSTRUÇÕES DE COPYWRITER DO CLIENTE:\n${copywriter_instructions}\n\nSiga RIGOROSAMENTE essas instruções de tom, linguagem e regras de copy ao gerar os textos.`
  : baseSystemPrompt;
```

E passar `systemPrompt` (variável) em vez da string literal na chamada `callAI`:

```typescript
const aiResult = await callAI({
  functionName: "regenerate-carousel-slides",
  companyId: company_id,
  systemPrompt, // ← variável dinâmica
  userPrompt,
  maxTokens: 1200,
  temperature: 0.75,
  responseFormat: { type: "json_object" },
});
```

- [ ] **Step 4: Deploy da função**

```bash
supabase functions deploy regenerate-carousel-slides
```

Expected: `Deployed regenerate-carousel-slides`

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/regenerate-carousel-slides/index.ts
git commit -m "feat: inject copywriter_instructions into regenerate-carousel-slides"
```

---

### Task 7: Atualizar `generate-carousel-caption` para receber e usar `copywriter_instructions`

**Files:**

- Modify: `supabase/functions/generate-carousel-caption/index.ts`

- [ ] **Step 1: Ler o arquivo atual**

Leia o arquivo completo.

- [ ] **Step 2: Adicionar `copywriter_instructions` ao destructuring**

Na linha:

```typescript
const { project_id, slides, company_id } = await req.json();
```

Alterar para:

```typescript
const { project_id, slides, company_id, copywriter_instructions } =
  await req.json();
```

- [ ] **Step 3: Montar o systemPrompt dinâmico**

```typescript
const baseSystemPrompt =
  "Você é um copywriter especialista em Instagram. Crie legendas envolventes com gancho forte, valor real e CTA persuasivo. Retorne apenas JSON válido.";

const systemPrompt = copywriter_instructions?.trim()
  ? `${baseSystemPrompt}\n\nINSTRUÇÕES DE COPYWRITER DO CLIENTE:\n${copywriter_instructions}\n\nSiga RIGOROSAMENTE essas instruções de tom, linguagem e regras de copy ao gerar a legenda.`
  : baseSystemPrompt;
```

Passar `systemPrompt` na chamada `callAI`:

```typescript
const aiResult = await callAI({
  functionName: "generate-carousel-caption",
  companyId: company_id,
  systemPrompt, // ← variável dinâmica
  userPrompt,
  maxTokens: 600,
  temperature: 0.7,
  responseFormat: { type: "json_object" },
});
```

- [ ] **Step 4: Deploy da função**

```bash
supabase functions deploy generate-carousel-caption
```

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/generate-carousel-caption/index.ts
git commit -m "feat: inject copywriter_instructions into generate-carousel-caption"
```

---

## Chunk 5: Frontend — Passar copywriter_instructions nas chamadas de geração

**Contexto importante sobre o fluxo:**
O wizard de criação em `GeradorCarrosseis.tsx` **não** chama a Edge Function de slides diretamente. Ele navega para `/geradores/carrosseis/studio/:id` passando `state: { autoGenerate: true, config }`. É `CarouselStudio.tsx` que recebe esse estado e chama `regenerate-carousel-slides` num `useEffect`. Portanto, `CarouselStudio.tsx` é o arquivo central para as Tasks 8 e 9.

---

### Task 8: Passar `copywriterInstructions` na geração automática de slides (`CarouselStudio.tsx`)

**Files:**

- Modify: `src/pages/CarouselStudio.tsx`

- [ ] **Step 1: Ler o arquivo e localizar o `useEffect` de auto-geração**

Abrir `src/pages/CarouselStudio.tsx`. Buscar pelo `useEffect` que verifica `location.state?.autoGenerate` (deve estar por volta da linha 193). Entender como `config` é lido do `location.state`.

- [ ] **Step 2: Extrair `copywriterInstructions` do estado de navegação**

Dentro desse `useEffect`, onde `config` é lido de `location.state`, extrair também `copywriterInstructions`:

```typescript
const config: WizardConfig = location.state?.config;
const copywriterInstructions: string | null =
  config?.copywriterInstructions ?? null;
```

- [ ] **Step 3: Passar `copywriter_instructions` na chamada à Edge Function**

Na chamada a `supabase.functions.invoke("regenerate-carousel-slides", { body: { ... } })` dentro desse `useEffect`, adicionar ao body:

```typescript
copywriter_instructions: copywriterInstructions ?? undefined,
```

- [ ] **Step 4: Verificar compilação**

```bash
npx tsc --noEmit
```

Expected: 0 erros.

- [ ] **Step 5: Commit**

```bash
git add src/pages/CarouselStudio.tsx
git commit -m "feat: pass copywriter_instructions to auto slide generation in CarouselStudio"
```

---

### Task 9: Passar `copywriter_instructions` na geração de legenda (`CaptionSection` e `CarouselStudio` per-slide)

**Contexto:**

- `CaptionModal.tsx` existe no código mas **não é usado em nenhum lugar** — ignorar.
- A geração de legenda ativa está em `CaptionSection.tsx` (barra lateral do editor) e em `CarouselStudio.tsx` ~linha 914 (regeneração de texto de slide individual).
- `StudioProject` já tem `client_id` — não precisa passar `clientId` como prop, basta ler do `project`.

**Files:**

- Modify: `src/components/carousel-studio/sections/CaptionSection.tsx`
- Modify: `src/pages/CarouselStudio.tsx`

- [ ] **Step 1: Ler `CaptionSection.tsx` e identificar como `project` é recebido**

Verificar se o componente recebe `project: StudioProject` ou apenas `project_id`. Confirmar que tem acesso a `project.client_id`.

- [ ] **Step 2: Adicionar busca do copywriter em `CaptionSection.tsx`**

No topo do componente, adicionar:

```typescript
import {
  useClientCopywriter,
  serializeCopywriter,
} from "@/hooks/useClientCopywriter";

// Dentro do componente, usando o client_id do projeto:
const { data: copywriter } = useClientCopywriter(project?.client_id ?? null);
```

- [ ] **Step 3: Passar `copywriter_instructions` na chamada da legenda em `CaptionSection.tsx`**

Na chamada `supabase.functions.invoke("generate-carousel-caption", { body: { ... } })`, adicionar:

```typescript
copywriter_instructions: serializeCopywriter(copywriter) ?? undefined,
```

- [ ] **Step 4: Ler o contexto da linha ~914 em `CarouselStudio.tsx`**

Verificar o que essa chamada faz (é regeneração de texto de slide individual, não legenda). Confirmar se `project.client_id` está disponível no escopo dessa chamada.

- [ ] **Step 5: Passar `copywriter_instructions` na chamada de texto de slide em `CarouselStudio.tsx`**

> **Nota:** Essa chamada usa `generate-carousel-caption` com `single_slide: true` para regenerar o texto de um slide específico. O copywriter deve ser aplicado aqui também.

Buscar o copywriter no escopo do componente `CarouselStudio` (onde o `project` já está disponível):

```typescript
// Próximo aos outros hooks do componente:
const { data: carouselCopywriter } = useClientCopywriter(
  project?.client_id ?? null,
);
```

E na chamada ~linha 914:

```typescript
copywriter_instructions: serializeCopywriter(carouselCopywriter) ?? undefined,
```

- [ ] **Step 6: Verificar compilação**

```bash
npx tsc --noEmit
```

Expected: 0 erros.

- [ ] **Step 7: Commit**

```bash
git add src/components/carousel-studio/sections/CaptionSection.tsx \
        src/pages/CarouselStudio.tsx
git commit -m "feat: pass copywriter_instructions in caption and per-slide text generation"
```

---

## Chunk 6: Validação Manual

### Task 10: Teste manual do fluxo completo

- [ ] **Step 1: Iniciar o dev server**

```bash
npm run dev
```

- [ ] **Step 2: Testar configuração do copywriter**

1. Ir para `/geradores/carrosseis`
2. Clicar em "Criar no Editor Visual"
3. Avançar até o Passo 4 (Personalizar)
4. Selecionar um cliente
5. Verificar que o botão "Configurar Copywriter" aparece abaixo do preview do cliente
6. Clicar no botão — modal deve abrir
7. Preencher os campos (tom de voz, público-alvo, etc.)
8. Salvar — toast "Copywriter salvo com sucesso!" deve aparecer
9. Fechar e reabrir o modal — verificar que os dados estão persistidos
10. O botão deve agora mostrar "Copywriter configurado" (verde)

- [ ] **Step 3: Testar geração com copywriter**

1. Com cliente e copywriter configurados, clicar "Gerar carrossel"
2. Verificar nos logs do Supabase (ou no Network tab) que `copywriter_instructions` é enviado na requisição
3. Verificar que os slides gerados refletem o tom e linguagem configurados

- [ ] **Step 4: Testar sem copywriter (regressão)**

1. Criar carrossel sem selecionar cliente
2. Verificar que gera normalmente sem erros

- [ ] **Step 5: Commit final**

```bash
git add -A
git commit -m "chore: carousel copywriter feature complete"
```
