UPDATE public.ia_agent_skills SET 
  tool_parameters = '{
    "type": "object",
    "properties": {
      "prompt": {
        "type": "string",
        "description": "Descrição detalhada da imagem a ser gerada. Ex: produto em fundo branco, banner promocional, pessoa usando o serviço"
      },
      "style": {
        "type": "string",
        "default": "professional marketing",
        "description": "Estilo visual da imagem. Ex: professional marketing, minimalist, vibrant, corporate, lifestyle"
      },
      "client_name": {
        "type": "string",
        "description": "Nome do cliente/marca para contextualizar a geração"
      },
      "client_briefing": {
        "type": "string",
        "description": "Briefing da identidade visual do cliente, incluindo cores, estilo, público-alvo e diretrizes da marca"
      },
      "voice_tone": {
        "type": "string",
        "description": "Tom de voz da marca (ex: profissional, descontraído, luxuoso, jovem)"
      },
      "target_audience": {
        "type": "string",
        "description": "Público-alvo do cliente para adequar a imagem"
      },
      "reference_image_urls": {
        "type": "array",
        "items": {"type": "string"},
        "description": "URLs das imagens de referência do cliente para manter consistência visual. Se não fornecidas, serão buscadas automaticamente do cadastro do cliente."
      }
    },
    "required": ["prompt"]
  }'::jsonb,
  description = 'Gera uma imagem criativa usando IA a partir de um prompt descritivo, levando em conta o briefing, identidade visual e imagens de referência do cliente para manter consistência de marca. Ideal para marketing, posts em redes sociais e materiais visuais.'
WHERE id = 'generate_image_ai';