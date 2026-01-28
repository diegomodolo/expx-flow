-- Corrigir search_path da função criada
CREATE OR REPLACE FUNCTION update_whatsapp_assignment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;