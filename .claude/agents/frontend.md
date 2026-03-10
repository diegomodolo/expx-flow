# Frontend — Contexto Especializado

## Escopo

Componentes React, estilo Tailwind, data fetching com React Query, routing, e UI patterns do Expx Flow.

## Arquivos-chave

| Arquivo                                         | Funcao                                                |
| ----------------------------------------------- | ----------------------------------------------------- |
| `src/App.tsx`                                   | Router principal (~829 linhas), define todas as rotas |
| `src/components/dashboard/DashboardLayout.tsx`  | Layout principal com sidebar e header                 |
| `src/components/dashboard/DashboardSidebar.tsx` | Navegacao lateral                                     |
| `src/lib/utils.ts`                              | Utility `cn()` para classes condicionais              |
| `tailwind.config.ts`                            | Design system (cores, tipografia, theme)              |
| `src/integrations/supabase/client.ts`           | Cliente Supabase para queries                         |

## Patterns Obrigatorios

### Estrutura de Componente de Pagina

```typescript
import { useAuth } from "@/hooks/useAuth";
import { useCompany } from "@/contexts/CompanyContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const MinhaPage = () => {
  const { user } = useAuth();
  const { activeCompany } = useCompany();
  // ... hooks de dados

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Titulo da Pagina</h1>
      {/* Conteudo */}
    </div>
  );
};

export default MinhaPage;
```

### Data Fetching Hook

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useMinhaEntidade(companyId: string | undefined) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["minha-entidade", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tabela")
        .select("*")
        .eq("company_id", companyId);
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const createMutation = useMutation({
    mutationFn: async (payload: CreatePayload) => {
      const { data, error } = await supabase
        .from("tabela")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["minha-entidade"] });
      toast.success("Criado com sucesso");
    },
    onError: () => toast.error("Erro ao criar"),
  });

  return { data, isLoading, create: createMutation.mutateAsync };
}
```

### Estilo com Tailwind

```typescript
import { cn } from "@/lib/utils";

// Classes condicionais
<div className={cn(
  "rounded-lg border p-4",
  isActive && "border-primary bg-primary/10",
  isDisabled && "opacity-50 pointer-events-none"
)} />
```

## Erros Comuns e Solucoes

| Erro                          | Causa                           | Solucao                            |
| ----------------------------- | ------------------------------- | ---------------------------------- |
| Import nao encontrado         | Caminho relativo em vez de `@/` | Usar `@/` sempre                   |
| Query nao executa             | `enabled` nao configurado       | Adicionar `enabled: !!dependencia` |
| UI nao atualiza apos mutation | Cache nao invalidado            | `queryClient.invalidateQueries()`  |
| Componente ui/ nao existe     | Nao foi adicionado via CLI      | `npx shadcn-ui@latest add <nome>`  |
| Toast em ingles               | Esqueceu de traduzir            | Sempre usar PT-BR em toasts        |

## Checklist antes de submeter

- [ ] Imports usam `@/` (nunca `../../../`)
- [ ] Textos de UI em Portugues
- [ ] `enabled` configurado em useQuery com dependencias
- [ ] Cache invalidado apos mutations
- [ ] Componentes shadcn/ui usados (nao HTML raw para forms, buttons, etc.)
- [ ] `cn()` usado para classes condicionais
- [ ] Sem editar arquivos em `components/ui/`
