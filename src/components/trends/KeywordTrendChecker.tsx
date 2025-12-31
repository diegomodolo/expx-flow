import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Search, Lightbulb, ArrowUpRight } from "lucide-react";
import { useGoogleTrends, InterestData, RelatedQueries } from "@/hooks/useGoogleTrends";
import { TrendingBadge } from "./TrendingBadge";

interface KeywordTrendCheckerProps {
  initialKeyword?: string;
  onSelectKeyword?: (keyword: string) => void;
  className?: string;
}

export function KeywordTrendChecker({ 
  initialKeyword = "", 
  onSelectKeyword,
  className 
}: KeywordTrendCheckerProps) {
  const { getInterestOverTime, getRelatedQueries, isLoading } = useGoogleTrends();
  const [keyword, setKeyword] = useState(initialKeyword);
  const [interest, setInterest] = useState<InterestData | null>(null);
  const [related, setRelated] = useState<RelatedQueries | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    if (!keyword.trim()) return;

    setHasSearched(true);
    const [interestData, relatedData] = await Promise.all([
      getInterestOverTime(keyword),
      getRelatedQueries(keyword),
    ]);

    setInterest(interestData);
    setRelated(relatedData);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Search className="w-5 h-5 text-primary" />
          Verificar Tendência
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Digite uma palavra-chave..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1"
          />
          <Button onClick={handleSearch} disabled={isLoading || !keyword.trim()}>
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <TrendingUp className="w-4 h-4" />
            )}
          </Button>
        </div>

        {isLoading && hasSearched && (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        )}

        {!isLoading && interest && (
          <div className="space-y-4">
            {/* Interest Result */}
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{interest.keyword}</span>
                <TrendingBadge interest={interest.averageInterest} />
              </div>
              
              <div className="text-sm text-muted-foreground">
                Interesse médio: <span className="font-semibold text-foreground">{interest.averageInterest}%</span>
              </div>

              {/* Mini sparkline visualization */}
              {interest.data.length > 0 && (
                <div className="flex items-end gap-0.5 h-8 mt-2">
                  {interest.data.slice(-12).map((point, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-primary/60 rounded-t transition-all"
                      style={{ height: `${Math.max(point.value, 5)}%` }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Related Queries */}
            {related && (related.rising.length > 0 || related.top.length > 0) && (
              <div className="space-y-3">
                {related.rising.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 text-sm font-medium mb-2">
                      <ArrowUpRight className="w-4 h-4 text-green-500" />
                      Em Ascensão
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {related.rising.slice(0, 6).map((item) => (
                        <Badge
                          key={item.query}
                          variant="outline"
                          className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                          onClick={() => {
                            setKeyword(item.query);
                            onSelectKeyword?.(item.query);
                          }}
                        >
                          {item.query}
                          <span className="ml-1 text-xs opacity-70">{item.value}</span>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {related.top.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 text-sm font-medium mb-2">
                      <Lightbulb className="w-4 h-4 text-yellow-500" />
                      Mais Buscados
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {related.top.slice(0, 6).map((item) => (
                        <Badge
                          key={item.query}
                          variant="secondary"
                          className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                          onClick={() => {
                            setKeyword(item.query);
                            onSelectKeyword?.(item.query);
                          }}
                        >
                          {item.query}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {!isLoading && hasSearched && !interest && (
          <div className="text-center py-4 text-muted-foreground text-sm">
            Não foi possível obter dados para "{keyword}"
          </div>
        )}
      </CardContent>
    </Card>
  );
}
