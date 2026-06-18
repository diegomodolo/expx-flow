-- Add new values to the existing menu_item_type enum
ALTER TYPE public.menu_item_type ADD VALUE IF NOT EXISTS 'gerador-conteudo';;

ALTER TYPE public.menu_item_type ADD VALUE IF NOT EXISTS 'ia';;
