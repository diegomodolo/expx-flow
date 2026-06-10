---
description: Cria componente React seguindo as convencoes do Expx Flow
argument-hint: <NomePascalCase> <feature> [display|form|list|modal]
---

# /new-component

## Descricao

Cria um novo componente React seguindo as convencoes do Expx Flow.

## Inputs

- `nome`: Nome do componente em PascalCase (obrigatorio). Ex: `LeadCard`
- `feature`: Modulo/feature onde o componente pertence (obrigatorio). Ex: `leads`, `campaigns`
- `tipo`: Tipo do componente (opcional, default: `display`). Opcoes: `display`, `form`, `list`, `modal`

## Steps

### 1. Criar diretorio (se nao existir)

Verificar se `src/components/<feature>/` existe. Se nao, criar.

### 2. Criar arquivo do componente

Criar `src/components/<feature>/<Nome>.tsx`:

**Tipo `display`:**

```typescript
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface <Nome>Props {
  className?: string;
}

export const <Nome> = ({ className }: <Nome>Props) => {
  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <CardTitle>Titulo</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Conteudo */}
      </CardContent>
    </Card>
  );
};
```

**Tipo `form`:**

```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";

const formSchema = z.object({
  nome: z.string().min(1, "Nome e obrigatorio"),
});

type FormValues = z.infer<typeof formSchema>;

interface <Nome>Props {
  onSubmit: (values: FormValues) => void;
  defaultValues?: Partial<FormValues>;
}

export const <Nome> = ({ onSubmit, defaultValues }: <Nome>Props) => {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { nome: "", ...defaultValues },
  });

  const handleSubmit = (values: FormValues) => {
    onSubmit(values);
    toast.success("Salvo com sucesso");
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="nome"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome</FormLabel>
              <FormControl>
                <Input placeholder="Digite o nome..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Salvar</Button>
      </form>
    </Form>
  );
};
```

**Tipo `list`:**

```typescript
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

interface Item {
  id: string;
  nome: string;
}

interface <Nome>Props {
  items: Item[];
  isLoading?: boolean;
}

export const <Nome> = ({ items, isLoading }: <Nome>Props) => {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return <p className="text-muted-foreground text-center py-8">Nenhum item encontrado</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell>{item.nome}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
```

**Tipo `modal`:**

```typescript
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface <Nome>Props {
  trigger?: React.ReactNode;
  onConfirm?: () => void;
}

export const <Nome> = ({ trigger, onConfirm }: <Nome>Props) => {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button variant="outline">Abrir</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Titulo do Modal</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Conteudo */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => { onConfirm?.(); setOpen(false); }}>Confirmar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
```

### 3. Verificar

- `npm run build` para verificar TypeScript
- Componente usa shadcn/ui primitivos
- Props tipadas com interface

## Checklist de Qualidade

- [ ] Arquivo em `src/components/<feature>/`
- [ ] Export nomeado (nao default) para componentes
- [ ] Interface de Props definida
- [ ] Imports usam `@/`
- [ ] Textos em Portugues
- [ ] Usa shadcn/ui primitivos (nao HTML raw)
- [ ] `cn()` para classes condicionais
- [ ] Loading states tratados (se aplicavel)
- [ ] Empty states tratados (se aplicavel)
