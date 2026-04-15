# Spec: Copywriter por Cliente no Carousel Studio

**Data:** 2026-04-15
**Status:** Aprovado

## Resumo

Adicionar a capacidade de configurar um "Copywriter" por cliente no Carousel Studio. Quando um cliente com copywriter configurado é selecionado no wizard de criação de carrossel, as instruções de tom, linguagem e regras de copy são injetadas silenciosamente na IA para que todos os textos e legendas gerados sigam o padrão do cliente.

## Contexto

- O wizard de criação (`StudioWizardModal`) tem 4 passos; o Passo 4 (Personalizar) já possui seletor de cliente
- Já existe `ai_briefing` em `clients`, mas é análise de negócio gerada por IA — não deve ser misturado com instruções de copywriting
- As Edge Functions `regenerate-carousel-slides` e `generate-carousel-caption` recebem o prompt do usuário e um `systemPrompt` fixo — esse é o ponto de injeção das instruções do copywriter
- 1 copywriter por cliente (sem nome, sem múltiplos perfis)

## Banco de Dados

### Nova tabela: `client_copywriters`

```sql
CREATE TABLE public.client_copywriters (
  client_id    uuid PRIMARY KEY REFERENCES public.clients(id) ON DELETE CASCADE,
  company_id   uuid NOT NULL REFERENCES public.companies(company_id) ON DELETE CASCADE,
  tom_de_voz         text,
  publico_alvo       text,
  persona_marca      text,
  regras_de_copy     text,
  exemplos_aprovados text,
  palavras_evitar    text,
  palavras_preferidas text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_copywriters ENABLE ROW LEVEL SECURITY;

-- RLS via SECURITY DEFINER para evitar subquery em tabela com RLS
CREATE OR REPLACE FUNCTION public.get_user_company_ids()
RETURNS uuid[] LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT ARRAY(SELECT company_id FROM public.company_members WHERE user_id = auth.uid());
$$;

CREATE POLICY "company members can manage client_copywriters"
ON public.client_copywriters
FOR ALL USING (company_id = ANY(public.get_user_company_ids()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_copywriters TO authenticated;
```

> Nota: a função `get_user_company_ids()` pode já existir — verificar antes de recriar.

## Frontend

### Hook: `useClientCopywriter`

`src/hooks/useClientCopywriter.ts`

- `useQuery` para buscar o copywriter do cliente por `clientId`
- `useMutation` para `upsert` (criar ou atualizar)
- `enabled: !!clientId`

### Componente: `ClientCopywriterModal`

`src/components/carousel-studio/ClientCopywriterModal.tsx`

Modal com campos agrupados em seções:

| Campo                        | Placeholder                                                  |
| ---------------------------- | ------------------------------------------------------------ |
| Tom de voz                   | "Ex: Informal, próximo, usa linguagem leve..."               |
| Público-alvo                 | "Ex: Mulheres 25-40, interessadas em saúde..."               |
| Persona da marca             | "Ex: Marca humanizada, como uma amiga expert..."             |
| Regras de copy               | "Ex: Sempre termine slides com pergunta, use técnica PAS..." |
| Exemplos de copies aprovadas | Textarea maior com exemplos reais                            |
| Palavras/termos a evitar     | "Ex: barato, promoção, compre agora"                         |
| Palavras/termos preferidos   | "Ex: transformação, resultado, jornada"                      |

Salva via `upsert` ao clicar "Salvar". Toast de sucesso/erro.

### Alteração: `StudioWizardModal` — Passo 4

Abaixo do preview do cliente selecionado, adicionar:

```
[✏ Configurar Copywriter]   ← se não configurado
[✓ Copywriter ativo  ✎ Editar]   ← se já configurado (badge verde)
```

O botão só aparece quando `config.clientId` está definido.

### Alteração: `WizardConfig` (types.ts)

Adicionar campo:

```typescript
copywriterInstructions: string | null;
```

Populado ao confirmar o wizard se o cliente tiver copywriter salvo.

### Alteração: fluxo de criação

Em `GeradorCarrosseis.tsx` (ou onde `onComplete` do wizard é tratado), após receber o `WizardConfig`:

1. Se `clientId` presente, buscar copywriter do cliente
2. Serializar campos preenchidos em bloco de texto formatado
3. Passar `copywriter_instructions` para a Edge Function de geração

## Edge Functions

### `regenerate-carousel-slides`

Recebe novo campo opcional `copywriter_instructions: string`.

Se presente, injeta no `systemPrompt`:

```
...
INSTRUÇÕES DE COPYWRITER DO CLIENTE:
{copywriter_instructions}

Siga RIGOROSAMENTE essas instruções de tom, linguagem e regras de copy ao gerar os textos.
```

### `generate-carousel-caption`

Mesmo padrão — recebe `copywriter_instructions` e injeta no `systemPrompt`.

## Serialização das instruções

Função utilitária `serializeCopywriter(copywriter)` que monta um bloco de texto a partir dos campos preenchidos:

```
Tom de voz: {tom_de_voz}
Público-alvo: {publico_alvo}
Persona da marca: {persona_marca}
Regras de copy: {regras_de_copy}
Palavras preferidas: {palavras_preferidas}
Palavras a evitar: {palavras_evitar}
Exemplos de copies aprovadas:
{exemplos_aprovados}
```

Campos vazios/nulos são omitidos.

## Fluxo completo

```
Wizard Passo 4
  └→ Seleciona cliente
      └→ Botão "Configurar Copywriter" aparece
          └→ Abre ClientCopywriterModal
              └→ Preenche campos → Salva (upsert)
  └→ Clica "Gerar carrossel"
      └→ Frontend busca copywriter do cliente
      └→ Serializa → passa como copywriter_instructions
      └→ Edge Function injeta no systemPrompt
      └→ IA gera slides com linguagem do cliente
```

## Arquivos a criar/modificar

| Arquivo                                                    | Ação                                       |
| ---------------------------------------------------------- | ------------------------------------------ |
| `supabase/migrations/YYYYMMDD_client_copywriters.sql`      | Criar                                      |
| `src/hooks/useClientCopywriter.ts`                         | Criar                                      |
| `src/components/carousel-studio/ClientCopywriterModal.tsx` | Criar                                      |
| `src/components/carousel-studio/StudioWizardModal.tsx`     | Modificar (Passo 4)                        |
| `src/components/carousel-studio/types.ts`                  | Modificar (WizardConfig)                   |
| `src/pages/GeradorCarrosseis.tsx`                          | Modificar (passar copywriter_instructions) |
| `supabase/functions/regenerate-carousel-slides/index.ts`   | Modificar                                  |
| `supabase/functions/generate-carousel-caption/index.ts`    | Modificar                                  |
