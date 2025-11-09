import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StickyNote } from "lucide-react";

export function ClienteAnotacoes() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <StickyNote className="w-5 h-5" />
            Anotações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Conteúdo de anotações será migrado em breve.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
