UPDATE public.ia_agent_skills SET 
  edge_function = 'schedule-post',
  tool_parameters = '{
    "type": "object",
    "properties": {
      "caption": {
        "type": "string",
        "description": "Legenda/texto completo da postagem"
      },
      "scheduled_for": {
        "type": "string",
        "description": "Data e hora para publicar no formato YYYY-MM-DD HH:mm (horário de Brasília). Exemplo: 2026-02-15 13:10"
      },
      "platforms": {
        "type": "string",
        "description": "Plataformas separadas por vírgula: instagram,facebook. Padrão: instagram,facebook"
      },
      "content_type": {
        "type": "string",
        "description": "Tipo de conteúdo: image, video, carousel, text. Padrão: image"
      },
      "image_url": {
        "type": "string",
        "description": "URL da imagem para a postagem (opcional)"
      }
    },
    "required": ["caption", "scheduled_for"]
  }'::jsonb,
  updated_at = now()
WHERE id = 'schedule_post';