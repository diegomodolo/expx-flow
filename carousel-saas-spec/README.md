# Carousel Studio SaaS — Pacote de Especificação

Pacote para reconstruir o **Editor Visual de Carrosséis** (módulo `/geradores/carrosseis` do Expx Flow) como um **SaaS independente, multi-tenant**, em **Next.js + Supabase**.

> Multi-tenancy: cada empresa (organização) tem dados e **configuração próprios** — incluindo suas chaves de IA e Pexels.

## Como usar

Leve esta pasta para o novo projeto e peça ao Claude para implementar seguindo os arquivos, **nesta ordem de leitura**:

1. **[SPEC.md](./SPEC.md)** — _O quê_: produto, multi-tenancy, funcionalidades, modelo de dados, telas, escopo.
2. **[PLAN.md](./PLAN.md)** — _Como_: implementação em 10 fases, cada uma verificável. Caminho crítico: Fase 1 (multi-tenant/RLS) → 2 → 3 → 4 → 5.
3. **[CLAUDE.md](./CLAUDE.md)** — _Convenções_: stack, estrutura, regras obrigatórias herdadas, detalhes do canvas/IA, e **Anexo A** com os tipos exatos do editor.

Sugestão: copie o `CLAUDE.md` para a raiz do novo repo (ele é lido automaticamente pelo Claude Code). Mantenha `SPEC.md` e `PLAN.md` em `docs/`.

## Resumo do que é o módulo

Editor WYSIWYG de carrosséis 1080×1350px (canvas HTML/CSS), com: fundo (individual/panorâmico), overlays, badge de perfil, texto com realce `**palavra**`, galeria de imagens, decorações de canto, 6 pares de fonte, geração por IA (conteúdo, imagem, legenda) via gateway OpenRouter, e export PNG/ZIP via `html2canvas`.

## O que mudou em relação ao original

- `company_id` → `org_id`; `client_id` → `brand_profile_id` (marcas internas do tenant).
- Removido tudo do ERP (campanhas, CRM, content plans, tarefas, agendamento).
- Config de IA/Pexels passa a ser **por organização**.
- Supabase Edge Functions (Deno) → Route Handlers/Server Actions do Next (ou manter Edge se preferir portar 1:1).
