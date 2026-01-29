import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, AlertTriangle, MessageSquare, TrendingUp, TrendingDown } from "lucide-react";

interface AttendantPerformance {
  id: string;
  name: string;
  avatarUrl: string | null;
  activeConversations: number;
  averageScore: number | null;
  positiveCount: number;
  neutralCount: number;
  negativeCount: number;
  activeAlerts: number;
  messagesSent: number;
}

interface CSTVAttendantPerformanceProps {
  attendants: AttendantPerformance[];
}

export function CSTVAttendantPerformance({ attendants }: CSTVAttendantPerformanceProps) {
  const getScoreColor = (score: number | null) => {
    if (score === null) return "text-muted-foreground";
    if (score >= 8) return "text-green-500";
    if (score >= 6) return "text-yellow-500";
    return "text-red-500";
  };

  const getScoreIcon = (score: number | null) => {
    if (score === null) return null;
    if (score >= 7) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (score < 5) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return null;
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  if (attendants.length === 0) {
    return (
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Performance por Atendente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <p>Nenhum atendente com conversas ativas</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Performance por Atendente
          <Badge variant="secondary" className="ml-auto">
            {attendants.length} atendente{attendants.length !== 1 ? "s" : ""}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {attendants.map((attendant, index) => {
          const totalSentiment = attendant.positiveCount + attendant.neutralCount + attendant.negativeCount;
          const positivePercent = totalSentiment > 0 ? (attendant.positiveCount / totalSentiment) * 100 : 0;
          const neutralPercent = totalSentiment > 0 ? (attendant.neutralCount / totalSentiment) * 100 : 0;
          const negativePercent = totalSentiment > 0 ? (attendant.negativeCount / totalSentiment) * 100 : 0;

          return (
            <div
              key={attendant.id}
              className={`p-3 rounded-lg border transition-colors ${
                attendant.negativeCount > attendant.positiveCount
                  ? "border-red-500/30 bg-red-500/5"
                  : "border-border/50 bg-muted/30"
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Rank + Avatar */}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-muted-foreground w-5">
                    #{index + 1}
                  </span>
                  <Avatar className="h-10 w-10 border-2 border-primary/20">
                    <AvatarImage src={attendant.avatarUrl || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {getInitials(attendant.name)}
                    </AvatarFallback>
                  </Avatar>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-medium truncate">{attendant.name}</h4>
                    <div className="flex items-center gap-1">
                      {getScoreIcon(attendant.averageScore)}
                      <span className={`font-bold ${getScoreColor(attendant.averageScore)}`}>
                        {attendant.averageScore !== null
                          ? attendant.averageScore.toFixed(1)
                          : "-"}
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-2 h-2 w-full rounded-full bg-muted overflow-hidden flex">
                    {positivePercent > 0 && (
                      <div
                        className="h-full bg-green-500"
                        style={{ width: `${positivePercent}%` }}
                      />
                    )}
                    {neutralPercent > 0 && (
                      <div
                        className="h-full bg-yellow-500"
                        style={{ width: `${neutralPercent}%` }}
                      />
                    )}
                    {negativePercent > 0 && (
                      <div
                        className="h-full bg-red-500"
                        style={{ width: `${negativePercent}%` }}
                      />
                    )}
                  </div>

                  {/* Stats */}
                  <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      {attendant.activeConversations} conversa{attendant.activeConversations !== 1 ? "s" : ""}
                    </span>
                    {attendant.activeAlerts > 0 && (
                      <span className="flex items-center gap-1 text-amber-500">
                        <AlertTriangle className="h-3 w-3" />
                        {attendant.activeAlerts} alerta{attendant.activeAlerts !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>

                  {/* Sentiment breakdown */}
                  <div className="mt-1 flex items-center gap-2 text-xs">
                    <span className="text-green-500">+{attendant.positiveCount}</span>
                    <span className="text-yellow-500">{attendant.neutralCount}</span>
                    <span className="text-red-500">-{attendant.negativeCount}</span>
                    {attendant.messagesSent > 0 && (
                      <span className="text-muted-foreground ml-auto">
                        {attendant.messagesSent} msg enviada{attendant.messagesSent !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
