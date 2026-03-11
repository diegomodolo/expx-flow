export interface AIFunctionDef {
  functionName: string;
  label: string;
  category: string;
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
  },
  {
    functionName: "generate-campaign-presentation-analysis",
    label: "Análise para Apresentação",
    category: "Análise",
  },
  {
    functionName: "scrape-competitor-ads",
    label: "Scraping de Anúncios",
    category: "Análise",
  },
  {
    functionName: "youtube-posting-behavior-report",
    label: "Relatório YouTube",
    category: "Análise",
  },

  // Campanhas
  {
    functionName: "generate-campaign-strategy",
    label: "Estratégia de Campanha",
    category: "Campanhas",
  },
  {
    functionName: "generate-campaign-recommendation",
    label: "Recomendações de Campanha",
    category: "Campanhas",
  },
  {
    functionName: "generate-ai-campaign",
    label: "Gerador de Campanha IA",
    category: "Campanhas",
  },
  {
    functionName: "generate-ai-campaign-image",
    label: "Imagem de Campanha IA",
    category: "Campanhas",
  },
  {
    functionName: "generate-campaign-creatives",
    label: "Criativos de Campanha",
    category: "Campanhas",
  },
  {
    functionName: "generate-client-briefing",
    label: "Briefing do Cliente",
    category: "Campanhas",
  },
  {
    functionName: "generate-creative-context",
    label: "Contexto Criativo",
    category: "Campanhas",
  },
  {
    functionName: "generate-visual-creative",
    label: "Criativo Visual",
    category: "Campanhas",
  },

  // Vídeo & YouTube
  {
    functionName: "generate-video-script",
    label: "Roteiro de Vídeo",
    category: "Vídeo & YouTube",
  },
  {
    functionName: "generate-video-suggestions",
    label: "Sugestões de Vídeo",
    category: "Vídeo & YouTube",
  },
  {
    functionName: "generate-youtube-description",
    label: "Descrição YouTube",
    category: "Vídeo & YouTube",
  },
  {
    functionName: "generate-youtube-titles",
    label: "Títulos YouTube",
    category: "Vídeo & YouTube",
  },
  {
    functionName: "generate-youtube-thumbnail",
    label: "Thumbnail YouTube",
    category: "Vídeo & YouTube",
  },
  {
    functionName: "generate-presentation-slides",
    label: "Slides de Apresentação",
    category: "Vídeo & YouTube",
  },
  {
    functionName: "generate-slide-image",
    label: "Imagem de Slide",
    category: "Vídeo & YouTube",
  },
  {
    functionName: "transcribe-youtube-video",
    label: "Transcrição YouTube",
    category: "Vídeo & YouTube",
  },

  // Imagens & Carrosséis
  {
    functionName: "generate-image-ai",
    label: "Gerador de Imagem IA",
    category: "Imagens & Carrosséis",
  },
  {
    functionName: "regenerate-carousel-images",
    label: "Regenerar Carrossel",
    category: "Imagens & Carrosséis",
  },
  {
    functionName: "daily-carousel-generator",
    label: "Gerador Diário de Carrossel",
    category: "Imagens & Carrosséis",
  },
  {
    functionName: "daily-carousel-generator-stream",
    label: "Gerador Diário (Stream)",
    category: "Imagens & Carrosséis",
  },
  {
    functionName: "daily-ad-generator",
    label: "Gerador Diário de Anúncios",
    category: "Imagens & Carrosséis",
  },
  {
    functionName: "daily-creative-generator",
    label: "Gerador Diário de Criativos",
    category: "Imagens & Carrosséis",
  },
  {
    functionName: "validate-image-text",
    label: "Validar Texto em Imagem",
    category: "Imagens & Carrosséis",
  },

  // Utilitários
  {
    functionName: "translate-text",
    label: "Tradução de Texto",
    category: "Utilitários",
  },
  {
    functionName: "validate-text-grammar",
    label: "Validação Gramatical",
    category: "Utilitários",
  },
  {
    functionName: "validate-portuguese",
    label: "Validação de Português",
    category: "Utilitários",
  },
  {
    functionName: "organize-tasks-with-ai",
    label: "Organizar Tarefas com IA",
    category: "Utilitários",
  },
  {
    functionName: "prioritize-notification",
    label: "Priorizar Notificações",
    category: "Utilitários",
  },
  {
    functionName: "extract-image-text",
    label: "Extrair Texto de Imagem",
    category: "Utilitários",
  },
  {
    functionName: "sync-release-notes",
    label: "Sincronizar Release Notes",
    category: "Utilitários",
  },
  {
    functionName: "google-meet-process-summary",
    label: "Resumo Google Meet",
    category: "Utilitários",
  },
  {
    functionName: "prospect-google-leads",
    label: "Prospecção Google Leads",
    category: "Utilitários",
  },
  {
    functionName: "shotstack-webhook",
    label: "Webhook Shotstack",
    category: "Utilitários",
  },
  {
    functionName: "squad-orchestrator",
    label: "Orquestrador de Squad",
    category: "Utilitários",
  },
  {
    functionName: "generate-weekly-insights",
    label: "Insights Semanais",
    category: "Utilitários",
  },
];
