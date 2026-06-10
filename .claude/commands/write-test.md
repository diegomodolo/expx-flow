---
description: Cria teste com mocks e providers corretos do Expx Flow
argument-hint: <caminho-do-arquivo> [hook|component|utility]
---

# /write-test

## Descricao

Cria um teste para um componente ou hook do Expx Flow com mocks e providers corretos.

## Inputs

- `alvo`: Caminho do arquivo a testar (obrigatorio). Ex: `src/hooks/useClients.tsx`
- `tipo`: Tipo de teste (opcional, default: auto-detectar). Opcoes: `hook`, `component`, `utility`

## Steps

### 1. Analisar o arquivo alvo

Ler o arquivo e identificar:

- Dependencias externas (Supabase, Auth, Contexts)
- Props/inputs necessarios
- Comportamentos a testar (fetch, mutation, render, interacao)

### 2. Criar arquivo de teste

Criar `<caminho-do-arquivo>.test.tsx` (ou `.test.ts` para utilities):

**Para Hooks:**

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useMinhaEntidade } from './useMinhaEntidade';

// Mocks
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [{ id: '1', nome: 'Teste' }],
          error: null,
        }),
      }),
    }),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useMinhaEntidade', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve retornar dados quando companyId e valido', async () => {
    const { result } = renderHook(
      () => useMinhaEntidade('company-1'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data[0].nome).toBe('Teste');
  });

  it('nao deve buscar dados sem companyId', () => {
    const { result } = renderHook(
      () => useMinhaEntidade(undefined),
      { wrapper: createWrapper() }
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toEqual([]);
  });
});
```

**Para Componentes:**

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MeuComponente } from './MeuComponente';

// Mocks de contexto
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'test@test.com' },
    loading: false,
  }),
}));

vi.mock('@/contexts/CompanyContext', () => ({
  useCompany: () => ({
    activeCompany: { company_id: 'company-1' },
  }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{ui}</BrowserRouter>
    </QueryClientProvider>
  );
};

describe('MeuComponente', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve renderizar corretamente', () => {
    renderWithProviders(<MeuComponente />);
    expect(screen.getByText('Titulo')).toBeInTheDocument();
  });

  it('deve responder a interacao do usuario', async () => {
    const user = userEvent.setup();
    renderWithProviders(<MeuComponente />);

    await user.click(screen.getByRole('button', { name: /salvar/i }));
    // Assertions...
  });
});
```

**Para Utilities:**

```typescript
import { describe, it, expect } from "vitest";
import { minhaUtility } from "./minhaUtility";

describe("minhaUtility", () => {
  it("deve processar entrada valida", () => {
    const resultado = minhaUtility("input");
    expect(resultado).toBe("expected");
  });

  it("deve lidar com entrada vazia", () => {
    expect(minhaUtility("")).toBe("");
  });
});
```

### 3. Identificar casos de teste

Para cada arquivo, testar:

- **Happy path**: Comportamento normal com dados validos
- **Empty state**: Sem dados / undefined / null
- **Error state**: Quando Supabase/API retorna erro
- **Loading state**: Durante carregamento
- **Interacoes**: Cliques, submissoes, navigacoes (se componente)

### 4. Verificar

- Rodar os testes (quando test runner estiver configurado)
- Verificar que mocks cobrem todas dependencias externas
- Verificar que assertions sao sobre comportamento, nao implementacao

## Mocks Frequentes

### Supabase client

```typescript
vi.mock("@/integrations/supabase/client");
```

### React Router navigation

```typescript
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => ({
  ...(await vi.importActual("react-router-dom")),
  useNavigate: () => mockNavigate,
  useParams: () => ({ id: "test-id" }),
}));
```

### useEmployeePermissions

```typescript
vi.mock("@/hooks/useEmployeePermissions", () => ({
  useEmployeePermissions: () => ({
    hasPermission: vi.fn().mockReturnValue(true),
    isOwner: false,
    permissionsLoading: false,
  }),
}));
```

## Checklist de Qualidade

- [ ] Arquivo de teste ao lado do arquivo testado (`*.test.tsx`)
- [ ] Todos mocks necessarios configurados
- [ ] `beforeEach` limpa mocks (`vi.clearAllMocks()`)
- [ ] QueryClient com `retry: false`
- [ ] Providers wrapeando componentes (QueryClient, Router, Contexts)
- [ ] Happy path testado
- [ ] Edge cases testados (empty, error, loading)
- [ ] Nomes dos testes em Portugues descrevendo comportamento
- [ ] Sem testar detalhes de implementacao (testar comportamento)
