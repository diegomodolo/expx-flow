# Expx Flow - Contexto para Agentes de IA

## O que e o projeto

Plataforma SaaS de automacao de marketing e gestao de trafego em Portugues. Gerencia campanhas multi-plataforma (Facebook, Google Ads, Instagram, WhatsApp, YouTube), CRM, tarefas, agentes IA e dashboards de performance.

## Stack

- **Frontend**: React 18 + TypeScript, Vite, Tailwind CSS + shadcn/ui + Radix UI + Mantine
- **Backend**: Supabase (PostgreSQL, Edge Functions em Deno/TS, Auth, Realtime)
- **State**: TanStack React Query (servidor) + React Context (global)
- **Routing**: React Router DOM v6 com route guards por permissao
- **Forms**: React Hook Form + Zod
- **Deploy**: Lovable (frontend) + Supabase (backend)

## Diretrizes de codigo

- **Idioma da UI**: Portugues (PT-BR) — todos textos, toasts, labels
- **Path alias**: `@` → `./src` (sempre usar `@/` imports)
- **Componentes**: Feature components em `components/<feature>/`, shadcn/ui primitivos em `components/ui/`
- **Estilo**: Tailwind utility classes, `cn()` de `@/lib/utils` para classes condicionais
- **Data fetching**: Hooks em `hooks/` com `useQuery`/`useMutation` + Supabase. Nomear: `use<Entidade><Acao>`
- **Toasts**: Sonner (`toast.success()`, `toast.error()`) com mensagens em Portugues
- **Forms**: React Hook Form + Zod schema, componentes de `components/ui/form`

## Regras importantes

- **Nunca** editar `components/ui/` diretamente — usar `npx shadcn-ui@latest add <componente>`
- **Nunca** editar `src/integrations/supabase/types.ts` — e auto-gerado
- **Sempre** usar `@/` imports, nunca caminhos relativos profundos
- **Sempre** invalidar query cache apos mutations: `queryClient.invalidateQueries()`
- **Sempre** tratar CORS em Edge Functions com o header padrao
- **Sempre** usar toasts em Portugues para feedback ao usuario
- Owners (role='owner') tem acesso total — nao checar permissoes para eles

## Estrutura de pastas

```
src/
├── pages/          # ~114 componentes de rota
├── components/     # ~74 modulos por feature + ui/
├── hooks/          # ~236 hooks (data fetching + logica)
├── contexts/       # 4 Context providers
├── integrations/   # Supabase client + tipos
└── lib/            # Utilities
supabase/
├── functions/      # ~215 Edge Functions (Deno)
├── migrations/     # ~490 migrations SQL
└── config.toml     # JWT verification config
```

## Ao corrigir bugs ou implementar features

1. Ler os arquivos relevantes antes de modificar
2. Verificar se ja existe um hook para a operacao desejada em `hooks/`
3. Seguir o pattern existente de `useQuery`/`useMutation`
4. Usar componentes shadcn/ui existentes antes de criar novos
5. Manter todos textos de UI em Portugues
6. Testar que imports usam `@/` e nao caminhos relativos
7. Para Edge Functions: incluir CORS headers e tratamento de OPTIONS
8. Rodar `npm run build` para verificar erros de TypeScript
