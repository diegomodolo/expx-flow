import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import * as LucideIcons from 'lucide-react';
import type { Roteiro } from '@/hooks/useRoteiros';

interface RoteiroCardProps {
  roteiro: Roteiro;
  onClick: () => void;
}

export function RoteiroCard({ roteiro, onClick }: RoteiroCardProps) {
  const Icon = (LucideIcons as any)[roteiro.icone || 'BookOpen'] || LucideIcons.BookOpen;

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow border hover:border-primary/30"
      onClick={onClick}
    >
      <CardContent className="p-5 flex flex-col items-start gap-3">
        <div className="flex items-center gap-3 w-full">
          <div className="p-2.5 rounded-lg bg-primary/10">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm truncate">{roteiro.nome}</h3>
            {roteiro.roteiro_categorias && (
              <Badge variant="secondary" className="mt-1 text-xs">
                {roteiro.roteiro_categorias.nome}
              </Badge>
            )}
          </div>
        </div>
        {roteiro.objetivo && (
          <p className="text-xs text-muted-foreground line-clamp-2">{roteiro.objetivo}</p>
        )}
      </CardContent>
    </Card>
  );
}
