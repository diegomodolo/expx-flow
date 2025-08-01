import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy } from "lucide-react";

const campaigns = [
  {
    name: "Campanha Black Friday",
    client: "TechSolutions Ltda",
    cpl: "R$ 32,50",
    leads: "847 leads",
    cplColor: "text-metric-positive"
  },
  {
    name: "Lançamento Produto",
    client: "Inovare Marketing", 
    cpl: "R$ 38,90",
    leads: "623 leads",
    cplColor: "text-metric-positive"
  },
  {
    name: "Promoção Verão",
    client: "BeachWear Co.",
    cpl: "R$ 41,20", 
    leads: "456 leads",
    cplColor: "text-metric-neutral"
  }
];

export function TopCampaignsCard() {
  return (
    <Card className="shadow-sm border border-border">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-warning/10 rounded-lg flex items-center justify-center">
            <Trophy className="text-warning text-xl w-5 h-5" />
          </div>
          <CardTitle className="text-lg font-semibold text-foreground">Top 3 Campanhas</CardTitle>
        </div>
        <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
          Ver Detalhes
        </Button>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {campaigns.map((campaign, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div>
                <div className="font-medium text-foreground">{campaign.name}</div>
                <div className="text-sm text-muted-foreground">{campaign.client}</div>
              </div>
              <div className="text-right">
                <div className={`text-sm font-semibold ${campaign.cplColor}`}>{campaign.cpl}</div>
                <div className="text-xs text-muted-foreground">{campaign.leads}</div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}