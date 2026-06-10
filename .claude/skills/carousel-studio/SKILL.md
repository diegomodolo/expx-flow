# Carousel Studio (Editor Visual de Carrosseis) — Skill de Contexto do Modulo

## Visao Geral

Editor visual de carrosseis de Instagram (1080×1350) com slides editaveis em tempo real: textos, imagens de fundo, badges, bullets, overlays e export de imagem. Vive na aba "Editor Visual" da pagina `/geradores/carrosseis` e tem rota propria de edicao.

**Rotas:**

- `/geradores/carrosseis` (aba "Editor Visual", `value="studio"`) — grade de projetos (`StudioProjectsGrid`)
- `/geradores/carrosseis/studio/:projectId` — editor (`CarouselStudio.tsx`)

Protegidas pela permissao `geradores`.

### Modelo de Dados

```
carousel_studio_projects (projeto: estilo, fontes, cor, cliente, slides_count, status, thumbnail_url)
  └→ carousel_studio_slides (1 linha por slide, ~78 colunas de estilo + imagens)
carousel_studio_slides_light (VIEW security_invoker — slides sem imagens base64; usada em listagens)
carousel_studio_templates (templates de configuracao)
```

RLS: projetos via `get_user_company_ids(auth.uid())`; slides via `get_user_carousel_studio_project_ids()` (SECURITY DEFINER, marcada STABLE).

## Arquivos-Chave

| Arquivo                                                                    | Responsabilidade                                                         |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `src/pages/GeradorCarrosseis.tsx`                                          | Pagina com 3 abas: Gerar, Editor Visual (studio), Historico              |
| `src/pages/CarouselStudio.tsx`                                             | Editor visual completo de um projeto                                     |
| `src/components/carousel-studio/StudioProjectsGrid.tsx`                    | Grade de cards estilo Instagram com filtros, paginacao (15/pag) e delete |
| `src/components/carousel-studio/SlideCanvas.tsx`                           | Render do slide (usado no editor e como thumbnail escalado nos cards)    |
| `src/components/carousel-studio/types.ts`                                  | `StudioProject`, `StudioSlide`, `WizardConfig`                           |
| `src/hooks/useCarouselStudioProject.ts`                                    | Hooks de CRUD: lista paginada, projeto, create/update/delete             |
| `supabase/migrations/20260412000000_carousel_studio.sql`                   | Tabelas, RLS, GRANTs, triggers                                           |
| `supabase/migrations/20260610210000_carousel_studio_slides_light_view.sql` | View "light" + STABLE na funcao de RLS                                   |

## Padroes Estabelecidos

- **Listagem NUNCA embeda `carousel_studio_slides(*)` direto.** Usar a view com alias para manter o shape:
  ```ts
  .select(
    "*, clients(id, name, avatar), carousel_studio_slides:carousel_studio_slides_light(*)",
    { count: "exact" },
  )
  ```
- Thumbnail do card: `project.thumbnail_url ?? firstSlide.exported_image_url ?? <SlideCanvas escalado>`. O fallback `SlideCanvas` renderiza o slide 1 em 1080×1350 com `transform: scale()` via ResizeObserver.
- Editor (`useCarouselStudioProject` por id + slides) continua usando a tabela base — la o base64 e necessario para renderizar.

## Armadilhas e Bugs Resolvidos

1. **Grade vazia silenciosa (bug 2026-06-10):** slides podem ter `bg_image_url`/`badge_photo_url` com imagens **base64 de ate 24MB** (tabela com 765MB para 444 slides). Embedar `carousel_studio_slides(*)` na listagem estourava o statement timeout do Postgres → PostgREST 500 → `StudioProjectsGrid` so desestrutura `{ data }` do useQuery, engolia o erro e mostrava o empty state. Fix: view `carousel_studio_slides_light` que troca data-URLs por NULL.
2. **Funcao de RLS sem STABLE:** `get_user_carousel_studio_project_ids()` era VOLATILE (default) — o planner reexecutava o scan por linha. Sempre marcar funcoes de policy como `STABLE`.
3. **Erros engolidos:** os hooks de listagem nao expoem `error` na UI. Ao debugar "dados nao aparecem", checar os logs da API do Supabase (`get_logs` service=api) procurando status 500 — o sintoma no frontend e identico a "0 resultados".
4. **Divida tecnica:** o editor ainda SALVA base64 direto nas colunas de imagem. O correto e fazer upload para o Storage e salvar a URL — enquanto isso nao for feito, a tabela continua crescendo e qualquer nova query que leia essas colunas em lote corre risco de timeout.

## Contexto Nao-Obvio

- Apos criar view/funcao nova, rodar `NOTIFY pgrst, 'reload schema';` para o PostgREST enxergar o embed sem esperar o reload automatico.
- O embed da view funciona porque o PostgREST infere a relacao `project_id` → `carousel_studio_projects` atraves da view (precisa selecionar a coluna FK na view e `security_invoker = true` para aplicar a RLS da tabela base).
- Teste rapido de resolucao de embed sem JWT de usuario: chamada REST com a anon key — 200 + `[]` significa que o embed resolveu (RLS bloqueia as linhas); 400 significa relacao nao encontrada no schema cache.
