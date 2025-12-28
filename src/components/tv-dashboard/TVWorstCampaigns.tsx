import { TrendingDown, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface WorstCampaign {
  id: string;
  name: string;
  clientName: string;
  cpa: number;
  spend: number;
  conversions: number;
}

interface TVWorstCampaignsProps {
  campaigns: WorstCampaign[];
}

export function TVWorstCampaigns({ campaigns }: TVWorstCampaignsProps) {
  if (campaigns.length === 0) {
    return (
      <div className="bg-card rounded-2xl p-6 elevation-2 h-full">
        <div className="flex items-center gap-2 mb-4">
          <TrendingDown className="h-5 w-5 text-red-500" />
          <h2 className="text-xl font-semibold">Campanhas Críticas</h2>
        </div>
        <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
          <AlertTriangle className="h-10 w-10 mb-2 text-green-500 opacity-50" />
          <p>Nenhuma campanha crítica!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl p-6 elevation-2 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <TrendingDown className="h-5 w-5 text-red-500" />
        <h2 className="text-xl font-semibold">Campanhas Críticas</h2>
        <span className="text-muted-foreground text-sm ml-2">(maior CPA)</span>
        <span className="ml-auto bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full text-sm font-medium">
          {campaigns.length}
        </span>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="space-y-2 pr-4">
          {campaigns.map((campaign, index) => (
            <div
              key={campaign.id}
              className="rounded-xl p-4 flex items-center gap-4 bg-red-500/5 border-l-4 border-l-red-500"
            >
              {/* Index */}
              <div className="text-xl font-bold w-6 text-center text-red-500">
                {index + 1}
              </div>
              
              {/* Campaign info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate text-base">{campaign.name}</p>
                <p className="text-sm text-muted-foreground truncate">{campaign.clientName}</p>
              </div>
              
              {/* Metrics */}
              <div className="flex items-center gap-4 text-right">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">CPA</p>
                  <p className="font-bold text-lg text-red-500">
                    R$ {campaign.cpa.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Leads</p>
                  <p className="font-bold text-lg">{campaign.conversions}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Gasto</p>
                  <p className="font-medium text-base text-muted-foreground">
                    R$ {campaign.spend.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
