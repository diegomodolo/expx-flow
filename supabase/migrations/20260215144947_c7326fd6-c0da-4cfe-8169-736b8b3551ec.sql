
INSERT INTO ia_agent_skills (id, name, description, category, edge_function, tool_parameters, requires_client)
VALUES (
  'generate_image_ai',
  'Gerar Imagem AI',
  'Gera uma imagem criativa usando inteligência artificial a partir de um prompt descritivo. Ideal para criar imagens de marketing, posts para redes sociais, banners e materiais visuais para o cliente.',
  'conteudo',
  'generate-image-ai',
  '{"type": "object", "properties": {"prompt": {"type": "string", "description": "Descrição detalhada da imagem a ser gerada. Ex: produto em fundo branco, banner promocional, pessoa usando o serviço"}, "style": {"type": "string", "description": "Estilo visual da imagem. Ex: professional marketing, minimalist, vibrant, corporate, lifestyle", "default": "professional marketing"}}, "required": ["prompt"]}',
  true
);
