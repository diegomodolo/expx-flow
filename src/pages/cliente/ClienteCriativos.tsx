import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Image } from "lucide-react";

export function ClienteCriativos() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="w-5 h-5" />
            Criativos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Conteúdo de criativos será migrado em breve.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
