import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Factory, Sparkles, CheckCircle2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface ClientFactoryCardProps {
  client: {
    id: string;
    name: string;
    avatar?: string | null;
    sector?: string | null;
  };
  adsGenerated: number;
  isActive: boolean;
  isSelected: boolean;
  onClick: () => void;
}

export function ClientFactoryCard({
  client,
  adsGenerated,
  isActive,
  isSelected,
  onClick,
}: ClientFactoryCardProps) {
  const initials = client.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Card
      onClick={onClick}
      className={cn(
        "relative overflow-hidden cursor-pointer transition-all duration-200 elevation-hover",
        "border hover:border-primary/50",
        isSelected && "ring-2 ring-primary border-primary bg-primary/5"
      )}
    >
      {/* Status indicator bar */}
      <div
        className={cn(
          "absolute top-0 left-0 right-0 h-1",
          isActive ? "bg-success" : "bg-muted-foreground/30"
        )}
      />

      <div className="p-4 pt-5">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <Avatar className="h-12 w-12 ring-2 ring-border">
            <AvatarImage src={client.avatar || ""} alt={client.name} />
            <AvatarFallback className="bg-primary/10 text-primary font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-foreground truncate">{client.name}</h3>
            {client.sector && (
              <p className="text-xs text-muted-foreground truncate">{client.sector}</p>
            )}
          </div>

          {/* Status badge */}
          <Badge
            variant={isActive ? "default" : "secondary"}
            className={cn(
              "shrink-0 text-[10px] px-2 py-0.5",
              isActive && "bg-success hover:bg-success/90"
            )}
          >
            {isActive ? (
              <>
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Ativo
              </>
            ) : (
              <>
                <Clock className="h-3 w-3 mr-1" />
                Inativo
              </>
            )}
          </Badge>
        </div>

        {/* Stats row */}
        <div className="mt-4 pt-3 border-t flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Anúncios gerados</p>
              <p className="font-semibold text-foreground">{adsGenerated}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Factory className="h-3.5 w-3.5" />
            <span>Fábrica</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
