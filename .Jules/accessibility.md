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

## 2026-03-11 - Bulk Accessibility Updates

**Learning:** When generating images or having large amounts of components with `<Button size="icon">` or `<img>` it's common to miss `aria-label` or `alt` tags.
**Action:** Use script-based automated updates for legacy codebase. Ensure all new components automatically include `aria-label` for icon-only buttons and descriptive `alt` for images in Brazilian Portuguese.
