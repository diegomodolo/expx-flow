

# Plano: Detectar Páginas Vazias no Radar de URLs

## Problema Identificado
Atualmente, a validação de URLs só verifica o código HTTP (200, 404, etc.) usando uma requisição `HEAD`. Porém, páginas que retornam código 200 podem estar completamente em branco ou sem conteúdo útil — exatamente o caso da URL `https://mkt.webersistemas.com.br/do-pdv-ao-lucro-de-verdade`.

## Solução Proposta
Adicionar um novo status de validação chamado **"empty"** (vazio) para identificar páginas que respondem 200 mas não têm conteúdo significativo.

---

## Resumo das Alterações

| Componente | Alteração |
|------------|-----------|
| Edge Function | Adicionar verificação de conteúdo após request GET |
| Banco de Dados | Novo status `empty` nas validações |
| Hook `useRadarUrls` | Suporte ao novo status |
| KPI Header | Novo contador de páginas vazias |
| Cards de Destaque | Novo card para URLs vazias |
| Tabela de URLs | Badge para status "vazio" |
| Filtros | Opção de filtrar por páginas vazias |

---

## Detalhes Técnicos

### 1. Edge Function (`validate-client-urls/index.ts`)

Alterar a lógica de validação para:
1. Primeiro fazer `HEAD` para pegar tempo de resposta
2. Se retornar 200, fazer `GET` para verificar o conteúdo
3. Analisar o HTML para detectar páginas vazias

```typescript
// Critérios para considerar uma página "vazia":
// - Body vazio ou apenas whitespace
// - HTML com <body> vazio ou quase vazio
// - Conteúdo de texto visível < 50 caracteres (excluindo tags)
// - Páginas com apenas scripts e nenhum conteúdo real
```

**Lógica de detecção:**
```text
1. Extrair texto visível do HTML (remover tags, scripts, styles)
2. Limpar whitespace e contar caracteres
3. Se < 50 caracteres de conteúdo → status = 'empty'
```

### 2. Interface `ValidationResult`
```typescript
status: 'ok' | 'error' | 'timeout' | 'redirect' | 'pending' | 'empty'
content_length?: number  // Opcional: armazenar tamanho do conteúdo
```

### 3. Tipo `ValidationStatus` (Hook)
```typescript
export type ValidationStatus = 'ok' | 'error' | 'timeout' | 'redirect' | 'pending' | 'empty' | null;
```

### 4. Interface `UrlStats`
```typescript
export interface UrlStats {
  total: number;
  ok: number;
  error: number;
  timeout: number;
  redirect: number;
  pending: number;
  slow: number;
  empty: number;  // Novo
}
```

### 5. Novo Array de URLs Vazias
```typescript
const emptyUrls = urls.filter(u => u.validation_status === 'empty');
```

### 6. KPI Header — Novo Card
```typescript
{
  label: "Vazias",
  value: stats.empty,
  icon: FileX2,  // ou AlertOctagon
  color: "text-purple-600 dark:text-purple-500",
  bgColor: "bg-purple-500/10"
}
```

### 7. Novo Componente: `EmptyUrlsCard.tsx`
Card similar ao `ProblematicUrlsCard` mas para URLs vazias, com:
- Ícone de página vazia
- Lista das URLs detectadas como vazias
- Botão para revalidar

### 8. Badge na Tabela
```typescript
case 'empty':
  return (
    <Badge variant="outline" className="text-purple-600 border-purple-600">
      <FileX2 className="h-2.5 w-2.5 mr-0.5" />
      Vazio
    </Badge>
  );
```

### 9. Filtro de Status na Tabela
Adicionar opção "Vazio" no Select de filtros.

---

## Considerações de Performance

A verificação de conteúdo requer fazer `GET` em vez de `HEAD`, o que:
- Aumenta o tempo de validação (~2-3x mais lento)
- Consome mais dados/bandwidth

**Mitigação:**
- Limitar o download a 100KB do body (suficiente para detectar página vazia)
- Só fazer GET para URLs que retornaram 200 no HEAD
- Timeout de 5s para download do conteúdo

---

## Fluxo Visual

```text
URL Recebida
     │
     ▼
┌──────────────────┐
│  HEAD Request    │
│  (tempo + status)│
└────────┬─────────┘
         │
    ┌────┴────┐
    │ 200 OK? │
    └────┬────┘
      ┌──┴──┐
      ▼     ▼
     SIM   NÃO → Retorna status (error/redirect/etc)
      │
      ▼
┌──────────────────┐
│   GET Request    │
│  (max 100KB)     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Analisa conteúdo │
│ < 50 chars texto │
└────────┬─────────┘
         │
    ┌────┴────┐
    │ Vazio?  │
    └────┬────┘
      ┌──┴──┐
      ▼     ▼
     SIM   NÃO
      │     │
      ▼     ▼
   'empty' 'ok'
```

---

## Arquivos a Modificar

1. `supabase/functions/validate-client-urls/index.ts` — Lógica de validação
2. `src/hooks/useRadarUrls.tsx` — Tipo e stats
3. `src/components/radar/UrlsKPIHeader.tsx` — Novo KPI
4. `src/components/radar/EmptyUrlsCard.tsx` — Novo componente
5. `src/components/radar/UrlsTable.tsx` — Badge e filtro
6. `src/pages/radar/RadarUrlsDashboard.tsx` — Integrar novo card

---

## Benefícios

- Detecta landing pages quebradas/vazias automaticamente
- Alerta proativo antes de gastar verba com anúncios que levam a páginas sem conteúdo
- Visual consistente com os outros tipos de problema (erro, timeout, redirect)

