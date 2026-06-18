-- Self-host: auth.config não existe em Supabase novo; torna condicional.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'auth' AND table_name = 'config'
  ) THEN
    EXECUTE $q$ UPDATE auth.config SET value = '15 minutes' WHERE parameter = 'otp_expiry' $q$;
    EXECUTE $q$ UPDATE auth.config SET value = 'true' WHERE parameter = 'leaked_password_protection' $q$;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'auth.config não acessível: %', SQLERRM;
END $$;
