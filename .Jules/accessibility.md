# Accessibility Learnings — Expx Flow

## 2026-03-10 - Icon-only buttons need aria-label

**Learning:** Buttons using only icons (e.g., `<Button size="icon"><Trash2 /></Button>`) are inaccessible to screen readers.
**Action:** Always add `aria-label` to icon-only buttons describing the action (e.g., `aria-label="Excluir campanha"`).

## 2026-03-10 - Form inputs must have associated labels

**Learning:** Inputs without visible labels or `aria-label` are not navigable by assistive technology.
**Action:** Use shadcn/ui `<FormField>` with `<FormLabel>` for all form inputs, or provide `aria-label` for search/filter inputs.

## 2026-03-10 - Color contrast in status badges

**Learning:** Some status badges use light colors on white backgrounds with insufficient contrast ratio.
**Action:** Ensure all text meets WCAG AA minimum contrast ratio of 4.5:1 for normal text.

## 2026-03-10 - Generic alt and aria-label handling

**Learning:** When addressing accessibility issues across many files for `<img/>` and `<Button size="icon">` components, it is crucial to at least ensure generic placeholders (`alt="Imagem descritiva"`, `aria-label="Ação"`) exist.
**Action:** Enforce generic accessibility fallbacks when no explicit description can be auto-inferred. This acts as a foundation that can be manually improved over time.

## 2026-03-11 - Specific ARIA labels vs. Generic labels

**Learning:** While generic labels (`aria-label="Ação"`) satisfy automated AST/Regex checkers, they do not provide real value to screen reader users.
**Action:** Always attempt to provide specific, descriptive `aria-label`s based on the component's context (e.g., "Remover opção", "Filtrar backlog") before falling back to generic ones. Generic ones should only be used as an absolute last resort during large automated migrations.
