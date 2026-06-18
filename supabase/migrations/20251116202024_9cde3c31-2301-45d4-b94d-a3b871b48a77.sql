DO $$ BEGIN
  CREATE TYPE public.payment_type AS ENUM ('prepaid', 'postpaid');
EXCEPTION WHEN duplicate_object THEN null;
END $$;



-- Adicionar coluna payment_type na tabela clients
ALTER TABLE public.clients 
ADD COLUMN payment_type public.payment_type NOT NULL DEFAULT 'prepaid';


-- Comentário para documentação
COMMENT ON COLUMN public.clients.payment_type IS 
  'Tipo de pagamento: prepaid (pré-pago com saldo) ou postpaid (pós-pago com cartão)';