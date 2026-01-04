import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb } from "lucide-react";

export default function TemasFabricaCarrosseis() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Temas de Pesquisa</h1>
        <p className="text-muted-foreground">Gerenciar temas para geração de carrosseis</p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Lightbulb className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">Temas de Pesquisa</h3>
          <p className="text-muted-foreground text-center mt-2 max-w-md">
            Os temas de pesquisa são compartilhados entre todas as fábricas. 
            Configure os temas na página de configuração de cada cliente.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
