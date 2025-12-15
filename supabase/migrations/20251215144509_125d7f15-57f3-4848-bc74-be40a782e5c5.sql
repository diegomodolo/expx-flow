-- Adicionar novos valores ao enum menu_item_type
ALTER TYPE menu_item_type ADD VALUE IF NOT EXISTS 'geradores';
ALTER TYPE menu_item_type ADD VALUE IF NOT EXISTS 'whatsapp';