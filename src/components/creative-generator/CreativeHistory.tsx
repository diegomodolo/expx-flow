import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useVisualCreatives } from "@/hooks/useVisualCreatives";
import { Calendar, Download, Eye, MoreHorizontal } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";

export function CreativeHistory() {
  const { creatives, loading } = useVisualCreatives();

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <Skeleton className="w-32 h-24 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!creatives || creatives.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
              <Eye className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">Nenhum criativo encontrado</h3>
            <p className="text-muted-foreground mb-4">
              Você ainda não criou nenhum criativo. Vá para a aba "Gerar Novo" para começar.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleDownload = (imageUrl: string, title: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `criativo-${title.toLowerCase().replace(/\s+/g, '-')}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Criativos Gerados</h3>
        <Badge variant="secondary">{creatives.length} criativo(s)</Badge>
      </div>

      {creatives.map((creative) => (
        <Card key={creative.id} className="overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-start gap-6">
              {creative.image_url && (
                <div className="w-32 h-24 flex-shrink-0">
                  <img 
                    src={creative.image_url} 
                    alt={creative.title}
                    className="w-full h-full object-cover rounded-lg border"
                  />
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <h4 className="font-medium text-lg truncate">
                      {creative.title}
                    </h4>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(creative.created_at), "dd 'de' MMM, yyyy", { locale: ptBR })}
                      </div>
                      <Badge variant="outline">{creative.creative_type}</Badge>
                    </div>
                    
                    {creative.client_name && (
                      <p className="text-sm">
                        <span className="font-medium">Cliente:</span> {creative.client_name}
                      </p>
                    )}
                    
                    {creative.theme && (
                      <p className="text-sm">
                        <span className="font-medium">Tema:</span> {creative.theme}
                      </p>
                    )}
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {creative.image_url && (
                        <DropdownMenuItem 
                          onClick={() => handleDownload(creative.image_url!, creative.title)}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Baixar Imagem
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => window.open(creative.image_url, '_blank')}>
                        <Eye className="w-4 h-4 mr-2" />
                        Visualizar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}