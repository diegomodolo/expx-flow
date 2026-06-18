-- Fix: Allow null changed_by in change_audit_log for system/service role operations
-- Drop the foreign key constraint that prevents inserts when auth.uid() is null
ALTER TABLE public.change_audit_log DROP CONSTRAINT IF EXISTS fk_change_audit_user;


-- Make changed_by nullable
ALTER TABLE public.change_audit_log ALTER COLUMN changed_by DROP NOT NULL;


-- Update the trigger function to use NULL instead of fake UUID when no user
CREATE OR REPLACE FUNCTION public.log_change_audit()
RETURNS TRIGGER AS $$
DECLARE
  _company_id UUID;

  _campaign_id UUID;

  _client_id UUID;

  _changed_fields TEXT[] := '{}';

  _field_name TEXT;

BEGIN
  -- Determinar company_id baseado na tabela
  CASE TG_TABLE_NAME
    WHEN 'campaigns' THEN
      _company_id := COALESCE(NEW.company_id, OLD.company_id);

      _campaign_id := COALESCE(NEW.id, OLD.id);

      _client_id := COALESCE(NEW.client_id, OLD.client_id);

    WHEN 'ad_sets' THEN
      _company_id := COALESCE(NEW.company_id, OLD.company_id);

      _campaign_id := COALESCE(NEW.campaign_id, OLD.campaign_id);

      _client_id := COALESCE(NEW.client_id, OLD.client_id);

    WHEN 'ads' THEN
      _company_id := COALESCE(NEW.company_id, OLD.company_id);

      _campaign_id := COALESCE(NEW.campaign_id, OLD.campaign_id);

      _client_id := COALESCE(NEW.client_id, OLD.client_id);

  END CASE;


  -- Para UPDATE, identificar campos que mudaram
  IF TG_OP = 'UPDATE' THEN
    CASE TG_TABLE_NAME
      WHEN 'campaigns' THEN
        IF OLD.name != NEW.name THEN _changed_fields := array_append(_changed_fields, 'name');
 END IF;

        IF OLD.status != NEW.status THEN _changed_fields := array_append(_changed_fields, 'status');
 END IF;

        IF OLD.spend != NEW.spend THEN _changed_fields := array_append(_changed_fields, 'spend');
 END IF;

        IF OLD.cpc != NEW.cpc THEN _changed_fields := array_append(_changed_fields, 'cpc');
 END IF;

        IF OLD.ctr != NEW.ctr THEN _changed_fields := array_append(_changed_fields, 'ctr');
 END IF;

        IF OLD.conversions != NEW.conversions THEN _changed_fields := array_append(_changed_fields, 'conversions');
 END IF;

      WHEN 'ad_sets' THEN
        IF OLD.name != NEW.name THEN _changed_fields := array_append(_changed_fields, 'name');
 END IF;

        IF OLD.status != NEW.status THEN _changed_fields := array_append(_changed_fields, 'status');
 END IF;

        IF OLD.daily_budget != NEW.daily_budget THEN _changed_fields := array_append(_changed_fields, 'daily_budget');
 END IF;

        IF OLD.targeting != NEW.targeting THEN _changed_fields := array_append(_changed_fields, 'targeting');
 END IF;

      WHEN 'ads' THEN
        IF OLD.name != NEW.name THEN _changed_fields := array_append(_changed_fields, 'name');
 END IF;

        IF OLD.status != NEW.status THEN _changed_fields := array_append(_changed_fields, 'status');
 END IF;

        IF OLD.creative_title != NEW.creative_title THEN _changed_fields := array_append(_changed_fields, 'creative_title');
 END IF;

        IF OLD.creative_body != NEW.creative_body THEN _changed_fields := array_append(_changed_fields, 'creative_body');
 END IF;

        IF OLD.image_url != NEW.image_url THEN _changed_fields := array_append(_changed_fields, 'image_url');
 END IF;

        IF OLD.video_url != NEW.video_url THEN _changed_fields := array_append(_changed_fields, 'video_url');
 END IF;

    END CASE;

  END IF;


  -- Inserir log de auditoria (changed_by é NULL quando não há usuário autenticado)
  INSERT INTO public.change_audit_log (
    company_id,
    entity_type,
    entity_id,
    change_type,
    old_values,
    new_values,
    changed_fields,
    changed_by,
    change_source,
    campaign_id,
    client_id
  ) VALUES (
    _company_id,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE 
      WHEN TG_OP = 'INSERT' THEN 'create'
      WHEN TG_OP = 'UPDATE' THEN 'update'
      WHEN TG_OP = 'DELETE' THEN 'delete'
    END,
    CASE WHEN TG_OP != 'INSERT' THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP != 'DELETE' THEN row_to_json(NEW) ELSE NULL END,
    _changed_fields,
    auth.uid(), -- NULL when no authenticated user (service role / cron)
    'sync',
    _campaign_id,
    _client_id
  );


  RETURN COALESCE(NEW, OLD);

END;

$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;