-- Corrigir ícones dos blocos que estão sem ícone

UPDATE funnel_block_types SET icon = 'file-badge' WHERE name = 'case_study' AND icon IS NULL;
UPDATE funnel_block_types SET icon = 'graduation-cap' WHERE name = 'masterclass' AND icon IS NULL;
UPDATE funnel_block_types SET icon = 'list-checks' WHERE name = 'checklist_template' AND icon IS NULL;
UPDATE funnel_block_types SET icon = 'users-round' WHERE name = 'community' AND icon IS NULL;