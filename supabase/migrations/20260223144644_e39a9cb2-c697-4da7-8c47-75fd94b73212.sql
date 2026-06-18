-- Add new permission enum values for all sidebar items that currently share permissions
ALTER TYPE menu_item_type ADD VALUE IF NOT EXISTS 'reunioes';

ALTER TYPE menu_item_type ADD VALUE IF NOT EXISTS 'planner';

ALTER TYPE menu_item_type ADD VALUE IF NOT EXISTS 'checklists';

ALTER TYPE menu_item_type ADD VALUE IF NOT EXISTS 'fluxos';

ALTER TYPE menu_item_type ADD VALUE IF NOT EXISTS 'mapas-mentais';

ALTER TYPE menu_item_type ADD VALUE IF NOT EXISTS 'dashboard-equipe';

ALTER TYPE menu_item_type ADD VALUE IF NOT EXISTS 'groupops';

ALTER TYPE menu_item_type ADD VALUE IF NOT EXISTS 'youtube-content-lab';

ALTER TYPE menu_item_type ADD VALUE IF NOT EXISTS 'squads-ia';

ALTER TYPE menu_item_type ADD VALUE IF NOT EXISTS 'parametros-performance';