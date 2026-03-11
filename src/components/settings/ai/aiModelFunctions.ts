export interface AIFunctionDef {
  functionName: string;
  label: string;
  category: string;
  defaultPrimary?: string;
  defaultFallback?: string;
}

export const AI_FUNCTION_CATEGORIES = [
  "Chat & Agentes",
  "Geração de Conteúdo",
  "Análise",
  "Campanhas",
  "Vídeo & YouTube",
  "Imagens & Carrosséis",
  "Utilitários",
] as const;

export const AI_FUNCTIONS: AIFunctionDef[] = [
  // Chat & Agentes
  {
    functionName: "ai-chat",
    label: "Chat IA — Análise de Performance",
    category: "Chat & Agentes",
  },
  {
    functionName: "ia-agent-chat",
    label: "Agentes IA — Chat",
    category: "Chat & Agentes",
  },
  {
    functionName: "dm-agent-responder",
    label: "Agente de DM",
    category: "Chat & Agentes",
  },
  {
    functionName: "telegram-agent-webhook",
    label: "Agente Telegram",
    category: "Chat & Agentes",
  },
  {
    functionName: "refine-script-chat",
    label: "Refinar Roteiro (Chat)",
    category: "Chat & Agentes",
  },
  {
    functionName: "content-plan-chat",
    label: "Planejamento de Conteúdo (Chat)",
    category: "Chat & Agentes",
  },
  {
    functionName: "whatsapp-ai-assistant",
    label: "Assistente IA WhatsApp",
    category: "Chat & Agentes",
  },

  // Geração de Conteúdo
  {
    functionName: "generate-content-ai",
    label: "Gerador de Conteúdo",
    category: "Geração de Conteúdo",
  },
  {
    functionName: "generate-instagram-auto-post",
    label: "Auto-Post Instagram",
    category: "Geração de Conteúdo",
  },
  {
    functionName: "generate-wordpress-auto-post",
    label: "Auto-Post WordPress",
    category: "Geração de Conteúdo",
  },
  {
    functionName: "generate-creative-texts",
    label: "Textos Criativos",
    category: "Geração de Conteúdo",
  },
  {
    functionName: "generate-creative-variations",
    label: "Variações de Criativos",
    category: "Geração de Conteúdo",
  },
  {
    functionName: "generate-creative-suggestions",
    label: "Sugestões de Criativos",
    category: "Geração de Conteúdo",
  },
  {
    functionName: "generate-element",
    label: "Gerador de Elementos",
    category: "Geração de Conteúdo",
  },
  {
    functionName: "generate-groupops-template",
    label: "Template GroupOps",
    category: "Geração de Conteúdo",
  },
  {
    functionName: "generate-skill-ai",
    label: "Gerador de Skills IA",
    category: "Geração de Conteúdo",
  },
  {
    functionName: "generate-research-themes",
    label: "Temas de Pesquisa",
    category: "Geração de Conteúdo",
  },

  // Análise
  {
    functionName: "analyze-competitor-insights",
    label: "Análise de Concorrentes",
    category: "Análise",
  },
  {
    functionName: "generate-campaign-analysis",
    label: "Análise de Campanha",
    category: "Análise",
  },
  {
    functionName: "analyze-creative-caption",
    label: "Análise de Legendas",
    category: "Análise",
  },
  {
    functionName: "analyze-url-content",
    label: "Análise de URL",
    category: "Análise",
  },
  {
    functionName: "analyze-carousel-slides",
    label: "Análise de Carrossel",
    category: "Análise",
  },
  {
    functionName: "score-generated-ad",
    label: "Avaliação de Anúncios",
    category: "Análise",
    defaultPrimary: "openai/gpt-4o",
    defaultFallback: "anthropic/claude-3.5-sonnet",
  },
  {
    functionName: "generate-campaign-presentation-analysis",
    label: "Análise para Apresentação",
    category: "Análise",
    defaultPrimary: "anthropic/claude-3.5-sonnet",
    defaultFallback: "openai/gpt-4o",
  },
  {
    functionName: "scrape-competitor-ads",
    label: "Scraping de Anúncios",
    category: "Análise",
    defaultPrimary: "openai/gpt-4o-mini",
    defaultFallback: "google/gemini-2.5-flash",
  },
  {
    functionName: "youtube-posting-behavior-report",
    label: "Relatório YouTube",
    category: "Análise",
    defaultPrimary: "google/gemini-2.5-pro",
    defaultFallback: "openai/gpt-4o",
  },

  // Campanhas
  {
    functionName: "generate-campaign-strategy",
    label: "Estratégia de Campanha",
    category: "Campanhas",
    defaultPrimary: "anthropic/claude-3-opus",
    defaultFallback: "anthropic/claude-3.5-sonnet",
  },
  {
    functionName: "generate-campaign-recommendation",
    label: "Recomendações de Campanha",
    category: "Campanhas",
    defaultPrimary: "openai/gpt-4o",
    defaultFallback: "anthropic/claude-3.5-sonnet",
  },
  {
    functionName: "generate-ai-campaign",
    label: "Gerador de Campanha IA",
    category: "Campanhas",
    defaultPrimary: "anthropic/claude-3.5-sonnet",
    defaultFallback: "openai/gpt-4o",
  },
  {
    functionName: "generate-ai-campaign-image",
    label: "Imagem de Campanha IA",
    category: "Campanhas",
    defaultPrimary: "openai/gpt-4o-mini",
    defaultFallback: "anthropic/claude-3.5-sonnet",
  },
  {
    functionName: "generate-campaign-creatives",
    label: "Criativos de Campanha",
    category: "Campanhas",
    defaultPrimary: "anthropic/claude-3.5-sonnet",
    defaultFallback: "openai/gpt-4o",
  },
  {
    functionName: "generate-client-briefing",
    label: "Briefing do Cliente",
    category: "Campanhas",
    defaultPrimary: "anthropic/claude-3.5-sonnet",
    defaultFallback: "google/gemini-2.5-pro",
  },
  {
    functionName: "generate-creative-context",
    label: "Contexto Criativo",
    category: "Campanhas",
    defaultPrimary: "google/gemini-2.5-pro",
    defaultFallback: "anthropic/claude-3.5-sonnet",
  },
  {
    functionName: "generate-visual-creative",
    label: "Criativo Visual",
    category: "Campanhas",
    defaultPrimary: "openai/gpt-4o",
    defaultFallback: "google/gemini-2.5-flash",
  },

  // Vídeo & YouTube
  {
    functionName: "generate-video-script",
    label: "Roteiro de Vídeo",
    category: "Vídeo & YouTube",
    defaultPrimary: "anthropic/claude-3.5-sonnet",
    defaultFallback: "google/gemini-2.5-pro",
  },
  {
    functionName: "generate-video-suggestions",
    label: "Sugestões de Vídeo",
    category: "Vídeo & YouTube",
    defaultPrimary: "anthropic/claude-3.5-sonnet",
    defaultFallback: "openai/gpt-4o",
  },
  {
    functionName: "generate-youtube-description",
    label: "Descrição YouTube",
    category: "Vídeo & YouTube",
    defaultPrimary: "openai/gpt-4o-mini",
    defaultFallback: "google/gemini-2.5-flash",
  },
  {
    functionName: "generate-youtube-titles",
    label: "Títulos YouTube",
    category: "Vídeo & YouTube",
    defaultPrimary: "anthropic/claude-3.5-sonnet",
    defaultFallback: "openai/gpt-4o-mini",
  },
  {
    functionName: "generate-youtube-thumbnail",
    label: "Thumbnail YouTube",
    category: "Vídeo & YouTube",
    defaultPrimary: "openai/gpt-4o",
    defaultFallback: "anthropic/claude-3.5-sonnet",
  },
  {
    functionName: "generate-presentation-slides",
    label: "Slides de Apresentação",
    category: "Vídeo & YouTube",
    defaultPrimary: "anthropic/claude-3.5-sonnet",
    defaultFallback: "google/gemini-2.5-pro",
  },
  {
    functionName: "generate-slide-image",
    label: "Imagem de Slide",
    category: "Vídeo & YouTube",
    defaultPrimary: "openai/gpt-4o-mini",
    defaultFallback: "google/gemini-2.5-flash",
  },
  {
    functionName: "transcribe-youtube-video",
    label: "Transcrição YouTube",
    category: "Vídeo & YouTube",
    defaultPrimary: "google/gemini-2.5-flash",
    defaultFallback: "openai/gpt-4o-mini",
  },

  // Imagens & Carrosséis
  {
    functionName: "generate-image-ai",
    label: "Gerador de Imagem IA",
    category: "Imagens & Carrosséis",
    defaultPrimary: "anthropic/claude-3.5-sonnet",
    defaultFallback: "openai/gpt-4o-mini",
  },
  {
    functionName: "regenerate-carousel-images",
    label: "Regenerar Carrossel",
    category: "Imagens & Carrosséis",
    defaultPrimary: "anthropic/claude-3.5-sonnet",
    defaultFallback: "openai/gpt-4o",
  },
  {
    functionName: "daily-carousel-generator",
    label: "Gerador Diário de Carrossel",
    category: "Imagens & Carrosséis",
    defaultPrimary: "anthropic/claude-3.5-sonnet",
    defaultFallback: "google/gemini-2.5-pro",
  },
  {
    functionName: "daily-carousel-generator-stream",
    label: "Gerador Diário (Stream)",
    category: "Imagens & Carrosséis",
    defaultPrimary: "google/gemini-2.5-flash",
    defaultFallback: "openai/gpt-4o-mini",
  },
  {
    functionName: "daily-ad-generator",
    label: "Gerador Diário de Anúncios",
    category: "Imagens & Carrosséis",
    defaultPrimary: "openai/gpt-4o",
    defaultFallback: "anthropic/claude-3.5-sonnet",
  },
  {
    functionName: "daily-creative-generator",
    label: "Gerador Diário de Criativos",
    category: "Imagens & Carrosséis",
    defaultPrimary: "anthropic/claude-3.5-sonnet",
    defaultFallback: "meta-llama/llama-3.1-70b-instruct",
  },
  {
    functionName: "validate-image-text",
    label: "Validar Texto em Imagem",
    category: "Imagens & Carrosséis",
    defaultPrimary: "google/gemini-2.5-flash",
    defaultFallback: "openai/gpt-4o-mini",
  },

  // Utilitários
  {
    functionName: "translate-text",
    label: "Tradução de Texto",
    category: "Utilitários",
    defaultPrimary: "openai/gpt-4o-mini",
    defaultFallback: "google/gemini-2.5-flash",
  },
  {
    functionName: "validate-text-grammar",
    label: "Validação Gramatical",
    category: "Utilitários",
    defaultPrimary: "openai/gpt-4o-mini",
    defaultFallback: "google/gemini-2.5-flash",
  },
  {
    functionName: "validate-portuguese",
    label: "Validação de Português",
    category: "Utilitários",
    defaultPrimary: "anthropic/claude-3.5-sonnet",
    defaultFallback: "openai/gpt-4o-mini",
  },
  {
    functionName: "organize-tasks-with-ai",
    label: "Organizar Tarefas com IA",
    category: "Utilitários",
    defaultPrimary: "openai/gpt-4o",
    defaultFallback: "anthropic/claude-3.5-sonnet",
  },
  {
    functionName: "prioritize-notification",
    label: "Priorizar Notificações",
    category: "Utilitários",
    defaultPrimary: "openai/gpt-4o-mini",
    defaultFallback: "google/gemini-2.5-flash",
  },
  {
    functionName: "extract-image-text",
    label: "Extrair Texto de Imagem",
    category: "Utilitários",
    defaultPrimary: "google/gemini-2.5-flash",
    defaultFallback: "openai/gpt-4o",
  },
  {
    functionName: "sync-release-notes",
    label: "Sincronizar Release Notes",
    category: "Utilitários",
    defaultPrimary: "anthropic/claude-3.5-sonnet",
    defaultFallback: "openai/gpt-4o",
  },
  {
    functionName: "google-meet-process-summary",
    label: "Resumo Google Meet",
    category: "Utilitários",
    defaultPrimary: "google/gemini-2.5-pro",
    defaultFallback: "openai/gpt-4o",
  },
  {
    functionName: "prospect-google-leads",
    label: "Prospecção Google Leads",
    category: "Utilitários",
    defaultPrimary: "openai/gpt-4o-mini",
    defaultFallback: "google/gemini-2.5-flash",
  },
  {
    functionName: "shotstack-webhook",
    label: "Webhook Shotstack",
    category: "Utilitários",
    defaultPrimary: "openai/gpt-4o-mini",
    defaultFallback: "meta-llama/llama-3.1-8b-instruct",
  },
  {
    functionName: "squad-orchestrator",
    label: "Orquestrador de Squad",
    category: "Utilitários",
    defaultPrimary: "openai/gpt-4o",
    defaultFallback: "anthropic/claude-3.5-sonnet",
  },
  {
    functionName: "generate-weekly-insights",
    label: "Insights Semanais",
    category: "Utilitários",
    defaultPrimary: "anthropic/claude-3.5-sonnet",
    defaultFallback: "google/gemini-2.5-pro",
  },
];
