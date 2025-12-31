import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, RefreshCw, ExternalLink, Flame, ArrowUp } from "lucide-react";
import { useGoogleTrends, TrendingTopic } from "@/hooks/useGoogleTrends";

interface TrendingTopicsCardProps {
  onSelectTopic?: (topic: string) => void;
  className?: string;
}

export function TrendingTopicsCard({ onSelectTopic, className }: TrendingTopicsCardProps) {
  const { getDailyTrends, isLoading, error } = useGoogleTrends();
  const [trends, setTrends] = useState<TrendingTopic[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);

  const loadTrends = async () => {
    const data = await getDailyTrends("BR");
    setTrends(data);
    setHasLoaded(true);
  };

  useEffect(() => {
    loadTrends();
  }, []);

  const formatTraffic = (traffic: string) => {
    return traffic.replace("+", "").trim();
  };

  if (!hasLoaded && isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Tendências do Momento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error && trends.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Tendências do Momento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <p className="text-sm mb-3">Não foi possível carregar as tendências</p>
            <Button variant="outline" size="sm" onClick={loadTrends} disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Tentar novamente
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Tendências do Momento
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={loadTrends} 
            disabled={isLoading}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">Brasil • Google Trends</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {trends.slice(0, 8).map((trend, index) => (
          <div
            key={trend.title}
            className="group flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
            onClick={() => onSelectTopic?.(trend.title)}
          >
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">
              {index + 1}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm truncate">{trend.title}</span>
                {index < 3 && (
                  <Flame className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                )}
              </div>
              
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-xs px-1.5 py-0">
                  <ArrowUp className="w-3 h-3 mr-0.5" />
                  {formatTraffic(trend.traffic)} buscas
                </Badge>
              </div>

              {trend.relatedQueries.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {trend.relatedQueries.slice(0, 3).map((query) => (
                    <span
                      key={query}
                      className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded"
                    >
                      {query}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {onSelectTopic && (
              <Button
                variant="ghost"
                size="sm"
                className="opacity-0 group-hover:opacity-100 transition-opacity h-7 px-2"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectTopic(trend.title);
                }}
              >
                Usar
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
