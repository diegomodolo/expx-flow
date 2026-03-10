# Testing — Contexto Especializado

## Escopo

Infraestrutura de testes, patterns de teste, mocks, e estrategia de qualidade para o Expx Flow.

## Estado Atual

> **Nota:** O projeto atualmente nao tem test runner configurado (sem Vitest/Jest).
> Quando testes forem implementados, seguir os patterns abaixo.

## Setup Recomendado

### Instalacao (quando necessario)

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

### Configuracao Vitest (`vite.config.ts`)

```typescript
/// <reference types="vitest" />
export default defineConfig({
  // ... config existente
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    css: true,
  },
});
```

### Setup File (`src/test/setup.ts`)

```typescript
import "@testing-library/jest-dom";
```

## Patterns Obrigatorios

### Teste de Hook (useQuery)

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi } from 'vitest';

// Mock do Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          data: [{ id: '1', name: 'Test' }],
          error: null,
        }),
      }),
    }),
  },
}));

const wrapper = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

describe('useMinhaEntidade', () => {
  it('deve buscar dados quando companyId disponivel', async () => {
    const { result } = renderHook(() => useMinhaEntidade('company-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toHaveLength(1);
  });
});
```

### Teste de Componente

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi } from 'vitest';

// Mock dos contexts
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: '1' }, loading: false }),
}));

vi.mock('@/contexts/CompanyContext', () => ({
  useCompany: () => ({ activeCompany: { company_id: 'c1' } }),
}));

const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{ui}</BrowserRouter>
    </QueryClientProvider>
  );
};

describe('MeuComponente', () => {
  it('deve renderizar titulo', () => {
    renderWithProviders(<MeuComponente />);
    expect(screen.getByText('Titulo esperado')).toBeInTheDocument();
  });
});
```

### Teste de Edge Function

```typescript
// Deno test (arquivo: supabase/functions/minha-funcao/index_test.ts)
import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

Deno.test("deve retornar sucesso com dados validos", async () => {
  const req = new Request("http://localhost", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ campo: "valor" }),
  });

  // Importar e testar handler
});
```

## Mocks Comuns

### Mock do Supabase Client

```typescript
const mockSupabase = {
  from: vi.fn(() => mockSupabase),
  select: vi.fn(() => mockSupabase),
  insert: vi.fn(() => mockSupabase),
  update: vi.fn(() => mockSupabase),
  delete: vi.fn(() => mockSupabase),
  eq: vi.fn(() => mockSupabase),
  single: vi.fn(() => ({ data: mockData, error: null })),
  auth: {
    getUser: vi.fn(() => ({ data: { user: { id: "1" } }, error: null })),
    getSession: vi.fn(() => ({ data: { session: mockSession }, error: null })),
  },
};
```

### Mock do useAuth

```typescript
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-1", email: "test@test.com" },
    session: { access_token: "mock-token" },
    loading: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
  }),
}));
```

### Mock do toast (Sonner)

```typescript
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
  },
}));
```

## Estrategia de Testes

| Nivel       | O que testar                      | Ferramenta                     |
| ----------- | --------------------------------- | ------------------------------ |
| Unit        | Hooks de data fetching, utilities | Vitest + React Testing Library |
| Component   | Renderizacao, interacoes, estados | React Testing Library          |
| Integration | Fluxos de pagina completos        | React Testing Library + mocks  |
| E2E         | Fluxos criticos (login, CRUD)     | Playwright (futuro)            |

## Checklist antes de submeter

- [ ] Mocks cobrem dependencias externas (Supabase, Auth, Contexts)
- [ ] QueryClient criado com `retry: false` em testes
- [ ] Providers necessarios wrapam o componente (QueryClient, Router, Contexts)
- [ ] Assertions verificam comportamento, nao implementacao
- [ ] Cleanup automatico (React Testing Library faz por padrao)
- [ ] Nomes de teste em Portugues descrevem comportamento esperado
