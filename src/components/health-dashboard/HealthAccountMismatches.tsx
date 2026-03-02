import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Instagram, Facebook, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AdSetAccountMismatch } from "@/hooks/useHealthDashboard";

interface HealthAccountMismatchesProps {
  mismatches: AdSetAccountMismatch[];
}

export function HealthAccountMismatches({ mismatches }: HealthAccountMismatchesProps) {
  const getMismatchIcon = (type: string) => {
    if (type === "instagram") return <Instagram className="w-3.5 h-3.5 text-pink-500" />;
    if (type === "facebook_page") return <Facebook className="w-3.5 h-3.5 text-blue-500" />;
    return <AlertTriangle className="w-3.5 h-3.5 text-destructive" />;
  };

  const getMismatchLabel = (type: string) => {
    if (type === "instagram") return "Instagram errado";
    if (type === "facebook_page") return "Página errada";
    return "Ambos errados";
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-500" />
          Contas Vinculadas Erradas
          {mismatches.length > 0 && (
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0 ml-auto">
              {mismatches.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {mismatches.length === 0 && (
          <div className="text-center py-6 text-muted-foreground">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500" />
            <p className="text-xs font-medium text-green-600">
              Nenhuma inconsistência encontrada!
            </p>
            <p className="text-[10px] mt-1">
              Todos os conjuntos estão vinculados às contas corretas.
            </p>
          </div>
        )}

        {mismatches.length > 0 && (
          <ScrollArea className="h-[280px]">
            <div className="space-y-2">
              {mismatches.map((m, idx) => (
                <div
                  key={`${m.adSetFacebookId}-${idx}`}
                  className={cn(
                    "p-2.5 rounded-lg border text-xs",
                    m.mismatchType === "both"
                      ? "border-destructive/40 bg-destructive/5"
                      : "border-orange-500/40 bg-orange-500/5"
                  )}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <Avatar className="w-5 h-5">
                      <AvatarImage src={m.clientAvatar || undefined} />
                      <AvatarFallback className="text-[8px]">
                        {m.clientName.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-semibold truncate">{m.clientName}</span>
                    <Badge variant="outline" className="ml-auto text-[9px] px-1 py-0 gap-0.5 shrink-0">
                      {getMismatchIcon(m.mismatchType)}
                      {getMismatchLabel(m.mismatchType)}
                    </Badge>
                  </div>
                  <div className="text-muted-foreground space-y-0.5 pl-7">
                    <p className="truncate">
                      <span className="text-foreground font-medium">Conjunto:</span>{" "}
                      {m.adSetName}
                    </p>
                    <p className="truncate">
                      <span className="text-foreground font-medium">Campanha:</span>{" "}
                      {m.campaignName}
                    </p>
                    {(m.mismatchType === "instagram" || m.mismatchType === "both") && (
                      <p>
                        <span className="text-foreground font-medium">IG esperado:</span>{" "}
                        {m.expectedInstagram || "N/A"} →{" "}
                        <span className="text-destructive font-medium">{m.actualInstagram || "N/A"}</span>
                      </p>
                    )}
                    {(m.mismatchType === "facebook_page" || m.mismatchType === "both") && (
                      <p>
                        <span className="text-foreground font-medium">Página esperada:</span>{" "}
                        {m.expectedPage || "N/A"} →{" "}
                        <span className="text-destructive font-medium">{m.actualPage || "N/A"}</span>
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
