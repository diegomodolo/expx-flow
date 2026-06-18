-- Self-host: seed de dev com company_id hardcoded. Em banco novo, pula.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM companies WHERE id = '39420d18-85a2-4e52-aa9c-312d7f2e6343') THEN
    INSERT INTO public.groupops_templates (company_id, category, title, body, tone, constraints_json) VALUES
    ('39420d18-85a2-4e52-aa9c-312d7f2e6343', 'POLL', 'Crescimento por canal', 'Sua software house cresce mais por:', 'AGGRESSIVE', '{"poll_options":["Indicação","Tráfego pago","Comercial estruturado","Não cresce"],"selectable_count":1}'),
    ('39420d18-85a2-4e52-aa9c-312d7f2e6343', 'POLL', 'Tipo de comercial', 'Seu comercial hoje é mais:', 'AGGRESSIVE', '{"poll_options":["Consultivo","Tirador de pedido","Inexistente","Sou eu mesmo"],"selectable_count":1}')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
