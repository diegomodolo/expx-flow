import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface CreativeType {
  id: string;
  name: string;
  description: string;
  dimensions: string;
  platform: string;
  icon: string;
  aspectRatio: string;
}

const CREATIVE_TYPES: CreativeType[] = [
  {
    id: "instagram-feed",
    name: "Post para Feed",
    description: "Post quadrado para Instagram/Facebook",
    dimensions: "1080x1080",
    platform: "Instagram/Facebook",
    icon: "📱",
    aspectRatio: "1:1"
  },
  {
    id: "instagram-stories",
    name: "Stories",
    description: "Stories para Instagram/Facebook",
    dimensions: "1080x1920",
    platform: "Instagram/Facebook",
    icon: "📲",
    aspectRatio: "9:16"
  },
  {
    id: "facebook-cover",
    name: "Capa de Facebook",
    description: "Imagem de capa para página no Facebook",
    dimensions: "820x312",
    platform: "Facebook",
    icon: "🎭",
    aspectRatio: "2.6:1"
  },
  {
    id: "youtube-cover",
    name: "Capa de YouTube",
    description: "Banner para canal do YouTube",
    dimensions: "2560x1440",
    platform: "YouTube",
    icon: "🎬",
    aspectRatio: "16:9"
  },
  {
    id: "youtube-thumbnail",
    name: "Thumbnail para vídeo",
    description: "Miniatura para YouTube, Reels, Shorts",
    dimensions: "1280x720",
    platform: "YouTube/Instagram/TikTok",
    icon: "🖼️",
    aspectRatio: "16:9"
  },
  {
    id: "facebook-ad",
    name: "Criativo para Anúncio",
    description: "Anúncios para Facebook Ads, Google Display",
    dimensions: "1200x628",
    platform: "Facebook Ads/Google",
    icon: "🎯",
    aspectRatio: "1.9:1"
  },
  {
    id: "email-banner",
    name: "Banner para E-mail",
    description: "Header para campanhas de e-mail marketing",
    dimensions: "600x200",
    platform: "E-mail Marketing",
    icon: "📧",
    aspectRatio: "3:1"
  },
  {
    id: "website-banner",
    name: "Banner para Site",
    description: "Banner para destaque, carrossel, hero",
    dimensions: "1920x600",
    platform: "Website",
    icon: "💻",
    aspectRatio: "3.2:1"
  },
  {
    id: "whatsapp-business",
    name: "WhatsApp Business",
    description: "Imagem para divulgação no WhatsApp",
    dimensions: "1080x1080",
    platform: "WhatsApp",
    icon: "💬",
    aspectRatio: "1:1"
  },
  {
    id: "pinterest-pin",
    name: "Pin do Pinterest",
    description: "Imagem vertical para Pinterest",
    dimensions: "1000x1500",
    platform: "Pinterest",
    icon: "📌",
    aspectRatio: "2:3"
  },
  {
    id: "reels-cover",
    name: "Capa para Reels",
    description: "Capa estática para Reels/Shorts",
    dimensions: "1080x1920",
    platform: "Instagram/TikTok",
    icon: "🎥",
    aspectRatio: "9:16"
  },
  {
    id: "tiktok-cover",
    name: "Capa para TikTok",
    description: "Imagem de perfil ou capa de vídeo",
    dimensions: "1080x1920",
    platform: "TikTok",
    icon: "🎵",
    aspectRatio: "9:16"
  },
  {
    id: "linkedin-post",
    name: "Post do LinkedIn",
    description: "Conteúdo profissional para LinkedIn",
    dimensions: "1200x627",
    platform: "LinkedIn",
    icon: "💼",
    aspectRatio: "1.9:1"
  },
  {
    id: "carousel-post",
    name: "Carrossel",
    description: "Slide para carrossel no Instagram/Facebook",
    dimensions: "1080x1080",
    platform: "Instagram/Facebook",
    icon: "🎠",
    aspectRatio: "1:1"
  },
  {
    id: "remarketing-ad",
    name: "Remarketing",
    description: "Criativo para campanha de remarketing",
    dimensions: "1200x628",
    platform: "Facebook/Google",
    icon: "🔄",
    aspectRatio: "1.9:1"
  },
  {
    id: "awareness-campaign",
    name: "Campanha de Conscientização",
    description: "Peça educativa ou informativa",
    dimensions: "1080x1080",
    platform: "Multi-plataforma",
    icon: "💡",
    aspectRatio: "1:1"
  },
  {
    id: "institutional-post",
    name: "Post Institucional",
    description: "Conteúdo da marca/empresa",
    dimensions: "1080x1080",
    platform: "Multi-plataforma",
    icon: "🏢",
    aspectRatio: "1:1"
  },
  {
    id: "event-promotion",
    name: "Divulgação de Evento",
    description: "Material para eventos e webinars",
    dimensions: "1080x1080",
    platform: "Multi-plataforma",
    icon: "🎪",
    aspectRatio: "1:1"
  },
  {
    id: "seasonal-post",
    name: "Post Comemorativo",
    description: "Datas sazonais e comemorativas",
    dimensions: "1080x1080",
    platform: "Multi-plataforma",
    icon: "🎉",
    aspectRatio: "1:1"
  },
  {
    id: "product-mockup",
    name: "Mockup de Produto",
    description: "Apresentação visual de produto/serviço",
    dimensions: "1080x1080",
    platform: "Multi-plataforma",
    icon: "📦",
    aspectRatio: "1:1"
  }
];

interface CreativeTypeSelectorProps {
  selectedType: string;
  onTypeSelect: (type: string) => void;
}

export function CreativeTypeSelector({ selectedType, onTypeSelect }: CreativeTypeSelectorProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium mb-2">Escolha o tipo de criativo</h3>
        <p className="text-muted-foreground">
          Selecione o formato ideal para sua campanha ou objetivo
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {CREATIVE_TYPES.map((type) => (
          <Card
            key={type.id}
            className={cn(
              "cursor-pointer transition-all duration-200 hover:shadow-md border-2",
              selectedType === type.id
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-border hover:border-primary/50"
            )}
            onClick={() => onTypeSelect(type.id)}
          >
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <span className="text-2xl">{type.icon}</span>
                <Badge variant="secondary" className="text-xs">
                  {type.aspectRatio}
                </Badge>
              </div>
              
              <div className="space-y-1">
                <h4 className="font-medium text-sm">{type.name}</h4>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {type.description}
                </p>
              </div>
              
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{type.dimensions}</span>
                <span className="truncate ml-2">{type.platform}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedType && (
        <div className="mt-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
          <div className="flex items-center gap-2">
            <span className="text-lg">
              {CREATIVE_TYPES.find(t => t.id === selectedType)?.icon}
            </span>
            <span className="font-medium">
              {CREATIVE_TYPES.find(t => t.id === selectedType)?.name} selecionado
            </span>
          </div>
        </div>
      )}
    </div>
  );
}