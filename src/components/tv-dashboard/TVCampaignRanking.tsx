import { TVCampaign } from "@/hooks/useTrafegoDashboard";
import { Trophy, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TVCampaignRankingProps {
  campaigns: TVCampaign[];
}

export function TVCampaignRanking({ campaigns }: TVCampaignRankingProps) {
  if (campaigns.length === 0) {
    return (
      <div className="bg-card rounded-2xl p-6 elevation-2 h-full">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Top Campanhas</h2>
        </div>
        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
          <Trophy className="h-12 w-12 mb-2 opacity-30" />
          <p>Nenhuma campanha ativa</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl p-6 elevation-2 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">Top 10 Campanhas</h2>
        <span className="text-muted-foreground text-sm ml-2">(menor CPA)</span>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="space-y-2 pr-4">
          {campaigns.map((campaign, index) => {
            const isTop3 = index < 3;
            const medalColors = ["text-yellow-500", "text-gray-400", "text-amber-600"];
            
            return (
              <div
                key={campaign.id}
                className={cn(
                  "rounded-xl p-4 flex items-center gap-4 transition-all",
                  isTop3 ? "bg-primary/5" : "bg-muted/50"
                )}
              >
                {/* Rank */}
                <div className={cn(
                  "text-2xl font-bold w-8 text-center",
                  isTop3 ? medalColors[index] : "text-muted-foreground"
                )}>
                  {index + 1}
                </div>
                
                {/* Campaign info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate text-base">{campaign.name}</p>
                  <p className="text-sm text-muted-foreground truncate">{campaign.clientName}</p>
                </div>
                
                {/* Metrics */}
                <div className="flex items-center gap-6 text-right">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">CPA</p>
                    <p className={cn(
                      "font-bold text-lg",
                      campaign.cpa < 30 ? "text-green-500" : 
                      campaign.cpa < 50 ? "text-yellow-500" : "text-red-500"
                    )}>
                      R$ {campaign.cpa.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Leads</p>
                    <p className="font-bold text-lg">{campaign.conversions}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Invest.</p>
                    <p className="font-medium text-base text-muted-foreground">
                      R$ {campaign.spend.toFixed(0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">CTR</p>
                    <p className={cn(
                      "font-medium text-base",
                      campaign.ctr >= 2 ? "text-green-500" : 
                      campaign.ctr >= 1 ? "text-muted-foreground" : "text-red-500"
                    )}>
                      {campaign.ctr.toFixed(2)}%
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
