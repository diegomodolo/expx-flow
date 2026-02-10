import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Construction } from 'lucide-react';

interface Props {
  title: string;
  phase: number;
}

export default function GroupOpsPlaceholder({ title, phase }: Props) {
  return (
    <Card>
      <CardContent className="py-16 text-center">
        <Construction className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground mt-2">
          Este recurso será implementado na Fase {phase}
        </p>
      </CardContent>
    </Card>
  );
}
