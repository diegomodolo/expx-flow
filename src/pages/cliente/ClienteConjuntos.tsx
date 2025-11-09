import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Layers } from "lucide-react";

export function ClienteConjuntos() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5" />
            Conjuntos de Anúncios
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Conteúdo de conjuntos de anúncios será migrado em breve.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
