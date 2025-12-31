import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingTopicsCard } from "@/components/trends/TrendingTopicsCard";
import { KeywordTrendChecker } from "@/components/trends/KeywordTrendChecker";
import { TrendingBadge } from "@/components/trends/TrendingBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingUp, 
  Search, 
  Lightbulb, 
  Target,
  Sparkles,
  Copy,
  Check
} from "lucide-react";
import { useGoogleTrends, InterestData } from "@/hooks/useGoogleTrends";
import { useClientContext } from "./ClienteContext";
import { toast } from "sonner";

export function ClienteTendencias() {
  const { client } = useClientContext();
  const { getInterestOverTime, getRelatedQueries, isLoading } = useGoogleTrends();
  
  const [compareKeywords, setCompareKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState("");
  const [comparisonResults, setComparisonResults] = useState<InterestData[]>([]);
  const [copiedKeyword, setCopiedKeyword] = useState<string | null>(null);
  const [suggestedKeywords, setSuggestedKeywords] = useState<string[]>([]);

  // Suggestions based on client sector
  const getSectorKeywords = () => {
    const sectorKeywords: Record<string, string[]> = {
      "varejo": ["promoção", "desconto", "black friday", "frete grátis", "liquidação"],
      "saúde": ["bem-estar", "qualidade de vida", "tratamento", "consulta online", "plano de saúde"],
      "educação": ["curso online", "certificado", "carreira", "vestibular", "concurso"],
      "tecnologia": ["inovação", "inteligência artificial", "automação", "startup", "aplicativo"],
      "alimentação": ["delivery", "comida saudável", "restaurante", "promoção", "chef"],
      "imobiliário": ["financiamento", "casa própria", "apartamento", "investimento", "aluguel"],
      "financeiro": ["investimento", "crédito", "empréstimo", "cartão", "poupança"],
      "beleza": ["skincare", "maquiagem", "cabelo", "tratamento estético", "cuidados pessoais"],
    };

    const sector = client?.sector?.toLowerCase() || "";
    for (const [key, keywords] of Object.entries(sectorKeywords)) {
      if (sector.includes(key)) {
        return keywords;
      }
    }
    return ["marketing digital", "vendas online", "promoção", "lançamento", "novidade"];
  };

  const handleAddKeyword = () => {
    if (newKeyword.trim() && !compareKeywords.includes(newKeyword.trim())) {
      setCompareKeywords([...compareKeywords, newKeyword.trim()]);
      setNewKeyword("");
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    setCompareKeywords(compareKeywords.filter(k => k !== keyword));
    setComparisonResults(comparisonResults.filter(r => r.keyword !== keyword));
  };

  const handleCompare = async () => {
    if (compareKeywords.length === 0) {
      toast.error("Adicione pelo menos uma palavra-chave para comparar");
      return;
    }

    const results: InterestData[] = [];
    for (const keyword of compareKeywords) {
      const data = await getInterestOverTime(keyword);
      if (data) {
        results.push(data);
      }
    }
    setComparisonResults(results);

    // Get related queries for the first keyword to suggest more
    if (compareKeywords.length > 0) {
      const related = await getRelatedQueries(compareKeywords[0]);
      if (related?.rising) {
        setSuggestedKeywords(related.rising.slice(0, 5).map(r => r.query));
      }
    }
  };

  const handleCopyKeyword = (keyword: string) => {
    navigator.clipboard.writeText(keyword);
    setCopiedKeyword(keyword);
    setTimeout(() => setCopiedKeyword(null), 2000);
    toast.success("Palavra-chave copiada!");
  };

  const handleSelectTopic = (topic: string) => {
    if (!compareKeywords.includes(topic)) {
      setCompareKeywords([...compareKeywords, topic]);
    }
    toast.success(`"${topic}" adicionada à comparação`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <TrendingUp className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Dashboard de Tendências</h1>
          <p className="text-muted-foreground">
            Descubra o que está em alta e inspire suas campanhas
          </p>
        </div>
      </div>

      <Tabs defaultValue="trending" className="space-y-6">
        <TabsList>
          <TabsTrigger value="trending" className="gap-2">
            <TrendingUp className="w-4 h-4" />
            Tendências do Dia
          </TabsTrigger>
          <TabsTrigger value="compare" className="gap-2">
            <Search className="w-4 h-4" />
            Comparar Palavras-chave
          </TabsTrigger>
          <TabsTrigger value="suggestions" className="gap-2">
            <Lightbulb className="w-4 h-4" />
            Sugestões do Setor
          </TabsTrigger>
        </TabsList>

        {/* Trending Tab */}
        <TabsContent value="trending" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TrendingTopicsCard onSelectTopic={handleSelectTopic} />
            <KeywordTrendChecker 
              initialKeyword={client?.sector || ""} 
              onSelectKeyword={(keyword) => {
                if (!compareKeywords.includes(keyword)) {
                  setCompareKeywords([...compareKeywords, keyword]);
                }
              }}
            />
          </div>
        </TabsContent>

        {/* Compare Tab */}
        <TabsContent value="compare" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Comparar Interesse
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add keywords */}
              <div className="flex gap-2">
                <Input
                  placeholder="Digite uma palavra-chave..."
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddKeyword()}
                  className="flex-1"
                />
                <Button onClick={handleAddKeyword} variant="outline">
                  Adicionar
                </Button>
                <Button onClick={handleCompare} disabled={isLoading || compareKeywords.length === 0}>
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    "Comparar"
                  )}
                </Button>
              </div>

              {/* Keywords list */}
              {compareKeywords.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {compareKeywords.map((keyword) => (
                    <Badge
                      key={keyword}
                      variant="secondary"
                      className="cursor-pointer gap-1 pr-1"
                      onClick={() => handleRemoveKeyword(keyword)}
                    >
                      {keyword}
                      <span className="ml-1 hover:bg-destructive/20 rounded px-1">×</span>
                    </Badge>
                  ))}
                </div>
              )}

              {/* Comparison Results */}
              {comparisonResults.length > 0 && (
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="font-medium">Resultado da Comparação</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {comparisonResults
                      .sort((a, b) => b.averageInterest - a.averageInterest)
                      .map((result, index) => (
                        <div
                          key={result.keyword}
                          className={`p-4 rounded-lg border ${
                            index === 0 ? "bg-primary/5 border-primary/30" : "bg-muted/30"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{result.keyword}</span>
                            {index === 0 && (
                              <Badge variant="default" className="text-xs">
                                🏆 Mais Popular
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <TrendingBadge interest={result.averageInterest} />
                            <span className="text-2xl font-bold">{result.averageInterest}%</span>
                          </div>
                          
                          {/* Mini chart */}
                          <div className="flex items-end gap-0.5 h-8 mt-3">
                            {result.data.slice(-12).map((point, i) => (
                              <div
                                key={i}
                                className={`flex-1 rounded-t transition-all ${
                                  index === 0 ? "bg-primary/60" : "bg-muted-foreground/30"
                                }`}
                                style={{ height: `${Math.max(point.value, 5)}%` }}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                  </div>

                  {/* Suggested keywords based on analysis */}
                  {suggestedKeywords.length > 0 && (
                    <div className="pt-4">
                      <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-yellow-500" />
                        Palavras-chave Relacionadas em Ascensão
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {suggestedKeywords.map((keyword) => (
                          <Badge
                            key={keyword}
                            variant="outline"
                            className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors gap-1"
                            onClick={() => {
                              handleCopyKeyword(keyword);
                            }}
                          >
                            {keyword}
                            {copiedKeyword === keyword ? (
                              <Check className="w-3 h-3" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Suggestions Tab */}
        <TabsContent value="suggestions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-yellow-500" />
                Sugestões para {client?.sector || "seu setor"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Palavras-chave populares no seu segmento. Clique para verificar o interesse atual.
              </p>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {getSectorKeywords().map((keyword) => (
                  <Button
                    key={keyword}
                    variant="outline"
                    className="justify-start gap-2 h-auto py-3"
                    onClick={() => handleSelectTopic(keyword)}
                  >
                    <Search className="w-4 h-4 shrink-0" />
                    <span className="truncate">{keyword}</span>
                  </Button>
                ))}
              </div>

              <div className="mt-6 p-4 rounded-lg bg-muted/50">
                <h4 className="font-medium mb-2">💡 Dicas de uso</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Use tendências em alta nos títulos dos seus criativos</li>
                  <li>• Combine palavras-chave trending com seu produto/serviço</li>
                  <li>• Acompanhe semanalmente as mudanças de interesse</li>
                  <li>• Teste variações das palavras-chave mais populares</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Quick checker for sector keywords */}
          <KeywordTrendChecker 
            initialKeyword={getSectorKeywords()[0]} 
            onSelectKeyword={(keyword) => {
              if (!compareKeywords.includes(keyword)) {
                setCompareKeywords([...compareKeywords, keyword]);
              }
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
