import { TrendingDown, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface WorstCampaign {
  id: string;
  name: string;
  clientName: string;
  clientAvatar?: string | null;
  cpa: number;
  spend: number;
  conversions: number;
  platform?: string;
}

interface TVWorstCampaignsProps {
  campaigns: WorstCampaign[];
}

export function TVWorstCampaigns({ campaigns }: TVWorstCampaignsProps) {
  if (campaigns.length === 0) {
    return (
      <div className="bg-card rounded-xl p-3 elevation-2 h-full min-h-0 overflow-hidden">
        <div className="flex items-center gap-2 mb-2">
          <TrendingDown className="h-4 w-4 text-red-500" />
          <h2 className="text-sm font-semibold">Campanhas Críticas</h2>
        </div>
        <div className="flex flex-col items-center justify-center py-3 text-muted-foreground">
          <AlertTriangle className="h-6 w-6 mb-1 text-green-500 opacity-50" />
          <p className="text-xs">Nenhuma campanha crítica!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl p-3 elevation-2 h-full min-h-0 flex flex-col overflow-hidden">
      <div className="flex items-center gap-2 mb-2">
        <TrendingDown className="h-4 w-4 text-red-500" />
        <h2 className="text-sm font-semibold">Campanhas Críticas</h2>
        <span className="ml-auto bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded-full text-xs font-medium">
          {campaigns.length}
        </span>
      </div>
      
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="space-y-1 pr-1">
          {campaigns.slice(0, 6).map((campaign, index) => (
            <div
              key={campaign.id}
              className="rounded-lg p-1.5 flex items-center gap-2 bg-red-500/5 border-l-2 border-l-red-500"
            >
              <div className="text-sm font-bold w-4 text-center text-red-500">
                {index + 1}
              </div>
              
              <Avatar className="h-6 w-6 shrink-0">
                <AvatarImage src={campaign.clientAvatar || undefined} alt={campaign.clientName} />
                <AvatarFallback className="text-[9px] bg-red-500/10 text-red-500">
                  {campaign.clientName?.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate text-xs">{campaign.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {campaign.clientName}
                  {campaign.platform && <span className="ml-1 opacity-70">• {campaign.platform}</span>}
                </p>
              </div>
              
              <div className="flex items-center gap-2 text-right shrink-0">
                <div>
                  <p className="text-[9px] text-muted-foreground uppercase">CPA</p>
                  <p className="font-bold text-xs text-red-500">
                    R$ {campaign.cpa.toFixed(0)}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] text-muted-foreground uppercase">Leads</p>
                  <p className="font-bold text-xs">{campaign.conversions}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
