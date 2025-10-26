-- Adicionar novos valores ao enum menu_item_type para permissões de agentes
-- Passo 1: Adicionar os valores ao enum (deve ser commitado antes de usar)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'agentes-ia' AND enumtypid = 'public.menu_item_type'::regtype) THEN
        ALTER TYPE public.menu_item_type ADD VALUE 'agentes-ia';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'editar-agentes' AND enumtypid = 'public.menu_item_type'::regtype) THEN
        ALTER TYPE public.menu_item_type ADD VALUE 'editar-agentes';
    END IF;
END $$;