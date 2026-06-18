-- Self-host: migration que tentava criar alias; torna no-op.
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='employee_permissions'
      AND column_name='menu_item' AND data_type='text'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='employee_permissions'
      AND column_name='menu_item' AND udt_name='menu_item_type'
  ) THEN
    ALTER TABLE public.employee_permissions
      ALTER COLUMN menu_item TYPE public.menu_item_type
      USING menu_item::public.menu_item_type;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'skip: %', SQLERRM;
END $$;
